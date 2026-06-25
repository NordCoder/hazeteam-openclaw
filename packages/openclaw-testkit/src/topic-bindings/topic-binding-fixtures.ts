const DEFAULT_CREATED_AT = '2026-06-25T00:00:00.000Z';
const DEFAULT_UPDATED_AT = '2026-06-25T00:00:00.000Z';
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const MAX_SAFE_REF_LENGTH = 256;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;

export type FakeTopicBindingStatus = 'active' | 'disabled' | 'archived' | 'migrating' | 'conflict';
export type FakeTopicBindingRef = `topic-binding:${string}`;
export type FakeTopicBindingKeyId = `topic-binding-key:${string}`;
export type FakeTopicBindingChannelRef = `telegram-channel:${string}`;
export type FakeTopicBindingChatRef = `telegram-chat:${string}`;
export type FakeTopicBindingThreadRef = `telegram-thread:${string}`;
export type FakeTopicBindingWorkspaceRef = `workspace:${string}`;
export type FakeTopicBindingAgentRef = `agent:${string}`;
export type FakeTopicBindingHostSessionRef = `host-session:${string}`;
export type FakeTopicBindingCorrelationRef = `correlation:${string}`;

export interface FakeTopicBindingKey {
  readonly channelRef: FakeTopicBindingChannelRef;
  readonly chatRef: FakeTopicBindingChatRef;
  readonly threadRef: FakeTopicBindingThreadRef;
}

export interface FakeTopicBindingTarget {
  readonly workspaceRef: FakeTopicBindingWorkspaceRef;
  readonly agentRef: FakeTopicBindingAgentRef;
  readonly hostSessionRef: FakeTopicBindingHostSessionRef;
}

export interface FakeTopicBindingDisplay {
  readonly topicTitle?: string;
  readonly agentDisplayName?: string;
  readonly workspaceDisplayName?: string;
}

export interface FakeTopicBindingRecord {
  readonly kind: 'openclaw.topic-binding.record.v1';
  readonly bindingRef: FakeTopicBindingRef;
  readonly bindingKey: FakeTopicBindingKey;
  readonly target: FakeTopicBindingTarget;
  readonly status: FakeTopicBindingStatus;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly display?: FakeTopicBindingDisplay;
  readonly correlationRef?: FakeTopicBindingCorrelationRef;
}

export interface FakeTopicBindingRecordOverrides {
  readonly bindingRef?: FakeTopicBindingRef | string;
  readonly bindingKey?: Partial<FakeTopicBindingKey>;
  readonly target?: Partial<FakeTopicBindingTarget>;
  readonly status?: FakeTopicBindingStatus;
  readonly version?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly display?: FakeTopicBindingDisplay;
  readonly correlationRef?: FakeTopicBindingCorrelationRef | string;
}

function sanitizeRef(input: unknown, prefix: string, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (
    normalized.length <= prefix.length ||
    normalized.length > MAX_SAFE_REF_LENGTH ||
    !normalized.startsWith(prefix) ||
    !SAFE_REF_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a safe ${prefix} reference.`);
  }

  return normalized;
}

function sanitizeText(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > 240) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function keyRefComponent(input: string): string {
  return input.replace(/:/gu, '~');
}

export function createFakeTopicBindingKeyId(key: FakeTopicBindingKey): FakeTopicBindingKeyId {
  const channelRef = sanitizeRef(key.channelRef, 'telegram-channel:', 'Fake topic binding channelRef');
  const chatRef = sanitizeRef(key.chatRef, 'telegram-chat:', 'Fake topic binding chatRef');
  const threadRef = sanitizeRef(key.threadRef, 'telegram-thread:', 'Fake topic binding threadRef');

  return `topic-binding-key:channel=${channelRef}:chat=${chatRef}:thread=${threadRef}`;
}

export function createFakeDeterministicTopicBindingRef(key: FakeTopicBindingKey): FakeTopicBindingRef {
  const channelRef = sanitizeRef(key.channelRef, 'telegram-channel:', 'Fake topic binding channelRef');
  const chatRef = sanitizeRef(key.chatRef, 'telegram-chat:', 'Fake topic binding chatRef');
  const threadRef = sanitizeRef(key.threadRef, 'telegram-thread:', 'Fake topic binding threadRef');

  return [
    'topic-binding',
    keyRefComponent(channelRef),
    keyRefComponent(chatRef),
    keyRefComponent(threadRef),
  ].join(':') as FakeTopicBindingRef;
}

export function createFakeTopicBindingRecord(overrides: FakeTopicBindingRecordOverrides = {}): FakeTopicBindingRecord {
  const bindingKey = Object.freeze({
    channelRef: sanitizeRef(
      overrides.bindingKey?.channelRef ?? 'telegram-channel:test-channel',
      'telegram-channel:',
      'Fake topic binding channelRef',
    ) as FakeTopicBindingChannelRef,
    chatRef: sanitizeRef(
      overrides.bindingKey?.chatRef ?? 'telegram-chat:test-chat',
      'telegram-chat:',
      'Fake topic binding chatRef',
    ) as FakeTopicBindingChatRef,
    threadRef: sanitizeRef(
      overrides.bindingKey?.threadRef ?? 'telegram-thread:test-thread',
      'telegram-thread:',
      'Fake topic binding threadRef',
    ) as FakeTopicBindingThreadRef,
  });
  const display = overrides.display === undefined
    ? undefined
    : Object.freeze({
        ...(overrides.display.topicTitle === undefined
          ? {}
          : { topicTitle: sanitizeText(overrides.display.topicTitle, 'Fake topic binding topicTitle') }),
        ...(overrides.display.agentDisplayName === undefined
          ? {}
          : { agentDisplayName: sanitizeText(overrides.display.agentDisplayName, 'Fake topic binding agentDisplayName') }),
        ...(overrides.display.workspaceDisplayName === undefined
          ? {}
          : {
              workspaceDisplayName: sanitizeText(
                overrides.display.workspaceDisplayName,
                'Fake topic binding workspaceDisplayName',
              ),
            }),
      });
  const correlationRef = overrides.correlationRef === undefined
    ? undefined
    : sanitizeRef(overrides.correlationRef, 'correlation:', 'Fake topic binding correlationRef');

  return Object.freeze({
    kind: 'openclaw.topic-binding.record.v1',
    bindingRef: sanitizeRef(
      overrides.bindingRef ?? createFakeDeterministicTopicBindingRef(bindingKey),
      'topic-binding:',
      'Fake topic binding bindingRef',
    ) as FakeTopicBindingRef,
    bindingKey,
    target: Object.freeze({
      workspaceRef: sanitizeRef(
        overrides.target?.workspaceRef ?? 'workspace:test-workspace',
        'workspace:',
        'Fake topic binding workspaceRef',
      ) as FakeTopicBindingWorkspaceRef,
      agentRef: sanitizeRef(
        overrides.target?.agentRef ?? 'agent:test-agent',
        'agent:',
        'Fake topic binding agentRef',
      ) as FakeTopicBindingAgentRef,
      hostSessionRef: sanitizeRef(
        overrides.target?.hostSessionRef ?? 'host-session:test-session',
        'host-session:',
        'Fake topic binding hostSessionRef',
      ) as FakeTopicBindingHostSessionRef,
    }),
    status: overrides.status ?? 'active',
    version: overrides.version ?? 1,
    createdAt: sanitizeText(overrides.createdAt ?? DEFAULT_CREATED_AT, 'Fake topic binding createdAt'),
    updatedAt: sanitizeText(overrides.updatedAt ?? DEFAULT_UPDATED_AT, 'Fake topic binding updatedAt'),
    ...(display === undefined ? {} : { display }),
    ...(correlationRef === undefined ? {} : { correlationRef: correlationRef as FakeTopicBindingCorrelationRef }),
  });
}
