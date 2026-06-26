const RUNTIME_CREDENTIAL_REF_PREFIX = 'credential:' as const;
const RUNTIME_SECRET_HANDLE_REF_PREFIX = 'secret-handle:' as const;
const DEFAULT_CREDENTIAL_KIND = 'runtime-credential';
const DEFAULT_REDACTED_LABEL = 'redacted';
const DEFAULT_SOURCE_CLASS = 'injected';
const DEFAULT_BLOCKED_REASON = 'Runtime credential is blocked.';
const MAX_SAFE_REF_LENGTH = 256;
const MAX_SAFE_TEXT_LENGTH = 240;
const MAX_SAFE_DIAGNOSTICS = 10;
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const POSIX_PATH_PATTERN = /(?:\/[A-Za-z0-9._~-]+){2,}/gu;
const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:\\[^\s]+/gu;
const URL_PATTERN = /https?:\/\/\S+/giu;
const STACK_TRACE_PATTERN = /\bError:\s.+?\s+at\s+\S+\s*\([^)]*\)/gsu;
const BEARER_PATTERN = /\bbearer\s+[A-Za-z0-9._:-]+/giu;
const TELEGRAM_TOKEN_PATTERN = /\b\d{5,}:[A-Za-z0-9_-]{8,}\b/gu;
const API_KEY_PATTERN = /\bsk_(?:live|test)_[A-Za-z0-9_-]+\b/gu;
const SENSITIVE_ASSIGNMENT_PATTERNS = [
  /\bapi[-_]?key\s*[:=]\s*\S+/giu,
  /\bauthorization\s*[:=]\s*\S+/giu,
  /\bbot[-_]?token\s*[:=]\s*\S+/giu,
  /\bcredential\s*[:=]\s*\S+/giu,
  /\bpassword\s*[:=]\s*\S+/giu,
  /\bpasswd\s*[:=]\s*\S+/giu,
  /\bsecret\s*[:=]\s*\S+/giu,
  /\b(?:raw|provider|runtime)[-_]?payload\s*[:=]\s*\S+/giu,
  /\bendpoint\s*[:=]\s*\S+/giu,
  /\bfile[-_]?path\s*[:=]\s*\S+/giu,
  /\bpath\s*[:=]\s*\S+/giu,
  /\bstack(?:trace)?\s*[:=]\s*\S+/giu,
  /\b(?:providerHandle|clientHandle|sdkClient|sdkHandle|client|processId)\s*[:=]\s*\S+/gu,
] as const;

export type RuntimeCredentialRef = `${typeof RUNTIME_CREDENTIAL_REF_PREFIX}${string}`;
export type RuntimeSecretHandleRef = `${typeof RUNTIME_SECRET_HANDLE_REF_PREFIX}${string}`;

export type RuntimeCredentialStatus = 'configured' | 'missing' | 'invalid' | 'disabled' | 'blocked';
export type RuntimeBlockedCredentialStatus = Exclude<RuntimeCredentialStatus, 'configured'>;
export type RuntimeValueResolutionStatus = 'resolved' | 'missing' | 'invalid' | 'disabled' | 'blocked';
export type RuntimeBlockedResolutionStatus = Exclude<RuntimeValueResolutionStatus, 'resolved'>;
export type RuntimePublicReadinessStatus = 'ready' | 'blocked';

export type RuntimeCredentialSourceClass =
  | 'injected'
  | 'secret-manager'
  | 'deployment-profile'
  | 'test-fixture'
  | 'unknown'
  | (string & {});

export interface RedactedRuntimeCredentialDescriptor {
  readonly credentialRef: RuntimeCredentialRef;
  readonly credentialStatus: RuntimeCredentialStatus;
  readonly kind: string;
  readonly redactedLabel: string;
  readonly sourceClass: RuntimeCredentialSourceClass;
  readonly secretHandleRef?: RuntimeSecretHandleRef;
  readonly blockedReason?: string;
  readonly safeDiagnostics?: readonly string[];
}

export interface RuntimeValueResolverRequest {
  readonly credentialRef: RuntimeCredentialRef;
  readonly secretHandleRef?: RuntimeSecretHandleRef;
  readonly credentialKind?: string;
  readonly redactedLabel?: string;
  readonly sourceClass?: RuntimeCredentialSourceClass;
}

export interface ResolvedRuntimeValueResolverResult<T = unknown> {
  readonly status: 'resolved';
  readonly credentialRef: RuntimeCredentialRef;
  readonly secretHandleRef?: RuntimeSecretHandleRef;
  readonly credentialStatus: 'configured';
  readonly redactedCredentialDescriptor: RedactedRuntimeCredentialDescriptor;
  readonly runtimeValue: RuntimeOnlyValue<T>;
  readonly safeDiagnostics?: readonly string[];
}

export interface BlockedRuntimeValueResolverResult {
  readonly status: RuntimeBlockedResolutionStatus;
  readonly credentialRef: RuntimeCredentialRef;
  readonly secretHandleRef?: RuntimeSecretHandleRef;
  readonly credentialStatus: RuntimeBlockedCredentialStatus;
  readonly redactedCredentialDescriptor: RedactedRuntimeCredentialDescriptor;
  readonly blockedReason: string;
  readonly safeDiagnostics?: readonly string[];
}

export type RuntimeValueResolverResult<T = unknown> =
  | ResolvedRuntimeValueResolverResult<T>
  | BlockedRuntimeValueResolverResult;

export interface RuntimeValueResolver<T = unknown> {
  readonly resolveRuntimeValue: (
    request: RuntimeValueResolverRequest,
  ) => RuntimeValueResolverResult<T> | Promise<RuntimeValueResolverResult<T>>;
}

export interface RuntimeValuePublicReadinessProjection {
  readonly readinessStatus: RuntimePublicReadinessStatus;
  readonly credentialRef: RuntimeCredentialRef;
  readonly secretHandleRef?: RuntimeSecretHandleRef;
  readonly redactedCredentialDescriptor: RedactedRuntimeCredentialDescriptor;
  readonly credentialStatus: RuntimeCredentialStatus;
  readonly resolutionStatus: RuntimeValueResolutionStatus;
  readonly blockedReason?: string;
  readonly safeDiagnostics?: readonly string[];
}

export class RuntimeOnlyValue<T = unknown> {
  readonly valueKind = 'runtime-only' as const;
  readonly publicSerialization = 'blocked' as const;

  #value: T;

  private constructor(value: T) {
    this.#value = value;
    Object.freeze(this);
  }

  static create<TValue>(value: TValue): RuntimeOnlyValue<TValue> {
    if (value === undefined) {
      throw new TypeError('Runtime-only value must be present.');
    }

    return new RuntimeOnlyValue(value);
  }

  unwrap(): T {
    return this.#value;
  }

  toJSON(): never {
    throw new TypeError('Runtime-only value cannot be serialized into public JSON.');
  }
}

export function createCredentialRef(input: string): RuntimeCredentialRef {
  return normalizePrefixedRef(input, RUNTIME_CREDENTIAL_REF_PREFIX, 'Runtime credential ref');
}

export function createSecretHandleRef(input: string): RuntimeSecretHandleRef {
  return normalizePrefixedRef(input, RUNTIME_SECRET_HANDLE_REF_PREFIX, 'Runtime secret handle ref');
}

export function createRuntimeOnlyValue<T>(value: T): RuntimeOnlyValue<T> {
  return RuntimeOnlyValue.create(value);
}

export function unwrapRuntimeOnlyValue<T>(runtimeValue: RuntimeOnlyValue<T>): T {
  if (!(runtimeValue instanceof RuntimeOnlyValue)) {
    throw new TypeError('Runtime-only value must be created by the runtime value boundary.');
  }

  return runtimeValue.unwrap();
}

export function createRedactedRuntimeCredentialDescriptor(input: {
  readonly credentialRef: RuntimeCredentialRef | string;
  readonly credentialStatus: RuntimeCredentialStatus;
  readonly kind?: string;
  readonly redactedLabel?: string;
  readonly sourceClass?: RuntimeCredentialSourceClass;
  readonly secretHandleRef?: RuntimeSecretHandleRef | string;
  readonly blockedReason?: string;
  readonly safeDiagnostics?: readonly string[];
}): RedactedRuntimeCredentialDescriptor {
  const credentialRef = createCredentialRef(input.credentialRef);
  const secretHandleRef = normalizeOptionalSecretHandleRef(input.secretHandleRef);
  const blockedReason = normalizeOptionalSafeText(input.blockedReason);
  const safeDiagnostics = normalizeOptionalSafeDiagnostics(input.safeDiagnostics);

  return Object.freeze({
    credentialRef,
    credentialStatus: normalizeCredentialStatus(input.credentialStatus),
    kind: normalizeSafeIdentifier(input.kind ?? DEFAULT_CREDENTIAL_KIND, 'Runtime credential kind'),
    redactedLabel: normalizeSafeText(input.redactedLabel ?? DEFAULT_REDACTED_LABEL, DEFAULT_REDACTED_LABEL),
    sourceClass: normalizeSafeIdentifier(
      input.sourceClass ?? DEFAULT_SOURCE_CLASS,
      'Runtime credential source class',
    ) as RuntimeCredentialSourceClass,
    ...(secretHandleRef === undefined ? {} : { secretHandleRef }),
    ...(blockedReason === undefined ? {} : { blockedReason }),
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
  });
}

export function createRuntimeValueResolverResult<T>(input: {
  readonly status: RuntimeValueResolutionStatus;
  readonly credentialRef: RuntimeCredentialRef | string;
  readonly secretHandleRef?: RuntimeSecretHandleRef | string;
  readonly credentialStatus?: RuntimeCredentialStatus;
  readonly redactedCredentialDescriptor?: RedactedRuntimeCredentialDescriptor;
  readonly runtimeValue?: RuntimeOnlyValue<T> | T;
  readonly blockedReason?: string;
  readonly safeDiagnostics?: readonly string[];
  readonly credentialKind?: string;
  readonly redactedLabel?: string;
  readonly sourceClass?: RuntimeCredentialSourceClass;
}): RuntimeValueResolverResult<T> {
  const status = normalizeResolutionStatus(input.status);
  const credentialRef = createCredentialRef(input.credentialRef);
  const secretHandleRef = normalizeOptionalSecretHandleRef(input.secretHandleRef);
  const safeDiagnostics = normalizeOptionalSafeDiagnostics(input.safeDiagnostics);

  if (status === 'resolved') {
    const runtimeValue = normalizeRuntimeOnlyValue(input.runtimeValue);
    const descriptor = normalizeRedactedDescriptor({
      ...(input.redactedCredentialDescriptor === undefined
        ? {}
        : { descriptor: input.redactedCredentialDescriptor }),
      credentialRef,
      credentialStatus: 'configured',
      ...(secretHandleRef === undefined ? {} : { secretHandleRef }),
      ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
      ...(input.credentialKind === undefined ? {} : { credentialKind: input.credentialKind }),
      ...(input.redactedLabel === undefined ? {} : { redactedLabel: input.redactedLabel }),
      ...(input.sourceClass === undefined ? {} : { sourceClass: input.sourceClass }),
    });

    return Object.freeze({
      status,
      credentialRef,
      ...(secretHandleRef === undefined ? {} : { secretHandleRef }),
      credentialStatus: 'configured',
      redactedCredentialDescriptor: descriptor,
      runtimeValue,
      ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
    });
  }

  const credentialStatus = normalizeBlockedCredentialStatus(input.credentialStatus ?? status);
  const blockedReason = normalizeSafeText(input.blockedReason ?? defaultBlockedReason(status), DEFAULT_BLOCKED_REASON);
  const descriptor = normalizeRedactedDescriptor({
    ...(input.redactedCredentialDescriptor === undefined
      ? {}
      : { descriptor: input.redactedCredentialDescriptor }),
    credentialRef,
    credentialStatus,
    ...(secretHandleRef === undefined ? {} : { secretHandleRef }),
    blockedReason,
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
    ...(input.credentialKind === undefined ? {} : { credentialKind: input.credentialKind }),
    ...(input.redactedLabel === undefined ? {} : { redactedLabel: input.redactedLabel }),
    ...(input.sourceClass === undefined ? {} : { sourceClass: input.sourceClass }),
  });

  return Object.freeze({
    status,
    credentialRef,
    ...(secretHandleRef === undefined ? {} : { secretHandleRef }),
    credentialStatus,
    redactedCredentialDescriptor: descriptor,
    blockedReason,
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
  });
}

export function projectRuntimeValueReadiness<T>(
  result: RuntimeValueResolverResult<T>,
): RuntimeValuePublicReadinessProjection {
  const safeDiagnostics = normalizeOptionalSafeDiagnostics(result.safeDiagnostics);
  const redactedCredentialDescriptor = createRedactedRuntimeCredentialDescriptor({
    ...result.redactedCredentialDescriptor,
    credentialRef: result.credentialRef,
    credentialStatus: result.credentialStatus,
    ...(result.secretHandleRef === undefined ? {} : { secretHandleRef: result.secretHandleRef }),
    ...('blockedReason' in result ? { blockedReason: result.blockedReason } : {}),
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
  });

  if (result.status === 'resolved') {
    return Object.freeze({
      readinessStatus: 'ready',
      credentialRef: result.credentialRef,
      ...(result.secretHandleRef === undefined ? {} : { secretHandleRef: result.secretHandleRef }),
      redactedCredentialDescriptor,
      credentialStatus: result.credentialStatus,
      resolutionStatus: result.status,
      ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
    });
  }

  const blockedReason = normalizeSafeText(result.blockedReason, DEFAULT_BLOCKED_REASON);

  return Object.freeze({
    readinessStatus: 'blocked',
    credentialRef: result.credentialRef,
    ...(result.secretHandleRef === undefined ? {} : { secretHandleRef: result.secretHandleRef }),
    redactedCredentialDescriptor,
    credentialStatus: result.credentialStatus,
    resolutionStatus: result.status,
    blockedReason,
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
  });
}

export function isRuntimeValuePublicReadinessProjectionJsonSafe(
  projection: RuntimeValuePublicReadinessProjection,
): boolean {
  try {
    return JSON.stringify(projection) !== undefined;
  } catch {
    return false;
  }
}

function normalizePrefixedRef<TPrefix extends string>(input: string, prefix: TPrefix, label: string): `${TPrefix}${string}` {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim();

  if (
    normalized.length <= prefix.length ||
    normalized.length > MAX_SAFE_REF_LENGTH ||
    !normalized.startsWith(prefix) ||
    !SAFE_REF_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a bounded safe opaque ref with the expected prefix.`);
  }

  return normalized as `${TPrefix}${string}`;
}

function normalizeOptionalSecretHandleRef(
  input: RuntimeSecretHandleRef | string | undefined,
): RuntimeSecretHandleRef | undefined {
  return input === undefined ? undefined : createSecretHandleRef(input);
}

function normalizeResolutionStatus(status: RuntimeValueResolutionStatus): RuntimeValueResolutionStatus {
  switch (status) {
    case 'resolved':
    case 'missing':
    case 'invalid':
    case 'disabled':
    case 'blocked':
      return status;
    default:
      throw new TypeError('Unsupported runtime value resolution status.');
  }
}

function normalizeCredentialStatus(status: RuntimeCredentialStatus): RuntimeCredentialStatus {
  switch (status) {
    case 'configured':
    case 'missing':
    case 'invalid':
    case 'disabled':
    case 'blocked':
      return status;
    default:
      throw new TypeError('Unsupported runtime credential status.');
  }
}

function normalizeBlockedCredentialStatus(status: RuntimeCredentialStatus): RuntimeBlockedCredentialStatus {
  const normalized = normalizeCredentialStatus(status);
  if (normalized === 'configured') {
    throw new TypeError('Blocked runtime credential status must not be configured.');
  }

  return normalized;
}

function normalizeRuntimeOnlyValue<T>(input: RuntimeOnlyValue<T> | T | undefined): RuntimeOnlyValue<T> {
  if (input instanceof RuntimeOnlyValue) {
    return input;
  }

  return createRuntimeOnlyValue(input as T);
}

function normalizeRedactedDescriptor(input: {
  readonly descriptor?: RedactedRuntimeCredentialDescriptor;
  readonly credentialRef: RuntimeCredentialRef;
  readonly credentialStatus: RuntimeCredentialStatus;
  readonly secretHandleRef?: RuntimeSecretHandleRef;
  readonly blockedReason?: string;
  readonly safeDiagnostics?: readonly string[];
  readonly credentialKind?: string;
  readonly redactedLabel?: string;
  readonly sourceClass?: RuntimeCredentialSourceClass;
}): RedactedRuntimeCredentialDescriptor {
  if (input.descriptor === undefined) {
    return createRedactedRuntimeCredentialDescriptor({
      credentialRef: input.credentialRef,
      credentialStatus: input.credentialStatus,
      ...(input.credentialKind === undefined ? {} : { kind: input.credentialKind }),
      ...(input.redactedLabel === undefined ? {} : { redactedLabel: input.redactedLabel }),
      ...(input.sourceClass === undefined ? {} : { sourceClass: input.sourceClass }),
      ...(input.secretHandleRef === undefined ? {} : { secretHandleRef: input.secretHandleRef }),
      ...(input.blockedReason === undefined ? {} : { blockedReason: input.blockedReason }),
      ...(input.safeDiagnostics === undefined ? {} : { safeDiagnostics: input.safeDiagnostics }),
    });
  }

  return createRedactedRuntimeCredentialDescriptor({
    ...input.descriptor,
    credentialRef: input.credentialRef,
    credentialStatus: input.credentialStatus,
    ...(input.secretHandleRef === undefined ? {} : { secretHandleRef: input.secretHandleRef }),
    ...(input.blockedReason === undefined ? {} : { blockedReason: input.blockedReason }),
    ...(input.safeDiagnostics === undefined ? {} : { safeDiagnostics: input.safeDiagnostics }),
  });
}

function normalizeSafeIdentifier(input: string, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_SAFE_TEXT_LENGTH ||
    !SAFE_IDENTIFIER_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a bounded safe identifier.`);
  }

  return normalized;
}

function normalizeSafeText(input: string, fallback: string): string {
  if (typeof input !== 'string') {
    return fallback;
  }

  const normalized = redactUnsafeText(input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim());

  if (normalized.length === 0) {
    return fallback;
  }

  if (normalized.length <= MAX_SAFE_TEXT_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_SAFE_TEXT_LENGTH - 3)}...`;
}

function normalizeOptionalSafeText(input: string | undefined): string | undefined {
  return input === undefined ? undefined : normalizeSafeText(input, DEFAULT_REDACTED_LABEL);
}

function normalizeOptionalSafeDiagnostics(input: readonly string[] | undefined): readonly string[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  const safeDiagnostics = Object.freeze(
    input.slice(0, MAX_SAFE_DIAGNOSTICS).map((entry) => normalizeSafeText(entry, DEFAULT_REDACTED_LABEL)),
  );

  return safeDiagnostics.length === 0 ? undefined : safeDiagnostics;
}

function redactUnsafeText(text: string): string {
  const withoutStackTraces = text.replace(STACK_TRACE_PATTERN, '[redacted]');
  const withoutSensitiveAssignments = SENSITIVE_ASSIGNMENT_PATTERNS.reduce(
    (currentText, pattern) => currentText.replace(pattern, '[redacted]'),
    withoutStackTraces,
  );

  return withoutSensitiveAssignments
    .replace(BEARER_PATTERN, '[redacted]')
    .replace(TELEGRAM_TOKEN_PATTERN, '[redacted]')
    .replace(API_KEY_PATTERN, '[redacted]')
    .replace(URL_PATTERN, '[redacted]')
    .replace(POSIX_PATH_PATTERN, '[redacted]')
    .replace(WINDOWS_PATH_PATTERN, '[redacted]');
}

function defaultBlockedReason(status: RuntimeBlockedResolutionStatus): string {
  switch (status) {
    case 'missing':
      return 'Runtime credential is missing.';
    case 'invalid':
      return 'Runtime credential is invalid.';
    case 'disabled':
      return 'Runtime credential is disabled.';
    case 'blocked':
      return DEFAULT_BLOCKED_REASON;
  }
}
