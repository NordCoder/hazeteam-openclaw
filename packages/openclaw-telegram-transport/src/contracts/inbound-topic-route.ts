export const W17C_INBOUND_DESCRIPTOR_VERSION = 'w17c' as const;

export const TELEGRAM_INBOUND_PROVIDERS = Object.freeze(['telegram', 'openclaw'] as const);
export type TelegramInboundProviderKind = (typeof TELEGRAM_INBOUND_PROVIDERS)[number];

export const TELEGRAM_INBOUND_EVENT_KINDS = Object.freeze(['message', 'callback', 'system'] as const);
export type TelegramInboundEventKind = (typeof TELEGRAM_INBOUND_EVENT_KINDS)[number];

export type TelegramInboundIssueSeverity = 'info' | 'warning' | 'blocked';

export const TELEGRAM_INBOUND_REASON_CODES = Object.freeze([
  'projected',
  'routed',
  'callback-forwarded',
  'already-processed',
  'missing-command',
  'malformed-command',
  'unknown-command',
  'unbound-topic',
  'disabled-binding',
  'unsupported-event-kind',
  'unsafe-input-rejected',
  'invalid-provider-input',
  'topic-title-display-only',
  'unsafe-field-redacted',
  'unsafe-text-redacted',
  'unsafe-callback-redacted',
  'safe-help',
] as const);

export type TelegramInboundReasonCode = (typeof TELEGRAM_INBOUND_REASON_CODES)[number];
export type TelegramInboundProjectionStatus = 'projected' | 'rejected' | 'unsupported';
export type TelegramInboundTopicRouteStatus = 'routed' | 'callback-forwarded' | 'safe-help' | 'ignored' | 'rejected' | 'already-processed';
export type TelegramInboundTopicRouteDecisionKind =
  | 'prepare-command-intent'
  | 'forward-callback-path'
  | 'render-safe-help'
  | 'ignore-safely'
  | 'reject-safely'
  | 'deduplicate-safely';

export interface TelegramInboundIssue {
  readonly code: TelegramInboundReasonCode;
  readonly severity: TelegramInboundIssueSeverity;
  readonly componentRef: string;
  readonly summary: string;
}

export interface TelegramInboundRoutingAuthority {
  readonly descriptorKind: 'w17c-telegram-routing-authority';
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef: string;
  readonly authority: 'channelRef+chatRef+threadRef';
}

export interface TelegramInboundTopicDisplay {
  readonly descriptorKind: 'w17c-telegram-topic-display';
  readonly title: string;
  readonly titleRoutingAuthority: false;
  readonly routingKeyAuthority: 'channelRef+chatRef+threadRef';
}

export interface TelegramInboundTextIntent {
  readonly descriptorKind: 'w17c-telegram-text-intent';
  readonly text: string;
  readonly commandName?: string;
  readonly argumentText?: string;
  readonly malformedCommand: boolean;
  readonly routingAuthority: false;
}

export interface TelegramInboundCallbackIntent {
  readonly descriptorKind: 'w17c-telegram-callback-intent';
  readonly callbackRef: string;
  readonly callbackTokenRef: string;
  readonly permissionChecked: false;
  readonly tokenConsumed: false;
  readonly routingAuthority: false;
}

export interface SafeTelegramInboundChannelEvent {
  readonly descriptorKind: 'w17c-safe-telegram-channel-event';
  readonly descriptorVersion: typeof W17C_INBOUND_DESCRIPTOR_VERSION;
  readonly providerKind: TelegramInboundProviderKind;
  readonly eventKind: TelegramInboundEventKind;
  readonly eventRef: string;
  readonly idempotencyRef: string;
  readonly correlationRef: string;
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef: string;
  readonly messageRef: string;
  readonly actorRef?: string;
  readonly receivedAtRef: string;
  readonly occurredAtRef?: string;
  readonly textIntent?: TelegramInboundTextIntent;
  readonly callbackIntent?: TelegramInboundCallbackIntent;
  readonly topicDisplay?: TelegramInboundTopicDisplay;
  readonly unsupportedFieldCount: number;
  readonly redactedFieldCount: number;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export interface TelegramInboundChannelEventProjectionResult {
  readonly descriptorKind: 'w17c-telegram-channel-event-projection-result';
  readonly descriptorVersion: typeof W17C_INBOUND_DESCRIPTOR_VERSION;
  readonly ok: boolean;
  readonly status: TelegramInboundProjectionStatus;
  readonly reasonCode: TelegramInboundReasonCode;
  readonly event?: SafeTelegramInboundChannelEvent;
  readonly issues: readonly TelegramInboundIssue[];
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly productionReady: false;
  readonly jsonSerializable: true;
}

export type TelegramInboundTopicBindingStatus = 'active' | 'disabled' | 'archived' | 'migrating' | 'conflict';
export type TelegramInboundCommandNamespace = 'telegram' | 'workspace' | 'agent' | 'core' | 'admin';

export interface TelegramInboundTopicBindingKey {
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef: string;
}

export interface TelegramInboundTopicBindingTarget {
  readonly workspaceRef: string;
  readonly agentRef: string;
  readonly hostSessionRef: string;
  readonly uiDescriptorRef?: string;
  readonly domainPackageRef?: string;
}

export interface TelegramInboundTopicBindingDisplay {
  readonly displayTitle?: string;
  readonly routingAuthority: false;
}

export interface TelegramInboundTopicBindingDescriptor {
  readonly descriptorKind: 'w17c-telegram-topic-binding';
  readonly bindingRef: string;
  readonly key: TelegramInboundTopicBindingKey;
  readonly target: TelegramInboundTopicBindingTarget;
  readonly status: TelegramInboundTopicBindingStatus;
  readonly display?: TelegramInboundTopicBindingDisplay;
}

export interface TelegramInboundCommandDescriptor {
  readonly descriptorKind: 'w17c-telegram-command-descriptor';
  readonly commandRef: string;
  readonly commandName: string;
  readonly namespace: TelegramInboundCommandNamespace;
  readonly intentKind: string;
  readonly requiresBinding: boolean;
  readonly enabled: boolean;
}

export interface TelegramInboundSafeCommandSummary {
  readonly descriptorKind: 'w17c-telegram-safe-command-summary';
  readonly commandRef: string;
  readonly commandName: string;
  readonly argumentText?: string;
}

export interface TelegramInboundCommandIntentDescriptor {
  readonly descriptorKind: 'w17c-telegram-command-intent';
  readonly intentRef: string;
  readonly commandRef: string;
  readonly commandName: string;
  readonly namespace: TelegramInboundCommandNamespace;
  readonly intentKind: string;
  readonly bindingRef: string;
  readonly routingAuthority: TelegramInboundRoutingAuthority;
  readonly target: TelegramInboundTopicBindingTarget;
  readonly argumentText?: string;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly commandExecuted: false;
}

export interface TelegramInboundCallbackPathDescriptor {
  readonly descriptorKind: 'w17c-telegram-callback-path';
  readonly callbackRef: string;
  readonly callbackTokenRef: string;
  readonly routingAuthority: TelegramInboundRoutingAuthority;
  readonly permissionChecked: false;
  readonly tokenConsumed: false;
  readonly effects: 'none';
  readonly willCallRemote: false;
}

export interface TelegramInboundSafeHelpDescriptor {
  readonly descriptorKind: 'w17c-telegram-safe-help';
  readonly helpKind: 'missing-command' | 'malformed-command' | 'unknown-command' | 'unbound-topic' | 'disabled-binding' | 'unsupported-event-kind' | 'command-help';
  readonly safeMessage: string;
  readonly availableCommands: readonly string[];
  readonly routingAuthority?: TelegramInboundRoutingAuthority;
}

export interface TelegramInboundTopicRouteResult {
  readonly descriptorKind: 'w17c-telegram-inbound-topic-route-result';
  readonly descriptorVersion: typeof W17C_INBOUND_DESCRIPTOR_VERSION;
  readonly ok: boolean;
  readonly status: TelegramInboundTopicRouteStatus;
  readonly reasonCode: TelegramInboundReasonCode;
  readonly decisionKind: TelegramInboundTopicRouteDecisionKind;
  readonly channelEvent?: SafeTelegramInboundChannelEvent;
  readonly routingAuthority?: TelegramInboundRoutingAuthority;
  readonly command?: TelegramInboundSafeCommandSummary;
  readonly callbackPath?: TelegramInboundCallbackPathDescriptor;
  readonly intent?: TelegramInboundCommandIntentDescriptor;
  readonly help?: TelegramInboundSafeHelpDescriptor;
  readonly issues: readonly TelegramInboundIssue[];
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly commandExecuted: false;
  readonly readinessClaim: 'local-inbound-topic-route-evidence-only';
  readonly productionReady: false;
  readonly jsonSerializable: true;
}
