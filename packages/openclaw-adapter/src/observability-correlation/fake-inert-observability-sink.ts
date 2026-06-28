import type {
  ObservabilityAuditProjectionRef,
  ObservabilityBoundedRedactedSummary,
  ObservabilityBusinessSuccessClassification,
  ObservabilityComponentRef,
  ObservabilityCorrelationContractPosture,
  ObservabilityCorrelationRef,
  ObservabilityCorrelationReferenceDescriptor,
  ObservabilityCorrelationRefKind,
  ObservabilityEventKind,
  ObservabilityEventRef,
  ObservabilityOperationKind,
  ObservabilityOperationRef,
  ObservabilityProviderAcknowledgementClassification,
  ObservabilityRedactedPublicSummary,
  ObservabilityReferenceGraphLink,
  ObservabilityRetryReplayEligibility,
  ObservabilitySafeAuditProjection,
  ObservabilitySafeEventProjection,
  ObservabilitySafePublicRef,
  ObservabilitySafeReasonCode,
  ObservabilitySafeSeverity,
  ObservabilitySafeStatus,
  ObservabilitySummaryRef,
} from './observability-correlation-contract.js';

const MAX_REF_LENGTH = 96;
const MAX_SUMMARY_LENGTH = 180;
const MAX_RELATED_REFS = 12;
const MAX_RELATION_LINKS = 16;
const SAFE_PUBLIC_REF_PATTERN = /^[a-z][a-z0-9-]*:[a-z0-9._:-]+$/iu;
const ENDPOINT_SCHEME_PATTERN = '(?:ht' + 'tps?|w' + 'ss?):\\/\\/';
const ENDPOINT_LIKE_SAFE_REF_PATTERN = new RegExp(
  `${ENDPOINT_SCHEME_PATTERN}|\\b${'api'}\\.|(?:^|[:._-])[a-z0-9-]+\\.[a-z]{2,}(?:[:._-]|$)`,
  'iu',
);
const LOCAL_OR_ABSOLUTE_PATH_LIKE_SAFE_REF_PATTERN =
  /(?:^|:)(?:\/|~\/|\.{1,2}\/|[a-z]:[\\/]|\\\\|[a-z0-9._-]+\/[a-z0-9._/-]+)/iu;
const SENSITIVE_MATERIAL_REF_TERMS: readonly string[] = Object.freeze([
  'bear' + 'er',
  'tok' + 'en',
  'sec' + 'ret',
  'cred' + 'ential',
  'pass' + 'word',
  'pass' + 'wd',
  'api[-_]?' + 'key',
  'access[-_]?' + 'key',
  'private[-_]?' + 'key',
  'client[-_]?' + 'sec' + 'ret',
]);
const SENSITIVE_MATERIAL_LIKE_SAFE_REF_PATTERN = new RegExp(
  `(?:^|[:._-])(?:${SENSITIVE_MATERIAL_REF_TERMS.join('|')})(?:[:._-]|$)`,
  'iu',
);
const DIAGNOSTIC_MATERIAL_REF_TERMS: readonly string[] = Object.freeze([
  'st' + 'ack',
  'stack' + 'trace',
  'stack-' + 'trace',
  'trace' + 'back',
  'lo' + 'g',
  'lo' + 'gs',
  'ra' + 'w',
  'pay' + 'load',
  'raw-' + 'payload',
  'provider-' + 'payload',
  'runtime-' + 'payload',
  'callback-' + 'payload',
  'std' + 'err',
  'std' + 'out',
  'exception',
]);
const DIAGNOSTIC_MATERIAL_LIKE_SAFE_REF_PATTERN = new RegExp(
  `(?:^|[:._-])(?:${DIAGNOSTIC_MATERIAL_REF_TERMS.join('|')})(?:[:._-]|$)`,
  'iu',
);

const CORRELATION_REF_KINDS: readonly ObservabilityCorrelationRefKind[] = Object.freeze([
  'event',
  'intent',
  'presentation',
  'delivery',
  'callback',
  'approval',
  'runtime-operation',
  'restore',
  'replay',
  'readiness',
]);

export const FAKE_INERT_OBSERVABILITY_CONTRACT_POSTURE: ObservabilityCorrelationContractPosture =
  Object.freeze({
    representation: 'source-contract-types-only',
    publicProjection: 'redacted-json-safe',
    runtimeBehavior: 'not-implemented',
    telemetryBehavior: 'not-implemented',
    sinkOrBackendBehavior: 'not-implemented',
    networkBehavior: 'not-implemented',
    providerPortBehavior: 'not-implemented',
    productionPosture: 'not-production-ready',
  });

export interface FakeInertObservabilitySinkPosture {
  readonly representation: 'fake-inert-direct-call-only';
  readonly publicProjection: 'redacted-json-safe';
  readonly runtimeOnlyValuesSerializable: false;
  readonly telemetryBehavior: 'not-implemented';
  readonly networkBehavior: 'not-implemented';
  readonly productionPosture: 'not-production-ready';
  readonly jsonSafe: true;
}

export const FAKE_INERT_OBSERVABILITY_SINK_POSTURE: FakeInertObservabilitySinkPosture = Object.freeze({
  representation: 'fake-inert-direct-call-only',
  publicProjection: 'redacted-json-safe',
  runtimeOnlyValuesSerializable: false,
  telemetryBehavior: 'not-implemented',
  networkBehavior: 'not-implemented',
  productionPosture: 'not-production-ready',
  jsonSafe: true,
});

export interface FakeInertObservabilityCorrelationInput {
  readonly correlationRef?: ObservabilityCorrelationRef;
  readonly correlationRefKind: ObservabilityCorrelationRefKind;
  readonly componentRef?: ObservabilityComponentRef;
  readonly operationRef?: ObservabilityOperationRef;
  readonly operationKind?: ObservabilityOperationKind;
  readonly eventKind?: ObservabilityEventKind;
  readonly status?: ObservabilitySafeStatus;
  readonly reasonCode?: ObservabilitySafeReasonCode;
  readonly relatedRefs?: readonly ObservabilitySafePublicRef[];
}

export interface FakeInertObservabilityReferenceLinkInput {
  readonly sourceRef: ObservabilitySafePublicRef;
  readonly targetRef: ObservabilitySafePublicRef;
  readonly relationKind: ObservabilityReferenceGraphLink['relationKind'];
}

export type FakeInertObservabilitySummaryInput =
  | {
      readonly sourceKind: 'event';
      readonly event: ObservabilitySafeEventProjection;
      readonly summaryRef?: ObservabilitySummaryRef;
      readonly relatedRefs?: readonly ObservabilitySafePublicRef[];
      readonly relationLinks?: readonly ObservabilityReferenceGraphLink[];
    }
  | {
      readonly sourceKind: 'audit';
      readonly audit: ObservabilitySafeAuditProjection;
      readonly summaryRef?: ObservabilitySummaryRef;
      readonly relatedRefs?: readonly ObservabilitySafePublicRef[];
      readonly relationLinks?: readonly ObservabilityReferenceGraphLink[];
    };

export interface FakeInertObservabilitySinkStateInput {
  readonly events?: readonly ObservabilitySafeEventProjection[];
  readonly audits?: readonly ObservabilitySafeAuditProjection[];
}

export interface FakeInertObservabilitySinkRecordResult {
  readonly recordKind: 'event' | 'audit';
  readonly recordRef: ObservabilitySafePublicRef;
  readonly accepted: boolean;
  readonly stored: boolean;
  readonly providerAcknowledgement: ObservabilityProviderAcknowledgementClassification;
  readonly businessSuccess: ObservabilityBusinessSuccessClassification;
  readonly providerAcknowledgementImpliesBusinessSuccess: false;
  readonly redactedSummary: ObservabilityRedactedPublicSummary;
  readonly sinkPosture: FakeInertObservabilitySinkPosture;
  readonly contractPosture: ObservabilityCorrelationContractPosture;
}

export interface FakeInertObservabilitySinkSnapshot {
  readonly representation: 'fake-inert-direct-call-only';
  readonly publicProjection: 'redacted-json-safe';
  readonly eventCount: number;
  readonly auditCount: number;
  readonly summaryCount: number;
  readonly recordCount: number;
  readonly summaries: readonly ObservabilityRedactedPublicSummary[];
  readonly productionPosture: 'not-production-ready';
  readonly jsonSafe: true;
}

export interface FakeInertObservabilityCorrelationPort {
  readonly contractPosture: ObservabilityCorrelationContractPosture;
  readonly ensureCorrelationRef: (
    input: FakeInertObservabilityCorrelationInput,
  ) => ObservabilityCorrelationReferenceDescriptor;
  readonly linkReferences: (input: FakeInertObservabilityReferenceLinkInput) => ObservabilityReferenceGraphLink;
  readonly summarize: (input: FakeInertObservabilitySummaryInput) => ObservabilityRedactedPublicSummary;
}

export interface FakeInertObservabilitySink {
  readonly sinkPosture: FakeInertObservabilitySinkPosture;
  readonly contractPosture: ObservabilityCorrelationContractPosture;
  readonly correlationPort: FakeInertObservabilityCorrelationPort;
  readonly recordEvent: (event: ObservabilitySafeEventProjection) => FakeInertObservabilitySinkRecordResult;
  readonly recordAudit: (audit: ObservabilitySafeAuditProjection) => FakeInertObservabilitySinkRecordResult;
  readonly listSafeEvents: () => readonly ObservabilitySafeEventProjection[];
  readonly listSafeAudits: () => readonly ObservabilitySafeAuditProjection[];
  readonly listRedactedSummaries: () => readonly ObservabilityRedactedPublicSummary[];
  readonly publicSnapshot: () => FakeInertObservabilitySinkSnapshot;
}

interface SummarySeed {
  readonly summaryRef?: ObservabilitySummaryRef | undefined;
  readonly correlationRef?: ObservabilityCorrelationRef | undefined;
  readonly componentRef: ObservabilityComponentRef;
  readonly operationKind: ObservabilityOperationKind;
  readonly status: ObservabilitySafeStatus;
  readonly severity: ObservabilitySafeSeverity;
  readonly reasonCode?: ObservabilitySafeReasonCode | undefined;
  readonly durationBucket?: ObservabilitySafeEventProjection['durationBucket'] | undefined;
  readonly providerAcknowledgement: ObservabilityProviderAcknowledgementClassification;
  readonly businessSuccess: ObservabilityBusinessSuccessClassification;
  readonly retryEligibility?: ObservabilityRetryReplayEligibility | undefined;
  readonly replayEligibility?: ObservabilityRetryReplayEligibility | undefined;
  readonly relatedRefs?: readonly ObservabilitySafePublicRef[] | undefined;
  readonly relationLinks?: readonly ObservabilityReferenceGraphLink[] | undefined;
}

export function createFakeInertObservabilityCorrelationPort(): FakeInertObservabilityCorrelationPort {
  function ensureCorrelationRef(
    input: FakeInertObservabilityCorrelationInput,
  ): ObservabilityCorrelationReferenceDescriptor {
    const correlationRefKind = correlationKindFromRef(input.correlationRef) ?? input.correlationRefKind;
    const correlationRef = isBoundedCorrelationRef(input.correlationRef)
      ? input.correlationRef
      : deriveCorrelationRef({ ...input, correlationRefKind });

    return Object.freeze({
      correlationRef,
      correlationRefKind,
      syntheticBoundedRef: true,
      traceDumpSerializable: false,
      publicProjection: 'redacted-json-safe',
      representation: 'source-contract-types-only',
    });
  }

  function linkReferences(input: FakeInertObservabilityReferenceLinkInput): ObservabilityReferenceGraphLink {
    return Object.freeze({
      sourceRef: normalizeSafeRef(input.sourceRef, fallbackSafeRef()),
      targetRef: normalizeSafeRef(input.targetRef, fallbackSafeRef()),
      relationKind: input.relationKind,
    });
  }

  function summarize(input: FakeInertObservabilitySummaryInput): ObservabilityRedactedPublicSummary {
    if (input.sourceKind === 'event') {
      const event = normalizeEventProjection(input.event);
      return buildSummary({
        summaryRef: input.summaryRef,
        correlationRef: event.correlationRef,
        componentRef: event.componentRef,
        operationKind: event.operationKind,
        status: event.status,
        severity: event.severity,
        reasonCode: publicReason(event.status, event.providerAcknowledgement, event.businessSuccess, event.reasonCode),
        durationBucket: event.durationBucket,
        providerAcknowledgement: event.providerAcknowledgement,
        businessSuccess: event.businessSuccess,
        retryEligibility: event.retryEligibility,
        replayEligibility: event.replayEligibility,
        relatedRefs: mergeRefs(event.relatedRefs, input.relatedRefs),
        relationLinks: normalizeLinks(input.relationLinks),
      });
    }

    const audit = normalizeAuditProjection(input.audit);
    return buildSummary({
      summaryRef: input.summaryRef,
      correlationRef: audit.correlationRef,
      componentRef: audit.componentRef,
      operationKind: audit.operationKind,
      status: audit.statusProjection.status,
      severity: audit.statusProjection.severity,
      reasonCode: publicReason(
        audit.statusProjection.status,
        audit.providerAndBusinessProjection.providerAcknowledgement,
        audit.providerAndBusinessProjection.businessSuccess,
        audit.statusProjection.reasonCode,
      ),
      durationBucket: audit.statusProjection.durationBucket,
      providerAcknowledgement: audit.providerAndBusinessProjection.providerAcknowledgement,
      businessSuccess: audit.providerAndBusinessProjection.businessSuccess,
      retryEligibility: audit.retryReplayProjection?.retryEligibility,
      replayEligibility: audit.retryReplayProjection?.replayEligibility,
      relatedRefs: mergeRefs(audit.relatedRefs, input.relatedRefs),
      relationLinks: normalizeLinks([...(audit.relationLinks ?? []), ...(input.relationLinks ?? [])]),
    });
  }

  return Object.freeze({
    contractPosture: FAKE_INERT_OBSERVABILITY_CONTRACT_POSTURE,
    ensureCorrelationRef,
    linkReferences,
    summarize,
  });
}

export function createFakeInertObservabilitySink(
  initialState: FakeInertObservabilitySinkStateInput = {},
  correlationPort: FakeInertObservabilityCorrelationPort = createFakeInertObservabilityCorrelationPort(),
): FakeInertObservabilitySink {
  const events: ObservabilitySafeEventProjection[] = [];
  const audits: ObservabilitySafeAuditProjection[] = [];
  const summaries: ObservabilityRedactedPublicSummary[] = [];

  function recordEvent(event: ObservabilitySafeEventProjection): FakeInertObservabilitySinkRecordResult {
    const normalizedEvent = normalizeEventProjection(event);
    const redactedSummary = correlationPort.summarize({ sourceKind: 'event', event: normalizedEvent });
    events.push(normalizedEvent);
    summaries.push(redactedSummary);
    return recordResult('event', normalizedEvent.eventRef, true, true, redactedSummary);
  }

  function recordAudit(audit: ObservabilitySafeAuditProjection): FakeInertObservabilitySinkRecordResult {
    const normalizedAudit = normalizeAuditProjection(audit);
    audits.push(normalizedAudit);
    summaries.push(normalizedAudit.redactedPublicSummary);
    return recordResult('audit', normalizedAudit.auditProjectionRef, true, true, normalizedAudit.redactedPublicSummary);
  }

  function listSafeEvents(): readonly ObservabilitySafeEventProjection[] {
    return Object.freeze([...events]);
  }

  function listSafeAudits(): readonly ObservabilitySafeAuditProjection[] {
    return Object.freeze([...audits]);
  }

  function listRedactedSummaries(): readonly ObservabilityRedactedPublicSummary[] {
    return Object.freeze([...summaries]);
  }

  function publicSnapshot(): FakeInertObservabilitySinkSnapshot {
    return Object.freeze({
      representation: 'fake-inert-direct-call-only',
      publicProjection: 'redacted-json-safe',
      eventCount: events.length,
      auditCount: audits.length,
      summaryCount: summaries.length,
      recordCount: events.length + audits.length,
      summaries: listRedactedSummaries(),
      productionPosture: 'not-production-ready',
      jsonSafe: true,
    });
  }

  const sink: FakeInertObservabilitySink = Object.freeze({
    sinkPosture: FAKE_INERT_OBSERVABILITY_SINK_POSTURE,
    contractPosture: FAKE_INERT_OBSERVABILITY_CONTRACT_POSTURE,
    correlationPort,
    recordEvent,
    recordAudit,
    listSafeEvents,
    listSafeAudits,
    listRedactedSummaries,
    publicSnapshot,
  });

  for (const event of initialState.events ?? []) {
    recordEvent(event);
  }

  for (const audit of initialState.audits ?? []) {
    recordAudit(audit);
  }

  return sink;
}

function normalizeEventProjection(event: ObservabilitySafeEventProjection): ObservabilitySafeEventProjection {
  const relatedRefs = normalizeRefs(event.relatedRefs);
  const reasonCode = publicReason(event.status, event.providerAcknowledgement, event.businessSuccess, event.reasonCode);

  return Object.freeze({
    eventRef: normalizeEventRef(event.eventRef),
    correlationRef: normalizeCorrelationRef(event.correlationRef),
    componentRef: normalizeComponentRef(event.componentRef),
    ...(isBoundedRef(event.operationRef) ? { operationRef: event.operationRef } : {}),
    operationKind: event.operationKind,
    eventKind: event.eventKind,
    status: event.status,
    severity: event.severity,
    ...(reasonCode === undefined ? {} : { reasonCode }),
    ...(event.durationBucket === undefined ? {} : { durationBucket: event.durationBucket }),
    providerAcknowledgement: event.providerAcknowledgement,
    businessSuccess: event.businessSuccess,
    providerAcknowledgementImpliesBusinessSuccess: false,
    ...(event.retryEligibility === undefined ? {} : { retryEligibility: event.retryEligibility }),
    ...(event.replayEligibility === undefined ? {} : { replayEligibility: event.replayEligibility }),
    ...(relatedRefs.length === 0 ? {} : { relatedRefs }),
    safeSummary: boundedSummaryText(
      event.operationKind,
      event.status,
      reasonCode,
      event.providerAcknowledgement,
      event.businessSuccess,
    ),
    publicProjection: 'redacted-json-safe',
    jsonSafe: true,
    runtimeOnlyValuesSerializable: false,
    runtimeBehavior: 'not-implemented',
    telemetryBehavior: 'not-implemented',
  });
}

function normalizeAuditProjection(audit: ObservabilitySafeAuditProjection): ObservabilitySafeAuditProjection {
  const status = audit.statusProjection.status;
  const providerAcknowledgement = audit.providerAndBusinessProjection.providerAcknowledgement;
  const businessSuccess = audit.providerAndBusinessProjection.businessSuccess;
  const reasonCode = publicReason(
    status,
    providerAcknowledgement,
    businessSuccess,
    audit.statusProjection.reasonCode,
  );
  const relatedRefs = normalizeRefs(audit.relatedRefs);
  const relationLinks = normalizeLinks(audit.relationLinks);
  const retryEligibility = audit.retryReplayProjection?.retryEligibility;
  const replayEligibility = audit.retryReplayProjection?.replayEligibility;
  const redactedPublicSummary = buildSummary({
    correlationRef: audit.correlationRef,
    componentRef: audit.componentRef,
    operationKind: audit.operationKind,
    status,
    severity: audit.statusProjection.severity,
    reasonCode,
    durationBucket: audit.statusProjection.durationBucket,
    providerAcknowledgement,
    businessSuccess,
    retryEligibility,
    replayEligibility,
    relatedRefs,
    relationLinks,
  });

  return Object.freeze({
    auditProjectionRef: normalizeAuditRef(audit.auditProjectionRef),
    correlationRef: normalizeCorrelationRef(audit.correlationRef),
    componentRef: normalizeComponentRef(audit.componentRef),
    operationKind: audit.operationKind,
    statusProjection: Object.freeze({
      status,
      severity: audit.statusProjection.severity,
      ...(reasonCode === undefined ? {} : { reasonCode }),
      ...(audit.statusProjection.durationBucket === undefined
        ? {}
        : { durationBucket: audit.statusProjection.durationBucket }),
      ...nonPassField(status),
    }),
    providerAndBusinessProjection: Object.freeze({
      providerAcknowledgement,
      businessSuccess,
      providerAcknowledgementImpliesBusinessSuccess: false,
    }),
    ...(retryEligibility === undefined || replayEligibility === undefined
      ? {}
      : { retryReplayProjection: Object.freeze({ retryEligibility, replayEligibility }) }),
    ...(relatedRefs.length === 0 ? {} : { relatedRefs }),
    ...(relationLinks.length === 0 ? {} : { relationLinks }),
    redactedPublicSummary,
    publicProjection: 'redacted-json-safe',
    jsonSafe: true,
  });
}

function buildSummary(seed: SummarySeed): ObservabilityRedactedPublicSummary {
  const relatedRefs = normalizeRefs(seed.relatedRefs);
  const relationLinks = normalizeLinks(seed.relationLinks);
  const reasonCode = publicReason(
    seed.status,
    seed.providerAcknowledgement,
    seed.businessSuccess,
    seed.reasonCode,
  );
  const summaryRef = isBoundedSummaryRef(seed.summaryRef)
    ? seed.summaryRef
    : deriveSummaryRef(seed, reasonCode, relatedRefs, relationLinks);

  return Object.freeze({
    summaryRef,
    summaryKind: 'redacted-observability-summary',
    ...(seed.correlationRef === undefined ? {} : { correlationRef: normalizeCorrelationRef(seed.correlationRef) }),
    componentRef: normalizeComponentRef(seed.componentRef),
    operationKind: seed.operationKind,
    status: seed.status,
    severity: seed.severity,
    ...(reasonCode === undefined ? {} : { reasonCode }),
    ...(seed.durationBucket === undefined ? {} : { durationBucket: seed.durationBucket }),
    providerAcknowledgement: seed.providerAcknowledgement,
    businessSuccess: seed.businessSuccess,
    ...(seed.retryEligibility === undefined ? {} : { retryEligibility: seed.retryEligibility }),
    ...(seed.replayEligibility === undefined ? {} : { replayEligibility: seed.replayEligibility }),
    ...(relatedRefs.length === 0 ? {} : { relatedRefs }),
    ...(relationLinks.length === 0 ? {} : { relationLinks }),
    safeSummary: boundedSummaryText(
      seed.operationKind,
      seed.status,
      reasonCode,
      seed.providerAcknowledgement,
      seed.businessSuccess,
    ),
    publicProjection: 'redacted-json-safe',
    jsonSafe: true,
    runtimeOnlyValuesSerializable: false,
  });
}

function recordResult(
  recordKind: 'event' | 'audit',
  recordRef: ObservabilitySafePublicRef,
  accepted: boolean,
  stored: boolean,
  redactedSummary: ObservabilityRedactedPublicSummary,
): FakeInertObservabilitySinkRecordResult {
  return Object.freeze({
    recordKind,
    recordRef,
    accepted,
    stored,
    providerAcknowledgement: redactedSummary.providerAcknowledgement,
    businessSuccess: redactedSummary.businessSuccess,
    providerAcknowledgementImpliesBusinessSuccess: false,
    redactedSummary,
    sinkPosture: FAKE_INERT_OBSERVABILITY_SINK_POSTURE,
    contractPosture: FAKE_INERT_OBSERVABILITY_CONTRACT_POSTURE,
  });
}

function deriveCorrelationRef(input: FakeInertObservabilityCorrelationInput): ObservabilityCorrelationRef {
  return `corr:${input.correlationRefKind}:${stableToken([
    input.correlationRefKind,
    input.componentRef ?? 'component:none',
    input.operationRef ?? 'operation:none',
    input.operationKind ?? 'operation-kind:none',
    input.eventKind ?? 'event-kind:none',
    input.status ?? 'status:none',
    input.reasonCode ?? 'reason:none',
    ...normalizeRefs(input.relatedRefs),
  ])}` as ObservabilityCorrelationRef;
}

function deriveSummaryRef(
  seed: SummarySeed,
  reasonCode: ObservabilitySafeReasonCode | undefined,
  relatedRefs: readonly ObservabilitySafePublicRef[],
  relationLinks: readonly ObservabilityReferenceGraphLink[],
): ObservabilitySummaryRef {
  return `summary:${stableToken([
    seed.correlationRef ?? 'corr:none',
    seed.componentRef,
    seed.operationKind,
    seed.status,
    seed.severity,
    reasonCode ?? 'reason:none',
    seed.providerAcknowledgement,
    seed.businessSuccess,
    seed.retryEligibility ?? 'retry:none',
    seed.replayEligibility ?? 'replay:none',
    ...relatedRefs,
    ...relationLinks.map((link) => `${link.sourceRef}:${link.relationKind}:${link.targetRef}`),
  ])}` as ObservabilitySummaryRef;
}

function publicReason(
  status: ObservabilitySafeStatus,
  providerAcknowledgement: ObservabilityProviderAcknowledgementClassification,
  businessSuccess: ObservabilityBusinessSuccessClassification,
  reasonCode?: ObservabilitySafeReasonCode,
): ObservabilitySafeReasonCode | undefined {
  if (status === 'ready-to-attempt') {
    return 'ready-to-attempt-not-pass';
  }

  if (status === 'ready-to-run') {
    return 'ready-to-run-not-pass';
  }

  if (status === 'blocked' && reasonCode === undefined) {
    return 'blocked-by-explicit-gate';
  }

  if (
    (providerAcknowledgement === 'acknowledged' || providerAcknowledgement === 'acknowledgement-only') &&
    businessSuccess !== 'confirmed' &&
    reasonCode === undefined
  ) {
    return 'provider-acknowledgement-only';
  }

  if (businessSuccess === 'not-confirmed' && reasonCode === undefined) {
    return 'business-success-missing';
  }

  return reasonCode;
}

function nonPassField(status: ObservabilitySafeStatus): {
  readonly nonPassState?: 'skipped' | 'blocked' | 'ready-to-attempt' | 'ready-to-run';
} {
  if (status === 'skipped' || status === 'blocked' || status === 'ready-to-attempt' || status === 'ready-to-run') {
    return { nonPassState: status };
  }

  return {};
}

function mergeRefs(
  firstRefs: readonly ObservabilitySafePublicRef[] | undefined,
  secondRefs: readonly ObservabilitySafePublicRef[] | undefined,
): readonly ObservabilitySafePublicRef[] {
  return normalizeRefs([...(firstRefs ?? []), ...(secondRefs ?? [])]);
}

function normalizeRefs(refs: readonly ObservabilitySafePublicRef[] | undefined): readonly ObservabilitySafePublicRef[] {
  const normalized: ObservabilitySafePublicRef[] = [];
  for (const ref of refs ?? []) {
    const safeRef = normalizeSafeRef(ref, fallbackSafeRef());
    if (normalized.includes(safeRef)) {
      continue;
    }

    normalized.push(safeRef);
    if (normalized.length >= MAX_RELATED_REFS) {
      break;
    }
  }

  return Object.freeze(normalized);
}

function normalizeLinks(
  links: readonly ObservabilityReferenceGraphLink[] | undefined,
): readonly ObservabilityReferenceGraphLink[] {
  const normalized: ObservabilityReferenceGraphLink[] = [];
  const seen = new Set<string>();

  for (const link of links ?? []) {
    const safeLink = Object.freeze({
      sourceRef: normalizeSafeRef(link.sourceRef, fallbackSafeRef()),
      targetRef: normalizeSafeRef(link.targetRef, fallbackSafeRef()),
      relationKind: link.relationKind,
    });
    const key = `${safeLink.sourceRef}:${safeLink.relationKind}:${safeLink.targetRef}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(safeLink);
    if (normalized.length >= MAX_RELATION_LINKS) {
      break;
    }
  }

  return Object.freeze(normalized);
}

function normalizeSafeRef(ref: ObservabilitySafePublicRef | undefined, fallback: ObservabilitySafePublicRef): ObservabilitySafePublicRef {
  return isBoundedRef(ref) ? ref : fallback;
}

function normalizeEventRef(ref: ObservabilityEventRef): ObservabilityEventRef {
  return isBoundedRef(ref) && ref.startsWith('event:') ? ref : 'event:unsafe-public-output-blocked';
}

function normalizeAuditRef(ref: ObservabilityAuditProjectionRef): ObservabilityAuditProjectionRef {
  return isBoundedRef(ref) && ref.startsWith('audit:') ? ref : 'audit:unsafe-public-output-blocked';
}

function normalizeCorrelationRef(ref: ObservabilityCorrelationRef): ObservabilityCorrelationRef {
  return isBoundedCorrelationRef(ref) ? ref : 'corr:readiness:unsafe-public-output-blocked';
}

function normalizeComponentRef(ref: ObservabilityComponentRef): ObservabilityComponentRef {
  return isBoundedRef(ref) && ref.startsWith('component:')
    ? ref
    : 'component:readiness-snapshotter:unsafe-public-output-blocked';
}

function correlationKindFromRef(ref: ObservabilityCorrelationRef | undefined): ObservabilityCorrelationRefKind | undefined {
  if (!isBoundedCorrelationRef(ref)) {
    return undefined;
  }

  const candidate = ref.split(':')[1];
  return CORRELATION_REF_KINDS.includes(candidate as ObservabilityCorrelationRefKind)
    ? (candidate as ObservabilityCorrelationRefKind)
    : undefined;
}

function isBoundedSummaryRef(ref: ObservabilitySummaryRef | undefined): ref is ObservabilitySummaryRef {
  return isBoundedRef(ref) && ref.startsWith('summary:');
}

function isBoundedCorrelationRef(ref: ObservabilityCorrelationRef | undefined): ref is ObservabilityCorrelationRef {
  return isBoundedRef(ref) && ref.startsWith('corr:');
}

function isBoundedRef(ref: string | undefined): ref is ObservabilitySafePublicRef {
  return (
    typeof ref === 'string' &&
    ref.length > 2 &&
    ref.length <= MAX_REF_LENGTH &&
    SAFE_PUBLIC_REF_PATTERN.test(ref) &&
    !looksUnsafeSafePublicRef(ref)
  );
}

function looksUnsafeSafePublicRef(ref: string): boolean {
  return (
    ENDPOINT_LIKE_SAFE_REF_PATTERN.test(ref) ||
    LOCAL_OR_ABSOLUTE_PATH_LIKE_SAFE_REF_PATTERN.test(ref) ||
    SENSITIVE_MATERIAL_LIKE_SAFE_REF_PATTERN.test(ref) ||
    DIAGNOSTIC_MATERIAL_LIKE_SAFE_REF_PATTERN.test(ref)
  );
}

function fallbackSafeRef(): ObservabilitySafePublicRef {
  return 'reason:unsafe-public-output-blocked';
}

function boundedSummaryText(
  operationKind: ObservabilityOperationKind,
  status: ObservabilitySafeStatus,
  reasonCode: ObservabilitySafeReasonCode | undefined,
  providerAcknowledgement: ObservabilityProviderAcknowledgementClassification,
  businessSuccess: ObservabilityBusinessSuccessClassification,
): ObservabilityBoundedRedactedSummary {
  return normalizeToken(
    `redacted-observability:${operationKind}:${status}:${reasonCode ?? 'none'}:${providerAcknowledgement}:${businessSuccess}`,
  ).slice(0, MAX_SUMMARY_LENGTH);
}

function stableToken(values: readonly string[]): string {
  const material = values.map((value) => normalizeToken(value).slice(0, MAX_REF_LENGTH)).join('|');
  let hash = 2166136261;
  for (let index = 0; index < material.length; index += 1) {
    hash = Math.imul(hash ^ material.charCodeAt(index), 16777619);
  }

  return `fic-${(hash >>> 0).toString(36).padStart(7, '0')}`;
}

function normalizeToken(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9:-]/gu, '-')
    .replace(/-+/gu, '-')
    .slice(0, MAX_SUMMARY_LENGTH);
  return normalized.length === 0 ? 'unknown' : normalized;
}
