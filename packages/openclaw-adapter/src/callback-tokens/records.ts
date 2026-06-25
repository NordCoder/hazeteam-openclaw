const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const ASSIGNMENT_VALUE_PATTERN = /\b[A-Za-z][A-Za-z0-9_-]{0,40}\b\s*[:=]\s*\S+/gu;
const MAX_SAFE_REF_LENGTH = 256;
const MAX_SAFE_TEXT_LENGTH = 240;

export type CallbackTokenOpaqueHandle = string;
export type CallbackTokenRecordRef = string;
export type CallbackTokenActionRef = string;
export type CallbackTokenCorrelationRef = string;
export type CallbackTokenDetailsRef = string;
export type CallbackTokenReplayStatus = 'fresh' | 'duplicate';
export type CallbackTokenLifecycleStatus = 'issued' | 'verified' | 'consumed' | 'permission-denied' | 'failed';
export type CallbackTokenStoreErrorCode =
  | 'invalid-input'
  | 'not-found'
  | 'conflict'
  | 'permission-denied'
  | 'dependency-failed';

export interface CallbackTokenPermissionAllowed {
  readonly status: 'allowed';
  readonly decisionRef?: string | undefined;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}

export interface CallbackTokenPermissionDenied {
  readonly status: 'denied';
  readonly decisionRef?: string | undefined;
  readonly reasonRef?: string | undefined;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}

export type CallbackTokenPermissionDecision = CallbackTokenPermissionAllowed | CallbackTokenPermissionDenied;

export interface CallbackTokenPublicRecord {
  readonly kind: 'openclaw-callback-token-record';
  readonly recordRef: CallbackTokenRecordRef;
  readonly status: CallbackTokenLifecycleStatus;
  readonly tokenConsumed: boolean;
  readonly replaySafe: true;
  readonly issuedAt: string;
  readonly verifiedAt?: string | undefined;
  readonly consumedAt?: string | undefined;
  readonly deniedAt?: string | undefined;
  readonly failedAt?: string | undefined;
  readonly actionRef?: CallbackTokenActionRef | undefined;
  readonly permission?: CallbackTokenPermissionDecision | undefined;
  readonly consumeAttempts: number;
  readonly duplicateConsumes: number;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
  readonly failureRef?: string | undefined;
}

export interface CallbackTokenIssueInput {
  readonly tokenHandle: CallbackTokenOpaqueHandle;
  readonly recordRef: CallbackTokenRecordRef;
  readonly issuedAt: string;
  readonly actionRef?: CallbackTokenActionRef | undefined;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}

export interface CallbackTokenVerifyInput {
  readonly tokenHandle: CallbackTokenOpaqueHandle;
  readonly verifiedAt: string;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}

export interface CallbackTokenConsumeInput {
  readonly tokenHandle: CallbackTokenOpaqueHandle;
  readonly consumedAt: string;
  readonly permission: CallbackTokenPermissionAllowed;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}

export interface CallbackTokenDenyInput {
  readonly tokenHandle: CallbackTokenOpaqueHandle;
  readonly deniedAt: string;
  readonly permission: CallbackTokenPermissionDenied;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}

export interface CallbackTokenFailInput {
  readonly tokenHandle: CallbackTokenOpaqueHandle;
  readonly failedAt: string;
  readonly failureRef?: string | undefined;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}

export interface CallbackTokenSafeError {
  readonly code: CallbackTokenStoreErrorCode;
  readonly message: string;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}

export type CallbackTokenStoreResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: CallbackTokenSafeError };

export function callbackTokenOk<T>(value: T): CallbackTokenStoreResult<T> {
  return Object.freeze({ ok: true, value });
}

export function createCallbackTokenSafeError(input: {
  readonly code: CallbackTokenStoreErrorCode;
  readonly message: string;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}): CallbackTokenSafeError {
  const detailsRef = normalizeOptionalSafeRef(input.detailsRef, 'callback token error detailsRef');
  const correlationRef = normalizeOptionalSafeRef(input.correlationRef, 'callback token error correlationRef');

  return Object.freeze({
    code: normalizeErrorCode(input.code),
    message: normalizeSafeText(input.message, 'callback token error message'),
    ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function callbackTokenErr(input: {
  readonly code: CallbackTokenStoreErrorCode;
  readonly message: string;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: CallbackTokenDetailsRef | undefined;
  readonly correlationRef?: CallbackTokenCorrelationRef | undefined;
}): CallbackTokenStoreResult<never> {
  return Object.freeze({ ok: false, error: createCallbackTokenSafeError(input) });
}

function normalizeErrorCode(code: CallbackTokenStoreErrorCode): CallbackTokenStoreErrorCode {
  if (
    code !== 'invalid-input' &&
    code !== 'not-found' &&
    code !== 'conflict' &&
    code !== 'permission-denied' &&
    code !== 'dependency-failed'
  ) {
    throw new TypeError('callback token error code is unsupported.');
  }

  return code;
}

function normalizeSafeText(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(ASSIGNMENT_VALUE_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > MAX_SAFE_TEXT_LENGTH) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

export function normalizeCallbackTokenHandle(input: unknown, label = 'callback token handle'): CallbackTokenOpaqueHandle {
  return normalizeSafeRef(input, label);
}

export function normalizeCallbackTokenRecordRef(input: unknown, label = 'callback token recordRef'): CallbackTokenRecordRef {
  return normalizeSafeRef(input, label);
}

export function normalizeSafeRef<T extends string = string>(input: unknown, label: string): T {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_SAFE_REF_LENGTH ||
    !SAFE_REF_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a bounded safe ref.`);
  }

  return normalized as T;
}

export function normalizeOptionalSafeRef<T extends string = string>(
  input: unknown,
  label: string,
): T | undefined {
  return input === undefined ? undefined : normalizeSafeRef<T>(input, label);
}

export function normalizeCallbackTokenPermissionDecision(
  input: CallbackTokenPermissionDecision,
): CallbackTokenPermissionDecision {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('callback token permission decision must be an object.');
  }

  const decisionRef = normalizeOptionalSafeRef(input.decisionRef, 'callback token permission decisionRef');
  const detailsRef = normalizeOptionalSafeRef<CallbackTokenDetailsRef>(
    input.detailsRef,
    'callback token permission detailsRef',
  );
  const correlationRef = normalizeOptionalSafeRef<CallbackTokenCorrelationRef>(
    input.correlationRef,
    'callback token permission correlationRef',
  );

  if (input.status === 'allowed') {
    return Object.freeze({
      status: 'allowed',
      ...(decisionRef === undefined ? {} : { decisionRef }),
      ...(detailsRef === undefined ? {} : { detailsRef }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    });
  }

  if (input.status === 'denied') {
    const reasonRef = normalizeOptionalSafeRef(input.reasonRef, 'callback token permission reasonRef');

    return Object.freeze({
      status: 'denied',
      ...(decisionRef === undefined ? {} : { decisionRef }),
      ...(reasonRef === undefined ? {} : { reasonRef }),
      ...(detailsRef === undefined ? {} : { detailsRef }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    });
  }

  throw new TypeError('callback token permission decision status is unsupported.');
}

export function normalizeCallbackTokenAllowedDecision(
  input: CallbackTokenPermissionAllowed,
): CallbackTokenPermissionAllowed {
  const permission = normalizeCallbackTokenPermissionDecision(input);
  if (permission.status !== 'allowed') {
    throw new TypeError('callback token permission must be allowed.');
  }

  return permission;
}

export function normalizeCallbackTokenDeniedDecision(
  input: CallbackTokenPermissionDenied,
): CallbackTokenPermissionDenied {
  const permission = normalizeCallbackTokenPermissionDecision(input);
  if (permission.status !== 'denied') {
    throw new TypeError('callback token permission must be denied.');
  }

  return permission;
}

function freezeRecord(record: CallbackTokenPublicRecord): CallbackTokenPublicRecord {
  return Object.freeze(record);
}

export function createIssuedCallbackTokenRecord(input: CallbackTokenIssueInput): CallbackTokenPublicRecord {
  normalizeCallbackTokenHandle(input.tokenHandle);
  const actionRef = normalizeOptionalSafeRef<CallbackTokenActionRef>(input.actionRef, 'callback token actionRef');
  const detailsRef = normalizeOptionalSafeRef<CallbackTokenDetailsRef>(input.detailsRef, 'callback token detailsRef');
  const correlationRef = normalizeOptionalSafeRef<CallbackTokenCorrelationRef>(
    input.correlationRef,
    'callback token correlationRef',
  );

  return freezeRecord({
    kind: 'openclaw-callback-token-record',
    recordRef: normalizeCallbackTokenRecordRef(input.recordRef),
    status: 'issued',
    tokenConsumed: false,
    replaySafe: true,
    issuedAt: normalizeSafeRef(input.issuedAt, 'callback token issuedAt'),
    consumeAttempts: 0,
    duplicateConsumes: 0,
    ...(actionRef === undefined ? {} : { actionRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function markCallbackTokenVerified(
  record: CallbackTokenPublicRecord,
  input: CallbackTokenVerifyInput,
): CallbackTokenPublicRecord {
  normalizeCallbackTokenHandle(input.tokenHandle);
  const detailsRef = normalizeOptionalSafeRef<CallbackTokenDetailsRef>(
    input.detailsRef ?? record.detailsRef,
    'callback token verified detailsRef',
  );
  const correlationRef = normalizeOptionalSafeRef<CallbackTokenCorrelationRef>(
    input.correlationRef ?? record.correlationRef,
    'callback token verified correlationRef',
  );

  if (record.status === 'consumed' || record.status === 'verified') {
    return freezeRecord({ ...record });
  }
  if (record.status !== 'issued') {
    throw new TypeError('callback token can be verified only from issued state.');
  }

  return freezeRecord({
    ...record,
    status: 'verified',
    verifiedAt: normalizeSafeRef(input.verifiedAt, 'callback token verifiedAt'),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function markCallbackTokenConsumed(
  record: CallbackTokenPublicRecord,
  input: CallbackTokenConsumeInput,
): CallbackTokenPublicRecord {
  normalizeCallbackTokenHandle(input.tokenHandle);
  const permission = normalizeCallbackTokenAllowedDecision(input.permission);
  const detailsRef = normalizeOptionalSafeRef<CallbackTokenDetailsRef>(
    input.detailsRef ?? record.detailsRef,
    'callback token consumed detailsRef',
  );
  const correlationRef = normalizeOptionalSafeRef<CallbackTokenCorrelationRef>(
    input.correlationRef ?? record.correlationRef,
    'callback token consumed correlationRef',
  );

  if (record.status === 'consumed') {
    return freezeRecord({
      ...record,
      consumeAttempts: record.consumeAttempts + 1,
      duplicateConsumes: record.duplicateConsumes + 1,
    });
  }
  if (record.status !== 'verified') {
    throw new TypeError('callback token can be consumed only after verification.');
  }

  return freezeRecord({
    ...record,
    status: 'consumed',
    tokenConsumed: true,
    consumedAt: normalizeSafeRef(input.consumedAt, 'callback token consumedAt'),
    permission,
    consumeAttempts: record.consumeAttempts + 1,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function markCallbackTokenDenied(
  record: CallbackTokenPublicRecord,
  input: CallbackTokenDenyInput,
): CallbackTokenPublicRecord {
  normalizeCallbackTokenHandle(input.tokenHandle);
  const permission = normalizeCallbackTokenDeniedDecision(input.permission);
  const detailsRef = normalizeOptionalSafeRef<CallbackTokenDetailsRef>(
    input.detailsRef ?? record.detailsRef,
    'callback token denied detailsRef',
  );
  const correlationRef = normalizeOptionalSafeRef<CallbackTokenCorrelationRef>(
    input.correlationRef ?? record.correlationRef,
    'callback token denied correlationRef',
  );

  if (record.status === 'consumed') {
    throw new TypeError('callback token cannot be denied after consumption.');
  }
  if (record.status === 'permission-denied') {
    return freezeRecord({ ...record });
  }

  return freezeRecord({
    ...record,
    status: 'permission-denied',
    tokenConsumed: false,
    deniedAt: normalizeSafeRef(input.deniedAt, 'callback token deniedAt'),
    permission,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function markCallbackTokenFailed(
  record: CallbackTokenPublicRecord,
  input: CallbackTokenFailInput,
): CallbackTokenPublicRecord {
  normalizeCallbackTokenHandle(input.tokenHandle);
  const failureRef = normalizeOptionalSafeRef(input.failureRef, 'callback token failureRef');
  const detailsRef = normalizeOptionalSafeRef<CallbackTokenDetailsRef>(
    input.detailsRef ?? record.detailsRef,
    'callback token failed detailsRef',
  );
  const correlationRef = normalizeOptionalSafeRef<CallbackTokenCorrelationRef>(
    input.correlationRef ?? record.correlationRef,
    'callback token failed correlationRef',
  );

  if (record.status === 'consumed') {
    throw new TypeError('callback token cannot fail after consumption.');
  }

  return freezeRecord({
    ...record,
    status: 'failed',
    tokenConsumed: false,
    failedAt: normalizeSafeRef(input.failedAt, 'callback token failedAt'),
    ...(failureRef === undefined ? {} : { failureRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}
