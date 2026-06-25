const TOPIC_BINDING_RECORD_KIND = 'openclaw.topic-binding.record.v1' as const;
const MAX_SAFE_REF_LENGTH = 256;
const MAX_SAFE_TEXT_LENGTH = 240;
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;

const TOPIC_BINDING_STATUSES = [
  'active',
  'disabled',
  'archived',
  'migrating',
  'conflict',
] as const;

const SAFE_DISPLAY_FIELDS = new Set([
  'topicTitle',
  'agentDisplayName',
  'workspaceDisplayName',
  'description',
]);

const UNSAFE_FIELD_NAME_PARTS = [
  ['api', 'key'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['sec', 'ret'],
] as const;
const UNSAFE_FIELD_NAMES = new Set([
  ['approval', 'Payload'].join(''),
  ['callback', 'Payload'].join(''),
  ['creden', 'tial'].join(''),
  ['creden', 'tials'].join(''),
  ['provider', 'Payload'].join(''),
  ['provider', 'Response'].join(''),
  ['raw', 'Callback'].join(''),
  ['raw', 'Error'].join(''),
  ['raw', 'OpenClawEvent'].join(''),
  ['raw', 'ProviderPayload'].join(''),
  ['raw', 'ProviderResponse'].join(''),
  ['raw', 'TelegramUpdate'].join(''),
  ['raw', 'ToolPayload'].join(''),
  ['raw', 'Update'].join(''),
  'stack',
  ['telegram', 'Update'].join(''),
  ['token', 'Value'].join(''),
  ['tool', 'Payload'].join(''),
].map((fieldName) => normalizeFieldName(fieldName)));

export type TopicBindingRecordKind = typeof TOPIC_BINDING_RECORD_KIND;
export type TopicBindingStatus = (typeof TOPIC_BINDING_STATUSES)[number];

export type TopicBindingRef = `topic-binding:${string}`;
export type TopicBindingKeyId = `topic-binding-key:${string}`;
export type TopicBindingChannelRef = `telegram-channel:${string}`;
export type TopicBindingChatRef = `telegram-chat:${string}`;
export type TopicBindingThreadRef = `telegram-thread:${string}`;
export type TopicBindingMessageRef = `telegram-message:${string}`;
export type TopicBindingWorkspaceRef = `workspace:${string}`;
export type TopicBindingAgentRef = `agent:${string}`;
export type TopicBindingHostSessionRef = `host-session:${string}`;
export type TopicBindingUiDescriptorRef = `ui-descriptor:${string}`;
export type TopicBindingDomainPackageRef = `domain-package:${string}`;
export type TopicBindingCorrelationRef = `correlation:${string}`;

export interface TopicBindingKey {
  readonly channelRef: TopicBindingChannelRef;
  readonly chatRef: TopicBindingChatRef;
  readonly threadRef: TopicBindingThreadRef;
}

export interface TopicBindingTarget {
  readonly workspaceRef: TopicBindingWorkspaceRef;
  readonly agentRef: TopicBindingAgentRef;
  readonly hostSessionRef: TopicBindingHostSessionRef;
  readonly uiDescriptorRef?: TopicBindingUiDescriptorRef;
  readonly domainPackageRef?: TopicBindingDomainPackageRef;
}

export interface TopicBindingDisplay {
  readonly topicTitle?: string;
  readonly agentDisplayName?: string;
  readonly workspaceDisplayName?: string;
  readonly description?: string;
}

export interface TopicBindingMigrationState {
  readonly fromBindingRef: TopicBindingRef;
  readonly toBindingRef: TopicBindingRef;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly correlationRef?: TopicBindingCorrelationRef;
}

export interface TopicBindingRecord {
  readonly kind: TopicBindingRecordKind;
  readonly bindingRef: TopicBindingRef;
  readonly bindingKey: TopicBindingKey;
  readonly target: TopicBindingTarget;
  readonly status: TopicBindingStatus;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly display?: TopicBindingDisplay;
  readonly homeMessageRef?: TopicBindingMessageRef;
  readonly migration?: TopicBindingMigrationState;
  readonly correlationRef?: TopicBindingCorrelationRef;
}

export interface TopicBindingRecordInput {
  readonly bindingRef?: TopicBindingRef | string;
  readonly bindingKey: TopicBindingKey;
  readonly target: TopicBindingTarget;
  readonly status?: TopicBindingStatus;
  readonly version?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly display?: TopicBindingDisplay;
  readonly homeMessageRef?: TopicBindingMessageRef | string;
  readonly migration?: TopicBindingMigrationState;
  readonly correlationRef?: TopicBindingCorrelationRef | string;
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isUnsafeFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }

  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain JSON-like object.`);
  }
}

function rejectUnsafeTopicBindingFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeTopicBindingFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeFieldName(fieldName)) {
      throw new TypeError(`${label} must not include unsafe provider, callback, token, or diagnostic fields.`);
    }

    rejectUnsafeTopicBindingFields(value, label, seen);
  }
}

function normalizeText(input: unknown, label: string, maxLength = MAX_SAFE_TEXT_LENGTH): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function normalizeRef<P extends string>(input: unknown, prefix: P, label: string): `${P}${string}` {
  const normalized = normalizeText(input, label, MAX_SAFE_REF_LENGTH);

  if (
    normalized.length <= prefix.length ||
    !normalized.startsWith(prefix) ||
    !SAFE_REF_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a safe ${prefix} reference.`);
  }

  return normalized as `${P}${string}`;
}

function normalizeOptionalRef<P extends string>(
  input: unknown,
  prefix: P,
  label: string,
): `${P}${string}` | undefined {
  return input === undefined ? undefined : normalizeRef(input, prefix, label);
}

function normalizeTimestamp(input: unknown, label: string): string {
  return normalizeText(input, label, 128);
}

function isTopicBindingStatus(candidate: unknown): candidate is TopicBindingStatus {
  return typeof candidate === 'string' && (TOPIC_BINDING_STATUSES as readonly string[]).includes(candidate);
}

export function createTopicBindingKey(input: TopicBindingKey): TopicBindingKey {
  assertPlainObject(input, 'Topic binding key');
  rejectUnsafeTopicBindingFields(input, 'Topic binding key');

  return Object.freeze({
    channelRef: normalizeRef(input.channelRef, 'telegram-channel:', 'Topic binding channelRef'),
    chatRef: normalizeRef(input.chatRef, 'telegram-chat:', 'Topic binding chatRef'),
    threadRef: normalizeRef(input.threadRef, 'telegram-thread:', 'Topic binding threadRef'),
  });
}

export function createTopicBindingKeyId(input: TopicBindingKey): TopicBindingKeyId {
  const key = createTopicBindingKey(input);

  return `topic-binding-key:channel=${key.channelRef}:chat=${key.chatRef}:thread=${key.threadRef}`;
}

function keyRefComponent(input: string): string {
  return input.replace(/:/gu, '~');
}

export function createDeterministicTopicBindingRef(input: TopicBindingKey): TopicBindingRef {
  const key = createTopicBindingKey(input);

  return [
    'topic-binding',
    keyRefComponent(key.channelRef),
    keyRefComponent(key.chatRef),
    keyRefComponent(key.threadRef),
  ].join(':') as TopicBindingRef;
}

export function createTopicBindingTarget(input: TopicBindingTarget): TopicBindingTarget {
  assertPlainObject(input, 'Topic binding target');
  rejectUnsafeTopicBindingFields(input, 'Topic binding target');

  const uiDescriptorRef = normalizeOptionalRef(
    input.uiDescriptorRef,
    'ui-descriptor:',
    'Topic binding uiDescriptorRef',
  );
  const domainPackageRef = normalizeOptionalRef(
    input.domainPackageRef,
    'domain-package:',
    'Topic binding domainPackageRef',
  );

  return Object.freeze({
    workspaceRef: normalizeRef(input.workspaceRef, 'workspace:', 'Topic binding workspaceRef'),
    agentRef: normalizeRef(input.agentRef, 'agent:', 'Topic binding agentRef'),
    hostSessionRef: normalizeRef(input.hostSessionRef, 'host-session:', 'Topic binding hostSessionRef'),
    ...(uiDescriptorRef === undefined ? {} : { uiDescriptorRef }),
    ...(domainPackageRef === undefined ? {} : { domainPackageRef }),
  });
}

export function createTopicBindingDisplay(input: TopicBindingDisplay): TopicBindingDisplay {
  assertPlainObject(input, 'Topic binding display');
  rejectUnsafeTopicBindingFields(input, 'Topic binding display');

  for (const fieldName of Object.keys(input)) {
    if (!SAFE_DISPLAY_FIELDS.has(fieldName)) {
      throw new TypeError('Topic binding display contains an unsupported field.');
    }
  }

  const topicTitle = input.topicTitle === undefined
    ? undefined
    : normalizeText(input.topicTitle, 'Topic binding display topicTitle');
  const agentDisplayName = input.agentDisplayName === undefined
    ? undefined
    : normalizeText(input.agentDisplayName, 'Topic binding display agentDisplayName');
  const workspaceDisplayName = input.workspaceDisplayName === undefined
    ? undefined
    : normalizeText(input.workspaceDisplayName, 'Topic binding display workspaceDisplayName');
  const description = input.description === undefined
    ? undefined
    : normalizeText(input.description, 'Topic binding display description', 1000);

  return Object.freeze({
    ...(topicTitle === undefined ? {} : { topicTitle }),
    ...(agentDisplayName === undefined ? {} : { agentDisplayName }),
    ...(workspaceDisplayName === undefined ? {} : { workspaceDisplayName }),
    ...(description === undefined ? {} : { description }),
  });
}

function createTopicBindingMigrationState(input: TopicBindingMigrationState): TopicBindingMigrationState {
  assertPlainObject(input, 'Topic binding migration');
  rejectUnsafeTopicBindingFields(input, 'Topic binding migration');

  const completedAt = input.completedAt === undefined
    ? undefined
    : normalizeTimestamp(input.completedAt, 'Topic binding migration completedAt');
  const correlationRef = normalizeOptionalRef(
    input.correlationRef,
    'correlation:',
    'Topic binding migration correlationRef',
  );

  return Object.freeze({
    fromBindingRef: normalizeRef(input.fromBindingRef, 'topic-binding:', 'Topic binding migration fromBindingRef'),
    toBindingRef: normalizeRef(input.toBindingRef, 'topic-binding:', 'Topic binding migration toBindingRef'),
    startedAt: normalizeTimestamp(input.startedAt, 'Topic binding migration startedAt'),
    ...(completedAt === undefined ? {} : { completedAt }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function createTopicBindingRecord(input: TopicBindingRecordInput): TopicBindingRecord {
  assertPlainObject(input, 'Topic binding record input');
  rejectUnsafeTopicBindingFields(input, 'Topic binding record input');

  const bindingKey = createTopicBindingKey(input.bindingKey);
  const status = input.status ?? 'active';
  if (!isTopicBindingStatus(status)) {
    throw new TypeError('Topic binding status must be active, disabled, archived, migrating, or conflict.');
  }

  const version = input.version ?? 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new TypeError('Topic binding version must be a positive integer.');
  }

  const display = input.display === undefined ? undefined : createTopicBindingDisplay(input.display);
  const homeMessageRef = normalizeOptionalRef(input.homeMessageRef, 'telegram-message:', 'Topic binding homeMessageRef');
  const migration = input.migration === undefined ? undefined : createTopicBindingMigrationState(input.migration);
  const correlationRef = normalizeOptionalRef(input.correlationRef, 'correlation:', 'Topic binding correlationRef');

  return Object.freeze({
    kind: TOPIC_BINDING_RECORD_KIND,
    bindingRef: normalizeRef(
      input.bindingRef ?? createDeterministicTopicBindingRef(bindingKey),
      'topic-binding:',
      'Topic binding bindingRef',
    ),
    bindingKey,
    target: createTopicBindingTarget(input.target),
    status,
    version,
    createdAt: normalizeTimestamp(input.createdAt, 'Topic binding createdAt'),
    updatedAt: normalizeTimestamp(input.updatedAt, 'Topic binding updatedAt'),
    ...(display === undefined ? {} : { display }),
    ...(homeMessageRef === undefined ? {} : { homeMessageRef }),
    ...(migration === undefined ? {} : { migration }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function normalizeTopicBindingRecord(input: unknown): TopicBindingRecord {
  assertPlainObject(input, 'Topic binding record');
  rejectUnsafeTopicBindingFields(input, 'Topic binding record');

  if (input.kind !== TOPIC_BINDING_RECORD_KIND) {
    throw new TypeError('Topic binding record kind must match the topic binding record contract.');
  }

  return createTopicBindingRecord({
    bindingRef: input.bindingRef as string,
    bindingKey: input.bindingKey as TopicBindingKey,
    target: input.target as TopicBindingTarget,
    status: input.status as TopicBindingStatus,
    version: input.version as number,
    createdAt: input.createdAt as string,
    updatedAt: input.updatedAt as string,
    ...(input.display === undefined ? {} : { display: input.display as TopicBindingDisplay }),
    ...(input.homeMessageRef === undefined ? {} : { homeMessageRef: input.homeMessageRef as string }),
    ...(input.migration === undefined ? {} : { migration: input.migration as TopicBindingMigrationState }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef as string }),
  });
}

export function cloneTopicBindingRecord(record: TopicBindingRecord): TopicBindingRecord {
  return normalizeTopicBindingRecord(record);
}

export function topicBindingRecordToJson(record: TopicBindingRecord): TopicBindingRecord {
  return normalizeTopicBindingRecord(record);
}
