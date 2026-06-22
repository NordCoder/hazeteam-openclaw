import type { ActorRef, AdapterIsoTimestamp, AdapterPublicId } from "./refs.js";

/**
 * Public-safe reference to the OpenClaw-owned Telegram channel integration.
 *
 * This reference intentionally carries only stable identifiers and display-safe
 * deployment metadata. Secrets and platform runtime objects remain owned by
 * OpenClaw and must not be represented in this adapter contract.
 */
export interface OpenClawTelegramChannelRef {
  readonly id: AdapterPublicId;
  readonly kind: "telegram";
  readonly botRef?: string;
  readonly deploymentRef?: string;
}

/**
 * Telegram forum topic coordinates as normalized by the OpenClaw channel edge.
 *
 * messageThreadId is optional at the raw channel-event edge because some
 * OpenClaw/Telegram events can occur outside a forum topic. Later mapper
 * phases must either reject missing topic context safely or route it through an
 * explicit configured fallback.
 */
export interface TelegramForumTopicRef {
  readonly chatId: AdapterPublicId;
  readonly messageThreadId?: AdapterPublicId;
  readonly topicName?: string;
  readonly isGeneralTopic?: boolean;
}

/**
 * Attachment metadata/reference only. File contents, file-system paths, and
 * platform SDK file objects must stay outside this public adapter contract.
 */
export interface OpenClawTelegramAttachmentRef {
  readonly attachmentRef: AdapterPublicId;
  readonly kind?: string;
  readonly mimeType?: string;
  readonly fileName?: string;
  readonly sizeBytes?: number;
}

export type OpenClawTelegramActorRef = ActorRef;

export interface OpenClawTelegramMessageEvent {
  readonly eventRef: AdapterPublicId;
  readonly eventType: "telegram.message";
  readonly channelRef: OpenClawTelegramChannelRef;
  readonly telegram: {
    readonly chatId: AdapterPublicId;
    readonly messageThreadId?: AdapterPublicId;
    readonly messageId: AdapterPublicId;
    readonly topicName?: string;
  };
  readonly actor: OpenClawTelegramActorRef;
  readonly text?: string;
  readonly attachments?: readonly OpenClawTelegramAttachmentRef[];
  readonly occurredAt: AdapterIsoTimestamp;
  readonly correlationId?: AdapterPublicId;
  readonly rawDebugRef?: AdapterPublicId;
}

export interface OpenClawTelegramCallbackEvent {
  readonly eventRef: AdapterPublicId;
  readonly eventType: "telegram.callback";
  readonly channelRef: OpenClawTelegramChannelRef;
  readonly telegram: {
    readonly chatId: AdapterPublicId;
    readonly messageThreadId?: AdapterPublicId;
    readonly messageId?: AdapterPublicId;
    readonly callbackQueryId: AdapterPublicId;
  };
  readonly actor: OpenClawTelegramActorRef;
  readonly callbackData: string;
  readonly occurredAt: AdapterIsoTimestamp;
  readonly correlationId?: AdapterPublicId;
  readonly rawDebugRef?: AdapterPublicId;
}

export type OpenClawTelegramSystemEventType =
  | "telegram.topic.created"
  | "telegram.topic.renamed"
  | "telegram.topic.closed"
  | "telegram.chat.permissions_changed";

export interface OpenClawTelegramSystemEvent {
  readonly eventRef: AdapterPublicId;
  readonly eventType: OpenClawTelegramSystemEventType;
  readonly channelRef: OpenClawTelegramChannelRef;
  readonly telegram: {
    readonly chatId: AdapterPublicId;
    readonly messageThreadId?: AdapterPublicId;
    readonly topicName?: string;
  };
  readonly actor?: OpenClawTelegramActorRef;
  readonly occurredAt: AdapterIsoTimestamp;
  readonly correlationId?: AdapterPublicId;
}

export type OpenClawTelegramChannelEvent =
  | OpenClawTelegramMessageEvent
  | OpenClawTelegramCallbackEvent
  | OpenClawTelegramSystemEvent;
