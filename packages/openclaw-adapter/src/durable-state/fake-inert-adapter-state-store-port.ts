import type {
  DurableAdapterCorrelationRef,
  DurableAdapterDeliveryAttemptRef,
  DurableAdapterDuplicateDisposition,
  DurableAdapterIdempotencyRef,
  DurableAdapterInboundIdempotencyState,
  DurableAdapterIssueCode,
  DurableAdapterJsonValue,
  DurableAdapterPublicStateProjection,
  DurableAdapterRedactedSummary,
  DurableAdapterReplayCursorState,
  DurableAdapterReplayRef,
  DurableAdapterSafeRef,
  DurableAdapterStateContract,
  DurableAdapterStateKind,
  DurableAdapterStateRef,
  DurableAdapterStateStatus,
} from './durable-state-contract-types.js';

export type FakeInertAdapterStateStoreCategory = DurableAdapterStateKind;

export interface FakeInertAdapterStateStoreCategoryCount {
  readonly stateKind: FakeInertAdapterStateStoreCategory;
  readonly count: number;
}

export interface FakeInertAdapterStateStorePublicSnapshot {
  readonly representation: 'fake-inert-contract-only';
  readonly publicProjection: 'redacted-json-safe';
  readonly durableBackendPosture: 'not-implemented';
  readonly recordCount: number;
  readonly categoryCounts: readonly FakeInertAdapterStateStoreCategoryCount[];
  readonly records: readonly DurableAdapterPublicStateProjection[];
  readonly jsonSafe: true;
}

export interface FakeInertAdapterInboundIdempotencyReservationInput {
  readonly idempotencyRef: DurableAdapterIdempotencyRef;
  readonly eventRef: DurableAdapterSafeRef;
  readonly reservationRef?: DurableAdapterSafeRef;
  readonly stateRef?: DurableAdapterStateRef;
  readonly correlationRef?: DurableAdapterCorrelationRef;
}

export interface FakeInertAdapterInboundIdempotencyReservationResult {
  readonly record: DurableAdapterInboundIdempotencyState;
  readonly reserved: boolean;
  readonly duplicateSuppressed: boolean;
  readonly duplicateDisposition: DurableAdapterDuplicateDisposition;
  readonly effectSignalCreated: boolean;
}

export interface FakeInertAdapterInboundIdempotencyCompletionInput {
  readonly idempotencyRef: DurableAdapterIdempotencyRef;
}

export interface FakeInertAdapterInboundIdempotencyCompletionResult {
  readonly record: DurableAdapterInboundIdempotencyState;
  readonly completed: boolean;
  readonly duplicateSuppressed: boolean;
  readonly duplicateDisposition: DurableAdapterDuplicateDisposition;
  readonly effectSignalCreated: false;
}

export interface FakeInertAdapterStateStorePort {
  readonly putRecord: (record: DurableAdapterStateContract) => DurableAdapterPublicStateProjection;
  readonly readRecord: (safeRef: DurableAdapterSafeRef) => DurableAdapterPublicStateProjection | undefined;
  readonly listRecordsByCategory: (
    stateKind: FakeInertAdapterStateStoreCategory,
  ) => readonly DurableAdapterPublicStateProjection[];
  readonly reserveInboundIdempotencyRef: (
    input: FakeInertAdapterInboundIdempotencyReservationInput,
  ) => FakeInertAdapterInboundIdempotencyReservationResult;
  readonly markInboundIdempotencyRefCompleted: (
    input: FakeInertAdapterInboundIdempotencyCompletionInput,
  ) => FakeInertAdapterInboundIdempotencyCompletionResult;
  readonly appendOrUpsertDeliveryAttempt: (
    record: Extract<DurableAdapterStateContract, { readonly stateKind: 'delivery-attempt-state' }>,
  ) => Extract<DurableAdapterPublicStateProjection, { readonly stateKind: 'delivery-attempt-state' }>;
  readonly updateReplayCursorState: (record: DurableAdapterReplayCursorState) => DurableAdapterReplayCursorState;
  readonly publicSnapshot: () => FakeInertAdapterStateStorePublicSnapshot;
}

const STATE_KINDS: readonly DurableAdapterStateKind[] = Object.freeze([
  'topic-binding-state',
  'callback-token-state',
  'callback-permission-consume-state',
  'delivery-attempt-state',
  'inbound-idempotency-state',
  'replay-cursor-state',
  'correlation-state',
  'real-integration-attempt-evidence-state',
  'readiness-snapshot-state',
  'redacted-diagnostic-audit-summary-state',
]);

const STATE_KIND_SET = new Set<DurableAdapterStateKind>(STATE_KINDS);

const COMMON_RECORD_KEYS = Object.freeze([
  'safeRef',
  'stateRef',
  'stateKind',
  'status',
  'issueCode',
  'correlationRef',
  'redactedSummary',
  'publicProjection',
  'representation',
  'runtimeOnlyValuesSerializable',
  'productionDurableBackend',
]);

const CATEGORY_RECORD_KEYS: Record<DurableAdapterStateKind, ReadonlySet<string>> = {
  'topic-binding-state': new Set([
    ...COMMON_RECORD_KEYS,
    'bindingRef',
    'channelRef',
    'chatRef',
    'threadRef',
    'displayRef',
    'routingAuthority',
  ]),
  'callback-token-state': new Set([
    ...COMMON_RECORD_KEYS,
    'callbackRef',
    'tokenRef',
    'expectedContextRef',
    'expiresAt',
    'opaqueRefOnly',
  ]),
  'callback-permission-consume-state': new Set([
    ...COMMON_RECORD_KEYS,
    'callbackRef',
    'tokenRef',
    'actionRef',
    'permissionRef',
    'consumeRef',
    'permissionBeforeConsume',
    'permissionAllowed',
    'tokenVerified',
    'tokenConsumed',
    'duplicateDisposition',
  ]),
  'delivery-attempt-state': new Set([
    ...COMMON_RECORD_KEYS,
    'deliveryAttemptRef',
    'idempotencyRef',
    'messageRef',
    'providerAcknowledged',
    'businessSuccess',
    'retryability',
    'duplicateDisposition',
  ]),
  'inbound-idempotency-state': new Set([
    ...COMMON_RECORD_KEYS,
    'idempotencyRef',
    'eventRef',
    'reservationRef',
    'duplicateDisposition',
    'effectSuppressed',
  ]),
  'replay-cursor-state': new Set([
    ...COMMON_RECORD_KEYS,
    'replayRef',
    'cursorRef',
    'replayMode',
    'duplicateDisposition',
    'boundedCount',
  ]),
  'correlation-state': new Set([
    ...COMMON_RECORD_KEYS,
    'componentRef',
    'operationRef',
    'severity',
    'relatedRefs',
  ]),
  'real-integration-attempt-evidence-state': new Set([
    ...COMMON_RECORD_KEYS,
    'attemptEvidenceRef',
    'readinessGate',
    'readyToAttemptIsPass',
    'providerAcknowledged',
    'businessSuccess',
    'providerAcknowledgementImpliesBusinessSuccess',
    'passRequiresProviderAcknowledgementAndBusinessSuccess',
    'evidenceRedacted',
  ]),
  'readiness-snapshot-state': new Set([
    ...COMMON_RECORD_KEYS,
    'readinessSnapshotRef',
    'adapterReadiness',
    'productionReadiness',
    'readyToAttemptIsPass',
    'readyToRunIsPass',
    'durableBackendPosture',
    'explicitGateStatus',
    'issueCodes',
  ]),
  'redacted-diagnostic-audit-summary-state': new Set([
    ...COMMON_RECORD_KEYS,
    'diagnosticRef',
    'auditSummaryRef',
    'actorCategoryRef',
    'eventClassRef',
  ]),
};

const FORBIDDEN_PUBLIC_KEYS = new Set([
  'token',
  'secret',
  'credential',
  'password',
  'apiKey',
  'authHeader',
  'endpoint',
  'url',
  'rawPayload',
  'rawProviderPayload',
  'rawCallbackPayload',
  'stack',
  'stackTrace',
  'localPath',
  'stdout',
  'stderr',
  'client',
  'sdk',
  'handle',
  'processEnv',
  'runtimeValue',
]);

export function createFakeInertAdapterStateStore(
  initialRecords: readonly DurableAdapterStateContract[] = [],
): FakeInertAdapterStateStorePort {
  const recordsBySafeRef = new Map<DurableAdapterSafeRef, DurableAdapterPublicStateProjection>();
  const inboundByIdempotencyRef = new Map<DurableAdapterIdempotencyRef, DurableAdapterSafeRef>();
  const deliveryByAttemptRef = new Map<DurableAdapterDeliveryAttemptRef, DurableAdapterSafeRef>();
  const replayByReplayRef = new Map<DurableAdapterReplayRef, DurableAdapterSafeRef>();

  function removeIndexes(record: DurableAdapterPublicStateProjection): void {
    if (record.stateKind === 'inbound-idempotency-state') {
      inboundByIdempotencyRef.delete(record.idempotencyRef);
      return;
    }

    if (record.stateKind === 'delivery-attempt-state') {
      deliveryByAttemptRef.delete(record.deliveryAttemptRef);
      return;
    }

    if (record.stateKind === 'replay-cursor-state') {
      replayByReplayRef.delete(record.replayRef);
    }
  }

  function addIndexes(record: DurableAdapterPublicStateProjection): void {
    if (record.stateKind === 'inbound-idempotency-state') {
      inboundByIdempotencyRef.set(record.idempotencyRef, record.safeRef);
      return;
    }

    if (record.stateKind === 'delivery-attempt-state') {
      deliveryByAttemptRef.set(record.deliveryAttemptRef, record.safeRef);
      return;
    }

    if (record.stateKind === 'replay-cursor-state') {
      replayByReplayRef.set(record.replayRef, record.safeRef);
    }
  }

  function putRecord(record: DurableAdapterStateContract): DurableAdapterPublicStateProjection {
    const projection = normalizeRecord(record);
    const previousRecord = recordsBySafeRef.get(projection.safeRef);

    if (previousRecord !== undefined) {
      removeIndexes(previousRecord);
    }

    recordsBySafeRef.set(projection.safeRef, projection);
    addIndexes(projection);

    return cloneProjection(projection);
  }

  function readRecord(safeRef: DurableAdapterSafeRef): DurableAdapterPublicStateProjection | undefined {
    assertSafeRef(safeRef);
    const record = recordsBySafeRef.get(safeRef);
    return record === undefined ? undefined : cloneProjection(record);
  }

  function listRecordsByCategory(
    stateKind: FakeInertAdapterStateStoreCategory,
  ): readonly DurableAdapterPublicStateProjection[] {
    assertKnownStateKind(stateKind);

    return [...recordsBySafeRef.values()]
      .filter((record) => record.stateKind === stateKind)
      .sort(compareRecordsBySafeRef)
      .map(cloneProjection);
  }

  function reserveInboundIdempotencyRef(
    input: FakeInertAdapterInboundIdempotencyReservationInput,
  ): FakeInertAdapterInboundIdempotencyReservationResult {
    assertJsonSafeValue(input);
    assertSafeRef(input.idempotencyRef);
    assertSafeRef(input.eventRef);

    if (input.reservationRef !== undefined) {
      assertSafeRef(input.reservationRef);
    }

    if (input.stateRef !== undefined) {
      assertSafeRef(input.stateRef);
    }

    if (input.correlationRef !== undefined) {
      assertSafeRef(input.correlationRef);
    }

    const existingSafeRef = inboundByIdempotencyRef.get(input.idempotencyRef);

    if (existingSafeRef !== undefined) {
      const existingRecord = recordsBySafeRef.get(existingSafeRef);

      if (existingRecord?.stateKind !== 'inbound-idempotency-state') {
        throw new Error('idempotency-ref-conflict');
      }

      return {
        record: cloneInboundIdempotencyRecord(existingRecord),
        reserved: false,
        duplicateSuppressed: true,
        duplicateDisposition: 'duplicate-suppressed',
        effectSignalCreated: false,
      };
    }

    const reservationRef = input.reservationRef ?? reservationRefFromIdempotencyRef(input.idempotencyRef);
    const record: DurableAdapterInboundIdempotencyState = {
      safeRef: input.idempotencyRef,
      stateRef: input.stateRef ?? stateRefFromSafeRef(input.idempotencyRef),
      stateKind: 'inbound-idempotency-state',
      status: 'reserved',
      issueCode: 'none',
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
      redactedSummary: createRedactedSummary('reserved', 'none', [
        input.idempotencyRef,
        input.eventRef,
        reservationRef,
      ]),
      publicProjection: 'redacted-json-safe',
      representation: 'fake-inert-contract-only',
      runtimeOnlyValuesSerializable: false,
      productionDurableBackend: 'not-implemented',
      idempotencyRef: input.idempotencyRef,
      eventRef: input.eventRef,
      reservationRef,
      duplicateDisposition: 'first-seen',
      effectSuppressed: false,
    };

    const stored = putRecord(record);

    if (stored.stateKind !== 'inbound-idempotency-state') {
      throw new Error('idempotency-state-kind-mismatch');
    }

    return {
      record: stored,
      reserved: true,
      duplicateSuppressed: false,
      duplicateDisposition: 'first-seen',
      effectSignalCreated: true,
    };
  }

  function markInboundIdempotencyRefCompleted(
    input: FakeInertAdapterInboundIdempotencyCompletionInput,
  ): FakeInertAdapterInboundIdempotencyCompletionResult {
    assertJsonSafeValue(input);
    assertSafeRef(input.idempotencyRef);

    const existingSafeRef = inboundByIdempotencyRef.get(input.idempotencyRef);

    if (existingSafeRef === undefined) {
      throw new Error('missing-inbound-reservation');
    }

    const existingRecord = recordsBySafeRef.get(existingSafeRef);

    if (existingRecord?.stateKind !== 'inbound-idempotency-state') {
      throw new Error('idempotency-ref-conflict');
    }

    if (existingRecord.status === 'completed') {
      return {
        record: cloneInboundIdempotencyRecord(existingRecord),
        completed: false,
        duplicateSuppressed: true,
        duplicateDisposition: 'duplicate-suppressed',
        effectSignalCreated: false,
      };
    }

    const completedRecord: DurableAdapterInboundIdempotencyState = {
      ...existingRecord,
      status: 'completed',
      redactedSummary: createRedactedSummary('completed', existingRecord.issueCode ?? 'none', [
        existingRecord.idempotencyRef,
        existingRecord.eventRef,
        existingRecord.reservationRef,
      ]),
    };

    const stored = putRecord(completedRecord);

    if (stored.stateKind !== 'inbound-idempotency-state') {
      throw new Error('idempotency-state-kind-mismatch');
    }

    return {
      record: stored,
      completed: true,
      duplicateSuppressed: false,
      duplicateDisposition: stored.duplicateDisposition,
      effectSignalCreated: false,
    };
  }

  function appendOrUpsertDeliveryAttempt(
    record: Extract<DurableAdapterStateContract, { readonly stateKind: 'delivery-attempt-state' }>,
  ): Extract<DurableAdapterPublicStateProjection, { readonly stateKind: 'delivery-attempt-state' }> {
    assertSafeRef(record.deliveryAttemptRef);

    const previousSafeRef = deliveryByAttemptRef.get(record.deliveryAttemptRef);

    if (previousSafeRef !== undefined && previousSafeRef !== record.safeRef) {
      recordsBySafeRef.delete(previousSafeRef);
      deliveryByAttemptRef.delete(record.deliveryAttemptRef);
    }

    const stored = putRecord(record);

    if (stored.stateKind !== 'delivery-attempt-state') {
      throw new Error('delivery-state-kind-mismatch');
    }

    return stored;
  }

  function updateReplayCursorState(record: DurableAdapterReplayCursorState): DurableAdapterReplayCursorState {
    assertSafeRef(record.replayRef);

    const previousSafeRef = replayByReplayRef.get(record.replayRef);

    if (previousSafeRef !== undefined && previousSafeRef !== record.safeRef) {
      recordsBySafeRef.delete(previousSafeRef);
      replayByReplayRef.delete(record.replayRef);
    }

    const stored = putRecord(record);

    if (stored.stateKind !== 'replay-cursor-state') {
      throw new Error('replay-state-kind-mismatch');
    }

    return stored;
  }

  function publicSnapshot(): FakeInertAdapterStateStorePublicSnapshot {
    const records = [...recordsBySafeRef.values()].sort(compareRecordsBySafeRef).map(cloneProjection);
    const categoryCounts = STATE_KINDS.map((stateKind) => ({
      stateKind,
      count: records.filter((record) => record.stateKind === stateKind).length,
    })).filter((entry) => entry.count > 0);

    const snapshot: FakeInertAdapterStateStorePublicSnapshot = {
      representation: 'fake-inert-contract-only',
      publicProjection: 'redacted-json-safe',
      durableBackendPosture: 'not-implemented',
      recordCount: records.length,
      categoryCounts,
      records,
      jsonSafe: true,
    };

    assertJsonSafeValue(snapshot);
    return snapshot;
  }

  const port: FakeInertAdapterStateStorePort = {
    putRecord,
    readRecord,
    listRecordsByCategory,
    reserveInboundIdempotencyRef,
    markInboundIdempotencyRefCompleted,
    appendOrUpsertDeliveryAttempt,
    updateReplayCursorState,
    publicSnapshot,
  };

  for (const record of initialRecords) {
    port.putRecord(record);
  }

  return port;
}

function normalizeRecord<TRecord extends DurableAdapterStateContract>(
  record: TRecord,
): TRecord & DurableAdapterPublicStateProjection {
  assertJsonSafeValue(record);
  assertKnownStateKind(record.stateKind);
  assertAllowedRecordKeys(record);
  assertProjectionConstants(record);
  assertRecordSafeRefs(record);
  assertRedactedSummary(record.redactedSummary);

  return cloneProjection(record as TRecord & DurableAdapterPublicStateProjection);
}

function assertProjectionConstants(record: DurableAdapterStateContract): void {
  if (record.publicProjection !== 'redacted-json-safe') {
    throw new Error('public-projection-required');
  }

  if (record.representation !== 'fake-inert-contract-only') {
    throw new Error('fake-inert-representation-required');
  }

  if (record.runtimeOnlyValuesSerializable !== false) {
    throw new Error('runtime-boundary-required');
  }

  if (record.productionDurableBackend !== 'not-implemented') {
    throw new Error('non-implementation-posture-required');
  }
}

function assertRecordSafeRefs(record: DurableAdapterStateContract): void {
  assertSafeRef(record.safeRef);
  assertSafeRef(record.stateRef);

  if (record.correlationRef !== undefined) {
    assertSafeRef(record.correlationRef);
  }

  switch (record.stateKind) {
    case 'topic-binding-state':
      assertSafeRef(record.bindingRef);
      assertSafeRef(record.channelRef);
      assertSafeRef(record.chatRef);
      assertOptionalSafeRef(record.threadRef);
      assertOptionalSafeRef(record.displayRef);
      return;
    case 'callback-token-state':
      assertSafeRef(record.callbackRef);
      assertSafeRef(record.tokenRef);
      assertSafeRef(record.expectedContextRef);
      return;
    case 'callback-permission-consume-state':
      assertSafeRef(record.callbackRef);
      assertOptionalSafeRef(record.tokenRef);
      assertOptionalSafeRef(record.actionRef);
      assertSafeRef(record.permissionRef);
      assertSafeRef(record.consumeRef);
      return;
    case 'delivery-attempt-state':
      assertSafeRef(record.deliveryAttemptRef);
      assertSafeRef(record.idempotencyRef);
      assertOptionalSafeRef(record.messageRef);
      return;
    case 'inbound-idempotency-state':
      assertSafeRef(record.idempotencyRef);
      assertSafeRef(record.eventRef);
      assertSafeRef(record.reservationRef);
      return;
    case 'replay-cursor-state':
      assertSafeRef(record.replayRef);
      assertSafeRef(record.cursorRef);
      return;
    case 'correlation-state':
      assertSafeRef(record.correlationRef);
      assertSafeRef(record.componentRef);
      assertOptionalSafeRef(record.operationRef);
      assertOptionalSafeRefs(record.relatedRefs);
      return;
    case 'real-integration-attempt-evidence-state':
      assertSafeRef(record.attemptEvidenceRef);
      return;
    case 'readiness-snapshot-state':
      assertSafeRef(record.readinessSnapshotRef);
      return;
    case 'redacted-diagnostic-audit-summary-state':
      assertSafeRef(record.diagnosticRef);
      assertSafeRef(record.auditSummaryRef);
      assertOptionalSafeRef(record.actorCategoryRef);
      assertOptionalSafeRef(record.eventClassRef);
      return;
  }
}

function assertAllowedRecordKeys(record: DurableAdapterStateContract): void {
  const allowedKeys = CATEGORY_RECORD_KEYS[record.stateKind];

  for (const key of Object.keys(record)) {
    assertSafePublicKey(key);

    if (!allowedKeys.has(key)) {
      throw new Error('unexpected-public-field');
    }
  }
}

function assertRedactedSummary(summary: DurableAdapterRedactedSummary | undefined): void {
  if (summary === undefined) {
    return;
  }

  assertJsonSafeValue(summary);

  if (summary.summaryKind !== 'redacted-summary') {
    throw new Error('redacted-summary-required');
  }

  if (summary.jsonSafe !== true) {
    throw new Error('json-safe-summary-required');
  }

  assertOptionalSafeRef(summary.diagnosticRef);
  assertOptionalSafeRefs(summary.safeRefs);
}

function assertKnownStateKind(stateKind: DurableAdapterStateKind): void {
  if (!STATE_KIND_SET.has(stateKind)) {
    throw new Error('unknown-state-category');
  }
}

function assertOptionalSafeRef(ref: DurableAdapterSafeRef | undefined): void {
  if (ref !== undefined) {
    assertSafeRef(ref);
  }
}

function assertOptionalSafeRefs(refs: readonly DurableAdapterSafeRef[] | undefined): void {
  if (refs === undefined) {
    return;
  }

  for (const ref of refs) {
    assertSafeRef(ref);
  }
}

function assertSafeRef(ref: unknown): asserts ref is DurableAdapterSafeRef {
  if (typeof ref !== 'string' || ref.length === 0 || !ref.includes(':')) {
    throw new Error('safe-ref-required');
  }
}

function assertJsonSafeValue(value: unknown): asserts value is DurableAdapterJsonValue {
  if (value === null) {
    return;
  }

  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'boolean') {
    return;
  }

  if (valueType === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('finite-json-number-required');
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertJsonSafeValue(item);
    }

    return;
  }

  if (valueType !== 'object') {
    throw new Error('json-safe-value-required');
  }

  const objectPrototype = Object.getPrototypeOf(value);

  if (objectPrototype !== Object.prototype && objectPrototype !== null) {
    throw new Error('plain-json-object-required');
  }

  const objectRecord = value as Record<string, unknown>;

  for (const [key, entry] of Object.entries(objectRecord)) {
    assertSafePublicKey(key);
    assertJsonSafeValue(entry);
  }
}

function assertSafePublicKey(key: string): void {
  if (FORBIDDEN_PUBLIC_KEYS.has(key)) {
    throw new Error('safe-public-field-required');
  }
}

function cloneProjection<TRecord extends DurableAdapterPublicStateProjection>(record: TRecord): TRecord {
  return JSON.parse(JSON.stringify(record)) as TRecord;
}

function cloneInboundIdempotencyRecord(
  record: DurableAdapterInboundIdempotencyState,
): DurableAdapterInboundIdempotencyState {
  return cloneProjection(record as DurableAdapterInboundIdempotencyState & DurableAdapterPublicStateProjection);
}

function compareRecordsBySafeRef(
  left: DurableAdapterPublicStateProjection,
  right: DurableAdapterPublicStateProjection,
): number {
  return left.safeRef.localeCompare(right.safeRef);
}

function stateRefFromSafeRef(ref: DurableAdapterSafeRef): DurableAdapterStateRef {
  return `state:${safeRefTail(ref)}`;
}

function reservationRefFromIdempotencyRef(ref: DurableAdapterIdempotencyRef): DurableAdapterSafeRef {
  return `reservation:${safeRefTail(ref)}`;
}

function safeRefTail(ref: DurableAdapterSafeRef): string {
  const separatorIndex = ref.indexOf(':');
  return ref.slice(separatorIndex + 1);
}

function createRedactedSummary(
  status: DurableAdapterStateStatus,
  issueCode: DurableAdapterIssueCode,
  safeRefs: readonly DurableAdapterSafeRef[],
): DurableAdapterRedactedSummary {
  return {
    summaryKind: 'redacted-summary',
    status,
    issueCode,
    safeRefs,
    jsonSafe: true,
  };
}
