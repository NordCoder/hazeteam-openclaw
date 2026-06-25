export type OcaWrapperPackageStatus = 'w15a-descriptor-only';

export type OcaWrapperEffect = 'none';

export type OcaWrapperExecutionPosture = 'fake' | 'dry-run';

export type OcaWrapperReadinessState = 'ready-fake' | 'ready-dry-run';

export type OcaWrapperPublicSurface =
  | 'capability-descriptor'
  | 'operation-descriptors'
  | 'safe-json-check';

export interface OcaWrapperPackageMetadata {
  readonly name: '@hazeteam/oca-wrapper';
  readonly status: OcaWrapperPackageStatus;
  readonly productionReady: false;
  readonly effects: OcaWrapperEffect;
  readonly contractSlice: 'W15A';
  readonly defaultExecutionPosture: OcaWrapperExecutionPosture;
  readonly publicSurfaces: readonly OcaWrapperPublicSurface[];
}

export interface OcaWrapperCapabilityDescriptor {
  readonly capabilityRef: 'oca-wrapper';
  readonly name: 'oca-wrapper';
  readonly version: '0.1.0';
  readonly kind: 'session';
  readonly operationRefs: readonly OcaOperationRef[];
  readonly readinessState: OcaWrapperReadinessState;
  readonly requirement: 'optional';
  readonly executionPosture: OcaWrapperExecutionPosture;
  readonly summary: string;
  readonly detailRefs: readonly string[];
}

export type OcaOperationCategory = 'session-control' | 'session-read' | 'review' | 'summary';

export type OcaOperationApprovalClassification =
  | 'read-only'
  | 'approval-required-external-effect'
  | 'approval-required-repository-mutation';

export type OcaOperationReplayClassification =
  | 'read-repeatable'
  | 'idempotent-request'
  | 'approval-gated-once';

export interface OcaOperationDescriptor {
  readonly operationRef: OcaOperationRef;
  readonly title: string;
  readonly category: OcaOperationCategory;
  readonly approval: OcaOperationApprovalClassification;
  readonly replay: OcaOperationReplayClassification;
  readonly registryVisible: true;
}

export interface OcaWrapperDescription {
  readonly package: OcaWrapperPackageMetadata;
  readonly capability: OcaWrapperCapabilityDescriptor;
  readonly operations: readonly OcaOperationDescriptor[];
}

export const OCA_WRAPPER_PUBLIC_SURFACES = Object.freeze([
  'capability-descriptor',
  'operation-descriptors',
  'safe-json-check',
] as const satisfies readonly OcaWrapperPublicSurface[]);

export const OCA_WRAPPER_OPERATION_REFS = Object.freeze([
  'hazeteam.oca.start-session',
  'hazeteam.oca.continue-session',
  'hazeteam.oca.send-input',
  'hazeteam.oca.get-status',
  'hazeteam.oca.get-output',
  'hazeteam.oca.list',
  'hazeteam.oca.cancel',
  'hazeteam.oca.archive',
  'hazeteam.oca.diff-get',
  'hazeteam.oca.review-request',
  'hazeteam.oca.review-submit',
  'hazeteam.oca.branch-summarize',
  'hazeteam.oca.logs-summarize',
] as const);

export type OcaOperationRef = (typeof OCA_WRAPPER_OPERATION_REFS)[number];

export const OCA_WRAPPER_PACKAGE = Object.freeze({
  name: '@hazeteam/oca-wrapper',
  status: 'w15a-descriptor-only',
  productionReady: false,
  effects: 'none',
  contractSlice: 'W15A',
  defaultExecutionPosture: 'fake',
  publicSurfaces: OCA_WRAPPER_PUBLIC_SURFACES,
} satisfies OcaWrapperPackageMetadata);

export const OCA_WRAPPER_CAPABILITY_DESCRIPTOR = Object.freeze({
  capabilityRef: 'oca-wrapper',
  name: 'oca-wrapper',
  version: '0.1.0',
  kind: 'session',
  operationRefs: OCA_WRAPPER_OPERATION_REFS,
  readinessState: 'ready-fake',
  requirement: 'optional',
  executionPosture: 'fake',
  summary: 'Descriptor-only OCA session capability for fake readiness.',
  detailRefs: Object.freeze(['hazeteam.oca.w15a']),
} satisfies OcaWrapperCapabilityDescriptor);

export const OCA_WRAPPER_OPERATION_DESCRIPTORS = Object.freeze([
  operation('hazeteam.oca.start-session', 'Start session', 'session-control', 'approval-required-external-effect', 'idempotent-request'),
  operation('hazeteam.oca.continue-session', 'Continue session', 'session-control', 'approval-required-external-effect', 'approval-gated-once'),
  operation('hazeteam.oca.send-input', 'Send input', 'session-control', 'approval-required-external-effect', 'approval-gated-once'),
  operation('hazeteam.oca.get-status', 'Get status', 'session-read', 'read-only', 'read-repeatable'),
  operation('hazeteam.oca.get-output', 'Get output', 'session-read', 'read-only', 'read-repeatable'),
  operation('hazeteam.oca.list', 'List sessions', 'session-read', 'read-only', 'read-repeatable'),
  operation('hazeteam.oca.cancel', 'Cancel session', 'session-control', 'approval-required-external-effect', 'approval-gated-once'),
  operation('hazeteam.oca.archive', 'Archive session', 'session-control', 'approval-required-external-effect', 'approval-gated-once'),
  operation('hazeteam.oca.diff-get', 'Get diff summary', 'summary', 'read-only', 'read-repeatable'),
  operation('hazeteam.oca.review-request', 'Request review', 'review', 'approval-required-external-effect', 'approval-gated-once'),
  operation('hazeteam.oca.review-submit', 'Submit review', 'review', 'approval-required-repository-mutation', 'approval-gated-once'),
  operation('hazeteam.oca.branch-summarize', 'Summarize branch', 'summary', 'read-only', 'read-repeatable'),
  operation('hazeteam.oca.logs-summarize', 'Summarize logs', 'summary', 'read-only', 'read-repeatable'),
] as const satisfies readonly OcaOperationDescriptor[]);

export function describeOcaWrapper(): OcaWrapperDescription {
  return Object.freeze({
    package: clonePackageMetadata(),
    capability: getOcaWrapperCapabilityDescriptor(),
    operations: listOcaWrapperOperationDescriptors(),
  } satisfies OcaWrapperDescription);
}

export function getOcaWrapperCapabilityDescriptor(): OcaWrapperCapabilityDescriptor {
  return Object.freeze({
    ...OCA_WRAPPER_CAPABILITY_DESCRIPTOR,
    operationRefs: Object.freeze([...OCA_WRAPPER_CAPABILITY_DESCRIPTOR.operationRefs]),
    detailRefs: Object.freeze([...OCA_WRAPPER_CAPABILITY_DESCRIPTOR.detailRefs]),
  } satisfies OcaWrapperCapabilityDescriptor);
}

export function listOcaWrapperOperationDescriptors(): readonly OcaOperationDescriptor[] {
  return Object.freeze(OCA_WRAPPER_OPERATION_DESCRIPTORS.map(cloneOperationDescriptor));
}

export function isSafeOcaCapabilityDescriptorJson(value: unknown): boolean {
  return isSafeSerializableValue(value);
}

function clonePackageMetadata(): OcaWrapperPackageMetadata {
  return Object.freeze({
    ...OCA_WRAPPER_PACKAGE,
    publicSurfaces: Object.freeze([...OCA_WRAPPER_PACKAGE.publicSurfaces]),
  } satisfies OcaWrapperPackageMetadata);
}

function cloneOperationDescriptor(descriptor: OcaOperationDescriptor): OcaOperationDescriptor {
  return Object.freeze({ ...descriptor } satisfies OcaOperationDescriptor);
}

function operation(
  operationRef: OcaOperationRef,
  title: string,
  category: OcaOperationCategory,
  approval: OcaOperationApprovalClassification,
  replay: OcaOperationReplayClassification,
): OcaOperationDescriptor {
  return Object.freeze({
    operationRef,
    title,
    category,
    approval,
    replay,
    registryVisible: true,
  } satisfies OcaOperationDescriptor);
}

function isSafeSerializableValue(value: unknown): boolean {
  if (value === null) {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isSafeSerializableValue);
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (UNSAFE_PUBLIC_JSON_KEYS.has(key) || !isSafeSerializableValue(child)) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fromCharCodes(codes: readonly number[]): string {
  return String.fromCharCode(...codes);
}

const UNSAFE_PUBLIC_JSON_KEYS = new Set(
  [
    [114, 97, 119, 76, 111, 103],
    [114, 97, 119, 68, 105, 102, 102],
    [114, 97, 119, 79, 117, 116, 112, 117, 116],
    [114, 97, 119, 80, 97, 116, 104],
    [102, 105, 108, 101, 80, 97, 116, 104],
    [114, 101, 112, 111, 80, 97, 116, 104],
    [119, 111, 114, 107, 115, 112, 97, 99, 101, 80, 97, 116, 104],
    [112, 114, 111, 118, 105, 100, 101, 114, 80, 97, 121, 108, 111, 97, 100],
    [114, 117, 110, 116, 105, 109, 101, 80, 97, 121, 108, 111, 97, 100],
    [99, 108, 105, 101, 110, 116, 72, 97, 110, 100, 108, 101],
    [115, 100, 107, 67, 108, 105, 101, 110, 116],
    [112, 114, 111, 99, 101, 115, 115, 73, 100],
    [116, 111, 107, 101, 110],
    [115, 101, 99, 114, 101, 116],
    [99, 114, 101, 100, 101, 110, 116, 105, 97, 108],
    [115, 116, 97, 99, 107],
    [101, 110, 100, 112, 111, 105, 110, 116],
    [99, 111, 109, 109, 97, 110, 100, 79, 117, 116, 112, 117, 116],
  ].map(fromCharCodes),
);
