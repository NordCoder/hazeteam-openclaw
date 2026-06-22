import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AdapterRawDebugRef,
} from './refs.js';

export type OpenClawTelegramChannelId = string & {
  readonly __brand: 'OpenClawTelegramChannelId';
};

export type TelegramChatId = string & {
  readonly __brand: 'TelegramChatId';
};

export type TelegramMessageThreadId = string & {
  readonly __brand: 'TelegramMessageThreadId';
};

export type TelegramMessageId = string & {
  readonly __brand: 'TelegramMessageId';
};

export type OpenClawTelegramCallbackId = string & {
  readonly __brand: 'OpenClawTelegramCallbackId';
};

export interface OpenClawTelegramChannelRef {
  readonly channelId: OpenClawTelegramChannelId;
  readonly detailsRef?: AdapterDetailsRef;
}

export interface TelegramForumTopicRef {
  readonly channelId: OpenClawTelegramChannelId;
  readonly chatId: TelegramChatId;
  readonly messageThreadId: TelegramMessageThreadId;
  /** Display-only metadata. Canonical topic identity is channelId + chatId + messageThreadId. */
  readonly topicName?: string;
  readonly detailsRef?: AdapterDetailsRef;
}

export interface OpenClawTelegramExternalMessageRef {
  readonly channelId: OpenClawTelegramChannelId;
  readonly chatId: TelegramChatId;
  readonly messageId: TelegramMessageId;
  readonly messageThreadId?: TelegramMessageThreadId;
  readonly detailsRef?: AdapterDetailsRef;
}

export interface OpenClawTelegramActorRef {
  readonly actorRef: ActorRef;
  readonly displayName?: string;
  readonly username?: string;
  readonly detailsRef?: AdapterDetailsRef;
}

export type OpenClawTelegramAttachmentKind =
  | 'photo'
  | 'video'
  | 'audio'
  | 'voice'
  | 'document'
  | 'sticker'
  | 'animation'
  | 'contact'
  | 'location'
  | 'poll'
  | 'unknown';

export interface OpenClawTelegramAttachmentRef {
  readonly kind: OpenClawTelegramAttachmentKind;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly detailsRef?: AdapterDetailsRef;
}

export interface OpenClawTelegramBaseChannelEvent {
  readonly eventKind: 'message' | 'callback' | 'system';
  readonly operationRef: AdapterOperationRef;
  readonly correlationRef: AdapterCorrelationRef;
  readonly channelRef: OpenClawTelegramChannelRef;
  readonly topicRef?: TelegramForumTopicRef;
  readonly actor?: OpenClawTelegramActorRef;
  readonly occurredAt?: string;
  readonly receivedAt?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly rawDebugRef?: AdapterRawDebugRef;
}

export interface OpenClawTelegramMessageEvent extends OpenClawTelegramBaseChannelEvent {
  readonly eventKind: 'message';
  readonly externalMessageRef: OpenClawTelegramExternalMessageRef;
  readonly text?: string;
  readonly attachments?: readonly OpenClawTelegramAttachmentRef[];
}

export interface OpenClawTelegramCallbackEvent extends OpenClawTelegramBaseChannelEvent {
  readonly eventKind: 'callback';
  readonly callbackId: OpenClawTelegramCallbackId;
  readonly externalMessageRef?: OpenClawTelegramExternalMessageRef;
  readonly callbackPayload: string;
}

export type OpenClawTelegramSystemEventKind =
  | 'topic-created'
  | 'topic-renamed'
  | 'topic-closed'
  | 'topic-reopened'
  | 'member-joined'
  | 'member-left'
  | 'unknown';

export interface OpenClawTelegramSystemEvent extends OpenClawTelegramBaseChannelEvent {
  readonly eventKind: 'system';
  readonly systemEventKind: OpenClawTelegramSystemEventKind;
  readonly externalMessageRef?: OpenClawTelegramExternalMessageRef;
}

export type OpenClawTelegramChannelEvent =
  | OpenClawTelegramMessageEvent
  | OpenClawTelegramCallbackEvent
  | OpenClawTelegramSystemEvent;

function hasEventKind(candidate: unknown, eventKind: OpenClawTelegramChannelEvent['eventKind']): boolean {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }

  return (candidate as { readonly eventKind?: unknown }).eventKind === eventKind;
}

export function isOpenClawTelegramMessageEvent(
  candidate: unknown,
): candidate is OpenClawTelegramMessageEvent {
  return hasEventKind(candidate, 'message');
}

export function isOpenClawTelegramCallbackEvent(
  candidate: unknown,
): candidate is OpenClawTelegramCallbackEvent {
  return hasEventKind(candidate, 'callback');
}

export function isOpenClawTelegramSystemEvent(
  candidate: unknown,
): candidate is OpenClawTelegramSystemEvent {
  return hasEventKind(candidate, 'system');
}
