import type { AdapterIsoTimestamp, AdapterPublicId } from "./refs.js";

export const inboundIdempotencyStatuses = Object.freeze([
  "processing",
  "processed",
  "failed"
] as const);

export type InboundIdempotencyStatus = (typeof inboundIdempotencyStatuses)[number];

export interface InboundIdempotencyRecord {
  readonly idempotencyKey: AdapterPublicId;
  readonly eventRef: AdapterPublicId;
  readonly eventType: string;
  readonly channelId: AdapterPublicId;
  readonly bindingRef?: AdapterPublicId;
  readonly status: InboundIdempotencyStatus;
  readonly resultRef?: AdapterPublicId;
  readonly firstSeenAt: AdapterIsoTimestamp;
  readonly updatedAt: AdapterIsoTimestamp;
  readonly expiresAt?: AdapterIsoTimestamp;
}

export interface TelegramMessageIdempotencyKeyInput {
  readonly channelId: AdapterPublicId;
  readonly chatId: AdapterPublicId;
  readonly messageThreadId: AdapterPublicId;
  readonly messageId: AdapterPublicId;
}

export interface TelegramCallbackIdempotencyKeyInput {
  readonly channelId: AdapterPublicId;
  readonly chatId: AdapterPublicId;
  readonly messageThreadId: AdapterPublicId;
  readonly callbackQueryId: AdapterPublicId;
}

export interface DeliveryAttemptIdempotencyKeyInput {
  readonly outboxRef: AdapterPublicId;
  readonly claimRef: AdapterPublicId;
  readonly attemptNumber: number;
}

export function createTelegramMessageIdempotencyKey(input: TelegramMessageIdempotencyKeyInput): AdapterPublicId {
  return `telegram-message:${input.channelId}:${input.chatId}:${input.messageThreadId}:${input.messageId}`;
}

export function createTelegramCallbackIdempotencyKey(input: TelegramCallbackIdempotencyKeyInput): AdapterPublicId {
  return `telegram-callback:${input.channelId}:${input.chatId}:${input.messageThreadId}:${input.callbackQueryId}`;
}

export function createDeliveryAttemptIdempotencyKey(input: DeliveryAttemptIdempotencyKeyInput): AdapterPublicId {
  return `delivery:${input.outboxRef}:${input.claimRef}:${input.attemptNumber}`;
}
