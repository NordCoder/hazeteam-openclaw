export type ProviderClientJsonPrimitive = string | number | boolean | null;
export type ProviderClientJsonValue =
  | ProviderClientJsonPrimitive
  | readonly ProviderClientJsonValue[]
  | ProviderClientJsonObject;
export type ProviderClientJsonObject = { readonly [key: string]: ProviderClientJsonValue };

export const PROVIDER_CLIENT_PROVIDER_KINDS = ['telegram', 'openclaw', 'test-fixture', 'unknown'] as const;
export type ProviderKind = (typeof PROVIDER_CLIENT_PROVIDER_KINDS)[number] | (string & {});

export const PROVIDER_CLIENT_OPERATION_KINDS = [
  'outbound-delivery',
  'callback-acknowledgement',
  'provider-readiness-probe',
  'real-smoke-attempt',
  'runtime-binding-check',
  'unknown',
] as const;
export type ProviderOperationKind = (typeof PROVIDER_CLIENT_OPERATION_KINDS)[number] | (string & {});

export const PROVIDER_OPERATION_SAFETY_CLASSES = [
  'read-only',
  'persistent-write',
  'destructive',
  'unknown',
] as const;
export type ProviderOperationSafetyClass = (typeof PROVIDER_OPERATION_SAFETY_CLASSES)[number];

export const PROVIDER_ATTEMPT_STATUSES = [
  'not-attempted',
  'skipped',
  'blocked',
  'ready-to-attempt',
  'ready-to-run',
  'attempted',
  'acknowledged',
  'failed-safe',
] as const;
export type ProviderAttemptStatus = (typeof PROVIDER_ATTEMPT_STATUSES)[number];

/*
 * These readiness states are below pass. In particular, ready-to-attempt is not pass,
 * ready-to-run is not pass, and neither skipped nor blocked can prove a real provider edge.
 */
export const PROVIDER_READINESS_BELOW_PASS_STATUSES = [
  'skipped',
  'blocked',
  'ready-to-attempt',
  'ready-to-run',
  'acknowledgement-only',
] as const;
export type ProviderReadinessBelowPassStatus = (typeof PROVIDER_READINESS_BELOW_PASS_STATUSES)[number];

export const PROVIDER_READINESS_STATUSES = [
  'not-evaluated',
  'not-configured',
  'skipped',
  'blocked',
  'ready-to-attempt',
  'ready-to-run',
  'attempted-redacted',
  'acknowledgement-only',
  'failed-safe',
] as const;
export type ProviderReadinessStatus = (typeof PROVIDER_READINESS_STATUSES)[number];

/*
 * Provider acknowledgement is not business success. It classifies only provider-boundary evidence.
 */
export const PROVIDER_ACKNOWLEDGEMENT_CLASSES = [
  'not-attempted',
  'accepted',
  'delivered',
  'rejected',
  'throttled',
  'unavailable',
  'timed-out',
  'blocked',
  'skipped',
  'unsafe',
] as const;
export type ProviderAcknowledgementClass = (typeof PROVIDER_ACKNOWLEDGEMENT_CLASSES)[number];

export const PROVIDER_BUSINESS_LIFECYCLE_CLASSES = [
  'not-started',
  'pending',
  'completed',
  'failed',
  'duplicate-suppressed',
  'permission-denied',
  'not-applicable',
] as const;
export type ProviderBusinessLifecycleClass = (typeof PROVIDER_BUSINESS_LIFECYCLE_CLASSES)[number];

/*
 * Acknowledgement-only evidence is not real-provider success. It remains below pass until a
 * separately scoped gate supplies redacted attempt evidence and business lifecycle evidence.
 */
export const PROVIDER_EVIDENCE_CLASSES = [
  'none',
  'descriptor-only',
  'readiness-only',
  'acknowledgement-only',
  'redacted-attempt-evidence',
  'failed-safe-evidence',
] as const;
export type ProviderEvidenceClass = (typeof PROVIDER_EVIDENCE_CLASSES)[number];

export const PROVIDER_BOUNDARY_POSTURES = [
  'contract-only',
  'absent',
  'fake-or-inert',
  'injected-boundary-required',
  'future-runtime-only',
] as const;
export type ProviderBoundaryPosture = (typeof PROVIDER_BOUNDARY_POSTURES)[number];

export const PROVIDER_REPOSITORY_POSTURES = [
  'adapter-ready-for-real-system-integration under explicit gates',
  'not-production-ready',
] as const;
export type ProviderRepositoryPosture = (typeof PROVIDER_REPOSITORY_POSTURES)[number];

export interface ProviderRequestDescriptor {
  readonly providerKind: ProviderKind;
  readonly operationKind: ProviderOperationKind;
  readonly operationSafetyClass: ProviderOperationSafetyClass;
  readonly requestRef: string;
  readonly correlationRef?: string;
  readonly attemptStatus: ProviderAttemptStatus;
  readonly readinessStatus?: ProviderReadinessStatus;
  readonly safeSummary?: string;
  readonly redactedExternalRef?: string;
  readonly redactedMetadata?: ProviderClientJsonObject;
}

export interface ProviderClientBoundaryDescriptor {
  readonly boundaryKind: 'provider-client-contract';
  readonly providerKind: ProviderKind;
  readonly supportedOperationKinds: readonly ProviderOperationKind[];
  readonly boundaryPosture: ProviderBoundaryPosture;
  readonly readinessStatus: ProviderReadinessStatus;
  readonly defaultNetworkBehavior: 'none';
  readonly defaultRuntimeStartup: 'none';
  readonly defaultSensitiveValueLoading: 'none';
  readonly providerPackageImportState: 'not-imported';
  readonly repositoryPosture: ProviderRepositoryPosture;
  readonly safeSummary?: string;
  readonly redactedMetadata?: ProviderClientJsonObject;
}

export interface RedactedProviderErrorProjection {
  readonly providerKind: ProviderKind;
  readonly operationKind: ProviderOperationKind;
  readonly acknowledgementClass: ProviderAcknowledgementClass;
  readonly businessLifecycleClass: ProviderBusinessLifecycleClass;
  readonly readinessStatus: ProviderReadinessStatus;
  readonly retryable: boolean;
  readonly reasonCode: string;
  readonly safeMessage?: string;
  readonly unsafeOutputDetected: boolean;
  readonly redactedMetadata?: ProviderClientJsonObject;
}

export interface RedactedProviderResultProjection {
  readonly providerKind: ProviderKind;
  readonly operationKind: ProviderOperationKind;
  readonly requestDescriptor: ProviderRequestDescriptor;
  readonly attemptStatus: ProviderAttemptStatus;
  readonly acknowledgementClass: ProviderAcknowledgementClass;
  readonly businessLifecycleClass: ProviderBusinessLifecycleClass;
  readonly readinessStatus: ProviderReadinessStatus;
  readonly evidenceClass: ProviderEvidenceClass;
  readonly retryable: boolean;
  readonly unsafeOutputDetected: boolean;
  readonly redactedExternalRef?: string;
  readonly reasonCode?: string;
  readonly safeMessage?: string;
  readonly redactedMetadata?: ProviderClientJsonObject;
}

export interface ProviderReadinessBoundaryDescriptor {
  readonly providerKind: ProviderKind;
  readonly operationKind: ProviderOperationKind;
  readonly readinessStatus: ProviderReadinessStatus;
  readonly belowPassStatus?: ProviderReadinessBelowPassStatus;
  readonly attemptStatus: ProviderAttemptStatus;
  readonly acknowledgementClass: ProviderAcknowledgementClass;
  readonly businessLifecycleClass: ProviderBusinessLifecycleClass;
  readonly evidenceClass: ProviderEvidenceClass;
  readonly repositoryPosture: ProviderRepositoryPosture;
  readonly safeSummary?: string;
  readonly redactedMetadata?: ProviderClientJsonObject;
}
