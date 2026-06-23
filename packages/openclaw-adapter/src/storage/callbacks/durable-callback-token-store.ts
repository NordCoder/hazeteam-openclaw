import {
  isAdapterIdempotencyKey,
  type AdapterIdempotencyKey,
} from '../../contracts/idempotency.js';
import {
  allowPermission,
  denyPermission,
  type PermissionDecision,
  type PermissionRequirement,
} from '../../contracts/permissions.js';
import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
  type AdapterOperationResult,
  type AdapterSafeError,
} from '../../contracts/result.js';
import {
  parseOpenClawAdapterRef,
  type ActorRef,
  type AdapterCorrelationRef,
  type AdapterDetailsRef,
  type AgentRef,
  type OpenClawAdapterRefKind,
  type WorkspaceRef,
} from '../../contracts/refs.js';
import {
  parseOpenClawTelegramCallbackPayload,
  type OpenClawTelegramCallbackTokenConsumption,
  type OpenClawTelegramCallbackTokenRef,
  type OpenClawTelegramCallbackTokenVerification,
} from '../../callbacks/callback-token-flow.js';

const DURABLE_CALLBACK_TOKEN_RECORD_KIND = 'openclaw-durable-callback-token-record' as const;
const MAX_STORE_REF_LENGTH = 256;
const MAX_STORE_TIMESTAMP_LENGTH = 128;
const SAFE_STORE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;

const FORBIDDEN_STORAGE_FIELD_NAMES = [
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'toolPayload',
  'approvalPayload',
  'rawApprovalPayload',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
] as const;
const FORBIDDEN_STORAGE_FIELD_NAME_PARTS = [
  ['api', 'key'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['sec', 'ret'],
] as const;
const FORBIDDEN_STORAGE_FIELD_NAME_SET = new Set(
  FORBIDDEN_STORAGE_FIELD_NAMES.map((fieldName) => normalizeFieldName(fieldName)),
);

export type MaybePromise<T> = T | Promise<T>;

export type DurableCallbackTokenLifecycleStatus = 'verified' | 'consumed' | 'denied' | 'failed';

export interface DurableCallbackTokenLifecycleRecord {
  readonly kind: typeof DURABLE_CALLBACK_TOKEN_RECORD_KIND;
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly status: DurableCallbackTokenLifecycleStatus;
  readonly tokenConsumed: boolean;
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly verifiedAt?: string;
  readonly consumedAt?: string;
  readonly deniedAt?: string;
  readonly failedAt?: string;
  readonly verification?: OpenClawTelegramCallbackTokenVerification;
  readonly consumption?: OpenClawTelegramCallbackTokenConsumption;
  readonly permission?: PermissionDecision;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly failureRef?: string;
  readonly error?: AdapterSafeError;
}

export interface DurableCallbackTokenRecordBoundary {
  readonly get: (
    tokenRef: OpenClawTelegramCallbackTokenRef,
  ) => MaybePromise<DurableCallbackTokenLifecycleRecord | null | undefined>;
  readonly put: (
    record: DurableCallbackTokenLifecycleRecord,
  ) => MaybePromise<DurableCallbackTokenLifecycleRecord | void>;
  readonly delete: (tokenRef: OpenClawTelegramCallbackTokenRef) => MaybePromise<boolean | void>;
  readonly list?: (() => MaybePromise<readonly DurableCallbackTokenLifecycleRecord[]>) | undefined;
}

export interface DurableCallbackTokenVerificationInput {
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly verifiedAt: string;
  readonly verification: OpenClawTelegramCallbackTokenVerification;
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface DurableCallbackTokenDeniedInput {
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly deniedAt: string;
  readonly permission: PermissionDecision & { readonly status: 'denied' };
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface DurableCallbackTokenConsumedInput {
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly consumedAt: string;
  readonly verification: OpenClawTelegramCallbackTokenVerification;
  readonly consumption: OpenClawTelegramCallbackTokenConsumption;
  readonly permission: PermissionDecision & { readonly status: 'allowed' };
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface DurableCallbackTokenFailedInput {
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly failedAt: string;
  readonly error: AdapterSafeError;
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly failureRef?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface DurableCallbackTokenRecordedDecision {
  readonly kind: 'recorded';
  readonly duplicate: false;
  readonly record: DurableCallbackTokenLifecycleRecord;
}

export interface DurableCallbackTokenDuplicateDecision {
  readonly kind: 'duplicate';
  readonly duplicate: true;
  readonly record: DurableCallbackTokenLifecycleRecord;
}

export type DurableCallbackTokenRecordDecision =
  | DurableCallbackTokenRecordedDecision
  | DurableCallbackTokenDuplicateDecision;

export interface DurableCallbackTokenDeleteDecision {
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly deleted: boolean;
}

export interface DurableCallbackTokenStore {
  readonly recordVerified: (
    input: DurableCallbackTokenVerificationInput,
  ) => Promise<AdapterOperationResult<DurableCallbackTokenRecordDecision>>;
  readonly recordDenied: (
    input: DurableCallbackTokenDeniedInput,
  ) => Promise<AdapterOperationResult<DurableCallbackTokenLifecycleRecord>>;
  readonly recordConsumed: (
    input: DurableCallbackTokenConsumedInput,
  ) => Promise<AdapterOperationResult<DurableCallbackTokenLifecycleRecord>>;
  readonly recordFailed: (
    input: DurableCallbackTokenFailedInput,
  ) => Promise<AdapterOperationResult<DurableCallbackTokenLifecycleRecord>>;
  readonly getByToken: (
    tokenRef: OpenClawTelegramCallbackTokenRef,
  ) => Promise<AdapterOperationResult<DurableCallbackTokenLifecycleRecord | null>>;
  readonly getByIdempotencyKey: (
    idempotencyKey: AdapterIdempotencyKey,
  ) => Promise<AdapterOperationResult<DurableCallbackTokenLifecycleRecord | null>>;
  readonly delete: (
    tokenRef: OpenClawTelegramCallbackTokenRef,
  ) => Promise<AdapterOperationResult<DurableCallbackTokenDeleteDecision>>;
  readonly list: () => Promise<AdapterOperationResult<readonly DurableCallbackTokenLifecycleRecord[]>>;
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isForbiddenStorageFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    FORBIDDEN_STORAGE_FIELD_NAME_SET.has(normalizedFieldName) ||
    FORBIDDEN_STORAGE_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function sanitizeStoreText(input: string): string {
  const withoutControlCharacters = input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  return FORBIDDEN_STORAGE_FIELD_NAMES.reduce((currentText, forbiddenTerm) => {
    const assignmentPattern = new RegExp(`\\b${escapeRegExp(forbiddenTerm)}\\b\\s*[:=]\\s*\\S+`, 'giu');
    const termPattern = new RegExp(`\\b${escapeRegExp(forbiddenTerm)}\\b`, 'giu');

    return currentText.replace(assignmentPattern, '[redacted]').replace(termPattern, '[redacted]');
  }, withoutControlCharacters);
}

function containsForbiddenStorageTerm(input: string): boolean {
  const normalizedInput = normalizeFieldName(input);

  return (
    FORBIDDEN_STORAGE_FIELD_NAME_SET.has(normalizedInput) ||
    FORBIDDEN_STORAGE_FIELD_NAMES.some((term) => normalizedInput.includes(normalizeFieldName(term))) ||
    FORBIDDEN_STORAGE_FIELD_NAME_PARTS.some((parts) => normalizedInput.includes(parts.join('')))
  );
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function assertPlainRecord(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (!isPlainRecord(input)) {
    throw new TypeError(`${label} must be a plain record.`);
  }
}

function rejectUnsafeStorageFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeStorageFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isForbiddenStorageFieldName(fieldName)) {
      throw new TypeError(`${label} must not include raw provider, runtime, tool, error, or protected fields.`);
    }
    rejectUnsafeStorageFields(value, label, seen);
  }
}

function normalizeCallbackTokenRef(input: unknown, label: string): OpenClawTelegramCallbackTokenRef {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.trim();
  if (containsForbiddenStorageTerm(normalized)) {
    throw new TypeError(`${label} must not contain protected terms.`);
  }

  const parsedPayload = parseOpenClawTelegramCallbackPayload(`hz:${normalized}`);
  if (!parsedPayload.ok || parsedPayload.value.tokenRef !== normalized) {
    throw new TypeError(`${label} must be a safe callback token ref.`);
  }

  return parsedPayload.value.tokenRef;
}

function normalizeIdempotencyKey(input: unknown, label: string): AdapterIdempotencyKey {
  if (input === undefined) {
    throw new TypeError(`${label} is required.`);
  }
  if (!isAdapterIdempotencyKey(input) || containsForbiddenStorageTerm(input)) {
    throw new TypeError(`${label} must be a safe adapter idempotency key.`);
  }

  return input;
}

function normalizeOptionalIdempotencyKey(input: unknown, label: string): AdapterIdempotencyKey | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeIdempotencyKey(input, label);
}

function normalizeSafeStoreString(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = sanitizeStoreText(input);
  if (
    normalized.length === 0 ||
    normalized.length > maxLength ||
    !SAFE_STORE_REF_PATTERN.test(normalized) ||
    containsForbiddenStorageTerm(normalized)
  ) {
    throw new TypeError(`${label} must be a bounded safe storage string.`);
  }

  return normalized;
}

function normalizeTimestamp(input: unknown, label: string): string {
  return normalizeSafeStoreString(input, label, MAX_STORE_TIMESTAMP_LENGTH);
}

function normalizeSafeStoreRef(input: unknown, label: string): string {
  return normalizeSafeStoreString(input, label, MAX_STORE_REF_LENGTH);
}

function normalizeOptionalSafeStoreRef(input: unknown, label: string): string | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeSafeStoreRef(input, label);
}

function normalizeAdapterRef<T extends string>(
  input: unknown,
  kind: OpenClawAdapterRefKind,
  label: string,
): T {
  const parsed = parseOpenClawAdapterRef(input);
  if (parsed?.kind !== kind || containsForbiddenStorageTerm(parsed.ref)) {
    throw new TypeError(`${label} must be a safe adapter ref.`);
  }

  return parsed.ref as T;
}

function normalizeOptionalAdapterRef<T extends string>(
  input: unknown,
  kind: OpenClawAdapterRefKind,
  label: string,
): T | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeAdapterRef<T>(input, kind, label);
}

function normalizePermissionRequirement(input: unknown): PermissionRequirement {
  assertPlainRecord(input, 'Durable callback permission requirement');
  rejectUnsafeStorageFields(input, 'Durable callback permission requirement');

  const actorRef = normalizeOptionalAdapterRef<ActorRef>(
    input.actorRef,
    'actor',
    'Durable callback permission actorRef',
  );
  const workspaceRef = normalizeOptionalAdapterRef<WorkspaceRef>(
    input.workspaceRef,
    'workspace',
    'Durable callback permission workspaceRef',
  );
  const agentRef = normalizeOptionalAdapterRef<AgentRef>(
    input.agentRef,
    'agent',
    'Durable callback permission agentRef',
  );
  const resourceRef = normalizeOptionalSafeStoreRef(
    input.resourceRef,
    'Durable callback permission resourceRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Durable callback permission detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Durable callback permission correlationRef',
  );

  const requirement = Object.freeze({
    action: input.action,
    resourceKind: input.resourceKind,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(resourceRef === undefined ? {} : { resourceRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  }) as PermissionRequirement;

  return allowPermission(requirement).requirement;
}

function normalizePermissionDecision(input: PermissionDecision, expectedStatus: PermissionDecision['status']): PermissionDecision {
  assertPlainRecord(input, 'Durable callback permission decision');
  rejectUnsafeStorageFields(input, 'Durable callback permission decision');

  if (input.status !== expectedStatus) {
    throw new TypeError('Durable callback permission decision status is invalid for this transition.');
  }

  const requirement = normalizePermissionRequirement(input.requirement);
  if (input.status === 'allowed') {
    return allowPermission(requirement);
  }

  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Durable callback denied permission detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Durable callback denied permission correlationRef',
  );

  return denyPermission({
    requirement,
    reason: sanitizeStoreText(input.reason ?? 'Permission denied.'),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeTokenVerification(
  input: OpenClawTelegramCallbackTokenVerification,
  expectedTokenRef: OpenClawTelegramCallbackTokenRef,
): OpenClawTelegramCallbackTokenVerification {
  assertPlainRecord(input, 'Durable callback token verification');
  rejectUnsafeStorageFields(input, 'Durable callback token verification');

  if (input.status !== 'verified') {
    throw new TypeError('Durable callback token verification status must be verified.');
  }

  const tokenRef = normalizeCallbackTokenRef(input.tokenRef, 'Durable callback token verification tokenRef');
  if (tokenRef !== expectedTokenRef) {
    throw new TypeError('Durable callback token verification tokenRef must match lifecycle tokenRef.');
  }

  const verificationRef = normalizeOptionalSafeStoreRef(
    input.verificationRef,
    'Durable callback token verificationRef',
  );
  const actionRef = normalizeOptionalSafeStoreRef(input.actionRef, 'Durable callback token actionRef');
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Durable callback token verification detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Durable callback token verification correlationRef',
  );

  return Object.freeze({
    status: 'verified',
    tokenRef,
    ...(verificationRef === undefined ? {} : { verificationRef }),
    ...(actionRef === undefined ? {} : { actionRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeTokenConsumption(
  input: OpenClawTelegramCallbackTokenConsumption,
  expectedTokenRef: OpenClawTelegramCallbackTokenRef,
): OpenClawTelegramCallbackTokenConsumption {
  assertPlainRecord(input, 'Durable callback token consumption');
  rejectUnsafeStorageFields(input, 'Durable callback token consumption');

  if (input.status !== 'consumed') {
    throw new TypeError('Durable callback token consumption status must be consumed.');
  }

  const tokenRef = normalizeCallbackTokenRef(input.tokenRef, 'Durable callback token consumption tokenRef');
  if (tokenRef !== expectedTokenRef) {
    throw new TypeError('Durable callback token consumption tokenRef must match lifecycle tokenRef.');
  }

  const consumptionRef = normalizeOptionalSafeStoreRef(
    input.consumptionRef,
    'Durable callback token consumptionRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Durable callback token consumption detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Durable callback token consumption correlationRef',
  );

  return Object.freeze({
    status: 'consumed',
    tokenRef,
    ...(consumptionRef === undefined ? {} : { consumptionRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeSafeError(input: AdapterSafeError): AdapterSafeError {
  assertPlainRecord(input, 'Durable callback safe error');
  rejectUnsafeStorageFields(input, 'Durable callback safe error');

  if (typeof input.code !== 'string') {
    throw new TypeError('Durable callback safe error code must be a string.');
  }
  if (typeof input.message !== 'string') {
    throw new TypeError('Durable callback safe error message must be a string.');
  }
  if (input.retryable !== undefined && typeof input.retryable !== 'boolean') {
    throw new TypeError('Durable callback safe error retryable flag must be a boolean.');
  }

  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Durable callback safe error detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Durable callback safe error correlationRef',
  );

  return createAdapterSafeError({
    code: input.code as AdapterSafeError['code'],
    message: sanitizeStoreText(input.message),
    ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeLifecycleStatus(input: unknown): DurableCallbackTokenLifecycleStatus {
  if (input !== 'verified' && input !== 'consumed' && input !== 'denied' && input !== 'failed') {
    throw new TypeError('Durable callback lifecycle status is unsupported.');
  }

  return input;
}

function normalizeLifecycleRecord(input: unknown, label: string): DurableCallbackTokenLifecycleRecord {
  assertPlainRecord(input, label);
  rejectUnsafeStorageFields(input, label);

  if (input.kind !== DURABLE_CALLBACK_TOKEN_RECORD_KIND) {
    throw new TypeError(`${label} kind is unsupported.`);
  }

  const tokenRef = normalizeCallbackTokenRef(input.tokenRef, `${label} tokenRef`);
  const status = normalizeLifecycleStatus(input.status);
  const tokenConsumed = input.tokenConsumed;
  if (typeof tokenConsumed !== 'boolean') {
    throw new TypeError(`${label} tokenConsumed must be a boolean.`);
  }

  const idempotencyKey = normalizeOptionalIdempotencyKey(input.idempotencyKey, `${label} idempotencyKey`);
  const verifiedAt =
    input.verifiedAt === undefined ? undefined : normalizeTimestamp(input.verifiedAt, `${label} verifiedAt`);
  const consumedAt =
    input.consumedAt === undefined ? undefined : normalizeTimestamp(input.consumedAt, `${label} consumedAt`);
  const deniedAt =
    input.deniedAt === undefined ? undefined : normalizeTimestamp(input.deniedAt, `${label} deniedAt`);
  const failedAt =
    input.failedAt === undefined ? undefined : normalizeTimestamp(input.failedAt, `${label} failedAt`);
  const verification =
    input.verification === undefined
      ? undefined
      : normalizeTokenVerification(input.verification as OpenClawTelegramCallbackTokenVerification, tokenRef);
  const consumption =
    input.consumption === undefined
      ? undefined
      : normalizeTokenConsumption(input.consumption as OpenClawTelegramCallbackTokenConsumption, tokenRef);
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    `${label} detailsRef`,
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    `${label} correlationRef`,
  );
  const failureRef = normalizeOptionalSafeStoreRef(input.failureRef, `${label} failureRef`);
  const error = input.error === undefined ? undefined : normalizeSafeError(input.error as AdapterSafeError);

  const permission =
    input.permission === undefined
      ? undefined
      : normalizePermissionDecision(
          input.permission as PermissionDecision,
          status === 'denied' ? 'denied' : 'allowed',
        );

  if (status === 'verified' && (verifiedAt === undefined || verification === undefined || tokenConsumed)) {
    throw new TypeError(`${label} verified record requires verification and must not consume the token.`);
  }
  if (status === 'denied' && (deniedAt === undefined || permission === undefined || permission.status !== 'denied' || tokenConsumed)) {
    throw new TypeError(`${label} denied record requires denied permission and must not consume the token.`);
  }
  if (
    status === 'consumed' &&
    (verifiedAt === undefined ||
      consumedAt === undefined ||
      verification === undefined ||
      consumption === undefined ||
      permission === undefined ||
      permission.status !== 'allowed' ||
      !tokenConsumed)
  ) {
    throw new TypeError(`${label} consumed record requires verification, allowed permission, and consumption.`);
  }
  if (status === 'failed' && (failedAt === undefined || error === undefined || tokenConsumed)) {
    throw new TypeError(`${label} failed record requires a safe error and must not consume the token.`);
  }

  return Object.freeze({
    kind: DURABLE_CALLBACK_TOKEN_RECORD_KIND,
    tokenRef,
    status,
    tokenConsumed,
    ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
    ...(verifiedAt === undefined ? {} : { verifiedAt }),
    ...(consumedAt === undefined ? {} : { consumedAt }),
    ...(deniedAt === undefined ? {} : { deniedAt }),
    ...(failedAt === undefined ? {} : { failedAt }),
    ...(verification === undefined ? {} : { verification }),
    ...(consumption === undefined ? {} : { consumption }),
    ...(permission === undefined ? {} : { permission }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(failureRef === undefined ? {} : { failureRef }),
    ...(error === undefined ? {} : { error }),
  });
}

function createStoreError(input: {
  readonly code: AdapterSafeError['code'];
  readonly message: string;
  readonly retryable?: boolean;
}): AdapterOperationResult<never> {
  return adapterErr(
    createAdapterSafeError({
      code: input.code,
      message: input.message,
      ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    }),
  );
}

function validateBoundary(boundary: DurableCallbackTokenRecordBoundary): void {
  assertPlainRecord(boundary, 'Durable callback token boundary');
  if (typeof boundary.get !== 'function' || typeof boundary.put !== 'function' || typeof boundary.delete !== 'function') {
    throw new TypeError('Durable callback token boundary must provide get, put, and delete functions.');
  }
  if (boundary.list !== undefined && typeof boundary.list !== 'function') {
    throw new TypeError('Durable callback token boundary list must be a function when provided.');
  }
}

function validateOperationInput(input: unknown, label: string): void {
  assertPlainRecord(input, label);
  rejectUnsafeStorageFields(input, label);
}

function createVerifiedRecord(input: DurableCallbackTokenVerificationInput): DurableCallbackTokenLifecycleRecord {
  validateOperationInput(input, 'Durable callback verification input');
  const tokenRef = normalizeCallbackTokenRef(input.tokenRef, 'Durable callback verification tokenRef');

  return normalizeLifecycleRecord(
    {
      kind: DURABLE_CALLBACK_TOKEN_RECORD_KIND,
      tokenRef,
      status: 'verified',
      tokenConsumed: false,
      verifiedAt: input.verifiedAt,
      verification: input.verification,
      ...(input.idempotencyKey === undefined ? {} : { idempotencyKey: input.idempotencyKey }),
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    },
    'Durable callback verified record',
  );
}

function createDeniedRecord(input: DurableCallbackTokenDeniedInput): DurableCallbackTokenLifecycleRecord {
  validateOperationInput(input, 'Durable callback denied input');
  const tokenRef = normalizeCallbackTokenRef(input.tokenRef, 'Durable callback denied tokenRef');

  return normalizeLifecycleRecord(
    {
      kind: DURABLE_CALLBACK_TOKEN_RECORD_KIND,
      tokenRef,
      status: 'denied',
      tokenConsumed: false,
      deniedAt: input.deniedAt,
      permission: input.permission,
      ...(input.idempotencyKey === undefined ? {} : { idempotencyKey: input.idempotencyKey }),
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    },
    'Durable callback denied record',
  );
}

function createConsumedRecord(
  input: DurableCallbackTokenConsumedInput,
  existing: DurableCallbackTokenLifecycleRecord,
): DurableCallbackTokenLifecycleRecord {
  validateOperationInput(input, 'Durable callback consumed input');
  const tokenRef = normalizeCallbackTokenRef(input.tokenRef, 'Durable callback consumed tokenRef');
  const verification = normalizeTokenVerification(input.verification, tokenRef);

  return normalizeLifecycleRecord(
    {
      kind: DURABLE_CALLBACK_TOKEN_RECORD_KIND,
      tokenRef,
      status: 'consumed',
      tokenConsumed: true,
      verifiedAt: existing.verifiedAt,
      consumedAt: input.consumedAt,
      verification,
      consumption: input.consumption,
      permission: input.permission,
      idempotencyKey: input.idempotencyKey ?? existing.idempotencyKey,
      detailsRef: input.detailsRef ?? existing.detailsRef,
      correlationRef: input.correlationRef ?? existing.correlationRef,
    },
    'Durable callback consumed record',
  );
}

function createFailedRecord(input: DurableCallbackTokenFailedInput): DurableCallbackTokenLifecycleRecord {
  validateOperationInput(input, 'Durable callback failed input');
  const tokenRef = normalizeCallbackTokenRef(input.tokenRef, 'Durable callback failed tokenRef');

  return normalizeLifecycleRecord(
    {
      kind: DURABLE_CALLBACK_TOKEN_RECORD_KIND,
      tokenRef,
      status: 'failed',
      tokenConsumed: false,
      failedAt: input.failedAt,
      error: input.error,
      ...(input.idempotencyKey === undefined ? {} : { idempotencyKey: input.idempotencyKey }),
      ...(input.failureRef === undefined ? {} : { failureRef: input.failureRef }),
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    },
    'Durable callback failed record',
  );
}

async function readRecord(
  boundary: DurableCallbackTokenRecordBoundary,
  tokenRef: OpenClawTelegramCallbackTokenRef,
): Promise<DurableCallbackTokenLifecycleRecord | null> {
  const record = await boundary.get(tokenRef);
  if (record === null || record === undefined) {
    return null;
  }

  return normalizeLifecycleRecord(record, 'Durable callback persisted record');
}

async function writeRecord(
  boundary: DurableCallbackTokenRecordBoundary,
  record: DurableCallbackTokenLifecycleRecord,
): Promise<void> {
  const persisted = await boundary.put(record);
  if (persisted !== undefined) {
    normalizeLifecycleRecord(persisted, 'Durable callback persisted write record');
  }
}

async function listRecords(
  boundary: DurableCallbackTokenRecordBoundary,
): Promise<readonly DurableCallbackTokenLifecycleRecord[]> {
  if (boundary.list === undefined) {
    throw new TypeError('Durable callback token boundary list operation is missing.');
  }

  const records = await boundary.list();
  return Object.freeze(
    records.map((record) => normalizeLifecycleRecord(record, 'Durable callback listed record')),
  );
}

export function createDurableCallbackTokenStore(
  boundary: DurableCallbackTokenRecordBoundary,
): DurableCallbackTokenStore {
  validateBoundary(boundary);

  return Object.freeze({
    async recordVerified(input: DurableCallbackTokenVerificationInput) {
      let verifiedRecord: DurableCallbackTokenLifecycleRecord;
      try {
        verifiedRecord = createVerifiedRecord(input);
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable callback token verification input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, verifiedRecord.tokenRef);
        if (existingRecord !== null) {
          return adapterOk(
            Object.freeze({
              kind: 'duplicate',
              duplicate: true,
              record: existingRecord,
            }),
          );
        }

        await writeRecord(boundary, verifiedRecord);
        return adapterOk(
          Object.freeze({
            kind: 'recorded',
            duplicate: false,
            record: verifiedRecord,
          }),
        );
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable callback token boundary failed safely.',
          retryable: true,
        });
      }
    },

    async recordDenied(input: DurableCallbackTokenDeniedInput) {
      let deniedRecord: DurableCallbackTokenLifecycleRecord;
      try {
        deniedRecord = createDeniedRecord(input);
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable callback token denied input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, deniedRecord.tokenRef);
        if (existingRecord?.status === 'consumed' || existingRecord?.status === 'verified') {
          return createStoreError({
            code: 'conflict',
            message: 'Durable callback token cannot be denied after verification or consumption.',
            retryable: false,
          });
        }
        if (existingRecord?.status === 'denied') {
          return adapterOk(existingRecord);
        }

        await writeRecord(boundary, deniedRecord);
        return adapterOk(deniedRecord);
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable callback token boundary failed safely.',
          retryable: true,
        });
      }
    },

    async recordConsumed(input: DurableCallbackTokenConsumedInput) {
      let tokenRef: OpenClawTelegramCallbackTokenRef;
      try {
        validateOperationInput(input, 'Durable callback consumed input');
        tokenRef = normalizeCallbackTokenRef(input.tokenRef, 'Durable callback consumed tokenRef');
        normalizeTokenVerification(input.verification, tokenRef);
        normalizeTokenConsumption(input.consumption, tokenRef);
        normalizePermissionDecision(input.permission, 'allowed');
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable callback token consumed input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, tokenRef);
        if (existingRecord === null) {
          return createStoreError({
            code: 'not-found',
            message: 'Durable callback token verification record was not found.',
            retryable: false,
          });
        }
        if (existingRecord.status === 'consumed') {
          return adapterOk(existingRecord);
        }
        if (existingRecord.status !== 'verified') {
          return createStoreError({
            code: 'conflict',
            message: 'Durable callback token can be consumed only after verification.',
            retryable: false,
          });
        }

        const consumedRecord = createConsumedRecord(input, existingRecord);
        await writeRecord(boundary, consumedRecord);
        return adapterOk(consumedRecord);
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable callback token boundary failed safely.',
          retryable: true,
        });
      }
    },

    async recordFailed(input: DurableCallbackTokenFailedInput) {
      let failedRecord: DurableCallbackTokenLifecycleRecord;
      try {
        failedRecord = createFailedRecord(input);
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable callback token failed input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, failedRecord.tokenRef);
        if (existingRecord?.status === 'consumed') {
          return createStoreError({
            code: 'conflict',
            message: 'Consumed durable callback token records cannot be failed.',
            retryable: false,
          });
        }

        await writeRecord(boundary, failedRecord);
        return adapterOk(failedRecord);
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable callback token boundary failed safely.',
          retryable: true,
        });
      }
    },

    async getByToken(tokenRef: OpenClawTelegramCallbackTokenRef) {
      let normalizedTokenRef: OpenClawTelegramCallbackTokenRef;
      try {
        normalizedTokenRef = normalizeCallbackTokenRef(tokenRef, 'Durable callback token get tokenRef');
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable callback token get tokenRef is malformed.',
          retryable: false,
        });
      }

      try {
        return adapterOk(await readRecord(boundary, normalizedTokenRef));
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable callback token boundary failed safely.',
          retryable: true,
        });
      }
    },

    async getByIdempotencyKey(idempotencyKey: AdapterIdempotencyKey) {
      let normalizedIdempotencyKey: AdapterIdempotencyKey;
      try {
        normalizedIdempotencyKey = normalizeIdempotencyKey(
          idempotencyKey,
          'Durable callback token idempotencyKey',
        );
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable callback token idempotencyKey is malformed.',
          retryable: false,
        });
      }

      try {
        const matchingRecords = (await listRecords(boundary)).filter(
          (record) => record.idempotencyKey === normalizedIdempotencyKey,
        );
        return adapterOk(matchingRecords[0] ?? null);
      } catch {
        return createStoreError({
          code: boundary.list === undefined ? 'dependency-missing' : 'dependency-failed',
          message:
            boundary.list === undefined
              ? 'Durable callback token boundary list operation is missing.'
              : 'Durable callback token boundary failed safely.',
          retryable: boundary.list === undefined ? false : true,
        });
      }
    },

    async delete(tokenRef: OpenClawTelegramCallbackTokenRef) {
      let normalizedTokenRef: OpenClawTelegramCallbackTokenRef;
      try {
        normalizedTokenRef = normalizeCallbackTokenRef(tokenRef, 'Durable callback token delete tokenRef');
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable callback token delete tokenRef is malformed.',
          retryable: false,
        });
      }

      try {
        const deleted = await boundary.delete(normalizedTokenRef);
        return adapterOk(
          Object.freeze({
            tokenRef: normalizedTokenRef,
            deleted: deleted === undefined ? true : deleted,
          }),
        );
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable callback token boundary failed safely.',
          retryable: true,
        });
      }
    },

    async list() {
      try {
        return adapterOk(await listRecords(boundary));
      } catch {
        return createStoreError({
          code: boundary.list === undefined ? 'dependency-missing' : 'dependency-failed',
          message:
            boundary.list === undefined
              ? 'Durable callback token boundary list operation is missing.'
              : 'Durable callback token boundary failed safely.',
          retryable: boundary.list === undefined ? false : true,
        });
      }
    },
  });
}
