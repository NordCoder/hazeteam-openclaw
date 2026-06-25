export type OpenClawPluginRuntimePackageStatus = 'runtime-shell';

export type OpenClawPluginRuntimeReadiness = 'fake-dry-run-capable';

export type OpenClawPluginRuntimeEffect = 'none';

export type OpenClawPluginRuntimePublicSurface =
  | 'lifecycle'
  | 'tool-registry'
  | 'capability-registry'
  | 'readiness';

export interface OpenClawPluginRuntimePackageMetadata {
  readonly name: '@hazeteam/openclaw-plugin-runtime';
  readonly status: OpenClawPluginRuntimePackageStatus;
  readonly productionReady: false;
  readonly contractSlice: 'W13A-W13F';
  readonly publicSurfaces: readonly OpenClawPluginRuntimePublicSurface[];
}

export interface OpenClawPluginRuntimeDescriptor {
  readonly kind: 'openclaw-plugin-runtime';
  readonly packageName: '@hazeteam/openclaw-plugin-runtime';
  readonly packageStatus: OpenClawPluginRuntimePackageStatus;
  readonly descriptorVersion: 'w13f';
  readonly readiness: OpenClawPluginRuntimeReadiness;
  readonly productionReady: false;
  readonly effects: OpenClawPluginRuntimeEffect;
  readonly scope: 'plugin-runtime-shell';
  readonly publicSurfaces: readonly OpenClawPluginRuntimePublicSurface[];
}

export interface OpenClawPluginRuntimeDescription {
  readonly package: OpenClawPluginRuntimePackageMetadata;
  readonly descriptor: OpenClawPluginRuntimeDescriptor;
}

export const OPENCLAW_PLUGIN_RUNTIME_PUBLIC_SURFACES = Object.freeze([
  'lifecycle',
  'tool-registry',
  'capability-registry',
  'readiness',
] as const satisfies readonly OpenClawPluginRuntimePublicSurface[]);

export const OPENCLAW_PLUGIN_RUNTIME_PACKAGE = Object.freeze({
  name: '@hazeteam/openclaw-plugin-runtime',
  status: 'runtime-shell',
  productionReady: false,
  contractSlice: 'W13A-W13F',
  publicSurfaces: OPENCLAW_PLUGIN_RUNTIME_PUBLIC_SURFACES,
} satisfies OpenClawPluginRuntimePackageMetadata);

export const OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR = Object.freeze({
  kind: 'openclaw-plugin-runtime',
  packageName: OPENCLAW_PLUGIN_RUNTIME_PACKAGE.name,
  packageStatus: OPENCLAW_PLUGIN_RUNTIME_PACKAGE.status,
  descriptorVersion: 'w13f',
  readiness: 'fake-dry-run-capable',
  productionReady: false,
  effects: 'none',
  scope: 'plugin-runtime-shell',
  publicSurfaces: OPENCLAW_PLUGIN_RUNTIME_PUBLIC_SURFACES,
} satisfies OpenClawPluginRuntimeDescriptor);

export function describeOpenClawPluginRuntime(): OpenClawPluginRuntimeDescription {
  return {
    package: OPENCLAW_PLUGIN_RUNTIME_PACKAGE,
    descriptor: OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR,
  };
}

export {
  PLUGIN_LIFECYCLE_STATES,
  PLUGIN_LIFECYCLE_TRANSITIONS,
  applyPluginLifecycleTransition,
  createInitialPluginLifecycleSnapshot,
  createPluginLifecycleFailureReason,
  createSafePluginLifecycleReason,
  describePluginLifecycleSnapshot,
} from './lifecycle.js';

export type {
  PluginLifecycleAcceptedTransition,
  PluginLifecycleHistoryEntry,
  PluginLifecycleReasonCategory,
  PluginLifecycleReasonInput,
  PluginLifecycleRejectedTransition,
  PluginLifecycleSnapshot,
  PluginLifecycleSnapshotDescription,
  PluginLifecycleState,
  PluginLifecycleTransition,
  PluginLifecycleTransitionResult,
  PluginLifecycleTransitionType,
  SafePluginLifecycleReason,
} from './lifecycle.js';

export {
  createOpenClawToolRegistry,
  isSafeOpenClawToolRef,
  validateOpenClawToolDescriptor,
} from './tool-registry.js';

export type {
  OpenClawToolApprovalClassification,
  OpenClawToolApprovalDescriptor,
  OpenClawToolAvailabilityDescriptor,
  OpenClawToolAvailabilityPosture,
  OpenClawToolCapabilityBindingKind,
  OpenClawToolCapabilityBindingRef,
  OpenClawToolCategory,
  OpenClawToolDescriptor,
  OpenClawToolEffectClassification,
  OpenClawToolHandlerReferenceDescriptor,
  OpenClawToolHandlerReferenceKind,
  OpenClawToolInputBoundary,
  OpenClawToolRegistry,
  OpenClawToolRegistryOk,
  OpenClawToolRegistryRejected,
  OpenClawToolRegistryRejection,
  OpenClawToolRegistryRejectionCode,
  OpenClawToolRegistryResult,
  OpenClawToolRegistrySnapshot,
  OpenClawToolSchemaBoundaryDescriptor,
} from './tool-registry.js';

export {
  RUNTIME_CAPABILITY_EXECUTION_POSTURES,
  RUNTIME_CAPABILITY_KINDS,
  RUNTIME_CAPABILITY_READINESS_STATES,
  RUNTIME_CAPABILITY_REQUIREMENTS,
  createCapabilityReadinessDescriptor,
  createMissingCapabilityReadinessDescriptor,
  createRuntimeCapabilityRegistry,
  normalizeCapabilityDescriptor,
  serializeRuntimeCapabilityRegistrySnapshot,
} from './capability-registry.js';

export type {
  RuntimeCapabilityDescriptorInput,
  RuntimeCapabilityExecutionPosture,
  RuntimeCapabilityKind,
  RuntimeCapabilityReadinessDescriptor,
  RuntimeCapabilityReadinessState,
  RuntimeCapabilityRegistry,
  RuntimeCapabilityRegistryError,
  RuntimeCapabilityRegistryErrorCode,
  RuntimeCapabilityRegistryResult,
  RuntimeCapabilityRegistrySnapshot,
  RuntimeCapabilityRequirement,
  RuntimeCapabilityRequirementDescriptor,
  SafeRuntimeCapabilityDescriptor,
} from './capability-registry.js';

export {
  OPENCLAW_PLUGIN_READINESS_AGGREGATE_STATUSES,
  OPENCLAW_PLUGIN_READINESS_COMPONENT_KINDS,
  OPENCLAW_PLUGIN_READINESS_COMPONENT_STATUSES,
  OPENCLAW_PLUGIN_READINESS_PROFILES,
  aggregatePluginReadiness,
  isSafeReadinessJson,
  projectPluginReadinessSummary,
  readinessCheckStatus,
  sanitizeReadinessRef,
  sanitizeReadinessText,
} from './readiness.js';

export type {
  AggregatePluginReadinessInput,
  PluginReadinessAggregateResult,
  PluginReadinessAggregateStatus,
  PluginReadinessCheckStatus,
  PluginReadinessComponentInput,
  PluginReadinessComponentKind,
  PluginReadinessComponentReport,
  PluginReadinessComponentStatus,
  PluginReadinessProfile,
  PluginReadinessSummaryProjection,
} from './readiness.js';
