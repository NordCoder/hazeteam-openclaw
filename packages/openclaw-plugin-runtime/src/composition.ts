import { createInitialPluginLifecycleSnapshot, describePluginLifecycleSnapshot } from './lifecycle.js';
import type { PluginLifecycleSnapshot, PluginLifecycleSnapshotDescription } from './lifecycle.js';
import type { RuntimeCapabilityRegistrySnapshot } from './capability-registry.js';
import { aggregatePluginReadiness, projectPluginReadinessSummary } from './readiness.js';
import type {
  PluginReadinessAggregateResult,
  PluginReadinessComponentInput,
  PluginReadinessComponentKind,
  PluginReadinessProfile,
  PluginReadinessSummaryProjection,
} from './readiness.js';
import type { OpenClawToolRegistrySnapshot } from './tool-registry.js';

export const OPENCLAW_RUNTIME_COMPOSITION_PROFILES = Object.freeze([
  'fake',
  'dry-run',
  'secret-gated-smoke',
  'real-edge',
  'production-candidate',
] as const);

export type OpenClawRuntimeCompositionProfile = (typeof OPENCLAW_RUNTIME_COMPOSITION_PROFILES)[number];

export const OPENCLAW_RUNTIME_COMPOSITION_BINDING_KINDS = Object.freeze([
  'core-facade',
  'adapter-foundation',
  'transport',
  'store',
  'config',
  'approval-token',
  'observability',
  'credential-resolver',
  'fake-evidence',
  'no-leak-evidence',
  'optional-overlay',
] as const);

export type OpenClawRuntimeCompositionBindingKind =
  (typeof OPENCLAW_RUNTIME_COMPOSITION_BINDING_KINDS)[number];

export const OPENCLAW_RUNTIME_COMPOSITION_BINDING_STATUSES = Object.freeze([
  'ready',
  'not-ready',
  'disabled',
  'blocked',
  'degraded',
  'failed-safe',
] as const);

export type OpenClawRuntimeCompositionBindingStatus =
  (typeof OPENCLAW_RUNTIME_COMPOSITION_BINDING_STATUSES)[number];

export const OPENCLAW_RUNTIME_COMPOSITION_READINESS_STATUSES = Object.freeze([
  'fake-ready',
  'dry-run-ready',
  'not-ready',
  'blocked',
  'degraded',
  'failed-safe',
  'profile-gated',
] as const);

export type OpenClawRuntimeCompositionReadinessStatus =
  (typeof OPENCLAW_RUNTIME_COMPOSITION_READINESS_STATUSES)[number];

export const OPENCLAW_RUNTIME_COMPOSITION_BLOCKED_REASONS = Object.freeze([
  'missing-required-binding',
  'runtime-value-gate-closed',
  'real-network-gate-closed',
  'real-edge-not-implemented',
  'production-runtime-not-implemented',
  'readiness-aggregate-not-ready',
  'readiness-aggregate-failed',
] as const);

export type OpenClawRuntimeCompositionBlockedReason =
  (typeof OPENCLAW_RUNTIME_COMPOSITION_BLOCKED_REASONS)[number];

export type OpenClawRuntimeCompositionEffect = 'none';

export interface OpenClawRuntimeProfileDescriptor {
  readonly profile: OpenClawRuntimeCompositionProfile;
  readonly productionReady: false;
  readonly willCallRemote: boolean;
  readonly realNetworkEnabled: boolean;
  readonly requiresSecrets: boolean;
  readonly usesResolvedSecretValue: boolean;
  readonly allowedEffects: readonly OpenClawRuntimeCompositionEffect[];
  readonly blockedReasons: readonly OpenClawRuntimeCompositionBlockedReason[];
  readonly safeSummary: string;
}

export interface OpenClawRuntimeCompositionBindingInput {
  readonly bindingRef: string;
  readonly kind: OpenClawRuntimeCompositionBindingKind;
  readonly status: OpenClawRuntimeCompositionBindingStatus;
  readonly required?: boolean;
  readonly safeSummary?: string;
  readonly readinessRef?: string;
}

export interface OpenClawRuntimeCompositionBindingDescriptor {
  readonly bindingRef: string;
  readonly kind: OpenClawRuntimeCompositionBindingKind;
  readonly status: OpenClawRuntimeCompositionBindingStatus;
  readonly required: boolean;
  readonly safeSummary: string;
  readonly readinessRef?: string;
}

export type OpenClawRuntimeDiagnosticStatus = 'pass' | 'warn' | 'fail' | 'disabled';

export interface OpenClawRuntimeSafeDiagnosticInput {
  readonly diagnosticRef: string;
  readonly status: OpenClawRuntimeDiagnosticStatus;
  readonly safeSummary?: string;
  readonly detailsRef?: string;
}

export interface OpenClawRuntimeSafeDiagnostic {
  readonly diagnosticRef: string;
  readonly status: OpenClawRuntimeDiagnosticStatus;
  readonly safeSummary: string;
  readonly detailsRef?: string;
}

export interface OpenClawRuntimeCompositionInput {
  readonly compositionRef?: string;
  readonly profile: OpenClawRuntimeCompositionProfile;
  readonly generatedAt?: string;
  readonly lifecycle?: PluginLifecycleSnapshot | PluginLifecycleSnapshotDescription;
  readonly toolRegistrySnapshot?: OpenClawToolRegistrySnapshot;
  readonly capabilityRegistrySnapshot?: RuntimeCapabilityRegistrySnapshot;
  readonly bindings?: readonly OpenClawRuntimeCompositionBindingInput[];
  readonly diagnostics?: readonly OpenClawRuntimeSafeDiagnosticInput[];
  readonly realNetworkGateOpen?: boolean;
  readonly runtimeValueGateOpen?: boolean;
}

export interface OpenClawRuntimeCompositionReadiness {
  readonly status: OpenClawRuntimeCompositionReadinessStatus;
  readonly profile: OpenClawRuntimeCompositionProfile;
  readonly aggregate: PluginReadinessSummaryProjection;
  readonly missingRequired: readonly string[];
  readonly blockedReasons: readonly OpenClawRuntimeCompositionBlockedReason[];
  readonly localEvidenceOnly: true;
  readonly adapterReadyForRealSystemIntegration: false;
}

export interface OpenClawRuntimeCompositionDescriptor {
  readonly kind: 'openclaw-runtime-composition';
  readonly descriptorVersion: 'cd11.2-w17a';
  readonly compositionRef: string;
  readonly profile: OpenClawRuntimeProfileDescriptor;
  readonly productionReady: false;
  readonly fakeE2eCompatible: boolean;
  readonly lifecycle: PluginLifecycleSnapshotDescription;
  readonly bindings: readonly OpenClawRuntimeCompositionBindingDescriptor[];
  readonly toolRegistrySnapshot: OpenClawToolRegistrySnapshot;
  readonly capabilityRegistrySnapshot: RuntimeCapabilityRegistrySnapshot;
  readonly readiness: OpenClawRuntimeCompositionReadiness;
  readonly readinessAggregate: PluginReadinessAggregateResult;
  readonly blockedReasons: readonly OpenClawRuntimeCompositionBlockedReason[];
  readonly actionableNextSteps: readonly string[];
  readonly safeDiagnostics: readonly OpenClawRuntimeSafeDiagnostic[];
  readonly effects: 'none';
}

const DEFAULT_COMPOSITION_REF = 'runtime:composition:openclaw';
const DEFAULT_GENERATED_AT = '1970-01-01T00:00:00.000Z';
const SAFE_TEXT_FALLBACK = 'redacted';
const MAX_SAFE_TEXT_LENGTH = 180;
const MAX_SAFE_REF_LENGTH = 120;

const SAFE_REF_PATTERN = /^[a-z][a-z0-9_.:-]{0,119}$/u;

const UNSAFE_PUBLIC_TEXT_PATTERNS = Object.freeze([
  /api\s*key/iu,
  /apikey/iu,
  /bearer/iu,
  /password/iu,
  /token\s+value/iu,
  /resolved\s+secret/iu,
  /stack\s*trace/iu,
  /traceback/iu,
  /raw\s+(?:provider|runtime|tool|callback|log|diff|payload)/iu,
  /provider\s+(?:object|payload|client\s+handle)/iu,
  /client\s+handle/iu,
  /sdk\s+client/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
] as const);

const EMPTY_TOOL_REGISTRY_SNAPSHOT = Object.freeze({
  kind: 'openclaw-tool-registry-snapshot',
  descriptorVersion: 'w13c',
  toolCount: 0,
  defaultAvailability: 'not-ready',
  tools: Object.freeze([]),
} satisfies OpenClawToolRegistrySnapshot);

const EMPTY_CAPABILITY_REGISTRY_SNAPSHOT = Object.freeze({
  registryRef: 'runtime-capability-registry',
  descriptorVersion: 'w13d',
  effects: 'none',
  capabilityCount: 0,
  capabilities: Object.freeze([]),
  readiness: Object.freeze([]),
} satisfies RuntimeCapabilityRegistrySnapshot);

export function describeOpenClawRuntimeProfile(input: {
  readonly profile: OpenClawRuntimeCompositionProfile;
  readonly realNetworkGateOpen?: boolean;
  readonly runtimeValueGateOpen?: boolean;
}): OpenClawRuntimeProfileDescriptor {
  const profile = normalizeProfile(input.profile);
  const blockedReasons = profileBlockedReasons(profile, input.realNetworkGateOpen, input.runtimeValueGateOpen);
  const requiresSecrets =
    profile === 'secret-gated-smoke' || profile === 'real-edge' || profile === 'production-candidate';

  return Object.freeze({
    profile,
    productionReady: false,
    willCallRemote: false,
    realNetworkEnabled: false,
    requiresSecrets,
    usesResolvedSecretValue: false,
    allowedEffects: Object.freeze(['none'] as const),
    blockedReasons,
    safeSummary: profileSummary(profile, blockedReasons.length),
  } satisfies OpenClawRuntimeProfileDescriptor);
}

export function composeOpenClawRuntime(
  input: OpenClawRuntimeCompositionInput,
): OpenClawRuntimeCompositionDescriptor {
  const profile = describeOpenClawRuntimeProfile({
    profile: input.profile,
    ...(input.realNetworkGateOpen === undefined ? {} : { realNetworkGateOpen: input.realNetworkGateOpen }),
    ...(input.runtimeValueGateOpen === undefined ? {} : { runtimeValueGateOpen: input.runtimeValueGateOpen }),
  });
  const generatedAt = sanitizeText(input.generatedAt ?? DEFAULT_GENERATED_AT, DEFAULT_GENERATED_AT);
  const compositionRef = sanitizeRef(input.compositionRef ?? DEFAULT_COMPOSITION_REF, DEFAULT_COMPOSITION_REF);
  const lifecycle = normalizeLifecycle(input.lifecycle);
  const requiredBindingKinds = defaultRequiredBindingKinds(profile.profile);
  const bindings = normalizeBindings(input.bindings ?? [], requiredBindingKinds);
  const toolRegistrySnapshot = input.toolRegistrySnapshot ?? EMPTY_TOOL_REGISTRY_SNAPSHOT;
  const capabilityRegistrySnapshot = input.capabilityRegistrySnapshot ?? EMPTY_CAPABILITY_REGISTRY_SNAPSHOT;
  const readinessAggregate = aggregatePluginReadiness({
    profile: mapRuntimeProfileToReadinessProfile(profile.profile),
    pluginRef: compositionRef,
    generatedAt,
    components: compositionReadinessComponents(
      lifecycle,
      bindings,
      toolRegistrySnapshot,
      capabilityRegistrySnapshot,
      generatedAt,
    ),
    externalConnectivityEnabled: false,
    willCallRemote: false,
  });
  const aggregateSummary = projectPluginReadinessSummary(readinessAggregate);
  const readinessBlockedReasons = readinessBlockedReasonsFor(profile.blockedReasons, readinessAggregate);
  const readinessStatus = compositionReadinessStatus(profile.profile, readinessAggregate, readinessBlockedReasons);
  const blockedReasons = freezeUniqueReasons([...profile.blockedReasons, ...readinessBlockedReasons]);
  const safeDiagnostics = buildDiagnostics(
    input.diagnostics ?? [],
    profile,
    toolRegistrySnapshot,
    capabilityRegistrySnapshot,
  );
  const actionableNextSteps = nextStepsFor(blockedReasons, readinessAggregate.missingRequired);

  return Object.freeze({
    kind: 'openclaw-runtime-composition',
    descriptorVersion: 'cd11.2-w17a',
    compositionRef,
    profile,
    productionReady: false,
    fakeE2eCompatible:
      profile.profile === 'fake' && readinessStatus === 'fake-ready' && blockedReasons.length === 0,
    lifecycle,
    bindings,
    toolRegistrySnapshot,
    capabilityRegistrySnapshot,
    readiness: Object.freeze({
      status: readinessStatus,
      profile: profile.profile,
      aggregate: aggregateSummary,
      missingRequired: aggregateSummary.missingRequired,
      blockedReasons,
      localEvidenceOnly: true,
      adapterReadyForRealSystemIntegration: false,
    } satisfies OpenClawRuntimeCompositionReadiness),
    readinessAggregate,
    blockedReasons,
    actionableNextSteps,
    safeDiagnostics,
    effects: 'none',
  } satisfies OpenClawRuntimeCompositionDescriptor);
}

export function isOpenClawRuntimeCompositionJsonSafe(value: unknown): boolean {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    return false;
  }

  return !UNSAFE_PUBLIC_TEXT_PATTERNS.some((pattern) => pattern.test(encoded));
}

function normalizeProfile(
  profile: OpenClawRuntimeCompositionProfile,
): OpenClawRuntimeCompositionProfile {
  return isOneOf(profile, OPENCLAW_RUNTIME_COMPOSITION_PROFILES) ? profile : 'fake';
}

function profileBlockedReasons(
  profile: OpenClawRuntimeCompositionProfile,
  realNetworkGateOpen: boolean | undefined,
  runtimeValueGateOpen: boolean | undefined,
): readonly OpenClawRuntimeCompositionBlockedReason[] {
  if (profile === 'fake' || profile === 'dry-run') {
    return Object.freeze([]);
  }

  if (profile === 'secret-gated-smoke') {
    const reasons: OpenClawRuntimeCompositionBlockedReason[] = [];
    if (runtimeValueGateOpen !== true) {
      reasons.push('runtime-value-gate-closed');
    }
    if (realNetworkGateOpen !== true) {
      reasons.push('real-network-gate-closed');
    }
    return Object.freeze(reasons);
  }

  if (profile === 'real-edge') {
    return Object.freeze(['real-edge-not-implemented'] as const);
  }

  return Object.freeze(['production-runtime-not-implemented'] as const);
}

function profileSummary(profile: OpenClawRuntimeCompositionProfile, blockedReasonCount: number): string {
  if (blockedReasonCount > 0) {
    return 'Profile is gated by explicit runtime requirements.';
  }

  if (profile === 'fake') {
    return 'Deterministic fake profile with no external effects.';
  }

  if (profile === 'dry-run') {
    return 'Dry run profile with descriptor validation only.';
  }

  return 'Profile remains descriptor only in this runtime shell.';
}

function normalizeLifecycle(
  lifecycle: PluginLifecycleSnapshot | PluginLifecycleSnapshotDescription | undefined,
): PluginLifecycleSnapshotDescription {
  if (lifecycle === undefined) {
    return describePluginLifecycleSnapshot(createInitialPluginLifecycleSnapshot());
  }

  if (lifecycle.kind === 'plugin-lifecycle-snapshot') {
    return describePluginLifecycleSnapshot(lifecycle);
  }

  return Object.freeze({
    kind: 'plugin-lifecycle-description',
    state: lifecycle.state,
    revision: lifecycle.revision,
    terminal: lifecycle.terminal,
    acceptsWork: lifecycle.acceptsWork,
    canConfigure: lifecycle.canConfigure,
    canInitialize: lifecycle.canInitialize,
    canStart: lifecycle.canStart,
    canBecomeReady: lifecycle.canBecomeReady,
    canDegrade: lifecycle.canDegrade,
    canBeginStop: lifecycle.canBeginStop,
    canStop: lifecycle.canStop,
    effects: 'none',
  } satisfies PluginLifecycleSnapshotDescription);
}

function defaultRequiredBindingKinds(
  profile: OpenClawRuntimeCompositionProfile,
): ReadonlySet<OpenClawRuntimeCompositionBindingKind> {
  if (profile === 'fake' || profile === 'dry-run') {
    return new Set(['core-facade', 'adapter-foundation', 'transport', 'store', 'config'] as const);
  }

  if (profile === 'secret-gated-smoke') {
    return new Set([
      'core-facade',
      'adapter-foundation',
      'transport',
      'config',
      'credential-resolver',
    ] as const);
  }

  return new Set([
    'core-facade',
    'adapter-foundation',
    'transport',
    'store',
    'config',
    'credential-resolver',
  ] as const);
}

function normalizeBindings(
  inputs: readonly OpenClawRuntimeCompositionBindingInput[],
  defaultRequiredKinds: ReadonlySet<OpenClawRuntimeCompositionBindingKind>,
): readonly OpenClawRuntimeCompositionBindingDescriptor[] {
  const bindings = inputs.map((input) => normalizeBinding(input, defaultRequiredKinds));
  return Object.freeze(bindings.sort((left, right) => left.bindingRef.localeCompare(right.bindingRef)));
}

function normalizeBinding(
  input: OpenClawRuntimeCompositionBindingInput,
  defaultRequiredKinds: ReadonlySet<OpenClawRuntimeCompositionBindingKind>,
): OpenClawRuntimeCompositionBindingDescriptor {
  const kind = isOneOf(input.kind, OPENCLAW_RUNTIME_COMPOSITION_BINDING_KINDS)
    ? input.kind
    : 'optional-overlay';
  const status = isOneOf(input.status, OPENCLAW_RUNTIME_COMPOSITION_BINDING_STATUSES)
    ? input.status
    : 'not-ready';
  const readinessRef = input.readinessRef === undefined ? undefined : sanitizeRef(input.readinessRef);

  return Object.freeze({
    bindingRef: sanitizeRef(input.bindingRef),
    kind,
    status,
    required: input.required === true || defaultRequiredKinds.has(kind),
    safeSummary: sanitizeText(input.safeSummary ?? bindingSummary(kind, status)),
    ...(readinessRef === undefined ? {} : { readinessRef }),
  } satisfies OpenClawRuntimeCompositionBindingDescriptor);
}

function bindingSummary(
  kind: OpenClawRuntimeCompositionBindingKind,
  status: OpenClawRuntimeCompositionBindingStatus,
): string {
  if (status === 'ready') {
    return `${kind} binding ready`;
  }

  if (status === 'disabled') {
    return `${kind} binding disabled`;
  }

  return `${kind} binding unavailable`;
}

function compositionReadinessComponents(
  lifecycle: PluginLifecycleSnapshotDescription,
  bindings: readonly OpenClawRuntimeCompositionBindingDescriptor[],
  toolRegistrySnapshot: OpenClawToolRegistrySnapshot,
  capabilityRegistrySnapshot: RuntimeCapabilityRegistrySnapshot,
  generatedAt: string,
): readonly PluginReadinessComponentInput[] {
  const components: PluginReadinessComponentInput[] = [
    {
      componentRef: 'component:plugin-lifecycle',
      kind: 'plugin-lifecycle',
      status: lifecycle.acceptsWork ? 'ready' : 'not-ready',
      required: true,
      summary: lifecycle.acceptsWork ? 'Lifecycle accepts runtime work' : 'Lifecycle is not ready for runtime work',
      checkedAt: generatedAt,
    },
    {
      componentRef: 'component:tools',
      kind: 'tools',
      status: toolRegistrySnapshot.defaultAvailability === 'not-ready' ? 'not-ready' : 'ready',
      required: false,
      summary: 'Tool registry snapshot is available',
      checkedAt: generatedAt,
    },
    {
      componentRef: 'component:capability',
      kind: 'capability',
      status: capabilityRegistrySnapshot.readiness.some((item) => item.blocking) ? 'not-ready' : 'ready',
      required: false,
      summary: 'Capability registry snapshot is available',
      checkedAt: generatedAt,
    },
  ];

  for (const binding of bindings) {
    const kind = componentKindForBinding(binding.kind);
    if (kind === undefined) {
      continue;
    }

    components.push({
      componentRef: binding.readinessRef ?? `component:${kind}`,
      kind,
      status: componentStatusForBinding(binding.status),
      required: binding.required,
      summary: binding.safeSummary,
      checkedAt: generatedAt,
    });
  }

  return Object.freeze(components);
}

function componentKindForBinding(
  kind: OpenClawRuntimeCompositionBindingKind,
): PluginReadinessComponentKind | undefined {
  switch (kind) {
    case 'core-facade':
      return 'core-facade';
    case 'adapter-foundation':
      return 'adapter-foundation';
    case 'transport':
      return 'transport';
    case 'store':
      return 'stores';
    case 'config':
    case 'credential-resolver':
      return 'config';
    case 'fake-evidence':
    case 'no-leak-evidence':
      return 'adapter-foundation';
    case 'approval-token':
    case 'observability':
    case 'optional-overlay':
      return undefined;
  }
}

function componentStatusForBinding(
  status: OpenClawRuntimeCompositionBindingStatus,
): PluginReadinessComponentInput['status'] {
  switch (status) {
    case 'ready':
      return 'ready';
    case 'disabled':
      return 'disabled';
    case 'degraded':
      return 'degraded';
    case 'failed-safe':
      return 'failed';
    case 'blocked':
    case 'not-ready':
      return 'not-ready';
  }
}

function mapRuntimeProfileToReadinessProfile(
  profile: OpenClawRuntimeCompositionProfile,
): PluginReadinessProfile {
  switch (profile) {
    case 'fake':
      return 'test';
    case 'dry-run':
      return 'dry-run';
    case 'secret-gated-smoke':
    case 'real-edge':
      return 'real-smoke';
    case 'production-candidate':
      return 'production';
  }
}

function readinessBlockedReasonsFor(
  profileBlockedReasons: readonly OpenClawRuntimeCompositionBlockedReason[],
  readinessAggregate: PluginReadinessAggregateResult,
): readonly OpenClawRuntimeCompositionBlockedReason[] {
  const reasons: OpenClawRuntimeCompositionBlockedReason[] = [...profileBlockedReasons];

  if (readinessAggregate.missingRequired.length > 0) {
    reasons.push('missing-required-binding');
  }

  if (readinessAggregate.status === 'failed') {
    reasons.push('readiness-aggregate-failed');
  } else if (readinessAggregate.status === 'not-ready') {
    reasons.push('readiness-aggregate-not-ready');
  }

  return freezeUniqueReasons(reasons);
}

function compositionReadinessStatus(
  profile: OpenClawRuntimeCompositionProfile,
  aggregate: PluginReadinessAggregateResult,
  blockedReasons: readonly OpenClawRuntimeCompositionBlockedReason[],
): OpenClawRuntimeCompositionReadinessStatus {
  if (aggregate.status === 'failed') {
    return 'failed-safe';
  }

  if (blockedReasons.some((reason) => reason === 'real-edge-not-implemented' || reason === 'production-runtime-not-implemented')) {
    return 'blocked';
  }

  if (blockedReasons.length > 0) {
    return profile === 'secret-gated-smoke' ? 'profile-gated' : 'not-ready';
  }

  if (aggregate.status === 'degraded') {
    return 'degraded';
  }

  if (aggregate.status !== 'ready') {
    return 'not-ready';
  }

  return profile === 'dry-run' ? 'dry-run-ready' : 'fake-ready';
}

function buildDiagnostics(
  inputs: readonly OpenClawRuntimeSafeDiagnosticInput[],
  profile: OpenClawRuntimeProfileDescriptor,
  toolRegistrySnapshot: OpenClawToolRegistrySnapshot,
  capabilityRegistrySnapshot: RuntimeCapabilityRegistrySnapshot,
): readonly OpenClawRuntimeSafeDiagnostic[] {
  const diagnostics: OpenClawRuntimeSafeDiagnostic[] = [
    {
      diagnosticRef: 'diagnostic:import-safe',
      status: 'pass',
      safeSummary: 'Composition module import is descriptor only.',
    },
    {
      diagnosticRef: 'diagnostic:no-effects',
      status: 'pass',
      safeSummary: 'Composition module reports no runtime effects.',
    },
    {
      diagnosticRef: 'diagnostic:remote-disabled',
      status: profile.willCallRemote ? 'fail' : 'pass',
      safeSummary: profile.willCallRemote
        ? 'Composition profile would call remote work.'
        : 'Composition profile will not call remote work.',
    },
    {
      diagnosticRef: 'diagnostic:registry-snapshots',
      status: capabilityRegistrySnapshot.capabilityCount >= 0 && toolRegistrySnapshot.toolCount >= 0 ? 'pass' : 'fail',
      safeSummary: 'Registry snapshots are represented safely.',
    },
    {
      diagnosticRef: 'diagnostic:package-root-export-deferred',
      status: 'warn',
      safeSummary: 'Package root export remains deferred for this slice.',
    },
  ];

  for (const input of inputs) {
    diagnostics.push(normalizeDiagnostic(input));
  }

  return Object.freeze(diagnostics.sort((left, right) => left.diagnosticRef.localeCompare(right.diagnosticRef)));
}

function normalizeDiagnostic(input: OpenClawRuntimeSafeDiagnosticInput): OpenClawRuntimeSafeDiagnostic {
  const detailsRef = input.detailsRef === undefined ? undefined : sanitizeRef(input.detailsRef);

  return Object.freeze({
    diagnosticRef: sanitizeRef(input.diagnosticRef, 'diagnostic:redacted'),
    status: normalizeDiagnosticStatus(input.status),
    safeSummary: sanitizeText(input.safeSummary ?? 'Safe diagnostic descriptor.'),
    ...(detailsRef === undefined ? {} : { detailsRef }),
  } satisfies OpenClawRuntimeSafeDiagnostic);
}

function normalizeDiagnosticStatus(status: OpenClawRuntimeDiagnosticStatus): OpenClawRuntimeDiagnosticStatus {
  if (status === 'pass' || status === 'warn' || status === 'fail' || status === 'disabled') {
    return status;
  }

  return 'warn';
}

function nextStepsFor(
  blockedReasons: readonly OpenClawRuntimeCompositionBlockedReason[],
  missingRequired: readonly string[],
): readonly string[] {
  const steps: string[] = [];

  if (missingRequired.length > 0 || blockedReasons.includes('missing-required-binding')) {
    steps.push('provide-required-runtime-bindings');
  }

  if (
    blockedReasons.includes('runtime-value-gate-closed') ||
    blockedReasons.includes('real-network-gate-closed')
  ) {
    steps.push('keep-secret-gated-edge-explicitly-blocked');
  }

  if (blockedReasons.includes('real-edge-not-implemented')) {
    steps.push('defer-real-edge-runtime-to-assigned-slice');
  }

  if (blockedReasons.includes('production-runtime-not-implemented')) {
    steps.push('defer-production-runtime-to-future-gate');
  }

  if (steps.length === 0) {
    steps.push('continue-fake-e2e-acceptance-evidence');
  }

  return Object.freeze(steps);
}

function freezeUniqueReasons(
  reasons: readonly OpenClawRuntimeCompositionBlockedReason[],
): readonly OpenClawRuntimeCompositionBlockedReason[] {
  return Object.freeze([...new Set(reasons)]);
}

function sanitizeText(value: unknown, fallback = SAFE_TEXT_FALLBACK): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().replace(/\s+/gu, ' ');
  if (normalized.length === 0 || hasUnsafeText(normalized)) {
    return fallback;
  }

  if (normalized.length > MAX_SAFE_TEXT_LENGTH) {
    return normalized.slice(0, MAX_SAFE_TEXT_LENGTH);
  }

  return normalized;
}

function sanitizeRef(value: unknown, fallback = 'redacted-ref'): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > MAX_SAFE_REF_LENGTH) {
    return fallback;
  }

  if (!SAFE_REF_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    return fallback;
  }

  return normalized;
}

function hasUnsafeText(value: string): boolean {
  return UNSAFE_PUBLIC_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}
