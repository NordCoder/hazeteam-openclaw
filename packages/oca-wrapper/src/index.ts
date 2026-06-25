export {
  OCA_WRAPPER_CAPABILITY_DESCRIPTOR,
  OCA_WRAPPER_OPERATION_DESCRIPTORS,
  OCA_WRAPPER_OPERATION_REFS,
  OCA_WRAPPER_PACKAGE,
  OCA_WRAPPER_PUBLIC_SURFACES,
  describeOcaWrapper,
  getOcaWrapperCapabilityDescriptor,
  isSafeOcaCapabilityDescriptorJson,
  listOcaWrapperOperationDescriptors,
} from './capability-descriptor.js';

export type {
  OcaOperationApprovalClassification,
  OcaOperationCategory,
  OcaOperationDescriptor,
  OcaOperationRef,
  OcaOperationReplayClassification,
  OcaWrapperCapabilityDescriptor,
  OcaWrapperDescription,
  OcaWrapperEffect,
  OcaWrapperExecutionPosture,
  OcaWrapperPackageMetadata,
  OcaWrapperPackageStatus,
  OcaWrapperPublicSurface,
  OcaWrapperReadinessState,
} from './capability-descriptor.js';
