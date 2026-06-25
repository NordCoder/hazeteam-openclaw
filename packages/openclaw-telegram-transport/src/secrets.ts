export const TRANSPORT_SECRET_PROVIDERS = Object.freeze(['telegram', 'openclaw'] as const);

export type TransportSecretProvider = (typeof TRANSPORT_SECRET_PROVIDERS)[number];

export const TRANSPORT_SECRET_KINDS = Object.freeze([
  'telegram-bot-token',
  'openclaw-api-token',
  'openclaw-channel-token',
  'webhook-signing-key',
] as const);

export type TransportSecretKind = (typeof TRANSPORT_SECRET_KINDS)[number];

export const TRANSPORT_SECRET_SOURCE_CLASSES = Object.freeze([
  'injected',
  'secret-manager',
  'env',
  'file',
  'unknown',
] as const);

export type TransportSecretSourceClass = (typeof TRANSPORT_SECRET_SOURCE_CLASSES)[number];

export const TRANSPORT_SECRET_DESCRIPTOR_STATUSES = Object.freeze([
  'configured-redacted',
  'missing',
  'invalid',
  'unavailable',
  'redacted',
] as const);

export type TransportSecretDescriptorStatus = (typeof TRANSPORT_SECRET_DESCRIPTOR_STATUSES)[number];

export type TransportSecretDescriptorIssueCode =
  | 'unsafe-secret-ref-redacted'
  | 'invalid-secret-provider'
  | 'invalid-secret-kind'
  | 'invalid-secret-source';

export type TransportSecretDescriptorIssueSeverity = 'warning' | 'blocked';

export interface TransportSecretDescriptorIssue {
  readonly code: TransportSecretDescriptorIssueCode;
  readonly severity: TransportSecretDescriptorIssueSeverity;
  readonly componentRef: string;
  readonly summary: string;
}

export interface TransportSecretDescriptor {
  readonly descriptorKind: 'transport-secret-descriptor';
  readonly descriptorVersion: 'w14a';
  readonly provider: TransportSecretProvider;
  readonly kind: TransportSecretKind;
  readonly secretRef: string;
  readonly status: TransportSecretDescriptorStatus;
  readonly sourceClass: TransportSecretSourceClass;
  readonly redacted: true;
  readonly jsonSerializable: true;
}

export interface TransportSecretDescriptorInput {
  readonly provider?: unknown;
  readonly kind?: unknown;
  readonly secretRef?: unknown;
  readonly credentialRef?: unknown;
  readonly sourceClass?: unknown;
  readonly status?: unknown;
}

export interface TransportSecretDescriptorResult {
  readonly descriptor: TransportSecretDescriptor;
  readonly issues: readonly TransportSecretDescriptorIssue[];
}

export const TRANSPORT_SECRET_HANDLE_BRAND: unique symbol = Symbol('hazeteam.openclaw.transport-secret-handle');

export interface TransportSecretHandle {
  readonly [TRANSPORT_SECRET_HANDLE_BRAND]: true;
  readonly kind: 'transport-secret-handle';
  describe(): TransportSecretDescriptor;
  toJSON(): never;
  toString(): string;
}

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:-]{0,119}$/u;
const MAX_SAFE_REF_LENGTH = 120;

const UNSAFE_REF_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\b/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
] as const);

function normalizeOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }

  return fallback;
}

function fallbackSecretKind(provider: TransportSecretProvider): TransportSecretKind {
  return provider === 'telegram' ? 'telegram-bot-token' : 'openclaw-api-token';
}

function componentRefFor(provider: TransportSecretProvider): string {
  return `transport:${provider}`;
}

function defaultSecretRef(provider: TransportSecretProvider, kind: TransportSecretKind, suffix: 'missing' | 'redacted'): string {
  return `secret:${provider}:${kind}:${suffix}`;
}

function hasUnsafeRefText(value: string): boolean {
  return UNSAFE_REF_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeRefText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
}

export function isSafeTransportSecretRef(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = normalizeRefText(value);
  return normalized.length > 0 && SAFE_REF_PATTERN.test(normalized) && !hasUnsafeRefText(normalized);
}

export function sanitizeTransportSecretRef(
  value: unknown,
  fallback = 'secret:redacted',
): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = normalizeRefText(value);
  if (!SAFE_REF_PATTERN.test(normalized) || hasUnsafeRefText(normalized)) {
    return fallback;
  }

  return normalized;
}

function normalizeSecretStatus(
  value: unknown,
  refStatus: TransportSecretDescriptorStatus,
): TransportSecretDescriptorStatus {
  if (typeof value !== 'string') {
    return refStatus;
  }

  if (!(TRANSPORT_SECRET_DESCRIPTOR_STATUSES as readonly string[]).includes(value)) {
    return refStatus;
  }

  if (refStatus === 'missing' || refStatus === 'invalid') {
    return refStatus;
  }

  return value as TransportSecretDescriptorStatus;
}

function createIssue(
  code: TransportSecretDescriptorIssueCode,
  severity: TransportSecretDescriptorIssueSeverity,
  componentRef: string,
  summary: string,
): TransportSecretDescriptorIssue {
  return Object.freeze({
    code,
    severity,
    componentRef,
    summary,
  } satisfies TransportSecretDescriptorIssue);
}

export function createTransportSecretDescriptor(input: TransportSecretDescriptorInput): TransportSecretDescriptorResult {
  const provider = normalizeOneOf(input.provider, TRANSPORT_SECRET_PROVIDERS, 'telegram');
  const providerWasValid = input.provider === undefined || provider === input.provider;
  const kind = normalizeOneOf(input.kind, TRANSPORT_SECRET_KINDS, fallbackSecretKind(provider));
  const kindWasValid = input.kind === undefined || kind === input.kind;
  const sourceClass = normalizeOneOf(input.sourceClass, TRANSPORT_SECRET_SOURCE_CLASSES, 'unknown');
  const sourceWasValid = input.sourceClass === undefined || sourceClass === input.sourceClass;
  const componentRef = componentRefFor(provider);
  const rawRef = input.secretRef ?? input.credentialRef;
  const issues: TransportSecretDescriptorIssue[] = [];

  if (!providerWasValid) {
    issues.push(createIssue('invalid-secret-provider', 'warning', componentRef, 'Secret provider was normalized safely'));
  }

  if (!kindWasValid) {
    issues.push(createIssue('invalid-secret-kind', 'warning', componentRef, 'Secret kind was normalized safely'));
  }

  if (!sourceWasValid) {
    issues.push(createIssue('invalid-secret-source', 'warning', componentRef, 'Secret source class was normalized safely'));
  }

  let secretRef: string;
  let refStatus: TransportSecretDescriptorStatus;

  if (rawRef === undefined || rawRef === null || rawRef === '') {
    secretRef = defaultSecretRef(provider, kind, 'missing');
    refStatus = 'missing';
  } else if (isSafeTransportSecretRef(rawRef)) {
    secretRef = sanitizeTransportSecretRef(rawRef, defaultSecretRef(provider, kind, 'redacted'));
    refStatus = 'configured-redacted';
  } else {
    secretRef = defaultSecretRef(provider, kind, 'redacted');
    refStatus = 'invalid';
    issues.push(createIssue('unsafe-secret-ref-redacted', 'blocked', componentRef, 'Unsafe credential reference was redacted safely'));
  }

  const descriptor = Object.freeze({
    descriptorKind: 'transport-secret-descriptor',
    descriptorVersion: 'w14a',
    provider,
    kind,
    secretRef,
    status: normalizeSecretStatus(input.status, refStatus),
    sourceClass,
    redacted: true,
    jsonSerializable: true,
  } satisfies TransportSecretDescriptor);

  return Object.freeze({
    descriptor,
    issues: Object.freeze([...issues]),
  } satisfies TransportSecretDescriptorResult);
}

class OpaqueTransportSecretHandle implements TransportSecretHandle {
  readonly [TRANSPORT_SECRET_HANDLE_BRAND] = true;
  readonly kind = 'transport-secret-handle';
  readonly #descriptor: TransportSecretDescriptor;

  constructor(descriptor: TransportSecretDescriptor) {
    this.#descriptor = descriptor;
  }

  describe(): TransportSecretDescriptor {
    return this.#descriptor;
  }

  toJSON(): never {
    throw new TypeError('Transport secret handle is not JSON serializable');
  }

  toString(): string {
    return '[opaque transport secret handle]';
  }
}

export function createOpaqueTransportSecretHandle(descriptor: TransportSecretDescriptor): TransportSecretHandle {
  return Object.freeze(new OpaqueTransportSecretHandle(descriptor));
}

export function describeTransportSecretHandle(handle: TransportSecretHandle): TransportSecretDescriptor {
  return handle.describe();
}
