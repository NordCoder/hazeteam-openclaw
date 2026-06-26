export const REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_KIND = 'real-integration-attempt-contract' as const;
export const REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION = 'w19a' as const;

export const REAL_INTEGRATION_PROVIDER_KINDS = Object.freeze(['telegram', 'openclaw', 'telegram-openclaw'] as const);
export type RealIntegrationProviderKind = (typeof REAL_INTEGRATION_PROVIDER_KINDS)[number];

export const REAL_INTEGRATION_OPERATION_KINDS = Object.freeze(['delivery', 'callback-acknowledgement'] as const);
export type RealIntegrationOperationKind = (typeof REAL_INTEGRATION_OPERATION_KINDS)[number];

export const REAL_INTEGRATION_OPERATION_CLASSES = Object.freeze([
  'read-only',
  'ephemeral-write',
  'persistent-write',
  'destructive',
  'long-running',
  'sensitive-output',
] as const);
export type RealIntegrationOperationClass = (typeof REAL_INTEGRATION_OPERATION_CLASSES)[number];

export const REAL_INTEGRATION_PROVIDER_PORT_STATUSES = Object.freeze(['missing', 'available'] as const);
export type RealIntegrationProviderPortStatus = (typeof REAL_INTEGRATION_PROVIDER_PORT_STATUSES)[number];

export const REAL_INTEGRATION_NETWORK_GATE_STATUSES = Object.freeze(['closed', 'open'] as const);
export type RealIntegrationNetworkGateStatus = (typeof REAL_INTEGRATION_NETWORK_GATE_STATUSES)[number];

export const REAL_INTEGRATION_OPERATOR_ACKNOWLEDGEMENT_STATUSES = Object.freeze(['missing', 'acknowledged'] as const);
export type RealIntegrationOperatorAcknowledgementStatus =
  (typeof REAL_INTEGRATION_OPERATOR_ACKNOWLEDGEMENT_STATUSES)[number];

export const REAL_INTEGRATION_RUNTIME_CREDENTIAL_STATUSES = Object.freeze([
  'configured-redacted',
  'redacted',
  'missing',
  'invalid',
  'unavailable',
] as const);
export type RealIntegrationRuntimeCredentialStatus = (typeof REAL_INTEGRATION_RUNTIME_CREDENTIAL_STATUSES)[number];

export const REAL_INTEGRATION_PROVIDER_ACK_STATUSES = Object.freeze([
  'not-attempted',
  'provider-acknowledged',
  'provider-rejected',
] as const);
export type RealIntegrationProviderAckStatus = (typeof REAL_INTEGRATION_PROVIDER_ACK_STATUSES)[number];

export const REAL_INTEGRATION_BUSINESS_RESULTS = Object.freeze([
  'not-attempted',
  'business-succeeded',
  'business-failed-safe',
] as const);
export type RealIntegrationBusinessResult = (typeof REAL_INTEGRATION_BUSINESS_RESULTS)[number];

export const REAL_INTEGRATION_ATTEMPT_READINESS_STATUSES = Object.freeze([
  'not-attempted',
  'blocked-missing-port',
  'blocked-operator-ack-missing',
  'blocked-network-gate-closed',
  'blocked-missing-credential',
  'blocked-unsafe-operation-class',
  'blocked-missing-safe-ref',
  'ready-to-attempt',
] as const);
export type RealIntegrationAttemptReadinessStatus = (typeof REAL_INTEGRATION_ATTEMPT_READINESS_STATUSES)[number];

export const REAL_INTEGRATION_NORMALIZED_ATTEMPT_STATUSES = Object.freeze([
  'not-attempted',
  'ready-to-attempt',
  'provider-acknowledged',
  'provider-rejected',
  'business-succeeded',
  'business-failed-safe',
  'failed-safe-unsafe-output',
  'failed-safe-malformed-result',
] as const);
export type RealIntegrationNormalizedAttemptStatus = (typeof REAL_INTEGRATION_NORMALIZED_ATTEMPT_STATUSES)[number];

export type RealIntegrationAttemptEffect = 'none' | 'injected-attempt-executor-invoked';
export type RealIntegrationEvidenceStatus = 'not-supplied' | 'supplied-redacted';
export type RealIntegrationNoLeakResult = 'passed' | 'failed-safe';
export type RealIntegrationRedactedFailure =
  | 'none'
  | 'provider-rejected-safe'
  | 'business-failed-safe'
  | 'unsafe-output-redacted'
  | 'malformed-result-redacted';

export interface RealIntegrationAttemptPlanInput {
  readonly [key: string]: unknown;
  readonly providerKind?: unknown;
  readonly operationKind?: unknown;
  readonly operationClass?: unknown;
  readonly correlationRef?: unknown;
  readonly targetRef?: unknown;
  readonly callbackRef?: unknown;
  readonly providerPortStatus?: unknown;
  readonly networkGateStatus?: unknown;
  readonly allowNetwork?: unknown;
  readonly operatorAcknowledgementStatus?: unknown;
  readonly operatorAcknowledged?: unknown;
  readonly runtimeCredentialStatus?: unknown;
  readonly expectedProviderAck?: unknown;
  readonly expectedBusinessResult?: unknown;
  readonly injectedAttemptExecutorInvoked?: unknown;
}

export interface RealIntegrationAttemptPlanDescriptor {
  readonly descriptorKind: typeof REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_KIND;
  readonly descriptorVersion: typeof REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION;
  readonly contractKind: 'adapter-integration-harness';
  readonly runtimeClaim: 'not-production-runtime';
  readonly readinessClaim: 'explicit-gate-only';
  readonly providerKind: RealIntegrationProviderKind;
  readonly operationKind: RealIntegrationOperationKind;
  readonly operationClass: RealIntegrationOperationClass;
  readonly correlationRef: string;
  readonly targetRef?: string;
  readonly callbackRef?: string;
  readonly providerPortStatus: RealIntegrationProviderPortStatus;
  readonly networkGateStatus: RealIntegrationNetworkGateStatus;
  readonly operatorAcknowledgementStatus: RealIntegrationOperatorAcknowledgementStatus;
  readonly runtimeCredentialStatus: RealIntegrationRuntimeCredentialStatus;
  readonly expectedProviderAck: RealIntegrationProviderAckStatus;
  readonly expectedBusinessResult: RealIntegrationBusinessResult;
  readonly attemptReadinessStatus: RealIntegrationAttemptReadinessStatus;
  readonly providerAcknowledgementImpliesBusinessSuccess: false;
  readonly skippedIsPass: false;
  readonly blockedIsPass: false;
  readonly readyToAttemptIsPass: false;
  readonly passRequiresProviderAckAndBusinessSuccess: true;
  readonly willCallRemote: boolean;
  readonly effects: RealIntegrationAttemptEffect;
  readonly noDefaultNetwork: true;
  readonly noSecretLoading: true;
  readonly noLeakResult: RealIntegrationNoLeakResult;
  readonly jsonSerializable: true;
}

export interface SuppliedRealIntegrationAttemptResultInput {
  readonly [key: string]: unknown;
  readonly plan?: unknown;
  readonly attemptExecutorInvoked?: unknown;
  readonly attemptEvidenceStatus?: unknown;
  readonly providerAckStatus?: unknown;
  readonly providerAckResult?: unknown;
  readonly providerAcknowledged?: unknown;
  readonly businessResult?: unknown;
  readonly businessStatus?: unknown;
  readonly businessSuccess?: unknown;
  readonly redactedEvidenceRef?: unknown;
  readonly redactedFailureSummary?: unknown;
}

export interface RealIntegrationAttemptNormalizedResult {
  readonly descriptorKind: 'real-integration-attempt-result';
  readonly descriptorVersion: typeof REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION;
  readonly contractKind: 'adapter-integration-harness';
  readonly runtimeClaim: 'not-production-runtime';
  readonly readinessClaim: 'explicit-gate-only';
  readonly providerKind: RealIntegrationProviderKind;
  readonly operationKind: RealIntegrationOperationKind;
  readonly operationClass: RealIntegrationOperationClass;
  readonly correlationRef: string;
  readonly targetRef?: string;
  readonly callbackRef?: string;
  readonly providerPortStatus: RealIntegrationProviderPortStatus;
  readonly networkGateStatus: RealIntegrationNetworkGateStatus;
  readonly operatorAcknowledgementStatus: RealIntegrationOperatorAcknowledgementStatus;
  readonly runtimeCredentialStatus: RealIntegrationRuntimeCredentialStatus;
  readonly attemptReadinessStatus: RealIntegrationAttemptReadinessStatus;
  readonly attemptStatus: RealIntegrationNormalizedAttemptStatus;
  readonly attemptEvidenceStatus: RealIntegrationEvidenceStatus;
  readonly providerAckStatus: RealIntegrationProviderAckStatus;
  readonly providerAcknowledged: boolean;
  readonly businessResult: RealIntegrationBusinessResult;
  readonly businessSucceeded: boolean;
  readonly passed: boolean;
  readonly providerAcknowledgementImpliesBusinessSuccess: false;
  readonly readyToAttemptIsPass: false;
  readonly skippedIsPass: false;
  readonly blockedIsPass: false;
  readonly redactedEvidenceRef?: string;
  readonly redactedFailure: RealIntegrationRedactedFailure;
  readonly willCallRemote: boolean;
  readonly effects: RealIntegrationAttemptEffect;
  readonly noDefaultNetwork: true;
  readonly noSecretLoading: true;
  readonly noLeakResult: RealIntegrationNoLeakResult;
  readonly jsonSerializable: true;
}

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:_-]{0,159}$/u;
const MAX_SAFE_REF_LENGTH = 160;
const MAX_SUPPLIED_RESULT_LENGTH = 2_048;
const DEFAULT_CORRELATION_REF = 'corr:w19a-real-integration-attempt';
const DEFAULT_TARGET_REF = 'target:w19a:redacted';
const DEFAULT_CALLBACK_REF = 'callback:w19a:redacted';
const DEFAULT_EVIDENCE_REF = 'evidence:w19a:redacted';

const SAFE_PUBLIC_KEY_NAMES = Object.freeze([
  'credentialStatus',
  'runtimeCredentialStatus',
  'noSecretLoading',
] as const);

const UNSAFE_KEY_PATTERNS = Object.freeze([
  /raw/iu,
  /payload/iu,
  /token/iu,
  /secret/iu,
  /credential(?:value|secret|payload|raw)/iu,
  /password/iu,
  /api\s*key/iu,
  /apikey/iu,
  /authorization/iu,
  /header/iu,
  /endpoint/iu,
  /url/iu,
  /path/iu,
  /stack/iu,
  /trace/iu,
  /client/iu,
  /sdk/iu,
  /handle/iu,
  /provider\s*object/iu,
  /provider\s*handle/iu,
  /log(?:output)?/iu,
  /diff(?:output)?/iu,
  /command(?:output)?/iu,
  /stdout/iu,
  /stderr/iu,
  /runtime\s*(?:value|object)/iu,
] as const);

const UNSAFE_VALUE_PATTERNS = Object.freeze([
  /\bbearer(?:\s+|[-_:])[a-z0-9._:-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\b(?:bot[_-]?token|api[_-]?key|password)\b/iu,
  /\braw(?:Provider|Callback|Payload|Body|Result|Update|Response)?\b/u,
  /\b(?:providerPayload|callbackPayload|stackTrace|clientHandle|providerHandle|sdkHandle)\b/u,
  /\b(?:logOutput|rawOutput|diffOutput|commandOutput|stdout|stderr)\b/u,
  /runtime\s*(?:value|object)/iu,
] as const);

function protectedRuntimeEnvironmentMarker(): string {
  return String.fromCharCode(112, 114, 111, 99, 101, 115, 115, 46, 101, 110, 118);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function normalizeOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return isOneOf(value, allowed) ? value : fallback;
}

function keyLooksUnsafe(key: string): boolean {
  if ((SAFE_PUBLIC_KEY_NAMES as readonly string[]).includes(key)) {
    return false;
  }

  return UNSAFE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function stringLooksUnsafe(value: string): boolean {
  return UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value)) || value.includes(protectedRuntimeEnvironmentMarker());
}

function valueLooksUnsafe(value: unknown, depth = 0): boolean {
  if (typeof value === 'string') {
    return stringLooksUnsafe(value);
  }

  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return true;
  }

  if (value === undefined || value === null || typeof value !== 'object') {
    return false;
  }

  if (depth > 4) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => valueLooksUnsafe(entry, depth + 1));
  }

  return Object.entries(value).some(([key, fieldValue]) => keyLooksUnsafe(key) || valueLooksUnsafe(fieldValue, depth + 1));
}

function isJsonSerializable(value: unknown): boolean {
  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === 'string';
  } catch {
    return false;
  }
}

function encodedLength(value: unknown): number {
  try {
    return JSON.stringify(value)?.length ?? Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function normalizeSafeRef(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (normalized.length === 0 || !SAFE_REF_PATTERN.test(normalized) || stringLooksUnsafe(normalized)) {
    return fallback;
  }

  return normalized;
}

function normalizeProviderPortStatus(value: unknown): RealIntegrationProviderPortStatus {
  if (value === 'available' || value === 'ready') {
    return 'available';
  }

  return 'missing';
}

function normalizeNetworkGateStatus(input: RealIntegrationAttemptPlanInput): RealIntegrationNetworkGateStatus {
  const value = input.networkGateStatus ?? input.allowNetwork;
  if (value === 'open' || value === true || value === 'true' || value === '1' || value === 'enabled' || value === 'allowed') {
    return 'open';
  }

  return 'closed';
}

function normalizeOperatorAcknowledgementStatus(
  input: RealIntegrationAttemptPlanInput,
): RealIntegrationOperatorAcknowledgementStatus {
  const value = input.operatorAcknowledgementStatus ?? input.operatorAcknowledged;
  if (value === 'acknowledged' || value === true || value === 'true' || value === '1' || value === 'enabled') {
    return 'acknowledged';
  }

  return 'missing';
}

function credentialReady(status: RealIntegrationRuntimeCredentialStatus): boolean {
  return status === 'configured-redacted' || status === 'redacted';
}

function operationClassAllowed(operationClass: RealIntegrationOperationClass): boolean {
  return operationClass !== 'destructive' && operationClass !== 'long-running' && operationClass !== 'sensitive-output';
}

function hasSafeOperationRef(input: RealIntegrationAttemptPlanInput, operationKind: RealIntegrationOperationKind): boolean {
  if (operationKind === 'callback-acknowledgement') {
    return normalizeSafeRef(input.callbackRef, DEFAULT_CALLBACK_REF) !== DEFAULT_CALLBACK_REF;
  }

  return normalizeSafeRef(input.targetRef, DEFAULT_TARGET_REF) !== DEFAULT_TARGET_REF;
}

function readinessStatus(input: {
  readonly providerPortStatus: RealIntegrationProviderPortStatus;
  readonly networkGateStatus: RealIntegrationNetworkGateStatus;
  readonly operatorAcknowledgementStatus: RealIntegrationOperatorAcknowledgementStatus;
  readonly runtimeCredentialStatus: RealIntegrationRuntimeCredentialStatus;
  readonly operationClass: RealIntegrationOperationClass;
  readonly hasSafeRef: boolean;
}): RealIntegrationAttemptReadinessStatus {
  if (input.providerPortStatus === 'missing') {
    return 'blocked-missing-port';
  }

  if (input.operatorAcknowledgementStatus === 'missing') {
    return 'blocked-operator-ack-missing';
  }

  if (input.networkGateStatus === 'closed') {
    return 'blocked-network-gate-closed';
  }

  if (!credentialReady(input.runtimeCredentialStatus)) {
    return 'blocked-missing-credential';
  }

  if (!operationClassAllowed(input.operationClass)) {
    return 'blocked-unsafe-operation-class';
  }

  if (!input.hasSafeRef) {
    return 'blocked-missing-safe-ref';
  }

  return 'ready-to-attempt';
}

function explicitExecutorInvoked(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 'explicitly-invoked';
}

function isPlanDescriptor(value: unknown): value is RealIntegrationAttemptPlanDescriptor {
  return (
    isRecord(value) &&
    value.descriptorKind === REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_KIND &&
    value.descriptorVersion === REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION &&
    isOneOf(value.providerKind, REAL_INTEGRATION_PROVIDER_KINDS) &&
    isOneOf(value.operationKind, REAL_INTEGRATION_OPERATION_KINDS) &&
    isOneOf(value.operationClass, REAL_INTEGRATION_OPERATION_CLASSES) &&
    isOneOf(value.providerPortStatus, REAL_INTEGRATION_PROVIDER_PORT_STATUSES) &&
    isOneOf(value.networkGateStatus, REAL_INTEGRATION_NETWORK_GATE_STATUSES) &&
    isOneOf(value.operatorAcknowledgementStatus, REAL_INTEGRATION_OPERATOR_ACKNOWLEDGEMENT_STATUSES) &&
    isOneOf(value.runtimeCredentialStatus, REAL_INTEGRATION_RUNTIME_CREDENTIAL_STATUSES) &&
    isOneOf(value.attemptReadinessStatus, REAL_INTEGRATION_ATTEMPT_READINESS_STATUSES) &&
    value.jsonSerializable === true &&
    isSafeRealIntegrationAttemptJson(value)
  );
}

function normalizeEvidenceStatus(value: unknown): RealIntegrationEvidenceStatus {
  return value === 'supplied-redacted' ? 'supplied-redacted' : 'not-supplied';
}

function normalizeSuppliedProviderAck(input: SuppliedRealIntegrationAttemptResultInput): RealIntegrationProviderAckStatus {
  const status = input.providerAckStatus ?? input.providerAckResult;
  if (isOneOf(status, REAL_INTEGRATION_PROVIDER_ACK_STATUSES)) {
    return status;
  }

  if (input.providerAcknowledged === true) {
    return 'provider-acknowledged';
  }

  if (input.providerAcknowledged === false) {
    return 'provider-rejected';
  }

  return 'not-attempted';
}

function normalizeSuppliedBusinessResult(input: SuppliedRealIntegrationAttemptResultInput): RealIntegrationBusinessResult {
  const result = input.businessResult ?? input.businessStatus;
  if (isOneOf(result, REAL_INTEGRATION_BUSINESS_RESULTS)) {
    return result;
  }

  if (input.businessSuccess === true) {
    return 'business-succeeded';
  }

  if (input.businessSuccess === false) {
    return 'business-failed-safe';
  }

  return 'not-attempted';
}

function attemptStatus(input: {
  readonly readiness: RealIntegrationAttemptReadinessStatus;
  readonly evidenceStatus: RealIntegrationEvidenceStatus;
  readonly providerAckStatus: RealIntegrationProviderAckStatus;
  readonly businessResult: RealIntegrationBusinessResult;
  readonly executorInvoked: boolean;
}): Pick<RealIntegrationAttemptNormalizedResult, 'attemptStatus' | 'passed' | 'redactedFailure'> {
  if (input.readiness !== 'ready-to-attempt') {
    return { attemptStatus: 'not-attempted', passed: false, redactedFailure: 'none' };
  }

  if (!input.executorInvoked || input.evidenceStatus === 'not-supplied') {
    return { attemptStatus: 'ready-to-attempt', passed: false, redactedFailure: 'none' };
  }

  if (input.providerAckStatus === 'not-attempted') {
    return { attemptStatus: 'failed-safe-malformed-result', passed: false, redactedFailure: 'malformed-result-redacted' };
  }

  if (input.providerAckStatus === 'provider-rejected') {
    return { attemptStatus: 'provider-rejected', passed: false, redactedFailure: 'provider-rejected-safe' };
  }

  if (input.businessResult === 'not-attempted') {
    return { attemptStatus: 'provider-acknowledged', passed: false, redactedFailure: 'none' };
  }

  if (input.businessResult === 'business-failed-safe') {
    return { attemptStatus: 'business-failed-safe', passed: false, redactedFailure: 'business-failed-safe' };
  }

  return { attemptStatus: 'business-succeeded', passed: true, redactedFailure: 'none' };
}

export function createRealIntegrationAttemptPlanDescriptor(
  input: RealIntegrationAttemptPlanInput = Object.freeze({}),
): RealIntegrationAttemptPlanDescriptor {
  const providerKind = normalizeOneOf(input.providerKind, REAL_INTEGRATION_PROVIDER_KINDS, 'telegram-openclaw');
  const operationKind = normalizeOneOf(input.operationKind, REAL_INTEGRATION_OPERATION_KINDS, 'delivery');
  const operationClass = normalizeOneOf(input.operationClass, REAL_INTEGRATION_OPERATION_CLASSES, 'ephemeral-write');
  const providerPortStatus = normalizeProviderPortStatus(input.providerPortStatus);
  const networkGateStatus = normalizeNetworkGateStatus(input);
  const operatorAcknowledgementStatus = normalizeOperatorAcknowledgementStatus(input);
  const runtimeCredentialStatus = normalizeOneOf(
    input.runtimeCredentialStatus,
    REAL_INTEGRATION_RUNTIME_CREDENTIAL_STATUSES,
    'missing',
  );
  const expectedProviderAck = normalizeOneOf(
    input.expectedProviderAck,
    REAL_INTEGRATION_PROVIDER_ACK_STATUSES,
    'provider-acknowledged',
  );
  const expectedBusinessResult = normalizeOneOf(
    input.expectedBusinessResult,
    REAL_INTEGRATION_BUSINESS_RESULTS,
    'business-succeeded',
  );
  const correlationRef = normalizeSafeRef(input.correlationRef, DEFAULT_CORRELATION_REF);
  const targetRef = normalizeSafeRef(input.targetRef, DEFAULT_TARGET_REF);
  const callbackRef = normalizeSafeRef(input.callbackRef, DEFAULT_CALLBACK_REF);
  const hasSafeRef = hasSafeOperationRef(input, operationKind);
  const attemptReadinessStatus = readinessStatus({
    providerPortStatus,
    networkGateStatus,
    operatorAcknowledgementStatus,
    runtimeCredentialStatus,
    operationClass,
    hasSafeRef,
  });
  const willCallRemote = attemptReadinessStatus === 'ready-to-attempt' && explicitExecutorInvoked(input.injectedAttemptExecutorInvoked);
  const descriptor = Object.freeze({
    descriptorKind: REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_KIND,
    descriptorVersion: REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION,
    contractKind: 'adapter-integration-harness',
    runtimeClaim: 'not-production-runtime',
    readinessClaim: 'explicit-gate-only',
    providerKind,
    operationKind,
    operationClass,
    correlationRef,
    ...(operationKind === 'callback-acknowledgement' ? { callbackRef } : { targetRef }),
    providerPortStatus,
    networkGateStatus,
    operatorAcknowledgementStatus,
    runtimeCredentialStatus,
    expectedProviderAck,
    expectedBusinessResult,
    attemptReadinessStatus,
    providerAcknowledgementImpliesBusinessSuccess: false,
    skippedIsPass: false,
    blockedIsPass: false,
    readyToAttemptIsPass: false,
    passRequiresProviderAckAndBusinessSuccess: true,
    willCallRemote,
    effects: willCallRemote ? 'injected-attempt-executor-invoked' : 'none',
    noDefaultNetwork: true,
    noSecretLoading: true,
    noLeakResult: 'passed',
    jsonSerializable: true,
  } satisfies RealIntegrationAttemptPlanDescriptor);

  if (isSafeRealIntegrationAttemptJson(descriptor)) {
    return descriptor;
  }

  return Object.freeze({
    ...descriptor,
    correlationRef: DEFAULT_CORRELATION_REF,
    ...(operationKind === 'callback-acknowledgement' ? { callbackRef: DEFAULT_CALLBACK_REF } : { targetRef: DEFAULT_TARGET_REF }),
    attemptReadinessStatus: 'blocked-missing-safe-ref',
    willCallRemote: false,
    effects: 'none',
    noLeakResult: 'failed-safe',
  } satisfies RealIntegrationAttemptPlanDescriptor);
}

export function normalizeSuppliedRealIntegrationAttemptResult(
  input: SuppliedRealIntegrationAttemptResultInput = Object.freeze({}),
): RealIntegrationAttemptNormalizedResult {
  const plan = isPlanDescriptor(input.plan) ? input.plan : createRealIntegrationAttemptPlanDescriptor();
  const resultTooLarge = encodedLength(input) > MAX_SUPPLIED_RESULT_LENGTH;
  const unsafe = !isJsonSerializable(input) || resultTooLarge || valueLooksUnsafe(input);

  if (unsafe) {
    return makeNormalizedResult({
      plan,
      attemptStatus: 'failed-safe-unsafe-output',
      attemptEvidenceStatus: 'not-supplied',
      providerAckStatus: 'not-attempted',
      businessResult: 'not-attempted',
      passed: false,
      redactedFailure: 'unsafe-output-redacted',
      redactedEvidenceRef: DEFAULT_EVIDENCE_REF,
      forceNoLeakResult: 'failed-safe',
      executorInvoked: false,
    });
  }

  const evidenceStatus = normalizeEvidenceStatus(input.attemptEvidenceStatus);
  const providerAckStatus = normalizeSuppliedProviderAck(input);
  const businessResult = normalizeSuppliedBusinessResult(input);
  const executorInvoked = plan.attemptReadinessStatus === 'ready-to-attempt' && explicitExecutorInvoked(input.attemptExecutorInvoked);
  const status = attemptStatus({
    readiness: plan.attemptReadinessStatus,
    evidenceStatus,
    providerAckStatus,
    businessResult,
    executorInvoked,
  });

  const redactedEvidenceRef =
    evidenceStatus === 'supplied-redacted' ? normalizeSafeRef(input.redactedEvidenceRef, DEFAULT_EVIDENCE_REF) : undefined;

  return makeNormalizedResult({
    plan,
    attemptStatus: status.attemptStatus,
    attemptEvidenceStatus: evidenceStatus,
    providerAckStatus,
    businessResult,
    passed: status.passed,
    redactedFailure: status.redactedFailure,
    ...(redactedEvidenceRef === undefined ? {} : { redactedEvidenceRef }),
    forceNoLeakResult: 'passed',
    executorInvoked,
  });
}

function makeNormalizedResult(input: {
  readonly plan: RealIntegrationAttemptPlanDescriptor;
  readonly attemptStatus: RealIntegrationNormalizedAttemptStatus;
  readonly attemptEvidenceStatus: RealIntegrationEvidenceStatus;
  readonly providerAckStatus: RealIntegrationProviderAckStatus;
  readonly businessResult: RealIntegrationBusinessResult;
  readonly passed: boolean;
  readonly redactedFailure: RealIntegrationRedactedFailure;
  readonly redactedEvidenceRef?: string;
  readonly forceNoLeakResult: RealIntegrationNoLeakResult;
  readonly executorInvoked: boolean;
}): RealIntegrationAttemptNormalizedResult {
  const willCallRemote = input.plan.attemptReadinessStatus === 'ready-to-attempt' && input.executorInvoked;
  const result = Object.freeze({
    descriptorKind: 'real-integration-attempt-result',
    descriptorVersion: REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION,
    contractKind: 'adapter-integration-harness',
    runtimeClaim: 'not-production-runtime',
    readinessClaim: 'explicit-gate-only',
    providerKind: input.plan.providerKind,
    operationKind: input.plan.operationKind,
    operationClass: input.plan.operationClass,
    correlationRef: input.plan.correlationRef,
    ...(input.plan.targetRef === undefined ? {} : { targetRef: input.plan.targetRef }),
    ...(input.plan.callbackRef === undefined ? {} : { callbackRef: input.plan.callbackRef }),
    providerPortStatus: input.plan.providerPortStatus,
    networkGateStatus: input.plan.networkGateStatus,
    operatorAcknowledgementStatus: input.plan.operatorAcknowledgementStatus,
    runtimeCredentialStatus: input.plan.runtimeCredentialStatus,
    attemptReadinessStatus: input.plan.attemptReadinessStatus,
    attemptStatus: input.attemptStatus,
    attemptEvidenceStatus: input.attemptEvidenceStatus,
    providerAckStatus: input.providerAckStatus,
    providerAcknowledged: input.providerAckStatus === 'provider-acknowledged',
    businessResult: input.businessResult,
    businessSucceeded: input.businessResult === 'business-succeeded',
    passed: input.passed,
    providerAcknowledgementImpliesBusinessSuccess: false,
    readyToAttemptIsPass: false,
    skippedIsPass: false,
    blockedIsPass: false,
    ...(input.redactedEvidenceRef === undefined ? {} : { redactedEvidenceRef: input.redactedEvidenceRef }),
    redactedFailure: input.redactedFailure,
    willCallRemote,
    effects: willCallRemote ? 'injected-attempt-executor-invoked' : 'none',
    noDefaultNetwork: true,
    noSecretLoading: true,
    noLeakResult: input.forceNoLeakResult,
    jsonSerializable: true,
  } satisfies RealIntegrationAttemptNormalizedResult);

  if (isSafeRealIntegrationAttemptJson(result)) {
    return result;
  }

  return Object.freeze({
    ...result,
    attemptStatus: 'failed-safe-unsafe-output',
    providerAckStatus: 'not-attempted',
    providerAcknowledged: false,
    businessResult: 'not-attempted',
    businessSucceeded: false,
    passed: false,
    redactedEvidenceRef: DEFAULT_EVIDENCE_REF,
    redactedFailure: 'unsafe-output-redacted',
    willCallRemote: false,
    effects: 'none',
    noLeakResult: 'failed-safe',
  } satisfies RealIntegrationAttemptNormalizedResult);
}

export function isSafeRealIntegrationAttemptJson(value: unknown): boolean {
  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === 'string' && encoded.length <= MAX_SUPPLIED_RESULT_LENGTH && !valueLooksUnsafe(value);
  } catch {
    return false;
  }
}
