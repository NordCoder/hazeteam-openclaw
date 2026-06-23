import type {
  AgentRef,
  AdapterDetailsRef,
  WorkspaceRef,
} from '../contracts/refs.js';
import type {
  OpenClawTelegramChannelId,
  TelegramChatId,
  TelegramMessageThreadId,
} from '../contracts/channel-events.js';

const TELEGRAM_TOPIC_BINDING_KEY_PREFIX = 'telegram-topic';
const SAFE_TOPIC_BINDING_COORDINATE_PATTERN = /^[A-Za-z0-9._~-]+$/u;

export type TelegramTopicBindingKey = `telegram-topic:${string}:${string}:${string}`;
export type TelegramTopicBindingStatus = 'enabled' | 'disabled';
export type HostSessionRef = `host-session:${string}`;

export interface TelegramTopicBindingCoordinates {
  readonly channelId: OpenClawTelegramChannelId | string;
  readonly chatId: TelegramChatId | string;
  readonly messageThreadId: TelegramMessageThreadId | string;
  /** Display-only metadata. It is intentionally ignored by the canonical binding key. */
  readonly topicName?: string;
}

export interface ParsedTelegramTopicBindingKey {
  readonly key: TelegramTopicBindingKey;
  readonly channelId: OpenClawTelegramChannelId | string;
  readonly chatId: TelegramChatId | string;
  readonly messageThreadId: TelegramMessageThreadId | string;
}

export interface TelegramTopicBindingTarget {
  readonly workspaceRef: WorkspaceRef;
  readonly agentRef: AgentRef;
  readonly hostSessionRef: HostSessionRef;
}

export interface TelegramTopicBindingSnapshot extends TelegramTopicBindingCoordinates, TelegramTopicBindingTarget {
  readonly key: TelegramTopicBindingKey;
  readonly status: TelegramTopicBindingStatus;
  readonly detailsRef?: AdapterDetailsRef;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface TelegramTopicBindingCreateInput extends TelegramTopicBindingCoordinates, TelegramTopicBindingTarget {
  readonly key?: TelegramTopicBindingKey;
  readonly status?: TelegramTopicBindingStatus;
  readonly detailsRef?: AdapterDetailsRef;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface TelegramTopicBindingUpdateInput {
  readonly key: TelegramTopicBindingKey;
  readonly topicName?: string;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly hostSessionRef?: HostSessionRef;
  readonly status?: TelegramTopicBindingStatus;
  readonly detailsRef?: AdapterDetailsRef;
  readonly updatedAt?: string;
}

function normalizeTopicBindingCoordinate(label: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  if (value.length === 0 || value.trim().length === 0) {
    throw new TypeError(`${label} must be non-empty.`);
  }

  if (value !== value.trim()) {
    throw new TypeError(`${label} must not contain surrounding whitespace.`);
  }

  if (!SAFE_TOPIC_BINDING_COORDINATE_PATTERN.test(value)) {
    throw new TypeError(`${label} must use a safe canonical value without whitespace, newlines, or separators.`);
  }

  return value;
}

function normalizeTopicBindingStatus(status: TelegramTopicBindingStatus | undefined): TelegramTopicBindingStatus {
  if (status === undefined) {
    return 'enabled';
  }

  if (status !== 'enabled' && status !== 'disabled') {
    throw new TypeError('Telegram topic binding status must be enabled or disabled.');
  }

  return status;
}

function normalizeOptionalDisplayValue(label: string, value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string when provided.`);
  }

  const normalizedValue = value.trim().replace(/\s+/gu, ' ');
  if (normalizedValue.length === 0) {
    return undefined;
  }

  return normalizedValue;
}

export function createTelegramTopicBindingKey(
  input: TelegramTopicBindingCoordinates,
): TelegramTopicBindingKey {
  const channelId = normalizeTopicBindingCoordinate('channelId', input.channelId);
  const chatId = normalizeTopicBindingCoordinate('chatId', input.chatId);
  const messageThreadId = normalizeTopicBindingCoordinate('messageThreadId', input.messageThreadId);

  return `${TELEGRAM_TOPIC_BINDING_KEY_PREFIX}:${channelId}:${chatId}:${messageThreadId}` as TelegramTopicBindingKey;
}

export function parseTelegramTopicBindingKey(candidate: unknown): ParsedTelegramTopicBindingKey | null {
  if (typeof candidate !== 'string') {
    return null;
  }

  const parts = candidate.split(':');
  if (parts.length !== 4 || parts[0] !== TELEGRAM_TOPIC_BINDING_KEY_PREFIX) {
    return null;
  }

  const [, channelId, chatId, messageThreadId] = parts;
  try {
    const parsedChannelId = normalizeTopicBindingCoordinate('channelId', channelId);
    const parsedChatId = normalizeTopicBindingCoordinate('chatId', chatId);
    const parsedMessageThreadId = normalizeTopicBindingCoordinate('messageThreadId', messageThreadId);

    return Object.freeze({
      key: candidate as TelegramTopicBindingKey,
      channelId: parsedChannelId,
      chatId: parsedChatId,
      messageThreadId: parsedMessageThreadId,
    });
  } catch {
    return null;
  }
}

export function isTelegramTopicBindingKey(candidate: unknown): candidate is TelegramTopicBindingKey {
  return parseTelegramTopicBindingKey(candidate) !== null;
}

export function createTelegramTopicBindingSnapshot(
  input: TelegramTopicBindingCreateInput,
): TelegramTopicBindingSnapshot {
  const key = createTelegramTopicBindingKey(input);
  if (input.key !== undefined && input.key !== key) {
    throw new TypeError('Telegram topic binding key does not match canonical coordinates.');
  }

  const topicName = normalizeOptionalDisplayValue('topicName', input.topicName);
  const snapshot = {
    key,
    channelId: normalizeTopicBindingCoordinate('channelId', input.channelId),
    chatId: normalizeTopicBindingCoordinate('chatId', input.chatId),
    messageThreadId: normalizeTopicBindingCoordinate('messageThreadId', input.messageThreadId),
    ...(topicName === undefined ? {} : { topicName }),
    workspaceRef: input.workspaceRef,
    agentRef: input.agentRef,
    hostSessionRef: input.hostSessionRef,
    status: normalizeTopicBindingStatus(input.status),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.createdAt === undefined ? {} : { createdAt: input.createdAt }),
    ...(input.updatedAt === undefined ? {} : { updatedAt: input.updatedAt }),
  } satisfies TelegramTopicBindingSnapshot;

  return Object.freeze(snapshot);
}

export function isTelegramTopicBindingEnabled(
  snapshot: Pick<TelegramTopicBindingSnapshot, 'status'>,
): boolean {
  return snapshot.status === 'enabled';
}

export function isTelegramTopicBindingDisabled(
  snapshot: Pick<TelegramTopicBindingSnapshot, 'status'>,
): boolean {
  return snapshot.status === 'disabled';
}
