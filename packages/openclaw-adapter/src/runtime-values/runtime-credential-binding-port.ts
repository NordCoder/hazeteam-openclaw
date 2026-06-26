import {
  RuntimeOnlyValue,
  createCredentialRef,
  createRedactedRuntimeCredentialDescriptor,
  createSecretHandleRef,
  type RedactedRuntimeCredentialDescriptor,
  type RuntimeCredentialRef,
  type RuntimeCredentialSourceClass,
  type RuntimeSecretHandleRef,
} from './runtime-value-boundary.js';

const DEFAULT_PROVIDER_KIND = 'runtime-provider';
const DEFAULT_BINDING_PURPOSE = 'runtime-credential-binding';
const DEFAULT_REDACTED_LABEL = 'redacted';
const DEFAULT_BINDING_SOURCE_CLASS = 'injected-port';
const DEFAULT_CORRELATION_REF = 'correlation:runtime-binding';
const MAX_SAFE_TEXT_LENGTH = 240;
const MAX_SAFE_DIAGNOSTICS = 10;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const SAFE_CORRELATION_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
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
  /\btoken\s*[:=]\s*\S+/giu,
  /\b(?:raw|provider|runtime)[-_]?payload\s*[:=]\s*\S+/giu,
  /\bendpoint\s*[:=]\s*\S+/giu,
  /\bfile[-_]?path\s*[:=]\s*\S+/giu,
  /\bpath\s*[:=]\s*\S+/giu,
  /\bstack(?:trace)?\s*[:=]\s*\S+/giu,
  /\b(?:providerHandle|clientHandle|sdkClient|sdkHandle|client|processId)\s*[:=]\s*\S+/gu,
] as const;

export type RuntimeCredentialBindingStatus =
  | 'bound-runtime-only'
  | 'blocked-missing-ref'
  | 'blocked-missing-port'
  | 'blocked-unsafe-ref'
  | 'blocked-disabled'
  | 'failed-safe'
  | 'redacted-only';

export type RuntimeCredentialBindingIssueCode = RuntimeCredentialBindingStatus | 'malformed-port-result';
export type RuntimeCredentialBindingIssueSeverity = 'info' | 'blocked' | 'failed-safe';

export type RuntimeCredentialBindingSourceClass =
  | 'injected-port'
  | 'operator-gated'
  | 'redacted-only'
  | 'missing-port'
  | 'test-fixture'
  | 'unknown'
  | (string & {});

export interface RuntimeCredentialBindingIssue {
  readonly bindingIssue: RuntimeCredentialBindingIssueCode;
  readonly severity: RuntimeCredentialBindingIssueSeverity;
  readonly message: string;
  readonly safeDiagnostics?: readonly string[];
}

export interface RuntimeCredentialBindingSecretHandle {
  readonly secretHandleRef: RuntimeSecretHandleRef;
  readonly redactedDescriptor: 'secret-handle-ref';
}

export interface RuntimeCredentialBindingOperatorGatedContext {
  readonly operatorAcknowledged?: boolean;
  readonly bindingEnabled?: boolean;
  readonly contextRef?: string;
  readonly safeReason?: string;
}

export interface RuntimeCredentialBindingRequest {
  readonly credentialRef?: RuntimeCredentialRef | string | null;
  readonly requestedProviderKind?: string;
  readonly bindingPurpose?: string;
  readonly operatorGate?: RuntimeCredentialBindingOperatorGatedContext;
  readonly correlationRef?: string;
  readonly bindingSourceClass?: RuntimeCredentialBindingSourceClass;
  readonly redactedLabel?: string;
  readonly secretHandleRef?: RuntimeSecretHandleRef | string;
  readonly disabled?: boolean;
  readonly safeDiagnostics?: readonly string[];
}

export interface NormalizedRuntimeCredentialBindingRequest {
  readonly credentialRef: RuntimeCredentialRef;
  readonly requestedProviderKind: string;
  readonly bindingPurpose: string;
  readonly operatorGate?: RuntimeCredentialBindingOperatorGatedContext;
  readonly correlationRef: string;
  readonly bindingSourceClass: RuntimeCredentialBindingSourceClass;
  readonly redactedLabel: string;
  readonly secretHandle?: RuntimeCredentialBindingSecretHandle;
  readonly redactedDescriptor: RedactedRuntimeCredentialDescriptor;
  readonly safeDiagnostics?: readonly string[];
}

export interface BoundRuntimeCredentialBindingPortResult<T = unknown> {
  readonly bindingStatus: 'bound-runtime-only';
  readonly credentialRef?: RuntimeCredentialRef | string;
  readonly secretHandleRef?: RuntimeSecretHandleRef | string;
  readonly runtimeOnlyValue: RuntimeOnlyValue<T>;
  readonly redactedDescriptor?: RedactedRuntimeCredentialDescriptor;
  readonly bindingSourceClass?: RuntimeCredentialBindingSourceClass;
  readonly safeDiagnostics?: readonly string[];
}

export interface NonBoundRuntimeCredentialBindingPortResult {
  readonly bindingStatus: Exclude<RuntimeCredentialBindingStatus, 'bound-runtime-only'>;
  readonly credentialRef?: RuntimeCredentialRef | string;
  readonly secretHandleRef?: RuntimeSecretHandleRef | string;
  readonly redactedDescriptor?: RedactedRuntimeCredentialDescriptor;
  readonly bindingIssue?: RuntimeCredentialBindingIssue;
  readonly bindingSourceClass?: RuntimeCredentialBindingSourceClass;
  readonly safeDiagnostics?: readonly string[];
}

export type RuntimeCredentialBindingPortResult<T = unknown> =
  | BoundRuntimeCredentialBindingPortResult<T>
  | NonBoundRuntimeCredentialBindingPortResult;

export interface RuntimeCredentialBindingPort<T = unknown> {
  readonly bindRuntimeCredential: (
    request: NormalizedRuntimeCredentialBindingRequest,
  ) => RuntimeCredentialBindingPortResult<T> | Promise<RuntimeCredentialBindingPortResult<T>>;
}

interface RuntimeCredentialBindingResultBase {
  readonly bindingStatus: RuntimeCredentialBindingStatus;
  readonly credentialRef?: RuntimeCredentialRef;
  readonly secretHandle?: RuntimeCredentialBindingSecretHandle;
  readonly redactedDescriptor?: RedactedRuntimeCredentialDescriptor;
  readonly bindingIssue: RuntimeCredentialBindingIssue;
  readonly bindingSourceClass: RuntimeCredentialBindingSourceClass;
  readonly requestedProviderKind: string;
  readonly bindingPurpose: string;
  readonly correlationRef: string;
  readonly safeDiagnostics?: readonly string[];
}

export interface BoundRuntimeCredentialBindingResult<T = unknown> extends RuntimeCredentialBindingResultBase {
  readonly bindingStatus: 'bound-runtime-only';
  readonly credentialRef: RuntimeCredentialRef;
  readonly redactedDescriptor: RedactedRuntimeCredentialDescriptor;
  readonly runtimeOnlyValue: RuntimeOnlyValue<T>;
}

export interface NonBoundRuntimeCredentialBindingResult extends RuntimeCredentialBindingResultBase {
  readonly bindingStatus: Exclude<RuntimeCredentialBindingStatus, 'bound-runtime-only'>;
}

export type RuntimeCredentialBindingResult<T = unknown> =
  | BoundRuntimeCredentialBindingResult<T>
  | NonBoundRuntimeCredentialBindingResult;

export interface RuntimeCredentialBindingPublicProjection {
  readonly bindingStatus: RuntimeCredentialBindingStatus;
  readonly credentialRef?: RuntimeCredentialRef;
  readonly secretHandle?: RuntimeCredentialBindingSecretHandle;
  readonly redactedDescriptor?: RedactedRuntimeCredentialDescriptor;
  readonly bindingIssue: RuntimeCredentialBindingIssue;
  readonly bindingSourceClass: RuntimeCredentialBindingSourceClass;
  readonly requestedProviderKind: string;
  readonly bindingPurpose: string;
  readonly correlationRef: string;
  readonly safeDiagnostics?: readonly string[];
}

const BINDING_STATUSES: ReadonlySet<string> = new Set([
  'bound-runtime-only',
  'blocked-missing-ref',
  'blocked-missing-port',
  'blocked-unsafe-ref',
  'blocked-disabled',
  'failed-safe',
  'redacted-only',
]);

export function createRuntimeCredentialBindingDescriptor(
  request: RuntimeCredentialBindingRequest,
): RedactedRuntimeCredentialDescriptor {
  const normalized = normalizeRuntimeCredentialBindingRequest(request);

  if (!normalized.ok) {
    throw new TypeError('Runtime credential binding descriptor requires a safe credential ref.');
  }

  return normalized.request.redactedDescriptor;
}

export async function bindRuntimeCredentialWithPort<T = unknown>(input: {
  readonly request: RuntimeCredentialBindingRequest;
  readonly port?: RuntimeCredentialBindingPort<T>;
}): Promise<RuntimeCredentialBindingResult<T>> {
  const normalized = normalizeRuntimeCredentialBindingRequest(input.request);

  if (!normalized.ok) {
    return normalized.result;
  }

  if (isBindingDisabled(input.request)) {
    return createBlockedBindingResult({
      status: 'blocked-disabled',
      request: normalized.request,
      issueMessage: 'Runtime credential binding is disabled by the operator-gated context.',
      severity: 'blocked',
    });
  }

  if (input.port === undefined) {
    return createBlockedBindingResult({
      status: 'blocked-missing-port',
      request: normalized.request,
      issueMessage: 'Runtime credential binding requires an injected port.',
      severity: 'blocked',
      bindingSourceClass: 'missing-port',
    });
  }

  try {
    const portResult = await input.port.bindRuntimeCredential(normalized.request);
    return normalizeRuntimeCredentialBindingResult(portResult, normalized.request);
  } catch {
    return createBlockedBindingResult({
      status: 'failed-safe',
      request: normalized.request,
      issueMessage: 'Runtime credential binding failed safely.',
      severity: 'failed-safe',
    });
  }
}

export function normalizeRuntimeCredentialBindingResult<T = unknown>(
  input: RuntimeCredentialBindingPortResult<T> | unknown,
  request: NormalizedRuntimeCredentialBindingRequest,
): RuntimeCredentialBindingResult<T> {
  if (!isRecord(input) || !isBindingStatus(input.bindingStatus)) {
    return createBlockedBindingResult({
      status: 'failed-safe',
      request,
      issueMessage: 'Runtime credential binding port returned a malformed result.',
      issueCode: 'malformed-port-result',
      severity: 'failed-safe',
    });
  }

  const credentialRef = normalizeOptionalReturnedCredentialRef(input.credentialRef, request.credentialRef);
  if (credentialRef === 'unsafe') {
    return createBlockedBindingResult({
      status: 'failed-safe',
      request,
      issueMessage: 'Runtime credential binding port returned an unsafe credential ref.',
      severity: 'failed-safe',
    });
  }

  const secretHandle = normalizeResultSecretHandle(input.secretHandleRef, request.secretHandle);
  if (secretHandle === 'unsafe') {
    return createBlockedBindingResult({
      status: 'failed-safe',
      request,
      issueMessage: 'Runtime credential binding port returned an unsafe secret handle ref.',
      severity: 'failed-safe',
    });
  }

  const bindingSourceClass = normalizeBindingSourceClass(
    typeof input.bindingSourceClass === 'string' ? input.bindingSourceClass : request.bindingSourceClass,
  );
  const safeDiagnostics = normalizeMergedDiagnostics(request.safeDiagnostics, input.safeDiagnostics);
  const redactedDescriptor = normalizeResultRedactedDescriptor({
    maybeDescriptor: input.redactedDescriptor,
    request,
    credentialRef,
    secretHandle,
    bindingStatus: input.bindingStatus,
    safeDiagnostics,
  });

  if (redactedDescriptor === 'unsafe') {
    return createBlockedBindingResult({
      status: 'failed-safe',
      request,
      issueMessage: 'Runtime credential binding port returned an unsafe redacted descriptor.',
      severity: 'failed-safe',
    });
  }

  if (input.bindingStatus === 'bound-runtime-only') {
    if (!(input.runtimeOnlyValue instanceof RuntimeOnlyValue)) {
      return createBlockedBindingResult({
        status: 'failed-safe',
        request,
        issueMessage: 'Runtime credential binding port did not return a runtime-only value.',
        issueCode: 'malformed-port-result',
        severity: 'failed-safe',
      });
    }

    return Object.freeze({
      bindingStatus: 'bound-runtime-only',
      credentialRef,
      ...(secretHandle === undefined ? {} : { secretHandle }),
      redactedDescriptor,
      bindingIssue: createBindingIssue({
        status: 'bound-runtime-only',
        message: 'Runtime credential was bound to a runtime-only value.',
        severity: 'info',
        safeDiagnostics,
      }),
      bindingSourceClass,
      requestedProviderKind: request.requestedProviderKind,
      bindingPurpose: request.bindingPurpose,
      correlationRef: request.correlationRef,
      runtimeOnlyValue: input.runtimeOnlyValue,
      ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
    });
  }

  return Object.freeze({
    bindingStatus: input.bindingStatus,
    credentialRef,
    ...(secretHandle === undefined ? {} : { secretHandle }),
    redactedDescriptor,
    bindingIssue: normalizePortBindingIssue(input.bindingIssue, input.bindingStatus, safeDiagnostics),
    bindingSourceClass,
    requestedProviderKind: request.requestedProviderKind,
    bindingPurpose: request.bindingPurpose,
    correlationRef: request.correlationRef,
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
  });
}

export function projectRuntimeCredentialBindingPublic<T>(
  result: RuntimeCredentialBindingResult<T>,
): RuntimeCredentialBindingPublicProjection {
  return Object.freeze({
    bindingStatus: result.bindingStatus,
    ...('credentialRef' in result ? { credentialRef: result.credentialRef } : {}),
    ...('secretHandle' in result ? { secretHandle: result.secretHandle } : {}),
    ...('redactedDescriptor' in result ? { redactedDescriptor: result.redactedDescriptor } : {}),
    bindingIssue: result.bindingIssue,
    bindingSourceClass: result.bindingSourceClass,
    requestedProviderKind: result.requestedProviderKind,
    bindingPurpose: result.bindingPurpose,
    correlationRef: result.correlationRef,
    ...(result.safeDiagnostics === undefined ? {} : { safeDiagnostics: result.safeDiagnostics }),
  });
}

export function isRuntimeCredentialBindingPublicProjectionJsonSafe(
  projection: RuntimeCredentialBindingPublicProjection,
): boolean {
  try {
    return JSON.stringify(projection) !== undefined;
  } catch {
    return false;
  }
}

type RequestNormalizationResult =
  | { readonly ok: true; readonly request: NormalizedRuntimeCredentialBindingRequest }
  | { readonly ok: false; readonly result: NonBoundRuntimeCredentialBindingResult };

function normalizeRuntimeCredentialBindingRequest(request: RuntimeCredentialBindingRequest): RequestNormalizationResult {
  const requestedProviderKind = normalizeSafeIdentifier(request.requestedProviderKind ?? DEFAULT_PROVIDER_KIND, DEFAULT_PROVIDER_KIND);
  const bindingPurpose = normalizeSafeIdentifier(request.bindingPurpose ?? DEFAULT_BINDING_PURPOSE, DEFAULT_BINDING_PURPOSE);
  const correlationRef = normalizeCorrelationRef(request.correlationRef ?? DEFAULT_CORRELATION_REF);
  const bindingSourceClass = normalizeBindingSourceClass(request.bindingSourceClass ?? DEFAULT_BINDING_SOURCE_CLASS);
  const redactedLabel = normalizeSafeText(request.redactedLabel ?? DEFAULT_REDACTED_LABEL, DEFAULT_REDACTED_LABEL);
  const safeDiagnostics = normalizeOptionalSafeDiagnostics(request.safeDiagnostics);

  if (request.credentialRef === undefined || request.credentialRef === null || String(request.credentialRef).trim().length === 0) {
    return {
      ok: false,
      result: createBlockedBindingResult({
        status: 'blocked-missing-ref',
        requestedProviderKind,
        bindingPurpose,
        correlationRef,
        bindingSourceClass,
        issueMessage: 'Runtime credential binding requires a credential ref.',
        severity: 'blocked',
        ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
      }),
    };
  }

  let credentialRef: RuntimeCredentialRef;
  try {
    credentialRef = createCredentialRef(String(request.credentialRef));
  } catch {
    return {
      ok: false,
      result: createBlockedBindingResult({
        status: 'blocked-unsafe-ref',
        requestedProviderKind,
        bindingPurpose,
        correlationRef,
        bindingSourceClass,
        issueMessage: 'Runtime credential binding received an unsafe credential ref.',
        severity: 'blocked',
        ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
      }),
    };
  }

  const secretHandle = normalizeRequestSecretHandle(request.secretHandleRef);
  if (secretHandle === 'unsafe') {
    return {
      ok: false,
      result: createBlockedBindingResult({
        status: 'blocked-unsafe-ref',
        requestedProviderKind,
        bindingPurpose,
        correlationRef,
        bindingSourceClass,
        issueMessage: 'Runtime credential binding received an unsafe secret handle ref.',
        severity: 'blocked',
        ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
      }),
    };
  }

  const operatorGate = normalizeOperatorGate(request.operatorGate);
  const redactedDescriptor = createRedactedRuntimeCredentialDescriptor({
    credentialRef,
    credentialStatus: 'configured',
    kind: requestedProviderKind,
    redactedLabel,
    sourceClass: bindingSourceClass as RuntimeCredentialSourceClass,
    ...(secretHandle === undefined ? {} : { secretHandleRef: secretHandle.secretHandleRef }),
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
  });

  return {
    ok: true,
    request: Object.freeze({
      credentialRef,
      requestedProviderKind,
      bindingPurpose,
      ...(operatorGate === undefined ? {} : { operatorGate }),
      correlationRef,
      bindingSourceClass,
      redactedLabel,
      ...(secretHandle === undefined ? {} : { secretHandle }),
      redactedDescriptor,
      ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
    }),
  };
}

function createBlockedBindingResult(input: {
  readonly status: Exclude<RuntimeCredentialBindingStatus, 'bound-runtime-only'>;
  readonly request?: NormalizedRuntimeCredentialBindingRequest;
  readonly requestedProviderKind?: string;
  readonly bindingPurpose?: string;
  readonly correlationRef?: string;
  readonly bindingSourceClass?: RuntimeCredentialBindingSourceClass;
  readonly issueCode?: RuntimeCredentialBindingIssueCode;
  readonly issueMessage: string;
  readonly severity: RuntimeCredentialBindingIssueSeverity;
  readonly safeDiagnostics?: readonly string[];
}): NonBoundRuntimeCredentialBindingResult {
  const safeDiagnostics = normalizeOptionalSafeDiagnostics(input.safeDiagnostics ?? input.request?.safeDiagnostics);
  const requestedProviderKind = input.request?.requestedProviderKind ?? input.requestedProviderKind ?? DEFAULT_PROVIDER_KIND;
  const bindingPurpose = input.request?.bindingPurpose ?? input.bindingPurpose ?? DEFAULT_BINDING_PURPOSE;
  const correlationRef = input.request?.correlationRef ?? input.correlationRef ?? DEFAULT_CORRELATION_REF;
  const bindingSourceClass = normalizeBindingSourceClass(
    input.bindingSourceClass ?? input.request?.bindingSourceClass ?? DEFAULT_BINDING_SOURCE_CLASS,
  );

  return Object.freeze({
    bindingStatus: input.status,
    ...(input.request === undefined ? {} : { credentialRef: input.request.credentialRef }),
    ...(input.request?.secretHandle === undefined ? {} : { secretHandle: input.request.secretHandle }),
    ...(input.request?.redactedDescriptor === undefined ? {} : { redactedDescriptor: createStatusDescriptor(input.request, input.status, safeDiagnostics) }),
    bindingIssue: createBindingIssue({
      status: input.issueCode ?? input.status,
      message: input.issueMessage,
      severity: input.severity,
      safeDiagnostics,
    }),
    bindingSourceClass,
    requestedProviderKind,
    bindingPurpose,
    correlationRef,
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
  });
}

function createStatusDescriptor(
  request: NormalizedRuntimeCredentialBindingRequest,
  status: RuntimeCredentialBindingStatus,
  safeDiagnostics: readonly string[] | undefined,
): RedactedRuntimeCredentialDescriptor {
  return createRedactedRuntimeCredentialDescriptor({
    ...request.redactedDescriptor,
    credentialRef: request.credentialRef,
    credentialStatus: credentialStatusForBindingStatus(status),
    redactedLabel: request.redactedLabel,
    sourceClass: request.bindingSourceClass as RuntimeCredentialSourceClass,
    ...(request.secretHandle === undefined ? {} : { secretHandleRef: request.secretHandle.secretHandleRef }),
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
  });
}

function normalizeResultRedactedDescriptor(input: {
  readonly maybeDescriptor: unknown;
  readonly request: NormalizedRuntimeCredentialBindingRequest;
  readonly credentialRef: RuntimeCredentialRef;
  readonly secretHandle: RuntimeCredentialBindingSecretHandle | undefined;
  readonly bindingStatus: RuntimeCredentialBindingStatus;
  readonly safeDiagnostics: readonly string[] | undefined;
}): RedactedRuntimeCredentialDescriptor | 'unsafe' {
  try {
    return createRedactedRuntimeCredentialDescriptor({
      ...(isRecord(input.maybeDescriptor) ? input.maybeDescriptor : input.request.redactedDescriptor),
      credentialRef: input.credentialRef,
      credentialStatus: credentialStatusForBindingStatus(input.bindingStatus),
      ...(input.secretHandle === undefined ? {} : { secretHandleRef: input.secretHandle.secretHandleRef }),
      ...(input.safeDiagnostics === undefined ? {} : { safeDiagnostics: input.safeDiagnostics }),
    });
  } catch {
    return 'unsafe';
  }
}

function normalizeOptionalReturnedCredentialRef(
  input: unknown,
  expectedCredentialRef: RuntimeCredentialRef,
): RuntimeCredentialRef | 'unsafe' {
  if (input === undefined) {
    return expectedCredentialRef;
  }

  try {
    const credentialRef = createCredentialRef(String(input));
    return credentialRef === expectedCredentialRef ? credentialRef : 'unsafe';
  } catch {
    return 'unsafe';
  }
}

function normalizeRequestSecretHandle(
  input: RuntimeSecretHandleRef | string | undefined,
): RuntimeCredentialBindingSecretHandle | 'unsafe' | undefined {
  if (input === undefined) {
    return undefined;
  }

  try {
    return Object.freeze({
      secretHandleRef: createSecretHandleRef(String(input)),
      redactedDescriptor: 'secret-handle-ref' as const,
    });
  } catch {
    return 'unsafe';
  }
}

function normalizeResultSecretHandle(
  input: unknown,
  fallback: RuntimeCredentialBindingSecretHandle | undefined,
): RuntimeCredentialBindingSecretHandle | 'unsafe' | undefined {
  if (input === undefined) {
    return fallback;
  }

  if (typeof input !== 'string') {
    return 'unsafe';
  }

  return normalizeRequestSecretHandle(input);
}

function normalizePortBindingIssue(
  input: unknown,
  status: Exclude<RuntimeCredentialBindingStatus, 'bound-runtime-only'>,
  safeDiagnostics: readonly string[] | undefined,
): RuntimeCredentialBindingIssue {
  if (isRecord(input) && isBindingIssueCode(input.bindingIssue)) {
    return createBindingIssue({
      status: input.bindingIssue,
      message: typeof input.message === 'string' ? input.message : defaultIssueMessage(status),
      severity: normalizeIssueSeverity(input.severity, defaultIssueSeverity(status)),
      safeDiagnostics: normalizeMergedDiagnostics(safeDiagnostics, input.safeDiagnostics),
    });
  }

  return createBindingIssue({
    status,
    message: defaultIssueMessage(status),
    severity: defaultIssueSeverity(status),
    safeDiagnostics,
  });
}

function createBindingIssue(input: {
  readonly status: RuntimeCredentialBindingIssueCode;
  readonly message: string;
  readonly severity: RuntimeCredentialBindingIssueSeverity;
  readonly safeDiagnostics: readonly string[] | undefined;
}): RuntimeCredentialBindingIssue {
  const safeDiagnostics = normalizeOptionalSafeDiagnostics(input.safeDiagnostics);

  return Object.freeze({
    bindingIssue: input.status,
    severity: input.severity,
    message: normalizeSafeText(input.message, defaultIssueMessage(input.status)),
    ...(safeDiagnostics === undefined ? {} : { safeDiagnostics }),
  });
}

function normalizeOperatorGate(
  input: RuntimeCredentialBindingOperatorGatedContext | undefined,
): RuntimeCredentialBindingOperatorGatedContext | undefined {
  if (input === undefined) {
    return undefined;
  }

  return Object.freeze({
    ...(input.operatorAcknowledged === undefined ? {} : { operatorAcknowledged: input.operatorAcknowledged === true }),
    ...(input.bindingEnabled === undefined ? {} : { bindingEnabled: input.bindingEnabled === true }),
    ...(input.contextRef === undefined ? {} : { contextRef: normalizeCorrelationRef(input.contextRef) }),
    ...(input.safeReason === undefined ? {} : { safeReason: normalizeSafeText(input.safeReason, DEFAULT_REDACTED_LABEL) }),
  });
}

function isBindingDisabled(request: RuntimeCredentialBindingRequest): boolean {
  return request.disabled === true || request.operatorGate?.bindingEnabled === false || request.operatorGate?.operatorAcknowledged === false;
}

function isBindingStatus(input: unknown): input is RuntimeCredentialBindingStatus {
  return typeof input === 'string' && BINDING_STATUSES.has(input);
}

function isBindingIssueCode(input: unknown): input is RuntimeCredentialBindingIssueCode {
  return isBindingStatus(input) || input === 'malformed-port-result';
}

function normalizeIssueSeverity(
  input: unknown,
  fallback: RuntimeCredentialBindingIssueSeverity,
): RuntimeCredentialBindingIssueSeverity {
  return input === 'info' || input === 'blocked' || input === 'failed-safe' ? input : fallback;
}

function defaultIssueSeverity(status: RuntimeCredentialBindingStatus): RuntimeCredentialBindingIssueSeverity {
  if (status === 'bound-runtime-only' || status === 'redacted-only') {
    return 'info';
  }

  return status === 'failed-safe' ? 'failed-safe' : 'blocked';
}

function defaultIssueMessage(status: RuntimeCredentialBindingIssueCode): string {
  switch (status) {
    case 'bound-runtime-only':
      return 'Runtime credential was bound to a runtime-only value.';
    case 'blocked-missing-ref':
      return 'Runtime credential binding requires a credential ref.';
    case 'blocked-missing-port':
      return 'Runtime credential binding requires an injected port.';
    case 'blocked-unsafe-ref':
      return 'Runtime credential binding received an unsafe ref.';
    case 'blocked-disabled':
      return 'Runtime credential binding is disabled.';
    case 'failed-safe':
    case 'malformed-port-result':
      return 'Runtime credential binding failed safely.';
    case 'redacted-only':
      return 'Runtime credential binding returned redacted descriptor only.';
  }
}

function credentialStatusForBindingStatus(status: RuntimeCredentialBindingStatus): 'configured' | 'missing' | 'invalid' | 'disabled' | 'blocked' {
  switch (status) {
    case 'bound-runtime-only':
    case 'redacted-only':
      return 'configured';
    case 'blocked-missing-ref':
    case 'blocked-missing-port':
      return 'missing';
    case 'blocked-unsafe-ref':
    case 'failed-safe':
      return 'invalid';
    case 'blocked-disabled':
      return 'disabled';
  }
}

function normalizeBindingSourceClass(input: string): RuntimeCredentialBindingSourceClass {
  return normalizeSafeIdentifier(input, DEFAULT_BINDING_SOURCE_CLASS) as RuntimeCredentialBindingSourceClass;
}

function normalizeSafeIdentifier(input: string, fallback: string): string {
  if (typeof input !== 'string') {
    return fallback;
  }

  const normalized = input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim();

  if (normalized.length === 0 || normalized.length > MAX_SAFE_TEXT_LENGTH || !SAFE_IDENTIFIER_PATTERN.test(normalized)) {
    return fallback;
  }

  return normalized;
}

function normalizeCorrelationRef(input: string): string {
  const normalized = normalizeSafeText(input, DEFAULT_CORRELATION_REF);
  if (normalized.length === 0 || normalized.length > MAX_SAFE_TEXT_LENGTH || !SAFE_CORRELATION_REF_PATTERN.test(normalized)) {
    return DEFAULT_CORRELATION_REF;
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

function normalizeOptionalSafeDiagnostics(input: readonly string[] | undefined): readonly string[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  const safeDiagnostics = Object.freeze(
    input.slice(0, MAX_SAFE_DIAGNOSTICS).map((entry) => normalizeSafeText(entry, DEFAULT_REDACTED_LABEL)),
  );

  return safeDiagnostics.length === 0 ? undefined : safeDiagnostics;
}

function normalizeMergedDiagnostics(
  first: readonly string[] | undefined,
  second: unknown,
): readonly string[] | undefined {
  const secondDiagnostics = Array.isArray(second) ? second.filter((entry): entry is string => typeof entry === 'string') : undefined;
  const merged = [...(first ?? []), ...(secondDiagnostics ?? [])];

  return merged.length === 0 ? undefined : normalizeOptionalSafeDiagnostics(merged);
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

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
