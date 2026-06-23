import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AdapterRawDebugRef,
  OpenClawTelegramActorRef,
  OpenClawTelegramBaseChannelEvent,
  OpenClawTelegramCallbackEvent,
  OpenClawTelegramCallbackId,
  OpenClawTelegramChannelId,
  OpenClawTelegramChannelRef,
  OpenClawTelegramExternalMessageRef,
  OpenClawTelegramMessageEvent,
  OpenClawTelegramMessageId,
  OpenClawTelegramSystemEvent,
  TelegramChatId,
  TelegramForumTopicRef,
  TelegramMessageThreadId,
} from '@hazeteam/openclaw-adapter';

const DEFAULT_CHANNEL_ID_VALUE = 'stable-fake-channel';
const DEFAULT_CHAT_ID_VALUE = 'stable-fake-chat';
const DEFAULT_MESSAGE_THREAD_ID_VALUE = 'stable-fake-thread';
const DEFAULT_MESSAGE_ID_VALUE = 'stable-fake-message';
const DEFAULT_CALLBACK_ID_VALUE = 'stable-fake-callback';
const DEFAULT_TOPIC_NAME = 'Test topic';
const DEFAULT_MESSAGE_TEXT = 'test message';
const DEFAULT_CALLBACK_PAYLOAD = 'opaque-test-callback-payload';
const DEFAULT_OCCURRED_AT = '2026-01-01T00:00:00.000Z';
const DEFAULT_RECEIVED_AT = '2026-01-01T00:00:01.000Z';
const DEFAULT_ACTOR_REF = 'actor:test-user' as ActorRef;
const DEFAULT_OPERATION_REF = 'operation:test-operation' as AdapterOperationRef;
const DEFAULT_CORRELATION_REF = 'correlation:test-correlation' as AdapterCorrelationRef;

export type TestTelegramChannelRefOverrides = Readonly<Partial<OpenClawTelegramChannelRef>>;
export type TestTelegramForumTopicRefOverrides = Readonly<Partial<TelegramForumTopicRef>>;
export type TestTelegramExternalMessageRefOverrides = Readonly<Partial<OpenClawTelegramExternalMessageRef>>;
export type TestTelegramActorRefOverrides = Readonly<Partial<OpenClawTelegramActorRef>>;
export type TestTelegramBaseEventOverrides = Readonly<
  Omit<Partial<OpenClawTelegramBaseChannelEvent>, 'eventKind'>
>;
export type TestTelegramMessageEventOverrides = Readonly<
  Omit<Partial<OpenClawTelegramMessageEvent>, 'eventKind'>
>;
export type TestTelegramCallbackEventOverrides = Readonly<
  Omit<Partial<OpenClawTelegramCallbackEvent>, 'eventKind'>
>;
export type TestTelegramSystemEventOverrides = Readonly<
  Omit<Partial<OpenClawTelegramSystemEvent>, 'eventKind'>
>;

export function createTestTelegramChannelId(value = DEFAULT_CHANNEL_ID_VALUE): OpenClawTelegramChannelId {
  return value as OpenClawTelegramChannelId;
}

export function createTestTelegramChatId(value = DEFAULT_CHAT_ID_VALUE): TelegramChatId {
  return value as TelegramChatId;
}

export function createTestTelegramMessageThreadId(
  value = DEFAULT_MESSAGE_THREAD_ID_VALUE,
): TelegramMessageThreadId {
  return value as TelegramMessageThreadId;
}

export function createTestTelegramMessageId(value = DEFAULT_MESSAGE_ID_VALUE): TelegramMessageId {
  return value as TelegramMessageId;
}

export function createTestTelegramCallbackId(value = DEFAULT_CALLBACK_ID_VALUE): OpenClawTelegramCallbackId {
  return value as OpenClawTelegramCallbackId;
}

export function createTestTelegramChannelRef(
  overrides: TestTelegramChannelRefOverrides = {},
): OpenClawTelegramChannelRef {
  return {
    channelId: overrides.channelId ?? createTestTelegramChannelId(),
    ...(overrides.detailsRef !== undefined ? { detailsRef: overrides.detailsRef } : {}),
  };
}

export function createTestTelegramForumTopicRef(
  overrides: TestTelegramForumTopicRefOverrides = {},
): TelegramForumTopicRef {
  return {
    channelId: overrides.channelId ?? createTestTelegramChannelId(),
    chatId: overrides.chatId ?? createTestTelegramChatId(),
    messageThreadId: overrides.messageThreadId ?? createTestTelegramMessageThreadId(),
    topicName: overrides.topicName ?? DEFAULT_TOPIC_NAME,
    ...(overrides.detailsRef !== undefined ? { detailsRef: overrides.detailsRef } : {}),
  };
}

export function createTestTelegramExternalMessageRef(
  overrides: TestTelegramExternalMessageRefOverrides = {},
): OpenClawTelegramExternalMessageRef {
  return {
    channelId: overrides.channelId ?? createTestTelegramChannelId(),
    chatId: overrides.chatId ?? createTestTelegramChatId(),
    messageId: overrides.messageId ?? createTestTelegramMessageId(),
    messageThreadId: overrides.messageThreadId ?? createTestTelegramMessageThreadId(),
    ...(overrides.detailsRef !== undefined ? { detailsRef: overrides.detailsRef } : {}),
  };
}

export function createTestTelegramActorRef(
  overrides: TestTelegramActorRefOverrides = {},
): OpenClawTelegramActorRef {
  return {
    actorRef: overrides.actorRef ?? DEFAULT_ACTOR_REF,
    ...(overrides.displayName !== undefined ? { displayName: overrides.displayName } : {}),
    ...(overrides.username !== undefined ? { username: overrides.username } : {}),
    ...(overrides.detailsRef !== undefined ? { detailsRef: overrides.detailsRef } : {}),
  };
}

function createTestTelegramBaseEventFields(
  overrides: TestTelegramBaseEventOverrides,
): Omit<OpenClawTelegramBaseChannelEvent, 'eventKind'> {
  return {
    operationRef: overrides.operationRef ?? DEFAULT_OPERATION_REF,
    correlationRef: overrides.correlationRef ?? DEFAULT_CORRELATION_REF,
    channelRef: overrides.channelRef ?? createTestTelegramChannelRef(),
    topicRef: overrides.topicRef ?? createTestTelegramForumTopicRef(),
    actor: overrides.actor ?? createTestTelegramActorRef(),
    occurredAt: overrides.occurredAt ?? DEFAULT_OCCURRED_AT,
    receivedAt: overrides.receivedAt ?? DEFAULT_RECEIVED_AT,
    ...(overrides.detailsRef !== undefined
      ? { detailsRef: overrides.detailsRef as AdapterDetailsRef }
      : {}),
    ...(overrides.rawDebugRef !== undefined
      ? { rawDebugRef: overrides.rawDebugRef as AdapterRawDebugRef }
      : {}),
  };
}

export function createTestTelegramMessageEvent(
  overrides: TestTelegramMessageEventOverrides = {},
): OpenClawTelegramMessageEvent {
  return {
    ...createTestTelegramBaseEventFields(overrides),
    eventKind: 'message',
    externalMessageRef: overrides.externalMessageRef ?? createTestTelegramExternalMessageRef(),
    text: overrides.text ?? DEFAULT_MESSAGE_TEXT,
    ...(overrides.attachments !== undefined ? { attachments: overrides.attachments } : {}),
  };
}

export function createTestTelegramCallbackEvent(
  overrides: TestTelegramCallbackEventOverrides = {},
): OpenClawTelegramCallbackEvent {
  return {
    ...createTestTelegramBaseEventFields(overrides),
    eventKind: 'callback',
    callbackId: overrides.callbackId ?? createTestTelegramCallbackId(),
    externalMessageRef: overrides.externalMessageRef ?? createTestTelegramExternalMessageRef(),
    callbackPayload: overrides.callbackPayload ?? DEFAULT_CALLBACK_PAYLOAD,
  };
}

export function createTestTelegramSystemEvent(
  overrides: TestTelegramSystemEventOverrides = {},
): OpenClawTelegramSystemEvent {
  return {
    ...createTestTelegramBaseEventFields(overrides),
    eventKind: 'system',
    systemEventKind: overrides.systemEventKind ?? 'topic-created',
    ...(overrides.externalMessageRef !== undefined
      ? { externalMessageRef: overrides.externalMessageRef }
      : {}),
  };
}
