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
const URL_LIKE_PATTERN = /\b(?:https?:\/\/|wss?:\/\/|api\.)\S+/giu;
const LOCATION_LIKE_PATTERN = /(?:\/[A-Za-z0-9._~-]+){2,}|\b[A-Za-z]:\\[^\s]+/gu;
const TRACE_LIKE_PATTERN = /\b(?:Error|TypeError|ReferenceError):\s.+?\s+at\s+\S+\s*\([^)]*\)/gsu;
const PROVIDER_NATIVE_REF_PATTERN = /\b\d{5,}:[A-Za-z0-9_-]{8,}\b/gu;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /\b(?:api[-_]?key|authorization|bot[-_]?key|credential[-_]?value|password|passwd|secret|session|token)\s*[:=]\s*\S+/giu;
const UNSAFE_METADATA_KEY_PATTERN =
  /^(?:raw|rawProvider|rawCallback|payload|providerPayload|callbackData|credentialValue|password|passwd|secret|session|token|authorization|cookie|endpoint|url|uri|path|stack|trace|log|diff|sdk|client|clientHandle|runtimeHandle|providerHandle)$/iu;

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
    describeBoundary: (request?: ProviderRequestDescriptor) =>
      describeFakeInertProviderClientBoundary(normalizedState, request),
    evaluateReadiness: (request: ProviderRequestDescriptor) =>
      evaluateFakeInertProviderReadiness(request, normalizedState),
    attemptFake: (request: ProviderRequestDescriptor) => attemptFakeInertProviderRequest(request, normalizedState),
    projectFakeError: (request: ProviderRequestDescriptor, errorCase?: FakeInertProviderErrorCase) =>
      projectFakeInertProviderError(request, normalizedState, errorCase ?? errorCaseForState(normalizedState.state)),
  });
}

export function describeFakeInertProviderClientBoundary(
  state: FakeInertProviderBoundaryState = { state: 'fake-or-inert' },
  request?: ProviderRequestDescriptor,
): ProviderClientBoundaryDescriptor {
  const normalizedState = normalizeState(state);
  const normalizedRequest = request === undefined ? undefined : normalizeRequest(request);
  const readinessStatus = readinessStatusForState(normalizedState.state);
  const redactedMetadata = mergeMetadata(
    normalizedState.redactedMetadata,
    stateMetadata(normalizedState),
    normalizedRequest?.redactedMetadata,
  );

  return Object.freeze({
    boundaryKind: 'provider-client-contract',
    providerKind: normalizedState.providerKind ?? normalizedRequest?.providerKind ?? DEFAULT_PROVIDER_KIND,
    supportedOperationKinds: normalizeSupportedOperationKinds(
      normalizedState.supportedOperationKinds,
      normalizedRequest?.operationKind,
    ),
    boundaryPosture: boundaryPostureForState(normalizedState.state),
    readinessStatus,
    defaultNetworkBehavior: 'none',
    defaultRuntimeStartup: 'none',
    defaultSensitiveValueLoading: 'none',
    providerPackageImportState: 'not-imported',
    repositoryPosture: REPOSITORY_POSTURE,
    safeSummary: stateSummary(normalizedState, readinessStatus),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
}

export function evaluateFakeInertProviderReadiness(
  request: ProviderRequestDescriptor,
  state: FakeInertProviderBoundaryState = { state: 'fake-or-inert' },
): ProviderReadinessBoundaryDescriptor {
  const normalizedRequest = normalizeRequest(request);
  const normalizedState = normalizeState(state);
  const readinessStatus = readinessStatusForState(normalizedState.state);
  const belowPassStatus = belowPassStatusForReadiness(readinessStatus);
  const redactedMetadata = mergeMetadata(
    normalizedRequest.redactedMetadata,
    normalizedState.redactedMetadata,
    stateMetadata(normalizedState),
  );

  return Object.freeze({
    providerKind: normalizedState.providerKind ?? normalizedRequest.providerKind,
    operationKind: normalizedRequest.operationKind,
    readinessStatus,
    ...(belowPassStatus === undefined ? {} : { belowPassStatus }),
    attemptStatus: readinessAttemptStatusForState(normalizedState.state, normalizedRequest.attemptStatus),
    acknowledgementClass: readinessAcknowledgementForState(normalizedState),
    businessLifecycleClass: readinessBusinessLifecycleForState(normalizedState),
    evidenceClass: readinessEvidenceForState(normalizedState.state),
    repositoryPosture: REPOSITORY_POSTURE,
    safeSummary: stateSummary(normalizedState, readinessStatus),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
}

export function attemptFakeInertProviderRequest(
  request: ProviderRequestDescriptor,
  state: FakeInertProviderBoundaryState = { state: 'fake-or-inert' },
): FakeInertProviderAttemptProjection {
  const normalizedRequest = normalizeRequest(request);
  const normalizedState = normalizeState(state);

  if (isErrorState(normalizedState.state)) {
    return projectFakeInertProviderError(normalizedRequest, normalizedState, errorCaseForState(normalizedState.state));
  }

  const attemptStatus = attemptStatusForResult(normalizedState.state);
  const readinessStatus = readinessStatusForResult(normalizedState.state);
  const redactedExternalRef = safeOptionalRef(normalizedState.fakeExternalRef ?? normalizedRequest.redactedExternalRef);
  const redactedMetadata = mergeMetadata(
    normalizedRequest.redactedMetadata,
    normalizedState.redactedMetadata,
    stateMetadata(normalizedState),
  );

  return Object.freeze({
    providerKind: normalizedState.providerKind ?? normalizedRequest.providerKind,
    operationKind: normalizedRequest.operationKind,
    requestDescriptor: Object.freeze({
      ...normalizedRequest,
      attemptStatus,
      readinessStatus,
      ...(redactedExternalRef === undefined ? {} : { redactedExternalRef }),
    }),
    attemptStatus,
    acknowledgementClass: resultAcknowledgementForState(normalizedState),
    businessLifecycleClass: resultBusinessLifecycleForState(normalizedState),
    readinessStatus,
    evidenceClass: resultEvidenceForState(normalizedState.state),
    retryable: normalizedState.retryable ?? (normalizedState.state === 'ready-to-attempt' || normalizedState.state === 'ready-to-run'),
    unsafeOutputDetected: normalizedState.unsafeOutputDetected,
    ...(redactedExternalRef === undefined ? {} : { redactedExternalRef }),
    reasonCode: reasonCodeForState(normalizedState, readinessStatus),
    safeMessage: resultMessageForState(normalizedState.state),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
}

export function projectFakeInertProviderError(
  request: ProviderRequestDescriptor,
  state: FakeInertProviderBoundaryState = { state: 'blocked' },
  errorCase: FakeInertProviderErrorCase = 'blocked',
): RedactedProviderErrorProjection {
  const normalizedRequest = normalizeRequest(request);
  const normalizedState = normalizeState(state);
  const normalizedErrorCase = normalizeErrorCase(errorCase);
  const redactedMetadata = mergeMetadata(
    normalizedRequest.redactedMetadata,
    normalizedState.redactedMetadata,
    stateMetadata(normalizedState),
    errorMetadata(normalizedErrorCase),
  );

  return Object.freeze({
    providerKind: normalizedState.providerKind ?? normalizedRequest.providerKind,
    operationKind: normalizedRequest.operationKind,
    acknowledgementClass: errorAcknowledgement(normalizedErrorCase),
    businessLifecycleClass: errorBusinessLifecycle(normalizedErrorCase),
    readinessStatus: errorReadinessStatus(normalizedErrorCase),
    retryable: errorRetryable(normalizedErrorCase),
    reasonCode: errorReasonCode(normalizedState, normalizedErrorCase),
    safeMessage: errorMessage(normalizedErrorCase),
    unsafeOutputDetected: normalizedErrorCase === 'unsafe' || normalizedState.unsafeOutputDetected,
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
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

function normalizeState(state: FakeInertProviderBoundaryState): NormalizedFakeState {
  const stateKind = isStateKind(state.state) ? state.state : 'failed-safe';
  const providerKind = state.providerKind === undefined ? undefined : safeRequiredRef(String(state.providerKind), DEFAULT_PROVIDER_KIND) as ProviderKind;
  const fakeAcknowledgementClass = normalizeAcknowledgement(state.fakeAcknowledgementClass);
  const fakeBusinessLifecycleClass = normalizeBusinessLifecycle(state.fakeBusinessLifecycleClass);
  const fakeExternalRef = safeOptionalRef(state.fakeExternalRef);
  const redactedMetadata = mergeMetadata(state.redactedMetadata);

  return Object.freeze({
    state: stateKind,
    ...(providerKind === undefined ? {} : { providerKind }),
    supportedOperationKinds: normalizeSupportedOperationKinds(state.supportedOperationKinds),
    networkGate: normalizeNetworkGate(state.networkGate, stateKind),
    credentialState: normalizeCredentialState(state.credentialState, stateKind),
    injectedPortState: normalizeInjectedPortState(state.injectedPortState, stateKind),
    ...(fakeAcknowledgementClass === undefined ? {} : { fakeAcknowledgementClass }),
    ...(fakeBusinessLifecycleClass === undefined ? {} : { fakeBusinessLifecycleClass }),
    ...(fakeExternalRef === undefined ? {} : { fakeExternalRef }),
    reasonCode: safeRequiredRef(state.reasonCode ?? defaultReasonCodeForState(stateKind), DEFAULT_REASON_CODE),
    safeSummary: safeText(state.safeSummary ?? DEFAULT_SAFE_SUMMARY, DEFAULT_SAFE_SUMMARY),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
    unsafeOutputDetected: state.unsafeOutputDetected === true || stateKind === 'unsafe-output',
    ...(state.retryable === undefined ? {} : { retryable: state.retryable }),
  });
}

function normalizeRequest(request: ProviderRequestDescriptor): ProviderRequestDescriptor {
  const correlationRef = safeOptionalRef(request.correlationRef);
  const readinessStatus = normalizeReadinessStatus(request.readinessStatus);
  const safeSummary = request.safeSummary === undefined ? undefined : safeText(request.safeSummary, DEFAULT_SAFE_SUMMARY);
  const redactedExternalRef = safeOptionalRef(request.redactedExternalRef);
  const redactedMetadata = mergeMetadata(request.redactedMetadata);

  return Object.freeze({
    providerKind: safeRequiredRef(String(request.providerKind), DEFAULT_PROVIDER_KIND) as ProviderKind,
    operationKind: safeRequiredRef(String(request.operationKind), DEFAULT_OPERATION_KIND) as ProviderOperationKind,
    operationSafetyClass: normalizeSafetyClass(request.operationSafetyClass),
    requestRef: safeRequiredRef(request.requestRef, DEFAULT_REQUEST_REF),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    attemptStatus: normalizeAttemptStatus(request.attemptStatus),
    ...(readinessStatus === undefined ? {} : { readinessStatus }),
    ...(safeSummary === undefined ? {} : { safeSummary }),
    ...(redactedExternalRef === undefined ? {} : { redactedExternalRef }),
    ...(redactedMetadata === undefined ? {} : { redactedMetadata }),
  });
}

function normalizeSupportedOperationKinds(
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
  const source = input === undefined || input.length === 0 ? defaults : input;
  const values = source.slice(0, MAX_METADATA_ARRAY_ITEMS).map((entry) => safeRequiredRef(String(entry), DEFAULT_OPERATION_KIND) as ProviderOperationKind);

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

function belowPassStatusForReadiness(status: ProviderReadinessStatus): ProviderReadinessBelowPassStatus | undefined {
  if (
    status === 'skipped' ||
    status === 'blocked' ||
    status === 'ready-to-attempt' ||
    status === 'ready-to-run' ||
    status === 'acknowledgement-only'
  ) {
    return status;
  }
  return undefined;
}

function readinessAttemptStatusForState(
  state: FakeInertProviderBoundaryStateKind,
  requestAttemptStatus: ProviderAttemptStatus,
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
      return requestAttemptStatus === 'ready-to-run' ? 'ready-to-run' : 'ready-to-attempt';
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

function readinessAcknowledgementForState(state: NormalizedFakeState): ProviderAcknowledgementClass {
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

function readinessBusinessLifecycleForState(state: NormalizedFakeState): ProviderBusinessLifecycleClass {
  if (state.state === 'acknowledged') {
    return state.fakeBusinessLifecycleClass ?? 'pending';
  }
  if (state.state === 'acknowledgement-only') {
    return 'not-applicable';
  }
  if (state.state === 'failed-safe' || state.state === 'unsafe-output') {
    return 'failed';
  }
  return 'not-started';
}

function readinessEvidenceForState(state: FakeInertProviderBoundaryStateKind): ProviderEvidenceClass {
  switch (state) {
    case 'absent':
      return 'none';
    case 'fake-or-inert':
      return 'descriptor-only';
    case 'acknowledged':
    case 'acknowledgement-only':
      return 'acknowledgement-only';
    case 'failed-safe':
    case 'unsafe-output':
      return 'failed-safe-evidence';
    case 'blocked':
    case 'skipped':
    case 'ready-to-attempt':
    case 'ready-to-run':
    case 'missing-credential':
    case 'closed-network-gate':
    case 'missing-provider-port':
      return 'readiness-only';
  }
}

function isErrorState(state: FakeInertProviderBoundaryStateKind): boolean {
  return (
    state === 'absent' ||
    state === 'blocked' ||
    state === 'failed-safe' ||
    state === 'unsafe-output' ||
    state === 'missing-credential' ||
    state === 'closed-network-gate' ||
    state === 'missing-provider-port'
  );
}

function attemptStatusForResult(state: FakeInertProviderBoundaryStateKind): ProviderAttemptStatus {
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

function readinessStatusForResult(state: FakeInertProviderBoundaryStateKind): ProviderReadinessStatus {
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

function resultAcknowledgementForState(state: NormalizedFakeState): ProviderAcknowledgementClass {
  if (state.state === 'fake-or-inert' || state.state === 'acknowledged' || state.state === 'acknowledgement-only') {
    return state.fakeAcknowledgementClass ?? 'accepted';
  }
  if (state.state === 'skipped') {
    return 'skipped';
  }
  return 'not-attempted';
}

function resultBusinessLifecycleForState(state: NormalizedFakeState): ProviderBusinessLifecycleClass {
  if (state.state === 'fake-or-inert' || state.state === 'acknowledged') {
    return state.fakeBusinessLifecycleClass ?? 'pending';
  }
  if (state.state === 'acknowledgement-only') {
    return 'not-applicable';
  }
  return 'not-started';
}

function resultEvidenceForState(state: FakeInertProviderBoundaryStateKind): ProviderEvidenceClass {
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
  if (state === 'closed-network-gate' || state === 'missing-credential' || state === 'missing-provider-port' || state === 'absent' || state === 'blocked') {
    return 'blocked';
  }
  return 'failed-safe';
}

function errorAcknowledgement(errorCase: FakeInertProviderErrorCase): ProviderAcknowledgementClass {
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

function errorBusinessLifecycle(errorCase: FakeInertProviderErrorCase): ProviderBusinessLifecycleClass {
  if (errorCase === 'blocked') {
    return 'not-started';
  }
  if (errorCase === 'unavailable' || errorCase === 'timed-out') {
    return 'pending';
  }
  return 'failed';
}

function errorReadinessStatus(errorCase: FakeInertProviderErrorCase): ProviderReadinessStatus {
  if (errorCase === 'blocked') {
    return 'blocked';
  }
  if (errorCase === 'unsafe' || errorCase === 'failed-safe') {
    return 'failed-safe';
  }
  return 'attempted-redacted';
}

function errorRetryable(errorCase: FakeInertProviderErrorCase): boolean {
  return errorCase === 'unavailable' || errorCase === 'timed-out';
}

function errorReasonCode(state: NormalizedFakeState, errorCase: FakeInertProviderErrorCase): string {
  return state.reasonCode.length === 0 ? safeRequiredRef('fake-inert-provider-' + errorCase, DEFAULT_REASON_CODE) : state.reasonCode;
}

function errorMessage(errorCase: FakeInertProviderErrorCase): string {
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

function stateSummary(state: NormalizedFakeState, readinessStatus: ProviderReadinessStatus): string {
  return safeText(state.safeSummary + ' readiness=' + readinessStatus + '; state=' + state.state + '.', DEFAULT_SAFE_SUMMARY);
}

function resultMessageForState(state: FakeInertProviderBoundaryStateKind): string {
  if (state === 'fake-or-inert') {
    return 'Fake/inert provider attempt produced redacted attempt evidence without remote execution.';
  }
  if (state === 'acknowledged') {
    return 'Fake/inert provider attempt produced provider acknowledgement only; business lifecycle remains separate.';
  }
  if (state === 'acknowledgement-only') {
    return 'Provider acknowledgement-only evidence remains below pass and is not business success.';
  }
  if (state === 'ready-to-attempt') {
    return 'Ready-to-attempt is below pass and not provider success.';
  }
  if (state === 'ready-to-run') {
    return 'Ready-to-run is below pass and not provider success.';
  }
  return 'Fake/inert provider request did not prove provider or business success.';
}

function reasonCodeForState(state: NormalizedFakeState, readinessStatus: ProviderReadinessStatus): string {
  return state.reasonCode.length === 0
    ? safeRequiredRef('fake-inert-provider-' + readinessStatus + '-' + state.state, DEFAULT_REASON_CODE)
    : state.reasonCode;
}

function defaultReasonCodeForState(state: FakeInertProviderBoundaryStateKind): string {
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

function errorMetadata(errorCase: FakeInertProviderErrorCase): ProviderClientJsonObject {
  return Object.freeze({ errorCase, fakeOnly: true, realProviderAttempted: false });
}

function normalizeSafetyClass(input: ProviderOperationSafetyClass): ProviderOperationSafetyClass {
  if (input === 'read-only' || input === 'persistent-write' || input === 'destructive' || input === 'unknown') {
    return input;
  }
  return 'unknown';
}

function normalizeAttemptStatus(input: ProviderAttemptStatus): ProviderAttemptStatus {
  if (
    input === 'not-attempted' ||
    input === 'skipped' ||
    input === 'blocked' ||
    input === 'ready-to-attempt' ||
    input === 'ready-to-run' ||
    input === 'attempted' ||
    input === 'acknowledged' ||
    input === 'failed-safe'
  ) {
    return input;
  }
  return 'not-attempted';
}

function normalizeReadinessStatus(input: ProviderReadinessStatus | undefined): ProviderReadinessStatus | undefined {
  if (
    input === 'not-evaluated' ||
    input === 'not-configured' ||
    input === 'skipped' ||
    input === 'blocked' ||
    input === 'ready-to-attempt' ||
    input === 'ready-to-run' ||
    input === 'attempted-redacted' ||
    input === 'acknowledgement-only' ||
    input === 'failed-safe'
  ) {
    return input;
  }
  return undefined;
}

function normalizeAcknowledgement(input: ProviderAcknowledgementClass | undefined): ProviderAcknowledgementClass | undefined {
  if (
    input === 'not-attempted' ||
    input === 'accepted' ||
    input === 'delivered' ||
    input === 'rejected' ||
    input === 'throttled' ||
    input === 'unavailable' ||
    input === 'timed-out' ||
    input === 'blocked' ||
    input === 'skipped' ||
    input === 'unsafe'
  ) {
    return input;
  }
  return undefined;
}

function normalizeBusinessLifecycle(input: ProviderBusinessLifecycleClass | undefined): ProviderBusinessLifecycleClass | undefined {
  if (
    input === 'not-started' ||
    input === 'pending' ||
    input === 'completed' ||
    input === 'failed' ||
    input === 'duplicate-suppressed' ||
    input === 'permission-denied' ||
    input === 'not-applicable'
  ) {
    return input;
  }
  return undefined;
}

function normalizeErrorCase(input: FakeInertProviderErrorCase): FakeInertProviderErrorCase {
  if (input === 'blocked' || input === 'unsafe' || input === 'unavailable' || input === 'timed-out' || input === 'rejected' || input === 'failed-safe') {
    return input;
  }
  return 'failed-safe';
}

function mergeMetadata(
  ...inputs: readonly (ProviderClientJsonObject | undefined)[]
): ProviderClientJsonObject | undefined {
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
    const values = input
      .slice(0, MAX_METADATA_ARRAY_ITEMS)
      .map((entry) => metadataValue(entry, depth + 1))
      .filter((entry): entry is ProviderClientJsonValue => entry !== undefined);
    return Object.freeze(values);
  }
  return metadataObject(input, depth);
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
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(PROVIDER_NATIVE_REF_PATTERN, '[redacted]')
    .replace(URL_LIKE_PATTERN, '[redacted]')
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
  if (normalized.length === 0 || normalized.length > MAX_SAFE_TEXT_LENGTH || !SAFE_REF_PATTERN.test(normalized)) {
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
