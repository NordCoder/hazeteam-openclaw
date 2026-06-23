import {
  cloneTopicBindingSnapshot,
  createTopicBindingSnapshot,
  serializeTopicBindingKey,
} from './topic-binding.js';
import type {
  OpenClawWorkspaceId,
  TopicBindingKey,
  TopicBindingSnapshot,
} from './topic-binding.js';

export interface InMemoryTopicBindingStore {
  readonly upsert: (snapshot: TopicBindingSnapshot) => TopicBindingSnapshot;
  readonly get: (key: TopicBindingKey) => TopicBindingSnapshot | undefined;
  readonly delete: (key: TopicBindingKey) => boolean;
  readonly list: () => readonly TopicBindingSnapshot[];
  readonly listByWorkspace: (workspaceId: OpenClawWorkspaceId) => readonly TopicBindingSnapshot[];
  readonly clear: () => void;
}

function cloneSortedSnapshots(bindings: Map<string, TopicBindingSnapshot>): readonly TopicBindingSnapshot[] {
  return Object.freeze(
    Array.from(bindings.entries())
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([, snapshot]) => cloneTopicBindingSnapshot(snapshot)),
  );
}

export function createInMemoryTopicBindingStore(): InMemoryTopicBindingStore {
  const bindings = new Map<string, TopicBindingSnapshot>();

  return Object.freeze({
    upsert(snapshot: TopicBindingSnapshot): TopicBindingSnapshot {
      const storedSnapshot = createTopicBindingSnapshot(snapshot);
      bindings.set(serializeTopicBindingKey(storedSnapshot.key), storedSnapshot);

      return cloneTopicBindingSnapshot(storedSnapshot);
    },

    get(key: TopicBindingKey): TopicBindingSnapshot | undefined {
      const snapshot = bindings.get(serializeTopicBindingKey(key));
      return snapshot === undefined ? undefined : cloneTopicBindingSnapshot(snapshot);
    },

    delete(key: TopicBindingKey): boolean {
      return bindings.delete(serializeTopicBindingKey(key));
    },

    list(): readonly TopicBindingSnapshot[] {
      return cloneSortedSnapshots(bindings);
    },

    listByWorkspace(workspaceId: OpenClawWorkspaceId): readonly TopicBindingSnapshot[] {
      const normalizedWorkspaceId = String(workspaceId).trim();
      return Object.freeze(
        cloneSortedSnapshots(bindings).filter((snapshot) => snapshot.key.workspaceId === normalizedWorkspaceId),
      );
    },

    clear(): void {
      bindings.clear();
    },
  });
}
