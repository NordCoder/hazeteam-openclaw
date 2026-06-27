/**
 * W28B descriptor-only OCA and sidecar contract vocabulary.
 *
 * This file is intentionally data-shape only. Descriptor-only means not runtime ready,
 * and a fake or inert sidecar descriptor is not sidecar runtime. These contracts do
 * not construct clients, start transports, load credentials, supervise sidecars, or
 * prove OCA, sidecar, deployment, LifeOS, provider, or production readiness.
 */

export type OcaSidecarJsonScalar = string | number | boolean | null;

export type OcaSidecarJsonValue =
  | OcaSidecarJsonScalar
  | readonly OcaSidecarJsonValue[]
  | { readonly [key: string]: OcaSidecarJsonValue };

export type OcaDescriptorKind =
  | 'oca-capability-descriptor'
  | 'oca-operation-descriptor'
  | 'oca-profile-descriptor'
  | 'oca-output-normalization-descriptor';

export type OcaCapabilityRef = `oca-capability:${string}`;
export type OcaOperationRef = `oca-operation:${string}`;
export type SidecarDescriptorRef = `oca-sidecar:${string}`;
export type OcaPolicyRef = `oca-policy:${string}`;
export type OcaCorrelationRef = `correlation:${string}`;

export type OcaOperationKind =
  | 'session-start-request'
  | 'session-continue-request'
  | 'session-input-request'
  | 'session-status-read'
  | 'session-output-summary-read'
  | 'session-cancel-request'
  | 'artifact-summary-read'
  | 'review-request'
  | 'review-submit-request';

export type SidecarDescriptorKind =
  | 'sidecar-capability-descriptor'
  | 'sidecar-lifecycle-descriptor'
  | 'sidecar-containment-descriptor'
  | 'sidecar-public-status-descriptor';

export type SidecarLifecycleKind =
  | 'not-started-descriptor-only'
  | 'fake-inert-descriptor-only'
  | 'external-runtime-required'
  | 'manual-operator-gated';

/**
 * These states are status labels only. Missing client, closed gate, missing credential,
 * blocked policy, missing store, ready-to-attempt, and ready-to-run are not execution
 * pass states and do not prove OCA or sidecar readiness.
 */
export type OcaSidecarReadinessStatus =
  | 'descriptor-only-not-runtime-ready'
  | 'fake-inert-not-sidecar-runtime'
  | 'missing-client-not-execution-pass'
  | 'closed-gate-not-execution-pass'
  | 'missing-credential-not-execution-pass'
  | 'blocked-policy-not-execution-pass'
  | 'missing-store-not-execution-pass'
  | 'ready-to-attempt-not-execution-pass'
  | 'ready-to-run-not-execution-pass';

export type ApprovalRequirementClass =
  | 'not-required-for-descriptor-read'
  | 'approval-required-before-runtime-attempt'
  | 'approval-required-before-mutation-attempt'
  | 'policy-blocked-no-runtime-attempt';

export type RuntimeValueContainmentClass =
  | 'no-runtime-value-present'
  | 'runtime-value-contained-by-explicit-boundary'
  | 'redacted-public-ref-only'
  | 'runtime-value-blocked-from-public-projection';

/**
 * OCA output must be normalized before any public projection. Public contracts expose
 * safe refs, bounded labels, and redacted summaries only, never raw OCA output.
 */
export type OcaOutputContainmentClass =
  | 'raw-output-contained-private'
  | 'normalized-before-public-projection'
  | 'redacted-summary-only'
  | 'blocked-from-public-projection';

export type ProviderAcknowledgementStatus =
  | 'not-attempted'
  | 'not-applicable'
  | 'acknowledged-without-business-outcome'
  | 'not-acknowledged';

export type BusinessOutcomeStatus =
  | 'not-attempted'
  | 'not-applicable'
  | 'not-evaluated'
  | 'reported-separately';

export type OcaSidecarPublicRedactionStatus =
  | 'redacted-json-safe'
  | 'normalization-required-before-public-projection'
  | 'public-projection-blocked';

export type OcaSidecarRuntimeClaim =
  | 'no-oca-runtime-readiness-claim'
  | 'no-sidecar-readiness-claim'
  | 'no-provider-runtime-readiness-claim'
  | 'no-deployment-readiness-claim'
  | 'no-production-readiness-claim';

export interface OcaDescriptorContract {
  readonly descriptorKind: OcaDescriptorKind;
  readonly capabilityRef: OcaCapabilityRef;
  readonly operationRefs: readonly OcaOperationRef[];
  readonly readinessStatus: OcaSidecarReadinessStatus;
  readonly approvalRequirement: ApprovalRequirementClass;
  readonly runtimeValueContainment: RuntimeValueContainmentClass;
  readonly outputContainment: OcaOutputContainmentClass;
  readonly publicRedactionStatus: OcaSidecarPublicRedactionStatus;
  readonly runtimeClaims: readonly OcaSidecarRuntimeClaim[];
  readonly descriptorOnly: true;
  readonly executionPass: false;
  readonly productionReady: false;
}

export interface OcaOperationDescriptorContract {
  readonly descriptorKind: 'oca-operation-descriptor';
  readonly operationRef: OcaOperationRef;
  readonly operationKind: OcaOperationKind;
  readonly capabilityRef: OcaCapabilityRef;
  readonly approvalRequirement: ApprovalRequirementClass;
  readonly runtimeValueContainment: RuntimeValueContainmentClass;
  readonly outputContainment: OcaOutputContainmentClass;
  readonly readinessStatus: OcaSidecarReadinessStatus;
  readonly safePolicyRefs: readonly OcaPolicyRef[];
  readonly descriptorOnly: true;
  readonly executionPass: false;
}

export interface SidecarLifecycleDescriptorContract {
  readonly descriptorKind: 'sidecar-lifecycle-descriptor';
  readonly sidecarDescriptorRef: SidecarDescriptorRef;
  readonly lifecycleKind: SidecarLifecycleKind;
  readonly readinessStatus: OcaSidecarReadinessStatus;
  readonly runtimeValueContainment: RuntimeValueContainmentClass;
  readonly publicRedactionStatus: OcaSidecarPublicRedactionStatus;
  readonly fakeOrInertDescriptorOnly: true;
  readonly sidecarRuntimeImplemented: false;
  readonly executionPass: false;
  readonly productionReady: false;
}

export interface OcaSidecarProviderOutcomeSeparation {
  /** Provider acknowledgement remains separate from business success. */
  readonly providerAcknowledgementStatus: ProviderAcknowledgementStatus;
  readonly businessOutcomeStatus: BusinessOutcomeStatus;
  readonly providerAcknowledgementIsBusinessOutcome: false;
}

export interface RedactedOcaSidecarPublicSummary extends OcaSidecarProviderOutcomeSeparation {
  readonly summaryKind: 'redacted-oca-sidecar-public-summary';
  readonly descriptorKind: OcaDescriptorKind | SidecarDescriptorKind;
  readonly capabilityRef?: OcaCapabilityRef;
  readonly operationRef?: OcaOperationRef;
  readonly operationKind?: OcaOperationKind;
  readonly sidecarDescriptorRef?: SidecarDescriptorRef;
  readonly readinessStatus: OcaSidecarReadinessStatus;
  readonly approvalRequirement: ApprovalRequirementClass;
  readonly runtimeValueContainment: RuntimeValueContainmentClass;
  readonly outputContainment: OcaOutputContainmentClass;
  readonly publicRedactionStatus: OcaSidecarPublicRedactionStatus;
  readonly runtimeClaims: readonly OcaSidecarRuntimeClaim[];
  readonly safeCorrelationRef?: OcaCorrelationRef;
  readonly safeLabels: readonly string[];
  readonly safeSummaryText: string;
  readonly safeDetails: readonly OcaSidecarJsonValue[];
  readonly descriptorOnly: true;
  readonly executionPass: false;
  readonly productionReady: false;
}

export interface OcaSidecarContractSurface {
  readonly surfaceKind: 'w28b-oca-sidecar-contract-surface';
  readonly ocaDescriptors: readonly OcaDescriptorContract[];
  readonly operationDescriptors: readonly OcaOperationDescriptorContract[];
  readonly sidecarLifecycleDescriptors: readonly SidecarLifecycleDescriptorContract[];
  readonly publicSummaries: readonly RedactedOcaSidecarPublicSummary[];
  readonly descriptorOnly: true;
  readonly executionPass: false;
  readonly productionReady: false;
}
