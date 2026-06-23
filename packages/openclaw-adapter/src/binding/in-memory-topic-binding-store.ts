import {
  adapterErr,
  adapterOk,
} from '../contracts/result.js';
import type {
  AdapterOperationResult,
  AdapterSafeErrorCode,
} from '../contracts/result.js';
import {
  createTelegramTopicBindingKey,
  createTelegramTopicBindingSnapshot,
  isTelegramTopicBindingKey,
} from './topic-binding.js';
import type {
  TelegramTopicBindingCoordinates,
  TelegramTopicBindingCreateInput,
  TelegramTopicBindingKey,
  TelegramTopicBindingSnapshot,
} from './topic-binding.js';

export type TelegramTopicBindingLookupInput =
  | { readonly key: TelegramTopicBindingKey }
  | TelegramTopicBindingCoordinates;

export interface TelegramTopicBindingDisableInput {
  readonly key?: TelegramTopicBindingKey;
  readonly channelId?: string;
  readonly chatId?: string;
  readonly messageThreadId?: string;
  readonly updatedAt?: string;
}

export interface InMemoryTelegramTopicBindingStore {
  readonly upsert: (
    input: TelegramTopicBindingCreateInput,
  ) => AdapterOperationResult<TelegramTopicBindingSnapshot>;
  readonly getByKey: (
    key: TelegramTopicBindingKey,
  ) => AdapterOperationResult<TelegramTopicBindingSnapshot | null>;
  readonly getByTopic: (
    input: TelegramTopicBindingCoordinates,
  ) => AdapterOperationResult<TelegramTopicBindingSnapshot | null>;
  readonly disable: (
    input: TelegramTopicBindingDisableInput,
  ) => AdapterOperationResult<TelegramTopicBindingSnapshot>;
  readonly list: () => AdapterOperationResult<readonly TelegramTopicBindingSnapshot[]>;
}

function operationFailure<T>(
  code: AdapterSafeErrorCode,
  message: string,
): AdapterOperationResult<T> {
  return adapterErr({ code, message });
}

function hasSameTarget(
  left: TelegramTopicBindingSnapshot,
  right: TelegramTopicBindingSnapshot,
): boolean {
  return (
    left.workspaceRef === right.workspaceRef &&
    left.agentRef === right.agentRef &&
    left.hostSessionRef === right.hostSessionRef
  );
}

function resolveLookupKey(input: TelegramTopicBindingLookupInput): TelegramTopicBindingKey {
  if ('key' in input) {
    if (!isTelegramTopicBindingKey(input.key)) {
      throw new TypeError('Telegram topic binding key is invalid.');
    }

    return input.key;
  }

  return createTelegramTopicBindingKey(input);
}

function resolveDisableKey(input: TelegramTopicBindingDisableInput): TelegramTopicBindingKey {
  if (input.key !== undefined) {
    if (!isTelegramTopicBindingKey(input.key)) {
      throw new TypeError('Telegram topic binding key is invalid.');
    }

    return input.key;
  }

  return createTelegramTopicBindingKey({
    channelId: input.channelId as string,
    chatId: input.chatId as string,
    messageThreadId: input.messageThreadId as string,
  });
}

function disableSnapshot(
  snapshot: TelegramTopicBindingSnapshot,
  updatedAt: string | undefined,
): TelegramTopicBindingSnapshot {
  const disabled = {
    ...snapshot,
    status: 'disabled',
    ...(updatedAt === undefined ? {} : { updatedAt }),
  } satisfies TelegramTopicBindingSnapshot;

  return Object.freeze(disabled);
}

export function createInMemoryTelegramTopicBindingStore(): InMemoryTelegramTopicBindingStore {
  const bindings = new Map<TelegramTopicBindingKey, TelegramTopicBindingSnapshot>();

  return Object.freeze({
    upsert(input: TelegramTopicBindingCreateInput): AdapterOperationResult<TelegramTopicBindingSnapshot> {
      try {
        const nextSnapshot = createTelegramTopicBindingSnapshot(input);
        const existingSnapshot = bindings.get(nextSnapshot.key);

        if (
          existingSnapshot !== undefined &&
          existingSnapshot.status === 'enabled' &&
          nextSnapshot.status === 'enabled' &&
          !hasSameTarget(existingSnapshot, nextSnapshot)
        ) {
          return operationFailure(
            'conflict',
            'Active Telegram topic binding already exists for these canonical coordinates.',
          );
        }

        const storedSnapshot = existingSnapshot === undefined
          ? nextSnapshot
          : Object.freeze({ ...existingSnapshot, ...nextSnapshot }) as TelegramTopicBindingSnapshot;

        bindings.set(storedSnapshot.key, storedSnapshot);
        return adapterOk(storedSnapshot);
      } catch (error) {
        return operationFailure(
          'invalid-input',
          error instanceof Error ? error.message : 'Invalid Telegram topic binding input.',
        );
      }
    },

    getByKey(key: TelegramTopicBindingKey): AdapterOperationResult<TelegramTopicBindingSnapshot | null> {
      if (!isTelegramTopicBindingKey(key)) {
        return operationFailure('invalid-input', 'Telegram topic binding key is invalid.');
      }

      return adapterOk(bindings.get(key) ?? null);
    },

    getByTopic(
      input: TelegramTopicBindingCoordinates,
    ): AdapterOperationResult<TelegramTopicBindingSnapshot | null> {
      try {
        const key = resolveLookupKey(input);
        return adapterOk(bindings.get(key) ?? null);
      } catch (error) {
        return operationFailure(
          'invalid-input',
          error instanceof Error ? error.message : 'Invalid Telegram topic binding coordinates.',
        );
      }
    },

    disable(input: TelegramTopicBindingDisableInput): AdapterOperationResult<TelegramTopicBindingSnapshot> {
      try {
        const key = resolveDisableKey(input);
        const existingSnapshot = bindings.get(key);
        if (existingSnapshot === undefined) {
          return operationFailure('not-found', 'Telegram topic binding was not found.');
        }

        const disabled = disableSnapshot(existingSnapshot, input.updatedAt);
        bindings.set(key, disabled);
        return adapterOk(disabled);
      } catch (error) {
        return operationFailure(
          'invalid-input',
          error instanceof Error ? error.message : 'Invalid Telegram topic binding disable input.',
        );
      }
    },

    list(): AdapterOperationResult<readonly TelegramTopicBindingSnapshot[]> {
      const snapshots = Object.freeze(
        Array.from(bindings.values()).sort((left, right) => left.key.localeCompare(right.key)),
      );

      return adapterOk(snapshots);
    },
  });
}
