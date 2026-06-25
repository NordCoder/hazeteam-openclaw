export const OPENCLAW_PLUGIN_READINESS_PROFILES = Object.freeze([
  'test',
  'dry-run',
  'embedded-core',
  'sidecar-core',
  'real-smoke',
  'production',
] as const);

export type PluginReadinessProfile = (typeof OPENCLAW_PLUGIN_READINESS_PROFILES)[number];

export const OPENCLAW_PLUGIN_READINESS_COMPONENT_KINDS = Object.freeze([
  'plugin-lifecycle',
  'core-facade',
  'adapter-foundation',
  'transport',
  'capability',
  'config',
  'stores',
  'tools',
] as const);

export type PluginReadinessComponentKind = (typeof OPENCLAW_PLUGIN_READINESS_COMPONENT_KINDS)[number];

export const OPENCLAW_PLUGIN_READINESS_COMPONENT_STATUSES = Object.freeze([
  'ready',
  'degraded',
  'not-ready',
  'disabled',
  'failed',
  'unknown',
  'missing',
] as const);

export type PluginReadinessComponentStatus = (typeof OPENCLAW_PLUGIN_READINESS_COMPONENT_STATUSES)[number];

export const OPENCLAW_PLUGIN_READINESS_AGGREGATE_STATUSES = Object.freeze([
  'ready',
  'degraded',
  'not-ready',
  'disabled',
  'failed',
  'unknown',
] as const);

export type PluginReadinessAggregateStatus = (typeof OPENCLAW_PLUGIN_READINESS_AGGREGATE_STATUSES)[number];

export type PluginReadinessCheckStatus = 'pass' | 'warn' | 'fail' | 'disabled' | 'unknown';

export interface PluginReadinessComponentInput {
  readonly componentRef: string;
  readonly kind: PluginReadinessComponentKind;
  readonly status: PluginReadinessComponentStatus;
  readonly required?: boolean;
  readonly summary?: string;
  readonly code?: string;
  readonly checkedAt?: string;
  readonly detailsRef?: string;
  readonly correlationRef?: string;
}

export interface PluginReadinessComponentReport {
  readonly componentRef: string;
  readonly kind: PluginReadinessComponentKind;
  readonly status: PluginReadinessComponentStatus;
  readonly required: boolean;
  readonly summary: string;
  readonly code: string;
  readonly checkedAt: string;
  readonly detailsRef?: string;
  readonly correlationRef?: string;
}

export interface AggregatePluginReadinessInput {
  readonly profile: PluginReadinessProfile;
  readonly pluginRef?: string;
  readonly generatedAt?: string;
  readonly components?: readonly PluginReadinessComponentInput[];
  readonly requiredKinds?: readonly PluginReadinessComponentKind[];
  readonly disabled?: boolean;
  readonly externalConnectivityEnabled?: boolean;
  readonly willCallRemote?: boolean;
  readonly correlationRef?: string;
  readonly detailsRef?: string;
}

export interface PluginReadinessAggregateResult {
  readonly status: PluginReadinessAggregateStatus;
  readonly profile: PluginReadinessProfile;
  readonly generatedAt: string;
  readonly pluginRef: string;
  readonly components: readonly PluginReadinessComponentReport[];
  readonly missingRequired: readonly string[];
  readonly degradedOptional: readonly string[];
  readonly disabledOptional: readonly string[];
  readonly willCallRemote: boolean;
  readonly externalConnectivityEnabled: boolean;
  readonly detailsRef?: string;
  readonly correlationRef?: string;
}

export interface PluginReadinessSummaryProjection {
  readonly status: PluginReadinessAggregateStatus;
  readonly profile: PluginReadinessProfile;
  readonly generatedAt: string;
  readonly pluginRef: string;
  readonly missingRequired: readonly string[];
  readonly degradedOptional: readonly string[];
  readonly disabledOptional: readonly string[];
  readonly willCallRemote: boolean;
  readonly externalConnectivityEnabled: boolean;
  readonly componentCount: number;
  readonly detailsRef?: string;
  readonly correlationRef?: string;
}

const DEFAULT_PLUGIN_REF = 'plugin:openclaw-runtime';
const DEFAULT_CHECKED_AT = '1970-01-01T00:00:00.000Z';
const SAFE_TEXT_FALLBACK = 'redacted';
const SAFE_REF_FALLBACK = 'redacted-ref';
const MAX_SAFE_TEXT_LENGTH = 180;
const MAX_SAFE_REF_LENGTH = 120;

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:-]{0,119}$/u;
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9-]{0,79}$/u;

const UNSAFE_TEXT_PATTERNS = Object.freeze([
  /\bapi[\s_-]?key\b/iu,
  /\bapikey\b/iu,
  /\bbearer\b/iu,
  /\bcredential(?:s)?\b/iu,
  /\bpassword\b/iu,
  /\bsecret(?:s)?\b/iu,
  /\btoken(?:s)?\b/iu,
  /\bstack\s*trace\b/iu,
  /\btraceback\b/iu,
  /\braw[\s_-]?(?:provider|runtime|tool|config|payload|update|log)?\b/iu,
  /\bpayload\b/iu,
  /\bprovider\s+(?:client|object|payload)\b/iu,
  /\bclient\s+handle\b/iu,
  /\bsdk\s+client\b/iu,
  /\bendpoint\b/iu,
  /\b(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
] as const);

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function hasUnsafeText(value: string): boolean {
  return UNSAFE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function clampText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/gu, ' ');

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength);
}

export function sanitizeReadinessText(value: unknown, fallback = SAFE_TEXT_FALLBACK): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = clampText(value, MAX_SAFE_TEXT_LENGTH);

  if (normalized.length === 0 || hasUnsafeText(normalized)) {
    return fallback;
  }

  return normalized;
}

export function sanitizeReadinessRef(value: unknown, fallback = SAFE_REF_FALLBACK): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = clampText(value.toLowerCase(), MAX_SAFE_REF_LENGTH);

  if (!SAFE_REF_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    return fallback;
  }

  return normalized;
}

function sanitizeReadinessCode(value: unknown, fallback = SAFE_TEXT_FALLBACK): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = clampText(value.toLowerCase(), 80);

  if (!SAFE_CODE_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    return fallback;
  }

  return normalized;
}

function normalizeProfile(profile: PluginReadinessProfile): PluginReadinessProfile {
  if (isOneOf(profile, OPENCLAW_PLUGIN_READINESS_PROFILES)) {
    return profile;
  }

  return 'test';
}

function normalizeKind(kind: PluginReadinessComponentKind): PluginReadinessComponentKind {
  if (isOneOf(kind, OPENCLAW_PLUGIN_READINESS_COMPONENT_KINDS)) {
    return kind;
  }

  return 'config';
}

function normalizeStatus(status: PluginReadinessComponentStatus): PluginReadinessComponentStatus {
  if (isOneOf(status, OPENCLAW_PLUGIN_READINESS_COMPONENT_STATUSES)) {
    return status;
  }

  return 'unknown';
}

function profileRequiredKinds(profile: PluginReadinessProfile): readonly PluginReadinessComponentKind[] {
  switch (profile) {
    case 'test':
    case 'dry-run':
      return Object.freeze([
        'plugin-lifecycle',
        'adapter-foundation',
        'core-facade',
        'stores',
        'transport',
        'config',
      ] as const);
    case 'embedded-core':
    case 'sidecar-core':
      return Object.freeze([
        'plugin-lifecycle',
        'core-facade',
        'adapter-foundation',
        'stores',
        'transport',
        'tools',
        'config',
      ] as const);
    case 'real-smoke':
      return Object.freeze([
        'plugin-lifecycle',
        'core-facade',
        'adapter-foundation',
        'transport',
        'config',
      ] as const);
    case 'production':
      return Object.freeze([
        'plugin-lifecycle',
        'core-facade',
        'adapter-foundation',
        'transport',
        'capability',
        'config',
        'stores',
        'tools',
      ] as const);
  }
}

function toKindSet(kinds: readonly PluginReadinessComponentKind[]): ReadonlySet<PluginReadinessComponentKind> {
  return new Set(kinds.map((kind) => normalizeKind(kind)));
}

function mergeRequiredKinds(
  profile: PluginReadinessProfile,
  explicitKinds: readonly PluginReadinessComponentKind[] | undefined,
): ReadonlySet<PluginReadinessComponentKind> {
  const merged = new Set(profileRequiredKinds(profile));

  for (const kind of explicitKinds ?? []) {
    merged.add(normalizeKind(kind));
  }

  return merged;
}

function reportStatus(status: PluginReadinessComponentStatus): PluginReadinessCheckStatus {
  switch (status) {
    case 'ready':
      return 'pass';
    case 'degraded':
      return 'warn';
    case 'disabled':
      return 'disabled';
    case 'unknown':
      return 'unknown';
    case 'failed':
    case 'missing':
    case 'not-ready':
      return 'fail';
  }
}

function defaultSummary(status: PluginReadinessComponentStatus, required: boolean): string {
  if (status === 'missing') {
    return required ? 'Required component unavailable' : 'Optional component unavailable';
  }

  if (status === 'failed') {
    return required ? 'Required component failed safely' : 'Optional component failed safely';
  }

  if (status === 'unknown') {
    return required ? 'Required component unknown' : 'Optional component unknown';
  }

  if (status === 'disabled') {
    return required ? 'Required component disabled' : 'Optional component disabled';
  }

  if (status === 'degraded') {
    return required ? 'Required component degraded' : 'Optional component degraded';
  }

  return 'Component ready';
}

function defaultCode(status: PluginReadinessComponentStatus, required: boolean): string {
  if (status === 'missing') {
    return required ? 'missing-required' : 'missing-optional';
  }

  if (status === 'not-ready') {
    return required ? 'not-ready-required' : 'not-ready-optional';
  }

  if (status === 'failed') {
    return required ? 'failed-required' : 'failed-optional';
  }

  if (status === 'unknown') {
    return required ? 'unknown-required' : 'unknown-optional';
  }

  if (status === 'disabled') {
    return required ? 'disabled-required' : 'disabled-optional';
  }

  if (status === 'degraded') {
    return required ? 'degraded-required' : 'degraded-optional';
  }

  return 'ready';
}

function normalizeComponentReport(
  component: PluginReadinessComponentInput,
  requiredKinds: ReadonlySet<PluginReadinessComponentKind>,
  generatedAt: string,
): PluginReadinessComponentReport {
  const kind = normalizeKind(component.kind);
  const status = normalizeStatus(component.status);
  const required = component.required === true || requiredKinds.has(kind);
  const detailsRef = component.detailsRef === undefined ? undefined : sanitizeReadinessRef(component.detailsRef);
  const correlationRef = component.correlationRef === undefined ? undefined : sanitizeReadinessRef(component.correlationRef);

  return Object.freeze({
    componentRef: sanitizeReadinessRef(component.componentRef),
    kind,
    status,
    required,
    summary: sanitizeReadinessText(component.summary ?? defaultSummary(status, required)),
    code: sanitizeReadinessCode(component.code ?? defaultCode(status, required)),
    checkedAt: sanitizeReadinessText(component.checkedAt ?? generatedAt, generatedAt),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  } satisfies PluginReadinessComponentReport);
}

function missingRequiredReport(kind: PluginReadinessComponentKind, generatedAt: string): PluginReadinessComponentReport {
  return Object.freeze({
    componentRef: `component:${kind}`,
    kind,
    status: 'missing',
    required: true,
    summary: 'Required component unavailable',
    code: 'missing-required',
    checkedAt: generatedAt,
  } satisfies PluginReadinessComponentReport);
}

function appendMissingRequiredReports(
  reports: readonly PluginReadinessComponentReport[],
  requiredKinds: ReadonlySet<PluginReadinessComponentKind>,
  generatedAt: string,
): readonly PluginReadinessComponentReport[] {
  const presentKinds = toKindSet(reports.map((report) => report.kind));
  const missingReports: PluginReadinessComponentReport[] = [];

  for (const kind of requiredKinds) {
    if (!presentKinds.has(kind)) {
      missingReports.push(missingRequiredReport(kind, generatedAt));
    }
  }

  return Object.freeze([...reports, ...missingReports]);
}

function isRequiredUnavailable(report: PluginReadinessComponentReport): boolean {
  return (
    report.required &&
    (report.status === 'missing' ||
      report.status === 'not-ready' ||
      report.status === 'disabled' ||
      report.status === 'unknown')
  );
}

function isRequiredFailed(report: PluginReadinessComponentReport): boolean {
  return report.required && report.status === 'failed';
}

function isOptionalDegraded(report: PluginReadinessComponentReport): boolean {
  return (
    !report.required &&
    (report.status === 'degraded' ||
      report.status === 'missing' ||
      report.status === 'not-ready' ||
      report.status === 'failed' ||
      report.status === 'unknown')
  );
}

function isOptionalDisabled(report: PluginReadinessComponentReport): boolean {
  return !report.required && report.status === 'disabled';
}

function aggregateStatus(
  reports: readonly PluginReadinessComponentReport[],
  pluginDisabled: boolean,
): PluginReadinessAggregateStatus {
  if (pluginDisabled) {
    return 'disabled';
  }

  if (reports.some(isRequiredFailed)) {
    return 'failed';
  }

  if (reports.some(isRequiredUnavailable)) {
    return 'not-ready';
  }

  if (reports.some(isOptionalDegraded)) {
    return 'degraded';
  }

  return 'ready';
}

function safeRemoteFlags(
  profile: PluginReadinessProfile,
  externalConnectivityEnabled: boolean | undefined,
  willCallRemote: boolean | undefined,
): { readonly externalConnectivityEnabled: boolean; readonly willCallRemote: boolean } {
  if (profile === 'test' || profile === 'dry-run') {
    return Object.freeze({
      externalConnectivityEnabled: false,
      willCallRemote: false,
    });
  }

  if (profile === 'real-smoke') {
    return Object.freeze({
      externalConnectivityEnabled: externalConnectivityEnabled === true,
      willCallRemote: false,
    });
  }

  const safeExternalConnectivityEnabled = externalConnectivityEnabled === true;

  return Object.freeze({
    externalConnectivityEnabled: safeExternalConnectivityEnabled,
    willCallRemote: safeExternalConnectivityEnabled && willCallRemote === true,
  });
}

export function aggregatePluginReadiness(input: AggregatePluginReadinessInput): PluginReadinessAggregateResult {
  const profile = normalizeProfile(input.profile);
  const generatedAt = sanitizeReadinessText(input.generatedAt ?? DEFAULT_CHECKED_AT, DEFAULT_CHECKED_AT);
  const pluginRef = sanitizeReadinessRef(input.pluginRef ?? DEFAULT_PLUGIN_REF, DEFAULT_PLUGIN_REF);
  const requiredKinds = mergeRequiredKinds(profile, input.requiredKinds);
  const normalizedReports = Object.freeze(
    (input.components ?? []).map((component) => normalizeComponentReport(component, requiredKinds, generatedAt)),
  );
  const reports = appendMissingRequiredReports(normalizedReports, requiredKinds, generatedAt);
  const missingRequired = Object.freeze(
    reports.filter(isRequiredUnavailable).map((report) => report.componentRef),
  );
  const degradedOptional = Object.freeze(
    reports.filter(isOptionalDegraded).map((report) => report.componentRef),
  );
  const disabledOptional = Object.freeze(
    reports.filter(isOptionalDisabled).map((report) => report.componentRef),
  );
  const remoteFlags = safeRemoteFlags(profile, input.externalConnectivityEnabled, input.willCallRemote);
  const detailsRef = input.detailsRef === undefined ? undefined : sanitizeReadinessRef(input.detailsRef);
  const correlationRef = input.correlationRef === undefined ? undefined : sanitizeReadinessRef(input.correlationRef);

  return Object.freeze({
    status: aggregateStatus(reports, input.disabled === true),
    profile,
    generatedAt,
    pluginRef,
    components: reports,
    missingRequired,
    degradedOptional,
    disabledOptional,
    externalConnectivityEnabled: remoteFlags.externalConnectivityEnabled,
    willCallRemote: remoteFlags.willCallRemote,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  } satisfies PluginReadinessAggregateResult);
}

export function projectPluginReadinessSummary(
  result: PluginReadinessAggregateResult,
): PluginReadinessSummaryProjection {
  return Object.freeze({
    status: result.status,
    profile: result.profile,
    generatedAt: result.generatedAt,
    pluginRef: result.pluginRef,
    missingRequired: Object.freeze([...result.missingRequired]),
    degradedOptional: Object.freeze([...result.degradedOptional]),
    disabledOptional: Object.freeze([...result.disabledOptional]),
    willCallRemote: result.willCallRemote,
    externalConnectivityEnabled: result.externalConnectivityEnabled,
    componentCount: result.components.length,
    ...(result.detailsRef === undefined ? {} : { detailsRef: result.detailsRef }),
    ...(result.correlationRef === undefined ? {} : { correlationRef: result.correlationRef }),
  } satisfies PluginReadinessSummaryProjection);
}

export function isSafeReadinessJson(value: unknown): boolean {
  const encoded = JSON.stringify(value);

  if (encoded === undefined) {
    return false;
  }

  return !hasUnsafeText(encoded);
}

export function readinessCheckStatus(report: PluginReadinessComponentReport): PluginReadinessCheckStatus {
  return reportStatus(report.status);
}
