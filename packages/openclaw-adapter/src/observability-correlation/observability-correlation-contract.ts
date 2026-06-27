export type ObservabilityCorrelationJsonPrimitive = string | number | boolean | null;

export type ObservabilityCorrelationJsonValue =
  | ObservabilityCorrelationJsonPrimitive
  | readonly ObservabilityCorrelationJsonValue[]
  | { readonly [key: string]: ObservabilityCorrelationJsonValue };

export type ObservabilityCorrelationContractRepresentation = 'source-contract-types-only';
export type ObservabilityCorrelationPublicProjectionKind = 'redacted-json-safe';
export type ObservabilityCorrelationRuntimeBehavior = 'not-implemented';
export type ObservabilityCorrelationTelemetryBehavior = 'not-implemented';
export type ObservabilityCorrelationProductionPosture = 'not-production-ready';

export type ObservabilitySafePublicRef = `${string}:${string}`;

/**
 * Safe synthetic correlation refs link public records without carrying raw trace dumps.
 * They must stay bounded, stable, redaction-compatible, and derived from normalized public material.
 */
export type ObservabilityCorrelationRef = `corr:${ObservabilityCorrelationRefKind}:${string}`;

export type ObservabilityCorrelationRefKind =
  | 'event'
  | 'intent'
  | 'presentation'
  | 'delivery'
  | 'callback'
  | 'approval'
  | 'runtime-operation'
  | 'restore'
  | 'replay'
  | 'readiness';

export type ObservabilityEventRef = `event:${string}`;
export type ObservabilityAuditProjectionRef = `audit:${string}`;
export type ObservabilityComponentRef = `component:${ObservabilityComponentKind}:${string}`;
export type ObservabilityOperationRef = `operation:${string}`;
export type ObservabilityReasonRef = `reason:${string}`;
export type ObservabilitySummaryRef = `summary:${string}`;

export type ObservabilityComponentKind =
  | 'plugin-runtime'
  | 'adapter-core-facade'
  | 'event-normalizer'
  | 'topic-binding-store'
  | 'presentation-renderer'
  | 'delivery-port'
  | 'callback-handler'
  | 'approval-bridge'
  | 'runtime-capability-registry'
  | 'replay-runner'
  | 'readiness-snapshotter';

export type ObservabilityOperationKind =
  | 'external-event-processing'
  | 'core-intent-submission'
  | 'presentation-rendering'
  | 'delivery-attempt'
  | 'callback-dispatch'
  | 'approval-resolution'
  | 'runtime-operation'
  | 'restore-job'
  | 'replay-job'
  | 'readiness-snapshot';

export type ObservabilityEventKind =
  | 'operation-started'
  | 'operation-progressed'
  | 'operation-finished'
  | 'operation-blocked'
  | 'operation-skipped'
  | 'operation-failed-safe'
  | 'provider-acknowledgement-observed'
  | 'business-success-observed'
  | 'retry-classified'
  | 'replay-classified'
  | 'correlation-linked';

export type ObservabilitySafeStatus =
  | 'started'
  | 'in-progress'
  | 'succeeded'
  | 'retryable-failed'
  | 'failed-safe'
  | 'blocked'
  | 'skipped'
  | 'degraded'
  | 'ready-to-attempt'
  | 'ready-to-run'
  | 'unknown';

/** Skipped, blocked, ready-to-attempt, and ready-to-run states are explicit non-pass states. */
export type ObservabilityNonPassState = 'skipped' | 'blocked' | 'ready-to-attempt' | 'ready-to-run';

export type ObservabilitySafeSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export type ObservabilitySafeReasonCode =
  | 'none'
  | 'safe-noop'
  | 'duplicate-suppressed'
  | 'missing-binding'
  | 'disabled-binding'
  | 'permission-denied'
  | 'callback-consume-skipped'
  | 'provider-acknowledgement-only'
  | 'business-success-missing'
  | 'retry-eligible'
  | 'retry-not-eligible'
  | 'replay-eligible'
  | 'replay-not-eligible'
  | 'blocked-by-explicit-gate'
  | 'ready-to-attempt-not-pass'
  | 'ready-to-run-not-pass'
  | 'unsafe-public-output-blocked'
  | 'raw-payload-contained'
  | 'runtime-value-contained'
  | 'failed-safe';

export type ObservabilityBoundedDurationBucket =
  | 'not-measured'
  | 'lt-100ms'
  | '100ms-to-1s'
  | '1s-to-10s'
  | '10s-to-60s'
  | 'gt-60s'
  | 'timed-out';

export type ObservabilityRetryReplayEligibility =
  | 'not-eligible'
  | 'eligible'
  | 'operator-review-required'
  | 'unknown';

/** Provider acknowledgement is classified separately from business success. */
export type ObservabilityProviderAcknowledgementClassification =
  | 'not-required'
  | 'not-attempted'
  | 'acknowledged'
  | 'not-acknowledged'
  | 'acknowledgement-only'
  | 'blocked'
  | 'unknown';

export type ObservabilityBusinessSuccessClassification =
  | 'not-evaluated'
  | 'confirmed'
  | 'not-confirmed'
  | 'blocked'
  | 'unknown';

export type ObservabilityBoundedRedactedSummary = string;

export interface ObservabilityReferenceGraphLink {
  readonly sourceRef: ObservabilitySafePublicRef;
  readonly targetRef: ObservabilitySafePublicRef;
  readonly relationKind: 'caused-by' | 'derived-from' | 'duplicates' | 'retries' | 'replays' | 'summarizes';
}

export interface ObservabilityCorrelationReferenceDescriptor {
  readonly correlationRef: ObservabilityCorrelationRef;
  readonly correlationRefKind: ObservabilityCorrelationRefKind;
  readonly syntheticBoundedRef: true;
  readonly rawTraceDumpSerializable: false;
  readonly publicProjection: ObservabilityCorrelationPublicProjectionKind;
  readonly representation: ObservabilityCorrelationContractRepresentation;
}

export interface ObservabilityEventReferenceDescriptor {
  readonly eventRef: ObservabilityEventRef;
  readonly correlationRef: ObservabilityCorrelationRef;
  readonly componentRef: ObservabilityComponentRef;
  readonly operationRef?: ObservabilityOperationRef;
  readonly operationKind: ObservabilityOperationKind;
  readonly eventKind: ObservabilityEventKind;
}

export interface ObservabilityStatusProjection {
  readonly status: ObservabilitySafeStatus;
  readonly severity: ObservabilitySafeSeverity;
  readonly reasonCode?: ObservabilitySafeReasonCode;
  readonly durationBucket?: ObservabilityBoundedDurationBucket;
  readonly nonPassState?: ObservabilityNonPassState;
}

export interface ObservabilityProviderAndBusinessProjection {
  readonly providerAcknowledgement: ObservabilityProviderAcknowledgementClassification;
  readonly businessSuccess: ObservabilityBusinessSuccessClassification;
  readonly providerAcknowledgementImpliesBusinessSuccess: false;
}

export interface ObservabilityRetryReplayProjection {
  readonly retryEligibility: ObservabilityRetryReplayEligibility;
  readonly replayEligibility: ObservabilityRetryReplayEligibility;
}

export interface ObservabilityRedactedPublicSummary {
  readonly summaryRef: ObservabilitySummaryRef;
  readonly summaryKind: 'redacted-observability-summary';
  readonly correlationRef?: ObservabilityCorrelationRef;
  readonly componentRef: ObservabilityComponentRef;
  readonly operationKind: ObservabilityOperationKind;
  readonly status: ObservabilitySafeStatus;
  readonly severity: ObservabilitySafeSeverity;
  readonly reasonCode?: ObservabilitySafeReasonCode;
  readonly durationBucket?: ObservabilityBoundedDurationBucket;
  readonly providerAcknowledgement: ObservabilityProviderAcknowledgementClassification;
  readonly businessSuccess: ObservabilityBusinessSuccessClassification;
  readonly retryEligibility?: ObservabilityRetryReplayEligibility;
  readonly replayEligibility?: ObservabilityRetryReplayEligibility;
  readonly relatedRefs?: readonly ObservabilitySafePublicRef[];
  readonly relationLinks?: readonly ObservabilityReferenceGraphLink[];
  readonly safeSummary?: ObservabilityBoundedRedactedSummary;
  readonly publicProjection: ObservabilityCorrelationPublicProjectionKind;
  readonly jsonSafe: true;
  readonly runtimeOnlyValuesSerializable: false;
}

/** Raw payloads and runtime values must not cross public observability boundaries. */
export interface ObservabilitySafeEventProjection {
  readonly eventRef: ObservabilityEventRef;
  readonly correlationRef: ObservabilityCorrelationRef;
  readonly componentRef: ObservabilityComponentRef;
  readonly operationRef?: ObservabilityOperationRef;
  readonly operationKind: ObservabilityOperationKind;
  readonly eventKind: ObservabilityEventKind;
  readonly status: ObservabilitySafeStatus;
  readonly severity: ObservabilitySafeSeverity;
  readonly reasonCode?: ObservabilitySafeReasonCode;
  readonly durationBucket?: ObservabilityBoundedDurationBucket;
  readonly providerAcknowledgement: ObservabilityProviderAcknowledgementClassification;
  readonly businessSuccess: ObservabilityBusinessSuccessClassification;
  readonly providerAcknowledgementImpliesBusinessSuccess: false;
  readonly retryEligibility?: ObservabilityRetryReplayEligibility;
  readonly replayEligibility?: ObservabilityRetryReplayEligibility;
  readonly relatedRefs?: readonly ObservabilitySafePublicRef[];
  readonly safeSummary?: ObservabilityBoundedRedactedSummary;
  readonly publicProjection: ObservabilityCorrelationPublicProjectionKind;
  readonly jsonSafe: true;
  readonly runtimeOnlyValuesSerializable: false;
  readonly runtimeBehavior: ObservabilityCorrelationRuntimeBehavior;
  readonly telemetryBehavior: ObservabilityCorrelationTelemetryBehavior;
}

export interface ObservabilitySafeAuditProjection {
  readonly auditProjectionRef: ObservabilityAuditProjectionRef;
  readonly correlationRef: ObservabilityCorrelationRef;
  readonly componentRef: ObservabilityComponentRef;
  readonly operationKind: ObservabilityOperationKind;
  readonly statusProjection: ObservabilityStatusProjection;
  readonly providerAndBusinessProjection: ObservabilityProviderAndBusinessProjection;
  readonly retryReplayProjection?: ObservabilityRetryReplayProjection;
  readonly relatedRefs?: readonly ObservabilitySafePublicRef[];
  readonly relationLinks?: readonly ObservabilityReferenceGraphLink[];
  readonly redactedPublicSummary: ObservabilityRedactedPublicSummary;
  readonly publicProjection: ObservabilityCorrelationPublicProjectionKind;
  readonly jsonSafe: true;
}

export interface ObservabilityCorrelationContractPosture {
  readonly representation: ObservabilityCorrelationContractRepresentation;
  readonly publicProjection: ObservabilityCorrelationPublicProjectionKind;
  readonly runtimeBehavior: ObservabilityCorrelationRuntimeBehavior;
  readonly telemetryBehavior: ObservabilityCorrelationTelemetryBehavior;
  readonly sinkOrBackendBehavior: 'not-implemented';
  readonly networkBehavior: 'not-implemented';
  readonly providerClientBehavior: 'not-implemented';
  readonly productionPosture: ObservabilityCorrelationProductionPosture;
}
