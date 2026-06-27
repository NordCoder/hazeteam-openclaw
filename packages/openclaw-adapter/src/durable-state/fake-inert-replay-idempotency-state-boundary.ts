import { createFakeInertAdapterStateStore } from './fake-inert-adapter-state-store-port.js';
import type {
  FakeInertAdapterInboundIdempotencyCompletionInput,
  FakeInertAdapterInboundIdempotencyReservationInput,
  FakeInertAdapterStateStorePort,
  FakeInertAdapterStateStorePublicSnapshot,
} from './fake-inert-adapter-state-store-port.js';
import type {
  DurableAdapterCallbackPermissionConsumeState,
  DurableAdapterCallbackRef,
  DurableAdapterCorrelationRef,
  DurableAdapterCursorRef,
  DurableAdapterDeliveryAttemptRef,
  DurableAdapterDeliveryAttemptState,
  DurableAdapterDuplicateDisposition,
  DurableAdapterDurableBackendPosture,
  DurableAdapterIdempotencyRef,
  DurableAdapterInboundIdempotencyState,
  DurableAdapterIssueCode,
  DurableAdapterMessageRef,
  DurableAdapterProductionReadiness,
  DurableAdapterPublicProjectionKind,
  DurableAdapterRedactedSummary,
  DurableAdapterReplayCursorState,
  DurableAdapterReplayMode,
  DurableAdapterReplayRef,
  DurableAdapterRetryability,
  DurableAdapterSafeRef,
  DurableAdapterStateRef,
  DurableAdapterStateRepresentation,
  DurableAdapterStateStatus,
} from './durable-state-contract-types.js';

export type FakeInertReplayIdempotencyBoundaryOutcome =
  | 'first-seen'
  | 'duplicate-suppressed'
  | 'completed'
  | 'blocked'
  | 'acknowledgement-only'
  | 'business-success-missing'
  | 'business-succeeded'
  | 'failed-safe'
  | 'audit-only'
  | 'duplicate-check'
  | 'bounded-replay-plan'
  | 'safe-noop';

export interface FakeInertReplayIdempotencyBoundaryPosture {
  readonly publicProjection: DurableAdapterPublicProjectionKind;
  readonly representation: DurableAdapterStateRepresentation;
  readonly runtimeOnlyValuesSerializable: false;
  readonly productionDurableBackend: DurableAdapterDurableBackendPosture;
  readonly productionReadiness: DurableAdapterProductionReadiness;
  readonly readyToAttemptIsPass: false;
  readonly readyToRunIsPass: false;
  readonly jsonSafe: true;
}

export const FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE: FakeInertReplayIdempotencyBoundaryPosture =
  Object.freeze({
    publicProjection: 'redacted-json-safe',
    representation: 'fake-inert-contract-only',
    runtimeOnlyValuesSerializable: false,
    productionDurableBackend: 'not-implemented',
    productionReadiness: 'not-production-ready',
    readyToAttemptIsPass: false,
    readyToRunIsPass: false,
    jsonSafe: true,
  });

export interface FakeInertReplayIdempotencyBoundaryReservationResult {
  readonly record: DurableAdapterInboundIdempotencyState;
  readonly reserved: boolean;
  readonly duplicateSuppressed: boolean;
  readonly duplicateDisposition: DurableAdapterDuplicateDisposition;
  readonly effectSignalCreated: boolean;
  readonly outcome: Extract<
    FakeInertReplayIdempotencyBoundaryOutcome,
    'first-seen' | 'duplicate-suppressed'
  >;
  readonly summary: DurableAdapterRedactedSummary;
  readonly posture: FakeInertReplayIdempotencyBoundaryPosture;
}

export interface FakeInertReplayIdempotencyBoundaryCompletionResult {
  readonly record: DurableAdapterInboundIdempotencyState;
  readonly completed: boolean;
  readonly duplicateSuppressed: boolean;
  readonly duplicateDisposition: DurableAdapterDuplicateDisposition;
  readonly effectSignalCreated: false;
  readonly outcome: Extract<
    FakeInertReplayIdempotencyBoundaryOutcome,
    'completed' | 'duplicate-suppressed'
  >;
  readonly summary: DurableAdapterRedactedSummary;
  readonly posture: FakeInertReplayIdempotencyBoundaryPosture;
}

export interface FakeInertReplayCursorAdvanceInput {
  readonly replayRef: DurableAdapterReplayRef;
  readonly cursorRef: DurableAdapterCursorRef;
  readonly replayMode: DurableAdapterReplayMode;
  readonly boundedCount?: number;
  readonly duplicateDisposition?: DurableAdapterDuplicateDisposition;
  readonly status?: Extract<
    DurableAdapterStateStatus,
    'processing' | 'safe-noop' | 'blocked' | 'completed' | 'failed-safe'
  >;
  readonly issueCode?: DurableAdapterIssueCode;
  readonly stateRef?: DurableAdapterStateRef;
  readonly correlationRef?: DurableAdapterCorrelationRef;
}

export interface FakeInertReplayCursorAdvanceResult {
  readonly record: DurableAdapterReplayCursorState;
  readonly outcome: Extract<
    FakeInertReplayIdempotencyBoundaryOutcome,
    'audit-only' | 'duplicate-check' | 'bounded-replay-plan' | 'blocked' | 'completed' | 'failed-safe'
  >;
  readonly summary: DurableAdapterRedactedSummary;
  readonly posture: FakeInertReplayIdempotencyBoundaryPosture;
}

export interface FakeInertDeliveryAttemptReplayOutcomeInput {
  readonly deliveryAttemptRef: DurableAdapterDeliveryAttemptRef;
  readonly idempotencyRef: DurableAdapterIdempotencyRef;
  readonly messageRef?: DurableAdapterMessageRef;
  readonly providerAcknowledged: boolean;
  readonly businessSuccess: boolean;
  readonly retryability?: DurableAdapterRetryability;
  readonly duplicateDisposition?: DurableAdapterDuplicateDisposition;
  readonly blockedByExplicitGate?: boolean;
  readonly stateRef?: DurableAdapterStateRef;
  readonly correlationRef?: DurableAdapterCorrelationRef;
}

export interface FakeInertDeliveryAttemptReplayOutcomeResult {
  readonly record: DurableAdapterDeliveryAttemptState;
  readonly providerAcknowledged: boolean;
  readonly businessSuccess: boolean;
  readonly providerAcknowledgementImpliesBusinessSuccess: false;
  readonly outcome: Extract<
    FakeInertReplayIdempotencyBoundaryOutcome,
    | 'acknowledgement-only'
    | 'business-success-missing'
    | 'business-succeeded'
    | 'blocked'
    | 'failed-safe'
  >;
  readonly summary: DurableAdapterRedactedSummary;
  readonly posture: FakeInertReplayIdempotencyBoundaryPosture;
}

export interface FakeInertCallbackConsumeReplayDecisionInput {
  readonly decisionRef: DurableAdapterSafeRef;
  readonly callbackRef: DurableAdapterCallbackRef;
  readonly permissionRef: DurableAdapterSafeRef;
  readonly consumeRef: DurableAdapterSafeRef;
  readonly permissionAllowed: boolean;
  readonly alreadyConsumed?: boolean;
  readonly duplicateDisposition?: DurableAdapterDuplicateDisposition;
  readonly tokenVerified?: boolean;
  readonly stateRef?: DurableAdapterStateRef;
  readonly correlationRef?: DurableAdapterCorrelationRef;
}

export interface FakeInertCallbackConsumeReplayDecisionResult {
  readonly record: DurableAdapterCallbackPermissionConsumeState;
  readonly outcome: Extract<
    FakeInertReplayIdempotencyBoundaryOutcome,
    'blocked' | 'duplicate-suppressed' | 'completed'
  >;
  readonly permissionBeforeConsume: true;
  readonly summary: DurableAdapterRedactedSummary;
  readonly posture: FakeInertReplayIdempotencyBoundaryPosture;
}

export interface FakeInertRedactedReplaySummaryInput {
  readonly status: DurableAdapterStateStatus;
  readonly issueCode?: DurableAdapterIssueCode;
  readonly detailCode?: string;
  readonly safeRefs?: readonly DurableAdapterSafeRef[];
}

export interface FakeInertReplayIdempotencyStateBoundary {
  readonly posture: FakeInertReplayIdempotencyBoundaryPosture;
  readonly reserveInboundIdempotency: (
    input: FakeInertAdapterInboundIdempotencyReservationInput,
  ) => FakeInertReplayIdempotencyBoundaryReservationResult;
  readonly completeInboundIdempotency: (
    input: FakeInertAdapterInboundIdempotencyCompletionInput,
  ) => FakeInertReplayIdempotencyBoundaryCompletionResult;
  readonly advanceReplayCursor: (
    input: FakeInertReplayCursorAdvanceInput,
  ) => FakeInertReplayCursorAdvanceResult;
  readonly recordDeliveryAttemptReplayOutcome: (
    input: FakeInertDeliveryAttemptReplayOutcomeInput,
  ) => FakeInertDeliveryAttemptReplayOutcomeResult;
  readonly decideCallbackConsumeReplay: (
    input: FakeInertCallbackConsumeReplayDecisionInput,
  ) => FakeInertCallbackConsumeReplayDecisionResult;
  readonly buildRedactedReplaySummary: (
    input: FakeInertRedactedReplaySummaryInput,
  ) => DurableAdapterRedactedSummary;
  readonly publicSnapshot: () => FakeInertAdapterStateStorePublicSnapshot;
}

export function createFakeInertReplayIdempotencyStateBoundary(
  stateStore: FakeInertAdapterStateStorePort = createFakeInertAdapterStateStore(),
): FakeInertReplayIdempotencyStateBoundary {
  function reserveInboundIdempotency(
    input: FakeInertAdapterInboundIdempotencyReservationInput,
  ): FakeInertReplayIdempotencyBoundaryReservationResult {
    const result = stateStore.reserveInboundIdempotencyRef(input);
    const outcome = result.duplicateSuppressed ? 'duplicate-suppressed' : 'first-seen';
    const summary = buildRedactedReplaySummary({
      status: result.record.status,
      issueCode: result.record.issueCode ?? 'none',
      safeRefs: [result.record.idempotencyRef, result.record.eventRef, result.record.reservationRef],
    });

    return {
      record: result.record,
      reserved: result.reserved,
      duplicateSuppressed: result.duplicateSuppressed,
      duplicateDisposition: result.duplicateDisposition,
      effectSignalCreated: result.effectSignalCreated,
      outcome,
      summary,
      posture: FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE,
    };
  }

  function completeInboundIdempotency(
    input: FakeInertAdapterInboundIdempotencyCompletionInput,
  ): FakeInertReplayIdempotencyBoundaryCompletionResult {
    const result = stateStore.markInboundIdempotencyRefCompleted(input);
    const outcome = result.duplicateSuppressed ? 'duplicate-suppressed' : 'completed';
    const summary = buildRedactedReplaySummary({
      status: result.record.status,
      issueCode: result.record.issueCode ?? 'none',
      safeRefs: [result.record.idempotencyRef, result.record.eventRef, result.record.reservationRef],
    });

    return {
      record: result.record,
      completed: result.completed,
      duplicateSuppressed: result.duplicateSuppressed,
      duplicateDisposition: result.duplicateDisposition,
      effectSignalCreated: false,
      outcome,
      summary,
      posture: FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE,
    };
  }

  function advanceReplayCursor(input: FakeInertReplayCursorAdvanceInput): FakeInertReplayCursorAdvanceResult {
    const status = input.status ?? statusForReplayMode(input.replayMode);
    const issueCode = input.issueCode ?? issueCodeForReplayStatus(status);
    const record: DurableAdapterReplayCursorState = {
      safeRef: input.replayRef,
      stateRef: input.stateRef ?? stateRefFromSafeRef(input.replayRef),
      stateKind: 'replay-cursor-state',
      status,
      issueCode,
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
      redactedSummary: buildRedactedReplaySummary({
        status,
        issueCode,
        safeRefs: [input.replayRef, input.cursorRef],
      }),
      publicProjection: 'redacted-json-safe',
      representation: 'fake-inert-contract-only',
      runtimeOnlyValuesSerializable: false,
      productionDurableBackend: 'not-implemented',
      replayRef: input.replayRef,
      cursorRef: input.cursorRef,
      replayMode: input.replayMode,
      ...(input.duplicateDisposition === undefined
        ? {}
        : { duplicateDisposition: input.duplicateDisposition }),
      ...(input.boundedCount === undefined ? {} : { boundedCount: input.boundedCount }),
    };
    const stored = stateStore.updateReplayCursorState(record);

    return {
      record: stored,
      outcome: outcomeForReplayCursor(stored),
      summary: stored.redactedSummary ?? buildRedactedReplaySummary({ status: stored.status, issueCode }),
      posture: FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE,
    };
  }

  function recordDeliveryAttemptReplayOutcome(
    input: FakeInertDeliveryAttemptReplayOutcomeInput,
  ): FakeInertDeliveryAttemptReplayOutcomeResult {
    const status = statusForDeliveryAttempt(input);
    const issueCode = issueCodeForDeliveryAttempt(input);
    const record: DurableAdapterDeliveryAttemptState = {
      safeRef: input.deliveryAttemptRef,
      stateRef: input.stateRef ?? stateRefFromSafeRef(input.deliveryAttemptRef),
      stateKind: 'delivery-attempt-state',
      status,
      issueCode,
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
      redactedSummary: buildRedactedReplaySummary({
        status,
        issueCode,
        safeRefs: [input.deliveryAttemptRef, input.idempotencyRef],
      }),
      publicProjection: 'redacted-json-safe',
      representation: 'fake-inert-contract-only',
      runtimeOnlyValuesSerializable: false,
      productionDurableBackend: 'not-implemented',
      deliveryAttemptRef: input.deliveryAttemptRef,
      idempotencyRef: input.idempotencyRef,
      ...(input.messageRef === undefined ? {} : { messageRef: input.messageRef }),
      providerAcknowledged: input.providerAcknowledged,
      businessSuccess: input.businessSuccess,
      retryability: input.retryability ?? retryabilityForDeliveryAttempt(status),
      duplicateDisposition: input.duplicateDisposition ?? 'first-seen',
    };
    const stored = stateStore.appendOrUpsertDeliveryAttempt(record);

    return {
      record: stored,
      providerAcknowledged: stored.providerAcknowledged,
      businessSuccess: stored.businessSuccess,
      providerAcknowledgementImpliesBusinessSuccess: false,
      outcome: outcomeForDeliveryAttempt(stored),
      summary: stored.redactedSummary ?? buildRedactedReplaySummary({ status: stored.status, issueCode }),
      posture: FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE,
    };
  }

  function decideCallbackConsumeReplay(
    input: FakeInertCallbackConsumeReplayDecisionInput,
  ): FakeInertCallbackConsumeReplayDecisionResult {
    const duplicateDisposition = input.duplicateDisposition ?? callbackDuplicateDisposition(input);
    const status = statusForCallbackConsume(input, duplicateDisposition);
    const issueCode = issueCodeForCallbackConsume(status);
    const record: DurableAdapterCallbackPermissionConsumeState = {
      safeRef: input.decisionRef,
      stateRef: input.stateRef ?? stateRefFromSafeRef(input.decisionRef),
      stateKind: 'callback-permission-consume-state',
      status,
      issueCode,
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
      redactedSummary: buildRedactedReplaySummary({
        status,
        issueCode,
        safeRefs: [input.callbackRef, input.permissionRef, input.consumeRef],
      }),
      publicProjection: 'redacted-json-safe',
      representation: 'fake-inert-contract-only',
      runtimeOnlyValuesSerializable: false,
      productionDurableBackend: 'not-implemented',
      callbackRef: input.callbackRef,
      permissionRef: input.permissionRef,
      consumeRef: input.consumeRef,
      permissionBeforeConsume: true,
      permissionAllowed: input.permissionAllowed,
      ...(input.tokenVerified === undefined ? {} : { tokenVerified: input.tokenVerified }),
      tokenConsumed: status === 'consumed' || input.alreadyConsumed === true,
      duplicateDisposition,
    };
    const stored = stateStore.putRecord(record);

    if (stored.stateKind !== 'callback-permission-consume-state') {
      throw new Error('callback-consume-state-kind-mismatch');
    }

    return {
      record: stored,
      outcome: outcomeForCallbackConsume(stored.status),
      permissionBeforeConsume: true,
      summary: stored.redactedSummary ?? buildRedactedReplaySummary({ status: stored.status, issueCode }),
      posture: FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE,
    };
  }

  function buildRedactedReplaySummary(
    input: FakeInertRedactedReplaySummaryInput,
  ): DurableAdapterRedactedSummary {
    const summary: DurableAdapterRedactedSummary = {
      summaryKind: 'redacted-summary',
      status: input.status,
      issueCode: input.issueCode ?? 'none',
      ...(input.detailCode === undefined ? {} : { detailCode: input.detailCode }),
      ...(input.safeRefs === undefined ? {} : { safeRefs: input.safeRefs }),
      jsonSafe: true,
    };

    return cloneJsonSafe(summary);
  }

  return {
    posture: FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE,
    reserveInboundIdempotency,
    completeInboundIdempotency,
    advanceReplayCursor,
    recordDeliveryAttemptReplayOutcome,
    decideCallbackConsumeReplay,
    buildRedactedReplaySummary,
    publicSnapshot: stateStore.publicSnapshot,
  };
}

function statusForReplayMode(replayMode: DurableAdapterReplayMode): DurableAdapterStateStatus {
  if (replayMode === 'audit-only') {
    return 'safe-noop';
  }

  return 'processing';
}

function issueCodeForReplayStatus(status: DurableAdapterStateStatus): DurableAdapterIssueCode {
  if (status === 'blocked') {
    return 'blocked-by-explicit-gate';
  }

  if (status === 'failed-safe') {
    return 'failed-safe';
  }

  return 'fake-inert-only';
}

function outcomeForReplayCursor(
  record: DurableAdapterReplayCursorState,
): Extract<
  FakeInertReplayIdempotencyBoundaryOutcome,
  'audit-only' | 'duplicate-check' | 'bounded-replay-plan' | 'blocked' | 'completed' | 'failed-safe'
> {
  if (record.status === 'blocked') {
    return 'blocked';
  }

  if (record.status === 'completed') {
    return 'completed';
  }

  if (record.status === 'failed-safe') {
    return 'failed-safe';
  }

  return record.replayMode;
}

function statusForDeliveryAttempt(input: FakeInertDeliveryAttemptReplayOutcomeInput): DurableAdapterStateStatus {
  if (input.blockedByExplicitGate === true) {
    return 'blocked';
  }

  if (input.businessSuccess) {
    return 'business-succeeded';
  }

  if (input.providerAcknowledged) {
    return 'acknowledgement-only';
  }

  return 'failed-safe';
}

function issueCodeForDeliveryAttempt(
  input: FakeInertDeliveryAttemptReplayOutcomeInput,
): DurableAdapterIssueCode {
  if (input.blockedByExplicitGate === true) {
    return 'blocked-by-explicit-gate';
  }

  if (input.businessSuccess) {
    return 'none';
  }

  if (input.providerAcknowledged) {
    return 'business-success-missing';
  }

  return 'failed-safe';
}

function retryabilityForDeliveryAttempt(status: DurableAdapterStateStatus): DurableAdapterRetryability {
  if (status === 'business-succeeded' || status === 'blocked') {
    return 'not-retryable';
  }

  return 'unknown';
}

function outcomeForDeliveryAttempt(
  record: DurableAdapterDeliveryAttemptState,
): Extract<
  FakeInertReplayIdempotencyBoundaryOutcome,
  | 'acknowledgement-only'
  | 'business-success-missing'
  | 'business-succeeded'
  | 'blocked'
  | 'failed-safe'
> {
  if (record.status === 'blocked') {
    return 'blocked';
  }

  if (record.businessSuccess) {
    return 'business-succeeded';
  }

  if (record.providerAcknowledged) {
    return 'acknowledgement-only';
  }

  return 'failed-safe';
}

function callbackDuplicateDisposition(
  input: FakeInertCallbackConsumeReplayDecisionInput,
): DurableAdapterDuplicateDisposition {
  return input.alreadyConsumed === true ? 'duplicate-suppressed' : 'first-seen';
}

function statusForCallbackConsume(
  input: FakeInertCallbackConsumeReplayDecisionInput,
  duplicateDisposition: DurableAdapterDuplicateDisposition,
): DurableAdapterStateStatus {
  if (!input.permissionAllowed) {
    return 'blocked';
  }

  if (duplicateDisposition === 'duplicate-suppressed') {
    return 'duplicate-suppressed';
  }

  return 'consumed';
}

function issueCodeForCallbackConsume(status: DurableAdapterStateStatus): DurableAdapterIssueCode {
  if (status === 'blocked') {
    return 'permission-denied';
  }

  if (status === 'duplicate-suppressed') {
    return 'duplicate-suppressed';
  }

  return 'none';
}

function outcomeForCallbackConsume(
  status: DurableAdapterStateStatus,
): Extract<FakeInertReplayIdempotencyBoundaryOutcome, 'blocked' | 'duplicate-suppressed' | 'completed'> {
  if (status === 'blocked') {
    return 'blocked';
  }

  if (status === 'duplicate-suppressed') {
    return 'duplicate-suppressed';
  }

  return 'completed';
}

function stateRefFromSafeRef(ref: DurableAdapterSafeRef): DurableAdapterStateRef {
  return `state:${safeRefTail(ref)}`;
}

function safeRefTail(ref: DurableAdapterSafeRef): string {
  const separatorIndex = ref.indexOf(':');
  return separatorIndex === -1 ? ref : ref.slice(separatorIndex + 1);
}

function cloneJsonSafe<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}
