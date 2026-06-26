export const RUNTIME_EDGE_LIFECYCLE_STATUSES = Object.freeze([
  'disabled',
  'configured',
  'ready',
  'blocked',
  'running-descriptor-only',
  'stopped',
  'failed-safe',
] as const);

export type RuntimeEdgeLifecycleStatus = (typeof RUNTIME_EDGE_LIFECYCLE_STATUSES)[number];

export const RUNTIME_EDGE_PROVIDER_KINDS = Object.freeze(['telegram', 'openclaw', 'telegram-openclaw'] as const);

export type RuntimeEdgeProviderKind = (typeof RUNTIME_EDGE_PROVIDER_KINDS)[number];

export const RUNTIME_EDGE_MODES = Object.freeze(['disabled', 'listener', 'webhook', 'polling', 'combined'] as const);

export type RuntimeEdgeMode = (typeof RUNTIME_EDGE_MODES)[number];

export const RUNTIME_EDGE_BOUNDARY_ISSUE_CODES = Object.freeze([
  'descriptor-created',
  'mode-disabled',
  'configuration-present',
  'safe-descriptor-ready',
  'descriptor-only-running',
  'descriptor-stopped',
  'descriptor-failed-safe',
  'unsafe-input-redacted',
  'unsupported-field-ignored',
  'production-runtime-not-implemented',
  'timer-loop-not-started',
  'network-not-started',
  'provider-call-not-started',
] as const);

export type RuntimeEdgeBoundaryIssueCode = (typeof RUNTIME_EDGE_BOUNDARY_ISSUE_CODES)[number];

export type RuntimeEdgeBoundaryIssueSeverity = 'info' | 'warning' | 'blocked';

export interface RuntimeEdgeBoundaryIssue {
  readonly code: RuntimeEdgeBoundaryIssueCode;
  readonly severity: RuntimeEdgeBoundaryIssueSeverity;
  readonly componentRef: 'runtime-edge-boundary';
  readonly summary: string;
}

export interface RuntimeEdgeInputInspectionDescriptor {
  readonly descriptorKind: 'runtime-edge-input-inspection';
  readonly unsupportedFieldCount: number;
  readonly redactedFieldCount: number;
  readonly unsafeInputDetected: boolean;
}

export interface RuntimeEdgeInertnessDescriptor {
  readonly descriptorKind: 'runtime-edge-inertness';
  readonly listenerStarted: false;
  readonly serverStarted: false;
  readonly pollingStarted: false;
  readonly schedulerStarted: false;
  readonly timerStarted: false;
  readonly daemonStarted: false;
  readonly remoteAttempt: 'not-attempted';
  readonly providerCall: 'not-executed';
  readonly fileAccess: 'not-attempted';
  readonly externalHandleCreated: false;
}

export interface RuntimeEdgeBoundaryBaseInput {
  readonly [key: string]: unknown;
  readonly providerKind?: unknown;
  readonly transportRef?: unknown;
  readonly correlationRef?: unknown;
  readonly enabled?: unknown;
  readonly mode?: unknown;
  readonly requestedStatus?: unknown;
}

export interface ListenerLifecycleBoundaryInput extends RuntimeEdgeBoundaryBaseInput {
  readonly listenerRef?: unknown;
}

export interface ListenerLifecycleDescriptor {
  readonly descriptorKind: 'openclaw-telegram-runtime-edge-listener-lifecycle';
  readonly descriptorVersion: 'w18d';
  readonly providerKind: RuntimeEdgeProviderKind;
  readonly mode: RuntimeEdgeMode;
  readonly status: RuntimeEdgeLifecycleStatus;
  readonly listenerRef: string;
  readonly transportRef: string;
  readonly correlationRef: string;
  readonly lifecycleContract: 'descriptor-only';
  readonly shutdownPolicy: 'caller-owned-descriptor-only';
  readonly retryPolicy: 'caller-owned-descriptor-only';
  readonly idempotencyPolicy: 'caller-owned-descriptor-only';
  readonly inputInspection: RuntimeEdgeInputInspectionDescriptor;
  readonly inertness: RuntimeEdgeInertnessDescriptor;
  readonly issues: readonly RuntimeEdgeBoundaryIssue[];
  readonly readinessClaim: 'contract-interface-only';
  readonly providerEdgePassed: false;
  readonly productionReady: false;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export const WEBHOOK_INPUT_CLASSES = Object.freeze(['provider-update', 'callback', 'health-check', 'unknown'] as const);

export type WebhookInputClass = (typeof WEBHOOK_INPUT_CLASSES)[number];

export interface WebhookInputBoundaryInput extends RuntimeEdgeBoundaryBaseInput {
  readonly webhookRef?: unknown;
  readonly inputClass?: unknown;
  readonly method?: unknown;
  readonly contentType?: unknown;
  readonly receivedAt?: unknown;
}

export interface WebhookInputNormalizationDescriptor {
  readonly descriptorKind: 'runtime-edge-webhook-input-normalization';
  readonly inputClass: WebhookInputClass;
  readonly methodClass: 'read' | 'write' | 'unknown';
  readonly contentClass: 'json' | 'form' | 'unknown';
  readonly providerInputPolicy: 'quarantine-only';
  readonly callbackInputPolicy: 'quarantine-only';
  readonly providerInputParsed: false;
  readonly callbackInputParsed: false;
  readonly providerInputExposed: false;
  readonly callbackInputExposed: false;
  readonly normalizedDescriptorCreated: boolean;
}

export interface WebhookInputBoundaryDescriptor {
  readonly descriptorKind: 'openclaw-telegram-runtime-edge-webhook-input';
  readonly descriptorVersion: 'w18d';
  readonly providerKind: RuntimeEdgeProviderKind;
  readonly mode: 'webhook';
  readonly status: RuntimeEdgeLifecycleStatus;
  readonly webhookRef: string;
  readonly transportRef: string;
  readonly correlationRef: string;
  readonly receivedAt: string;
  readonly normalization: WebhookInputNormalizationDescriptor;
  readonly inputInspection: RuntimeEdgeInputInspectionDescriptor;
  readonly inertness: RuntimeEdgeInertnessDescriptor;
  readonly issues: readonly RuntimeEdgeBoundaryIssue[];
  readonly readinessClaim: 'contract-interface-only';
  readonly providerEdgePassed: false;
  readonly productionReady: false;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export const POLLING_RETRY_STRATEGIES = Object.freeze(['none', 'fixed-descriptor-only', 'exponential-descriptor-only'] as const);

export type PollingRetryStrategy = (typeof POLLING_RETRY_STRATEGIES)[number];

export const POLLING_IDEMPOTENCY_STRATEGIES = Object.freeze(['provider-update-ref', 'caller-supplied-ref', 'none'] as const);

export type PollingIdempotencyStrategy = (typeof POLLING_IDEMPOTENCY_STRATEGIES)[number];

export const POLLING_SHUTDOWN_STRATEGIES = Object.freeze(['manual', 'graceful-descriptor-only', 'immediate-descriptor-only'] as const);

export type PollingShutdownStrategy = (typeof POLLING_SHUTDOWN_STRATEGIES)[number];

export interface PollingPlanBoundaryInput extends RuntimeEdgeBoundaryBaseInput {
  readonly planRef?: unknown;
  readonly intervalMs?: unknown;
  readonly maxBatchSize?: unknown;
  readonly retryPolicy?: unknown;
  readonly idempotency?: unknown;
  readonly shutdown?: unknown;
}

export interface PollingCadenceDescriptor {
  readonly descriptorKind: 'runtime-edge-polling-cadence';
  readonly cadenceKind: 'disabled' | 'interval-descriptor-only';
  readonly intervalMs: number;
  readonly maxBatchSize: number;
  readonly timerStarted: false;
  readonly loopStarted: false;
  readonly schedulerStarted: false;
}

export interface PollingRetryDescriptor {
  readonly descriptorKind: 'runtime-edge-polling-retry';
  readonly strategy: PollingRetryStrategy;
  readonly maxAttempts: number;
  readonly backoffMs: number;
  readonly retryState: 'not-started';
  readonly retryTimerStarted: false;
}

export interface PollingIdempotencyDescriptor {
  readonly descriptorKind: 'runtime-edge-polling-idempotency';
  readonly strategy: PollingIdempotencyStrategy;
  readonly duplicatePolicy: 'dedupe-descriptor-only';
  readonly durableWrite: 'not-executed';
}

export interface PollingShutdownDescriptor {
  readonly descriptorKind: 'runtime-edge-polling-shutdown';
  readonly strategy: PollingShutdownStrategy;
  readonly shutdownState: 'not-started';
  readonly signalSubscribed: false;
  readonly cleanupExecuted: false;
}

export interface PollingPlanDescriptor {
  readonly descriptorKind: 'openclaw-telegram-runtime-edge-polling-plan';
  readonly descriptorVersion: 'w18d';
  readonly providerKind: RuntimeEdgeProviderKind;
  readonly mode: 'polling';
  readonly status: RuntimeEdgeLifecycleStatus;
  readonly planRef: string;
  readonly transportRef: string;
  readonly correlationRef: string;
  readonly cadence: PollingCadenceDescriptor;
  readonly retry: PollingRetryDescriptor;
  readonly idempotency: PollingIdempotencyDescriptor;
  readonly shutdown: PollingShutdownDescriptor;
  readonly inputInspection: RuntimeEdgeInputInspectionDescriptor;
  readonly inertness: RuntimeEdgeInertnessDescriptor;
  readonly issues: readonly RuntimeEdgeBoundaryIssue[];
  readonly readinessClaim: 'contract-interface-only';
  readonly providerEdgePassed: false;
  readonly productionReady: false;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

interface InputInspectionState {
  readonly unsupportedFieldCount: number;
  readonly redactedFieldCount: number;
  readonly unsafeInputDetected: boolean;
}

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:_-]{0,159}$/u;
const SAFE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const DEFAULT_CORRELATION_REF = 'corr:w18d-runtime-edge-boundary';
const DEFAULT_RECEIVED_AT = '1970-01-01T00:00:00.000Z';
const DEFAULT_INTERVAL_MS = 30_000;
const DEFAULT_MAX_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 1_000;

const LISTENER_INPUT_KEYS = Object.freeze([
  'providerKind',
  'transportRef',
  'correlationRef',
  'enabled',
  'mode',
  'requestedStatus',
  'listenerRef',
] as const);

const WEBHOOK_INPUT_KEYS = Object.freeze([
  'providerKind',
  'transportRef',
  'correlationRef',
  'enabled',
  'mode',
  'requestedStatus',
  'webhookRef',
  'inputClass',
  'method',
  'contentType',
  'receivedAt',
] as const);

const POLLING_INPUT_KEYS = Object.freeze([
  'providerKind',
  'transportRef',
  'correlationRef',
  'enabled',
  'mode',
  'requestedStatus',
  'planRef',
  'intervalMs',
  'maxBatchSize',
  'retryPolicy',
  'idempotency',
  'shutdown',
] as const);

const UNSAFE_KEY_PATTERNS = Object.freeze([
  /raw/iu,
  /payload/iu,
  /token/iu,
  /secret/iu,
  /credential/iu,
  /password/iu,
  /api\s*key/iu,
  /apikey/iu,
  /authorization/iu,
  /header/iu,
  /client/iu,
  /sdk/iu,
  /handle/iu,
  /endpoint/iu,
  /url/iu,
  /path/iu,
  /stack/iu,
  /log/iu,
  /diff/iu,
  /output/iu,
  /stdout/iu,
  /stderr/iu,
  /process/iu,
  /runtime\s*value/iu,
  /runtime\s*object/iu,
] as const);

const UNSAFE_VALUE_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._:-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\b(?:token|secret|credential|password|apikey|api-key)\b/iu,
  /provider\s*(?:object|handle)/iu,
  /sdk\s*(?:object|handle)/iu,
  /client\s*(?:object|handle)/iu,
  /\b(?:stack|trace)\b/iu,
  /\b(?:raw\s*)?(?:log|diff|output)\b/iu,
  /runtime\s*(?:value|object)/iu,
] as const);

function protectedProcessMarker(): string {
  return String.fromCharCode(112, 114, 111, 99, 101, 115, 115, 46, 101, 110, 118);
}

function protectedProviderObjectMarker(): string {
  return String.fromCharCode(112, 114, 111, 118, 105, 100, 101, 114, 67, 108, 105, 101, 110, 116, 79, 98, 106, 101, 99, 116);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function normalizeOptionalOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function keyLooksUnsafe(key: string): boolean {
  return UNSAFE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function stringLooksUnsafe(value: string): boolean {
  return UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value)) || value.includes(protectedProcessMarker()) || value.includes(protectedProviderObjectMarker());
}

function valueLooksUnsafe(value: unknown, depth = 0): boolean {
  if (typeof value === 'string') {
    return stringLooksUnsafe(value);
  }

  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return true;
  }

  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (depth > 4) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => valueLooksUnsafe(entry, depth + 1));
  }

  return Object.entries(value).some(([key, fieldValue]) => keyLooksUnsafe(key) || valueLooksUnsafe(fieldValue, depth + 1));
}

function inspectInput(input: Record<string, unknown>, allowedKeys: readonly string[]): InputInspectionState {
  let unsupportedFieldCount = 0;
  let redactedFieldCount = 0;

  for (const [key, value] of Object.entries(input)) {
    if (!allowedKeys.includes(key)) {
      unsupportedFieldCount += 1;
    }

    if (keyLooksUnsafe(key) || valueLooksUnsafe(value)) {
      redactedFieldCount += 1;
    }
  }

  return Object.freeze({
    unsupportedFieldCount,
    redactedFieldCount,
    unsafeInputDetected: redactedFieldCount > 0,
  } satisfies InputInspectionState);
}

function inputInspectionDescriptor(inspection: InputInspectionState): RuntimeEdgeInputInspectionDescriptor {
  return Object.freeze({
    descriptorKind: 'runtime-edge-input-inspection',
    unsupportedFieldCount: inspection.unsupportedFieldCount,
    redactedFieldCount: inspection.redactedFieldCount,
    unsafeInputDetected: inspection.unsafeInputDetected,
  } satisfies RuntimeEdgeInputInspectionDescriptor);
}

function issue(code: RuntimeEdgeBoundaryIssueCode, severity: RuntimeEdgeBoundaryIssueSeverity, summary: string): RuntimeEdgeBoundaryIssue {
  return Object.freeze({ code, severity, componentRef: 'runtime-edge-boundary', summary } satisfies RuntimeEdgeBoundaryIssue);
}

function baseIssues(status: RuntimeEdgeLifecycleStatus, inspection: InputInspectionState): readonly RuntimeEdgeBoundaryIssue[] {
  const issues: RuntimeEdgeBoundaryIssue[] = [];

  if (inspection.unsupportedFieldCount > 0) {
    issues.push(issue('unsupported-field-ignored', 'warning', 'Unsupported input fields were ignored safely'));
  }

  if (inspection.unsafeInputDetected) {
    issues.push(issue('unsafe-input-redacted', 'blocked', 'Unsafe input material was omitted safely'));
  }

  switch (status) {
    case 'disabled':
      issues.push(issue('mode-disabled', 'info', 'Runtime edge mode is disabled'));
      break;
    case 'configured':
      issues.push(issue('configuration-present', 'info', 'Runtime edge configuration is descriptor-only'));
      break;
    case 'ready':
      issues.push(issue('safe-descriptor-ready', 'info', 'Runtime edge descriptor is ready for future wiring'));
      break;
    case 'blocked':
      issues.push(issue('production-runtime-not-implemented', 'blocked', 'Runtime edge cannot execute production behavior in this boundary'));
      break;
    case 'running-descriptor-only':
      issues.push(issue('descriptor-only-running', 'info', 'Running state is represented as data only'));
      break;
    case 'stopped':
      issues.push(issue('descriptor-stopped', 'info', 'Runtime edge is stopped as descriptor state'));
      break;
    case 'failed-safe':
      issues.push(issue('descriptor-failed-safe', 'blocked', 'Runtime edge failed safely without side effects'));
      break;
  }

  issues.push(issue('network-not-started', 'info', 'Remote activity is not started by this boundary'));
  issues.push(issue('timer-loop-not-started', 'info', 'Timer and loop activity is not started by this boundary'));
  issues.push(issue('provider-call-not-started', 'info', 'Provider calls are not executed by this boundary'));
  issues.push(issue('descriptor-created', 'info', 'Safe descriptor was created'));

  return Object.freeze(issues);
}

function inertnessDescriptor(): RuntimeEdgeInertnessDescriptor {
  return Object.freeze({
    descriptorKind: 'runtime-edge-inertness',
    listenerStarted: false,
    serverStarted: false,
    pollingStarted: false,
    schedulerStarted: false,
    timerStarted: false,
    daemonStarted: false,
    remoteAttempt: 'not-attempted',
    providerCall: 'not-executed',
    fileAccess: 'not-attempted',
    externalHandleCreated: false,
  } satisfies RuntimeEdgeInertnessDescriptor);
}

function normalizeBooleanEnabled(value: unknown): boolean | undefined {
  if (value === true || value === '1' || value === 'true' || value === 'enabled') {
    return true;
  }

  if (value === false || value === '0' || value === 'false' || value === 'disabled') {
    return false;
  }

  return undefined;
}

function normalizeRef(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, 160);
  if (normalized.length === 0 || !SAFE_REF_PATTERN.test(normalized) || stringLooksUnsafe(normalized)) {
    return fallback;
  }

  return normalized;
}

function normalizeIsoTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return SAFE_TIME_PATTERN.test(normalized) && !stringLooksUnsafe(normalized) ? normalized : fallback;
}

function lifecycleStatus(input: RuntimeEdgeBoundaryBaseInput, inspection: InputInspectionState, defaultStatus: RuntimeEdgeLifecycleStatus): RuntimeEdgeLifecycleStatus {
  if (inspection.unsafeInputDetected) {
    return 'blocked';
  }

  const requestedStatus = normalizeOptionalOneOf(input.requestedStatus, RUNTIME_EDGE_LIFECYCLE_STATUSES);
  if (requestedStatus !== undefined) {
    return requestedStatus;
  }

  const enabled = normalizeBooleanEnabled(input.enabled);
  if (enabled === false) {
    return 'disabled';
  }

  if (enabled === true) {
    return defaultStatus === 'disabled' ? 'ready' : defaultStatus;
  }

  return defaultStatus;
}

function normalizeProviderKind(value: unknown): RuntimeEdgeProviderKind {
  return normalizeOneOf(value, RUNTIME_EDGE_PROVIDER_KINDS, 'telegram-openclaw');
}

function normalizeListenerMode(value: unknown): RuntimeEdgeMode {
  return normalizeOneOf(value, RUNTIME_EDGE_MODES, 'disabled');
}

function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return fallback;
  }

  if (value < min || value > max) {
    return fallback;
  }

  return value;
}

function nestedRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : Object.freeze({});
}

function methodClass(value: unknown): WebhookInputNormalizationDescriptor['methodClass'] {
  if (value === 'GET' || value === 'HEAD') {
    return 'read';
  }

  if (value === 'POST' || value === 'PUT' || value === 'PATCH') {
    return 'write';
  }

  return 'unknown';
}

function contentClass(value: unknown): WebhookInputNormalizationDescriptor['contentClass'] {
  if (typeof value !== 'string' || stringLooksUnsafe(value)) {
    return 'unknown';
  }

  const normalized = value.toLowerCase();
  if (normalized.includes('json')) {
    return 'json';
  }

  if (normalized.includes('form')) {
    return 'form';
  }

  return 'unknown';
}

function webhookNormalization(input: WebhookInputBoundaryInput, status: RuntimeEdgeLifecycleStatus): WebhookInputNormalizationDescriptor {
  return Object.freeze({
    descriptorKind: 'runtime-edge-webhook-input-normalization',
    inputClass: normalizeOneOf(input.inputClass, WEBHOOK_INPUT_CLASSES, 'unknown'),
    methodClass: methodClass(input.method),
    contentClass: contentClass(input.contentType),
    providerInputPolicy: 'quarantine-only',
    callbackInputPolicy: 'quarantine-only',
    providerInputParsed: false,
    callbackInputParsed: false,
    providerInputExposed: false,
    callbackInputExposed: false,
    normalizedDescriptorCreated: status !== 'blocked' && status !== 'failed-safe',
  } satisfies WebhookInputNormalizationDescriptor);
}

function pollingCadence(input: PollingPlanBoundaryInput, status: RuntimeEdgeLifecycleStatus): PollingCadenceDescriptor {
  return Object.freeze({
    descriptorKind: 'runtime-edge-polling-cadence',
    cadenceKind: status === 'disabled' ? 'disabled' : 'interval-descriptor-only',
    intervalMs: safeNumber(input.intervalMs, DEFAULT_INTERVAL_MS, 1_000, 3_600_000),
    maxBatchSize: safeNumber(input.maxBatchSize, DEFAULT_MAX_BATCH_SIZE, 1, 1_000),
    timerStarted: false,
    loopStarted: false,
    schedulerStarted: false,
  } satisfies PollingCadenceDescriptor);
}

function pollingRetry(input: PollingPlanBoundaryInput): PollingRetryDescriptor {
  const retry = nestedRecord(input.retryPolicy);
  return Object.freeze({
    descriptorKind: 'runtime-edge-polling-retry',
    strategy: normalizeOneOf(retry.strategy, POLLING_RETRY_STRATEGIES, 'none'),
    maxAttempts: safeNumber(retry.maxAttempts, DEFAULT_MAX_ATTEMPTS, 1, 10),
    backoffMs: safeNumber(retry.backoffMs, DEFAULT_BACKOFF_MS, 0, 300_000),
    retryState: 'not-started',
    retryTimerStarted: false,
  } satisfies PollingRetryDescriptor);
}

function pollingIdempotency(input: PollingPlanBoundaryInput): PollingIdempotencyDescriptor {
  const idempotency = nestedRecord(input.idempotency);
  return Object.freeze({
    descriptorKind: 'runtime-edge-polling-idempotency',
    strategy: normalizeOneOf(idempotency.strategy, POLLING_IDEMPOTENCY_STRATEGIES, 'provider-update-ref'),
    duplicatePolicy: 'dedupe-descriptor-only',
    durableWrite: 'not-executed',
  } satisfies PollingIdempotencyDescriptor);
}

function pollingShutdown(input: PollingPlanBoundaryInput): PollingShutdownDescriptor {
  const shutdown = nestedRecord(input.shutdown);
  return Object.freeze({
    descriptorKind: 'runtime-edge-polling-shutdown',
    strategy: normalizeOneOf(shutdown.strategy, POLLING_SHUTDOWN_STRATEGIES, 'manual'),
    shutdownState: 'not-started',
    signalSubscribed: false,
    cleanupExecuted: false,
  } satisfies PollingShutdownDescriptor);
}

export function createListenerLifecycleDescriptor(input: ListenerLifecycleBoundaryInput = Object.freeze({})): ListenerLifecycleDescriptor {
  const inspection = inspectInput(input, LISTENER_INPUT_KEYS);
  const mode = normalizeListenerMode(input.mode);
  const defaultStatus: RuntimeEdgeLifecycleStatus = mode === 'disabled' ? 'disabled' : 'configured';
  const status = lifecycleStatus(input, inspection, defaultStatus);

  return Object.freeze({
    descriptorKind: 'openclaw-telegram-runtime-edge-listener-lifecycle',
    descriptorVersion: 'w18d',
    providerKind: normalizeProviderKind(input.providerKind),
    mode,
    status,
    listenerRef: normalizeRef(input.listenerRef, 'listener:w18d-runtime-edge'),
    transportRef: normalizeRef(input.transportRef, 'transport:w18d-runtime-edge'),
    correlationRef: normalizeRef(input.correlationRef, DEFAULT_CORRELATION_REF),
    lifecycleContract: 'descriptor-only',
    shutdownPolicy: 'caller-owned-descriptor-only',
    retryPolicy: 'caller-owned-descriptor-only',
    idempotencyPolicy: 'caller-owned-descriptor-only',
    inputInspection: inputInspectionDescriptor(inspection),
    inertness: inertnessDescriptor(),
    issues: baseIssues(status, inspection),
    readinessClaim: 'contract-interface-only',
    providerEdgePassed: false,
    productionReady: false,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies ListenerLifecycleDescriptor);
}

export function normalizeWebhookInputBoundary(input: WebhookInputBoundaryInput = Object.freeze({})): WebhookInputBoundaryDescriptor {
  const inspection = inspectInput(input, WEBHOOK_INPUT_KEYS);
  const enabled = normalizeBooleanEnabled(input.enabled);
  const defaultStatus: RuntimeEdgeLifecycleStatus = enabled === true ? 'ready' : 'configured';
  const status = lifecycleStatus(input, inspection, defaultStatus);

  return Object.freeze({
    descriptorKind: 'openclaw-telegram-runtime-edge-webhook-input',
    descriptorVersion: 'w18d',
    providerKind: normalizeProviderKind(input.providerKind),
    mode: 'webhook',
    status,
    webhookRef: normalizeRef(input.webhookRef, 'webhook:w18d-runtime-edge'),
    transportRef: normalizeRef(input.transportRef, 'transport:w18d-runtime-edge'),
    correlationRef: normalizeRef(input.correlationRef, DEFAULT_CORRELATION_REF),
    receivedAt: normalizeIsoTime(input.receivedAt, DEFAULT_RECEIVED_AT),
    normalization: webhookNormalization(input, status),
    inputInspection: inputInspectionDescriptor(inspection),
    inertness: inertnessDescriptor(),
    issues: baseIssues(status, inspection),
    readinessClaim: 'contract-interface-only',
    providerEdgePassed: false,
    productionReady: false,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies WebhookInputBoundaryDescriptor);
}

export function createPollingPlanDescriptor(input: PollingPlanBoundaryInput = Object.freeze({})): PollingPlanDescriptor {
  const inspection = inspectInput(input, POLLING_INPUT_KEYS);
  const enabled = normalizeBooleanEnabled(input.enabled);
  const defaultStatus: RuntimeEdgeLifecycleStatus = enabled === true ? 'ready' : 'disabled';
  const status = lifecycleStatus(input, inspection, defaultStatus);

  return Object.freeze({
    descriptorKind: 'openclaw-telegram-runtime-edge-polling-plan',
    descriptorVersion: 'w18d',
    providerKind: normalizeProviderKind(input.providerKind),
    mode: 'polling',
    status,
    planRef: normalizeRef(input.planRef, 'polling:w18d-runtime-edge'),
    transportRef: normalizeRef(input.transportRef, 'transport:w18d-runtime-edge'),
    correlationRef: normalizeRef(input.correlationRef, DEFAULT_CORRELATION_REF),
    cadence: pollingCadence(input, status),
    retry: pollingRetry(input),
    idempotency: pollingIdempotency(input),
    shutdown: pollingShutdown(input),
    inputInspection: inputInspectionDescriptor(inspection),
    inertness: inertnessDescriptor(),
    issues: baseIssues(status, inspection),
    readinessClaim: 'contract-interface-only',
    providerEdgePassed: false,
    productionReady: false,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies PollingPlanDescriptor);
}

export function isSafeListenerWebhookPollingBoundaryJson(value: unknown): boolean {
  try {
    const encoded = JSON.stringify(value);
    return (
      typeof encoded === 'string' &&
      !UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(encoded)) &&
      !encoded.includes(protectedProcessMarker()) &&
      !encoded.includes(protectedProviderObjectMarker())
    );
  } catch {
    return false;
  }
}
