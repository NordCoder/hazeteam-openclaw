import type { AdapterOperationContext } from './context.js';
import type {
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AgentRef,
  WorkspaceRef,
} from './refs.js';

const TELEGRAM_ACTION_BUTTON_PAYLOAD_PREFIX = 'hz:';
const MAX_TELEGRAM_DELIVERY_REF_LENGTH = 256;
const MAX_TELEGRAM_ACTION_PAYLOAD_TOKEN_LENGTH = 512;
const MAX_TELEGRAM_ACTION_BUTTON_LABEL_LENGTH = 80;
const MAX_TELEGRAM_DELIVERY_ERROR_MESSAGE_LENGTH = 240;
const TELEGRAM_DELIVERY_REF_VALUE_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const TELEGRAM_ACTION_PAYLOAD_TOKEN_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const DEFAULT_TELEGRAM_DELIVERY_ERROR_MESSAGE = 'Telegram delivery failed';
const TELEGRAM_ACTION_BUTTON_STYLES = ['primary', 'secondary', 'danger'] as const;
const TELEGRAM_DELIVERY_SAFE_ERROR_CODES = [
  'invalid-request',
  'target-not-found',
  'provider-unavailable',
  'provider-rejected',
  'rate-limited',
  'timeout',
  'conflict',
  'internal',
] as const;
const SENSITIVE_ASSIGNMENT_TERMS = [
  'bot[_-]?token',
  'api[_-]?key',
  'authorization',
  'password',
  'passwd',
  'credential',
];
const SENSITIVE_ASSIGNMENT_PATTERN = new RegExp(
  `\\b(?:${SENSITIVE_ASSIGNMENT_TERMS.join('|')})\\b\\s*[:=]\\s*\\S+`,
  'giu',
);

export type TelegramDeliveryChannelId = `telegram-channel:${string}`;
export type TelegramDeliveryChatId = `telegram-chat:${string}`;
export type TelegramDeliveryMessageThreadId = `telegram-thread:${string}`;
export type TelegramDeliveryMessageId = `telegram-message:${string}`;

export interface TelegramDeliveryTarget {
  readonly channelId: TelegramDeliveryChannelId;
  readonly chatId: TelegramDeliveryChatId;
  readonly messageThreadId: TelegramDeliveryMessageThreadId;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
}

export type TelegramDeliveryContentFormat = 'plain' | 'markdown' | 'html';

export type TelegramActionButtonPayload = `hz:${string}`;

export type TelegramActionButtonStyle = (typeof TELEGRAM_ACTION_BUTTON_STYLES)[number];

export interface TelegramActionButton {
  readonly label: string;
  readonly payload: TelegramActionButtonPayload;
  readonly style?: TelegramActionButtonStyle;
}

export interface TelegramActionButtonGroup {
  readonly buttons: readonly TelegramActionButton[];
}

export interface TelegramDeliveryTextContent {
  readonly format: TelegramDeliveryContentFormat;
  readonly text: string;
  readonly buttonGroups?: readonly TelegramActionButtonGroup[];
}

export interface TelegramExternalMessageRef {
  readonly channelId: TelegramDeliveryChannelId;
  readonly chatId: TelegramDeliveryChatId;
  readonly messageThreadId: TelegramDeliveryMessageThreadId;
  readonly messageId: TelegramDeliveryMessageId;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface TelegramDeliveryRequest {
  readonly deliveryRef: AdapterOperationRef;
  readonly target: TelegramDeliveryTarget;
  readonly content: TelegramDeliveryTextContent;
  readonly context?: AdapterOperationContext;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface TelegramDeliverySuccess {
  readonly ok: true;
  readonly deliveryRef: AdapterOperationRef;
  readonly externalMessageRef: TelegramExternalMessageRef;
  readonly context?: AdapterOperationContext;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface TelegramDeliveryFailure {
  readonly ok: false;
  readonly deliveryRef: AdapterOperationRef;
  readonly error: TelegramDeliverySafeError;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly context?: AdapterOperationContext;
}

export type TelegramDeliveryResult = TelegramDeliverySuccess | TelegramDeliveryFailure;

export type TelegramDeliverySafeErrorCode = (typeof TELEGRAM_DELIVERY_SAFE_ERROR_CODES)[number];

export interface TelegramDeliverySafeError {
  readonly code: TelegramDeliverySafeErrorCode;
  readonly message: string;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

function normalizeBoundedString(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function normalizeTelegramDeliveryRef(
  input: unknown,
  prefix: string,
  label: string,
): string {
  const normalized = normalizeBoundedString(input, label, MAX_TELEGRAM_DELIVERY_REF_LENGTH);

  if (!normalized.startsWith(prefix) || !TELEGRAM_DELIVERY_REF_VALUE_PATTERN.test(normalized)) {
    throw new TypeError(`${label} must be a safe Telegram delivery ref.`);
  }

  return normalized;
}

function normalizeTelegramDeliveryTarget(input: TelegramDeliveryTarget): TelegramDeliveryTarget {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Telegram delivery target must be an object.');
  }

  return Object.freeze({
    channelId: normalizeTelegramDeliveryRef(
      input.channelId,
      'telegram-channel:',
      'Telegram delivery target channelId',
    ) as TelegramDeliveryChannelId,
    chatId: normalizeTelegramDeliveryRef(
      input.chatId,
      'telegram-chat:',
      'Telegram delivery target chatId',
    ) as TelegramDeliveryChatId,
    messageThreadId: normalizeTelegramDeliveryRef(
      input.messageThreadId,
      'telegram-thread:',
      'Telegram delivery target messageThreadId',
    ) as TelegramDeliveryMessageThreadId,
    ...(input.workspaceRef === undefined
      ? {}
      : {
          workspaceRef: normalizeTelegramDeliveryRef(
            input.workspaceRef,
            'workspace:',
            'Telegram delivery target workspaceRef',
          ) as WorkspaceRef,
        }),
    ...(input.agentRef === undefined
      ? {}
      : {
          agentRef: normalizeTelegramDeliveryRef(
            input.agentRef,
            'agent:',
            'Telegram delivery target agentRef',
          ) as AgentRef,
        }),
  });
}

function isTelegramActionPayloadToken(candidate: string): boolean {
  return (
    candidate.length > 0 &&
    candidate.length <= MAX_TELEGRAM_ACTION_PAYLOAD_TOKEN_LENGTH &&
    TELEGRAM_ACTION_PAYLOAD_TOKEN_PATTERN.test(candidate)
  );
}

function isTelegramDeliverySafeErrorCode(code: string): code is TelegramDeliverySafeErrorCode {
  return (TELEGRAM_DELIVERY_SAFE_ERROR_CODES as readonly string[]).includes(code);
}

function normalizeTelegramDeliverySafeErrorMessage(message: unknown): string {
  if (typeof message !== 'string') {
    return DEFAULT_TELEGRAM_DELIVERY_ERROR_MESSAGE;
  }

  const normalized = message
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '[redacted]')
    .trim();

  if (normalized.length === 0) {
    return DEFAULT_TELEGRAM_DELIVERY_ERROR_MESSAGE;
  }

  if (normalized.length <= MAX_TELEGRAM_DELIVERY_ERROR_MESSAGE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_TELEGRAM_DELIVERY_ERROR_MESSAGE_LENGTH - 3)}...`;
}

function normalizeTelegramActionButtonStyle(style: unknown): TelegramActionButtonStyle {
  if (
    typeof style !== 'string' ||
    !(TELEGRAM_ACTION_BUTTON_STYLES as readonly string[]).includes(style)
  ) {
    throw new TypeError('Unsupported Telegram action button style.');
  }

  return style as TelegramActionButtonStyle;
}

export function createTelegramActionButtonPayload(
  tokenRefOrValue: string,
): TelegramActionButtonPayload {
  const normalized = normalizeBoundedString(
    tokenRefOrValue,
    'Telegram action button token ref',
    MAX_TELEGRAM_ACTION_PAYLOAD_TOKEN_LENGTH + TELEGRAM_ACTION_BUTTON_PAYLOAD_PREFIX.length,
  );
  const tokenRef = normalized.startsWith(TELEGRAM_ACTION_BUTTON_PAYLOAD_PREFIX)
    ? normalized.slice(TELEGRAM_ACTION_BUTTON_PAYLOAD_PREFIX.length)
    : normalized;

  if (!isTelegramActionPayloadToken(tokenRef)) {
    throw new TypeError('Telegram action button payload must contain an opaque token ref.');
  }

  return `${TELEGRAM_ACTION_BUTTON_PAYLOAD_PREFIX}${tokenRef}` as TelegramActionButtonPayload;
}

export function isTelegramActionButtonPayload(
  candidate: unknown,
): candidate is TelegramActionButtonPayload {
  if (typeof candidate !== 'string') {
    return false;
  }

  try {
    return createTelegramActionButtonPayload(candidate) === candidate.trim();
  } catch {
    return false;
  }
}

export function createTelegramActionButton(input: {
  readonly label: string;
  readonly payload: string;
  readonly style?: TelegramActionButtonStyle;
}): TelegramActionButton {
  return Object.freeze({
    label: normalizeBoundedString(
      input.label,
      'Telegram action button label',
      MAX_TELEGRAM_ACTION_BUTTON_LABEL_LENGTH,
    ),
    payload: createTelegramActionButtonPayload(input.payload),
    ...(input.style === undefined ? {} : { style: normalizeTelegramActionButtonStyle(input.style) }),
  });
}

export function createTelegramExternalMessageRef(input: {
  readonly target: TelegramDeliveryTarget;
  readonly messageId: TelegramDeliveryMessageId;
  readonly correlationRef?: AdapterCorrelationRef;
}): TelegramExternalMessageRef {
  const target = normalizeTelegramDeliveryTarget(input.target);

  return Object.freeze({
    channelId: target.channelId,
    chatId: target.chatId,
    messageThreadId: target.messageThreadId,
    messageId: normalizeTelegramDeliveryRef(
      input.messageId,
      'telegram-message:',
      'Telegram external messageId',
    ) as TelegramDeliveryMessageId,
    ...(target.workspaceRef === undefined ? {} : { workspaceRef: target.workspaceRef }),
    ...(target.agentRef === undefined ? {} : { agentRef: target.agentRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
  });
}

export function createTelegramDeliverySafeError(input: {
  readonly code: TelegramDeliverySafeErrorCode;
  readonly message: unknown;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}): TelegramDeliverySafeError {
  if (!isTelegramDeliverySafeErrorCode(input.code)) {
    throw new TypeError('Unsupported Telegram delivery safe error code.');
  }

  return Object.freeze({
    code: input.code,
    message: normalizeTelegramDeliverySafeErrorMessage(input.message),
    ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
  });
}
