import type {
  ProviderAcknowledgementClass,
  ProviderAttemptStatus,
  ProviderBoundaryPosture,
  ProviderBusinessLifecycleClass,
  ProviderClientBoundaryDescriptor,
  ProviderClientJsonObject,
  ProviderClientJsonValue,
  ProviderEvidenceClass,
  ProviderKind,
  ProviderOperationKind,
  ProviderOperationSafetyClass,
  ProviderReadinessBelowPassStatus,
  ProviderReadinessBoundaryDescriptor,
  ProviderReadinessStatus,
  ProviderRepositoryPosture,
  ProviderRequestDescriptor,
  RedactedProviderErrorProjection,
  RedactedProviderResultProjection,
} from './provider-client-contract.js';

const DEFAULT_PROVIDER_KIND = 'test-fixture';
const DEFAULT_OPERATION_KIND = 'unknown';
const DEFAULT_REQUEST_REF = 'request:provider-fake-inert';
const DEFAULT_REASON_CODE = 'fake-inert-provider-boundary';
const DEFAULT_SAFE_SUMMARY = 'Fake/inert provider boundary classified without provider SDK, network, credential loading, or runtime startup.';
const REPOSITORY_POSTURE: ProviderRepositoryPosture = 'not-production-ready';
const MAX_SAFE_TEXT_LENGTH = 240;
const MAX_METADATA_KEYS = 12;
const MAX_METADATA_ARRAY_ITEMS = 8;
const MAX_METADATA_DEPTH = 3;
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const SAFE_METADATA_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const UNSAFE_ASSIGNMENT_PATTERN =
  /\b(?:api[-_]?key|authorization|bot[-_]?key|callback[-_]?data|client(?:Handle)?|config|cookie|credential(?:[-_]?value)?|diff|endpoint|log|passwd|password|path|payload|provider[-_]?payload|raw(?:[-_]?payload)?|runtime(?:Handle)?|sdk(?:Client|Handle)?|secret|session|stack(?:trace)?|token|trace|uri|url|webhook)\s*[:=]\s*\S+/giu;
const URL_OR_ENDPOINT_PATTERN =
  /\b(?:https?:\/\/|wss?:\/\/|api\.)\S+|\b[A-Za-z0-9.-]+\.(?:app|cloud|com|dev|example|internal|io|local|net|org)(?::\d+)?(?:\/\S*)?/giu;
const LOCATION_LIKE_PATTERN = /(?:\/[A-Za-z0-9._~-]+){2,}|\b[A-Za-z]:\\[^\s]+/gu;
const TRACE_LIKE_PATTERN = /\b(?:Error|TypeError|ReferenceError):\s.+?\s+at\s+\S+\s*\([^)]*\)/gsu;
const PROVIDER_NATIVE_REF_PATTERN = /\b\d{5,}:[A-Za-z0-9_-]{8,}\b/gu;
const API_KEY_PATTERN = /\bsk_(?:live|test)_[A-Za-z0-9_-]+\b/gu;
const UNSAFE_REF_PATTERN = /(?:\d{5,}:[A-Za-z0-9_-]{8,}|sk_(?:live|test)_[A-Za-z0-9_-]+|https?:|wss?:|api\.|[A-Za-z0-9.-]+\.(?:app|cloud|com|dev|internal|io|local|net|org))/iu;
const UNSAFE_METADATA_KEY_PATTERN =
  /^(?:authorization|callbackData|client|clientHandle|config|cookie|credentialValue|diff|endpoint|log|passwd|password|path|payload|providerHandle|providerPayload|raw|rawCallback|rawProvider|runtimeHandle|sdk|secret|session|stack|token|trace|uri|url|webhook)$/iu;

export const FAKE_INERT_PROVIDER_BOUNDARY_STATE_KINDS = [
  'absent',
  'fake-or-inert',
  'blocked',
  'skipped',
  'ready-to-attempt',
  'ready-to-run',
  'acknowledged',
  'failed-safe',
  'unsafe-output',
  'missing-credential',
  'closed-network-gate',
  'missing-provider-port',
  'acknowledgement-only',
] as const;
export type FakeInertProviderBoundaryStateKind = (typeof FAKE_INERT_PROVIDER_BOUNDARY_STATE_KINDS)[number];

export const FAKE_INERT_PROVIDER_ERROR_CASES = [
  'blocked',
  'unsafe',
  'unavailable',
  'timed-out',
  'rejected',
  'failed-safe',
] as const;
export type FakeInertProviderErrorCase = (typeof FAKE_INERT_PROVIDER_ERROR_CASES)[number];

export type FakeInertProviderNetworkGateState = 'closed' | 'fake-open' | 'not-applicable';
export type FakeInertProviderCredentialState = 'missing' | 'redacted-ref-present' | 'not-required';
export type FakeInertProviderInjectedPortState = 'absent' | 'fake-inert' | 'not-required';

export interface FakeInertProviderBoundaryState {
  readonly state: FakeInertProviderBoundaryStateKind;
  readonly providerKind?: ProviderKind;
  readonly supportedOperationKinds?: readonly ProviderOperationKind[];
  readonly networkGate?: FakeInertProviderNetworkGateState;
  readonly credentialState?: FakeInertProviderCredentialState;
  readonly injectedPortState?: FakeInertProviderInjectedPortState;
  readonly fakeAcknowledgementClass?: ProviderAcknowledgementClass;
  readonly fakeBusinessLifecycleClass?: ProviderBusinessLifecycleClass;
  readonly fakeExternalRef?: string;
  readonly reasonCode?: string;
  readonly safeSummary?: string;
  readonly redactedMetadata?: ProviderClientJsonObject;
  readonly unsafeOutputDetected?: boolean;
  readonly retryable?: boolean;
}

export type FakeInertProviderAttemptProjection = RedactedProviderResultProjection | RedactedProviderErrorProjection;

export interface FakeInertProviderClientPort {
  readonly describeBoundary: (request?: ProviderRequestDescriptor) => ProviderClientBoundaryDescriptor;
  readonly evaluateReadiness: (request: ProviderRequestDescriptor) => ProviderReadinessBoundaryDescriptor;
  readonly attemptFake: (request: ProviderRequestDescriptor) => FakeInertProviderAttemptProjection;
  readonly projectFakeError: (
    request: ProviderRequestDescriptor,
    errorCase?: FakeInertProviderErrorCase,
  ) => RedactedProviderErrorProjection;
}

interface NormalizedFakeState {
  readonly state: FakeInertProviderBoundaryStateKind;
  readonly providerKind?: ProviderKind;
  readonly supportedOperationKinds: readonly ProviderOperationKind[];
  readonly networkGate: FakeInertProviderNetworkGateState;
  readonly credentialState: FakeInertProviderCredentialState;
  readonly injectedPortState: FakeInertProviderInjectedPortState;
  readonly fakeAcknowledgementClass?: ProviderAcknowledgementClass;
  readonly fakeBusinessLifecycleClass?: ProviderBusinessLifecycleClass;
  readonly fakeExternalRef?: string;
  readonly reasonCode: string;
  readonly safeSummary: string;
  readonly redactedMetadata?: ProviderClientJsonObject;
  readonly unsafeOutputDetected: boolean;
  readonly retryable?: boolean;
}

export function createFakeInertProviderClientPort(
  state: FakeInertProviderBoundaryState = { state: 'fake-or-inert' },
): FakeInertProviderClientPort {
  const normalizedState = normalizeState(state);

  return Object.freeze({
    describeBoundary: (request?: ProviderRequestDescriptor) => describeBoundary(normalizedState, request),
    evaluateReadiness: (request: ProviderRequestDescriptor) => evaluateReadiness(request, normalizedState),
    attemptFake: (request: ProviderRequestDescriptor) => attemptFake(request, normalizedState),
    projectFakeError: (request: ProviderRequestDescriptor, errorCase?: FakeInertProviderErrorCase) =>
      projectError(request, normalizedState, errorCase ?? errorCaseForState(normalizedState.state)),
  });
}

export function describeFakeInertProviderClientBoundary(
  state: FakeInertProviderBoundaryState = { state: 'fake-or-inert' },
  request?: ProviderRequestDescriptor,
): ProviderClientBoundaryDescriptor {
  return describeBoundary(normalizeState(state), request);
}

export function evaluateFakeInertProviderReadiness(
  request: ProviderRequestDescriptor,
  state: FakeInertProviderBoundaryState = { state: 'fake-or-inert' },
): ProviderReadinessBoundaryDescriptor {
  return evaluateReadiness(request, normalizeState(state));
}

export function attemptFakeInertProviderRequest(
  request: ProviderRequestDescriptor,
  state: FakeInertProviderBoundaryState = { state: 'fake-or-inert' },
): FakeInertProviderAttemptProjection {
  return attemptFake(request, normalizeState(state));
}

export function projectFakeInertProviderError(
  request: ProviderRequestDescriptor,
  state: FakeInertProviderBoundaryState = { state: 'blocked' },
  errorCase: FakeInertProviderErrorCase = 'blocked',
): RedactedProviderErrorProjection {
  return projectError(request, normalizeState(state), normalizeErrorCase(errorCase));
}

export function isFakeInertProviderProjectionJsonSafe(
  projection: FakeInertProviderAttemptProjection | ProviderClientBoundaryDescriptor | ProviderReadinessBoundaryDescriptor,
): boolean {
  try {
    return JSON.stringify(projection) !== undefined;
  } catch {
    return false;
  }
}

function describeBoundary(
  state: NormalizedFakeState,
  request?: ProviderRequestDescriptor,
): ProviderClientBoundaryDescriptor {
  const normalizedRequest = request === undefined ? undefined : normalizeRequest(request);
  const readinessStatus = readinessStatusForState(state.state);
  const redactedMetadata = mergeMetadata(state.redactedMetadata, stateMetadata(state), normalizedRequest?.redactedMetadata);

  return Object.freeze({
    boundaryKind: 'provider-client-contract',
    providerKind: state.providerKind ?? normalizedRequest?.providerKind ?? DEFAULT_PROVIDER_KIND,
    supportedOperationKinds: supportedOperationKinds(state.supportedOperationKinds, normalizedRequest?.operationKind),
    boundaryPosture: boundaryPostureForState(state.state),
    readinessStatus,
    defaultNetworkBehavior: 'none',
    defaultRuntimeStartup: 'none',
    defaultSensitiveValueLoading: 'none',
    providerPackageImportState: 'not-imported',
    repositoryPosture: REPOSITORY_POSTURE,
    safeSummary: summaryForState(state, readinessStatus),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
}

function evaluateReadiness(
  request: ProviderRequestDescriptor,
  state: NormalizedFakeState,
): ProviderReadinessBoundaryDescriptor {
  const normalizedRequest = normalizeRequest(request);
  const readinessStatus = readinessStatusForState(state.state);
  const belowPassStatus = belowPassStatus(readinessStatus);
  const redactedMetadata = mergeMetadata(normalizedRequest.redactedMetadata, state.redactedMetadata, stateMetadata(state));

  return Object.freeze({
    providerKind: state.providerKind ?? normalizedRequest.providerKind,
    operationKind: normalizedRequest.operationKind,
    readinessStatus,
    ...(belowPassStatus === undefined ? {} : { belowPassStatus }),
    attemptStatus: attemptStatusForReadiness(state.state, normalizedRequest.attemptStatus),
    acknowledgementClass: acknowledgementForReadiness(state),
    businessLifecycleClass: businessForReadiness(state),
    evidenceClass: evidenceForReadiness(state.state),
    repositoryPosture: REPOSITORY_POSTURE,
    safeSummary: summaryForState(state, readinessStatus),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
}

function attemptFake(request: ProviderRequestDescriptor, state: NormalizedFakeState): FakeInertProviderAttemptProjection {
  const normalizedRequest = normalizeRequest(request);

  if (isErrorState(state.state)) {
    return projectError(normalizedRequest, state, errorCaseForState(state.state));
  }

  const attemptStatus = attemptStatusForProjection(state.state);
  const readinessStatus = readinessStatusForProjection(state.state);
  const redactedExternalRef = safeOptionalRef(state.fakeExternalRef ?? normalizedRequest.redactedExternalRef);
  const redactedMetadata = mergeMetadata(normalizedRequest.redactedMetadata, state.redactedMetadata, stateMetadata(state));

  return Object.freeze({
    providerKind: state.providerKind ?? normalizedRequest.providerKind,
    operationKind: normalizedRequest.operationKind,
    requestDescriptor: Object.freeze({
      ...normalizedRequest,
      attemptStatus,
      readinessStatus,
      ...(redactedExternalRef === undefined ? {} : { redactedExternalRef }),
    }),
    attemptStatus,
    acknowledgementClass: acknowledgementForProjection(state),
    businessLifecycleClass: businessForProjection(state),
    readinessStatus,
    evidenceClass: evidenceForProjection(state.state),
    retryable: state.retryable ?? (state.state === 'ready-to-attempt' || state.state === 'ready-to-run'),
    unsafeOutputDetected: state.unsafeOutputDetected,
    ...(redactedExternalRef === undefined ? {} : { redactedExternalRef }),
    reasonCode: state.reasonCode,
    safeMessage: messageForProjection(state.state),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
}

function projectError(
  request: ProviderRequestDescriptor,
  state: NormalizedFakeState,
  errorCase: FakeInertProviderErrorCase,
): RedactedProviderErrorProjection {
  const normalizedRequest = normalizeRequest(request);
  const normalizedErrorCase = normalizeErrorCase(errorCase);
  const redactedMetadata = mergeMetadata(
    normalizedRequest.redactedMetadata,
    state.redactedMetadata,
    stateMetadata(state),
    Object.freeze({ errorCase: normalizedErrorCase, fakeOnly: true, realProviderAttempted: false }),
  );

  return Object.freeze({
    providerKind: state.providerKind ?? normalizedRequest.providerKind,
    operationKind: normalizedRequest.operationKind,
    acknowledgementClass: acknowledgementForError(normalizedErrorCase),
    businessLifecycleClass: businessForError(normalizedErrorCase),
    readinessStatus: readinessForError(normalizedErrorCase),
    retryable: normalizedErrorCase === 'unavailable' || normalizedErrorCase === 'timed-out',
    reasonCode: state.reasonCode,
    safeMessage: messageForError(normalizedErrorCase),
    unsafeOutputDetected: normalizedErrorCase === 'unsafe' || state.unsafeOutputDetected,
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
}

function normalizeState(state: FakeInertProviderBoundaryState): NormalizedFakeState {
  const stateKind = isStateKind(state.state) ? state.state : 'failed-safe';
  const providerKind = state.providerKind === undefined ? undefined : (safeRequiredRef(String(state.providerKind), DEFAULT_PROVIDER_KIND) as ProviderKind);
  const fakeAcknowledgementClass = normalizeAcknowledgement(state.fakeAcknowledgementClass);
  const fakeBusinessLifecycleClass = normalizeBusinessLifecycle(state.fakeBusinessLifecycleClass);
  const fakeExternalRef = safeOptionalRef(state.fakeExternalRef);
  const redactedMetadata = mergeMetadata(state.redactedMetadata);

  return Object.freeze({
    state: stateKind,
    ...(providerKind === undefined ? {} : { providerKind }),
    supportedOperationKinds: supportedOperationKinds(state.supportedOperationKinds),
    networkGate: normalizeNetworkGate(state.networkGate, stateKind),
    credentialState: normalizeCredentialState(state.credentialState, stateKind),
    injectedPortState: normalizeInjectedPortState(state.injectedPortState, stateKind),
    ...(fakeAcknowledgementClass === undefined ? {} : { fakeAcknowledgementClass }),
    ...(fakeBusinessLifecycleClass === undefined ? {} : { fakeBusinessLifecycleClass }),
    ...(fakeExternalRef === undefined ? {} : { fakeExternalRef }),
    reasonCode: safeRequiredRef(state.reasonCode ?? defaultReasonCode(stateKind), DEFAULT_REASON_CODE),
    safeSummary: safeText(state.safeSummary ?? DEFAULT_SAFE_SUMMARY, DEFAULT_SAFE_SUMMARY),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
    unsafeOutputDetected: state.unsafeOutputDetected === true || stateKind === 'unsafe-output',
    ...(state.retryable === undefined ? {} : { retryable: state.retryable }),
  });
}

function normalizeRequest(request: ProviderRequestDescriptor): ProviderRequestDescriptor {
  const correlationRef = safeOptionalRef(request.correlationRef);
  const readinessStatus = normalizeReadiness(request.readinessStatus);
  const safeSummary = request.safeSummary === undefined ? undefined : safeText(request.safeSummary, DEFAULT_SAFE_SUMMARY);
  const redactedExternalRef = safeOptionalRef(request.redactedExternalRef);
  const redactedMetadata = mergeMetadata(request.redactedMetadata);

  return Object.freeze({
    providerKind: safeRequiredRef(String(request.providerKind), DEFAULT_PROVIDER_KIND) as ProviderKind,
    operationKind: safeRequiredRef(String(request.operationKind), DEFAULT_OPERATION_KIND) as ProviderOperationKind,
    operationSafetyClass: normalizeSafety(request.operationSafetyClass),
    requestRef: safeRequiredRef(request.requestRef, DEFAULT_REQUEST_REF),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    attemptStatus: normalizeAttempt(request.attemptStatus),
    ...(readinessStatus === undefined ? {} : { readinessStatus }),
    ...(safeSummary === undefined ? {} : { safeSummary }),
    ...(redactedExternalRef === undefined ? {} : { redactedExternalRef }),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
}

function supportedOperationKinds(
  input?: readonly ProviderOperationKind[],
  requestOperationKind?: ProviderOperationKind,
): readonly ProviderOperationKind[] {
  const defaults: readonly ProviderOperationKind[] = Object.freeze([
    'outbound-delivery',
    'callback-acknowledgement',
    'provider-readiness-probe',
    'real-smoke-attempt',
    'runtime-binding-check',
  ]);
  const values = (input === undefined || input.length === 0 ? defaults : input)
    .slice(0, MAX_METADATA_ARRAY_ITEMS)
    .map((entry) => safeRequiredRef(String(entry), DEFAULT_OPERATION_KIND) as ProviderOperationKind);

  if (requestOperationKind !== undefined && !values.includes(requestOperationKind)) {
    values.push(safeRequiredRef(String(requestOperationKind), DEFAULT_OPERATION_KIND) as ProviderOperationKind);
  }

  return Object.freeze(values.filter((entry, index) => values.indexOf(entry) === index));
}

function boundaryPostureForState(state: FakeInertProviderBoundaryStateKind): ProviderBoundaryPosture {
  if (state === 'absent' || state === 'missing-provider-port') {
    return 'absent';
  }
  if (state === 'ready-to-attempt' || state === 'ready-to-run') {
    return 'injected-boundary-required';
  }
  return 'fake-or-inert';
}

function readinessStatusForState(state: FakeInertProviderBoundaryStateKind): ProviderReadinessStatus {
  switch (state) {
    case 'absent':
      return 'not-configured';
    case 'blocked':
    case 'missing-credential':
    case 'closed-network-gate':
    case 'missing-provider-port':
      return 'blocked';
    case 'skipped':
      return 'skipped';
    case 'fake-or-inert':
    case 'ready-to-attempt':
      return 'ready-to-attempt';
    case 'ready-to-run':
      return 'ready-to-run';
    case 'acknowledged':
    case 'acknowledgement-only':
      return 'acknowledgement-only';
    case 'failed-safe':
    case 'unsafe-output':
      return 'failed-safe';
  }
}

function belowPassStatus(status: ProviderReadinessStatus): ProviderReadinessBelowPassStatus | undefined {
  if (status === 'skipped' || status === 'blocked' || status === 'ready-to-attempt' || status === 'ready-to-run' || status === 'acknowledgement-only') {
    return status;
  }
  return undefined;
}

function attemptStatusForReadiness(
  state: FakeInertProviderBoundaryStateKind,
  fallback: ProviderAttemptStatus,
): ProviderAttemptStatus {
  switch (state) {
    case 'absent':
      return 'not-attempted';
    case 'blocked':
    case 'missing-credential':
    case 'closed-network-gate':
    case 'missing-provider-port':
      return 'blocked';
    case 'skipped':
      return 'skipped';
    case 'fake-or-inert':
      return fallback === 'ready-to-run' ? 'ready-to-run' : 'ready-to-attempt';
    case 'ready-to-attempt':
      return 'ready-to-attempt';
    case 'ready-to-run':
      return 'ready-to-run';
    case 'acknowledged':
    case 'acknowledgement-only':
      return 'acknowledged';
    case 'failed-safe':
    case 'unsafe-output':
      return 'failed-safe';
  }
}

function acknowledgementForReadiness(state: NormalizedFakeState): ProviderAcknowledgementClass {
  if (state.state === 'blocked' || state.state === 'missing-credential' || state.state === 'closed-network-gate' || state.state === 'missing-provider-port') {
    return 'blocked';
  }
  if (state.state === 'skipped') {
    return 'skipped';
  }
  if (state.state === 'acknowledged' || state.state === 'acknowledgement-only') {
    return state.fakeAcknowledgementClass ?? 'accepted';
  }
  if (state.state === 'failed-safe' || state.state === 'unsafe-output') {
    return 'unsafe';
  }
  return 'not-attempted';
}

function businessForReadiness(state: NormalizedFakeState): ProviderBusinessLifecycleClass {
  if (state.state === 'acknowledged') {
    return state.fakeBusinessLifecycleClass === 'failed' ? 'failed' : 'pending';
  }
  if (state.state === 'acknowledgement-only') {
    return 'not-applicable';
  }
  if (state.state === 'failed-safe' || state.state === 'unsafe-output') {
    return 'failed';
  }
  return 'not-started';
}

function evidenceForReadiness(state: FakeInertProviderBoundaryStateKind): ProviderEvidenceClass {
  if (state === 'absent') {
    return 'none';
  }
  if (state === 'fake-or-inert') {
    return 'descriptor-only';
  }
  if (state === 'acknowledged' || state === 'acknowledgement-only') {
    return 'acknowledgement-only';
  }
  if (state === 'failed-safe' || state === 'unsafe-output') {
    return 'failed-safe-evidence';
  }
  return 'readiness-only';
}

function isErrorState(state: FakeInertProviderBoundaryStateKind): boolean {
  return state === 'absent' || state === 'blocked' || state === 'failed-safe' || state === 'unsafe-output' || state === 'missing-credential' || state === 'closed-network-gate' || state === 'missing-provider-port';
}

function attemptStatusForProjection(state: FakeInertProviderBoundaryStateKind): ProviderAttemptStatus {
  if (state === 'fake-or-inert') {
    return 'attempted';
  }
  if (state === 'acknowledged' || state === 'acknowledgement-only') {
    return 'acknowledged';
  }
  if (state === 'ready-to-attempt' || state === 'ready-to-run' || state === 'skipped') {
    return state;
  }
  return 'blocked';
}

function readinessStatusForProjection(state: FakeInertProviderBoundaryStateKind): ProviderReadinessStatus {
  if (state === 'fake-or-inert') {
    return 'attempted-redacted';
  }
  if (state === 'acknowledged' || state === 'acknowledgement-only') {
    return 'acknowledgement-only';
  }
  if (state === 'ready-to-attempt' || state === 'ready-to-run' || state === 'skipped') {
    return state;
  }
  return 'blocked';
}

function acknowledgementForProjection(state: NormalizedFakeState): ProviderAcknowledgementClass {
  if (state.state === 'fake-or-inert' || state.state === 'acknowledged' || state.state === 'acknowledgement-only') {
    return state.fakeAcknowledgementClass ?? 'accepted';
  }
  return state.state === 'skipped' ? 'skipped' : 'not-attempted';
}

function businessForProjection(state: NormalizedFakeState): ProviderBusinessLifecycleClass {
  if (state.state === 'fake-or-inert') {
    return state.fakeBusinessLifecycleClass === 'failed' ? 'failed' : 'pending';
  }
  if (state.state === 'acknowledged') {
    return 'pending';
  }
  if (state.state === 'acknowledgement-only') {
    return 'not-applicable';
  }
  return 'not-started';
}

function evidenceForProjection(state: FakeInertProviderBoundaryStateKind): ProviderEvidenceClass {
  if (state === 'fake-or-inert') {
    return 'redacted-attempt-evidence';
  }
  if (state === 'acknowledged' || state === 'acknowledgement-only') {
    return 'acknowledgement-only';
  }
  return 'readiness-only';
}

function errorCaseForState(state: FakeInertProviderBoundaryStateKind): FakeInertProviderErrorCase {
  if (state === 'unsafe-output') {
    return 'unsafe';
  }
  if (state === 'failed-safe') {
    return 'failed-safe';
  }
  return 'blocked';
}

function acknowledgementForError(errorCase: FakeInertProviderErrorCase): ProviderAcknowledgementClass {
  switch (errorCase) {
    case 'blocked':
      return 'blocked';
    case 'unsafe':
    case 'failed-safe':
      return 'unsafe';
    case 'unavailable':
      return 'unavailable';
    case 'timed-out':
      return 'timed-out';
    case 'rejected':
      return 'rejected';
  }
}

function businessForError(errorCase: FakeInertProviderErrorCase): ProviderBusinessLifecycleClass {
  if (errorCase === 'blocked') {
    return 'not-started';
  }
  if (errorCase === 'unavailable' || errorCase === 'timed-out') {
    return 'pending';
  }
  return 'failed';
}

function readinessForError(errorCase: FakeInertProviderErrorCase): ProviderReadinessStatus {
  if (errorCase === 'blocked') {
    return 'blocked';
  }
  if (errorCase === 'unsafe' || errorCase === 'failed-safe') {
    return 'failed-safe';
  }
  return 'attempted-redacted';
}

function normalizeNetworkGate(
  input: FakeInertProviderNetworkGateState | undefined,
  state: FakeInertProviderBoundaryStateKind,
): FakeInertProviderNetworkGateState {
  if (input === 'closed' || input === 'fake-open' || input === 'not-applicable') {
    return input;
  }
  return state === 'closed-network-gate' ? 'closed' : 'not-applicable';
}

function normalizeCredentialState(
  input: FakeInertProviderCredentialState | undefined,
  state: FakeInertProviderBoundaryStateKind,
): FakeInertProviderCredentialState {
  if (input === 'missing' || input === 'redacted-ref-present' || input === 'not-required') {
    return input;
  }
  return state === 'missing-credential' ? 'missing' : 'not-required';
}

function normalizeInjectedPortState(
  input: FakeInertProviderInjectedPortState | undefined,
  state: FakeInertProviderBoundaryStateKind,
): FakeInertProviderInjectedPortState {
  if (input === 'absent' || input === 'fake-inert' || input === 'not-required') {
    return input;
  }
  return state === 'absent' || state === 'missing-provider-port' ? 'absent' : 'fake-inert';
}

function summaryForState(state: NormalizedFakeState, readinessStatus: ProviderReadinessStatus): string {
  return safeText(state.safeSummary + ' readiness=' + readinessStatus + '; state=' + state.state + '.', DEFAULT_SAFE_SUMMARY);
}

function messageForProjection(state: FakeInertProviderBoundaryStateKind): string {
  if (state === 'acknowledgement-only') {
    return 'Provider acknowledgement-only evidence remains below pass and is not business success.';
  }
  if (state === 'acknowledged') {
    return 'Fake/inert provider acknowledgement remains separate from business lifecycle.';
  }
  if (state === 'ready-to-attempt') {
    return 'Ready-to-attempt is below pass and is not provider success.';
  }
  if (state === 'ready-to-run') {
    return 'Ready-to-run is below pass and is not provider success.';
  }
  if (state === 'fake-or-inert') {
    return 'Fake/inert provider projection used redacted fake evidence without remote execution.';
  }
  return 'Fake/inert provider projection did not prove provider or business success.';
}

function messageForError(errorCase: FakeInertProviderErrorCase): string {
  switch (errorCase) {
    case 'blocked':
      return 'Fake/inert provider request is blocked before any provider attempt.';
    case 'unsafe':
      return 'Fake/inert provider request failed safely because unsafe output was detected.';
    case 'unavailable':
      return 'Fake/inert provider request projected provider unavailable without remote execution.';
    case 'timed-out':
      return 'Fake/inert provider request projected timed out without remote execution.';
    case 'rejected':
      return 'Fake/inert provider request projected rejected without remote execution.';
    case 'failed-safe':
      return 'Fake/inert provider request failed safely without exposing provider details.';
  }
}

function defaultReasonCode(state: FakeInertProviderBoundaryStateKind): string {
  if (state === 'ready-to-attempt' || state === 'ready-to-run') {
    return 'fake-inert-provider-' + state + '-not-pass';
  }
  if (state === 'acknowledged') {
    return 'fake-inert-provider-acknowledged-not-business-success';
  }
  if (state === 'acknowledgement-only') {
    return 'fake-inert-provider-acknowledgement-only-not-pass';
  }
  return 'fake-inert-provider-' + state;
}

function stateMetadata(state: NormalizedFakeState): ProviderClientJsonObject {
  return Object.freeze({
    boundaryState: state.state,
    networkGate: state.networkGate,
    credentialGate: state.credentialState,
    injectedPort: state.injectedPortState,
    fakeOnly: true,
    realProviderAttempted: false,
    productionReady: false,
  });
}

function normalizeSafety(input: ProviderOperationSafetyClass): ProviderOperationSafetyClass {
  return input === 'read-only' || input === 'persistent-write' || input === 'destructive' || input === 'unknown' ? input : 'unknown';
}

function normalizeAttempt(input: ProviderAttemptStatus): ProviderAttemptStatus {
  return input === 'not-attempted' || input === 'skipped' || input === 'blocked' || input === 'ready-to-attempt' || input === 'ready-to-run' || input === 'attempted' || input === 'acknowledged' || input === 'failed-safe' ? input : 'not-attempted';
}

function normalizeReadiness(input: ProviderReadinessStatus | undefined): ProviderReadinessStatus | undefined {
  if (input === 'not-evaluated' || input === 'not-configured' || input === 'skipped' || input === 'blocked' || input === 'ready-to-attempt' || input === 'ready-to-run' || input === 'attempted-redacted' || input === 'acknowledgement-only' || input === 'failed-safe') {
    return input;
  }
  return undefined;
}

function normalizeAcknowledgement(input: ProviderAcknowledgementClass | undefined): ProviderAcknowledgementClass | undefined {
  if (input === 'not-attempted' || input === 'accepted' || input === 'delivered' || input === 'rejected' || input === 'throttled' || input === 'unavailable' || input === 'timed-out' || input === 'blocked' || input === 'skipped' || input === 'unsafe') {
    return input;
  }
  return undefined;
}

function normalizeBusinessLifecycle(input: ProviderBusinessLifecycleClass | undefined): ProviderBusinessLifecycleClass | undefined {
  if (input === 'not-started' || input === 'pending' || input === 'completed' || input === 'failed' || input === 'duplicate-suppressed' || input === 'permission-denied' || input === 'not-applicable') {
    return input;
  }
  return undefined;
}

function normalizeErrorCase(input: FakeInertProviderErrorCase): FakeInertProviderErrorCase {
  return input === 'blocked' || input === 'unsafe' || input === 'unavailable' || input === 'timed-out' || input === 'rejected' || input === 'failed-safe' ? input : 'failed-safe';
}

function mergeMetadata(...inputs: readonly (ProviderClientJsonObject | undefined)[]): ProviderClientJsonObject | undefined {
  const merged: Record<string, ProviderClientJsonValue> = {};

  for (const input of inputs) {
    const normalized = metadataObject(input, 0);
    if (normalized === undefined) {
      continue;
    }

    for (const [key, value] of Object.entries(normalized)) {
      if (Object.keys(merged).length >= MAX_METADATA_KEYS) {
        break;
      }
      merged[key] = value;
    }
  }

  return Object.keys(merged).length === 0 ? undefined : Object.freeze(merged);
}

function metadataObject(input: unknown, depth: number): ProviderClientJsonObject | undefined {
  if (!isRecord(input) || depth > MAX_METADATA_DEPTH) {
    return undefined;
  }

  const output: Record<string, ProviderClientJsonValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (Object.keys(output).length >= MAX_METADATA_KEYS) {
      break;
    }
    const safeKey = metadataKey(key);
    const safeValue = metadataValue(value, depth + 1);
    if (safeKey !== undefined && safeValue !== undefined) {
      output[safeKey] = safeValue;
    }
  }

  return Object.keys(output).length === 0 ? undefined : Object.freeze(output);
}

function metadataValue(input: unknown, depth: number): ProviderClientJsonValue | undefined {
  if (input === null || typeof input === 'boolean') {
    return input;
  }
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : undefined;
  }
  if (typeof input === 'string') {
    return safeText(input, 'redacted');
  }
  if (Array.isArray(input)) {
    return Object.freeze(
      input
        .slice(0, MAX_METADATA_ARRAY_ITEMS)
        .map((entry) => metadataValue(entry, depth + 1))
        .filter((entry): entry is ProviderClientJsonValue => entry !== undefined),
    );
  }
  return depth >= MAX_METADATA_DEPTH ? undefined : metadataObject(input, depth);
}

function metadataKey(input: string): string | undefined {
  const normalized = input.replace(CONTROL_CHARACTER_PATTERN, ' ').trim();
  if (!SAFE_METADATA_KEY_PATTERN.test(normalized) || UNSAFE_METADATA_KEY_PATTERN.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function safeText(input: string, fallback: string): string {
  if (typeof input !== 'string') {
    return fallback;
  }
  const normalized = input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(TRACE_LIKE_PATTERN, '[redacted]')
    .replace(UNSAFE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(PROVIDER_NATIVE_REF_PATTERN, '[redacted]')
    .replace(API_KEY_PATTERN, '[redacted]')
    .replace(URL_OR_ENDPOINT_PATTERN, '[redacted]')
    .replace(LOCATION_LIKE_PATTERN, '[redacted]');

  if (normalized.length === 0) {
    return fallback;
  }
  return normalized.length <= MAX_SAFE_TEXT_LENGTH ? normalized : normalized.slice(0, MAX_SAFE_TEXT_LENGTH - 3) + '...';
}

function safeOptionalRef(input: string | undefined): string | undefined {
  if (input === undefined) {
    return undefined;
  }
  const normalized = safeRequiredRef(input, '');
  return normalized.length === 0 ? undefined : normalized;
}

function safeRequiredRef(input: string, fallback: string): string {
  if (typeof input !== 'string') {
    return fallback;
  }
  const normalized = input.replace(CONTROL_CHARACTER_PATTERN, ' ').trim();
  if (normalized.length === 0 || normalized.length > MAX_SAFE_TEXT_LENGTH || !SAFE_REF_PATTERN.test(normalized) || UNSAFE_REF_PATTERN.test(normalized)) {
    return fallback;
  }
  return normalized;
}

function isStateKind(input: unknown): input is FakeInertProviderBoundaryStateKind {
  return typeof input === 'string' && (FAKE_INERT_PROVIDER_BOUNDARY_STATE_KINDS as readonly string[]).includes(input);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
