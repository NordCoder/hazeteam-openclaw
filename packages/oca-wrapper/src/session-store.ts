import {
  cloneOcaSessionModel,
  deriveOcaSessionStatus,
  isSafeOcaSessionModelJson,
  normalizeOcaSessionModel,
  validateOcaSessionLifecycleTransition,
  validateOcaSessionRef,
} from './session-model.js';
import type {
  OcaSessionLifecycleState,
  OcaSessionModel,
  OcaSessionModelValidationIssue,
  OcaSessionRef,
  OcaSessionStatusFlags,
} from './session-model.js';

export type OcaSessionStoreErrorCode =
  | 'invalid-request'
  | 'invalid-session'
  | 'invalid-idempotency-ref'
  | 'idempotency-conflict'
  | 'session-conflict'
  | 'not-found'
  | 'invalid-transition'
  | 'unsafe-json';

export interface OcaSessionStoreError {
  readonly code: OcaSessionStoreErrorCode;
  readonly summary: string;
  readonly issues?: readonly OcaSessionModelValidationIssue[];
}

export interface OcaSessionStoreCreateInput {
  readonly idempotencyRef: unknown;
  readonly session: unknown;
}

export interface OcaSessionStoreListInput {
  readonly limit?: unknown;
}

export interface OcaSessionStoreTransitionInput {
  readonly sessionRef: unknown;
  readonly lifecycleState: unknown;
  readonly statusFlags?: unknown;
  readonly updatedAt?: unknown;
}

export type OcaSessionStoreCreateResult =
  | {
      readonly ok: true;
      readonly status: 'created' | 'idempotent-replay';
      readonly session: OcaSessionModel;
    }
  | {
      readonly ok: false;
      readonly error: OcaSessionStoreError;
    };

export type OcaSessionStoreGetResult =
  | {
      readonly ok: true;
      readonly status: 'found' | 'resumed';
      readonly session: OcaSessionModel;
    }
  | {
      readonly ok: false;
      readonly error: OcaSessionStoreError;
    };

export type OcaSessionStoreListResult =
  | {
      readonly ok: true;
      readonly status: 'listed';
      readonly sessions: readonly OcaSessionModel[];
      readonly count: number;
      readonly limit: number;
    }
  | {
      readonly ok: false;
      readonly error: OcaSessionStoreError;
    };

export type OcaSessionStoreTransitionResult =
  | {
      readonly ok: true;
      readonly status: 'updated';
      readonly session: OcaSessionModel;
    }
  | {
      readonly ok: false;
      readonly error: OcaSessionStoreError;
    };

export interface OcaSessionStore {
  readonly create: (input: OcaSessionStoreCreateInput) => OcaSessionStoreCreateResult;
  readonly get: (sessionRef: unknown) => OcaSessionStoreGetResult;
  readonly resume: (sessionRef: unknown) => OcaSessionStoreGetResult;
  readonly list: (input?: OcaSessionStoreListInput) => OcaSessionStoreListResult;
  readonly transition: (input: OcaSessionStoreTransitionInput) => OcaSessionStoreTransitionResult;
}

export interface InMemoryOcaSessionStoreOptions {
  readonly maxListLimit?: number;
}

interface IdempotencyRecord {
  readonly sessionRef: OcaSessionRef;
  readonly inputFingerprint: string;
}

const DEFAULT_LIST_LIMIT = 25;
const DEFAULT_MAX_LIST_LIMIT = 100;
const SAFE_IDEMPOTENCY_REF_PATTERN = /^idempotency:[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/u;

export function createInMemoryOcaSessionStore(options: InMemoryOcaSessionStoreOptions = {}): OcaSessionStore {
  const sessionsByRef = new Map<OcaSessionRef, OcaSessionModel>();
  const sessionsByIdempotencyRef = new Map<string, IdempotencyRecord>();
  const maxListLimit = readMaxListLimit(options.maxListLimit);

  return Object.freeze({
    create(input: OcaSessionStoreCreateInput): OcaSessionStoreCreateResult {
      if (!isRecord(input)) {
        return invalidCreate('invalid-request', 'Create input must be a safe object.');
      }

      const idempotencyRefResult = readIdempotencyRef(input.idempotencyRef);
      if (!idempotencyRefResult.ok) {
        return invalidCreate('invalid-idempotency-ref', 'A safe idempotency ref is required.');
      }

      const normalized = normalizeOcaSessionModel(input.session);
      if (!normalized.ok) {
        return invalidCreate('invalid-session', 'Session input is not a safe OCA session record.', normalized.issues);
      }

      const session = normalized.value;
      if (session.idempotencyRef !== idempotencyRefResult.value) {
        return invalidCreate('invalid-idempotency-ref', 'Session idempotency ref must match the request ref.');
      }

      const inputFingerprint = fingerprintSession(session);
      const existingIdempotencyRecord = sessionsByIdempotencyRef.get(idempotencyRefResult.value);
      if (existingIdempotencyRecord !== undefined) {
        if (existingIdempotencyRecord.inputFingerprint !== inputFingerprint) {
          return invalidCreate('idempotency-conflict', 'Idempotent create input conflicts with an existing session.');
        }

        const existingSession = sessionsByRef.get(existingIdempotencyRecord.sessionRef);
        if (existingSession === undefined) {
          return invalidCreate('not-found', 'Stored session could not be found.');
        }

        return freezeCreateResult({
          ok: true,
          status: 'idempotent-replay',
          session: cloneOcaSessionModel(existingSession),
        });
      }

      const existingSession = sessionsByRef.get(session.sessionRef);
      if (existingSession !== undefined) {
        return invalidCreate('session-conflict', 'Session ref already exists for a different create request.');
      }

      const storedSession = cloneOcaSessionModel(session);
      sessionsByRef.set(storedSession.sessionRef, storedSession);
      sessionsByIdempotencyRef.set(idempotencyRefResult.value, Object.freeze({ sessionRef: storedSession.sessionRef, inputFingerprint }));

      return freezeCreateResult({
        ok: true,
        status: 'created',
        session: cloneOcaSessionModel(storedSession),
      });
    },

    get(sessionRef: unknown): OcaSessionStoreGetResult {
      return readExistingSession(sessionRef, 'found');
    },

    resume(sessionRef: unknown): OcaSessionStoreGetResult {
      return readExistingSession(sessionRef, 'resumed');
    },

    list(input: OcaSessionStoreListInput = {}): OcaSessionStoreListResult {
      if (!isRecord(input)) {
        return invalidList('invalid-request', 'List input must be a safe object.');
      }

      const limitResult = readLimit(input.limit, maxListLimit);
      if (!limitResult.ok) {
        return invalidList('invalid-request', 'List limit must be a safe bounded integer.');
      }

      const sessions = Object.freeze([...sessionsByRef.values()].slice(0, limitResult.value).map(cloneOcaSessionModel));
      return freezeListResult({
        ok: true,
        status: 'listed',
        sessions,
        count: sessions.length,
        limit: limitResult.value,
      });
    },

    transition(input: OcaSessionStoreTransitionInput): OcaSessionStoreTransitionResult {
      if (!isRecord(input)) {
        return invalidTransition('invalid-request', 'Transition input must be a safe object.');
      }

      const refResult = validateOcaSessionRef(input.sessionRef);
      if (!refResult.ok) {
        return invalidTransition('not-found', 'Session was not found.');
      }

      const existingSession = sessionsByRef.get(refResult.value);
      if (existingSession === undefined) {
        return invalidTransition('not-found', 'Session was not found.');
      }

      const transitionResult = validateOcaSessionLifecycleTransition(existingSession.lifecycleState, input.lifecycleState);
      if (!transitionResult.ok) {
        return invalidTransition('invalid-transition', 'Lifecycle transition is not allowed.', transitionResult.issues);
      }

      const candidate = withTransition(existingSession, transitionResult.to, readStatusFlags(input.statusFlags), input.updatedAt);
      const normalized = normalizeOcaSessionModel(candidate);
      if (!normalized.ok) {
        return invalidTransition('invalid-session', 'Transition output is not a safe OCA session record.', normalized.issues);
      }

      if (!isSafeOcaSessionStoreJson(normalized.value)) {
        return invalidTransition('unsafe-json', 'Transition output is not safe JSON.');
      }

      const storedSession = cloneOcaSessionModel(normalized.value);
      sessionsByRef.set(storedSession.sessionRef, storedSession);

      return freezeTransitionResult({
        ok: true,
        status: 'updated',
        session: cloneOcaSessionModel(storedSession),
      });
    },
  } satisfies OcaSessionStore);

  function readExistingSession(sessionRef: unknown, status: 'found' | 'resumed'): OcaSessionStoreGetResult {
    const refResult = validateOcaSessionRef(sessionRef);
    if (!refResult.ok) {
      return invalidGet('not-found', 'Session was not found.');
    }

    const session = sessionsByRef.get(refResult.value);
    if (session === undefined) {
      return invalidGet('not-found', 'Session was not found.');
    }

    return freezeGetResult({ ok: true, status, session: cloneOcaSessionModel(session) });
  }
}

export function isSafeOcaSessionStoreJson(value: unknown): boolean {
  return isSafeOcaSessionModelJson(value);
}

function withTransition(
  session: OcaSessionModel,
  lifecycleState: OcaSessionLifecycleState,
  statusFlags: OcaSessionStatusFlags,
  updatedAt: unknown,
): OcaSessionModel {
  const updateFields = isDefined(updatedAt) ? { updatedAt } : {};

  return {
    ...session,
    ...updateFields,
    lifecycleState,
    derivedStatus: deriveOcaSessionStatus(lifecycleState, statusFlags),
  } as OcaSessionModel;
}

function fingerprintSession(session: OcaSessionModel): string {
  return JSON.stringify(cloneOcaSessionModel(session)) ?? '';
}

function readIdempotencyRef(value: unknown): { readonly ok: true; readonly value: string } | { readonly ok: false } {
  if (typeof value !== 'string') {
    return Object.freeze({ ok: false });
  }

  if (!SAFE_IDEMPOTENCY_REF_PATTERN.test(value)) {
    return Object.freeze({ ok: false });
  }

  return Object.freeze({ ok: true, value });
}

function readLimit(value: unknown, maxListLimit: number): { readonly ok: true; readonly value: number } | { readonly ok: false } {
  if (!isDefined(value)) {
    return Object.freeze({ ok: true, value: Math.min(DEFAULT_LIST_LIMIT, maxListLimit) });
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > maxListLimit) {
    return Object.freeze({ ok: false });
  }

  return Object.freeze({ ok: true, value });
}

function readMaxListLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return DEFAULT_MAX_LIST_LIMIT;
  }

  return Math.min(value, DEFAULT_MAX_LIST_LIMIT);
}

function readStatusFlags(value: unknown): OcaSessionStatusFlags {
  if (!isRecord(value)) {
    return Object.freeze({});
  }

  const flags: { degraded?: boolean; stale?: boolean; blocked?: boolean } = {};
  assignBooleanFlag(flags, 'degraded', value.degraded);
  assignBooleanFlag(flags, 'stale', value.stale);
  assignBooleanFlag(flags, 'blocked', value.blocked);
  return Object.freeze(flags);
}

function assignBooleanFlag(flags: { degraded?: boolean; stale?: boolean; blocked?: boolean }, key: keyof OcaSessionStatusFlags, value: unknown): void {
  if (typeof value === 'boolean') {
    flags[key] = value;
  }
}

function invalidCreate(
  code: OcaSessionStoreErrorCode,
  summary: string,
  issues?: readonly OcaSessionModelValidationIssue[],
): OcaSessionStoreCreateResult {
  return freezeCreateResult({ ok: false, error: safeError(code, summary, issues) });
}

function invalidGet(code: OcaSessionStoreErrorCode, summary: string): OcaSessionStoreGetResult {
  return freezeGetResult({ ok: false, error: safeError(code, summary) });
}

function invalidList(code: OcaSessionStoreErrorCode, summary: string): OcaSessionStoreListResult {
  return freezeListResult({ ok: false, error: safeError(code, summary) });
}

function invalidTransition(
  code: OcaSessionStoreErrorCode,
  summary: string,
  issues?: readonly OcaSessionModelValidationIssue[],
): OcaSessionStoreTransitionResult {
  return freezeTransitionResult({ ok: false, error: safeError(code, summary, issues) });
}

function safeError(
  code: OcaSessionStoreErrorCode,
  summary: string,
  issues?: readonly OcaSessionModelValidationIssue[],
): OcaSessionStoreError {
  const issueFields = issues === undefined || issues.length === 0 ? {} : { issues: Object.freeze(issues.map(cloneIssue)) };
  return Object.freeze({ code, summary, ...issueFields } satisfies OcaSessionStoreError);
}

function cloneIssue(issue: OcaSessionModelValidationIssue): OcaSessionModelValidationIssue {
  const optionalFields = issue.refKind === undefined ? {} : { refKind: issue.refKind };
  return Object.freeze({ code: issue.code, field: issue.field, ...optionalFields });
}

function freezeCreateResult(result: OcaSessionStoreCreateResult): OcaSessionStoreCreateResult {
  return Object.freeze(result);
}

function freezeGetResult(result: OcaSessionStoreGetResult): OcaSessionStoreGetResult {
  return Object.freeze(result);
}

function freezeListResult(result: OcaSessionStoreListResult): OcaSessionStoreListResult {
  return Object.freeze(result);
}

function freezeTransitionResult(result: OcaSessionStoreTransitionResult): OcaSessionStoreTransitionResult {
  return Object.freeze(result);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined;
}
