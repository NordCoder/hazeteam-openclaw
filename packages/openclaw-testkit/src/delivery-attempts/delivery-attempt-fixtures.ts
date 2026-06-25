import type {
  AdapterCorrelationRef,
  AdapterIdempotencyKey,
  AdapterOperationRef,
  TelegramDeliveryFailure,
  TelegramDeliveryMessageId,
  TelegramDeliveryRequest,
  TelegramDeliverySafeError,
  TelegramDeliverySuccess,
} from '@hazeteam/openclaw-adapter';

export interface TestDeliveryAttemptFixtureOverrides {
  readonly deliveryRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly attemptNumber?: number;
  readonly text?: string;
  readonly retryable?: boolean;
}

export interface TestDeliveryAttemptFixture {
  readonly deliveryRef: AdapterOperationRef;
  readonly correlationRef: AdapterCorrelationRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly attemptNumber: number;
  readonly request: TelegramDeliveryRequest;
  readonly successResult: TelegramDeliverySuccess;
  readonly failureResult: TelegramDeliveryFailure;
}

const DEFAULT_DELIVERY_REF = 'operation:test-delivery-attempt' as AdapterOperationRef;
const DEFAULT_CORRELATION_REF = 'correlation:test-delivery-attempt' as AdapterCorrelationRef;
const DEFAULT_IDEMPOTENCY_KEY =
  'delivery-attempt:outbox:test-outbox:claim:test-claim:attempt:1' as AdapterIdempotencyKey;

function deliveryMessageId(deliveryRef: AdapterOperationRef): TelegramDeliveryMessageId {
  return `telegram-message:${deliveryRef.slice('operation:'.length)}` as TelegramDeliveryMessageId;
}

export function createTestDeliveryAttemptRequest(
  overrides: TestDeliveryAttemptFixtureOverrides = {},
): TelegramDeliveryRequest {
  const deliveryRef = overrides.deliveryRef ?? DEFAULT_DELIVERY_REF;
  const correlationRef = overrides.correlationRef ?? DEFAULT_CORRELATION_REF;

  return Object.freeze({
    deliveryRef,
    target: Object.freeze({
      channelId: 'telegram-channel:test-channel',
      chatId: 'telegram-chat:test-chat',
      messageThreadId: 'telegram-thread:test-thread',
    }),
    content: Object.freeze({
      format: 'plain' as const,
      text: overrides.text ?? 'test delivery attempt message',
    }),
    correlationRef,
  });
}

export function createTestDeliveryAttemptSuccess(
  request: TelegramDeliveryRequest = createTestDeliveryAttemptRequest(),
): TelegramDeliverySuccess {
  return Object.freeze({
    ok: true as const,
    deliveryRef: request.deliveryRef,
    externalMessageRef: Object.freeze({
      channelId: request.target.channelId,
      chatId: request.target.chatId,
      messageThreadId: request.target.messageThreadId,
      messageId: deliveryMessageId(request.deliveryRef),
      ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
    }),
    ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
  });
}

export function createTestDeliveryAttemptFailure(
  request: TelegramDeliveryRequest = createTestDeliveryAttemptRequest(),
  retryable = true,
): TelegramDeliveryFailure {
  const error: TelegramDeliverySafeError = Object.freeze({
    code: 'provider-unavailable' as const,
    message: 'test provider unavailable',
    retryable,
    ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
  });

  return Object.freeze({
    ok: false as const,
    deliveryRef: request.deliveryRef,
    error,
    retryable,
    ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
  });
}

export function createTestDeliveryAttemptFixture(
  overrides: TestDeliveryAttemptFixtureOverrides = {},
): TestDeliveryAttemptFixture {
  const request = createTestDeliveryAttemptRequest(overrides);
  return Object.freeze({
    deliveryRef: request.deliveryRef,
    correlationRef: request.correlationRef ?? DEFAULT_CORRELATION_REF,
    idempotencyKey: overrides.idempotencyKey ?? DEFAULT_IDEMPOTENCY_KEY,
    attemptNumber: overrides.attemptNumber ?? 1,
    request,
    successResult: createTestDeliveryAttemptSuccess(request),
    failureResult: createTestDeliveryAttemptFailure(request, overrides.retryable ?? true),
  });
}
