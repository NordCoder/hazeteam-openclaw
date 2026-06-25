import {
  createTransportSecretDescriptor,
  TRANSPORT_SECRET_PROVIDERS,
} from './secrets.js';

import type {
  TransportSecretDescriptor,
  TransportSecretDescriptorIssue,
  TransportSecretKind,
  TransportSecretProvider,
} from './secrets.js';

export const OPENCLAW_TELEGRAM_TRANSPORT_PROFILES = Object.freeze([
  'test',
  'dry-run',
  'real-smoke',
  'production',
] as const);

export type OpenClawTelegramTransportProfile = (typeof OPENCLAW_TELEGRAM_TRANSPORT_PROFILES)[number];

export const TRANSPORT_PROVIDER_MODES = Object.freeze(['disabled', 'dry-run', 'real'] as const);

export type TransportProviderMode = (typeof TRANSPORT_PROVIDER_MODES)[number];

export const TRANSPORT_PROVIDER_CLASSIFICATIONS = Object.freeze([
  'missing',
  'disabled',
  'dry-run',
  'real-configured',
  'missing-secret',
  'degraded',
] as const);

export type TransportProviderClassification = (typeof TRANSPORT_PROVIDER_CLASSIFICATIONS)[number];

export const TRANSPORT_CONFIG_READINESS_STATUSES = Object.freeze([
  'configured',
  'missing',
  'disabled',
  'degraded',
  'blocked-by-secret',
] as const);

export type TransportConfigReadinessStatus = (typeof TRANSPORT_CONFIG_READINESS_STATUSES)[number];

export type TransportConfigIssueSeverity = 'info' | 'warning' | 'blocked';

export type TransportConfigIssueCode =
  | 'invalid-config-input'
  | 'invalid-profile-normalized'
  | 'invalid-provider-config'
  | 'invalid-provider-mode-normalized'
  | 'unsafe-config-field-redacted'
  | 'unknown-config-field-ignored'
  | 'unsafe-transport-ref-redacted'
  | 'real-transport-blocked-by-secret';

export interface TransportConfigIssue {
  readonly code: TransportConfigIssueCode;
  readonly severity: TransportConfigIssueSeverity;
  readonly componentRef: string;
  readonly summary: string;
}

export interface TransportProviderConfigInput {
  readonly mode?: unknown;
  readonly enabled?: unknown;
  readonly transportRef?: unknown;
  readonly secretRef?: unknown;
  readonly credentialRef?: unknown;
  readonly sourceClass?: unknown;
}

export interface TransportConfigInput {
  readonly profile?: unknown;
  readonly providers?: unknown;
}

export interface TransportProviderConfigDescriptor {
  readonly descriptorKind: 'transport-provider-config';
  readonly provider: TransportSecretProvider;
  readonly transportRef: string;
  readonly mode: TransportProviderMode;
  readonly classification: TransportProviderClassification;
  readonly readiness: TransportConfigReadinessStatus;
  readonly secretRequired: boolean;
  readonly secretDescriptor: TransportSecretDescriptor;
  readonly issueCount: number;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly providerClient: 'not-constructed';
}

export interface TransportConfigDescriptor {
  readonly descriptorKind: 'openclaw-telegram-transport-config';
  readonly descriptorVersion: 'w14a';
  readonly profile: OpenClawTelegramTransportProfile;
  readonly status: TransportConfigReadinessStatus;
  readonly productionReady: false;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly providerCount: number;
  readonly providers: readonly TransportProviderConfigDescriptor[];
  readonly issues: readonly TransportConfigIssue[];
}

export interface TransportConfigReadinessProviderProjection {
  readonly provider: TransportSecretProvider;
  readonly transportRef: string;
  readonly mode: TransportProviderMode;
  readonly classification: TransportProviderClassification;
  readonly readiness: TransportConfigReadinessStatus;
  readonly secretRef: string;
  readonly secretStatus: TransportSecretDescriptor['status'];
  readonly willCallRemote: false;
}

export interface TransportConfigReadinessProjection {
  readonly descriptorKind: 'openclaw-telegram-transport-readiness';
  readonly descriptorVersion: 'w14a';
  readonly profile: OpenClawTelegramTransportProfile;
  readonly status: TransportConfigReadinessStatus;
  readonly productionReady: false;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly providerCount: number;
  readonly issueCount: number;
  readonly providers: readonly TransportConfigReadinessProviderProjection[];
}

export interface TransportConfigParseResult {
  readonly ok: boolean;
  readonly descriptor: TransportConfigDescriptor;
  readonly readiness: TransportConfigReadinessProjection;
}

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:-]{0,119}$/u;
const MAX_SAFE_REF_LENGTH = 120;
const DEFAULT_PROVIDER_KEYS = Object.freeze(['mode', 'enabled', 'transportRef', 'secretRef', 'credentialRef', 'sourceClass'] as const);
const DEFAULT_ROOT_KEYS = Object.freeze(['profile', 'providers'] as const);

const UNSAFE_INPUT_KEY_PATTERNS = Object.freeze([
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
  /provider\s*object/iu,
  /raw/iu,
  /payload/iu,
  /endpoint/iu,
  /url/iu,
  /path/iu,
] as const);

const UNSAFE_OUTPUT_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\braw(?:Config|Payload|Update|Response|Body)?\b/u,
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

function safeTransportRef(provider: TransportSecretProvider, value: unknown): string {
  if (typeof value !== 'string') {
    return `transport:${provider}`;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (!SAFE_REF_PATTERN.test(normalized) || hasUnsafeOutput(normalized)) {
    return `transport:${provider}:redacted`;
  }

  return normalized;
}

function hasUnsafeOutput(value: string): boolean {
  return UNSAFE_OUTPUT_PATTERNS.some((pattern) => pattern.test(value));
}

function createIssue(
  code: TransportConfigIssueCode,
  severity: TransportConfigIssueSeverity,
  componentRef: string,
  summary: string,
): TransportConfigIssue {
  return Object.freeze({
    code,
    severity,
    componentRef,
    summary,
  } satisfies TransportConfigIssue);
}

function fromSecretIssue(issue: TransportSecretDescriptorIssue): TransportConfigIssue {
  const code: TransportConfigIssueCode = issue.severity === 'blocked' ? 'unsafe-config-field-redacted' : 'unknown-config-field-ignored';
  return createIssue(code, issue.severity, issue.componentRef, issue.summary);
}

function keyIsAllowed(key: string, allowedKeys: readonly string[]): boolean {
  return allowedKeys.includes(key);
}

function keyLooksUnsafe(key: string): boolean {
  return UNSAFE_INPUT_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectUnknownKeyIssues(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  componentRef: string,
): readonly TransportConfigIssue[] {
  const issues: TransportConfigIssue[] = [];

  for (const key of Object.keys(record)) {
    if (keyIsAllowed(key, allowedKeys)) {
      continue;
    }

    issues.push(
      createIssue(
        keyLooksUnsafe(key) ? 'unsafe-config-field-redacted' : 'unknown-config-field-ignored',
        'warning',
        componentRef,
        keyLooksUnsafe(key) ? 'Unsafe config field was ignored safely' : 'Unknown config field was ignored safely',
      ),
    );
  }

  return Object.freeze(issues);
}

function normalizeProfile(value: unknown, issues: TransportConfigIssue[]): OpenClawTelegramTransportProfile {
  const profile = normalizeOneOf(value, OPENCLAW_TELEGRAM_TRANSPORT_PROFILES, 'test');

  if (value !== undefined && profile !== value) {
    issues.push(
      createIssue('invalid-profile-normalized', 'warning', 'transport:config', 'Transport profile was normalized safely'),
    );
  }

  return profile;
}

function defaultModeForProfile(profile: OpenClawTelegramTransportProfile): TransportProviderMode {
  if (profile === 'real-smoke' || profile === 'production') {
    return 'real';
  }

  return 'dry-run';
}

function normalizeProviderMode(
  provider: TransportSecretProvider,
  record: Record<string, unknown>,
  profile: OpenClawTelegramTransportProfile,
  issues: TransportConfigIssue[],
): TransportProviderMode {
  if (record.enabled === false) {
    return 'disabled';
  }

  const fallback = record.enabled === true ? defaultModeForProfile(profile) : defaultModeForProfile(profile);
  const mode = normalizeOneOf(record.mode, TRANSPORT_PROVIDER_MODES, fallback);

  if (record.mode !== undefined && mode !== record.mode) {
    issues.push(
      createIssue(
        'invalid-provider-mode-normalized',
        'warning',
        `transport:${provider}`,
        'Transport provider mode was normalized safely',
      ),
    );
  }

  return mode;
}

function defaultSecretKind(provider: TransportSecretProvider): TransportSecretKind {
  return provider === 'telegram' ? 'telegram-bot-token' : 'openclaw-api-token';
}

function absentProviderDescriptor(provider: TransportSecretProvider): TransportProviderConfigDescriptor {
  const secretResult = createTransportSecretDescriptor({
    provider,
    kind: defaultSecretKind(provider),
  });

  return Object.freeze({
    descriptorKind: 'transport-provider-config',
    provider,
    transportRef: `transport:${provider}`,
    mode: 'disabled',
    classification: 'missing',
    readiness: 'missing',
    secretRequired: false,
    secretDescriptor: secretResult.descriptor,
    issueCount: 0,
    effects: 'none',
    willCallRemote: false,
    providerClient: 'not-constructed',
  } satisfies TransportProviderConfigDescriptor);
}

function providerClassification(
  mode: TransportProviderMode,
  secret: TransportSecretDescriptor,
  issues: readonly TransportConfigIssue[],
): Pick<TransportProviderConfigDescriptor, 'classification' | 'readiness'> {
  if (mode === 'disabled') {
    return { classification: 'disabled', readiness: 'disabled' };
  }

  if (mode === 'real' && secret.status !== 'configured-redacted') {
    return { classification: 'missing-secret', readiness: 'blocked-by-secret' };
  }

  if (issues.some((issue) => issue.severity === 'warning')) {
    return { classification: 'degraded', readiness: 'degraded' };
  }

  if (mode === 'dry-run') {
    return { classification: 'dry-run', readiness: 'configured' };
  }

  return { classification: 'real-configured', readiness: 'configured' };
}

function normalizeProviderConfig(
  provider: TransportSecretProvider,
  input: unknown,
  profile: OpenClawTelegramTransportProfile,
  present: boolean,
): { readonly descriptor: TransportProviderConfigDescriptor; readonly issues: readonly TransportConfigIssue[] } {
  if (!present) {
    return Object.freeze({
      descriptor: absentProviderDescriptor(provider),
      issues: Object.freeze([]),
    });
  }

  if (!isRecord(input)) {
    const descriptor = absentProviderDescriptor(provider);
    return Object.freeze({
      descriptor,
      issues: Object.freeze([
        createIssue('invalid-provider-config', 'blocked', `transport:${provider}`, 'Provider config was not an object'),
      ]),
    });
  }

  const issues: TransportConfigIssue[] = [...collectUnknownKeyIssues(input, DEFAULT_PROVIDER_KEYS, `transport:${provider}`)];
  const mode = normalizeProviderMode(provider, input, profile, issues);
  const transportRef = safeTransportRef(provider, input.transportRef);

  if (input.transportRef !== undefined && transportRef.endsWith(':redacted')) {
    issues.push(
      createIssue(
        'unsafe-transport-ref-redacted',
        'warning',
        `transport:${provider}`,
        'Unsafe transport reference was redacted safely',
      ),
    );
  }

  const secretResult = createTransportSecretDescriptor({
    provider,
    kind: defaultSecretKind(provider),
    secretRef: input.secretRef,
    credentialRef: input.credentialRef,
    sourceClass: input.sourceClass,
  });

  issues.push(...secretResult.issues.map(fromSecretIssue));

  if (mode === 'real' && secretResult.descriptor.status !== 'configured-redacted') {
    issues.push(
      createIssue(
        'real-transport-blocked-by-secret',
        'blocked',
        `transport:${provider}`,
        'Real transport is blocked until a redacted credential reference is configured',
      ),
    );
  }

  const readiness = providerClassification(mode, secretResult.descriptor, issues);

  return Object.freeze({
    descriptor: Object.freeze({
      descriptorKind: 'transport-provider-config',
      provider,
      transportRef,
      mode,
      classification: readiness.classification,
      readiness: readiness.readiness,
      secretRequired: mode === 'real',
      secretDescriptor: secretResult.descriptor,
      issueCount: issues.length,
      effects: 'none',
      willCallRemote: false,
      providerClient: 'not-constructed',
    } satisfies TransportProviderConfigDescriptor),
    issues: Object.freeze([...issues]),
  });
}

function aggregateConfigStatus(providers: readonly TransportProviderConfigDescriptor[], issues: readonly TransportConfigIssue[]): TransportConfigReadinessStatus {
  if (providers.some((provider) => provider.readiness === 'blocked-by-secret')) {
    return 'blocked-by-secret';
  }

  if (issues.some((issue) => issue.severity === 'blocked')) {
    return 'degraded';
  }

  if (providers.every((provider) => provider.readiness === 'disabled')) {
    return 'disabled';
  }

  if (providers.every((provider) => provider.readiness === 'missing')) {
    return 'missing';
  }

  if (providers.some((provider) => provider.readiness === 'missing')) {
    return 'degraded';
  }

  if (providers.some((provider) => provider.readiness === 'degraded') || issues.length > 0) {
    return 'degraded';
  }

  return 'configured';
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function projectTransportConfigReadiness(
  descriptor: TransportConfigDescriptor,
): TransportConfigReadinessProjection {
  return Object.freeze({
    descriptorKind: 'openclaw-telegram-transport-readiness',
    descriptorVersion: 'w14a',
    profile: descriptor.profile,
    status: descriptor.status,
    productionReady: false,
    effects: 'none',
    willCallRemote: false,
    providerCount: descriptor.providerCount,
    issueCount: descriptor.issues.length,
    providers: Object.freeze(
      descriptor.providers.map((provider) =>
        Object.freeze({
          provider: provider.provider,
          transportRef: provider.transportRef,
          mode: provider.mode,
          classification: provider.classification,
          readiness: provider.readiness,
          secretRef: provider.secretDescriptor.secretRef,
          secretStatus: provider.secretDescriptor.status,
          willCallRemote: false,
        } satisfies TransportConfigReadinessProviderProjection),
      ),
    ),
  } satisfies TransportConfigReadinessProjection);
}

export function parseTransportConfig(input: unknown): TransportConfigParseResult {
  const issues: TransportConfigIssue[] = [];
  const root = isRecord(input) ? input : {};

  if (!isRecord(input)) {
    issues.push(createIssue('invalid-config-input', 'warning', 'transport:config', 'Config input was normalized safely'));
  }

  issues.push(...collectUnknownKeyIssues(root, DEFAULT_ROOT_KEYS, 'transport:config'));
  const profile = normalizeProfile(root.profile, issues);
  const providersInput = isRecord(root.providers) ? root.providers : {};

  if (root.providers !== undefined && !isRecord(root.providers)) {
    issues.push(createIssue('invalid-provider-config', 'blocked', 'transport:config', 'Providers config was not an object'));
  }

  const providers = TRANSPORT_SECRET_PROVIDERS.map((provider) =>
    normalizeProviderConfig(provider, providersInput[provider], profile, hasOwn(providersInput, provider)),
  );
  const providerDescriptors = Object.freeze(providers.map((provider) => provider.descriptor));
  const allIssues = Object.freeze([...issues, ...providers.flatMap((provider) => provider.issues)]);
  const status = aggregateConfigStatus(providerDescriptors, allIssues);
  const descriptor = Object.freeze({
    descriptorKind: 'openclaw-telegram-transport-config',
    descriptorVersion: 'w14a',
    profile,
    status,
    productionReady: false,
    effects: 'none',
    willCallRemote: false,
    providerCount: providerDescriptors.length,
    providers: providerDescriptors,
    issues: allIssues,
  } satisfies TransportConfigDescriptor);

  return Object.freeze({
    ok: status === 'configured' || status === 'disabled' || status === 'degraded',
    descriptor,
    readiness: projectTransportConfigReadiness(descriptor),
  } satisfies TransportConfigParseResult);
}

export function isSafeTransportConfigJson(value: unknown): boolean {
  const encoded = JSON.stringify(value);

  if (encoded === undefined) {
    return false;
  }

  return !hasUnsafeOutput(encoded);
}
