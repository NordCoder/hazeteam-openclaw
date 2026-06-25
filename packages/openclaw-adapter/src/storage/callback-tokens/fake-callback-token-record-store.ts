import {
  callbackTokenErr,
  callbackTokenOk,
  createIssuedCallbackTokenRecord,
  markCallbackTokenConsumed,
  markCallbackTokenDenied,
  markCallbackTokenFailed,
  markCallbackTokenVerified,
  normalizeCallbackTokenHandle,
  normalizeCallbackTokenRecordRef,
  type CallbackTokenConsumeInput,
  type CallbackTokenDenyInput,
  type CallbackTokenFailInput,
  type CallbackTokenIssueInput,
  type CallbackTokenOpaqueHandle,
  type CallbackTokenPublicRecord,
  type CallbackTokenRecordRef,
  type CallbackTokenStoreResult,
  type CallbackTokenVerifyInput,
} from '../../callback-tokens/index.js';

export interface CallbackTokenIssueDecision {
  readonly status: 'issued' | 'already-issued';
  readonly replayStatus: 'fresh' | 'duplicate';
  readonly record: CallbackTokenPublicRecord;
}

export interface CallbackTokenVerifyDecision {
  readonly status: 'verified' | 'already-verified';
  readonly replayStatus: 'fresh' | 'duplicate';
  readonly record: CallbackTokenPublicRecord;
}

export interface CallbackTokenConsumeDecision {
  readonly status: 'consumed' | 'already-consumed';
  readonly replayStatus: 'fresh' | 'duplicate';
  readonly consumedThisAttempt: boolean;
  readonly record: CallbackTokenPublicRecord;
}

export interface CallbackTokenDenyDecision {
  readonly status: 'permission-denied' | 'already-denied';
  readonly replayStatus: 'fresh' | 'duplicate';
  readonly consumedThisAttempt: false;
  readonly record: CallbackTokenPublicRecord;
}

export interface CallbackTokenFailDecision {
  readonly status: 'failed';
  readonly replayStatus: 'fresh';
  readonly consumedThisAttempt: false;
  readonly record: CallbackTokenPublicRecord;
}

export interface CallbackTokenRecordStoreSnapshot {
  readonly records: readonly CallbackTokenPublicRecord[];
  readonly issuedCount: number;
  readonly verifiedCount: number;
  readonly consumedCount: number;
  readonly deniedCount: number;
  readonly failedCount: number;
}

export interface FakeCallbackTokenRecordStore {
  readonly issue: (
    input: CallbackTokenIssueInput,
  ) => CallbackTokenStoreResult<CallbackTokenIssueDecision>;
  readonly verify: (
    input: CallbackTokenVerifyInput,
  ) => CallbackTokenStoreResult<CallbackTokenVerifyDecision>;
  readonly consume: (
    input: CallbackTokenConsumeInput,
  ) => CallbackTokenStoreResult<CallbackTokenConsumeDecision>;
  readonly deny: (
    input: CallbackTokenDenyInput,
  ) => CallbackTokenStoreResult<CallbackTokenDenyDecision>;
  readonly fail: (
    input: CallbackTokenFailInput,
  ) => CallbackTokenStoreResult<CallbackTokenFailDecision>;
  readonly getPublicRecord: (
    recordRef: CallbackTokenRecordRef,
  ) => CallbackTokenStoreResult<CallbackTokenPublicRecord | null>;
  readonly listPublicRecords: () => CallbackTokenStoreResult<readonly CallbackTokenPublicRecord[]>;
  readonly snapshot: () => CallbackTokenStoreResult<CallbackTokenRecordStoreSnapshot>;
}

interface CallbackTokenStoredEntry {
  readonly tokenHandle: CallbackTokenOpaqueHandle;
  readonly record: CallbackTokenPublicRecord;
}

function clonePublicRecord(record: CallbackTokenPublicRecord): CallbackTokenPublicRecord {
  return Object.freeze({
    ...record,
    ...(record.permission === undefined ? {} : { permission: Object.freeze({ ...record.permission }) }),
  });
}

function normalizeIssueInput(input: CallbackTokenIssueInput): CallbackTokenIssueInput {
  return Object.freeze({
    ...input,
    tokenHandle: normalizeCallbackTokenHandle(input.tokenHandle),
    recordRef: normalizeCallbackTokenRecordRef(input.recordRef),
  });
}

function normalizeTokenHandleFromInput(input: { readonly tokenHandle: CallbackTokenOpaqueHandle }): CallbackTokenOpaqueHandle {
  return normalizeCallbackTokenHandle(input.tokenHandle);
}

function countByStatus(records: readonly CallbackTokenPublicRecord[], status: CallbackTokenPublicRecord['status']): number {
  return records.filter((record) => record.status === status).length;
}

function sortedPublicRecords(entries: Iterable<CallbackTokenStoredEntry>): readonly CallbackTokenPublicRecord[] {
  return Object.freeze(
    [...entries]
      .map((entry) => clonePublicRecord(entry.record))
      .sort((left, right) => left.recordRef.localeCompare(right.recordRef)),
  );
}

export function createFakeCallbackTokenRecordStore(): FakeCallbackTokenRecordStore {
  const byTokenHandle = new Map<CallbackTokenOpaqueHandle, CallbackTokenRecordRef>();
  const byRecordRef = new Map<CallbackTokenRecordRef, CallbackTokenStoredEntry>();

  function readByTokenHandle(tokenHandle: CallbackTokenOpaqueHandle): CallbackTokenStoredEntry | null {
    const recordRef = byTokenHandle.get(tokenHandle);
    if (recordRef === undefined) {
      return null;
    }

    return byRecordRef.get(recordRef) ?? null;
  }

  function writeEntry(tokenHandle: CallbackTokenOpaqueHandle, record: CallbackTokenPublicRecord): CallbackTokenStoredEntry {
    const entry = Object.freeze({ tokenHandle, record: clonePublicRecord(record) });
    byTokenHandle.set(tokenHandle, record.recordRef);
    byRecordRef.set(record.recordRef, entry);
    return entry;
  }

  return Object.freeze({
    issue(input: CallbackTokenIssueInput) {
      let normalized: CallbackTokenIssueInput;
      try {
        normalized = normalizeIssueInput(input);
      } catch {
        return callbackTokenErr({
          code: 'invalid-input',
          message: 'Callback token issue input is malformed.',
          retryable: false,
        });
      }

      const existingByHandle = readByTokenHandle(normalized.tokenHandle);
      if (existingByHandle !== null) {
        return callbackTokenOk(
          Object.freeze({
            status: 'already-issued',
            replayStatus: 'duplicate',
            record: clonePublicRecord(existingByHandle.record),
          }),
        );
      }

      const existingByRecordRef = byRecordRef.get(normalized.recordRef);
      if (existingByRecordRef !== undefined) {
        return callbackTokenErr({
          code: 'conflict',
          message: 'Callback token record ref is already assigned.',
          retryable: false,
        });
      }

      try {
        const record = createIssuedCallbackTokenRecord(normalized);
        const entry = writeEntry(normalized.tokenHandle, record);
        return callbackTokenOk(
          Object.freeze({
            status: 'issued',
            replayStatus: 'fresh',
            record: clonePublicRecord(entry.record),
          }),
        );
      } catch {
        return callbackTokenErr({
          code: 'invalid-input',
          message: 'Callback token issue input is malformed.',
          retryable: false,
        });
      }
    },

    verify(input: CallbackTokenVerifyInput) {
      let tokenHandle: CallbackTokenOpaqueHandle;
      try {
        tokenHandle = normalizeTokenHandleFromInput(input);
      } catch {
        return callbackTokenErr({
          code: 'invalid-input',
          message: 'Callback token verify input is malformed.',
          retryable: false,
        });
      }

      const existing = readByTokenHandle(tokenHandle);
      if (existing === null) {
        return callbackTokenErr({
          code: 'not-found',
          message: 'Callback token record was not found.',
          retryable: false,
        });
      }

      if (existing.record.status === 'consumed' || existing.record.status === 'verified') {
        return callbackTokenOk(
          Object.freeze({
            status: 'already-verified',
            replayStatus: 'duplicate',
            record: clonePublicRecord(existing.record),
          }),
        );
      }

      try {
        const record = markCallbackTokenVerified(existing.record, input);
        const entry = writeEntry(tokenHandle, record);
        return callbackTokenOk(
          Object.freeze({
            status: 'verified',
            replayStatus: 'fresh',
            record: clonePublicRecord(entry.record),
          }),
        );
      } catch {
        return callbackTokenErr({
          code: 'conflict',
          message: 'Callback token cannot be verified from its current state.',
          retryable: false,
        });
      }
    },

    consume(input: CallbackTokenConsumeInput) {
      let tokenHandle: CallbackTokenOpaqueHandle;
      try {
        tokenHandle = normalizeTokenHandleFromInput(input);
      } catch {
        return callbackTokenErr({
          code: 'invalid-input',
          message: 'Callback token consume input is malformed.',
          retryable: false,
        });
      }

      const existing = readByTokenHandle(tokenHandle);
      if (existing === null) {
        return callbackTokenErr({
          code: 'not-found',
          message: 'Callback token record was not found.',
          retryable: false,
        });
      }

      if (existing.record.status === 'permission-denied') {
        return callbackTokenErr({
          code: 'permission-denied',
          message: 'Callback token permission was denied before consumption.',
          retryable: false,
        });
      }
      if (existing.record.status === 'consumed') {
        const record = markCallbackTokenConsumed(existing.record, input);
        const entry = writeEntry(tokenHandle, record);
        return callbackTokenOk(
          Object.freeze({
            status: 'already-consumed',
            replayStatus: 'duplicate',
            consumedThisAttempt: false,
            record: clonePublicRecord(entry.record),
          }),
        );
      }

      try {
        const record = markCallbackTokenConsumed(existing.record, input);
        const entry = writeEntry(tokenHandle, record);
        return callbackTokenOk(
          Object.freeze({
            status: 'consumed',
            replayStatus: 'fresh',
            consumedThisAttempt: true,
            record: clonePublicRecord(entry.record),
          }),
        );
      } catch {
        return callbackTokenErr({
          code: 'conflict',
          message: 'Callback token must be verified before consumption.',
          retryable: false,
        });
      }
    },

    deny(input: CallbackTokenDenyInput) {
      let tokenHandle: CallbackTokenOpaqueHandle;
      try {
        tokenHandle = normalizeTokenHandleFromInput(input);
      } catch {
        return callbackTokenErr({
          code: 'invalid-input',
          message: 'Callback token deny input is malformed.',
          retryable: false,
        });
      }

      const existing = readByTokenHandle(tokenHandle);
      if (existing === null) {
        return callbackTokenErr({
          code: 'not-found',
          message: 'Callback token record was not found.',
          retryable: false,
        });
      }
      if (existing.record.status === 'consumed') {
        return callbackTokenErr({
          code: 'conflict',
          message: 'Callback token was already consumed.',
          retryable: false,
        });
      }
      if (existing.record.status === 'permission-denied') {
        return callbackTokenOk(
          Object.freeze({
            status: 'already-denied',
            replayStatus: 'duplicate',
            consumedThisAttempt: false,
            record: clonePublicRecord(existing.record),
          }),
        );
      }

      try {
        const record = markCallbackTokenDenied(existing.record, input);
        const entry = writeEntry(tokenHandle, record);
        return callbackTokenOk(
          Object.freeze({
            status: 'permission-denied',
            replayStatus: 'fresh',
            consumedThisAttempt: false,
            record: clonePublicRecord(entry.record),
          }),
        );
      } catch {
        return callbackTokenErr({
          code: 'invalid-input',
          message: 'Callback token deny input is malformed.',
          retryable: false,
        });
      }
    },

    fail(input: CallbackTokenFailInput) {
      let tokenHandle: CallbackTokenOpaqueHandle;
      try {
        tokenHandle = normalizeTokenHandleFromInput(input);
      } catch {
        return callbackTokenErr({
          code: 'invalid-input',
          message: 'Callback token fail input is malformed.',
          retryable: false,
        });
      }

      const existing = readByTokenHandle(tokenHandle);
      if (existing === null) {
        return callbackTokenErr({
          code: 'not-found',
          message: 'Callback token record was not found.',
          retryable: false,
        });
      }

      try {
        const record = markCallbackTokenFailed(existing.record, input);
        const entry = writeEntry(tokenHandle, record);
        return callbackTokenOk(
          Object.freeze({
            status: 'failed',
            replayStatus: 'fresh',
            consumedThisAttempt: false,
            record: clonePublicRecord(entry.record),
          }),
        );
      } catch {
        return callbackTokenErr({
          code: 'conflict',
          message: 'Callback token cannot fail from its current state.',
          retryable: false,
        });
      }
    },

    getPublicRecord(recordRef: CallbackTokenRecordRef) {
      let normalizedRecordRef: CallbackTokenRecordRef;
      try {
        normalizedRecordRef = normalizeCallbackTokenRecordRef(recordRef);
      } catch {
        return callbackTokenErr({
          code: 'invalid-input',
          message: 'Callback token record ref is malformed.',
          retryable: false,
        });
      }

      const existing = byRecordRef.get(normalizedRecordRef);
      return callbackTokenOk(existing === undefined ? null : clonePublicRecord(existing.record));
    },

    listPublicRecords() {
      return callbackTokenOk(sortedPublicRecords(byRecordRef.values()));
    },

    snapshot() {
      const records = sortedPublicRecords(byRecordRef.values());
      return callbackTokenOk(
        Object.freeze({
          records,
          issuedCount: countByStatus(records, 'issued'),
          verifiedCount: countByStatus(records, 'verified'),
          consumedCount: countByStatus(records, 'consumed'),
          deniedCount: countByStatus(records, 'permission-denied'),
          failedCount: countByStatus(records, 'failed'),
        }),
      );
    },
  });
}
