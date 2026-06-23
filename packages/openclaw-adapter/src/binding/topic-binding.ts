const FORBIDDEN_METADATA_KEYS = new Set([
  'rawUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderPayload',
  'providerPayload',
  ['bot', 'Token'].join(''),
  ['api', 'Key'].join(''),
  ['sec', 'ret'].join(''),
  ['creden', 'tial'].join(''),
  ['creden', 'tials'].join(''),
  'stack',
]);

export type OpenClawWorkspaceId = string;
export type OpenClawTopicId = string;
export type OpenClawChannelId = string;
export type OpenClawAgentId = string;
export type OpenClawSessionId = string;

export type TopicBindingStatus = 'active' | 'paused' | 'disabled';

export type SafeTopicBindingMetadata =
  | string
  | number
  | boolean
  | null
  | readonly SafeTopicBindingMetadata[]
  | { readonly [key: string]: SafeTopicBindingMetadata };

export interface TopicBindingKey {
  readonly workspaceId: OpenClawWorkspaceId;
  readonly channelId: OpenClawChannelId;
  readonly topicId: OpenClawTopicId;
}

export interface TopicBindingKeyInput {
  readonly workspaceId: OpenClawWorkspaceId;
  readonly channelId: OpenClawChannelId;
  readonly topicId: OpenClawTopicId;
}

export interface TopicBindingSnapshot {
  readonly key: TopicBindingKey;
  readonly status: TopicBindingStatus;
  readonly agentId: OpenClawAgentId;
  readonly sessionId: OpenClawSessionId;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
  readonly metadata?: SafeTopicBindingMetadata;
}

export interface TopicBindingSnapshotInput {
  readonly key: TopicBindingKeyInput;
  readonly status: TopicBindingStatus;
  readonly agentId: OpenClawAgentId;
  readonly sessionId: OpenClawSessionId;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
  readonly metadata?: SafeTopicBindingMetadata;
}

function normalizeRequiredString(fieldName: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new TypeError(`${fieldName} must be non-empty.`);
  }

  return normalized;
}

function assertPlainMetadataObject(value: object): void {
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Topic binding metadata must contain only JSON-like plain objects.');
  }
}

function cloneSafeMetadata(value: unknown, path = 'metadata'): SafeTopicBindingMetadata {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must not contain non-finite numbers.`);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map((item, index) => cloneSafeMetadata(item, `${path}[${index}]`)));
  }

  if (typeof value === 'object') {
    assertPlainMetadataObject(value);

    const clonedEntries: Record<string, SafeTopicBindingMetadata> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (FORBIDDEN_METADATA_KEYS.has(key)) {
        throw new TypeError(`Topic binding metadata must not contain unsafe field ${key}.`);
      }

      if (key.trim().length === 0) {
        throw new TypeError('Topic binding metadata keys must be non-empty.');
      }

      clonedEntries[key] = cloneSafeMetadata(nestedValue, `${path}.${key}`);
    }

    return Object.freeze(clonedEntries);
  }

  throw new TypeError(`${path} must contain only JSON-like metadata values.`);
}

export function isTopicBindingStatus(value: unknown): value is TopicBindingStatus {
  return value === 'active' || value === 'paused' || value === 'disabled';
}

export function createTopicBindingKey(input: TopicBindingKeyInput): TopicBindingKey {
  return Object.freeze({
    workspaceId: normalizeRequiredString('workspaceId', input.workspaceId),
    channelId: normalizeRequiredString('channelId', input.channelId),
    topicId: normalizeRequiredString('topicId', input.topicId),
  });
}

export function serializeTopicBindingKey(key: TopicBindingKeyInput): string {
  const normalizedKey = createTopicBindingKey(key);
  const workspaceId = encodeURIComponent(normalizedKey.workspaceId);
  const channelId = encodeURIComponent(normalizedKey.channelId);
  const topicId = encodeURIComponent(normalizedKey.topicId);

  return `topic-binding:workspace=${workspaceId}:channel=${channelId}:topic=${topicId}`;
}

export function createTopicBindingSnapshot(input: TopicBindingSnapshotInput): TopicBindingSnapshot {
  if (!isTopicBindingStatus(input.status)) {
    throw new TypeError('Topic binding status must be active, paused, or disabled.');
  }

  const metadata = input.metadata === undefined ? undefined : cloneSafeMetadata(input.metadata);
  const snapshot = {
    key: createTopicBindingKey(input.key),
    status: input.status,
    agentId: normalizeRequiredString('agentId', input.agentId),
    sessionId: normalizeRequiredString('sessionId', input.sessionId),
    createdAtIso: normalizeRequiredString('createdAtIso', input.createdAtIso),
    updatedAtIso: normalizeRequiredString('updatedAtIso', input.updatedAtIso),
    ...(metadata === undefined ? {} : { metadata }),
  } satisfies TopicBindingSnapshot;

  return Object.freeze(snapshot);
}

export function cloneTopicBindingSnapshot(snapshot: TopicBindingSnapshot): TopicBindingSnapshot {
  return createTopicBindingSnapshot(snapshot);
}
