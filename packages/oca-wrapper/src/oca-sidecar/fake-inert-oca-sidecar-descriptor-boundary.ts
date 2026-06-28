import type {
  ApprovalRequirementClass,
  BusinessOutcomeStatus,
  OcaCapabilityRef,
  OcaCorrelationRef,
  OcaDescriptorContract,
  OcaOperationDescriptorContract,
  OcaOperationKind,
  OcaOperationRef,
  OcaOutputContainmentClass,
  OcaPolicyRef,
  OcaSidecarPublicRedactionStatus,
  OcaSidecarRuntimeClaim,
  OcaSidecarSafeDetail,
  OcaSidecarSafeDetailValue,
  OcaSidecarReadinessStatus,
  OcaSidecarContractSurface,
  ProviderAcknowledgementStatus,
  RedactedOcaSidecarPublicSummary,
  RuntimeValueContainmentClass,
  SidecarDescriptorRef,
  SidecarLifecycleDescriptorContract,
  SidecarLifecycleKind,
} from './oca-sidecar-contract.js';

export type FakeInertOcaSidecarDescriptorBoundaryKind = 'fake-inert-oca-sidecar-descriptor-boundary';

export interface FakeInertOcaCapabilityDescriptorInput {
  readonly capabilityRef: OcaCapabilityRef;
  readonly operationRefs?: readonly OcaOperationRef[];
  readonly readinessStatus?: OcaSidecarReadinessStatus;
  readonly approvalRequirement?: ApprovalRequirementClass;
  readonly runtimeValueContainment?: RuntimeValueContainmentClass;
  readonly outputContainment?: OcaOutputContainmentClass;
  readonly publicRedactionStatus?: OcaSidecarPublicRedactionStatus;
  readonly runtimeClaims?: readonly OcaSidecarRuntimeClaim[];
}

export interface FakeInertOcaOperationDescriptorInput {
  readonly operationRef: OcaOperationRef;
  readonly operationKind: OcaOperationKind;
  readonly capabilityRef: OcaCapabilityRef;
  readonly approvalRequirement?: ApprovalRequirementClass;
  readonly runtimeValueContainment?: RuntimeValueContainmentClass;
  readonly outputContainment?: OcaOutputContainmentClass;
  readonly readinessStatus?: OcaSidecarReadinessStatus;
  readonly safePolicyRefs?: readonly OcaPolicyRef[];
}

export interface FakeInertSidecarLifecycleDescriptorInput {
  readonly sidecarDescriptorRef: SidecarDescriptorRef;
  readonly lifecycleKind?: SidecarLifecycleKind;
  readonly readinessStatus?: OcaSidecarReadinessStatus;
  readonly runtimeValueContainment?: RuntimeValueContainmentClass;
  readonly publicRedactionStatus?: OcaSidecarPublicRedactionStatus;
}

export interface FakeInertOcaSidecarProviderOutcomeInput {
  readonly providerAcknowledgementStatus?: ProviderAcknowledgementStatus;
  readonly businessOutcomeStatus?: BusinessOutcomeStatus;
}

export interface FakeInertOcaSidecarPublicSummaryInput extends FakeInertOcaSidecarProviderOutcomeInput {
  readonly descriptorKind: RedactedOcaSidecarPublicSummary['descriptorKind'];
  readonly capabilityRef?: OcaCapabilityRef;
  readonly operationRef?: OcaOperationRef;
  readonly operationKind?: OcaOperationKind;
  readonly sidecarDescriptorRef?: SidecarDescriptorRef;
  readonly readinessStatus?: OcaSidecarReadinessStatus;
  readonly approvalRequirement?: ApprovalRequirementClass;
  readonly runtimeValueContainment?: RuntimeValueContainmentClass;
  readonly outputContainment?: OcaOutputContainmentClass;
  readonly publicRedactionStatus?: OcaSidecarPublicRedactionStatus;
  readonly runtimeClaims?: readonly OcaSidecarRuntimeClaim[];
  readonly safeCorrelationRef?: OcaCorrelationRef;
  readonly safeLabels?: readonly string[];
  readonly safeSummaryText?: string;
  readonly safeDetails?: readonly OcaSidecarSafeDetail[];
}

export interface FakeInertOcaSidecarContractSurfaceInput {
  readonly capabilities?: readonly FakeInertOcaCapabilityDescriptorInput[];
  readonly operations?: readonly FakeInertOcaOperationDescriptorInput[];
  readonly sidecarLifecycles?: readonly FakeInertSidecarLifecycleDescriptorInput[];
  readonly publicSummaries?: readonly FakeInertOcaSidecarPublicSummaryInput[];
}

export interface FakeInertOcaSidecarDescriptorBoundary {
  readonly boundaryKind: FakeInertOcaSidecarDescriptorBoundaryKind;
  readonly describeCapability: (input: FakeInertOcaCapabilityDescriptorInput) => OcaDescriptorContract;
  readonly describeOperation: (input: FakeInertOcaOperationDescriptorInput) => OcaOperationDescriptorContract;
  readonly describeSidecarLifecycle: (
    input: FakeInertSidecarLifecycleDescriptorInput,
  ) => SidecarLifecycleDescriptorContract;
  readonly summarizeCapability: (descriptor: OcaDescriptorContract) => RedactedOcaSidecarPublicSummary;
  readonly summarizeOperation: (descriptor: OcaOperationDescriptorContract) => RedactedOcaSidecarPublicSummary;
  readonly summarizeSidecarLifecycle: (
    descriptor: SidecarLifecycleDescriptorContract,
  ) => RedactedOcaSidecarPublicSummary;
  readonly summarizePublicDescriptor: (
    input: FakeInertOcaSidecarPublicSummaryInput,
  ) => RedactedOcaSidecarPublicSummary;
  readonly describeContractSurface: (
    input: FakeInertOcaSidecarContractSurfaceInput,
  ) => OcaSidecarContractSurface;
}

export const FAKE_INERT_OCA_SIDECAR_NON_PASS_READINESS_STATUSES = Object.freeze([
  'descriptor-only-not-runtime-ready',
  'fake-inert-not-sidecar-runtime',
  'missing-client-not-execution-pass',
  'closed-gate-not-execution-pass',
  'missing-credential-not-execution-pass',
  'blocked-policy-not-execution-pass',
  'missing-store-not-execution-pass',
  'ready-to-attempt-not-execution-pass',
  'ready-to-run-not-execution-pass',
] as const satisfies readonly OcaSidecarReadinessStatus[]);

export const FAKE_INERT_OCA_SIDECAR_RUNTIME_NON_CLAIMS = Object.freeze([
  'no-oca-runtime-readiness-claim',
  'no-sidecar-readiness-claim',
  'no-provider-runtime-readiness-claim',
  'no-deployment-readiness-claim',
  'no-production-readiness-claim',
] as const satisfies readonly OcaSidecarRuntimeClaim[]);

const DEFAULT_READINESS_STATUS: OcaSidecarReadinessStatus = 'fake-inert-not-sidecar-runtime';
const DEFAULT_APPROVAL_REQUIREMENT: ApprovalRequirementClass = 'approval-required-before-runtime-attempt';
const DEFAULT_RUNTIME_VALUE_CONTAINMENT: RuntimeValueContainmentClass = 'no-runtime-value-present';
const DEFAULT_OUTPUT_CONTAINMENT: OcaOutputContainmentClass = 'redacted-summary-only';
const DEFAULT_PUBLIC_REDACTION_STATUS: OcaSidecarPublicRedactionStatus = 'redacted-json-safe';
const DEFAULT_LIFECYCLE_KIND: SidecarLifecycleKind = 'fake-inert-descriptor-only';
const DEFAULT_PROVIDER_ACKNOWLEDGEMENT_STATUS: ProviderAcknowledgementStatus = 'not-attempted';
const DEFAULT_BUSINESS_OUTCOME_STATUS: BusinessOutcomeStatus = 'not-attempted';
const ACKNOWLEDGED_BUSINESS_OUTCOME_STATUS: BusinessOutcomeStatus = 'not-evaluated';
const MAX_DESCRIPTORS = 32;
const MAX_PUBLIC_SUMMARIES = 128;
const MAX_REFS = 32;
const MAX_LABELS = 8;
const MAX_DETAILS = 8;
const MAX_DETAIL_VALUES = 8;
const MAX_LABEL_LENGTH = 64;
const MAX_SUMMARY_LENGTH = 220;
const REDACTED_DETAIL_TEXT = 'redacted descriptor detail';

export function createFakeInertOcaSidecarDescriptorBoundary(): FakeInertOcaSidecarDescriptorBoundary {
  return Object.freeze({
    boundaryKind: 'fake-inert-oca-sidecar-descriptor-boundary',
    describeCapability: describeFakeInertOcaCapability,
    describeOperation: describeFakeInertOcaOperation,
    describeSidecarLifecycle: describeFakeInertSidecarLifecycle,
    summarizeCapability: summarizeFakeInertOcaCapability,
    summarizeOperation: summarizeFakeInertOcaOperation,
    summarizeSidecarLifecycle: summarizeFakeInertSidecarLifecycle,
    summarizePublicDescriptor: summarizeFakeInertOcaSidecarDescriptor,
    describeContractSurface: describeFakeInertOcaSidecarContractSurface,
  } satisfies FakeInertOcaSidecarDescriptorBoundary);
}

export function describeFakeInertOcaCapability(input: FakeInertOcaCapabilityDescriptorInput): OcaDescriptorContract {
  return Object.freeze({
    descriptorKind: 'oca-capability-descriptor',
    capabilityRef: input.capabilityRef,
    operationRefs: normalizeRefs(input.operationRefs ?? []),
    readinessStatus: input.readinessStatus ?? DEFAULT_READINESS_STATUS,
    approvalRequirement: input.approvalRequirement ?? DEFAULT_APPROVAL_REQUIREMENT,
    runtimeValueContainment: input.runtimeValueContainment ?? DEFAULT_RUNTIME_VALUE_CONTAINMENT,
    outputContainment: input.outputContainment ?? DEFAULT_OUTPUT_CONTAINMENT,
    publicRedactionStatus: input.publicRedactionStatus ?? DEFAULT_PUBLIC_REDACTION_STATUS,
    runtimeClaims: normalizeRuntimeClaims(input.runtimeClaims),
    descriptorOnly: true,
    executionPass: false,
    productionReady: false,
  } satisfies OcaDescriptorContract);
}

export function describeFakeInertOcaOperation(
  input: FakeInertOcaOperationDescriptorInput,
): OcaOperationDescriptorContract {
  return Object.freeze({
    descriptorKind: 'oca-operation-descriptor',
    operationRef: input.operationRef,
    operationKind: input.operationKind,
    capabilityRef: input.capabilityRef,
    approvalRequirement: input.approvalRequirement ?? DEFAULT_APPROVAL_REQUIREMENT,
    runtimeValueContainment: input.runtimeValueContainment ?? DEFAULT_RUNTIME_VALUE_CONTAINMENT,
    outputContainment: input.outputContainment ?? DEFAULT_OUTPUT_CONTAINMENT,
    readinessStatus: input.readinessStatus ?? DEFAULT_READINESS_STATUS,
    safePolicyRefs: normalizeRefs(input.safePolicyRefs ?? []),
    descriptorOnly: true,
    executionPass: false,
  } satisfies OcaOperationDescriptorContract);
}

export function describeFakeInertSidecarLifecycle(
  input: FakeInertSidecarLifecycleDescriptorInput,
): SidecarLifecycleDescriptorContract {
  return Object.freeze({
    descriptorKind: 'sidecar-lifecycle-descriptor',
    sidecarDescriptorRef: input.sidecarDescriptorRef,
    lifecycleKind: input.lifecycleKind ?? DEFAULT_LIFECYCLE_KIND,
    readinessStatus: input.readinessStatus ?? DEFAULT_READINESS_STATUS,
    runtimeValueContainment: input.runtimeValueContainment ?? DEFAULT_RUNTIME_VALUE_CONTAINMENT,
    publicRedactionStatus: input.publicRedactionStatus ?? DEFAULT_PUBLIC_REDACTION_STATUS,
    fakeOrInertDescriptorOnly: true,
    sidecarRuntimeImplemented: false,
    executionPass: false,
    productionReady: false,
  } satisfies SidecarLifecycleDescriptorContract);
}

export function summarizeFakeInertOcaCapability(
  descriptor: OcaDescriptorContract,
): RedactedOcaSidecarPublicSummary {
  return summarizeFakeInertOcaSidecarDescriptor({
    descriptorKind: descriptor.descriptorKind,
    capabilityRef: descriptor.capabilityRef,
    readinessStatus: descriptor.readinessStatus,
    approvalRequirement: descriptor.approvalRequirement,
    runtimeValueContainment: descriptor.runtimeValueContainment,
    outputContainment: descriptor.outputContainment,
    publicRedactionStatus: descriptor.publicRedactionStatus,
    runtimeClaims: descriptor.runtimeClaims,
    safeLabels: ['oca-capability', 'fake-inert', 'descriptor-only'],
    safeSummaryText: 'Fake inert OCA capability descriptor only; no OCA execution or sidecar runtime is represented.',
    safeDetails: [
      detail('redacted-status-detail', 'operation-ref-count', descriptor.operationRefs.length),
      detail('containment-detail', 'descriptor-only', true),
    ],
  });
}

export function summarizeFakeInertOcaOperation(
  descriptor: OcaOperationDescriptorContract,
): RedactedOcaSidecarPublicSummary {
  return summarizeFakeInertOcaSidecarDescriptor({
    descriptorKind: descriptor.descriptorKind,
    capabilityRef: descriptor.capabilityRef,
    operationRef: descriptor.operationRef,
    operationKind: descriptor.operationKind,
    readinessStatus: descriptor.readinessStatus,
    approvalRequirement: descriptor.approvalRequirement,
    runtimeValueContainment: descriptor.runtimeValueContainment,
    outputContainment: descriptor.outputContainment,
    publicRedactionStatus: DEFAULT_PUBLIC_REDACTION_STATUS,
    runtimeClaims: FAKE_INERT_OCA_SIDECAR_RUNTIME_NON_CLAIMS,
    safeLabels: ['oca-operation', 'fake-inert', 'descriptor-only'],
    safeSummaryText: 'Fake inert OCA operation descriptor only; provider acknowledgement and business outcome remain separate.',
    safeDetails: [
      detail('policy-detail', 'policy-ref-count', descriptor.safePolicyRefs.length),
      detail('containment-detail', 'execution-pass', false),
    ],
  });
}

export function summarizeFakeInertSidecarLifecycle(
  descriptor: SidecarLifecycleDescriptorContract,
): RedactedOcaSidecarPublicSummary {
  return summarizeFakeInertOcaSidecarDescriptor({
    descriptorKind: descriptor.descriptorKind,
    sidecarDescriptorRef: descriptor.sidecarDescriptorRef,
    readinessStatus: descriptor.readinessStatus,
    approvalRequirement: 'approval-required-before-runtime-attempt',
    runtimeValueContainment: descriptor.runtimeValueContainment,
    outputContainment: DEFAULT_OUTPUT_CONTAINMENT,
    publicRedactionStatus: descriptor.publicRedactionStatus,
    runtimeClaims: FAKE_INERT_OCA_SIDECAR_RUNTIME_NON_CLAIMS,
    safeLabels: ['sidecar-lifecycle', 'fake-inert', 'descriptor-only'],
    safeSummaryText: 'Fake inert sidecar lifecycle descriptor only; it is not sidecar runtime or deployment readiness.',
    safeDetails: [
      detail('redacted-status-detail', 'lifecycle-kind', descriptor.lifecycleKind),
      detail('containment-detail', 'sidecar-runtime-implemented', descriptor.sidecarRuntimeImplemented),
    ],
  });
}

export function summarizeFakeInertOcaSidecarDescriptor(
  input: FakeInertOcaSidecarPublicSummaryInput,
): RedactedOcaSidecarPublicSummary {
  const summary = Object.freeze({
    summaryKind: 'redacted-oca-sidecar-public-summary',
    descriptorKind: input.descriptorKind,
    ...(input.capabilityRef === undefined ? {} : { capabilityRef: input.capabilityRef }),
    ...(input.operationRef === undefined ? {} : { operationRef: input.operationRef }),
    ...(input.operationKind === undefined ? {} : { operationKind: input.operationKind }),
    ...(input.sidecarDescriptorRef === undefined ? {} : { sidecarDescriptorRef: input.sidecarDescriptorRef }),
    readinessStatus: input.readinessStatus ?? DEFAULT_READINESS_STATUS,
    approvalRequirement: input.approvalRequirement ?? DEFAULT_APPROVAL_REQUIREMENT,
    runtimeValueContainment: input.runtimeValueContainment ?? DEFAULT_RUNTIME_VALUE_CONTAINMENT,
    outputContainment: input.outputContainment ?? DEFAULT_OUTPUT_CONTAINMENT,
    publicRedactionStatus: input.publicRedactionStatus ?? DEFAULT_PUBLIC_REDACTION_STATUS,
    runtimeClaims: normalizeRuntimeClaims(input.runtimeClaims),
    ...(input.safeCorrelationRef === undefined ? {} : { safeCorrelationRef: input.safeCorrelationRef }),
    safeLabels: normalizeLabels(input.safeLabels ?? []),
    safeSummaryText: normalizeSafeText(input.safeSummaryText ?? 'Redacted fake inert OCA sidecar descriptor summary.'),
    safeDetails: normalizeDetails(input.safeDetails ?? []),
    providerAcknowledgementStatus:
      input.providerAcknowledgementStatus ?? DEFAULT_PROVIDER_ACKNOWLEDGEMENT_STATUS,
    businessOutcomeStatus: normalizeBusinessOutcomeStatus(
      input.businessOutcomeStatus,
      input.providerAcknowledgementStatus,
    ),
    providerAcknowledgementIsBusinessOutcome: false,
    descriptorOnly: true,
    executionPass: false,
    productionReady: false,
  } satisfies RedactedOcaSidecarPublicSummary);

  return summary;
}

export function describeFakeInertOcaSidecarContractSurface(
  input: FakeInertOcaSidecarContractSurfaceInput,
): OcaSidecarContractSurface {
  const ocaDescriptors = Object.freeze(
    (input.capabilities ?? []).slice(0, MAX_DESCRIPTORS).map(describeFakeInertOcaCapability),
  );
  const operationDescriptors = Object.freeze(
    (input.operations ?? []).slice(0, MAX_DESCRIPTORS).map(describeFakeInertOcaOperation),
  );
  const sidecarLifecycleDescriptors = Object.freeze(
    (input.sidecarLifecycles ?? []).slice(0, MAX_DESCRIPTORS).map(describeFakeInertSidecarLifecycle),
  );
  const generatedSummaries = [
    ...ocaDescriptors.map(summarizeFakeInertOcaCapability),
    ...operationDescriptors.map(summarizeFakeInertOcaOperation),
    ...sidecarLifecycleDescriptors.map(summarizeFakeInertSidecarLifecycle),
  ];
  const providedSummaries = (input.publicSummaries ?? [])
    .slice(0, MAX_PUBLIC_SUMMARIES)
    .map(summarizeFakeInertOcaSidecarDescriptor);

  return Object.freeze({
    surfaceKind: 'w28b-oca-sidecar-contract-surface',
    ocaDescriptors,
    operationDescriptors,
    sidecarLifecycleDescriptors,
    publicSummaries: Object.freeze([...generatedSummaries, ...providedSummaries].slice(0, MAX_PUBLIC_SUMMARIES)),
    descriptorOnly: true,
    executionPass: false,
    productionReady: false,
  } satisfies OcaSidecarContractSurface);
}

function normalizeRuntimeClaims(
  claims: readonly OcaSidecarRuntimeClaim[] | undefined,
): readonly OcaSidecarRuntimeClaim[] {
  return normalizeRefs(claims ?? FAKE_INERT_OCA_SIDECAR_RUNTIME_NON_CLAIMS);
}

function normalizeBusinessOutcomeStatus(
  businessOutcomeStatus: BusinessOutcomeStatus | undefined,
  providerAcknowledgementStatus: ProviderAcknowledgementStatus | undefined,
): BusinessOutcomeStatus {
  if (businessOutcomeStatus !== undefined) {
    return businessOutcomeStatus;
  }

  if (providerAcknowledgementStatus === 'acknowledged-without-business-outcome') {
    return ACKNOWLEDGED_BUSINESS_OUTCOME_STATUS;
  }

  return DEFAULT_BUSINESS_OUTCOME_STATUS;
}

function normalizeRefs<T extends string>(items: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(items)].sort().slice(0, MAX_REFS));
}

function normalizeLabels(labels: readonly string[]): readonly string[] {
  const normalized = labels.map((label) => normalizeSafeText(label, MAX_LABEL_LENGTH));
  const filtered = normalized.filter((label) => label.length > 0);

  return Object.freeze([...new Set(filtered)].sort().slice(0, MAX_LABELS));
}

function normalizeDetails(details: readonly OcaSidecarSafeDetail[]): readonly OcaSidecarSafeDetail[] {
  return Object.freeze(
    details.slice(0, MAX_DETAILS).map((item) =>
      Object.freeze({
        detailKind: item.detailKind,
        label: normalizeSafeText(item.label, MAX_LABEL_LENGTH),
        value: normalizeDetailValue(item.value),
      } satisfies OcaSidecarSafeDetail),
    ),
  );
}

function normalizeDetailValue(value: OcaSidecarSafeDetailValue): OcaSidecarSafeDetailValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.slice(0, MAX_DETAIL_VALUES).map(normalizeScalar));
  }

  return normalizeScalar(value);
}

function normalizeScalar(value: string | number | boolean | null): string | number | boolean | null {
  if (typeof value === 'string') {
    return normalizeSafeText(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  return value;
}

function normalizeSafeText(value: string, maxLength = MAX_SUMMARY_LENGTH): string {
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, maxLength);

  if (normalized.length === 0 || containsBlockedPublicText(normalized)) {
    return REDACTED_DETAIL_TEXT;
  }

  return normalized;
}

function containsBlockedPublicText(value: string): boolean {
  const lower = value.toLowerCase();

  return BLOCKED_PUBLIC_TEXT_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function detail(
  detailKind: OcaSidecarSafeDetail['detailKind'],
  label: string,
  value: OcaSidecarSafeDetailValue,
): OcaSidecarSafeDetail {
  return Object.freeze({
    detailKind,
    label: normalizeSafeText(label, MAX_LABEL_LENGTH),
    value: normalizeDetailValue(value),
  } satisfies OcaSidecarSafeDetail);
}

function fromCharCodes(codes: readonly number[]): string {
  return String.fromCharCode(...codes);
}

const BLOCKED_PUBLIC_TEXT_FRAGMENTS = Object.freeze(
  [
    [114, 97, 119],
    [108, 111, 103],
    [100, 105, 102, 102],
    [115, 116, 100, 111, 117, 116],
    [115, 116, 100, 101, 114, 114],
    [115, 116, 97, 99, 107],
    [116, 111, 107, 101, 110],
    [115, 101, 99, 114, 101, 116],
    [99, 114, 101, 100, 101, 110, 116, 105, 97, 108],
    [101, 110, 100, 112, 111, 105, 110, 116],
    [104, 116, 116, 112, 58, 47, 47],
    [104, 116, 116, 112, 115, 58, 47, 47],
    [119, 119, 119, 46],
    [108, 111, 99, 97, 108, 104, 111, 115, 116],
    [102, 105, 108, 101, 58],
    [47, 104, 111, 109, 101, 47],
    [47, 85, 115, 101, 114, 115, 47],
    [67, 58, 92, 92],
  ].map(fromCharCodes),
);
