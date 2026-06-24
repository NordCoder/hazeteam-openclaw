import type { AdapterOperationContext } from '../../contracts/context.js';
import type { AdapterCorrelationRef, AdapterDetailsRef } from '../../contracts/refs.js';
import { parseOpenClawAdapterRef } from '../../contracts/refs.js';
import type { OpenClawTelegramAdapterReadiness } from '../../contracts/readiness.js';
import { createAdapterReadinessCheck, summarizeAdapterReadiness } from '../../contracts/readiness.js';
import type { AdapterOperationResult } from '../../contracts/result.js';
import type {
  OpenClawRuntimeBoundary,
  OpenClawRuntimeBridgeDispatchOutput,
  OpenClawRuntimeDispatchRequest,
} from '../../runtime/runtime-bridge.js';
import { dispatchOpenClawRuntime } from '../../runtime/runtime-bridge.js';

const OPENCLAW_RUNTIME_PORT_COMPONENT = 'openclaw-runtime';
const MAX_PORT_READINESS_MESSAGE_LENGTH = 240;
const DEFAULT_PORT_READINESS_MESSAGE = 'OpenClaw runtime port reported readiness.';
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const POSIX_PATH_PATTERN = /(?:\/[A-Za-z0-9._~-]+){2,}/gu;
const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:\\[^\s]+/gu;

const SENSITIVE_TEXT_TERM_PARTS = [
  ['api', 'key'],
  ['auth', 'orization'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['pass', 'wd'],
  ['sec', 'ret'],
] as const;
const SENSITIVE_TEXT_PATTERNS = SENSITIVE_TEXT_TERM_PARTS.map(
  (parts) => new RegExp(`\\b${parts.join('[-_]?')}\\b\\s*[:=]\\s*\\S+`, 'giu'),
);

const UNSAFE_OPENCLAW_RUNTIME_FIELD_NAMES = new Set([
  'apiclient',
  'apikey',
  'authorization',
  'bottoken',
  'clienthandle',
  'coreresult',
  'credential',
  'deploymenthandle',
  'filesystempath',
  'handler',
  'logstream',
  'openclawclient',
  'password',
  'platformhandle',
  'provider',
  'providerobject',
  'providerresponse',
  'rawcoreresult',
  'rawerror',
  'rawlog',
  'rawopenclawresponse',
  'rawproviderobject',
  'rawproviderresponse',
  'rawruntimepayload',
  'rawtoolpayload',
  'runtimepayload',
  'sdkclient',
  'secret',
  'stack',
  'storagepath',
  'storageroot',
  'toolpayload',
]);
const UNSAFE_OPENCLAW_RUNTIME_FIELD_NAME_PARTS = SENSITIVE_TEXT_TERM_PARTS;

export interface OpenClawRuntimePortReadiness {
  readonly status: 'ready' | 'degraded' | 'not-ready' | 'unknown' | 'pass' | 'warn' | 'fail';
  readonly message?: string | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
}

export interface OpenClawRuntimePort {
  readonly dispatch: (request: OpenClawRuntimeDispatchRequest) => unknown;
  readonly getReadiness: () => unknown;
}

export interface OpenClawRuntimePortBridgeInput {
  readonly runtimePort?: OpenClawRuntimePort | undefined;
  readonly context?: AdapterOperationContext | undefined;
}

export interface OpenClawRuntimePortDispatchInput {
  readonly runtimePort?: OpenClawRuntimePort | undefined;
  readonly request: OpenClawRuntimeDispatchRequest;
  readonly context?: AdapterOperationContext | undefined;
}

export interface OpenClawRuntimePortBridgeReadinessInput {
  readonly runtimePort?: OpenClawRuntimePort | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
}

export interface OpenClawRuntimePortBridge {
  readonly dispatch: (
    request: OpenClawRuntimeDispatchRequest,
    context?: AdapterOperationContext,
  ) => AdapterOperationResult<OpenClawRuntimeBridgeDispatchOutput>;
  readonly getReadiness: () => OpenClawTelegramAdapterReadiness;
}

interface RuntimeReadinessRefs {
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
}

type RuntimePortCheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function assertPlainRecord(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (!isPlainRecord(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isUnsafeOpenClawRuntimeFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_OPENCLAW_RUNTIME_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_OPENCLAW_RUNTIME_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function rejectUnsafeOpenClawRuntimeFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeOpenClawRuntimeFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeOpenClawRuntimeFieldName(fieldName)) {
      throw new TypeError(
        `${label} must not include raw OpenClaw runtime, core, provider, SDK, storage, tool, or sensitive fields.`,
      );
    }
    rejectUnsafeOpenClawRuntimeFields(value, label, seen);
  }
}

function redactSensitiveOpenClawRuntimeText(text: string): string {
  const withoutSensitiveAssignments = SENSITIVE_TEXT_PATTERNS.reduce(
    (currentText, pattern) => currentText.replace(pattern, '[redacted]'),
    text,
  );

  return withoutSensitiveAssignments
    .replace(POSIX_PATH_PATTERN, '[redacted]')
    .replace(WINDOWS_PATH_PATTERN, '[redacted]');
}

function normalizeOpenClawRuntimeMessage(
  input: unknown,
  fallback: string,
  maxLength = MAX_PORT_READINESS_MESSAGE_LENGTH,
): string {
  if (typeof input !== 'string') {
    return fallback;
  }

  const normalized = redactSensitiveOpenClawRuntimeText(
    input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim(),
  );

  if (normalized.length === 0) {
    return fallback;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

function normalizeAdapterRef<T extends string>(input: unknown, kind: string, label: string): T {
  const parsed = parseOpenClawAdapterRef(input);

  if (parsed?.kind !== kind) {
    throw new TypeError(`${label} must be a safe adapter ref.`);
  }

  return parsed.ref as T;
}

function normalizeOptionalAdapterRef<T extends string>(
  input: unknown,
  kind: string,
  label: string,
): T | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeAdapterRef<T>(input, kind, label);
}

function preferDefined(primary: unknown, fallback: unknown): unknown {
  return primary === undefined ? fallback : primary;
}

function normalizeReadinessRefs(input: RuntimeReadinessRefs): RuntimeReadinessRefs {
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'OpenClaw runtime readiness detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'OpenClaw runtime readiness correlationRef',
  );

  return Object.freeze({
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function createOpenClawRuntimePortReadiness(input: {
  readonly status: RuntimePortCheckStatus;
  readonly message: string;
  readonly refs?: RuntimeReadinessRefs | undefined;
}): OpenClawTelegramAdapterReadiness {
  const refs = input.refs ?? {};

  return summarizeAdapterReadiness({
    checks: [
      createAdapterReadinessCheck({
        component: OPENCLAW_RUNTIME_PORT_COMPONENT,
        status: input.status,
        message: input.message,
        ...(refs.detailsRef === undefined ? {} : { detailsRef: refs.detailsRef }),
        ...(refs.correlationRef === undefined ? {} : { correlationRef: refs.correlationRef }),
      }),
    ],
    ...(refs.detailsRef === undefined ? {} : { detailsRef: refs.detailsRef }),
    ...(refs.correlationRef === undefined ? {} : { correlationRef: refs.correlationRef }),
  });
}

function readinessCheckStatusFromPortStatus(status: unknown): RuntimePortCheckStatus {
  switch (status) {
    case 'ready':
    case 'pass':
      return 'pass';
    case 'degraded':
    case 'warn':
      return 'warn';
    case 'not-ready':
    case 'fail':
      return 'fail';
    case 'unknown':
      return 'unknown';
    default:
      return 'unknown';
  }
}

function normalizeOpenClawRuntimePortReadinessResult(
  result: unknown,
  fallbackRefs: RuntimeReadinessRefs,
): OpenClawTelegramAdapterReadiness {
  assertPlainRecord(result, 'OpenClaw runtime port readiness result');
  rejectUnsafeOpenClawRuntimeFields(result, 'OpenClaw runtime port readiness result');

  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    preferDefined(result.detailsRef, fallbackRefs.detailsRef),
    'details',
    'OpenClaw runtime port readiness detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    preferDefined(result.correlationRef, fallbackRefs.correlationRef),
    'correlation',
    'OpenClaw runtime port readiness correlationRef',
  );

  return createOpenClawRuntimePortReadiness({
    status: readinessCheckStatusFromPortStatus(result.status),
    message: normalizeOpenClawRuntimeMessage(result.message, DEFAULT_PORT_READINESS_MESSAGE),
    refs: Object.freeze({
      ...(detailsRef === undefined ? {} : { detailsRef }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    }),
  });
}

function createOpenClawRuntimeBoundary(runtimePort: unknown): OpenClawRuntimeBoundary | undefined {
  if (!isPlainRecord(runtimePort) || typeof runtimePort.dispatch !== 'function') {
    return undefined;
  }

  const dispatch = runtimePort.dispatch as (request: OpenClawRuntimeDispatchRequest) => unknown;
  const getReadiness = runtimePort.getReadiness;

  return Object.freeze({
    dispatch(request: OpenClawRuntimeDispatchRequest): unknown {
      rejectUnsafeOpenClawRuntimeFields(request, 'OpenClaw runtime port dispatch request');
      const result = dispatch(request);
      rejectUnsafeOpenClawRuntimeFields(result, 'OpenClaw runtime port dispatch result');
      return result;
    },
    ...(typeof getReadiness === 'function'
      ? {
          getReadiness(): unknown {
            const readiness = (getReadiness as () => unknown)();
            rejectUnsafeOpenClawRuntimeFields(readiness, 'OpenClaw runtime port readiness result');
            return readiness;
          },
        }
      : {}),
  });
}

export function dispatchOpenClawRuntimePort(
  input: OpenClawRuntimePortDispatchInput,
): AdapterOperationResult<OpenClawRuntimeBridgeDispatchOutput> {
  return dispatchOpenClawRuntime({
    runtime: createOpenClawRuntimeBoundary(input.runtimePort),
    request: input.request,
    context: input.context,
  });
}

export function summarizeOpenClawRuntimePortReadiness(
  input: OpenClawRuntimePortBridgeReadinessInput = {},
): OpenClawTelegramAdapterReadiness {
  let refs: RuntimeReadinessRefs;
  try {
    refs = normalizeReadinessRefs(input);
  } catch {
    return createOpenClawRuntimePortReadiness({
      status: 'fail',
      message: 'OpenClaw runtime port readiness refs are invalid.',
    });
  }

  if (!isPlainRecord(input.runtimePort)) {
    return createOpenClawRuntimePortReadiness({
      status: 'fail',
      message: 'OpenClaw runtime port is not configured.',
      refs,
    });
  }

  if (typeof input.runtimePort.dispatch !== 'function') {
    return createOpenClawRuntimePortReadiness({
      status: 'fail',
      message: 'OpenClaw runtime port dispatch method is not configured.',
      refs,
    });
  }

  if (typeof input.runtimePort.getReadiness !== 'function') {
    return createOpenClawRuntimePortReadiness({
      status: 'fail',
      message: 'OpenClaw runtime port readiness method is not configured.',
      refs,
    });
  }

  try {
    return normalizeOpenClawRuntimePortReadinessResult(input.runtimePort.getReadiness(), refs);
  } catch {
    return createOpenClawRuntimePortReadiness({
      status: 'fail',
      message: 'OpenClaw runtime port readiness failed safely.',
      refs,
    });
  }
}

export function createOpenClawRuntimePortBridge(
  input: OpenClawRuntimePortBridgeInput = {},
): OpenClawRuntimePortBridge {
  return Object.freeze({
    dispatch(
      request: OpenClawRuntimeDispatchRequest,
      context?: AdapterOperationContext,
    ): AdapterOperationResult<OpenClawRuntimeBridgeDispatchOutput> {
      return dispatchOpenClawRuntimePort({
        runtimePort: input.runtimePort,
        request,
        context: context ?? input.context,
      });
    },

    getReadiness(): OpenClawTelegramAdapterReadiness {
      return summarizeOpenClawRuntimePortReadiness({ runtimePort: input.runtimePort });
    },
  });
}
