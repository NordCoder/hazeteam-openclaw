import type { AdapterOperationContext } from '../contracts/context.js';
import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AdapterRawDebugRef,
  AgentRef,
  WorkspaceRef,
} from '../contracts/refs.js';
import type { AdapterOperationResult, AdapterSafeErrorCode } from '../contracts/result.js';
import type { OpenClawTelegramAdapterReadiness } from '../contracts/readiness.js';
import { parseOpenClawAdapterRef } from '../contracts/refs.js';
import { adapterErr, adapterOk, createAdapterSafeError } from '../contracts/result.js';
import { createAdapterReadinessCheck, summarizeAdapterReadiness } from '../contracts/readiness.js';

const RUNTIME_OUTPUT_REF_PREFIX = 'runtime-output:' as const;
const MAX_RUNTIME_KIND_LENGTH = 80;
const MAX_RUNTIME_TEXT_LENGTH = 1_000;
const MAX_RUNTIME_REF_LENGTH = 256;
const MAX_RUNTIME_MESSAGE_LENGTH = 1_000;
const SAFE_RUNTIME_KIND_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const SAFE_RUNTIME_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const POSIX_PATH_PATTERN = /(?:\/[A-Za-z0-9._~-]+){2,}/gu;
const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:\\[^\s]+/gu;
const RUNTIME_FAILURE_MESSAGE = 'Runtime boundary failed safely.';
const UNSAFE_RUNTIME_RESULT_MESSAGE = 'Runtime boundary returned an unsafe or invalid result.';

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

const UNSAFE_RUNTIME_FIELD_NAMES = new Set([
  'deploymenthandle',
  'filesystempath',
  'handler',
  'logstream',
  'openclawclient',
  'platformhandle',
  'provider',
  'providerobject',
  'providerresponse',
  'rawlog',
  'rawopenclawresponse',
  'rawproviderobject',
  'rawproviderresponse',
  'rawruntimepayload',
  'rawtoolpayload',
  'runtimepayload',
  'sdkclient',
  'stack',
  'storagepath',
  'storageroot',
  'toolpayload',
]);
const UNSAFE_RUNTIME_FIELD_NAME_PARTS = SENSITIVE_TEXT_TERM_PARTS;

export type OpenClawRuntimeOutputRef = `${typeof RUNTIME_OUTPUT_REF_PREFIX}${string}`;

export interface OpenClawRuntimeIntent {
  readonly kind: string;
  readonly text?: string | undefined;
  readonly resourceRef?: string | undefined;
}

export interface OpenClawRuntimeDispatchRequest {
  readonly dispatchRef: AdapterOperationRef;
  readonly intent: OpenClawRuntimeIntent;
  readonly workspaceRef?: WorkspaceRef | undefined;
  readonly agentRef?: AgentRef | undefined;
  readonly actorRef?: ActorRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
}

export interface OpenClawRuntimeBridgeOutput {
  readonly outputRef: OpenClawRuntimeOutputRef;
  readonly message: string;
}

export interface OpenClawRuntimeBridgeDispatchOutput {
  readonly dispatchRef: AdapterOperationRef;
  readonly output: OpenClawRuntimeBridgeOutput;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
}

export interface OpenClawRuntimeBoundary {
  readonly dispatch: (request: OpenClawRuntimeDispatchRequest) => unknown;
  readonly getReadiness?: (() => unknown) | undefined;
}

export interface OpenClawRuntimeBridgeInput {
  readonly runtime?: OpenClawRuntimeBoundary | undefined;
  readonly context?: AdapterOperationContext | undefined;
}

export interface OpenClawRuntimeBridgeDispatchInput {
  readonly runtime?: OpenClawRuntimeBoundary | undefined;
  readonly request: OpenClawRuntimeDispatchRequest;
  readonly context?: AdapterOperationContext | undefined;
}

export interface OpenClawRuntimeBridge {
  readonly dispatch: (
    request: OpenClawRuntimeDispatchRequest,
    context?: AdapterOperationContext,
  ) => AdapterOperationResult<OpenClawRuntimeBridgeDispatchOutput>;
  readonly getReadiness: () => OpenClawTelegramAdapterReadiness;
}

interface RuntimeFailureInput {
  readonly code: AdapterSafeErrorCode;
  readonly message: string;
  readonly context?: AdapterOperationContext | undefined;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
}

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

function isUnsafeRuntimeFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_RUNTIME_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_RUNTIME_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function rejectUnsafeRuntimeFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeRuntimeFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeRuntimeFieldName(fieldName)) {
      throw new TypeError(
        `${label} must not include raw runtime, provider, SDK, storage, tool, or sensitive fields.`,
      );
    }
    rejectUnsafeRuntimeFields(value, label, seen);
  }
}

function redactSensitiveRuntimeText(text: string): string {
  const withoutSensitiveAssignments = SENSITIVE_TEXT_PATTERNS.reduce(
    (currentText, pattern) => currentText.replace(pattern, '[redacted]'),
    text,
  );

  return withoutSensitiveAssignments
    .replace(POSIX_PATH_PATTERN, '[redacted]')
    .replace(WINDOWS_PATH_PATTERN, '[redacted]');
}

function normalizeRuntimeText(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = redactSensitiveRuntimeText(
    input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim(),
  );

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function normalizeRuntimeMessage(
  input: unknown,
  fallback: string,
  maxLength = MAX_RUNTIME_MESSAGE_LENGTH,
): string {
  if (typeof input !== 'string') {
    return fallback;
  }

  const normalized = redactSensitiveRuntimeText(
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

function normalizeRuntimeKind(input: unknown): string {
  const normalized = normalizeRuntimeText(input, 'Runtime intent kind', MAX_RUNTIME_KIND_LENGTH);

  if (!SAFE_RUNTIME_KIND_PATTERN.test(normalized)) {
    throw new TypeError('Runtime intent kind must be a safe identifier.');
  }

  return normalized;
}

function normalizeSafeRuntimeRef(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_RUNTIME_REF_LENGTH ||
    !SAFE_RUNTIME_REF_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a safe opaque reference.`);
  }

  return normalized;
}

function normalizeRuntimeOutputRef(input: unknown): OpenClawRuntimeOutputRef {
  const normalized = normalizeSafeRuntimeRef(input, 'Runtime output ref');

  if (!normalized.startsWith(RUNTIME_OUTPUT_REF_PREFIX)) {
    throw new TypeError('Runtime output ref must use the runtime-output prefix.');
  }

  return normalized as OpenClawRuntimeOutputRef;
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

function normalizeOperationContext(input: unknown): AdapterOperationContext {
  assertPlainRecord(input, 'Runtime operation context');
  rejectUnsafeRuntimeFields(input, 'Runtime operation context');

  const workspaceRef = normalizeOptionalAdapterRef<WorkspaceRef>(
    input.workspaceRef,
    'workspace',
    'Runtime context workspaceRef',
  );
  const agentRef = normalizeOptionalAdapterRef<AgentRef>(
    input.agentRef,
    'agent',
    'Runtime context agentRef',
  );
  const actorRef = normalizeOptionalAdapterRef<ActorRef>(
    input.actorRef,
    'actor',
    'Runtime context actorRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Runtime context detailsRef',
  );
  const rawDebugRef = normalizeOptionalAdapterRef<AdapterRawDebugRef>(
    input.rawDebugRef,
    'raw-debug',
    'Runtime context rawDebugRef',
  );

  return Object.freeze({
    operationRef: normalizeAdapterRef<AdapterOperationRef>(
      input.operationRef,
      'operation',
      'Runtime context operationRef',
    ),
    correlationRef: normalizeAdapterRef<AdapterCorrelationRef>(
      input.correlationRef,
      'correlation',
      'Runtime context correlationRef',
    ),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(rawDebugRef === undefined ? {} : { rawDebugRef }),
  });
}

function normalizeOptionalOperationContext(input: unknown): AdapterOperationContext | undefined {
  return input === undefined ? undefined : normalizeOperationContext(input);
}

function safeResultContext(input: AdapterOperationContext | undefined): AdapterOperationContext | undefined {
  try {
    return normalizeOptionalOperationContext(input);
  } catch {
    return undefined;
  }
}

function normalizeRuntimeIntent(input: unknown): OpenClawRuntimeIntent {
  assertPlainRecord(input, 'Runtime intent');
  rejectUnsafeRuntimeFields(input, 'Runtime intent');

  const text =
    input.text === undefined
      ? undefined
      : normalizeRuntimeText(input.text, 'Runtime intent text', MAX_RUNTIME_TEXT_LENGTH);
  const resourceRef =
    input.resourceRef === undefined
      ? undefined
      : normalizeSafeRuntimeRef(input.resourceRef, 'Runtime intent resourceRef');

  return Object.freeze({
    kind: normalizeRuntimeKind(input.kind),
    ...(text === undefined ? {} : { text }),
    ...(resourceRef === undefined ? {} : { resourceRef }),
  });
}

function normalizeRuntimeDispatchRequest(input: unknown): OpenClawRuntimeDispatchRequest {
  assertPlainRecord(input, 'Runtime dispatch request');
  rejectUnsafeRuntimeFields(input, 'Runtime dispatch request');

  const workspaceRef = normalizeOptionalAdapterRef<WorkspaceRef>(
    input.workspaceRef,
    'workspace',
    'Runtime workspaceRef',
  );
  const agentRef = normalizeOptionalAdapterRef<AgentRef>(input.agentRef, 'agent', 'Runtime agentRef');
  const actorRef = normalizeOptionalAdapterRef<ActorRef>(input.actorRef, 'actor', 'Runtime actorRef');
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Runtime correlationRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Runtime detailsRef',
  );

  return Object.freeze({
    dispatchRef: normalizeAdapterRef<AdapterOperationRef>(
      input.dispatchRef,
      'operation',
      'Runtime dispatchRef',
    ),
    intent: normalizeRuntimeIntent(input.intent),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
  });
}

function createRuntimeFailure(
  input: RuntimeFailureInput,
): AdapterOperationResult<OpenClawRuntimeBridgeDispatchOutput> {
  return adapterErr(
    createAdapterSafeError({
      code: input.code,
      message: normalizeRuntimeMessage(input.message, RUNTIME_FAILURE_MESSAGE, 240),
      ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    }),
    safeResultContext(input.context),
  );
}

function mapRuntimeFailureCode(code: unknown): AdapterSafeErrorCode {
  switch (code) {
    case 'invalid-input':
      return 'invalid-input';
    case 'runtime-unavailable':
      return 'dependency-missing';
    case 'runtime-rejected':
    case 'timeout':
      return 'dependency-failed';
    case 'internal':
      return 'internal';
    default:
      return 'dependency-failed';
  }
}

function normalizeRuntimeBoundarySuccess(
  request: OpenClawRuntimeDispatchRequest,
  result: Record<string, unknown>,
): OpenClawRuntimeBridgeDispatchOutput {
  const output = result.output;
  assertPlainRecord(output, 'Runtime boundary success output');
  rejectUnsafeRuntimeFields(output, 'Runtime boundary success output');

  const resultDispatchRef =
    result.dispatchRef === undefined
      ? request.dispatchRef
      : normalizeAdapterRef<AdapterOperationRef>(result.dispatchRef, 'operation', 'Runtime result dispatchRef');

  if (resultDispatchRef !== request.dispatchRef) {
    throw new TypeError('Runtime result dispatchRef must match the dispatched request.');
  }

  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    preferDefined(result.correlationRef, request.correlationRef),
    'correlation',
    'Runtime result correlationRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    preferDefined(result.detailsRef, request.detailsRef),
    'details',
    'Runtime result detailsRef',
  );

  return Object.freeze({
    dispatchRef: resultDispatchRef,
    output: Object.freeze({
      outputRef: normalizeRuntimeOutputRef(output.outputRef),
      message: normalizeRuntimeText(output.message, 'Runtime output message', MAX_RUNTIME_MESSAGE_LENGTH),
    }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
  });
}

function normalizeRuntimeBoundaryFailure(
  request: OpenClawRuntimeDispatchRequest,
  result: Record<string, unknown>,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<OpenClawRuntimeBridgeDispatchOutput> {
  const errorRecord = isPlainRecord(result.error) ? result.error : undefined;
  const resultDispatchRef =
    result.dispatchRef === undefined
      ? request.dispatchRef
      : normalizeAdapterRef<AdapterOperationRef>(result.dispatchRef, 'operation', 'Runtime failure dispatchRef');

  if (resultDispatchRef !== request.dispatchRef) {
    throw new TypeError('Runtime failure dispatchRef must match the dispatched request.');
  }

  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    preferDefined(preferDefined(result.detailsRef, errorRecord?.detailsRef), request.detailsRef),
    'details',
    'Runtime failure detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    preferDefined(preferDefined(result.correlationRef, errorRecord?.correlationRef), request.correlationRef),
    'correlation',
    'Runtime failure correlationRef',
  );
  const retryable =
    typeof result.retryable === 'boolean'
      ? result.retryable
      : typeof errorRecord?.retryable === 'boolean'
        ? errorRecord.retryable
        : undefined;
  const code = mapRuntimeFailureCode(errorRecord?.code ?? result.code);
  const message = normalizeRuntimeMessage(
    errorRecord?.message ?? result.message,
    RUNTIME_FAILURE_MESSAGE,
    240,
  );

  return createRuntimeFailure({
    code,
    message,
    context,
    retryable,
    detailsRef,
    correlationRef,
  });
}

function normalizeRuntimeBoundaryResult(
  request: OpenClawRuntimeDispatchRequest,
  result: unknown,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<OpenClawRuntimeBridgeDispatchOutput> {
  assertPlainRecord(result, 'Runtime boundary result');
  rejectUnsafeRuntimeFields(result, 'Runtime boundary result');

  if (result.ok === true) {
    return adapterOk(normalizeRuntimeBoundarySuccess(request, result), context);
  }

  if (result.ok === false) {
    return normalizeRuntimeBoundaryFailure(request, result, context);
  }

  throw new TypeError('Runtime boundary result must use an ok discriminator.');
}

function isRuntimeBoundary(runtime: unknown): runtime is OpenClawRuntimeBoundary {
  return isPlainRecord(runtime) && typeof runtime.dispatch === 'function';
}

export function dispatchOpenClawRuntime(
  input: OpenClawRuntimeBridgeDispatchInput,
): AdapterOperationResult<OpenClawRuntimeBridgeDispatchOutput> {
  let context: AdapterOperationContext | undefined;
  try {
    context = normalizeOptionalOperationContext(input.context);
  } catch (error) {
    return createRuntimeFailure({
      code: 'invalid-input',
      message: error instanceof Error ? error.message : 'Runtime operation context is invalid.',
    });
  }

  if (!isRuntimeBoundary(input.runtime)) {
    return createRuntimeFailure({
      code: 'dependency-missing',
      message: 'Runtime boundary is not configured.',
      context,
    });
  }

  let request: OpenClawRuntimeDispatchRequest;
  try {
    request = normalizeRuntimeDispatchRequest(input.request);
  } catch (error) {
    return createRuntimeFailure({
      code: 'invalid-input',
      message: error instanceof Error ? error.message : 'Runtime dispatch request is invalid.',
      context,
    });
  }

  let boundaryResult: unknown;
  try {
    boundaryResult = input.runtime.dispatch(request);
  } catch {
    return createRuntimeFailure({
      code: 'dependency-failed',
      message: 'Runtime boundary threw during dispatch.',
      context,
      correlationRef: request.correlationRef,
      detailsRef: request.detailsRef,
    });
  }

  try {
    return normalizeRuntimeBoundaryResult(request, boundaryResult, context);
  } catch {
    return createRuntimeFailure({
      code: 'dependency-failed',
      message: UNSAFE_RUNTIME_RESULT_MESSAGE,
      context,
      correlationRef: request.correlationRef,
      detailsRef: request.detailsRef,
    });
  }
}

function readinessCheckStatusFromRuntimeStatus(status: unknown): 'pass' | 'warn' | 'fail' | 'unknown' {
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

export function summarizeOpenClawRuntimeBridgeReadiness(input: {
  readonly runtime?: OpenClawRuntimeBoundary | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
} = {}): OpenClawTelegramAdapterReadiness {
  if (!isRuntimeBoundary(input.runtime)) {
    return summarizeAdapterReadiness({
      checks: [
        createAdapterReadinessCheck({
          component: 'runtime',
          status: 'fail',
          message: 'Runtime boundary dispatch port is not configured.',
          ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
          ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
        }),
      ],
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    });
  }

  if (input.runtime.getReadiness === undefined) {
    return summarizeAdapterReadiness({
      checks: [
        createAdapterReadinessCheck({
          component: 'runtime',
          status: 'pass',
          message: 'Runtime boundary dispatch port is injected.',
          ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
          ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
        }),
      ],
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    });
  }

  try {
    const readiness = input.runtime.getReadiness();
    assertPlainRecord(readiness, 'Runtime readiness result');
    rejectUnsafeRuntimeFields(readiness, 'Runtime readiness result');

    const checkStatus = readinessCheckStatusFromRuntimeStatus(readiness.status);
    const message = normalizeRuntimeMessage(
      readiness.message,
      'Runtime readiness boundary reported status.',
      240,
    );

    return summarizeAdapterReadiness({
      checks: [
        createAdapterReadinessCheck({
          component: 'runtime',
          status: checkStatus,
          message,
          ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
          ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
        }),
      ],
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    });
  } catch {
    return summarizeAdapterReadiness({
      checks: [
        createAdapterReadinessCheck({
          component: 'runtime',
          status: 'fail',
          message: 'Runtime readiness boundary failed safely.',
          ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
          ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
        }),
      ],
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    });
  }
}

export function createOpenClawRuntimeBridge(
  input: OpenClawRuntimeBridgeInput = {},
): OpenClawRuntimeBridge {
  return Object.freeze({
    dispatch(
      request: OpenClawRuntimeDispatchRequest,
      context?: AdapterOperationContext,
    ): AdapterOperationResult<OpenClawRuntimeBridgeDispatchOutput> {
      return dispatchOpenClawRuntime({
        runtime: input.runtime,
        request,
        context: context ?? input.context,
      });
    },

    getReadiness(): OpenClawTelegramAdapterReadiness {
      return summarizeOpenClawRuntimeBridgeReadiness({ runtime: input.runtime });
    },
  });
}
