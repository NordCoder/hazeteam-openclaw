const FORBIDDEN_FAKE_PUBLIC_FIELD_NAMES = new Set([
  'apikey',
  'authorization',
  'bottoken',
  'callbackpayload',
  'credential',
  'endpoint',
  'filesystempath',
  'password',
  'passwd',
  'rawcallbackpayload',
  'rawerror',
  'rawproviderpayload',
  'rawproviderresponse',
  'rawruntimevalue',
  'secret',
  'sdkhandle',
  'stack',
  'token',
]);

const FORBIDDEN_FAKE_PUBLIC_STRING_TERMS = [
  'apiKey',
  'authorization',
  'botToken',
  'credential',
  'endpoint',
  'filesystemPath',
  'password',
  'rawCallbackPayload',
  'rawProviderPayload',
  'rawProviderResponse',
  'rawRuntimeValue',
  'sdkHandle',
  'secret',
  'stack',
  'token',
] as const;

const FORBIDDEN_FAKE_PUBLIC_TERM_PATTERN = new RegExp(
  `\\b(?:${FORBIDDEN_FAKE_PUBLIC_STRING_TERMS.map(escapeRegExp).join('|')})\\b`,
  'giu',
);

export interface FakeDeliveryAttemptBoundarySnapshotEntry {
  readonly key: string;
  readonly record: unknown;
}

export interface FakeDeliveryAttemptRecordBoundary {
  readonly read: (key: string) => unknown | undefined;
  readonly write: (key: string, record: unknown) => void;
  readonly list: (prefix: string) => readonly unknown[];
  readonly snapshot: () => readonly FakeDeliveryAttemptBoundarySnapshotEntry[];
  readonly clear: () => void;
  readonly size: () => number;
}

export interface FakeReplaySafeDeliveryExecutionInput<T> {
  readonly idempotencyKey: string;
  readonly execute: () => T | Promise<T>;
}

export type FakeReplaySafeDeliveryExecution<T> =
  | {
      readonly executionStatus: 'executed';
      readonly idempotencyKey: string;
      readonly result: T;
    }
  | {
      readonly executionStatus: 'duplicate';
      readonly idempotencyKey: string;
    };

export interface FakeReplaySafeDeliveryExecutor {
  readonly submitOnce: <T>(
    input: FakeReplaySafeDeliveryExecutionInput<T>,
  ) => Promise<FakeReplaySafeDeliveryExecution<T>>;
  readonly executedKeys: () => readonly string[];
  readonly reset: () => void;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function resetPattern(pattern: RegExp): void {
  pattern.lastIndex = 0;
}

function assertSafeKey(input: string, label: string): void {
  if (typeof input !== 'string' || input.trim() !== input || input.length === 0) {
    throw new TypeError(`${label} must be a non-empty stable key.`);
  }
}

function rejectForbiddenFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectForbiddenFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (FORBIDDEN_FAKE_PUBLIC_FIELD_NAMES.has(normalizeFieldName(fieldName))) {
      throw new TypeError(`${label} must not include unsafe public fields.`);
    }
    rejectForbiddenFields(value, label, seen);
  }
}

function rejectForbiddenStringValues(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input === 'string') {
    resetPattern(FORBIDDEN_FAKE_PUBLIC_TERM_PATTERN);
    if (FORBIDDEN_FAKE_PUBLIC_TERM_PATTERN.test(input)) {
      throw new TypeError(`${label} must not include unsafe public string values.`);
    }
    return;
  }

  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectForbiddenStringValues(value, label, seen);
    }
    return;
  }

  for (const value of Object.values(input)) {
    rejectForbiddenStringValues(value, label, seen);
  }
}

function deepFreeze<T>(input: T, seen = new Set<object>()): T {
  if (typeof input !== 'object' || input === null || seen.has(input)) {
    return input;
  }

  seen.add(input);
  Object.freeze(input);
  for (const value of Object.values(input as Record<string, unknown>)) {
    deepFreeze(value, seen);
  }

  return input;
}

function cloneSafeJson<T>(input: T, label: string): T {
  rejectForbiddenFields(input, label);

  let serialized: string;
  try {
    const candidate = JSON.stringify(input);
    if (candidate === undefined) {
      throw new TypeError('JSON serialization returned undefined.');
    }
    serialized = candidate;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON serialization failed';
    throw new TypeError(`${label} must be JSON serializable: ${message}`);
  }

  const parsed = JSON.parse(serialized) as T;
  rejectForbiddenFields(parsed, label);
  rejectForbiddenStringValues(parsed, label);
  return deepFreeze(parsed);
}

export function createFakeDeliveryAttemptRecordBoundary(
  initialEntries: readonly FakeDeliveryAttemptBoundarySnapshotEntry[] = [],
): FakeDeliveryAttemptRecordBoundary {
  const records = new Map<string, unknown>();

  for (const entry of initialEntries) {
    assertSafeKey(entry.key, 'Fake delivery attempt boundary initial key');
    records.set(entry.key, cloneSafeJson(entry.record, 'Fake delivery attempt boundary initial record'));
  }

  return Object.freeze({
    read(key: string): unknown | undefined {
      assertSafeKey(key, 'Fake delivery attempt boundary read key');
      return records.get(key);
    },

    write(key: string, record: unknown): void {
      assertSafeKey(key, 'Fake delivery attempt boundary write key');
      records.set(key, cloneSafeJson(record, 'Fake delivery attempt boundary record'));
    },

    list(prefix: string): readonly unknown[] {
      assertSafeKey(prefix, 'Fake delivery attempt boundary list prefix');
      return Object.freeze(
        [...records.entries()]
          .filter(([key]) => key.startsWith(prefix))
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([, record]) => record),
      );
    },

    snapshot(): readonly FakeDeliveryAttemptBoundarySnapshotEntry[] {
      return Object.freeze(
        [...records.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, record]) =>
            Object.freeze({
              key,
              record,
            }),
          ),
      );
    },

    clear(): void {
      records.clear();
    },

    size(): number {
      return records.size;
    },
  });
}

export function createReplaySafeFakeDeliveryExecutor(): FakeReplaySafeDeliveryExecutor {
  const executed = new Set<string>();

  return Object.freeze({
    async submitOnce<T>(
      input: FakeReplaySafeDeliveryExecutionInput<T>,
    ): Promise<FakeReplaySafeDeliveryExecution<T>> {
      assertSafeKey(input.idempotencyKey, 'Fake replay-safe delivery idempotencyKey');
      if (executed.has(input.idempotencyKey)) {
        return Object.freeze({
          executionStatus: 'duplicate' as const,
          idempotencyKey: input.idempotencyKey,
        });
      }

      executed.add(input.idempotencyKey);
      const result = await input.execute();
      return Object.freeze({
        executionStatus: 'executed' as const,
        idempotencyKey: input.idempotencyKey,
        result,
      });
    },

    executedKeys(): readonly string[] {
      return Object.freeze([...executed].sort());
    },

    reset(): void {
      executed.clear();
    },
  });
}
