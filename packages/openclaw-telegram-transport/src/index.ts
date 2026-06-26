export type OpenClawTelegramTransportPackageStatus = 'w19-integration-harness-public-export';

export type OpenClawTelegramTransportEffect = 'none';

export type OpenClawTelegramTransportPublicSurface =
  | 'config'
  | 'secrets'
  | 'channel-event-source'
  | 'delivery-port'
  | 'callback-handler-port'
  | 'topic-command-router'
  | 'real-smoke-gate'
  | 'integration-harness';

export interface OpenClawTelegramTransportPackageMetadata {
  readonly name: '@hazeteam/openclaw-telegram-transport';
  readonly status: OpenClawTelegramTransportPackageStatus;
  readonly productionReady: false;
  readonly contractSlice: 'W19D';
  readonly publicSurfaces: readonly OpenClawTelegramTransportPublicSurface[];
}

export interface OpenClawTelegramTransportDescriptor {
  readonly kind: 'openclaw-telegram-transport';
  readonly packageName: '@hazeteam/openclaw-telegram-transport';
  readonly packageStatus: OpenClawTelegramTransportPackageStatus;
  readonly descriptorVersion: 'w19d';
  readonly readiness: 'adapter-ready-for-real-system-integration-under-explicit-gates';
  readonly productionReady: false;
  readonly effects: OpenClawTelegramTransportEffect;
  readonly scope: 'w19-integration-harness-public-export';
  readonly publicSurfaces: readonly OpenClawTelegramTransportPublicSurface[];
  readonly realTransportPorts: 'injected-boundaries-present';
  readonly defaultNetworkBehavior: 'none';
  readonly realSmokeDefault: 'skipped-or-blocked';
  readonly runtimeClientConstructedByDefault: false;
  readonly listenerWebhookPollingRuntime: false;
}

export interface OpenClawTelegramTransportDescription {
  readonly package: OpenClawTelegramTransportPackageMetadata;
  readonly descriptor: OpenClawTelegramTransportDescriptor;
}

export const OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES = Object.freeze([
  'config',
  'secrets',
  'channel-event-source',
  'delivery-port',
  'callback-handler-port',
  'topic-command-router',
  'real-smoke-gate',
  'integration-harness',
] as const satisfies readonly OpenClawTelegramTransportPublicSurface[]);

export const OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE = Object.freeze({
  name: '@hazeteam/openclaw-telegram-transport',
  status: 'w19-integration-harness-public-export',
  productionReady: false,
  contractSlice: 'W19D',
  publicSurfaces: OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES,
} satisfies OpenClawTelegramTransportPackageMetadata);

export const OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR = Object.freeze({
  kind: 'openclaw-telegram-transport',
  packageName: OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE.name,
  packageStatus: OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE.status,
  descriptorVersion: 'w19d',
  readiness: 'adapter-ready-for-real-system-integration-under-explicit-gates',
  productionReady: false,
  effects: 'none',
  scope: 'w19-integration-harness-public-export',
  publicSurfaces: OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES,
  realTransportPorts: 'injected-boundaries-present',
  defaultNetworkBehavior: 'none',
  realSmokeDefault: 'skipped-or-blocked',
  runtimeClientConstructedByDefault: false,
  listenerWebhookPollingRuntime: false,
} satisfies OpenClawTelegramTransportDescriptor);

export function describeOpenClawTelegramTransport(): OpenClawTelegramTransportDescription {
  return Object.freeze({
    package: OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE,
    descriptor: OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR,
  } satisfies OpenClawTelegramTransportDescription);
}

export {
  OPENCLAW_TELEGRAM_TRANSPORT_PROFILES,
  TRANSPORT_CONFIG_READINESS_STATUSES,
  TRANSPORT_PROVIDER_CLASSIFICATIONS,
  TRANSPORT_PROVIDER_MODES,
  isSafeTransportConfigJson,
  parseTransportConfig,
  projectTransportConfigReadiness,
} from './config.js';

export {
  TRANSPORT_\u0053ECRET_DESCRIPTOR_STATUSES,
  TRANSPORT_\u0053ECRET_HANDLE_BRAND,
  TRANSPORT_\u0053ECRET_KINDS,
  TRANSPORT_\u0053ECRET_PROVIDERS,
  TRANSPORT_\u0053ECRET_SOURCE_CLASSES,
  createOpaqueTransport\u0053ecretHandle,
  createTransport\u0053ecretDescriptor,
  describeTransport\u0053ecretHandle,
  isSafeTransport\u0053ecretRef,
  sanitizeTransport\u0053ecretRef,
} from './secrets.js';

export {
  CHANNEL_EVENT_KINDS,
  CHANNEL_EVENT_SOURCE_PROVIDERS,
  CHANNEL_EVENT_SOURCE_REASON_CODES,
  CHANNEL_EVENT_SOURCE_STATUSES,
  CHANNEL_SYSTEM_EVENT_KINDS,
  isSafeChannelEventSourceJson,
  normalizeChannelEventSourceInput,
} from './channel-event-source.js';

export type {
  ChannelEventCommandProjection,
  ChannelEventKind,
  ChannelEventProviderAckDecision,
  ChannelEventProviderInputRecord,
  ChannelEventSourceIssue,
  ChannelEventSourceIssueSeverity,
  ChannelEventSourceNormalizeInput,
  ChannelEventSourceNormalizeResult,
  ChannelEventSourceProvider,
  ChannelEventSourceReasonCode,
  ChannelEventSourceStatus,
  ChannelEventSourceTransportProjection,
  ChannelEventTopicDisplayProjection,
  ChannelSystemEventKind,
  SafeChannelEventDto,
} from './channel-event-source.js';

export {
  DELIVERY_CONTENT_FORMATS,
  DELIVERY_FAILURE_REASON_CODES,
  DELIVERY_PROVIDER_KINDS,
  createInjectedDeliveryPort,
  deliverRenderedRequest,
  isSafeDeliveryResultJson,
} from './delivery-port.js';

export type {
  DeliveryActionButton,
  DeliveryActionButtonGroup,
  DeliveryBusinessStatus,
  DeliveryContentFormat,
  DeliveryDiagnosticCode,
  DeliveryExternalMessageRef,
  DeliveryFailureReasonCode,
  DeliveryPortFailure,
  DeliveryPortResult,
  DeliveryPortSuccess,
  DeliveryProviderAcknowledged,
  DeliveryProviderAcknowledgement,
  DeliveryProviderKind,
  DeliveryProviderRejected,
  DeliveryReadinessGate,
  DeliveryReadinessProviderGate,
  DeliverySafeError,
  DeliveryStatus,
  InjectedDeliveryPort,
  RenderedDeliveryContent,
  RenderedDeliveryRequest,
  RenderedDeliveryTarget,
} from './delivery-port.js';

export {
  CALLBACK_PAYLOAD_KINDS,
  CALLBACK_PROVIDER_KINDS,
  isSafeCallbackPortJson,
  normalizeCallbackProviderInput,
  processCallbackBoundary,
} from './callback-handler-port.js';

export type {
  CallbackBoundaryPorts,
  CallbackBoundaryResult,
  CallbackBoundaryValue,
  CallbackDecision,
  CallbackDecisionStatus,
  CallbackExpectedTokenContext,
  CallbackExpectedTokenContextInput,
  CallbackInputIssue,
  CallbackInputIssueCode,
  CallbackInputIssueSeverity,
  CallbackPayloadKind,
  CallbackPayloadStatus,
  CallbackPermissionCheckInput,
  CallbackPermissionPhase,
  CallbackPermissionPort,
  CallbackPermissionReasonCode,
  CallbackPermissionResult,
  CallbackPermissionStatus,
  CallbackProviderInput,
  CallbackProviderKind,
  CallbackReplayStatus,
  CallbackTokenConsumeInput,
  CallbackTokenConsumePort,
  CallbackTokenConsumeResult,
  CallbackTokenConsumeStatus,
  CallbackTokenVerifyInput,
  CallbackTokenVerifyResult,
  CallbackTokenVerifyStatus,
  ProviderCallbackAcknowledgementDescriptor,
  ProviderCallbackAcknowledgementStatus,
  ProviderCallbackAcknowledgementText,
  SafeCallbackDescriptor,
  SafeCallbackError,
} from './callback-handler-port.js';

export {
  TOPIC_COMMAND_ROUTER_DEFAULT_COMMANDS,
  TOPIC_COMMAND_ROUTER_REASON_CODES,
  isSafeTopicCommandRouterJson,
  routeTopicCommand,
} from './topic-command-router-port.js';

export type {
  TopicCommandBindingDescriptor,
  TopicCommandBindingDisplay,
  TopicCommandBindingKey,
  TopicCommandBindingStatus,
  TopicCommandBindingTarget,
  TopicCommandDescriptor,
  TopicCommandIntentDescriptor,
  TopicCommandNamespace,
  TopicCommandProjectionInput,
  TopicCommandRouterDecisionKind,
  TopicCommandRouterInput,
  TopicCommandRouterIssue,
  TopicCommandRouterReasonCode,
  TopicCommandRouterResult,
  TopicCommandRouterStatus,
  TopicCommandRoutingAuthority,
  TopicCommandSafeCommandSummary,
  TopicCommandSafeEventInput,
  TopicCommandSafeHelpDescriptor,
} from './topic-command-router-port.js';

export {
  REAL_SMOKE_BUSINESS_RESULTS,
  REAL_SMOKE_CLEANUP_POLICIES,
  REAL_SMOKE_GATE_STATUSES,
  REAL_SMOKE_OPERATION_CLASSES,
  REAL_SMOKE_PORT_STATUSES,
  REAL_SMOKE_PROVIDER_ACK_RESULTS,
  REAL_SMOKE_PROVIDER_KINDS,
  createRealSmokeGateInputFromEnvironment,
  evaluateRealSmokeGate,
  isSafeRealSmokeGateReportJson,
} from './real-smoke-gate.js';

export type {
  RealSmokeAttemptInput,
  RealSmokeBlockedReason,
  RealSmokeBusinessResult,
  RealSmokeCleanupPolicy,
  RealSmokeConfiguredDependency,
  RealSmokeGateEnvironmentInput,
  RealSmokeGateInput,
  RealSmokeGateReport,
  RealSmokeGateStatus,
  RealSmokeOperationClass,
  RealSmokePortStatus,
  RealSmokeProviderAckResult,
  RealSmokeProviderKind,
} from './real-smoke-gate.js';

export {
  REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_KIND,
  REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION,
  REAL_INTEGRATION_ATTEMPT_READINESS_STATUSES,
  REAL_INTEGRATION_BUSINESS_RESULTS,
  REAL_INTEGRATION_NETWORK_GATE_STATUSES,
  REAL_INTEGRATION_NORMALIZED_ATTEMPT_STATUSES,
  REAL_INTEGRATION_OPERATION_CLASSES,
  REAL_INTEGRATION_OPERATION_KINDS,
  REAL_INTEGRATION_OPERATOR_ACKNOWLEDGEMENT_STATUSES,
  REAL_INTEGRATION_PROVIDER_ACK_STATUSES,
  REAL_INTEGRATION_PROVIDER_KINDS,
  REAL_INTEGRATION_PROVIDER_PORT_STATUSES,
  REAL_INTEGRATION_RUNTIME_CREDENTIAL_STATUSES,
  createRealIntegrationAttemptPlanDescriptor,
  isSafeRealIntegrationAttemptJson,
  normalizeSuppliedRealIntegrationAttemptResult,
} from './integration-harness/index.js';

export type {
  RealIntegrationAttemptEffect,
  RealIntegrationAttemptNormalizedResult,
  RealIntegrationAttemptPlanDescriptor,
  RealIntegrationAttemptPlanInput,
  RealIntegrationAttemptReadinessStatus,
  RealIntegrationBusinessResult,
  RealIntegrationEvidenceStatus,
  RealIntegrationNetworkGateStatus,
  RealIntegrationNoLeakResult,
  RealIntegrationNormalizedAttemptStatus,
  RealIntegrationOperationClass,
  RealIntegrationOperationKind,
  RealIntegrationOperatorAcknowledgementStatus,
  RealIntegrationProviderAckStatus,
  RealIntegrationProviderKind,
  RealIntegrationProviderPortStatus,
  RealIntegrationRedactedFailure,
  RealIntegrationRuntimeCredentialStatus,
  SuppliedRealIntegrationAttemptResultInput,
} from './integration-harness/index.js';
