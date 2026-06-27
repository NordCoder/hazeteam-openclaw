export type DurableAdapterJsonPrimitive = string | number | boolean | null;

export type DurableAdapterJsonValue =
  | DurableAdapterJsonPrimitive
  | readonly DurableAdapterJsonValue[]
  | { readonly [key: string]: DurableAdapterJsonValue };

export type DurableAdapterStateRepresentation = 'fake-inert-contract-only';
export type DurableAdapterPublicProjectionKind = 'redacted-json-safe';
export type DurableAdapterReadinessClassification =
  'adapter-ready-for-real-system-integration-under-explicit-gates';
export type DurableAdapterProductionReadiness = 'not-production-ready';
export type DurableAdapterDurableBackendPosture = 'not-implemented';

export type DurableAdapterSafeRef = `${string}:${string}`;
export type DurableAdapterStateRef = `state:${string}`;
export type DurableAdapterBindingRef = `binding:${string}`;
export type DurableAdapterCallbackRef = `callback:${string}`;
export type DurableAdapterCallbackTokenRef = `token-ref:${string}`;
export type DurableAdapterDeliveryAttemptRef = `delivery-attempt:${string}`;
export type DurableAdapterIdempotencyRef = `idempotency:${string}`;
export type DurableAdapterReplayRef = `replay:${string}`;
export type DurableAdapterCorrelationRef = `correlation:${string}`;
export type DurableAdapterAttemptEvidenceRef = `attempt-evidence:${string}`;
export type DurableAdapterReadinessSnapshotRef = `readiness-snapshot:${string}`;
export type DurableAdapterDiagnosticRef = `diagnostic:${string}`;
export type DurableAdapterAuditSummaryRef = `audit-summary:${string}`;
export type DurableAdapterChannelRef = `channel:${string}`;
export type DurableAdapterChatRef = `chat:${string}`;
export type DurableAdapterThreadRef = `thread:${string}`;
export type DurableAdapterMessageRef = `message:${string}`;
export type DurableAdapterActionRef = `action:${string}`;
export type DurableAdapterActorCategoryRef = `actor-category:${string}`;
export type DurableAdapterComponentRef = `component:${string}`;
export type DurableAdapterCursorRef = `cursor:${string}`;

export type DurableAdapterStateKind =
  | 'topic-binding-state'
  | 'callback-token-state'
  | 'callback-permission-consume-state'
  | 'delivery-attempt-state'
  | 'inbound-idempotency-state'
  | 'replay-cursor-state'
  | 'correlation-state'
  | 'real-integration-attempt-evidence-state'
  | 'readiness-snapshot-state'
  | 'redacted-diagnostic-audit-summary-state';

export type DurableAdapterStateStatus =
  | 'active'
  | 'disabled'
  | 'archived'
  | 'issued'
  | 'verified'
  | 'consumed'
  | 'expired'
  | 'permission-allowed'
  | 'permission-denied'
  | 'consume-skipped'
  | 'reserved'
  | 'processing'
  | 'completed'
  | 'duplicate-suppressed'
  | 'safe-noop'
  | 'retryable'
  | 'terminal'
  | 'blocked'
  | 'failed-safe'
  | 'ready-to-attempt'
  | 'ready-to-run'
  | 'not-attempted'
  | 'acknowledgement-only'
  | 'business-succeeded'
  | 'not-production-ready'
  | 'adapter-ready-for-real-system-integration-under-explicit-gates';

export type DurableAdapterIssueCode =
  | 'none'
  | 'missing-binding'
  | 'disabled-binding'
  | 'expired-callback-token-ref'
  | 'unknown-callback-token-ref'
  | 'permission-denied'
  | 'consume-skipped'
  | 'duplicate-suppressed'
  | 'provider-ack-only'
  | 'business-success-missing'
  | 'ready-to-attempt-not-pass'
  | 'ready-to-run-not-pass'
  | 'fake-inert-only'
  | 'no-production-durable-backend'
  | 'redacted-diagnostic-only'
  | 'unsafe-input-redacted'
  | 'blocked-by-explicit-gate'
  | 'failed-safe';

export type DurableAdapterRetryability = 'not-retryable' | 'retryable' | 'unknown';
export type DurableAdapterDuplicateDisposition = 'first-seen' | 'duplicate-suppressed' | 'safe-noop';
export type DurableAdapterReplayMode = 'audit-only' | 'duplicate-check' | 'bounded-replay-plan';
export type DurableAdapterCorrelationSeverity = 'info' | 'warning' | 'blocked' | 'failed-safe';
export type DurableAdapterReadinessGateStatus = 'closed' | 'open' | 'not-required';

export interface DurableAdapterRedactedSummary {
  readonly diagnosticRef?: DurableAdapterDiagnosticRef;
  readonly summaryKind: 'redacted-summary';
  readonly status: DurableAdapterStateStatus;
  readonly issueCode?: DurableAdapterIssueCode;
  readonly detailCode?: string;
  readonly safeRefs?: readonly DurableAdapterSafeRef[];
  readonly jsonSafe: true;
}

export interface DurableAdapterStateContractBase {
  readonly safeRef: DurableAdapterSafeRef;
  readonly stateRef: DurableAdapterStateRef;
  readonly stateKind: DurableAdapterStateKind;
  readonly status: DurableAdapterStateStatus;
  readonly issueCode?: DurableAdapterIssueCode;
  readonly correlationRef?: DurableAdapterCorrelationRef;
  readonly redactedSummary?: DurableAdapterRedactedSummary;
  readonly publicProjection: DurableAdapterPublicProjectionKind;
  readonly representation: DurableAdapterStateRepresentation;
  readonly runtimeOnlyValuesSerializable: false;
  readonly productionDurableBackend: DurableAdapterDurableBackendPosture;
}

export interface DurableAdapterTopicBindingState extends DurableAdapterStateContractBase {
  readonly stateKind: 'topic-binding-state';
  readonly bindingRef: DurableAdapterBindingRef;
  readonly channelRef: DurableAdapterChannelRef;
  readonly chatRef: DurableAdapterChatRef;
  readonly threadRef?: DurableAdapterThreadRef;
  readonly displayRef?: DurableAdapterSafeRef;
  readonly routingAuthority: 'channel-chat-thread-safe-refs';
}

export interface DurableAdapterCallbackTokenState extends DurableAdapterStateContractBase {
  readonly stateKind: 'callback-token-state';
  readonly callbackRef: DurableAdapterCallbackRef;
  readonly tokenRef: DurableAdapterCallbackTokenRef;
  readonly expectedContextRef: DurableAdapterSafeRef;
  readonly expiresAt?: string;
  readonly opaqueRefOnly: true;
}

export interface DurableAdapterCallbackPermissionConsumeState extends DurableAdapterStateContractBase {
  readonly stateKind: 'callback-permission-consume-state';
  readonly callbackRef: DurableAdapterCallbackRef;
  readonly tokenRef?: DurableAdapterCallbackTokenRef;
  readonly actionRef?: DurableAdapterActionRef;
  readonly permissionRef: DurableAdapterSafeRef;
  readonly consumeRef: DurableAdapterSafeRef;
  readonly permissionBeforeConsume: true;
  readonly permissionAllowed: boolean;
  readonly tokenVerified?: boolean;
  readonly tokenConsumed: boolean;
  readonly duplicateDisposition?: DurableAdapterDuplicateDisposition;
}

export interface DurableAdapterDeliveryAttemptState extends DurableAdapterStateContractBase {
  readonly stateKind: 'delivery-attempt-state';
  readonly deliveryAttemptRef: DurableAdapterDeliveryAttemptRef;
  readonly idempotencyRef: DurableAdapterIdempotencyRef;
  readonly messageRef?: DurableAdapterMessageRef;
  readonly providerAcknowledged: boolean;
  readonly businessSuccess: boolean;
  readonly retryability: DurableAdapterRetryability;
  readonly duplicateDisposition?: DurableAdapterDuplicateDisposition;
}

export interface DurableAdapterInboundIdempotencyState extends DurableAdapterStateContractBase {
  readonly stateKind: 'inbound-idempotency-state';
  readonly idempotencyRef: DurableAdapterIdempotencyRef;
  readonly eventRef: DurableAdapterSafeRef;
  readonly reservationRef: DurableAdapterSafeRef;
  readonly duplicateDisposition: DurableAdapterDuplicateDisposition;
  readonly effectSuppressed: boolean;
}

export interface DurableAdapterReplayCursorState extends DurableAdapterStateContractBase {
  readonly stateKind: 'replay-cursor-state';
  readonly replayRef: DurableAdapterReplayRef;
  readonly cursorRef: DurableAdapterCursorRef;
  readonly replayMode: DurableAdapterReplayMode;
  readonly duplicateDisposition?: DurableAdapterDuplicateDisposition;
  readonly boundedCount?: number;
}

export interface DurableAdapterCorrelationState extends DurableAdapterStateContractBase {
  readonly stateKind: 'correlation-state';
  readonly correlationRef: DurableAdapterCorrelationRef;
  readonly componentRef: DurableAdapterComponentRef;
  readonly operationRef?: DurableAdapterSafeRef;
  readonly severity: DurableAdapterCorrelationSeverity;
  readonly relatedRefs?: readonly DurableAdapterSafeRef[];
}

export interface DurableAdapterRealIntegrationAttemptEvidenceState extends DurableAdapterStateContractBase {
  readonly stateKind: 'real-integration-attempt-evidence-state';
  readonly attemptEvidenceRef: DurableAdapterAttemptEvidenceRef;
  readonly readinessGate: DurableAdapterReadinessGateStatus;
  readonly readyToAttemptIsPass: false;
  readonly providerAcknowledged: boolean;
  readonly businessSuccess: boolean;
  readonly providerAcknowledgementImpliesBusinessSuccess: false;
  readonly passRequiresProviderAcknowledgementAndBusinessSuccess: true;
  readonly evidenceRedacted: true;
}

export interface DurableAdapterReadinessSnapshotState extends DurableAdapterStateContractBase {
  readonly stateKind: 'readiness-snapshot-state';
  readonly readinessSnapshotRef: DurableAdapterReadinessSnapshotRef;
  readonly adapterReadiness: DurableAdapterReadinessClassification;
  readonly productionReadiness: DurableAdapterProductionReadiness;
  readonly readyToAttemptIsPass: false;
  readonly readyToRunIsPass: false;
  readonly durableBackendPosture: DurableAdapterDurableBackendPosture;
  readonly explicitGateStatus: DurableAdapterReadinessGateStatus;
  readonly issueCodes?: readonly DurableAdapterIssueCode[];
}

export interface DurableAdapterRedactedDiagnosticAuditSummaryState extends DurableAdapterStateContractBase {
  readonly stateKind: 'redacted-diagnostic-audit-summary-state';
  readonly diagnosticRef: DurableAdapterDiagnosticRef;
  readonly auditSummaryRef: DurableAdapterAuditSummaryRef;
  readonly actorCategoryRef?: DurableAdapterActorCategoryRef;
  readonly eventClassRef?: DurableAdapterSafeRef;
  readonly redactedSummary: DurableAdapterRedactedSummary;
}

export type DurableAdapterStateContract =
  | DurableAdapterTopicBindingState
  | DurableAdapterCallbackTokenState
  | DurableAdapterCallbackPermissionConsumeState
  | DurableAdapterDeliveryAttemptState
  | DurableAdapterInboundIdempotencyState
  | DurableAdapterReplayCursorState
  | DurableAdapterCorrelationState
  | DurableAdapterRealIntegrationAttemptEvidenceState
  | DurableAdapterReadinessSnapshotState
  | DurableAdapterRedactedDiagnosticAuditSummaryState;

export type DurableAdapterPublicStateProjection = DurableAdapterStateContract & {
  readonly publicProjection: 'redacted-json-safe';
  readonly representation: 'fake-inert-contract-only';
  readonly runtimeOnlyValuesSerializable: false;
  readonly productionDurableBackend: 'not-implemented';
};
