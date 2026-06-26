export const PROVIDER_CLIENT_KINDS = Object.freeze(['telegram', 'openclaw'] as const);

export type ProviderClientKind = (typeof PROVIDER_CLIENT_KINDS)[number];

export const PROVIDER_CLIENT_CREDENTIAL_STATUSES = Object.freeze([
  'configured-redacted',
  'redacted',
  'missing',
  'invalid',
  'unavailable',
] as const);

export type ProviderClientCredentialStatus = (typeof PROVIDER_CLIENT_CREDENTIAL_STATUSES)[number];

export const PROVIDER_CLIENT_READINESS_STATUSES = Object.freeze([
  'ready',
  'blocked-missing-port',
  'blocked-missing-credential',
  'blocked-disabled',
] as const);

export type ProviderClientReadinessStatus = (typeof PROVIDER_CLIENT_READINESS_STATUSES)[number];

export const PROVIDER_CLIENT_FAILURE_REASON_CODES = Object.freeze([
  'invalid-request',
  'missing-provider-port',
  'credential-blocked',
  'provider-disabled',
  'provider-rejected',
  'rate-limited',
  'timeout',
  'conflict',
  'internal',
] as const);

export type ProviderClientFailureReasonCode = (typeof PROVIDER_CLIENT_FAILURE_REASON_CODES)[number];

export const PROVIDER_CLIENT_FAILURE_CLASSIFICATIONS = Object.freeze([
  'invalid-request',
  'blocked-missing-port',
  'blocked-missing-credential',
  'blocked-disabled',
  'provider-returned-failure',
  'provider-threw',
  'malformed-provider-result',
] as const);

export type ProviderClientFailureClassification = (typeof PROVIDER_CLIENT_FAILURE_CLASSIFICATIONS)[number];

export type ProviderClientCallEffect = 'none-until-invoked';
export type ProviderClientDefaultEffect = 'none';
export type ProviderClientAckStatus = 'not-attempted' | 'provider-acknowledged' | 'provider-rejected';
export type ProviderClientBusinessStatus = 'not-marked-delivered' | 'not-marked-failed' | 'not-business-success';

export interface ProviderClientBoundaryDescriptor {
  readonly descriptorKind: 'provider-client-port-boundary';
  readonly descriptorVersion: 'w18b';
  readonly packageName: '@hazeteam/openclaw-telegram-transport';
  readonly providerClientConstructedByDefault: false;
  readonly networkBehaviorByDefault: 'none';
  readonly processEnvReads: false;
  readonly requiresInjectedPort: true;
  readonly providerAcknowledgementIsBusinessSuccess: false;
  readonly effects: ProviderClientDefaultEffect;
  readonly jsonSerializable: true;
}

export interface ProviderClientPortReadinessInput {
  readonly provider: unknown;
  readonly port?: unknown;
  readonly credentialStatus?: unknown;
  readonly enabled?: unknown;
}

export interface ProviderClientPortReadiness {
  readonly descriptorKind: 'provider-client-port-readiness';
  readonly descriptorVersion: 'w18b';
  readonly provider: ProviderClientKind;
  readonly status: ProviderClientReadinessStatus;
  readonly providerPortStatus: 'available' | 'missing';
  readonly credentialStatus: ProviderClientCredentialStatus;
  readonly providerClientConstructed: false;
  readonly willCallRemote: false;
  readonly effects: ProviderClientDefaultEffect;
  readonly jsonSerializable: true;
}

export interface ProviderClientDeliveryContentDescriptor {
  readonly format: 'plain' | 'markdown' | 'html';
  readonly text: string;
  readonly actionRefs?: readonly string[];
  readonly attachmentRefs?: readonly string[];
}

export interface ProviderClientDeliveryCallRequest {
  readonly descriptorKind: 'provider-client-delivery-call-request';
  readonly descriptorVersion: 'w18b';
  readonly provider: ProviderClientKind;
  readonly deliveryRef: string;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
  readonly targetRef: string;
  readonly routeRef?: string;
  readonly content: ProviderClientDeliveryContentDescriptor;
  readonly jsonSerializable: true;
}

export interface ProviderClientCallbackAcknowledgementRequest {
  readonly descriptorKind: 'provider-client-callback-acknowledgement-request';
  readonly descriptorVersion: 'w18b';
  readonly provider: ProviderClientKind;
  readonly callbackRef: string;
  readonly correlationRef?: string;
  readonly acknowledgementStatus: 'ack-required' | 'ack-not-required';
  readonly displayText: 'Processing' | 'Not allowed' | 'Action expired' | 'Already processed' | 'Could not process safely';
  readonly acknowledgesBusinessSuccess: false;
  readonly jsonSerializable: true;
}

export interface ProviderClientAcknowledgedRawResult {
  readonly ok: true;
  readonly providerMessageRef?: unknown;
  readonly acknowledgementRef?: unknown;
  readonly idempotencyRef?: unknown;
  readonly deliveryAttemptRef?: unknown;
}

export interface ProviderClientRejectedRawResult {
  readonly ok: false;
  readonly reasonCode?: unknown;
  readonly retryable?: unknown;
  readonly detailsRef?: unknown;
  readonly acknowledgementRef?: unknown;
  readonly idempotencyRef?: unknown;
  readonly deliveryAttemptRef?: unknown;
}

export type ProviderClientRawResult = ProviderClientAcknowledgedRawResult | ProviderClientRejectedRawResult;

export interface InjectedProviderClientPort {
  readonly descriptorKind: 'injected-provider-client-port';
  readonly descriptorVersion: 'w18b';
  readonly effects: ProviderClientCallEffect;
  readonly providerClientConstructed: false;
  readonly willCallRemoteWithoutInvocation: false;
  readonly deliver?: (request: ProviderClientDeliveryCallRequest) => Promise<ProviderClientRawResult> | ProviderClientRawResult;
  readonly acknowledgeCallback?: (
    request: ProviderClientCallbackAcknowledgementRequest,
  ) => Promise<ProviderClientRawResult> | ProviderClientRawResult;
}

type ProviderClientDeliveryCapability = InjectedProviderClientPort & {
  readonly deliver: NonNullable<InjectedProviderClientPort['deliver']>;
};

type ProviderClientCallbackCapability = InjectedProviderClientPort & {
  readonly acknowledgeCallback: NonNullable<InjectedProviderClientPort['acknowledgeCallback']>;
};

export interface ProviderClientPortOptions {
  readonly port?: InjectedProviderClientPort;
  readonly provider: ProviderClientKind;
  readonly credentialStatus?: ProviderClientCredentialStatus;
  readonly enabled?: boolean;
}

export interface ProviderClientSafeMessageRef {
  readonly descriptorKind: 'provider-message-ref';
  readonly descriptorVersion: 'w18b';
  readonly provider: ProviderClientKind;
  readonly messageRef: string;
  readonly deliveryRef?: string;
  readonly acknowledgementRef?: string;
}

export interface ProviderClientSafeError {
  readonly reasonCode: ProviderClientFailureReasonCode;
  readonly classification: ProviderClientFailureClassification;
  readonly componentRef: 'provider-client-port';
  readonly retryable: boolean;
  readonly safeMessage: string;
}

export interface ProviderClientDeliverySuccess {
  readonly descriptorKind: 'provider-client-delivery-result';
  readonly descriptorVersion: 'w18b';
  readonly ok: true;
  readonly provider: ProviderClientKind;
  readonly deliveryRef: string;
  readonly providerAckStatus: 'provider-acknowledged';
  readonly providerAcknowledged: true;
  readonly businessStatus: 'not-marked-delivered';
  readonly businessSuccess: false;
  readonly providerMessageRef: ProviderClientSafeMessageRef;
  readonly retryable: false;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
  readonly jsonSerializable: true;
}

export interface ProviderClientCallbackAcknowledgementSuccess {
  readonly descriptorKind: 'provider-client-callback-acknowledgement-result';
  readonly descriptorVersion: 'w18b';
  readonly ok: true;
  readonly provider: ProviderClientKind;
  readonly callbackRef: string;
  readonly providerAckStatus: 'provider-acknowledged';
  readonly providerAcknowledged: true;
  readonly businessStatus: 'not-business-success';
  readonly businessSuccess: false;
  readonly acknowledgementRef?: string;
  readonly retryable: false;
  readonly correlationRef?: string;
  readonly jsonSerializable: true;
}

export interface ProviderClientFailure {
  readonly descriptorKind: 'provider-client-delivery-result' | 'provider-client-callback-acknowledgement-result';
  readonly descriptorVersion: 'w18b';
  readonly ok: false;
  readonly provider: ProviderClientKind;
  readonly deliveryRef?: string;
  readonly callbackRef?: string;
  readonly providerAckStatus: 'not-attempted' | 'provider-rejected';
  readonly providerAcknowledged: false;
  readonly businessStatus: 'not-marked-failed';
  readonly businessSuccess: false;
  readonly error: ProviderClientSafeError;
  readonly retryable: boolean;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
  readonly detailsRef?: string;
  readonly jsonSerializable: true;
}

export type ProviderClientDeliveryResult = ProviderClientDeliverySuccess | ProviderClientFailure;
export type ProviderClientCallbackAcknowledgementResult = ProviderClientCallbackAcknowledgementSuccess | ProviderClientFailure;
export type ProviderClientResult = ProviderClientDeliveryResult | ProviderClientCallbackAcknowledgementResult;

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:-]{0,159}$/u;
const MAX_SAFE_REF_LENGTH = 160;
const MAX_TEXT_LENGTH = 4096;
const MAX_LIST_ITEMS = 16;

const UNSAFE_OUTPUT_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\b(?:chat_id|thread_id)\s*[=:]/iu,
  /\braw(?:Provider|Callback|Delivery|Payload|Body|Result)?\b/u,
  /\b(?:providerPayload|callbackPayload|stackTrace|clientHandle|providerHandle)\b/u,
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function containsUnsafeText(value: string): boolean {
  return UNSAFE_OUTPUT_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeSafeRef(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (normalized.length === 0 || !SAFE_REF_PATTERN.test(normalized) || containsUnsafeText(normalized)) {
    return fallback;
  }

  return normalized;
}

function normalizeOptionalSafeRef(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = normalizeSafeRef(value, 'ref:redacted');
  return normalized === 'ref:redacted' ? undefined : normalized;
}

function isAlreadySafeRef(value: unknown): value is string {
  return typeof value === 'string' && normalizeOptionalSafeRef(value) === value;
}

function isSafeText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_TEXT_LENGTH && !containsUnsafeText(value);
}

function normalizeProviderKind(value: unknown): ProviderClientKind {
  return isOneOf(value, PROVIDER_CLIENT_KINDS) ? value : 'telegram';
}

function normalizeCredentialStatus(value: unknown): ProviderClientCredentialStatus {
  return isOneOf(value, PROVIDER_CLIENT_CREDENTIAL_STATUSES) ? value : 'missing';
}

function credentialReady(status: ProviderClientCredentialStatus): boolean {
  return status === 'configured-redacted' || status === 'redacted';
}

function hasDeliveryCapability(port: unknown): port is ProviderClientDeliveryCapability {
  return isRecord(port) && typeof port.deliver === 'function';
}

function hasCallbackCapability(port: unknown): port is ProviderClientCallbackCapability {
  return isRecord(port) && typeof port.acknowledgeCallback === 'function';
}

function safeMessageFor(reasonCode: ProviderClientFailureReasonCode): string {
  switch (reasonCode) {
    case 'invalid-request':
      return 'Provider request was rejected safely';
    case 'missing-provider-port':
      return 'Provider client port is missing';
    case 'credential-blocked':
      return 'Provider credential is not available';
    case 'provider-disabled':
      return 'Provider client port is disabled';
    case 'provider-rejected':
      return 'Provider rejected the request';
    case 'rate-limited':
      return 'Provider rate limit was reached';
    case 'timeout':
      return 'Provider timed out';
    case 'conflict':
      return 'Provider request conflicted safely';
    case 'internal':
      return 'Provider call failed safely';
  }
}

function safeError(
  reasonCode: ProviderClientFailureReasonCode,
  classification: ProviderClientFailureClassification,
  retryable: boolean,
): ProviderClientSafeError {
  return Object.freeze({
    reasonCode,
    classification,
    componentRef: 'provider-client-port',
    retryable,
    safeMessage: safeMessageFor(reasonCode),
  } satisfies ProviderClientSafeError);
}

function normalizeFailureReasonCode(value: unknown): ProviderClientFailureReasonCode {
  return isOneOf(value, PROVIDER_CLIENT_FAILURE_REASON_CODES) ? value : 'provider-rejected';
}

function normalizeFailureClassification(
  value: unknown,
  fallback: ProviderClientFailureClassification,
): ProviderClientFailureClassification {
  return isOneOf(value, PROVIDER_CLIENT_FAILURE_CLASSIFICATIONS) ? value : fallback;
}

function failureResult(input: {
  readonly descriptorKind: ProviderClientFailure['descriptorKind'];
  readonly provider: ProviderClientKind;
  readonly deliveryRef?: unknown;
  readonly callbackRef?: unknown;
  readonly correlationRef?: unknown;
  readonly idempotencyRef?: unknown;
  readonly deliveryAttemptRef?: unknown;
  readonly providerAckStatus: ProviderClientFailure['providerAckStatus'];
  readonly reasonCode: ProviderClientFailureReasonCode;
  readonly classification: ProviderClientFailureClassification;
  readonly retryable: boolean;
  readonly detailsRef?: unknown;
}): ProviderClientFailure {
  const deliveryRef = normalizeOptionalSafeRef(input.deliveryRef);
  const callbackRef = normalizeOptionalSafeRef(input.callbackRef);
  const correlationRef = normalizeOptionalSafeRef(input.correlationRef);
  const idempotencyRef = normalizeOptionalSafeRef(input.idempotencyRef);
  const deliveryAttemptRef = normalizeOptionalSafeRef(input.deliveryAttemptRef);
  const detailsRef = normalizeOptionalSafeRef(input.detailsRef);

  return Object.freeze({
    descriptorKind: input.descriptorKind,
    descriptorVersion: 'w18b',
    ok: false,
    provider: input.provider,
    ...(deliveryRef === undefined ? {} : { deliveryRef }),
    ...(callbackRef === undefined ? {} : { callbackRef }),
    providerAckStatus: input.providerAckStatus,
    providerAcknowledged: false,
    businessStatus: 'not-marked-failed',
    businessSuccess: false,
    error: safeError(input.reasonCode, input.classification, input.retryable),
    retryable: input.retryable,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    jsonSerializable: true,
  } satisfies ProviderClientFailure);
}

function validateContent(content: ProviderClientDeliveryContentDescriptor): boolean {
  if (!isRecord(content) || !isOneOf(content.format, ['plain', 'markdown', 'html'] as const) || !isSafeText(content.text)) {
    return false;
  }

  for (const refs of [content.actionRefs, content.attachmentRefs]) {
    if (refs === undefined) {
      continue;
    }

    if (!Array.isArray(refs) || refs.length > MAX_LIST_ITEMS || !refs.every((value) => isAlreadySafeRef(value))) {
      return false;
    }
  }

  return true;
}

function validateDeliveryRequest(request: ProviderClientDeliveryCallRequest): boolean {
  return (
    isRecord(request) &&
    request.descriptorKind === 'provider-client-delivery-call-request' &&
    request.descriptorVersion === 'w18b' &&
    isOneOf(request.provider, PROVIDER_CLIENT_KINDS) &&
    isAlreadySafeRef(request.deliveryRef) &&
    isAlreadySafeRef(request.targetRef) &&
    (request.routeRef === undefined || isAlreadySafeRef(request.routeRef)) &&
    (request.correlationRef === undefined || isAlreadySafeRef(request.correlationRef)) &&
    (request.idempotencyRef === undefined || isAlreadySafeRef(request.idempotencyRef)) &&
    (request.deliveryAttemptRef === undefined || isAlreadySafeRef(request.deliveryAttemptRef)) &&
    validateContent(request.content) &&
    request.jsonSerializable === true
  );
}

function validateCallbackAcknowledgementRequest(request: ProviderClientCallbackAcknowledgementRequest): boolean {
  return (
    isRecord(request) &&
    request.descriptorKind === 'provider-client-callback-acknowledgement-request' &&
    request.descriptorVersion === 'w18b' &&
    isOneOf(request.provider, PROVIDER_CLIENT_KINDS) &&
    isAlreadySafeRef(request.callbackRef) &&
    (request.correlationRef === undefined || isAlreadySafeRef(request.correlationRef)) &&
    isOneOf(request.acknowledgementStatus, ['ack-required', 'ack-not-required'] as const) &&
    isOneOf(request.displayText, ['Processing', 'Not allowed', 'Action expired', 'Already processed', 'Could not process safely'] as const) &&
    request.acknowledgesBusinessSuccess === false &&
    request.jsonSerializable === true
  );
}

function blockedDeliveryResult(
  options: ProviderClientPortOptions,
  request: ProviderClientDeliveryCallRequest,
  readiness: ProviderClientPortReadiness,
): ProviderClientDeliveryResult {
  if (readiness.status === 'blocked-missing-port') {
    return failureResult({
      descriptorKind: 'provider-client-delivery-result',
      provider: options.provider,
      deliveryRef: request.deliveryRef,
      correlationRef: request.correlationRef,
      idempotencyRef: request.idempotencyRef,
      deliveryAttemptRef: request.deliveryAttemptRef,
      providerAckStatus: 'not-attempted',
      reasonCode: 'missing-provider-port',
      classification: 'blocked-missing-port',
      retryable: true,
    });
  }

  if (readiness.status === 'blocked-disabled') {
    return failureResult({
      descriptorKind: 'provider-client-delivery-result',
      provider: options.provider,
      deliveryRef: request.deliveryRef,
      correlationRef: request.correlationRef,
      idempotencyRef: request.idempotencyRef,
      deliveryAttemptRef: request.deliveryAttemptRef,
      providerAckStatus: 'not-attempted',
      reasonCode: 'provider-disabled',
      classification: 'blocked-disabled',
      retryable: false,
    });
  }

  return failureResult({
    descriptorKind: 'provider-client-delivery-result',
    provider: options.provider,
    deliveryRef: request.deliveryRef,
    correlationRef: request.correlationRef,
    idempotencyRef: request.idempotencyRef,
    deliveryAttemptRef: request.deliveryAttemptRef,
    providerAckStatus: 'not-attempted',
    reasonCode: 'credential-blocked',
    classification: 'blocked-missing-credential',
    retryable: true,
  });
}

function blockedCallbackResult(
  options: ProviderClientPortOptions,
  request: ProviderClientCallbackAcknowledgementRequest,
  readiness: ProviderClientPortReadiness,
): ProviderClientCallbackAcknowledgementResult {
  if (readiness.status === 'blocked-missing-port') {
    return failureResult({
      descriptorKind: 'provider-client-callback-acknowledgement-result',
      provider: options.provider,
      callbackRef: request.callbackRef,
      correlationRef: request.correlationRef,
      providerAckStatus: 'not-attempted',
      reasonCode: 'missing-provider-port',
      classification: 'blocked-missing-port',
      retryable: true,
    });
  }

  if (readiness.status === 'blocked-disabled') {
    return failureResult({
      descriptorKind: 'provider-client-callback-acknowledgement-result',
      provider: options.provider,
      callbackRef: request.callbackRef,
      correlationRef: request.correlationRef,
      providerAckStatus: 'not-attempted',
      reasonCode: 'provider-disabled',
      classification: 'blocked-disabled',
      retryable: false,
    });
  }

  return failureResult({
    descriptorKind: 'provider-client-callback-acknowledgement-result',
    provider: options.provider,
    callbackRef: request.callbackRef,
    correlationRef: request.correlationRef,
    providerAckStatus: 'not-attempted',
    reasonCode: 'credential-blocked',
    classification: 'blocked-missing-credential',
    retryable: true,
  });
}

function normalizeDeliveryRawResult(
  request: ProviderClientDeliveryCallRequest,
  rawResult: ProviderClientRawResult,
): ProviderClientDeliveryResult {
  if (!isRecord(rawResult) || typeof rawResult.ok !== 'boolean') {
    return failureResult({
      descriptorKind: 'provider-client-delivery-result',
      provider: request.provider,
      deliveryRef: request.deliveryRef,
      correlationRef: request.correlationRef,
      idempotencyRef: request.idempotencyRef,
      deliveryAttemptRef: request.deliveryAttemptRef,
      providerAckStatus: 'provider-rejected',
      reasonCode: 'provider-rejected',
      classification: 'malformed-provider-result',
      retryable: true,
    });
  }

  if (rawResult.ok === false) {
    const reasonCode = normalizeFailureReasonCode(rawResult.reasonCode);
    const retryable = typeof rawResult.retryable === 'boolean' ? rawResult.retryable : reasonCode !== 'provider-rejected';
    const classification = normalizeFailureClassification(rawResult.reasonCode, 'provider-returned-failure');
    return failureResult({
      descriptorKind: 'provider-client-delivery-result',
      provider: request.provider,
      deliveryRef: request.deliveryRef,
      correlationRef: request.correlationRef,
      idempotencyRef: rawResult.idempotencyRef ?? request.idempotencyRef,
      deliveryAttemptRef: rawResult.deliveryAttemptRef ?? request.deliveryAttemptRef,
      providerAckStatus: 'provider-rejected',
      reasonCode,
      classification,
      retryable,
      detailsRef: rawResult.detailsRef,
    });
  }

  const deliveryRef = normalizeSafeRef(request.deliveryRef, 'delivery:redacted');
  const correlationRef = normalizeOptionalSafeRef(request.correlationRef);
  const idempotencyRef = normalizeOptionalSafeRef(rawResult.idempotencyRef) ?? normalizeOptionalSafeRef(request.idempotencyRef);
  const deliveryAttemptRef = normalizeOptionalSafeRef(rawResult.deliveryAttemptRef) ?? normalizeOptionalSafeRef(request.deliveryAttemptRef);
  const messageRef = normalizeSafeRef(rawResult.providerMessageRef, 'message:' + request.provider + ':redacted');

  return Object.freeze({
    descriptorKind: 'provider-client-delivery-result',
    descriptorVersion: 'w18b',
    ok: true,
    provider: request.provider,
    deliveryRef,
    providerAckStatus: 'provider-acknowledged',
    providerAcknowledged: true,
    businessStatus: 'not-marked-delivered',
    businessSuccess: false,
    providerMessageRef: Object.freeze({
      descriptorKind: 'provider-message-ref',
      descriptorVersion: 'w18b',
      provider: request.provider,
      messageRef,
      deliveryRef,
    } satisfies ProviderClientSafeMessageRef),
    retryable: false,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
    jsonSerializable: true,
  } satisfies ProviderClientDeliverySuccess);
}

function normalizeCallbackRawResult(
  request: ProviderClientCallbackAcknowledgementRequest,
  rawResult: ProviderClientRawResult,
): ProviderClientCallbackAcknowledgementResult {
  if (!isRecord(rawResult) || typeof rawResult.ok !== 'boolean') {
    return failureResult({
      descriptorKind: 'provider-client-callback-acknowledgement-result',
      provider: request.provider,
      callbackRef: request.callbackRef,
      correlationRef: request.correlationRef,
      providerAckStatus: 'provider-rejected',
      reasonCode: 'provider-rejected',
      classification: 'malformed-provider-result',
      retryable: true,
    });
  }

  if (rawResult.ok === false) {
    const reasonCode = normalizeFailureReasonCode(rawResult.reasonCode);
    const retryable = typeof rawResult.retryable === 'boolean' ? rawResult.retryable : reasonCode !== 'provider-rejected';
    const classification = normalizeFailureClassification(rawResult.reasonCode, 'provider-returned-failure');
    return failureResult({
      descriptorKind: 'provider-client-callback-acknowledgement-result',
      provider: request.provider,
      callbackRef: request.callbackRef,
      correlationRef: request.correlationRef,
      providerAckStatus: 'provider-rejected',
      reasonCode,
      classification,
      retryable,
      detailsRef: rawResult.detailsRef,
    });
  }

  const callbackRef = normalizeSafeRef(request.callbackRef, 'callback:redacted');
  const correlationRef = normalizeOptionalSafeRef(request.correlationRef);
  const acknowledgementRef = normalizeOptionalSafeRef(rawResult.acknowledgementRef);

  return Object.freeze({
    descriptorKind: 'provider-client-callback-acknowledgement-result',
    descriptorVersion: 'w18b',
    ok: true,
    provider: request.provider,
    callbackRef,
    providerAckStatus: 'provider-acknowledged',
    providerAcknowledged: true,
    businessStatus: 'not-business-success',
    businessSuccess: false,
    ...(acknowledgementRef === undefined ? {} : { acknowledgementRef }),
    retryable: false,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    jsonSerializable: true,
  } satisfies ProviderClientCallbackAcknowledgementSuccess);
}

export function describeProviderClientPortBoundary(): ProviderClientBoundaryDescriptor {
  return Object.freeze({
    descriptorKind: 'provider-client-port-boundary',
    descriptorVersion: 'w18b',
    packageName: '@hazeteam/openclaw-telegram-transport',
    providerClientConstructedByDefault: false,
    networkBehaviorByDefault: 'none',
    processEnvReads: false,
    requiresInjectedPort: true,
    providerAcknowledgementIsBusinessSuccess: false,
    effects: 'none',
    jsonSerializable: true,
  } satisfies ProviderClientBoundaryDescriptor);
}

export function createInjectedProviderClientPort(options: {
  readonly deliver?: InjectedProviderClientPort['deliver'];
  readonly acknowledgeCallback?: InjectedProviderClientPort['acknowledgeCallback'];
} = Object.freeze({})): InjectedProviderClientPort {
  return Object.freeze({
    descriptorKind: 'injected-provider-client-port',
    descriptorVersion: 'w18b',
    effects: 'none-until-invoked',
    providerClientConstructed: false,
    willCallRemoteWithoutInvocation: false,
    ...(options.deliver === undefined ? {} : { deliver: options.deliver }),
    ...(options.acknowledgeCallback === undefined ? {} : { acknowledgeCallback: options.acknowledgeCallback }),
  } satisfies InjectedProviderClientPort);
}

export function createProviderClientPortReadiness(input: ProviderClientPortReadinessInput): ProviderClientPortReadiness {
  const provider = normalizeProviderKind(input.provider);
  const credentialStatus = normalizeCredentialStatus(input.credentialStatus);
  const portAvailable = isRecord(input.port) && (typeof input.port.deliver === 'function' || typeof input.port.acknowledgeCallback === 'function');
  const status: ProviderClientReadinessStatus =
    input.enabled === false
      ? 'blocked-disabled'
      : !portAvailable
        ? 'blocked-missing-port'
        : !credentialReady(credentialStatus)
          ? 'blocked-missing-credential'
          : 'ready';

  return Object.freeze({
    descriptorKind: 'provider-client-port-readiness',
    descriptorVersion: 'w18b',
    provider,
    status,
    providerPortStatus: portAvailable ? 'available' : 'missing',
    credentialStatus,
    providerClientConstructed: false,
    willCallRemote: false,
    effects: 'none',
    jsonSerializable: true,
  } satisfies ProviderClientPortReadiness);
}

export async function callProviderDelivery(
  options: ProviderClientPortOptions,
  request: ProviderClientDeliveryCallRequest,
): Promise<ProviderClientDeliveryResult> {
  if (!validateDeliveryRequest(request)) {
    return failureResult({
      descriptorKind: 'provider-client-delivery-result',
      provider: options.provider,
      deliveryRef: request.deliveryRef,
      correlationRef: request.correlationRef,
      idempotencyRef: request.idempotencyRef,
      deliveryAttemptRef: request.deliveryAttemptRef,
      providerAckStatus: 'not-attempted',
      reasonCode: 'invalid-request',
      classification: 'invalid-request',
      retryable: false,
    });
  }

  const readiness = createProviderClientPortReadiness({
    provider: options.provider,
    port: options.port,
    credentialStatus: options.credentialStatus ?? 'configured-redacted',
    enabled: options.enabled,
  });

  if (readiness.status !== 'ready') {
    return blockedDeliveryResult(options, request, readiness);
  }

  const port = options.port;
  if (!hasDeliveryCapability(port)) {
    return blockedDeliveryResult(
      options,
      request,
      createProviderClientPortReadiness({ provider: options.provider, credentialStatus: options.credentialStatus }),
    );
  }

  try {
    const rawResult = await port.deliver(request);
    return normalizeDeliveryRawResult(request, rawResult);
  } catch {
    return failureResult({
      descriptorKind: 'provider-client-delivery-result',
      provider: options.provider,
      deliveryRef: request.deliveryRef,
      correlationRef: request.correlationRef,
      idempotencyRef: request.idempotencyRef,
      deliveryAttemptRef: request.deliveryAttemptRef,
      providerAckStatus: 'provider-rejected',
      reasonCode: 'provider-rejected',
      classification: 'provider-threw',
      retryable: true,
    });
  }
}

export async function acknowledgeProviderCallback(
  options: ProviderClientPortOptions,
  request: ProviderClientCallbackAcknowledgementRequest,
): Promise<ProviderClientCallbackAcknowledgementResult> {
  if (!validateCallbackAcknowledgementRequest(request)) {
    return failureResult({
      descriptorKind: 'provider-client-callback-acknowledgement-result',
      provider: options.provider,
      callbackRef: request.callbackRef,
      correlationRef: request.correlationRef,
      providerAckStatus: 'not-attempted',
      reasonCode: 'invalid-request',
      classification: 'invalid-request',
      retryable: false,
    });
  }

  if (request.acknowledgementStatus === 'ack-not-required') {
    return Object.freeze({
      descriptorKind: 'provider-client-callback-acknowledgement-result',
      descriptorVersion: 'w18b',
      ok: true,
      provider: request.provider,
      callbackRef: request.callbackRef,
      providerAckStatus: 'provider-acknowledged',
      providerAcknowledged: true,
      businessStatus: 'not-business-success',
      businessSuccess: false,
      retryable: false,
      ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
      jsonSerializable: true,
    } satisfies ProviderClientCallbackAcknowledgementSuccess);
  }

  const readiness = createProviderClientPortReadiness({
    provider: options.provider,
    port: options.port,
    credentialStatus: options.credentialStatus ?? 'configured-redacted',
    enabled: options.enabled,
  });

  if (readiness.status !== 'ready') {
    return blockedCallbackResult(options, request, readiness);
  }

  const port = options.port;
  if (!hasCallbackCapability(port)) {
    return blockedCallbackResult(
      options,
      request,
      createProviderClientPortReadiness({ provider: options.provider, credentialStatus: options.credentialStatus }),
    );
  }

  try {
    const rawResult = await port.acknowledgeCallback(request);
    return normalizeCallbackRawResult(request, rawResult);
  } catch {
    return failureResult({
      descriptorKind: 'provider-client-callback-acknowledgement-result',
      provider: options.provider,
      callbackRef: request.callbackRef,
      correlationRef: request.correlationRef,
      providerAckStatus: 'provider-rejected',
      reasonCode: 'provider-rejected',
      classification: 'provider-threw',
      retryable: true,
    });
  }
}

export function isSafeProviderClientPortJson(value: unknown): boolean {
  const encoded = JSON.stringify(value);

  if (encoded === undefined) {
    return false;
  }

  return !containsUnsafeText(encoded);
}
