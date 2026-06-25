import { parseTransportConfig } from './config.js';

import type {
  TransportConfigInput,
  TransportConfigReadinessStatus,
  TransportProviderConfigDescriptor,
} from './config.js';

export const CHANNEL_EVENT_SOURCE_PROVIDERS = Object.freeze(['telegram', 'openclaw'] as const);
export type ChannelEventSourceProvider = (typeof CHANNEL_EVENT_SOURCE_PROVIDERS)[number];

export const CHANNEL_EVENT_KINDS = Object.freeze(['message', 'callback', 'system'] as const);
export type ChannelEventKind = (typeof CHANNEL_EVENT_KINDS)[number];

export const CHANNEL_SYSTEM_EVENT_KINDS = Object.freeze([
  'topic-created',
  'topic-renamed',
  'topic-closed',
  'topic-reopened',
  'member-joined',
  'member-left',
  'unknown',
] as const);
export type ChannelSystemEventKind = (typeof CHANNEL_SYSTEM_EVENT_KINDS)[number];

export const CHANNEL_EVENT_SOURCE_STATUSES = Object.freeze(['normalized', 'invalid', 'ignored', 'unsupported'] as const);
export type ChannelEventSourceStatus = (typeof CHANNEL_EVENT_SOURCE_STATUSES)[number];

export const CHANNEL_EVENT_SOURCE_REASON_CODES = Object.freeze([
  'normalized-event',
  'acknowledged-provider-event',
  'invalid-provider-input',
  'invalid-transport-config',
  'missing-transport-config',
  'ignored-provider-disabled',
  'ignored-event',
  'unsupported-event-kind',
  'unsafe-input-redacted',
  'unsafe-text-redacted',
  'unsafe-command-redacted',
  'unsafe-topic-title-redacted',
  'topic-title-display-only',
] as const);
export type ChannelEventSourceReasonCode = (typeof CHANNEL_EVENT_SOURCE_REASON_CODES)[number];

export type ChannelEventSourceIssueSeverity = 'info' | 'warning' | 'blocked';

export interface ChannelEventSourceIssue {
  readonly code: ChannelEventSourceReasonCode;
  readonly severity: ChannelEventSourceIssueSeverity;
  readonly componentRef: string;
  readonly summary: string;
}

export interface ChannelEventProviderInputRecord {
  readonly providerKind?: unknown;
  readonly eventKind?: unknown;
  readonly channelId?: unknown;
  readonly chatId?: unknown;
  readonly threadId?: unknown;
  readonly messageId?: unknown;
  readonly authorId?: unknown;
  readonly eventId?: unknown;
  readonly text?: unknown;
  readonly command?: unknown;
  readonly callbackId?: unknown;
  readonly systemKind?: unknown;
  readonly topicTitle?: unknown;
  readonly occurredAt?: unknown;
  readonly receivedAt?: unknown;
  readonly requiresProviderAck?: unknown;
  readonly ignored?: unknown;
}

export interface ChannelEventSourceNormalizeInput {
  readonly transportConfig?: TransportConfigInput;
  readonly providerKind?: unknown;
  readonly event?: unknown;
  readonly receivedAt?: unknown;
}

export interface ChannelEventCommandProjection {
  readonly descriptorKind: 'channel-event-command-projection';
  readonly commandRef: string;
  readonly commandName: string;
  readonly source: 'text-prefix' | 'explicit-field';
  readonly routingAuthority: false;
  readonly argumentText?: string;
}

export interface ChannelEventTopicDisplayProjection {
  readonly descriptorKind: 'channel-event-topic-display';
  readonly title: string;
  readonly titleRoutingAuthority: false;
  readonly routingKeyAuthority: 'channelRef+chatRef+threadRef';
}

export interface SafeChannelEventDto {
  readonly descriptorKind: 'openclaw-telegram-channel-event';
  readonly descriptorVersion: 'w14b';
  readonly providerKind: ChannelEventSourceProvider;
  readonly eventKind: ChannelEventKind;
  readonly systemKind?: ChannelSystemEventKind;
  readonly eventRef: string;
  readonly idempotencyKey: string;
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef: string;
  readonly messageRef: string;
  readonly authorRef: string;
  readonly receivedAt: string;
  readonly occurredAt?: string;
  readonly text?: string;
  readonly command?: ChannelEventCommandProjection;
  readonly callbackRef?: string;
  readonly topicDisplay?: ChannelEventTopicDisplayProjection;
  readonly unsupportedFieldCount: number;
  readonly redactedFieldCount: number;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export interface ChannelEventProviderAckDecision {
  readonly descriptorKind: 'channel-event-provider-ack-decision';
  readonly required: boolean;
  readonly decision: 'acknowledge' | 'do-not-acknowledge' | 'not-required';
  readonly reasonCode: ChannelEventSourceReasonCode;
  readonly providerCall: 'not-executed';
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly businessProcessingStatus: 'not-started';
  readonly businessSuccess: false;
}

export interface ChannelEventSourceTransportProjection {
  readonly descriptorKind: 'channel-event-source-transport-projection';
  readonly providerKind: ChannelEventSourceProvider;
  readonly mode: TransportProviderConfigDescriptor['mode'] | 'missing';
  readonly readiness: TransportConfigReadinessStatus | 'missing';
  readonly willCallRemote: false;
}

export interface ChannelEventSourceNormalizeResult {
  readonly descriptorKind: 'channel-event-source-normalization';
  readonly descriptorVersion: 'w14b';
  readonly ok: boolean;
  readonly status: ChannelEventSourceStatus;
  readonly reasonCode: ChannelEventSourceReasonCode;
  readonly providerKind: ChannelEventSourceProvider;
  readonly transport: ChannelEventSourceTransportProjection;
  readonly event?: SafeChannelEventDto;
  readonly providerAck: ChannelEventProviderAckDecision;
  readonly issues: readonly ChannelEventSourceIssue[];
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly productionReady: false;
  readonly jsonSerializable: true;
}

interface NormalizedCommandParts {
  readonly name: string;
  readonly args?: string;
}

interface UnsupportedFieldSummary {
  readonly unsupportedFieldCount: number;
  readonly redactedFieldCount: number;
}

interface ResultInput {
  readonly ok: boolean;
  readonly status: ChannelEventSourceStatus;
  readonly reasonCode: ChannelEventSourceReasonCode;
  readonly providerKind: ChannelEventSourceProvider;
  readonly providerDescriptor: TransportProviderConfigDescriptor | undefined;
  readonly event: SafeChannelEventDto | undefined;
  readonly providerAck: ChannelEventProviderAckDecision;
  readonly issues: readonly ChannelEventSourceIssue[];
}

const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,255}$/u;
const SAFE_COMMAND_PATTERN = /^[a-z][a-z0-9_]{0,31}$/iu;
const MAX_TEXT_LENGTH = 4096;
const MAX_COMMAND_ARGUMENT_LENGTH = 256;
const MAX_DISPLAY_LENGTH = 160;
const DEFAULT_RECEIVED_AT = '1970-01-01T00:00:00.000Z';
const DEFAULT_PROVIDER: ChannelEventSourceProvider = 'telegram';

const EVENT_INPUT_KEYS = Object.freeze([
  'providerKind',
  'eventKind',
  'channelId',
  'chatId',
  'threadId',
  'messageId',
  'authorId',
  'eventId',
  'text',
  'command',
  'callbackId',
  'systemKind',
  'topicTitle',
  'occurredAt',
  'receivedAt',
  'requiresProviderAck',
  'ignored',
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function createIssue(
  code: ChannelEventSourceReasonCode,
  severity: ChannelEventSourceIssueSeverity,
  componentRef: string,
  summary: string,
): ChannelEventSourceIssue {
  return Object.freeze({ code, severity, componentRef, summary } satisfies ChannelEventSourceIssue);
}

function hasUnsafeValueText(value: string): boolean {
  return UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function keyLooksUnsafe(key: string): boolean {
  return UNSAFE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function normalizeIdentifier(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return String(Math.abs(value));
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-');
  if (normalized.length === 0 || normalized.length > 256 || !SAFE_ID_PATTERN.test(normalized)) {
    return undefined;
  }

  return hasUnsafeValueText(normalized) ? undefined : normalized;
}

function safeRef(prefix: string, value: unknown): string | undefined {
  const identifier = normalizeIdentifier(value);
  if (identifier === undefined) {
    return undefined;
  }

  return identifier.startsWith(`${prefix}:`) ? identifier : `${prefix}:${identifier}`;
}

function normalizeProvider(value: unknown): ChannelEventSourceProvider | undefined {
  return isOneOf(value, CHANNEL_EVENT_SOURCE_PROVIDERS) ? value : undefined;
}

function normalizeEventKind(value: unknown): ChannelEventKind | undefined {
  return isOneOf(value, CHANNEL_EVENT_KINDS) ? value : undefined;
}

function normalizeSystemKind(value: unknown): ChannelSystemEventKind {
  return isOneOf(value, CHANNEL_SYSTEM_EVENT_KINDS) ? value : 'unknown';
}

function normalizeIsoTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length < 20 || normalized.length > 40 || hasUnsafeValueText(normalized)) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(normalized) ? normalized : undefined;
}

function projectSafeText(
  value: unknown,
  issues: ChannelEventSourceIssue[],
  componentRef: string,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/\s+/gu, ' ').trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (hasUnsafeValueText(normalized)) {
    issues.push(createIssue('unsafe-text-redacted', 'warning', componentRef, 'Unsafe event text was omitted safely'));
    return undefined;
  }

  return normalized.slice(0, MAX_TEXT_LENGTH);
}

function projectDisplayTitle(
  value: unknown,
  issues: ChannelEventSourceIssue[],
  componentRef: string,
): ChannelEventTopicDisplayProjection | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const title = value.replace(/\s+/gu, ' ').trim();
  if (title.length === 0) {
    return undefined;
  }

  if (hasUnsafeValueText(title)) {
    issues.push(createIssue('unsafe-topic-title-redacted', 'warning', componentRef, 'Unsafe topic title was omitted safely'));
    return undefined;
  }

  issues.push(createIssue('topic-title-display-only', 'info', componentRef, 'Topic title was kept as display-only metadata'));
  return Object.freeze({
    descriptorKind: 'channel-event-topic-display',
    title: title.slice(0, MAX_DISPLAY_LENGTH),
    titleRoutingAuthority: false,
    routingKeyAuthority: 'channelRef+chatRef+threadRef',
  } satisfies ChannelEventTopicDisplayProjection);
}

function parseCommandParts(value: string): NormalizedCommandParts | undefined {
  const trimmed = value.trim();
  const withoutPrefix = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const match = /^(?<name>[a-z][a-z0-9_]{0,31})(?:\s+(?<args>.*))?$/iu.exec(withoutPrefix);
  const name = match?.groups?.name;

  if (name === undefined || !SAFE_COMMAND_PATTERN.test(name)) {
    return undefined;
  }

  const args = match.groups?.args?.trim();
  if (args === undefined || args === '') {
    return Object.freeze({ name: name.toLowerCase() });
  }

  return Object.freeze({ name: name.toLowerCase(), args });
}

function projectCommand(
  record: Record<string, unknown>,
  text: string | undefined,
  providerKind: ChannelEventSourceProvider,
  issues: ChannelEventSourceIssue[],
  componentRef: string,
): ChannelEventCommandProjection | undefined {
  const sourceValue = typeof record.command === 'string' ? record.command : text?.startsWith('/') === true ? text : undefined;
  if (sourceValue === undefined) {
    return undefined;
  }

  const parsed = parseCommandParts(sourceValue);
  if (parsed === undefined) {
    issues.push(createIssue('unsafe-command-redacted', 'warning', componentRef, 'Unsafe command projection was omitted safely'));
    return undefined;
  }

  const base = {
    descriptorKind: 'channel-event-command-projection',
    commandRef: `${providerKind}-command:${parsed.name}`,
    commandName: parsed.name,
    source: typeof record.command === 'string' ? 'explicit-field' : 'text-prefix',
    routingAuthority: false,
  } satisfies Omit<ChannelEventCommandProjection, 'argumentText'>;

  if (parsed.args === undefined || hasUnsafeValueText(parsed.args)) {
    return Object.freeze(base);
  }

  return Object.freeze({
    ...base,
    argumentText: parsed.args.slice(0, MAX_COMMAND_ARGUMENT_LENGTH),
  } satisfies ChannelEventCommandProjection);
}

function deterministicHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}

function collectUnsupportedFields(record: Record<string, unknown>, issues: ChannelEventSourceIssue[]): UnsupportedFieldSummary {
  let unsupportedFieldCount = 0;
  let redactedFieldCount = 0;

  for (const key of Object.keys(record)) {
    if ((EVENT_INPUT_KEYS as readonly string[]).includes(key)) {
      continue;
    }

    unsupportedFieldCount += 1;
    if (keyLooksUnsafe(key)) {
      redactedFieldCount += 1;
      issues.push(
        createIssue('unsafe-input-redacted', 'warning', 'channel-event-source', 'Unsafe provider field was omitted safely'),
      );
    }
  }

  return Object.freeze({ unsupportedFieldCount, redactedFieldCount });
}

function createAckDecision(required: boolean, reasonCode: ChannelEventSourceReasonCode): ChannelEventProviderAckDecision {
  return Object.freeze({
    descriptorKind: 'channel-event-provider-ack-decision',
    required,
    decision: required ? 'acknowledge' : 'not-required',
    reasonCode: required ? 'acknowledged-provider-event' : reasonCode,
    providerCall: 'not-executed',
    effects: 'none',
    willCallRemote: false,
    businessProcessingStatus: 'not-started',
    businessSuccess: false,
  } satisfies ChannelEventProviderAckDecision);
}

function createNoAckDecision(required: boolean, reasonCode: ChannelEventSourceReasonCode): ChannelEventProviderAckDecision {
  return Object.freeze({
    descriptorKind: 'channel-event-provider-ack-decision',
    required,
    decision: required ? 'do-not-acknowledge' : 'not-required',
    reasonCode,
    providerCall: 'not-executed',
    effects: 'none',
    willCallRemote: false,
    businessProcessingStatus: 'not-started',
    businessSuccess: false,
  } satisfies ChannelEventProviderAckDecision);
}

function createTransportProjection(
  providerKind: ChannelEventSourceProvider,
  providerDescriptor: TransportProviderConfigDescriptor | undefined,
): ChannelEventSourceTransportProjection {
  return Object.freeze({
    descriptorKind: 'channel-event-source-transport-projection',
    providerKind,
    mode: providerDescriptor?.mode ?? 'missing',
    readiness: providerDescriptor?.readiness ?? 'missing',
    willCallRemote: false,
  } satisfies ChannelEventSourceTransportProjection);
}

function createResult(input: ResultInput): ChannelEventSourceNormalizeResult {
  const base = {
    descriptorKind: 'channel-event-source-normalization',
    descriptorVersion: 'w14b',
    ok: input.ok,
    status: input.status,
    reasonCode: input.reasonCode,
    providerKind: input.providerKind,
    transport: createTransportProjection(input.providerKind, input.providerDescriptor),
    providerAck: input.providerAck,
    issues: Object.freeze([...input.issues]),
    effects: 'none',
    willCallRemote: false,
    productionReady: false,
    jsonSerializable: true,
  } satisfies Omit<ChannelEventSourceNormalizeResult, 'event'>;

  if (input.event === undefined) {
    return Object.freeze(base);
  }

  return Object.freeze({ ...base, event: input.event } satisfies ChannelEventSourceNormalizeResult);
}

function requiredRef(
  record: Record<string, unknown>,
  key: keyof ChannelEventProviderInputRecord,
  prefix: string,
  issues: ChannelEventSourceIssue[],
  componentRef: string,
): string | undefined {
  const value = safeRef(prefix, record[key]);
  if (value === undefined) {
    issues.push(createIssue('invalid-provider-input', 'blocked', componentRef, 'Required provider identity was missing or unsafe'));
  }

  return value;
}

function optionalRef(value: unknown, prefix: string, fallback: string): string {
  return safeRef(prefix, value) ?? `${prefix}:${fallback}`;
}

function omittedEvent(): undefined {
  return undefined;
}

export function normalizeChannelEventSourceInput(input: ChannelEventSourceNormalizeInput): ChannelEventSourceNormalizeResult {
  const eventRecord = isRecord(input.event) ? input.event : undefined;
  const providerFromInput = normalizeProvider(input.providerKind);
  const providerFromEvent = eventRecord === undefined ? undefined : normalizeProvider(eventRecord.providerKind);
  const providerKind = providerFromInput ?? providerFromEvent ?? DEFAULT_PROVIDER;
  const receivedAtInput = eventRecord?.receivedAt ?? input.receivedAt;
  const requiresProviderAck = eventRecord?.requiresProviderAck !== false;
  const issues: ChannelEventSourceIssue[] = [];

  if (input.transportConfig === undefined) {
    issues.push(
      createIssue('missing-transport-config', 'blocked', 'channel-event-source', 'Transport config descriptor was not provided'),
    );
    return createResult({
      ok: false,
      status: 'ignored',
      reasonCode: 'missing-transport-config',
      providerKind,
      providerDescriptor: undefined,
      event: omittedEvent(),
      providerAck: createNoAckDecision(requiresProviderAck, 'missing-transport-config'),
      issues,
    });
  }

  const config = parseTransportConfig(input.transportConfig);
  const providerDescriptor = config.descriptor.providers.find((provider) => provider.provider === providerKind);

  if (!config.ok) {
    issues.push(
      createIssue('invalid-transport-config', 'blocked', `transport:${providerKind}`, 'Transport config is not ready for channel events'),
    );
    return createResult({
      ok: false,
      status: 'invalid',
      reasonCode: 'invalid-transport-config',
      providerKind,
      providerDescriptor,
      event: omittedEvent(),
      providerAck: createNoAckDecision(requiresProviderAck, 'invalid-transport-config'),
      issues,
    });
  }

  if (providerDescriptor === undefined || providerDescriptor.mode === 'disabled' || providerDescriptor.readiness === 'disabled') {
    issues.push(
      createIssue('ignored-provider-disabled', 'info', `transport:${providerKind}`, 'Provider is disabled for channel events'),
    );
    return createResult({
      ok: false,
      status: 'ignored',
      reasonCode: 'ignored-provider-disabled',
      providerKind,
      providerDescriptor,
      event: omittedEvent(),
      providerAck: createNoAckDecision(requiresProviderAck, 'ignored-provider-disabled'),
      issues,
    });
  }

  if (eventRecord === undefined) {
    issues.push(createIssue('invalid-provider-input', 'blocked', 'channel-event-source', 'Provider event was not an object'));
    return createResult({
      ok: false,
      status: 'invalid',
      reasonCode: 'invalid-provider-input',
      providerKind,
      providerDescriptor,
      event: omittedEvent(),
      providerAck: createNoAckDecision(requiresProviderAck, 'invalid-provider-input'),
      issues,
    });
  }

  const unsupported = collectUnsupportedFields(eventRecord, issues);

  if (eventRecord.ignored === true) {
    issues.push(createIssue('ignored-event', 'info', 'channel-event-source', 'Provider event was ignored safely'));
    return createResult({
      ok: false,
      status: 'ignored',
      reasonCode: 'ignored-event',
      providerKind,
      providerDescriptor,
      event: omittedEvent(),
      providerAck: createAckDecision(requiresProviderAck, 'ignored-event'),
      issues,
    });
  }

  const eventKind = normalizeEventKind(eventRecord.eventKind);
  if (eventKind === undefined) {
    issues.push(
      createIssue('unsupported-event-kind', 'warning', 'channel-event-source', 'Unsupported event kind was rejected safely'),
    );
    return createResult({
      ok: false,
      status: 'unsupported',
      reasonCode: 'unsupported-event-kind',
      providerKind,
      providerDescriptor,
      event: omittedEvent(),
      providerAck: createAckDecision(requiresProviderAck, 'unsupported-event-kind'),
      issues,
    });
  }

  const componentRef = `${providerKind}:channel-event`;
  const channelRef = requiredRef(eventRecord, 'channelId', `${providerKind}-channel`, issues, componentRef);
  const chatRef = requiredRef(eventRecord, 'chatId', `${providerKind}-chat`, issues, componentRef);
  const threadRef = requiredRef(eventRecord, 'threadId', `${providerKind}-thread`, issues, componentRef);
  const messageRef = requiredRef(eventRecord, 'messageId', `${providerKind}-message`, issues, componentRef);

  if (channelRef === undefined || chatRef === undefined || threadRef === undefined || messageRef === undefined) {
    return createResult({
      ok: false,
      status: 'invalid',
      reasonCode: 'invalid-provider-input',
      providerKind,
      providerDescriptor,
      event: omittedEvent(),
      providerAck: createNoAckDecision(requiresProviderAck, 'invalid-provider-input'),
      issues,
    });
  }

  const authorRef = optionalRef(eventRecord.authorId, 'actor', 'unknown');
  const receivedAt = normalizeIsoTimestamp(receivedAtInput) ?? DEFAULT_RECEIVED_AT;
  const occurredAt = normalizeIsoTimestamp(eventRecord.occurredAt);
  const text = projectSafeText(eventRecord.text, issues, componentRef);
  const command = projectCommand(eventRecord, text, providerKind, issues, componentRef);
  const topicDisplay = projectDisplayTitle(eventRecord.topicTitle, issues, componentRef);
  const callbackRef = eventKind === 'callback' ? optionalRef(eventRecord.callbackId, `${providerKind}-callback`, 'unavailable') : undefined;
  const systemKind = eventKind === 'system' ? normalizeSystemKind(eventRecord.systemKind) : undefined;
  const eventId = safeRef(`${providerKind}-event`, eventRecord.eventId);
  const stableInput = [providerKind, eventKind, channelRef, chatRef, threadRef, messageRef, callbackRef ?? '', systemKind ?? ''].join('|');
  const eventRef = eventId ?? `channel-event:${deterministicHash(stableInput)}`;
  const idempotencyKey = `channel-event-idem:${deterministicHash(`${eventRef}|${stableInput}`)}`;

  const baseEvent = {
    descriptorKind: 'openclaw-telegram-channel-event',
    descriptorVersion: 'w14b',
    providerKind,
    eventKind,
    eventRef,
    idempotencyKey,
    channelRef,
    chatRef,
    threadRef,
    messageRef,
    authorRef,
    receivedAt,
    unsupportedFieldCount: unsupported.unsupportedFieldCount,
    redactedFieldCount: unsupported.redactedFieldCount,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies Omit<SafeChannelEventDto, 'systemKind' | 'occurredAt' | 'text' | 'command' | 'callbackRef' | 'topicDisplay'>;

  const event = Object.freeze({
    ...baseEvent,
    ...(systemKind === undefined ? {} : { systemKind }),
    ...(occurredAt === undefined ? {} : { occurredAt }),
    ...(text === undefined ? {} : { text }),
    ...(command === undefined ? {} : { command }),
    ...(callbackRef === undefined ? {} : { callbackRef }),
    ...(topicDisplay === undefined ? {} : { topicDisplay }),
  } satisfies SafeChannelEventDto);

  issues.push(createIssue('normalized-event', 'info', componentRef, 'Provider event was normalized into a safe DTO'));

  return createResult({
    ok: true,
    status: 'normalized',
    reasonCode: 'normalized-event',
    providerKind,
    providerDescriptor,
    event,
    providerAck: createAckDecision(requiresProviderAck, 'normalized-event'),
    issues,
  });
}

export function isSafeChannelEventSourceJson(value: unknown): boolean {
  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === 'string' && !UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(encoded));
  } catch {
    return false;
  }
}
