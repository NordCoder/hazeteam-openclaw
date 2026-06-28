import type {
  RedactedRuntimeModeDescriptor,
  RuntimeModeBusinessOutcomeStatus,
  RuntimeModeDefaultEffectStatus,
  RuntimeModeDescriptorReadinessState,
  RuntimeModeGateDescriptor,
  RuntimeModeGateKind,
  RuntimeModeGateStatus,
  RuntimeModeKind,
  RuntimeModeLifecycleState,
  RuntimeModeOutcomeSeparation,
  RuntimeModeProviderAcknowledgementStatus,
  RuntimeModePublicSafetyDescriptor,
  RuntimeModePublicSafetyStatus,
  RuntimeModeReadinessDescriptor,
  RuntimeModeReadinessState,
  RuntimeModeRealityClassification,
  RuntimeModeSafeDiagnostic,
  RuntimeModeStartEligibility,
  RuntimeModeStartEligibilityStatus,
  RuntimeModeVocabulary,
} from './runtime-mode-contract.js';

export type FakeInertRuntimeModeDescriptionPosture =
  | 'descriptor-only'
  | 'fake-inert'
  | 'opt-in-real-edge-contract-only';

export type FakeInertRuntimeModeStartIntent =
  | 'descriptor-only'
  | 'ready-to-attempt'
  | 'ready-to-run';

export type FakeInertRuntimeLifecycleTransitionRequestKind =
  | 'describe'
  | 'configure-redacted'
  | 'derive-ready-to-attempt'
  | 'derive-ready-to-run'
  | 'request-start'
  | 'request-stop'
  | 'complete-stop'
  | 'block'
  | 'skip'
  | 'fail-safe';

export type FakeInertRuntimeLifecycleTransitionStatus =
  | 'classified-descriptor-only'
  | 'classified-fake-inert'
  | 'blocked'
  | 'skipped'
  | 'failed-safe';

export interface FakeInertRuntimeModeGateInput {
  readonly status: RuntimeModeGateStatus;
  readonly requiredForStart?: true;
}

export interface FakeInertRuntimeModeGateState {
  readonly operatorGate?: FakeInertRuntimeModeGateInput;
  readonly runtimeModeGate?: FakeInertRuntimeModeGateInput;
  readonly injectedPortGate?: FakeInertRuntimeModeGateInput;
  readonly realEdgeGate?: FakeInertRuntimeModeGateInput;
  readonly redactionGate?: FakeInertRuntimeModeGateInput;
  readonly safeOutputGate?: FakeInertRuntimeModeGateInput;
}

export interface FakeInertRuntimeModeInput {
  readonly modeRef: string;
  readonly modeKind: RuntimeModeKind;
  readonly descriptionPosture?: FakeInertRuntimeModeDescriptionPosture;
  readonly startIntent?: FakeInertRuntimeModeStartIntent;
  readonly lifecycleState?: RuntimeModeLifecycleState;
  readonly gates?: FakeInertRuntimeModeGateState;
  readonly providerAcknowledgementStatus?: RuntimeModeProviderAcknowledgementStatus;
  readonly businessOutcomeStatus?: RuntimeModeBusinessOutcomeStatus;
}

export interface FakeInertRuntimeLifecycleTransitionRequest {
  readonly mode: FakeInertRuntimeModeInput;
  readonly transition: FakeInertRuntimeLifecycleTransitionRequestKind;
  readonly fromLifecycleState?: RuntimeModeLifecycleState;
}

export interface FakeInertRuntimeLifecycleTransitionClassification {
  readonly transition: FakeInertRuntimeLifecycleTransitionRequestKind;
  readonly transitionStatus: FakeInertRuntimeLifecycleTransitionStatus;
  readonly fromLifecycleState: RuntimeModeLifecycleState;
  readonly toLifecycleState: RuntimeModeLifecycleState;
  readonly startEligibility: RuntimeModeStartEligibility;
  readonly descriptor: RedactedRuntimeModeDescriptor;
  readonly runtimeBehaviorStarted: false;
  readonly listenerStarted: false;
  readonly webhookReceiverStarted: false;
  readonly pollingLoopStarted: false;
  readonly daemonStarted: false;
  readonly providerClientConstructed: false;
  readonly credentialLoaded: false;
  readonly networkBehaviorStarted: false;
  readonly safeDiagnostics?: readonly RuntimeModeSafeDiagnostic[];
}

export interface FakeInertRuntimeLifecyclePort {
  readonly describeMode: (input: FakeInertRuntimeModeInput) => RedactedRuntimeModeDescriptor;
  readonly evaluateStartEligibility: (input: FakeInertRuntimeModeInput) => RuntimeModeStartEligibility;
  readonly classifyTransition: (
    request: FakeInertRuntimeLifecycleTransitionRequest,
  ) => FakeInertRuntimeLifecycleTransitionClassification;
  readonly requestFakeLifecycleTransition: (
    request: FakeInertRuntimeLifecycleTransitionRequest,
  ) => RedactedRuntimeModeDescriptor;
}

const MODE_KINDS: ReadonlySet<RuntimeModeKind> = new Set([
  'listener',
  'webhook',
  'polling',
  'daemon',
  'supervision',
  'explicit-startup',
  'opt-in-real-edge',
]);

const GATE_STATUSES: ReadonlySet<RuntimeModeGateStatus> = new Set([
  'open-not-pass',
  'closed',
  'missing',
  'blocked',
  'skipped',
  'unknown-redacted',
]);

const LIFECYCLE_STATES: ReadonlySet<RuntimeModeLifecycleState> = new Set([
  'not-created',
  'described-only',
  'configured-redacted',
  'ready-to-attempt-not-pass',
  'ready-to-run-not-pass',
  'start-requested',
  'running',
  'stopping',
  'stopped',
  'blocked',
  'skipped',
  'failed-safe',
]);

const GATE_ORDER: readonly RuntimeModeGateKind[] = Object.freeze([
  'operator-gate',
  'runtime-mode-gate',
  'injected-port-gate',
  'real-edge-gate',
  'redaction-gate',
  'safe-output-gate',
]);

const REQUIRED_GATE_KINDS: readonly RuntimeModeGateKind[] = GATE_ORDER;

const RUNTIME_MODE_VOCABULARY_BY_KIND: Record<RuntimeModeKind, readonly RuntimeModeVocabulary[]> = {
  listener: Object.freeze([
    'listener-boundary',
    'inbound-event-handoff',
    'normalized-channel-event-input',
    'no-listener-startup',
  ]),
  webhook: Object.freeze([
    'webhook-boundary',
    'provider-update-receipt',
    'callback-permission-handoff',
    'no-webhook-receiver-startup',
  ]),
  polling: Object.freeze([
    'polling-boundary',
    'polling-intent-descriptor',
    'cursor-planning-only',
    'no-polling-loop',
  ]),
  daemon: Object.freeze([
    'daemon-boundary',
    'supervision-boundary',
    'safe-lifecycle-status',
    'no-daemon-startup',
  ]),
  supervision: Object.freeze([
    'daemon-boundary',
    'supervision-boundary',
    'safe-lifecycle-status',
    'no-daemon-startup',
  ]),
  'explicit-startup': Object.freeze([
    'explicit-operator-start-required',
    'no-start-on-import',
    'no-start-on-construction',
    'host-supplied-start-only',
  ]),
  'opt-in-real-edge': Object.freeze([
    'opt-in-real-edge-only',
    'gated-real-edge-attempt',
    'redacted-attempt-evidence',
    'no-default-real-edge',
  ]),
};

const STARTUP_VOCABULARY: readonly RuntimeModeVocabulary[] = Object.freeze([
  'explicit-operator-start-required',
  'no-start-on-import',
  'no-start-on-construction',
  'host-supplied-start-only',
]);

export function createFakeInertRuntimeLifecyclePort(): FakeInertRuntimeLifecyclePort {
  return {
    describeMode: describeFakeInertRuntimeMode,
    evaluateStartEligibility: evaluateFakeInertRuntimeModeStartEligibility,
    classifyTransition: classifyFakeInertRuntimeLifecycleTransition,
    requestFakeLifecycleTransition: requestFakeInertRuntimeLifecycleTransition,
  };
}

export function describeFakeInertRuntimeMode(
  input: FakeInertRuntimeModeInput,
): RedactedRuntimeModeDescriptor {
  const normalizedInput = normalizeModeInput(input);
  const gates = buildGateDescriptors(normalizedInput.gates);
  const startEligibility = deriveStartEligibility(gates, normalizedInput.startIntent);
  const readiness = buildReadinessDescriptor(startEligibility, gates, normalizedInput.descriptionPosture);
  const publicSafety = buildPublicSafetyDescriptor(startEligibility.status);
  const descriptor = buildDescriptor(normalizedInput, readiness, publicSafety);

  return assertAndClonePublicDescriptor(descriptor);
}

export function evaluateFakeInertRuntimeModeStartEligibility(
  input: FakeInertRuntimeModeInput,
): RuntimeModeStartEligibility {
  const normalizedInput = normalizeModeInput(input);
  const gates = buildGateDescriptors(normalizedInput.gates);
  const startEligibility = deriveStartEligibility(gates, normalizedInput.startIntent);

  return assertAndCloneJsonSafe(startEligibility);
}

export function classifyFakeInertRuntimeLifecycleTransition(
  request: FakeInertRuntimeLifecycleTransitionRequest,
): FakeInertRuntimeLifecycleTransitionClassification {
  const normalizedMode = normalizeModeInput(request.mode);
  const gates = buildGateDescriptors(normalizedMode.gates);
  const startEligibility = deriveStartEligibility(gates, normalizedMode.startIntent);
  const fromLifecycleState = normalizeLifecycleState(
    request.fromLifecycleState ?? normalizedMode.lifecycleState,
    normalizedMode.descriptionPosture,
  );
  const toLifecycleState = deriveTransitionLifecycleState(request.transition, fromLifecycleState, startEligibility);
  const transitionStatus = deriveTransitionStatus(toLifecycleState, normalizedMode.descriptionPosture);
  const descriptor = describeFakeInertRuntimeMode({
    ...normalizedMode,
    lifecycleState: toLifecycleState,
  });
  const safeDiagnostics = buildTransitionDiagnostics(
    request.transition,
    fromLifecycleState,
    toLifecycleState,
    startEligibility,
  );
  const classification: FakeInertRuntimeLifecycleTransitionClassification = {
    transition: request.transition,
    transitionStatus,
    fromLifecycleState,
    toLifecycleState,
    startEligibility,
    descriptor,
    runtimeBehaviorStarted: false,
    listenerStarted: false,
    webhookReceiverStarted: false,
    pollingLoopStarted: false,
    daemonStarted: false,
    providerClientConstructed: false,
    credentialLoaded: false,
    networkBehaviorStarted: false,
    ...(safeDiagnostics.length === 0 ? {} : { safeDiagnostics }),
  };

  return assertAndCloneJsonSafe(classification);
}

export function requestFakeInertRuntimeLifecycleTransition(
  request: FakeInertRuntimeLifecycleTransitionRequest,
): RedactedRuntimeModeDescriptor {
  return classifyFakeInertRuntimeLifecycleTransition(request).descriptor;
}

function normalizeModeInput(input: FakeInertRuntimeModeInput): Required<FakeInertRuntimeModeInput> {
  const modeKind = normalizeModeKind(input.modeKind);
  const descriptionPosture = normalizeDescriptionPosture(input.descriptionPosture, modeKind);
  const startIntent = normalizeStartIntent(input.startIntent);
  const lifecycleState = normalizeLifecycleState(input.lifecycleState, descriptionPosture);

  return {
    modeRef: normalizeModeRef(input.modeRef),
    modeKind,
    descriptionPosture,
    startIntent,
    lifecycleState,
    gates: input.gates ?? {},
    providerAcknowledgementStatus: normalizeProviderAcknowledgementStatus(
      input.providerAcknowledgementStatus,
    ),
    businessOutcomeStatus: normalizeBusinessOutcomeStatus(input.businessOutcomeStatus),
  };
}

function normalizeModeKind(modeKind: RuntimeModeKind): RuntimeModeKind {
  if (MODE_KINDS.has(modeKind)) {
    return modeKind;
  }

  return 'explicit-startup';
}

function normalizeModeRef(modeRef: string): string {
  if (typeof modeRef !== 'string') {
    return 'runtime-mode:redacted';
  }

  const tail = modeRef.includes(':') ? modeRef.slice(modeRef.lastIndexOf(':') + 1) : modeRef;
  const normalizedTail = tail
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);

  return 'runtime-mode:' + (normalizedTail.length === 0 ? 'redacted' : normalizedTail);
}

function normalizeDescriptionPosture(
  posture: FakeInertRuntimeModeDescriptionPosture | undefined,
  modeKind: RuntimeModeKind,
): FakeInertRuntimeModeDescriptionPosture {
  if (modeKind === 'opt-in-real-edge') {
    return 'opt-in-real-edge-contract-only';
  }

  if (posture === 'descriptor-only' || posture === 'fake-inert') {
    return posture;
  }

  return 'fake-inert';
}

function normalizeStartIntent(
  startIntent: FakeInertRuntimeModeStartIntent | undefined,
): FakeInertRuntimeModeStartIntent {
  if (
    startIntent === 'ready-to-attempt' ||
    startIntent === 'ready-to-run' ||
    startIntent === 'descriptor-only'
  ) {
    return startIntent;
  }

  return 'descriptor-only';
}

function normalizeLifecycleState(
  lifecycleState: RuntimeModeLifecycleState | undefined,
  posture: FakeInertRuntimeModeDescriptionPosture,
): RuntimeModeLifecycleState {
  if (lifecycleState === undefined) {
    return posture === 'descriptor-only' ? 'described-only' : 'configured-redacted';
  }

  if (!LIFECYCLE_STATES.has(lifecycleState)) {
    return 'failed-safe';
  }

  if (lifecycleState === 'running') {
    return 'failed-safe';
  }

  return lifecycleState;
}

function normalizeProviderAcknowledgementStatus(
  status: RuntimeModeProviderAcknowledgementStatus | undefined,
): RuntimeModeProviderAcknowledgementStatus {
  if (
    status === 'not-requested' ||
    status === 'acknowledged-not-business-success' ||
    status === 'not-acknowledged' ||
    status === 'unknown-redacted'
  ) {
    return status;
  }

  return 'not-requested';
}

function normalizeBusinessOutcomeStatus(
  status: RuntimeModeBusinessOutcomeStatus | undefined,
): RuntimeModeBusinessOutcomeStatus {
  if (
    status === 'not-evaluated' ||
    status === 'succeeded-by-business-rule' ||
    status === 'failed-by-business-rule' ||
    status === 'not-applicable'
  ) {
    return status;
  }

  return 'not-evaluated';
}

function buildGateDescriptors(
  gates: FakeInertRuntimeModeGateState | undefined,
): readonly RuntimeModeGateDescriptor[] {
  return GATE_ORDER.map((gateKind) => normalizeGateDescriptor(gateKind, getGateInput(gates, gateKind)));
}

function normalizeGateDescriptor(
  gateKind: RuntimeModeGateKind,
  input: FakeInertRuntimeModeGateInput | undefined,
): RuntimeModeGateDescriptor {
  const gateStatus = normalizeGateStatus(input?.status, gateKind);

  return {
    gateKind,
    gateStatus,
    requiredForStart: true,
    safeReason: safeReasonForGate(gateKind, gateStatus),
  };
}

function normalizeGateStatus(
  status: RuntimeModeGateStatus | undefined,
  gateKind: RuntimeModeGateKind,
): RuntimeModeGateStatus {
  if (status !== undefined && GATE_STATUSES.has(status)) {
    return status;
  }

  if (
    gateKind === 'runtime-mode-gate' ||
    gateKind === 'redaction-gate' ||
    gateKind === 'safe-output-gate'
  ) {
    return 'open-not-pass';
  }

  return 'missing';
}

function getGateInput(
  gates: FakeInertRuntimeModeGateState | undefined,
  gateKind: RuntimeModeGateKind,
): FakeInertRuntimeModeGateInput | undefined {
  if (gates === undefined) {
    return undefined;
  }

  switch (gateKind) {
    case 'operator-gate':
      return gates.operatorGate;
    case 'runtime-mode-gate':
      return gates.runtimeModeGate;
    case 'injected-port-gate':
      return gates.injectedPortGate;
    case 'real-edge-gate':
      return gates.realEdgeGate;
    case 'redaction-gate':
      return gates.redactionGate;
    case 'safe-output-gate':
      return gates.safeOutputGate;
  }
}

function deriveStartEligibility(
  gates: readonly RuntimeModeGateDescriptor[],
  startIntent: FakeInertRuntimeModeStartIntent,
): RuntimeModeStartEligibility {
  const closedGateKinds = gates
    .filter((gate) => gate.requiredForStart && gate.gateStatus !== 'open-not-pass')
    .map((gate) => gate.gateKind);

  const status = deriveStartEligibilityStatus(gates, startIntent);
  const eligibility: RuntimeModeStartEligibility = {
    status,
    operatorActionRequired: status !== 'eligible-to-attempt-not-pass' && status !== 'eligible-to-request-run-not-pass',
    requiredGateKinds: REQUIRED_GATE_KINDS,
    ...(closedGateKinds.length === 0 ? {} : { closedGateKinds }),
    safeReason: safeReasonForEligibility(status),
  };

  return eligibility;
}

function deriveStartEligibilityStatus(
  gates: readonly RuntimeModeGateDescriptor[],
  startIntent: FakeInertRuntimeModeStartIntent,
): RuntimeModeStartEligibilityStatus {
  if (hasFailedSafetyGate(gates)) {
    return 'failed-safe';
  }

  if (hasGateWithStatus(gates, 'operator-gate', ['missing', 'closed', 'blocked', 'unknown-redacted'])) {
    return 'blocked-by-operator-gate';
  }

  if (
    hasGateWithStatus(gates, 'runtime-mode-gate', ['missing', 'closed', 'blocked', 'unknown-redacted']) ||
    hasGateWithStatus(gates, 'injected-port-gate', ['missing', 'closed', 'blocked', 'unknown-redacted'])
  ) {
    return 'blocked-by-runtime-gate';
  }

  if (hasGateWithStatus(gates, 'real-edge-gate', ['missing', 'closed', 'blocked', 'unknown-redacted'])) {
    return 'blocked-by-real-edge-gate';
  }

  if (gates.some((gate) => gate.requiredForStart && gate.gateStatus === 'skipped')) {
    return 'skipped';
  }

  if (startIntent === 'ready-to-run') {
    return 'eligible-to-request-run-not-pass';
  }

  if (startIntent === 'ready-to-attempt') {
    return 'eligible-to-attempt-not-pass';
  }

  return 'not-eligible';
}

function hasFailedSafetyGate(gates: readonly RuntimeModeGateDescriptor[]): boolean {
  return gates.some(
    (gate) =>
      (gate.gateKind === 'redaction-gate' || gate.gateKind === 'safe-output-gate') &&
      gate.gateStatus !== 'open-not-pass',
  );
}

function hasGateWithStatus(
  gates: readonly RuntimeModeGateDescriptor[],
  gateKind: RuntimeModeGateKind,
  statuses: readonly RuntimeModeGateStatus[],
): boolean {
  return gates.some((gate) => gate.gateKind === gateKind && statuses.includes(gate.gateStatus));
}

function buildReadinessDescriptor(
  startEligibility: RuntimeModeStartEligibility,
  gates: readonly RuntimeModeGateDescriptor[],
  posture: FakeInertRuntimeModeDescriptionPosture,
): RuntimeModeReadinessDescriptor {
  const readinessState = readinessStateForEligibility(startEligibility.status);
  const descriptorReadinessState = descriptorReadinessStateForEligibility(
    startEligibility.status,
    posture,
  );
  const safeDiagnostics = buildReadinessDiagnostics(startEligibility.status);
  const readiness: RuntimeModeReadinessDescriptor = {
    readinessState,
    descriptorReadinessState,
    startEligibility,
    gates,
    ...(safeDiagnostics.length === 0 ? {} : { safeDiagnostics }),
  };

  return readiness;
}

function readinessStateForEligibility(
  status: RuntimeModeStartEligibilityStatus,
): RuntimeModeReadinessState {
  switch (status) {
    case 'eligible-to-attempt-not-pass':
      return 'ready-to-attempt-not-pass';
    case 'eligible-to-request-run-not-pass':
      return 'ready-to-run-not-pass';
    case 'blocked-by-operator-gate':
    case 'blocked-by-runtime-gate':
    case 'blocked-by-real-edge-gate':
      return 'blocked';
    case 'skipped':
      return 'skipped';
    case 'failed-safe':
      return 'failed-safe';
    case 'not-eligible':
      return 'descriptor-exists-not-ready';
  }
}

function descriptorReadinessStateForEligibility(
  status: RuntimeModeStartEligibilityStatus,
  posture: FakeInertRuntimeModeDescriptionPosture,
): RuntimeModeDescriptorReadinessState {
  switch (status) {
    case 'eligible-to-attempt-not-pass':
      return 'descriptor-exists-ready-to-attempt-not-pass';
    case 'eligible-to-request-run-not-pass':
      return 'descriptor-exists-ready-to-run-not-pass';
    case 'not-eligible':
      return posture === 'descriptor-only'
        ? 'descriptor-only-not-ready'
        : 'descriptor-exists-gates-incomplete';
    case 'blocked-by-operator-gate':
    case 'blocked-by-runtime-gate':
    case 'blocked-by-real-edge-gate':
    case 'skipped':
    case 'failed-safe':
      return 'descriptor-exists-gates-incomplete';
  }
}

function buildPublicSafetyDescriptor(
  startEligibilityStatus: RuntimeModeStartEligibilityStatus,
): RuntimeModePublicSafetyDescriptor {
  const safetyStatus: RuntimeModePublicSafetyStatus =
    startEligibilityStatus === 'failed-safe' ? 'unsafe-output-blocked' : 'redacted-json-safe';

  return {
    safetyStatus,
    publicShape: 'json-safe-plain-object',
    providerDataBoundary: 'normalized-or-redacted-only',
    runtimeHandleBoundary: 'not-exposed',
    sensitiveValueBoundary: 'not-exposed',
  };
}

function buildDescriptor(
  input: Required<FakeInertRuntimeModeInput>,
  readiness: RuntimeModeReadinessDescriptor,
  publicSafety: RuntimeModePublicSafetyDescriptor,
): RedactedRuntimeModeDescriptor {
  const outcomeSeparation: RuntimeModeOutcomeSeparation = {
    providerAcknowledgementStatus: input.providerAcknowledgementStatus,
    businessOutcomeStatus: input.businessOutcomeStatus,
    providerAcknowledgementIsBusinessSuccess: false,
  };
  const descriptor: RedactedRuntimeModeDescriptor = {
    descriptorKind: 'redacted-runtime-mode-descriptor',
    modeRef: input.modeRef,
    modeKind: input.modeKind,
    vocabulary: vocabularyForModeKind(input.modeKind),
    realityClassification: realityClassificationForInput(input),
    lifecycleState: input.lifecycleState,
    readiness,
    outcomeSeparation,
    publicSafety,
    defaultStartup: defaultStartupForModeKind(input.modeKind),
    defaultRuntimeEffects: defaultRuntimeEffectsForModeKind(input.modeKind),
    runtimeBehaviorImplemented: false,
    listenerImplemented: false,
    webhookImplemented: false,
    pollingImplemented: false,
    daemonImplemented: false,
    productionReady: false,
    safeSummary: summaryForDescriptor(input, readiness.startEligibility.status),
    safeDiagnostics: descriptorDiagnosticsForInput(input, readiness.startEligibility.status),
  };

  return descriptor;
}

function vocabularyForModeKind(modeKind: RuntimeModeKind): readonly RuntimeModeVocabulary[] {
  return uniqueRuntimeVocabulary([...RUNTIME_MODE_VOCABULARY_BY_KIND[modeKind], ...STARTUP_VOCABULARY]);
}

function uniqueRuntimeVocabulary(vocabulary: readonly RuntimeModeVocabulary[]): readonly RuntimeModeVocabulary[] {
  return [...new Set(vocabulary)];
}

function realityClassificationForInput(
  input: Required<FakeInertRuntimeModeInput>,
): RuntimeModeRealityClassification {
  if (input.modeKind === 'opt-in-real-edge') {
    return 'opt-in-real-edge-contract-only';
  }

  if (input.descriptionPosture === 'descriptor-only') {
    return 'descriptor-only-not-runtime-readiness';
  }

  if (input.descriptionPosture === 'fake-inert') {
    return 'fake-inert-not-real-runtime';
  }

  return 'unknown-redacted';
}

function defaultStartupForModeKind(modeKind: RuntimeModeKind): RuntimeModeDefaultEffectStatus {
  return modeKind === 'explicit-startup' ? 'explicit-call-required' : 'none';
}

function defaultRuntimeEffectsForModeKind(modeKind: RuntimeModeKind): RuntimeModeDefaultEffectStatus {
  return modeKind === 'opt-in-real-edge' ? 'future-gated-only' : 'none';
}

function summaryForDescriptor(
  input: Required<FakeInertRuntimeModeInput>,
  eligibilityStatus: RuntimeModeStartEligibilityStatus,
): string {
  if (eligibilityStatus === 'failed-safe') {
    return 'runtime mode descriptor failed safe and started no runtime behavior';
  }

  if (
    eligibilityStatus === 'blocked-by-operator-gate' ||
    eligibilityStatus === 'blocked-by-runtime-gate' ||
    eligibilityStatus === 'blocked-by-real-edge-gate'
  ) {
    return 'runtime mode descriptor is blocked by explicit start gate and started no runtime behavior';
  }

  if (eligibilityStatus === 'eligible-to-attempt-not-pass') {
    return 'runtime mode is eligible to attempt only and is not pass evidence';
  }

  if (eligibilityStatus === 'eligible-to-request-run-not-pass') {
    return 'runtime mode is eligible to request run only and is not pass evidence';
  }

  if (input.descriptionPosture === 'descriptor-only') {
    return 'runtime mode descriptor exists but is not runtime readiness';
  }

  return 'fake inert runtime mode descriptor started no listener webhook polling daemon network provider client or credential behavior';
}

function descriptorDiagnosticsForInput(
  input: Required<FakeInertRuntimeModeInput>,
  eligibilityStatus: RuntimeModeStartEligibilityStatus,
): readonly RuntimeModeSafeDiagnostic[] {
  const diagnostics: RuntimeModeSafeDiagnostic[] = [
    diagnostic('descriptor-exists-not-runtime-readiness', 'info'),
    diagnostic('fake-inert-not-real-runtime', 'info'),
    diagnostic('ready-state-not-pass', 'info'),
    diagnostic('provider-acknowledgement-not-business-success', 'info'),
  ];

  if (input.modeKind === 'opt-in-real-edge') {
    diagnostics.push(diagnostic('opt-in-real-edge-contract-only', 'info'));
  }

  if (eligibilityStatus === 'failed-safe') {
    diagnostics.push(diagnostic('safe-output-gate-failed-safe', 'failed-safe'));
  }

  if (
    eligibilityStatus === 'blocked-by-operator-gate' ||
    eligibilityStatus === 'blocked-by-runtime-gate' ||
    eligibilityStatus === 'blocked-by-real-edge-gate'
  ) {
    diagnostics.push(diagnostic('start-blocked-by-explicit-gate', 'blocked'));
  }

  return diagnostics;
}

function buildReadinessDiagnostics(
  status: RuntimeModeStartEligibilityStatus,
): readonly RuntimeModeSafeDiagnostic[] {
  switch (status) {
    case 'eligible-to-attempt-not-pass':
      return [diagnostic('ready-to-attempt-not-pass', 'info')];
    case 'eligible-to-request-run-not-pass':
      return [diagnostic('ready-to-run-not-pass', 'info')];
    case 'blocked-by-operator-gate':
      return [diagnostic('operator-gate-blocked-start', 'blocked')];
    case 'blocked-by-runtime-gate':
      return [diagnostic('runtime-gate-blocked-start', 'blocked')];
    case 'blocked-by-real-edge-gate':
      return [diagnostic('real-edge-gate-blocked-start', 'blocked')];
    case 'skipped':
      return [diagnostic('runtime-start-skipped-not-pass', 'info')];
    case 'failed-safe':
      return [diagnostic('safe-output-gate-failed-safe', 'failed-safe')];
    case 'not-eligible':
      return [diagnostic('descriptor-exists-not-runtime-readiness', 'info')];
  }
}

function buildTransitionDiagnostics(
  transition: FakeInertRuntimeLifecycleTransitionRequestKind,
  fromLifecycleState: RuntimeModeLifecycleState,
  toLifecycleState: RuntimeModeLifecycleState,
  eligibility: RuntimeModeStartEligibility,
): readonly RuntimeModeSafeDiagnostic[] {
  const diagnostics: RuntimeModeSafeDiagnostic[] = [
    diagnostic('fake-lifecycle-transition-classified-only', 'info'),
  ];

  if (transition === 'request-start' && toLifecycleState !== 'start-requested') {
    diagnostics.push(diagnostic('runtime-start-request-not-executed', 'blocked'));
  }

  if (toLifecycleState === 'failed-safe') {
    diagnostics.push(diagnostic('runtime-transition-failed-safe', 'failed-safe'));
  }

  if (fromLifecycleState === 'running') {
    diagnostics.push(diagnostic('running-state-not-produced-by-fake-port', 'failed-safe'));
  }

  if (
    eligibility.status === 'eligible-to-attempt-not-pass' ||
    eligibility.status === 'eligible-to-request-run-not-pass'
  ) {
    diagnostics.push(diagnostic('ready-state-not-pass', 'info'));
  }

  return diagnostics;
}

function deriveTransitionLifecycleState(
  transition: FakeInertRuntimeLifecycleTransitionRequestKind,
  fromLifecycleState: RuntimeModeLifecycleState,
  eligibility: RuntimeModeStartEligibility,
): RuntimeModeLifecycleState {
  if (fromLifecycleState === 'failed-safe') {
    return 'failed-safe';
  }

  switch (transition) {
    case 'describe':
      return 'described-only';
    case 'configure-redacted':
      return 'configured-redacted';
    case 'derive-ready-to-attempt':
      return eligibility.status === 'eligible-to-attempt-not-pass'
        ? 'ready-to-attempt-not-pass'
        : lifecycleStateForNonEligibleTransition(eligibility.status);
    case 'derive-ready-to-run':
      return eligibility.status === 'eligible-to-request-run-not-pass'
        ? 'ready-to-run-not-pass'
        : lifecycleStateForNonEligibleTransition(eligibility.status);
    case 'request-start':
      return eligibility.status === 'eligible-to-attempt-not-pass' ||
        eligibility.status === 'eligible-to-request-run-not-pass'
        ? 'start-requested'
        : lifecycleStateForNonEligibleTransition(eligibility.status);
    case 'request-stop':
      return fromLifecycleState === 'start-requested' ||
        fromLifecycleState === 'ready-to-attempt-not-pass' ||
        fromLifecycleState === 'ready-to-run-not-pass'
        ? 'stopping'
        : 'stopped';
    case 'complete-stop':
      return 'stopped';
    case 'block':
      return 'blocked';
    case 'skip':
      return 'skipped';
    case 'fail-safe':
      return 'failed-safe';
  }
}

function lifecycleStateForNonEligibleTransition(
  eligibilityStatus: RuntimeModeStartEligibilityStatus,
): RuntimeModeLifecycleState {
  switch (eligibilityStatus) {
    case 'failed-safe':
      return 'failed-safe';
    case 'skipped':
      return 'skipped';
    case 'blocked-by-operator-gate':
    case 'blocked-by-runtime-gate':
    case 'blocked-by-real-edge-gate':
    case 'not-eligible':
      return 'blocked';
    case 'eligible-to-attempt-not-pass':
      return 'ready-to-attempt-not-pass';
    case 'eligible-to-request-run-not-pass':
      return 'ready-to-run-not-pass';
  }
}

function deriveTransitionStatus(
  toLifecycleState: RuntimeModeLifecycleState,
  posture: FakeInertRuntimeModeDescriptionPosture,
): FakeInertRuntimeLifecycleTransitionStatus {
  if (toLifecycleState === 'failed-safe') {
    return 'failed-safe';
  }

  if (toLifecycleState === 'blocked') {
    return 'blocked';
  }

  if (toLifecycleState === 'skipped') {
    return 'skipped';
  }

  return posture === 'descriptor-only'
    ? 'classified-descriptor-only'
    : 'classified-fake-inert';
}

function safeReasonForGate(gateKind: RuntimeModeGateKind, gateStatus: RuntimeModeGateStatus): string {
  return gateKind + '-' + gateStatus;
}

function safeReasonForEligibility(status: RuntimeModeStartEligibilityStatus): string {
  switch (status) {
    case 'not-eligible':
      return 'descriptor-exists-not-runtime-readiness';
    case 'eligible-to-attempt-not-pass':
      return 'ready-to-attempt-not-pass';
    case 'eligible-to-request-run-not-pass':
      return 'ready-to-run-not-pass';
    case 'blocked-by-operator-gate':
      return 'operator-gate-required-before-start';
    case 'blocked-by-runtime-gate':
      return 'runtime-or-injected-port-gate-required-before-start';
    case 'blocked-by-real-edge-gate':
      return 'real-edge-gate-required-before-start';
    case 'skipped':
      return 'runtime-start-skipped-not-pass';
    case 'failed-safe':
      return 'redaction-or-safe-output-gate-failed-safe';
  }
}

function diagnostic(
  code: string,
  severity: RuntimeModeSafeDiagnostic['severity'],
): RuntimeModeSafeDiagnostic {
  return {
    code,
    severity,
    message: messageForDiagnosticCode(code),
  };
}

function messageForDiagnosticCode(code: string): string {
  switch (code) {
    case 'descriptor-exists-not-runtime-readiness':
      return 'Descriptor existence is not runtime readiness.';
    case 'fake-inert-not-real-runtime':
      return 'Fake inert lifecycle classification is not real runtime behavior.';
    case 'ready-state-not-pass':
      return 'Ready to attempt or ready to run is not pass evidence.';
    case 'provider-acknowledgement-not-business-success':
      return 'Provider acknowledgement remains separate from business success.';
    case 'opt-in-real-edge-contract-only':
      return 'Opt in real edge mode is represented as contract only.';
    case 'safe-output-gate-failed-safe':
      return 'Redaction or safe output gate failed safe.';
    case 'start-blocked-by-explicit-gate':
      return 'Start eligibility is blocked by an explicit gate.';
    case 'ready-to-attempt-not-pass':
      return 'Start eligibility is ready to attempt only and is not pass evidence.';
    case 'ready-to-run-not-pass':
      return 'Start eligibility is ready to run only and is not pass evidence.';
    case 'operator-gate-blocked-start':
      return 'Operator gate blocks fake inert start eligibility.';
    case 'runtime-gate-blocked-start':
      return 'Runtime or injected port gate blocks fake inert start eligibility.';
    case 'real-edge-gate-blocked-start':
      return 'Real edge gate blocks fake inert start eligibility.';
    case 'runtime-start-skipped-not-pass':
      return 'Skipped runtime start is not pass evidence.';
    case 'fake-lifecycle-transition-classified-only':
      return 'Lifecycle transition was classified without starting runtime behavior.';
    case 'runtime-start-request-not-executed':
      return 'Start request did not execute runtime behavior.';
    case 'runtime-transition-failed-safe':
      return 'Lifecycle transition failed safe.';
    case 'running-state-not-produced-by-fake-port':
      return 'Running state is not produced by this fake inert lifecycle port.';
    default:
      return 'Safe runtime mode diagnostic.';
  }
}

function assertAndClonePublicDescriptor(
  descriptor: RedactedRuntimeModeDescriptor,
): RedactedRuntimeModeDescriptor {
  assertJsonSafeValue(descriptor);
  assertNoUnsafePublicStringValue(descriptor);

  return assertAndCloneJsonSafe(descriptor);
}

function assertAndCloneJsonSafe<TValue>(value: TValue): TValue {
  assertJsonSafeValue(value);
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function assertJsonSafeValue(value: unknown): void {
  if (value === null) {
    return;
  }

  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'boolean') {
    return;
  }

  if (valueType === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('finite-json-number-required');
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertJsonSafeValue(item);
    }

    return;
  }

  if (valueType !== 'object') {
    throw new Error('json-safe-value-required');
  }

  const objectPrototype = Object.getPrototypeOf(value);

  if (objectPrototype !== Object.prototype && objectPrototype !== null) {
    throw new Error('plain-json-object-required');
  }

  for (const item of Object.values(value as Record<string, unknown>)) {
    assertJsonSafeValue(item);
  }
}

function assertNoUnsafePublicStringValue(value: unknown): void {
  if (typeof value === 'string') {
    if (looksUnsafeForPublicOutput(value)) {
      throw new Error('unsafe-public-string-value');
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoUnsafePublicStringValue(item);
    }

    return;
  }

  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      assertNoUnsafePublicStringValue(item);
    }
  }
}

function looksUnsafeForPublicOutput(value: string): boolean {
  const lowered = value.toLowerCase();

  return (
    lowered.includes('bearer ') ||
    lowered.includes('secret=') ||
    lowered.includes('token=') ||
    lowered.includes('credential=') ||
    lowered.includes('http://') ||
    lowered.includes('https://') ||
    lowered.includes('file://') ||
    lowered.includes('/home/') ||
    lowered.includes('/users/') ||
    lowered.includes('c:\\') ||
    lowered.includes('stack trace')
  );
}
