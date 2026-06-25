const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const MAX_SAFE_REF_LENGTH = 256;

export type FakeCallbackTokenLifecycleStatus = 'issued' | 'verified' | 'consumed' | 'permission-denied';
export type FakeCallbackTokenResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: FakeCallbackTokenSafeError };

export interface FakeCallbackTokenPermissionAllowed {
  readonly status: 'allowed';
  readonly decisionRef?: string | undefined;
}

export interface FakeCallbackTokenPermissionDenied {
  readonly status: 'denied';
  readonly decisionRef?: string | undefined;
  readonly reasonRef?: string | undefined;
}

export interface FakeCallbackTokenPublicRecord {
  readonly kind: 'openclaw-testkit-callback-token-record';
  readonly recordRef: string;
  readonly status: FakeCallbackTokenLifecycleStatus;
  readonly tokenConsumed: boolean;
  readonly replaySafe: true;
  readonly issuedAt: string;
  readonly verifiedAt?: string | undefined;
  readonly consumedAt?: string | undefined;
  readonly deniedAt?: string | undefined;
  readonly permission?: FakeCallbackTokenPermissionAllowed | FakeCallbackTokenPermissionDenied | undefined;
  readonly consumeAttempts: number;
  readonly duplicateConsumes: number;
}

export interface FakeCallbackTokenIssueInput {
  readonly tokenHandle: string;
  readonly recordRef: string;
  readonly issuedAt: string;
}

export interface FakeCallbackTokenVerifyInput {
  readonly tokenHandle: string;
  readonly verifiedAt: string;
}

export interface FakeCallbackTokenConsumeInput {
  readonly tokenHandle: string;
  readonly consumedAt: string;
  readonly permission: FakeCallbackTokenPermissionAllowed;
}

export interface FakeCallbackTokenDenyInput {
  readonly tokenHandle: string;
  readonly deniedAt: string;
  readonly permission: FakeCallbackTokenPermissionDenied;
}

export interface FakeCallbackTokenSafeError {
  readonly code: 'invalid-input' | 'not-found' | 'conflict' | 'permission-denied';
  readonly message: string;
  readonly retryable: false;
}

export interface FakeCallbackTokenDecision {
  readonly status:
    | 'issued'
    | 'already-issued'
    | 'verified'
    | 'already-verified'
    | 'consumed'
    | 'already-consumed'
    | 'permission-denied'
    | 'already-denied';
  readonly replayStatus: 'fresh' | 'duplicate';
  readonly consumedThisAttempt: boolean;
  readonly record: FakeCallbackTokenPublicRecord;
}

export interface FakeCallbackTokenSnapshot {
  readonly records: readonly FakeCallbackTokenPublicRecord[];
  readonly issuedCount: number;
  readonly verifiedCount: number;
  readonly consumedCount: number;
  readonly deniedCount: number;
}

export interface FakeCallbackTokenStore {
  readonly issue: (input: FakeCallbackTokenIssueInput) => FakeCallbackTokenResult<FakeCallbackTokenDecision>;
  readonly verify: (input: FakeCallbackTokenVerifyInput) => FakeCallbackTokenResult<FakeCallbackTokenDecision>;
  readonly consume: (input: FakeCallbackTokenConsumeInput) => FakeCallbackTokenResult<FakeCallbackTokenDecision>;
  readonly deny: (input: FakeCallbackTokenDenyInput) => FakeCallbackTokenResult<FakeCallbackTokenDecision>;
  readonly snapshot: () => FakeCallbackTokenResult<FakeCallbackTokenSnapshot>;
}

interface StoredRecord {
  readonly tokenHandle: string;
  readonly record: FakeCallbackTokenPublicRecord;
}

function ok<T>(value: T): FakeCallbackTokenResult<T> {
  return Object.freeze({ ok: true, value });
}

function err(error: FakeCallbackTokenSafeError): FakeCallbackTokenResult<never> {
  return Object.freeze({ ok: false, error });
}

function safeError(code: FakeCallbackTokenSafeError['code'], message: string): FakeCallbackTokenSafeError {
  return Object.freeze({ code, message, retryable: false });
}

function safeRef(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }
  const normalized = input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim();
  if (normalized.length === 0 || normalized.length > MAX_SAFE_REF_LENGTH || !SAFE_REF_PATTERN.test(normalized)) {
    throw new TypeError(`${label} must be a bounded safe ref.`);
  }
  return normalized;
}

function cloneRecord(record: FakeCallbackTokenPublicRecord): FakeCallbackTokenPublicRecord {
  return Object.freeze({
    ...record,
    ...(record.permission === undefined ? {} : { permission: Object.freeze({ ...record.permission }) }),
  });
}

function normalizeAllowed(permission: FakeCallbackTokenPermissionAllowed): FakeCallbackTokenPermissionAllowed {
  if (permission.status !== 'allowed') {
    throw new TypeError('fake callback token permission must be allowed.');
  }
  const decisionRef = permission.decisionRef === undefined ? undefined : safeRef(permission.decisionRef, 'permission decisionRef');
  return Object.freeze({ status: 'allowed', ...(decisionRef === undefined ? {} : { decisionRef }) });
}

function normalizeDenied(permission: FakeCallbackTokenPermissionDenied): FakeCallbackTokenPermissionDenied {
  if (permission.status !== 'denied') {
    throw new TypeError('fake callback token permission must be denied.');
  }
  const decisionRef = permission.decisionRef === undefined ? undefined : safeRef(permission.decisionRef, 'permission decisionRef');
  const reasonRef = permission.reasonRef === undefined ? undefined : safeRef(permission.reasonRef, 'permission reasonRef');
  return Object.freeze({
    status: 'denied',
    ...(decisionRef === undefined ? {} : { decisionRef }),
    ...(reasonRef === undefined ? {} : { reasonRef }),
  });
}

function decision(input: {
  readonly status: FakeCallbackTokenDecision['status'];
  readonly replayStatus: FakeCallbackTokenDecision['replayStatus'];
  readonly consumedThisAttempt: boolean;
  readonly record: FakeCallbackTokenPublicRecord;
}): FakeCallbackTokenDecision {
  return Object.freeze({ ...input, record: cloneRecord(input.record) });
}

function count(records: readonly FakeCallbackTokenPublicRecord[], status: FakeCallbackTokenLifecycleStatus): number {
  return records.filter((record) => record.status === status).length;
}

export function createFakeCallbackTokenStore(): FakeCallbackTokenStore {
  const byToken = new Map<string, string>();
  const byRecord = new Map<string, StoredRecord>();

  function read(tokenHandle: string): StoredRecord | null {
    const recordRef = byToken.get(tokenHandle);
    return recordRef === undefined ? null : byRecord.get(recordRef) ?? null;
  }

  function write(tokenHandle: string, record: FakeCallbackTokenPublicRecord): FakeCallbackTokenPublicRecord {
    const stored = Object.freeze({ tokenHandle, record: cloneRecord(record) });
    byToken.set(tokenHandle, record.recordRef);
    byRecord.set(record.recordRef, stored);
    return stored.record;
  }

  return Object.freeze({
    issue(input: FakeCallbackTokenIssueInput) {
      let tokenHandle: string;
      let recordRef: string;
      try {
        tokenHandle = safeRef(input.tokenHandle, 'fake callback token handle');
        recordRef = safeRef(input.recordRef, 'fake callback token recordRef');
      } catch {
        return err(safeError('invalid-input', 'Fake callback token issue input is malformed.'));
      }

      const existing = read(tokenHandle);
      if (existing !== null) {
        return ok(decision({ status: 'already-issued', replayStatus: 'duplicate', consumedThisAttempt: false, record: existing.record }));
      }
      if (byRecord.has(recordRef)) {
        return err(safeError('conflict', 'Fake callback token record ref is already assigned.'));
      }

      const record = write(
        tokenHandle,
        Object.freeze({
          kind: 'openclaw-testkit-callback-token-record',
          recordRef,
          status: 'issued',
          tokenConsumed: false,
          replaySafe: true,
          issuedAt: safeRef(input.issuedAt, 'fake callback token issuedAt'),
          consumeAttempts: 0,
          duplicateConsumes: 0,
        }),
      );
      return ok(decision({ status: 'issued', replayStatus: 'fresh', consumedThisAttempt: false, record }));
    },

    verify(input: FakeCallbackTokenVerifyInput) {
      let tokenHandle: string;
      try {
        tokenHandle = safeRef(input.tokenHandle, 'fake callback token handle');
      } catch {
        return err(safeError('invalid-input', 'Fake callback token verify input is malformed.'));
      }
      const existing = read(tokenHandle);
      if (existing === null) {
        return err(safeError('not-found', 'Fake callback token record was not found.'));
      }
      if (existing.record.status === 'verified' || existing.record.status === 'consumed') {
        return ok(decision({ status: 'already-verified', replayStatus: 'duplicate', consumedThisAttempt: false, record: existing.record }));
      }
      if (existing.record.status !== 'issued') {
        return err(safeError('conflict', 'Fake callback token cannot be verified from its current state.'));
      }

      const record = write(tokenHandle, Object.freeze({ ...existing.record, status: 'verified', verifiedAt: safeRef(input.verifiedAt, 'fake callback token verifiedAt') }));
      return ok(decision({ status: 'verified', replayStatus: 'fresh', consumedThisAttempt: false, record }));
    },

    consume(input: FakeCallbackTokenConsumeInput) {
      let tokenHandle: string;
      let permission: FakeCallbackTokenPermissionAllowed;
      try {
        tokenHandle = safeRef(input.tokenHandle, 'fake callback token handle');
        permission = normalizeAllowed(input.permission);
      } catch {
        return err(safeError('invalid-input', 'Fake callback token consume input is malformed.'));
      }
      const existing = read(tokenHandle);
      if (existing === null) {
        return err(safeError('not-found', 'Fake callback token record was not found.'));
      }
      if (existing.record.status === 'permission-denied') {
        return err(safeError('permission-denied', 'Fake callback token permission was denied before consumption.'));
      }
      if (existing.record.status === 'consumed') {
        const record = write(tokenHandle, Object.freeze({
          ...existing.record,
          consumeAttempts: existing.record.consumeAttempts + 1,
          duplicateConsumes: existing.record.duplicateConsumes + 1,
        }));
        return ok(decision({ status: 'already-consumed', replayStatus: 'duplicate', consumedThisAttempt: false, record }));
      }
      if (existing.record.status !== 'verified') {
        return err(safeError('conflict', 'Fake callback token must be verified before consumption.'));
      }

      const record = write(tokenHandle, Object.freeze({
        ...existing.record,
        status: 'consumed',
        tokenConsumed: true,
        consumedAt: safeRef(input.consumedAt, 'fake callback token consumedAt'),
        permission,
        consumeAttempts: existing.record.consumeAttempts + 1,
      }));
      return ok(decision({ status: 'consumed', replayStatus: 'fresh', consumedThisAttempt: true, record }));
    },

    deny(input: FakeCallbackTokenDenyInput) {
      let tokenHandle: string;
      let permission: FakeCallbackTokenPermissionDenied;
      try {
        tokenHandle = safeRef(input.tokenHandle, 'fake callback token handle');
        permission = normalizeDenied(input.permission);
      } catch {
        return err(safeError('invalid-input', 'Fake callback token deny input is malformed.'));
      }
      const existing = read(tokenHandle);
      if (existing === null) {
        return err(safeError('not-found', 'Fake callback token record was not found.'));
      }
      if (existing.record.status === 'consumed') {
        return err(safeError('conflict', 'Fake callback token was already consumed.'));
      }
      if (existing.record.status === 'permission-denied') {
        return ok(decision({ status: 'already-denied', replayStatus: 'duplicate', consumedThisAttempt: false, record: existing.record }));
      }
      const record = write(tokenHandle, Object.freeze({
        ...existing.record,
        status: 'permission-denied',
        tokenConsumed: false,
        deniedAt: safeRef(input.deniedAt, 'fake callback token deniedAt'),
        permission,
      }));
      return ok(decision({ status: 'permission-denied', replayStatus: 'fresh', consumedThisAttempt: false, record }));
    },

    snapshot() {
      const records = Object.freeze([...byRecord.values()].map((entry) => cloneRecord(entry.record)).sort((left, right) => left.recordRef.localeCompare(right.recordRef)));
      return ok(Object.freeze({
        records,
        issuedCount: count(records, 'issued'),
        verifiedCount: count(records, 'verified'),
        consumedCount: count(records, 'consumed'),
        deniedCount: count(records, 'permission-denied'),
      }));
    },
  });
}
