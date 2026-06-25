import type {
  SafeTelegramInboundChannelEvent,
  TelegramInboundCallbackIntent,
  TelegramInboundChannelEventProjectionResult,
  TelegramInboundEventKind,
  TelegramInboundIssue,
  TelegramInboundProviderKind,
  TelegramInboundTextIntent,
  TelegramInboundTopicDisplay,
} from '../contracts/inbound-topic-route.js';

const SAFE_REF_BODY_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,255}$/u;
const SAFE_COMMAND_PATTERN = /^[a-z][a-z0-9_]{0,31}$/u;
const MAX_TEXT_LENGTH = 4096;
const MAX_ARGUMENT_LENGTH = 256;
const MAX_DISPLAY_LENGTH = 160;

const EVENT_INPUT_KEYS = Object.freeze([
  'providerKind',
  'updateKind',
  'eventKind',
  'kind',
  'updateId',
  'eventId',
  'channelId',
  'chatId',
  'threadId',
  'messageThreadId',
  'messageId',
  'actorId',
  'authorId',
  'fromId',
  'text',
  'callbackData',
  'callbackId',
  'callbackToken',
  'topicTitle',
  'systemKind',
  'receivedAt',
  'occurredAt',
] as const);

const UNSAFE_KEY_PATTERNS = Object.freeze([
  /token/iu,
  /secret/iu,
  /credential/iu,
  /password/iu,
  /api\s*key/iu,
  /apikey/iu,
  /authorization/iu,
  /header/iu,
  /client/iu,
  /sdk/iu,
  /provider\s*object/iu,
  /raw/iu,
  /payload/iu,
  /body/iu,
  /endpoint/iu,
  /url/iu,
  /path/iu,
  /stack/iu,
] as const);

const UNSAFE_VALUE_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._:-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\b(?:token|secret|credential|password|apikey|api-key)\b/iu,
  /provider\s*object/iu,
  /\b(?:stack|trace)\b/iu,
] as const);

type InputRecord = Record<string, unknown>;

interface FieldSummary {
  readonly unsupportedFieldCount: number;
  readonly redactedFieldCount: number;
}

function isRecord(value: unknown): value is InputRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function issue(code: TelegramInboundIssue['code'], severity: TelegramInboundIssue['severity'], summary: string): TelegramInboundIssue {
  return Object.freeze({ code, severity, componentRef: 'w17c-telegram-inbound', summary } satisfies TelegramInboundIssue);
}

function containsUnsafeText(value: string): boolean {
  return UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function keyLooksUnsafe(key: string): boolean {
  return UNSAFE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function hash(value: string): string {
  let hashValue = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hashValue ^= value.charCodeAt(index);
    hashValue = Math.imul(hashValue, 16777619) >>> 0;
  }
  return hashValue.toString(16).padStart(8, '0');
}

function fieldValue(record: InputRecord, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  return undefined;
}

function normalizeProvider(value: unknown): TelegramInboundProviderKind {
  return value === 'openclaw' ? 'openclaw' : 'telegram';
}

function normalizeEventKind(value: unknown): TelegramInboundEventKind | undefined {
  if (value === 'message' || value === 'text_message') {
    return 'message';
  }
  if (value === 'callback' || value === 'callback_query') {
    return 'callback';
  }
  if (value === 'system' || value === 'topic' || value === 'topic_event') {
    return 'system';
  }
  return undefined;
}

function normalizeIdentifier(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return String(Math.abs(value));
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').replace(/^-+/u, '');
  if (normalized.length === 0 || normalized.length > 256 || !SAFE_REF_BODY_PATTERN.test(normalized)) {
    return undefined;
  }

  return containsUnsafeText(normalized) ? undefined : normalized;
}

function safeRef(prefix: string, value: unknown): string | undefined {
  const identifier = normalizeIdentifier(value);
  if (identifier === undefined) {
    return undefined;
  }
  return identifier.startsWith(prefix + ':') ? identifier : prefix + ':' + identifier;
}

function safeText(value: unknown, issues: TelegramInboundIssue[]): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/\s+/gu, ' ').trim();
  if (normalized.length === 0) {
    return undefined;
  }
  if (containsUnsafeText(normalized)) {
    issues.push(issue('unsafe-text-redacted', 'warning', 'Unsafe inbound text was omitted safely'));
    return undefined;
  }
  return normalized.slice(0, MAX_TEXT_LENGTH);
}

function safeTimestampRef(prefix: string, value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return prefix + ':' + fallback;
  }
  const normalized = value.trim();
  if (normalized.length < 10 || normalized.length > 40 || containsUnsafeText(normalized)) {
    return prefix + ':' + fallback;
  }
  return prefix + ':' + hash(normalized);
}

function collectFieldSummary(record: InputRecord, issues: TelegramInboundIssue[]): FieldSummary {
  let unsupportedFieldCount = 0;
  let redactedFieldCount = 0;

  for (const [key, value] of Object.entries(record)) {
    if ((EVENT_INPUT_KEYS as readonly string[]).includes(key)) {
      continue;
    }

    unsupportedFieldCount += 1;
    if (keyLooksUnsafe(key) || (typeof value === 'string' && containsUnsafeText(value))) {
      redactedFieldCount += 1;
      issues.push(issue('unsafe-field-redacted', 'warning', 'Unsupported provider-shaped field was quarantined safely'));
    }
  }

  return Object.freeze({ unsupportedFieldCount, redactedFieldCount } satisfies FieldSummary);
}

function createTextIntent(text: string | undefined): TelegramInboundTextIntent | undefined {
  if (text === undefined) {
    return undefined;
  }

  if (!text.startsWith('/')) {
    return Object.freeze({ descriptorKind: 'w17c-telegram-text-intent', text, malformedCommand: false, routingAuthority: false } satisfies TelegramInboundTextIntent);
  }

  const match = /^\/(?<name>[a-z][a-z0-9_]{0,31})(?:\s+(?<args>.*))?$/iu.exec(text);
  const name = match?.groups?.name?.toLowerCase();
  if (name === undefined || !SAFE_COMMAND_PATTERN.test(name) || containsUnsafeText(name)) {
    return Object.freeze({ descriptorKind: 'w17c-telegram-text-intent', text, malformedCommand: true, routingAuthority: false } satisfies TelegramInboundTextIntent);
  }

  const args = match?.groups?.args?.replace(/\s+/gu, ' ').trim();
  const base = {
    descriptorKind: 'w17c-telegram-text-intent',
    text,
    commandName: name,
    malformedCommand: false,
    routingAuthority: false,
  } satisfies Omit<TelegramInboundTextIntent, 'argumentText'>;

  if (args === undefined || args.length === 0 || containsUnsafeText(args)) {
    return Object.freeze(base);
  }

  return Object.freeze({ ...base, argumentText: args.slice(0, MAX_ARGUMENT_LENGTH) } satisfies TelegramInboundTextIntent);
}

function createTopicDisplay(value: unknown, issues: TelegramInboundIssue[]): TelegramInboundTopicDisplay | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const title = value.replace(/\s+/gu, ' ').trim();
  if (title.length === 0) {
    return undefined;
  }
  if (containsUnsafeText(title)) {
    issues.push(issue('unsafe-text-redacted', 'warning', 'Unsafe topic display title was omitted safely'));
    return undefined;
  }

  issues.push(issue('topic-title-display-only', 'info', 'Topic title was retained only as non-authoritative display metadata'));
  return Object.freeze({
    descriptorKind: 'w17c-telegram-topic-display',
    title: title.slice(0, MAX_DISPLAY_LENGTH),
    titleRoutingAuthority: false,
    routingKeyAuthority: 'channelRef+chatRef+threadRef',
  } satisfies TelegramInboundTopicDisplay);
}

function safeCallbackSource(value: unknown, issues: TelegramInboundIssue[]): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }
  if (normalized.length > 256 || containsUnsafeText(normalized)) {
    issues.push(issue('unsafe-callback-redacted', 'warning', 'Callback input was converted to a safe callback ref without exposing provider data'));
    return undefined;
  }
  return normalized;
}

function createCallbackIntent(
  providerKind: TelegramInboundProviderKind,
  record: InputRecord,
  stableInput: string,
  issues: TelegramInboundIssue[],
): TelegramInboundCallbackIntent | undefined {
  const callbackId = fieldValue(record, ['callbackId']);
  const callbackSource = safeCallbackSource(fieldValue(record, ['callbackData', 'callbackToken']), issues);
  const callbackRef = safeRef(providerKind + '-callback', callbackId) ?? providerKind + '-callback:' + hash(stableInput);
  const callbackTokenRef = 'callback-token:' + hash(callbackSource ?? callbackRef + '|' + stableInput);

  return Object.freeze({
    descriptorKind: 'w17c-telegram-callback-intent',
    callbackRef,
    callbackTokenRef,
    permissionChecked: false,
    tokenConsumed: false,
    routingAuthority: false,
  } satisfies TelegramInboundCallbackIntent);
}

function projectionResult(input: {
  readonly ok: boolean;
  readonly status: TelegramInboundChannelEventProjectionResult['status'];
  readonly reasonCode: TelegramInboundChannelEventProjectionResult['reasonCode'];
  readonly event?: SafeTelegramInboundChannelEvent;
  readonly issues: readonly TelegramInboundIssue[];
}): TelegramInboundChannelEventProjectionResult {
  const base = {
    descriptorKind: 'w17c-telegram-channel-event-projection-result',
    descriptorVersion: 'w17c',
    ok: input.ok,
    status: input.status,
    reasonCode: input.reasonCode,
    issues: Object.freeze([...input.issues]),
    effects: 'none',
    willCallRemote: false,
    productionReady: false,
    jsonSerializable: true,
  } satisfies Omit<TelegramInboundChannelEventProjectionResult, 'event'>;

  return input.event === undefined ? Object.freeze(base) : Object.freeze({ ...base, event: input.event } satisfies TelegramInboundChannelEventProjectionResult);
}

function requireRef(record: InputRecord, keys: readonly string[], prefix: string, issues: TelegramInboundIssue[]): string | undefined {
  const ref = safeRef(prefix, fieldValue(record, keys));
  if (ref === undefined) {
    issues.push(issue('invalid-provider-input', 'blocked', 'Required provider identity was missing or unsafe'));
  }
  return ref;
}

export function projectSafeTelegramInboundChannelEvent(providerUpdate: unknown): TelegramInboundChannelEventProjectionResult {
  const issues: TelegramInboundIssue[] = [];
  if (!isRecord(providerUpdate)) {
    issues.push(issue('invalid-provider-input', 'blocked', 'Provider-shaped update was not an object'));
    return projectionResult({ ok: false, status: 'rejected', reasonCode: 'invalid-provider-input', issues });
  }

  const providerKind = normalizeProvider(fieldValue(providerUpdate, ['providerKind']));
  const eventKind = normalizeEventKind(fieldValue(providerUpdate, ['eventKind', 'updateKind', 'kind']));
  const fieldSummary = collectFieldSummary(providerUpdate, issues);

  if (eventKind === undefined) {
    issues.push(issue('unsupported-event-kind', 'warning', 'Unsupported event kind was rejected safely'));
    return projectionResult({ ok: false, status: 'unsupported', reasonCode: 'unsupported-event-kind', issues });
  }

  const channelRef = requireRef(providerUpdate, ['channelId'], providerKind + '-channel', issues);
  const chatRef = requireRef(providerUpdate, ['chatId'], providerKind + '-chat', issues);
  const threadRef = requireRef(providerUpdate, ['threadId', 'messageThreadId'], providerKind + '-thread', issues);
  const messageRef = requireRef(providerUpdate, ['messageId'], providerKind + '-message', issues);

  if (channelRef === undefined || chatRef === undefined || threadRef === undefined || messageRef === undefined) {
    return projectionResult({ ok: false, status: 'rejected', reasonCode: 'invalid-provider-input', issues });
  }

  const actorRef = safeRef('actor', fieldValue(providerUpdate, ['actorId', 'authorId', 'fromId']));
  const textIntent = eventKind === 'message' ? createTextIntent(safeText(fieldValue(providerUpdate, ['text']), issues)) : undefined;
  const topicDisplay = createTopicDisplay(fieldValue(providerUpdate, ['topicTitle']), issues);
  const eventRef = safeRef(providerKind + '-event', fieldValue(providerUpdate, ['eventId', 'updateId']));
  const baseStableInput = [providerKind, eventKind, channelRef, chatRef, threadRef, messageRef].join('|');
  const stableEventRef = eventRef ?? providerKind + '-event:' + hash(baseStableInput);
  const callbackIntent = eventKind === 'callback' ? createCallbackIntent(providerKind, providerUpdate, baseStableInput, issues) : undefined;
  const idempotencyRef = 'telegram-inbound-idempotency:' + hash([stableEventRef, eventKind, channelRef, chatRef, threadRef, messageRef, callbackIntent?.callbackRef ?? ''].join('|'));
  const correlationRef = 'telegram-inbound-correlation:' + hash([stableEventRef, channelRef, chatRef, threadRef].join('|'));
  const receivedAtRef = safeTimestampRef('telegram-received-at', fieldValue(providerUpdate, ['receivedAt']), hash(baseStableInput));
  const occurredAtRef = safeTimestampRef('telegram-occurred-at', fieldValue(providerUpdate, ['occurredAt']), hash(stableEventRef));

  const eventBase = {
    descriptorKind: 'w17c-safe-telegram-channel-event',
    descriptorVersion: 'w17c',
    providerKind,
    eventKind,
    eventRef: stableEventRef,
    idempotencyRef,
    correlationRef,
    channelRef,
    chatRef,
    threadRef,
    messageRef,
    receivedAtRef,
    occurredAtRef,
    unsupportedFieldCount: fieldSummary.unsupportedFieldCount,
    redactedFieldCount: fieldSummary.redactedFieldCount,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies Omit<SafeTelegramInboundChannelEvent, 'actorRef' | 'textIntent' | 'callbackIntent' | 'topicDisplay'>;

  const event = Object.freeze({
    ...eventBase,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(textIntent === undefined ? {} : { textIntent }),
    ...(callbackIntent === undefined ? {} : { callbackIntent }),
    ...(topicDisplay === undefined ? {} : { topicDisplay }),
  } satisfies SafeTelegramInboundChannelEvent);

  issues.push(issue('projected', 'info', 'Provider-shaped update was projected into a safe channel event'));
  return projectionResult({ ok: true, status: 'projected', reasonCode: 'projected', event, issues });
}

export function isSafeTelegramInboundChannelEventJson(value: unknown): boolean {
  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === 'string' && !UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(encoded));
  } catch {
    return false;
  }
}
