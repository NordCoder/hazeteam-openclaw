import {
  createTelegramDeliverySafeError,
  createTelegramExternalMessageRef,
  type TelegramDeliveryFailure,
  type TelegramDeliveryRequest,
  type TelegramDeliveryResult,
  type TelegramDeliverySafeError,
  type TelegramDeliverySafeErrorCode,
  type TelegramDeliverySuccess,
} from '../contracts/delivery.js';
import {
  isAdapterIdempotencyKey,
  type AdapterIdempotencyKey,
} from '../contracts/idempotency.js';
import {
  parseOpenClawAdapterRef,
  type AdapterCorrelationRef,
  type AdapterOperationRef,
} from '../contracts/refs.js';

export const DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION = 1;

const DEFAULT_DELIVERY_ATTEMPT_TIMESTAMP = '1970-01-01T00:00:00.000Z';
const DELIVERY_ATTEMPT_VALIDATION_MESSAGE_ID = 'telegram-message:delivery-attempt-validation';
const SAFE_DELIVERY_ATTEMPT_REF_VALUE_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const MAX_DELIVERY_ATTEMPT_REF_VALUE_LENGTH = 256;
const MAX_SAFE_TEXT_LENGTH = 240;

const FORBIDDEN_PUBLIC_FIELD_NAMES = new Set([
  'apikey',
  'authorization',
  'bottoken',
  'callbackpayload',
  'credential',
  'endpoint',
  'filesystempath',
  'password',
  'passwd',
  'rawcallbackpayload',
  'rawerror',
  'rawproviderpayload',
  'rawproviderresponse',
  'rawruntimevalue',
  'secret',
  'sdkhandle',
  'stack',
  'token',
]);

const FORBIDDEN_PUBLIC_STRING_TERMS = [
  'apiKey',
  'authorization',
  'botToken',
  'credential',
  'endpoint',
  'filesystemPath',
  'password',
  'rawCallbackPayload',
  'rawProviderPayload',
  'rawProviderResponse',
  'rawRuntimeValue',
  'sdkHandle',
  'secret',
  'stack',
  'token',
] as const;

const FORBIDDEN_PUBLIC_TERM_PATTERN = new RegExp(
  `\\b(?:${FORBIDDEN_PUBLIC_STRING_TERMS.map(escapeRegExp).join('|')})\\b`,
  'giu',
);
const SENSITIVE_ASSIGNMENT_PATTERN = new RegExp(
  `\\b(?:${FORBIDDEN_PUBLIC_STRING_TERMS.map(escapeRegExp).join('|')})\\b\\s*[:=]\\s*\\S+`,
  'giu',
);

export type DeliveryAttemptRef = `delivery-attempt:${string}`;
export type DeliveryAttemptTargetRef = `delivery-target:${string}`;
export type DeliveryExternalMessageRef = `external-message:${string}`;
export type DeliveryProviderAcknowledgementRef = `provider-acknowledgement:${string}`;

export type DeliveryAttemptExecutionStatus =
  | 'reserved'
  | 'provider-acknowledged'
  | 'provider-failed'
  | 'business-succeeded'
  | 'business-failed';

export type DeliveryProviderAcknowledgementStatus = 'accepted' | 'rejected' | 'failed';
export type DeliveryBusinessResultStatus = 'not-evaluated' | 'marked-delivered' | 'marked-failed';
export type DeliveryRetryEligibility = 'not-evaluated' | 'eligible' | 'not-eligible';

export interface DeliveryAttemptRequestSnapshot {
  readonly deliveryTargetRef: DeliveryAttemptTargetRef;
  readonly contentKind: 'text';
  readonly contentFormat: TelegramDeliveryRequest['content']['format'];
  readonly hasActionButtons: boolean;
}

export interface DeliveryAttemptRecord {
  readonly schemaVersion: typeof DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION;
  readonly recordKind: 'delivery-attempt';
  readonly attemptRef: DeliveryAttemptRef;
  readonly deliveryRef: AdapterOperationRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly attemptNumber: number;
  readonly request: DeliveryAttemptRequestSnapshot;
  readonly executionStatus: DeliveryAttemptExecutionStatus;
  readonly providerAcknowledgementRef?: DeliveryProviderAcknowledgementRef;
  readonly providerAcknowledgementStatus?: DeliveryProviderAcknowledgementStatus;
  readonly businessResultStatus: DeliveryBusinessResultStatus;
  readonly retryEligibility: DeliveryRetryEligibility;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface DeliveryProviderAcknowledgementRecord {
  readonly schemaVersion: typeof DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION;
  readonly recordKind: 'delivery-provider-acknowledgement';
  readonly providerAcknowledgementRef: DeliveryProviderAcknowledgementRef;
  readonly attemptRef: DeliveryAttemptRef;
  readonly deliveryRef: AdapterOperationRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly providerAcknowledgementStatus: DeliveryProviderAcknowledgementStatus;
  readonly acceptedByProvider: boolean;
  readonly externalMessageRef?: DeliveryExternalMessageRef;
  readonly redactedFailure?: TelegramDeliverySafeError;
  readonly retryEligibility: DeliveryRetryEligibility;
  readonly businessResultStatus: 'not-evaluated';
  readonly shouldMarkDelivered: false;
  readonly shouldMarkFailed: false;
  readonly recordedAtIso: string;
}

export interface DeliveryBusinessResultRecord {
  readonly schemaVersion: typeof DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION;
  readonly recordKind: 'delivery-business-result';
  readonly attemptRef: DeliveryAttemptRef;
  readonly deliveryRef: AdapterOperationRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly businessResultStatus: Exclude<DeliveryBusinessResultStatus, 'not-evaluated'>;
  readonly providerAcknowledgementRef?: DeliveryProviderAcknowledgementRef;
  readonly retryEligibility: DeliveryRetryEligibility;
  readonly shouldMarkDelivered: boolean;
  readonly shouldMarkFailed: boolean;
  readonly shouldRetry: boolean;
  readonly recordedAtIso: string;
}

export type DeliveryAttemptStoredRecord =
  | DeliveryAttemptRecord
  | DeliveryProviderAcknowledgementRecord
  | DeliveryBusinessResultRecord;

export interface CreateDeliveryAttemptRecordInput {
  readonly request: TelegramDeliveryRequest;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly attemptRef?: DeliveryAttemptRef;
  readonly attemptNumber?: number;
  readonly createdAtIso?: string;
}

export interface CreateDeliveryProviderAcknowledgementRecordInput {
  readonly attemptRef: DeliveryAttemptRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly result: TelegramDeliveryResult;
  readonly providerAcknowledgementRef?: DeliveryProviderAcknowledgementRef;
  readonly recordedAtIso?: string;
}

export interface CreateDeliveryBusinessResultRecordInput {
  readonly attemptRef: DeliveryAttemptRef;
  readonly deliveryRef: AdapterOperationRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly businessResultStatus: Exclude<DeliveryBusinessResultStatus, 'not-evaluated'>;
  readonly providerAcknowledgementRef?: DeliveryProviderAcknowledgementRef;
  readonly retryEligibility?: DeliveryRetryEligibility;
  readonly recordedAtIso?: string;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function resetPattern(pattern: RegExp): void {
  pattern.lastIndex = 0;
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function rejectForbiddenPublicFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectForbiddenPublicFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (FORBIDDEN_PUBLIC_FIELD_NAMES.has(normalizeFieldName(fieldName))) {
      throw new TypeError(`${label} must not include unsafe public fields.`);
    }
    rejectForbiddenPublicFields(value, label, seen);
  }
}

function rejectForbiddenPublicStringValues(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input === 'string') {
    resetPattern(FORBIDDEN_PUBLIC_TERM_PATTERN);
    if (FORBIDDEN_PUBLIC_TERM_PATTERN.test(input)) {
      throw new TypeError(`${label} must not include unsafe public string values.`);
    }
    return;
  }

  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectForbiddenPublicStringValues(value, label, seen);
    }
    return;
  }

  for (const value of Object.values(input)) {
    rejectForbiddenPublicStringValues(value, label, seen);
  }
}

function sanitizeSafeText(input: unknown): string {
  if (typeof input !== 'string') {
    return 'Delivery attempt failed';
  }

  const normalized = input
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(FORBIDDEN_PUBLIC_TERM_PATTERN, '[redacted]')
    .trim();

  if (normalized.length === 0) {
    return 'Delivery attempt failed';
  }

  if (normalized.length <= MAX_SAFE_TEXT_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_SAFE_TEXT_LENGTH - 3)}...`;
}

function cloneSafeJson<T>(input: T, label: string): T {
  rejectForbiddenPublicFields(input, label);

  let serialized: string;
  try {
    const candidate = JSON.stringify(input);
    if (candidate === undefined) {
      throw new TypeError('JSON serialization returned undefined.');
    }
    serialized = candidate;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON serialization failed';
    throw new TypeError(`${label} must be JSON serializable: ${message}`);
  }

  const parsed = JSON.parse(serialized) as T;
  rejectForbiddenPublicFields(parsed, label);
  rejectForbiddenPublicStringValues(parsed, label);
  return parsed;
}

function deepFreeze<T>(input: T, seen = new Set<object>()): T {
  if (typeof input !== 'object' || input === null || seen.has(input)) {
    return input;
  }

  seen.add(input);
  Object.freeze(input);
  for (const value of Object.values(input as Record<string, unknown>)) {
    deepFreeze(value, seen);
  }

  return input;
}

function safeRecord<T>(input: T, label: string): T {
  return deepFreeze(cloneSafeJson(input, label));
}

function normalizeIsoTimestamp(input: unknown, label: string): string {
  const value = input ?? DEFAULT_DELIVERY_ATTEMPT_TIMESTAMP;
  if (typeof value !== 'string' || value.trim() !== value || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${label} must be an ISO timestamp string.`);
  }

  return value;
}

function normalizeAttemptNumber(input: unknown): number {
  const value = input ?? 1;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new TypeError('Delivery attempt number must be a positive safe integer.');
  }

  return value;
}

function normalizeIdempotencyKey(input: unknown): AdapterIdempotencyKey {
  if (!isAdapterIdempotencyKey(input)) {
    throw new TypeError('Delivery attempt idempotencyKey must be a safe adapter idempotency key.');
  }

  return input;
}

function normalizeOperationRef(input: unknown, label: string): AdapterOperationRef {
  const parsed = parseOpenClawAdapterRef(input);
  if (parsed?.kind !== 'operation') {
    throw new TypeError(`${label} must be a safe operation ref.`);
  }

  return parsed.ref as AdapterOperationRef;
}

function normalizeOptionalCorrelationRef(input: unknown, label: string): AdapterCorrelationRef | undefined {
  if (input === undefined) {
    return undefined;
  }

  const parsed = parseOpenClawAdapterRef(input);
  if (parsed?.kind !== 'correlation') {
    throw new TypeError(`${label} must be a safe correlation ref.`);
  }

  return parsed.ref as AdapterCorrelationRef;
}

function safeRefValue(input: string, label: string): string {
  const normalized = input.trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_DELIVERY_ATTEMPT_REF_VALUE_LENGTH ||
    !SAFE_DELIVERY_ATTEMPT_REF_VALUE_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a non-empty safe ref value.`);
  }

  return normalized;
}

function createPrefixedDeliveryAttemptRef<T extends string>(prefix: string, value: string, label: string): T {
  return `${prefix}${safeRefValue(value, label)}` as T;
}

function normalizePrefixedDeliveryAttemptRef<T extends string>(
  input: unknown,
  prefix: string,
  label: string,
): T {
  if (typeof input !== 'string' || !input.startsWith(prefix)) {
    throw new TypeError(`${label} must be a safe delivery attempt ref.`);
  }

  return createPrefixedDeliveryAttemptRef<T>(prefix, input.slice(prefix.length), label);
}

function operationRefValue(deliveryRef: AdapterOperationRef): string {
  const parsed = parseOpenClawAdapterRef(deliveryRef);
  if (parsed?.kind !== 'operation') {
    throw new TypeError('Delivery ref must be a safe operation ref.');
  }

  return parsed.value;
}

function safeValueFromIdempotencyKey(idempotencyKey: AdapterIdempotencyKey): string {
  return idempotencyKey.replace(/:/gu, '.');
}

export function createDeliveryAttemptRef(value: string): DeliveryAttemptRef {
  return createPrefixedDeliveryAttemptRef<DeliveryAttemptRef>('delivery-attempt:', value, 'Delivery attempt ref');
}

export function createDeliveryAttemptRefFromIdempotencyKey(
  idempotencyKey: AdapterIdempotencyKey,
): DeliveryAttemptRef {
  return createDeliveryAttemptRef(safeValueFromIdempotencyKey(normalizeIdempotencyKey(idempotencyKey)));
}

export function createDeliveryAttemptTargetRef(value: string): DeliveryAttemptTargetRef {
  return createPrefixedDeliveryAttemptRef<DeliveryAttemptTargetRef>('delivery-target:', value, 'Delivery attempt target ref');
}

export function createDeliveryExternalMessageRef(value: string): DeliveryExternalMessageRef {
  return createPrefixedDeliveryAttemptRef<DeliveryExternalMessageRef>('external-message:', value, 'Delivery external message ref');
}

export function createDeliveryProviderAcknowledgementRef(value: string): DeliveryProviderAcknowledgementRef {
  return createPrefixedDeliveryAttemptRef<DeliveryProviderAcknowledgementRef>(
    'provider-acknowledgement:',
    value,
    'Delivery provider acknowledgement ref',
  );
}

export function createDeliveryProviderAcknowledgementRefFromAttemptRef(
  attemptRef: DeliveryAttemptRef,
): DeliveryProviderAcknowledgementRef {
  const normalizedAttemptRef = normalizeDeliveryAttemptRef(attemptRef, 'Delivery attempt ref');
  return createDeliveryProviderAcknowledgementRef(normalizedAttemptRef.slice('delivery-attempt:'.length));
}

export function normalizeDeliveryAttemptRef(input: unknown, label: string): DeliveryAttemptRef {
  return normalizePrefixedDeliveryAttemptRef<DeliveryAttemptRef>(input, 'delivery-attempt:', label);
}

export function normalizeDeliveryProviderAcknowledgementRef(
  input: unknown,
  label: string,
): DeliveryProviderAcknowledgementRef {
  return normalizePrefixedDeliveryAttemptRef<DeliveryProviderAcknowledgementRef>(
    input,
    'provider-acknowledgement:',
    label,
  );
}

function normalizeDeliveryAttemptTargetRef(input: unknown, label: string): DeliveryAttemptTargetRef {
  return normalizePrefixedDeliveryAttemptRef<DeliveryAttemptTargetRef>(input, 'delivery-target:', label);
}

function normalizeDeliveryExternalMessageRef(input: unknown, label: string): DeliveryExternalMessageRef {
  return normalizePrefixedDeliveryAttemptRef<DeliveryExternalMessageRef>(input, 'external-message:', label);
}

function validateDeliveryRequest(request: TelegramDeliveryRequest): void {
  assertPlainObject(request, 'Delivery attempt request');
  createTelegramExternalMessageRef({
    target: request.target,
    messageId: DELIVERY_ATTEMPT_VALIDATION_MESSAGE_ID,
    ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
  });
}

function createRequestSnapshot(request: TelegramDeliveryRequest): DeliveryAttemptRequestSnapshot {
  validateDeliveryRequest(request);
  const deliveryRef = normalizeOperationRef(request.deliveryRef, 'Delivery attempt request deliveryRef');
  const deliveryTargetRef = createDeliveryAttemptTargetRef(`${operationRefValue(deliveryRef)}.target`);
  const content = request.content;
  assertPlainObject(content, 'Delivery attempt request content');
  if (content.format !== 'plain' && content.format !== 'markdown' && content.format !== 'html') {
    throw new TypeError('Delivery attempt content format must be plain, markdown, or html.');
  }

  return safeRecord(
    {
      deliveryTargetRef,
      contentKind: 'text' as const,
      contentFormat: content.format,
      hasActionButtons: (content.buttonGroups?.length ?? 0) > 0,
    },
    'Delivery attempt request snapshot',
  );
}

function normalizeSafeError(input: TelegramDeliverySafeError): TelegramDeliverySafeError {
  assertPlainObject(input, 'Delivery attempt safe error');
  return createTelegramDeliverySafeError({
    code: input.code as TelegramDeliverySafeErrorCode,
    message: sanitizeSafeText(input.message),
    ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
  });
}

function validateDeliverySuccess(result: TelegramDeliverySuccess): AdapterOperationRef {
  assertPlainObject(result, 'Delivery attempt success result');
  if (result.ok !== true) {
    throw new TypeError('Delivery attempt success result must have ok=true.');
  }
  createTelegramExternalMessageRef({
    target: {
      channelId: result.externalMessageRef.channelId,
      chatId: result.externalMessageRef.chatId,
      messageThreadId: result.externalMessageRef.messageThreadId,
      ...(result.externalMessageRef.workspaceRef === undefined
        ? {}
        : { workspaceRef: result.externalMessageRef.workspaceRef }),
      ...(result.externalMessageRef.agentRef === undefined
        ? {}
        : { agentRef: result.externalMessageRef.agentRef }),
    },
    messageId: result.externalMessageRef.messageId,
    ...(result.externalMessageRef.correlationRef === undefined
      ? {}
      : { correlationRef: result.externalMessageRef.correlationRef }),
  });

  return normalizeOperationRef(result.deliveryRef, 'Delivery attempt success deliveryRef');
}

function validateDeliveryFailure(result: TelegramDeliveryFailure): {
  readonly deliveryRef: AdapterOperationRef;
  readonly error: TelegramDeliverySafeError;
  readonly retryEligibility: DeliveryRetryEligibility;
} {
  assertPlainObject(result, 'Delivery attempt failure result');
  if (result.ok !== false) {
    throw new TypeError('Delivery attempt failure result must have ok=false.');
  }

  const error = normalizeSafeError(result.error);
  const retryable = result.retryable ?? error.retryable ?? false;
  return {
    deliveryRef: normalizeOperationRef(result.deliveryRef, 'Delivery attempt failure deliveryRef'),
    error,
    retryEligibility: retryable ? 'eligible' : 'not-eligible',
  };
}

function acknowledgementStatusFromFailure(error: TelegramDeliverySafeError): DeliveryProviderAcknowledgementStatus {
  return error.code === 'provider-rejected' ? 'rejected' : 'failed';
}

function normalizeRetryEligibility(input: unknown): DeliveryRetryEligibility {
  if (input === undefined) {
    return 'not-evaluated';
  }
  if (input !== 'not-evaluated' && input !== 'eligible' && input !== 'not-eligible') {
    throw new TypeError('Delivery retry eligibility must use supported vocabulary.');
  }

  return input;
}

function normalizeBusinessResultStatus(
  input: unknown,
): Exclude<DeliveryBusinessResultStatus, 'not-evaluated'> {
  if (input !== 'marked-delivered' && input !== 'marked-failed') {
    throw new TypeError('Delivery business result status must be marked-delivered or marked-failed.');
  }

  return input;
}

function shouldRetry(status: Exclude<DeliveryBusinessResultStatus, 'not-evaluated'>, retryEligibility: DeliveryRetryEligibility): boolean {
  return status === 'marked-failed' && retryEligibility === 'eligible';
}

export function createDeliveryAttemptRecord(input: CreateDeliveryAttemptRecordInput): DeliveryAttemptRecord {
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const request = input.request;
  const deliveryRef = normalizeOperationRef(request.deliveryRef, 'Delivery attempt request deliveryRef');
  const attemptRef = input.attemptRef ?? createDeliveryAttemptRefFromIdempotencyKey(idempotencyKey);
  const correlationRef = normalizeOptionalCorrelationRef(request.correlationRef, 'Delivery attempt correlationRef');
  const createdAtIso = normalizeIsoTimestamp(input.createdAtIso, 'Delivery attempt createdAtIso');

  return safeRecord(
    {
      schemaVersion: DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
      recordKind: 'delivery-attempt' as const,
      attemptRef: normalizeDeliveryAttemptRef(attemptRef, 'Delivery attempt ref'),
      deliveryRef,
      idempotencyKey,
      attemptNumber: normalizeAttemptNumber(input.attemptNumber),
      request: createRequestSnapshot(request),
      executionStatus: 'reserved' as const,
      businessResultStatus: 'not-evaluated' as const,
      retryEligibility: 'not-evaluated' as const,
      ...(correlationRef === undefined ? {} : { correlationRef }),
      createdAtIso,
      updatedAtIso: createdAtIso,
    },
    'Delivery attempt record',
  );
}

export function createDeliveryProviderAcknowledgementRecord(
  input: CreateDeliveryProviderAcknowledgementRecordInput,
): DeliveryProviderAcknowledgementRecord {
  const attemptRef = normalizeDeliveryAttemptRef(input.attemptRef, 'Delivery attempt acknowledgement attemptRef');
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const providerAcknowledgementRef = input.providerAcknowledgementRef ??
    createDeliveryProviderAcknowledgementRefFromAttemptRef(attemptRef);
  const recordedAtIso = normalizeIsoTimestamp(
    input.recordedAtIso,
    'Delivery provider acknowledgement recordedAtIso',
  );

  if (input.result.ok === true) {
    const deliveryRef = validateDeliverySuccess(input.result);
    const externalMessageRef = createDeliveryExternalMessageRef(`${operationRefValue(deliveryRef)}.external`);
    return safeRecord(
      {
        schemaVersion: DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
        recordKind: 'delivery-provider-acknowledgement' as const,
        providerAcknowledgementRef: normalizeDeliveryProviderAcknowledgementRef(
          providerAcknowledgementRef,
          'Delivery provider acknowledgement ref',
        ),
        attemptRef,
        deliveryRef,
        idempotencyKey,
        providerAcknowledgementStatus: 'accepted' as const,
        acceptedByProvider: true,
        externalMessageRef,
        retryEligibility: 'not-eligible' as const,
        businessResultStatus: 'not-evaluated' as const,
        shouldMarkDelivered: false as const,
        shouldMarkFailed: false as const,
        recordedAtIso,
      },
      'Delivery provider acknowledgement record',
    );
  }

  const failure = validateDeliveryFailure(input.result);
  return safeRecord(
    {
      schemaVersion: DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
      recordKind: 'delivery-provider-acknowledgement' as const,
      providerAcknowledgementRef: normalizeDeliveryProviderAcknowledgementRef(
        providerAcknowledgementRef,
        'Delivery provider acknowledgement ref',
      ),
      attemptRef,
      deliveryRef: failure.deliveryRef,
      idempotencyKey,
      providerAcknowledgementStatus: acknowledgementStatusFromFailure(failure.error),
      acceptedByProvider: false,
      redactedFailure: failure.error,
      retryEligibility: failure.retryEligibility,
      businessResultStatus: 'not-evaluated' as const,
      shouldMarkDelivered: false as const,
      shouldMarkFailed: false as const,
      recordedAtIso,
    },
    'Delivery provider acknowledgement record',
  );
}

export function createDeliveryBusinessResultRecord(
  input: CreateDeliveryBusinessResultRecordInput,
): DeliveryBusinessResultRecord {
  const businessResultStatus = normalizeBusinessResultStatus(input.businessResultStatus);
  const retryEligibility = normalizeRetryEligibility(input.retryEligibility);
  const shouldMarkDelivered = businessResultStatus === 'marked-delivered';
  const shouldMarkFailed = businessResultStatus === 'marked-failed';

  return safeRecord(
    {
      schemaVersion: DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
      recordKind: 'delivery-business-result' as const,
      attemptRef: normalizeDeliveryAttemptRef(input.attemptRef, 'Delivery business result attemptRef'),
      deliveryRef: normalizeOperationRef(input.deliveryRef, 'Delivery business result deliveryRef'),
      idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
      businessResultStatus,
      ...(input.providerAcknowledgementRef === undefined
        ? {}
        : {
            providerAcknowledgementRef: normalizeDeliveryProviderAcknowledgementRef(
              input.providerAcknowledgementRef,
              'Delivery business result provider acknowledgement ref',
            ),
          }),
      retryEligibility,
      shouldMarkDelivered,
      shouldMarkFailed,
      shouldRetry: shouldRetry(businessResultStatus, retryEligibility),
      recordedAtIso: normalizeIsoTimestamp(input.recordedAtIso, 'Delivery business result recordedAtIso'),
    },
    'Delivery business result record',
  );
}

export function updateDeliveryAttemptWithProviderAcknowledgement(
  attempt: DeliveryAttemptRecord,
  acknowledgement: DeliveryProviderAcknowledgementRecord,
): DeliveryAttemptRecord {
  if (attempt.attemptRef !== acknowledgement.attemptRef || attempt.deliveryRef !== acknowledgement.deliveryRef) {
    throw new TypeError('Delivery provider acknowledgement must match the delivery attempt.');
  }

  return safeRecord(
    {
      ...attempt,
      executionStatus:
        acknowledgement.providerAcknowledgementStatus === 'accepted'
          ? ('provider-acknowledged' as const)
          : ('provider-failed' as const),
      providerAcknowledgementRef: acknowledgement.providerAcknowledgementRef,
      providerAcknowledgementStatus: acknowledgement.providerAcknowledgementStatus,
      retryEligibility: acknowledgement.retryEligibility,
      businessResultStatus: 'not-evaluated' as const,
      updatedAtIso: acknowledgement.recordedAtIso,
    },
    'Delivery attempt acknowledgement update',
  );
}

export function updateDeliveryAttemptWithBusinessResult(
  attempt: DeliveryAttemptRecord,
  businessResult: DeliveryBusinessResultRecord,
): DeliveryAttemptRecord {
  if (attempt.attemptRef !== businessResult.attemptRef || attempt.deliveryRef !== businessResult.deliveryRef) {
    throw new TypeError('Delivery business result must match the delivery attempt.');
  }

  return safeRecord(
    {
      ...attempt,
      executionStatus:
        businessResult.businessResultStatus === 'marked-delivered'
          ? ('business-succeeded' as const)
          : ('business-failed' as const),
      ...(businessResult.providerAcknowledgementRef === undefined
        ? {}
        : { providerAcknowledgementRef: businessResult.providerAcknowledgementRef }),
      businessResultStatus: businessResult.businessResultStatus,
      retryEligibility: businessResult.retryEligibility,
      updatedAtIso: businessResult.recordedAtIso,
    },
    'Delivery attempt business result update',
  );
}

export function normalizeDeliveryAttemptRecord(input: unknown): DeliveryAttemptRecord | undefined {
  try {
    assertPlainObject(input, 'Delivery attempt record');
    if (input.schemaVersion !== DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION || input.recordKind !== 'delivery-attempt') {
      return undefined;
    }

    const executionStatus = input.executionStatus;
    if (
      executionStatus !== 'reserved' &&
      executionStatus !== 'provider-acknowledged' &&
      executionStatus !== 'provider-failed' &&
      executionStatus !== 'business-succeeded' &&
      executionStatus !== 'business-failed'
    ) {
      return undefined;
    }

    const businessResultStatus = input.businessResultStatus;
    if (
      businessResultStatus !== 'not-evaluated' &&
      businessResultStatus !== 'marked-delivered' &&
      businessResultStatus !== 'marked-failed'
    ) {
      return undefined;
    }

    const request = input.request;
    assertPlainObject(request, 'Delivery attempt record request');

    return safeRecord(
      {
        schemaVersion: DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
        recordKind: 'delivery-attempt' as const,
        attemptRef: normalizeDeliveryAttemptRef(input.attemptRef, 'Delivery attempt record attemptRef'),
        deliveryRef: normalizeOperationRef(input.deliveryRef, 'Delivery attempt record deliveryRef'),
        idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
        attemptNumber: normalizeAttemptNumber(input.attemptNumber),
        request: {
          deliveryTargetRef: normalizeDeliveryAttemptTargetRef(
            request.deliveryTargetRef,
            'Delivery attempt record target ref',
          ),
          contentKind: 'text' as const,
          contentFormat: request.contentFormat as DeliveryAttemptRequestSnapshot['contentFormat'],
          hasActionButtons: request.hasActionButtons === true,
        },
        executionStatus,
        ...(input.providerAcknowledgementRef === undefined
          ? {}
          : {
              providerAcknowledgementRef: normalizeDeliveryProviderAcknowledgementRef(
                input.providerAcknowledgementRef,
                'Delivery attempt record provider acknowledgement ref',
              ),
            }),
        ...(input.providerAcknowledgementStatus === undefined
          ? {}
          : { providerAcknowledgementStatus: input.providerAcknowledgementStatus as DeliveryProviderAcknowledgementStatus }),
        businessResultStatus: businessResultStatus as DeliveryBusinessResultStatus,
        retryEligibility: normalizeRetryEligibility(input.retryEligibility),
        ...(input.correlationRef === undefined
          ? {}
          : { correlationRef: normalizeOptionalCorrelationRef(input.correlationRef, 'Delivery attempt record correlationRef') }),
        createdAtIso: normalizeIsoTimestamp(input.createdAtIso, 'Delivery attempt record createdAtIso'),
        updatedAtIso: normalizeIsoTimestamp(input.updatedAtIso, 'Delivery attempt record updatedAtIso'),
      },
      'Delivery attempt record',
    );
  } catch {
    return undefined;
  }
}

export function normalizeDeliveryProviderAcknowledgementRecord(
  input: unknown,
): DeliveryProviderAcknowledgementRecord | undefined {
  try {
    assertPlainObject(input, 'Delivery provider acknowledgement record');
    if (
      input.schemaVersion !== DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION ||
      input.recordKind !== 'delivery-provider-acknowledgement'
    ) {
      return undefined;
    }

    const providerAcknowledgementStatus = input.providerAcknowledgementStatus;
    if (
      providerAcknowledgementStatus !== 'accepted' &&
      providerAcknowledgementStatus !== 'rejected' &&
      providerAcknowledgementStatus !== 'failed'
    ) {
      return undefined;
    }

    return safeRecord(
      {
        schemaVersion: DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
        recordKind: 'delivery-provider-acknowledgement' as const,
        providerAcknowledgementRef: normalizeDeliveryProviderAcknowledgementRef(
          input.providerAcknowledgementRef,
          'Delivery provider acknowledgement record ref',
        ),
        attemptRef: normalizeDeliveryAttemptRef(input.attemptRef, 'Delivery provider acknowledgement attemptRef'),
        deliveryRef: normalizeOperationRef(input.deliveryRef, 'Delivery provider acknowledgement deliveryRef'),
        idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
        providerAcknowledgementStatus,
        acceptedByProvider: input.acceptedByProvider === true,
        ...(input.externalMessageRef === undefined
          ? {}
          : {
              externalMessageRef: normalizeDeliveryExternalMessageRef(
                input.externalMessageRef,
                'Delivery provider acknowledgement external message ref',
              ),
            }),
        ...(input.redactedFailure === undefined
          ? {}
          : { redactedFailure: normalizeSafeError(input.redactedFailure as TelegramDeliverySafeError) }),
        retryEligibility: normalizeRetryEligibility(input.retryEligibility),
        businessResultStatus: 'not-evaluated' as const,
        shouldMarkDelivered: false as const,
        shouldMarkFailed: false as const,
        recordedAtIso: normalizeIsoTimestamp(
          input.recordedAtIso,
          'Delivery provider acknowledgement recordedAtIso',
        ),
      },
      'Delivery provider acknowledgement record',
    );
  } catch {
    return undefined;
  }
}

export function normalizeDeliveryBusinessResultRecord(input: unknown): DeliveryBusinessResultRecord | undefined {
  try {
    assertPlainObject(input, 'Delivery business result record');
    if (
      input.schemaVersion !== DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION ||
      input.recordKind !== 'delivery-business-result'
    ) {
      return undefined;
    }

    const businessResultStatus = normalizeBusinessResultStatus(input.businessResultStatus);
    const retryEligibility = normalizeRetryEligibility(input.retryEligibility);
    return safeRecord(
      {
        schemaVersion: DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
        recordKind: 'delivery-business-result' as const,
        attemptRef: normalizeDeliveryAttemptRef(input.attemptRef, 'Delivery business result attemptRef'),
        deliveryRef: normalizeOperationRef(input.deliveryRef, 'Delivery business result deliveryRef'),
        idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
        businessResultStatus,
        ...(input.providerAcknowledgementRef === undefined
          ? {}
          : {
              providerAcknowledgementRef: normalizeDeliveryProviderAcknowledgementRef(
                input.providerAcknowledgementRef,
                'Delivery business result provider acknowledgement ref',
              ),
            }),
        retryEligibility,
        shouldMarkDelivered: businessResultStatus === 'marked-delivered',
        shouldMarkFailed: businessResultStatus === 'marked-failed',
        shouldRetry: shouldRetry(businessResultStatus, retryEligibility),
        recordedAtIso: normalizeIsoTimestamp(input.recordedAtIso, 'Delivery business result recordedAtIso'),
      },
      'Delivery business result record',
    );
  } catch {
    return undefined;
  }
}

export function normalizeDeliveryAttemptStoredRecord(input: unknown): DeliveryAttemptStoredRecord | undefined {
  return (
    normalizeDeliveryAttemptRecord(input) ??
    normalizeDeliveryProviderAcknowledgementRecord(input) ??
    normalizeDeliveryBusinessResultRecord(input)
  );
}
