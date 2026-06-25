import { isSafeTransportConfigJson, parseTransportConfig } from '../config.js';

import type {
  OpenClawTelegramTransportProfile,
  TransportConfigDescriptor,
  TransportConfigInput,
  TransportConfigReadinessProjection,
  TransportConfigReadinessStatus,
  TransportProviderConfigDescriptor,
} from '../config.js';
import type { TransportSecretDescriptorStatus, TransportSecretProvider } from '../secrets.js';

export const TELEGRAM_TRANSPORT_READINESS_OVERALL_STATUSES = Object.freeze([
  'fake-ready',
  'secret-gated-ready',
  'blocked',
  'invalid',
  'failed-safe',
] as const);

export type TelegramTransportReadinessOverallStatus = (typeof TELEGRAM_TRANSPORT_READINESS_OVERALL_STATUSES)[number];

export const TELEGRAM_TRANSPORT_CONFIG_STATES = Object.freeze(['valid', 'invalid', 'missing', 'disabled'] as const);

export type TelegramTransportConfigState = (typeof TELEGRAM_TRANSPORT_CONFIG_STATES)[number];

export const TELEGRAM_TRANSPORT_CREDENTIAL_READINESS_STATUSES = Object.freeze([
  'not-required',
  'present-redacted',
  'missing',
  'invalid',
  'unavailable',
  'redacted',
] as const);

export type TelegramTransportCredentialReadinessStatus = (typeof TELEGRAM_TRANSPORT_CREDENTIAL_READINESS_STATUSES)[number];

export const TELEGRAM_TRANSPORT_PROVIDER_PORT_KINDS = Object.freeze([
  'telegram-delivery',
  'openclaw-runtime',
] as const);

export type TelegramTransportProviderPortKind = (typeof TELEGRAM_TRANSPORT_PROVIDER_PORT_KINDS)[number];

export const TELEGRAM_TRANSPORT_PROVIDER_PORT_STATUSES = Object.freeze([
  'not-required',
  'available',
  'missing',
  'blocked',
] as const);

export type TelegramTransportProviderPortStatus = (typeof TELEGRAM_TRANSPORT_PROVIDER_PORT_STATUSES)[number];

export type TelegramTransportReadinessIssueSeverity = 'info' | 'warning' | 'blocked';

export type TelegramTransportReadinessIssueCode =
  | 'config-missing'
  | 'config-disabled'
  | 'config-invalid'
  | 'credential-missing'
  | 'credential-invalid'
  | 'credential-unavailable'
  | 'provider-port-missing'
  | 'provider-port-blocked'
  | 'unsafe-provider-port-redacted'
  | 'unsafe-readiness-output-detected';

export type TelegramTransportBlockedReason =
  | 'none'
  | 'config-missing'
  | 'config-disabled'
  | 'config-invalid'
  | 'credential-missing'
  | 'credential-invalid'
  | 'credential-unavailable'
  | 'provider-port-missing'
  | 'provider-port-blocked'
  | 'not-required-for-fake'
  | 'unsafe-output-detected';

export interface TelegramTransportReadinessIssue {
  readonly code: TelegramTransportReadinessIssueCode;
  readonly severity: TelegramTransportReadinessIssueSeverity;
  readonly componentRef: string;
  readonly summary: string;
}

export interface TelegramTransportCredentialReadiness {
  readonly descriptorKind: 'telegram-transport-credential-readiness';
  readonly provider: TransportSecretProvider;
  readonly credentialRef: string;
  readonly status: TelegramTransportCredentialReadinessStatus;
  readonly required: boolean;
  readonly blockedReason: TelegramTransportBlockedReason;
  readonly redacted: true;
  readonly jsonSerializable: true;
}

export interface TelegramTransportProviderPortReadiness {
  readonly descriptorKind: 'telegram-transport-provider-port-readiness';
  readonly kind: TelegramTransportProviderPortKind;
  readonly provider: TransportSecretProvider;
  readonly portRef: string;
  readonly status: TelegramTransportProviderPortStatus;
  readonly required: boolean;
  readonly blockedReason: TelegramTransportBlockedReason;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export interface TelegramTransportReadinessConfigProjection {
  readonly descriptorKind: 'telegram-transport-config-readiness';
  readonly profile: OpenClawTelegramTransportProfile;
  readonly state: TelegramTransportConfigState;
  readonly status: TransportConfigReadinessStatus;
  readonly providerCount: number;
  readonly issueCount: number;
  readonly readiness: TransportConfigReadinessProjection;
}

export interface TelegramTransportReadinessInput {
  readonly config?: TransportConfigInput | unknown;
  readonly providerPorts?: unknown;
  readonly realNetworkEnabled?: unknown;
}

export interface TelegramTransportReadinessProjection {
  readonly descriptorKind: 'openclaw-telegram-transport-readiness-projection';
  readonly descriptorVersion: 'w17f1';
  readonly overall: TelegramTransportReadinessOverallStatus;
  readonly config: TelegramTransportReadinessConfigProjection;
  readonly credentials: readonly TelegramTransportCredentialReadiness[];
  readonly providerPorts: readonly TelegramTransportProviderPortReadiness[];
  readonly issueCount: number;
  readonly issues: readonly TelegramTransportReadinessIssue[];
  readonly realSmoke: 'disabled' | 'blocked' | 'ready-to-run';
  readonly productionClaim: false;
  readonly productionReady: false;
  readonly effects: 'none';
  readonly defaultNetworkBehavior: 'none';
  readonly realNetworkEnabled: boolean;
  readonly willCallRemote: false;
  readonly noLeakResult: 'passed' | 'failed-safe';
  readonly jsonSerializable: true;
}

const PROVIDER_PORT_BY_PROVIDER = Object.freeze({
  telegram: 'telegram-delivery',
  openclaw: 'openclaw-runtime',
} as const satisfies Record<TransportSecretProvider, TelegramTransportProviderPortKind>);

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:-]{0,119}$/u;
const MAX_SAFE_REF_LENGTH = 120;

const UNSAFE_REF_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\b/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
] as const);

const UNSAFE_JSON_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\b(?:credentialValue|secretValue|tokenValue|providerPayload|callbackPayload)\b/iu,
  /\b(?:stack|endpoint|sdkHandle|clientHandle|providerHandle)\b/iu,
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }

  return fallback;
}

function safeFlag(value: unknown): boolean {
  return value === true || value === '1' || value === 'true' || value === 'enabled';
}

function hasUnsafeRefText(value: string): boolean {
  return UNSAFE_REF_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeRef(value: unknown, fallback: string): { readonly value: string; readonly redacted: boolean } {
  if (typeof value !== 'string') {
    return Object.freeze({ value: fallback, redacted: false });
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (!SAFE_REF_PATTERN.test(normalized) || hasUnsafeRefText(normalized)) {
    return Object.freeze({ value: fallback, redacted: true });
  }

  return Object.freeze({ value: normalized, redacted: false });
}

function createIssue(
  code: TelegramTransportReadinessIssueCode,
  severity: TelegramTransportReadinessIssueSeverity,
  componentRef: string,
  summary: string,
): TelegramTransportReadinessIssue {
  return Object.freeze({
    code,
    severity,
    componentRef,
    summary,
  } satisfies TelegramTransportReadinessIssue);
}

function configState(status: TransportConfigReadinessStatus): TelegramTransportConfigState {
  if (status === 'configured') {
    return 'valid';
  }

  if (status === 'missing') {
    return 'missing';
  }

  if (status === 'disabled') {
    return 'disabled';
  }

  return 'invalid';
}

function credentialStatus(status: TransportSecretDescriptorStatus, required: boolean): TelegramTransportCredentialReadinessStatus {
  if (!required) {
    return 'not-required';
  }

  if (status === 'configured-redacted') {
    return 'present-redacted';
  }

  return status;
}

function credentialBlockedReason(status: TelegramTransportCredentialReadinessStatus): TelegramTransportBlockedReason {
  if (status === 'missing') {
    return 'credential-missing';
  }

  if (status === 'invalid') {
    return 'credential-invalid';
  }

  if (status === 'unavailable') {
    return 'credential-unavailable';
  }

  return 'none';
}

function projectCredentials(
  providers: readonly TransportProviderConfigDescriptor[],
  issues: TelegramTransportReadinessIssue[],
): readonly TelegramTransportCredentialReadiness[] {
  return Object.freeze(
    providers.map((provider) => {
      const status = credentialStatus(provider.secretDescriptor.status, provider.secretRequired);
      const blockedReason = credentialBlockedReason(status);

      if (blockedReason !== 'none') {
        const code =
          blockedReason === 'credential-invalid'
            ? 'credential-invalid'
            : blockedReason === 'credential-unavailable'
              ? 'credential-unavailable'
              : 'credential-missing';
        issues.push(createIssue(code, 'blocked', `transport:${provider.provider}`, 'Required credential reference is not ready'));
      }

      return Object.freeze({
        descriptorKind: 'telegram-transport-credential-readiness',
        provider: provider.provider,
        credentialRef: provider.secretDescriptor.secretRef,
        status,
        required: provider.secretRequired,
        blockedReason,
        redacted: true,
        jsonSerializable: true,
      } satisfies TelegramTransportCredentialReadiness);
    }),
  );
}

function readPortInput(providerPorts: unknown, kind: TelegramTransportProviderPortKind): Record<string, unknown> | undefined {
  if (Array.isArray(providerPorts)) {
    return providerPorts.find(
      (candidate): candidate is Record<string, unknown> =>
        isRecord(candidate) && normalizeOneOf(candidate.kind, TELEGRAM_TRANSPORT_PROVIDER_PORT_KINDS, kind) === kind,
    );
  }

  if (!isRecord(providerPorts)) {
    return undefined;
  }

  const direct = providerPorts[kind];
  if (isRecord(direct)) {
    return direct;
  }

  return undefined;
}

function projectProviderPort(
  provider: TransportSecretProvider,
  required: boolean,
  providerPorts: unknown,
  issues: TelegramTransportReadinessIssue[],
): TelegramTransportProviderPortReadiness {
  const kind = PROVIDER_PORT_BY_PROVIDER[provider];
  const input = readPortInput(providerPorts, kind);
  const fallbackStatus: TelegramTransportProviderPortStatus = required ? 'missing' : 'not-required';
  const status = normalizeOneOf(input?.status, TELEGRAM_TRANSPORT_PROVIDER_PORT_STATUSES, fallbackStatus);
  const fallbackPortRef = required ? `provider-port:${kind}:missing` : `provider-port:${kind}:not-required`;
  const portRef = normalizeRef(input?.portRef, fallbackPortRef);
  let blockedReason: TelegramTransportBlockedReason = 'none';

  if (!required && status === 'not-required') {
    blockedReason = 'not-required-for-fake';
  } else if (required && (status === 'missing' || status === 'not-required')) {
    blockedReason = 'provider-port-missing';
    issues.push(createIssue('provider-port-missing', 'blocked', `transport:${provider}`, 'Required provider port is missing'));
  } else if (required && status === 'blocked') {
    blockedReason = 'provider-port-blocked';
    issues.push(createIssue('provider-port-blocked', 'blocked', `transport:${provider}`, 'Required provider port is blocked'));
  }

  if (portRef.redacted) {
    issues.push(
      createIssue('unsafe-provider-port-redacted', 'warning', `transport:${provider}`, 'Unsafe provider port reference was redacted safely'),
    );
  }

  return Object.freeze({
    descriptorKind: 'telegram-transport-provider-port-readiness',
    kind,
    provider,
    portRef: portRef.value,
    status,
    required,
    blockedReason,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies TelegramTransportProviderPortReadiness);
}

function projectProviderPorts(
  descriptor: TransportConfigDescriptor,
  providerPorts: unknown,
  issues: TelegramTransportReadinessIssue[],
): readonly TelegramTransportProviderPortReadiness[] {
  return Object.freeze(
    descriptor.providers.map((provider) => projectProviderPort(provider.provider, provider.mode === 'real', providerPorts, issues)),
  );
}

function configIssues(state: TelegramTransportConfigState): readonly TelegramTransportReadinessIssue[] {
  if (state === 'missing') {
    return Object.freeze([createIssue('config-missing', 'blocked', 'transport:config', 'Transport config is missing')]);
  }

  if (state === 'disabled') {
    return Object.freeze([createIssue('config-disabled', 'blocked', 'transport:config', 'Transport config is disabled')]);
  }

  if (state === 'invalid') {
    return Object.freeze([createIssue('config-invalid', 'warning', 'transport:config', 'Transport config is invalid or degraded')]);
  }

  return Object.freeze([]);
}

function hasBlockedIssue(issues: readonly TelegramTransportReadinessIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'blocked');
}

function hasRealProvider(descriptor: TransportConfigDescriptor): boolean {
  return descriptor.providers.some((provider) => provider.mode === 'real');
}

function overallStatus(
  state: TelegramTransportConfigState,
  descriptor: TransportConfigDescriptor,
  issues: readonly TelegramTransportReadinessIssue[],
): TelegramTransportReadinessOverallStatus {
  if (state === 'invalid') {
    return hasBlockedIssue(issues) ? 'blocked' : 'invalid';
  }

  if (state === 'missing' || state === 'disabled' || hasBlockedIssue(issues)) {
    return 'blocked';
  }

  if (hasRealProvider(descriptor)) {
    return 'secret-gated-ready';
  }

  return 'fake-ready';
}

function realSmokeStatus(
  overall: TelegramTransportReadinessOverallStatus,
  descriptor: TransportConfigDescriptor,
): TelegramTransportReadinessProjection['realSmoke'] {
  if (!hasRealProvider(descriptor)) {
    return 'disabled';
  }

  if (overall === 'secret-gated-ready') {
    return 'ready-to-run';
  }

  return 'blocked';
}

function createConfigProjection(descriptor: TransportConfigDescriptor, readiness: TransportConfigReadinessProjection): TelegramTransportReadinessConfigProjection {
  return Object.freeze({
    descriptorKind: 'telegram-transport-config-readiness',
    profile: descriptor.profile,
    state: configState(descriptor.status),
    status: descriptor.status,
    providerCount: descriptor.providerCount,
    issueCount: descriptor.issues.length,
    readiness,
  } satisfies TelegramTransportReadinessConfigProjection);
}

function failedSafeProjection(): TelegramTransportReadinessProjection {
  const parsed = parseTransportConfig({});
  const config = createConfigProjection(parsed.descriptor, parsed.readiness);
  const issue = createIssue(
    'unsafe-readiness-output-detected',
    'blocked',
    'transport:readiness',
    'Unsafe readiness output was replaced with a failed-safe projection',
  );

  return Object.freeze({
    descriptorKind: 'openclaw-telegram-transport-readiness-projection',
    descriptorVersion: 'w17f1',
    overall: 'failed-safe',
    config,
    credentials: Object.freeze([]),
    providerPorts: Object.freeze([]),
    issueCount: 1,
    issues: Object.freeze([issue]),
    realSmoke: 'blocked',
    productionClaim: false,
    productionReady: false,
    effects: 'none',
    defaultNetworkBehavior: 'none',
    realNetworkEnabled: false,
    willCallRemote: false,
    noLeakResult: 'failed-safe',
    jsonSerializable: true,
  } satisfies TelegramTransportReadinessProjection);
}

export function projectTelegramTransportReadiness(
  input: TelegramTransportReadinessInput = Object.freeze({}),
): TelegramTransportReadinessProjection {
  const parsed = parseTransportConfig(input.config ?? {});
  const config = createConfigProjection(parsed.descriptor, parsed.readiness);
  const issues: TelegramTransportReadinessIssue[] = [...configIssues(config.state)];
  const credentials = projectCredentials(parsed.descriptor.providers, issues);
  const providerPorts = projectProviderPorts(parsed.descriptor, input.providerPorts, issues);
  const overall = overallStatus(config.state, parsed.descriptor, issues);
  const projection = Object.freeze({
    descriptorKind: 'openclaw-telegram-transport-readiness-projection',
    descriptorVersion: 'w17f1',
    overall,
    config,
    credentials,
    providerPorts,
    issueCount: issues.length,
    issues: Object.freeze([...issues]),
    realSmoke: realSmokeStatus(overall, parsed.descriptor),
    productionClaim: false,
    productionReady: false,
    effects: 'none',
    defaultNetworkBehavior: 'none',
    realNetworkEnabled: safeFlag(input.realNetworkEnabled),
    willCallRemote: false,
    noLeakResult: 'passed',
    jsonSerializable: true,
  } satisfies TelegramTransportReadinessProjection);

  if (!isSafeTelegramTransportReadinessJson(projection)) {
    return failedSafeProjection();
  }

  return projection;
}

export function isSafeTelegramTransportReadinessJson(value: unknown): boolean {
  if (!isSafeTransportConfigJson(value)) {
    return false;
  }

  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === 'string' && !UNSAFE_JSON_PATTERNS.some((pattern) => pattern.test(encoded));
  } catch {
    return false;
  }
}
