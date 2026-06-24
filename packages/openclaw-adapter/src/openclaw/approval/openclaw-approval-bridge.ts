import type {
  ApprovalBridgeDecision,
  ApprovalBridgeDecisionInput,
  ApprovalBridgeDecisionStatus,
  ApprovalBridgeRef,
  ApprovalBridgeRequest,
  ApprovalBridgeRequestInput,
} from '../../approvals/index.js';
import { createApprovalBridgeDecision, createApprovalBridgeRequest } from '../../approvals/index.js';
import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationContext,
  AdapterOperationRef,
  AdapterOperationResult,
  AdapterRawDebugRef,
  AdapterSafeErrorCode,
  OpenClawTelegramAdapterReadiness,
  PermissionDecision,
  WorkspaceRef,
  AgentRef,
} from '../../contracts/index.js';
import {
  adapterErr,
  adapterOk,
  createAdapterReadinessCheck,
  createAdapterSafeError,
  isPermissionAllowed,
  parseOpenClawAdapterRef,
  summarizeAdapterReadiness,
} from '../../contracts/index.js';

const APPROVAL_REF_PREFIX = 'approval:' as const;
const MAX_APPROVAL_PORT_REF_LENGTH = 256;
const MAX_APPROVAL_PORT_MESSAGE_LENGTH = 1_000;
const MAX_APPROVAL_PORT_READINESS_MESSAGE_LENGTH = 240;
const SAFE_APPROVAL_REF_VALUE_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const POSIX_PATH_PATTERN = /(?:\/[A-Za-z0-9._~-]+){2,}/gu;
const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:\\[^\s]+/gu;
const APPROVAL_PORT_FAILURE_MESSAGE = 'OpenClaw approval port failed safely.';
const UNSAFE_APPROVAL_PORT_RESULT_MESSAGE = 'OpenClaw approval port returned an unsafe or invalid result.';

const OPENCLAW_APPROVAL_STATE_STATUSES = [
  'submitted',
  'approved',
  'rejected',
  'expired',
  'cancelled',
  'unknown',
] as const;

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

const UNSAFE_APPROVAL_PORT_FIELD_NAMES = new Set([
  'approvalpayload',
  'database',
  'execute',
  'filesystem',
  'filesystempath',
  'handler',
  'network',
  'openclawclient',
  'provider',
  'providerobject',
  'providerresponse',
  'rawapproval',
  'rawapprovalpayload',
  'rawcallbackbody',
  'rawerror',
  'rawopenclawapproval',
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

export type OpenClawApprovalStateStatus = (typeof OPENCLAW_APPROVAL_STATE_STATUSES)[number];

export interface OpenClawApprovalBridgeState {
  readonly approvalRef: ApprovalBridgeRef;
  readonly status: OpenClawApprovalStateStatus;
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
}

export interface OpenClawApprovalBridgeSubmission {
  readonly request: ApprovalBridgeRequest;
  readonly state: OpenClawApprovalBridgeState;
}

export interface OpenClawApprovalBridgeResolution {
  readonly decision: ApprovalBridgeDecision;
  readonly state: OpenClawApprovalBridgeState;
}

export interface OpenClawApprovalPort {
  readonly submitApproval: (request: ApprovalBridgeRequest) => unknown;
  readonly resolveApproval: (decision: ApprovalBridgeDecision) => unknown;
  readonly getReadiness?: (() => unknown) | undefined;
}

export interface OpenClawApprovalBridgeInput {
  readonly approvalPort?: OpenClawApprovalPort | undefined;
  readonly context?: AdapterOperationContext | undefined;
}

export interface SubmitOpenClawApprovalBridgeRequestInput {
  readonly approvalPort?: OpenClawApprovalPort | undefined;
  readonly request: ApprovalBridgeRequestInput;
  readonly context?: AdapterOperationContext | undefined;
}

export interface ResolveOpenClawApprovalBridgeDecisionInput {
  readonly approvalPort?: OpenClawApprovalPort | undefined;
  readonly decision: ApprovalBridgeDecisionInput;
  readonly permissionDecision?: PermissionDecision | undefined;
  readonly context?: AdapterOperationContext | undefined;
}

export interface OpenClawApprovalBridge {
  readonly submit: (
    request: ApprovalBridgeRequestInput,
    context?: AdapterOperationContext,
  ) => AdapterOperationResult<OpenClawApprovalBridgeSubmission>;
  readonly resolve: (
    decision: ApprovalBridgeDecisionInput,
    permissionDecision?: PermissionDecision,
    context?: AdapterOperationContext,
  ) => AdapterOperationResult<OpenClawApprovalBridgeResolution>;
  readonly getReadiness: () => OpenClawTelegramAdapterReadiness;
}

interface ApprovalPortFailureInput<T> {
  readonly code: AdapterSafeErrorCode;
  readonly message: string;
  readonly context?: AdapterOperationContext | undefined;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
  readonly _value?: T | undefined;
}

interface ApprovalReadinessRefs {
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

function isUnsafeApprovalPortFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_APPROVAL_PORT_FIELD_NAMES.has(normalizedFieldName) ||
    SENSITIVE_TEXT_TERM_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function rejectUnsafeApprovalPortFields(
  input: unknown,
  label: string,
  seen: WeakSet<object> = new WeakSet<object>(),
): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeApprovalPortFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeApprovalPortFieldName(fieldName)) {
      throw new TypeError(
        `${label} must not include raw approval, provider, SDK, callback, storage, tool, or sensitive fields.`,
      );
    }
    rejectUnsafeApprovalPortFields(value, label, seen);
  }
}

function redactSensitiveApprovalPortText(text: string): string {
  const withoutSensitiveAssignments = SENSITIVE_TEXT_PATTERNS.reduce(
    (currentText, pattern) => currentText.replace(pattern, '[redacted]'),
    text,
  );

  return withoutSensitiveAssignments
    .replace(POSIX_PATH_PATTERN, '[redacted]')
    .replace(WINDOWS_PATH_PATTERN, '[redacted]');
}

function normalizeApprovalPortMessage(
  input: unknown,
  fallback: string,
  maxLength = MAX_APPROVAL_PORT_MESSAGE_LENGTH,
): string {
  if (typeof input !== 'string') {
    return fallback;
  }

  const normalized = redactSensitiveApprovalPortText(
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

function normalizeApprovalRef(input: unknown, label: string): ApprovalBridgeRef {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim();
  if (!normalized.startsWith(APPROVAL_REF_PREFIX)) {
    throw new TypeError(`${label} must use the approval ref prefix.`);
  }

  const value = normalized.slice(APPROVAL_REF_PREFIX.length);
  if (
    value.length === 0 ||
    value.length > MAX_APPROVAL_PORT_REF_LENGTH ||
    !SAFE_APPROVAL_REF_VALUE_PATTERN.test(value)
  ) {
    throw new TypeError(`${label} must be a safe approval ref.`);
  }

  return normalized as ApprovalBridgeRef;
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
  assertPlainRecord(input, 'OpenClaw approval operation context');
  rejectUnsafeApprovalPortFields(input, 'OpenClaw approval operation context');

  const workspaceRef = normalizeOptionalAdapterRef<WorkspaceRef>(
    input.workspaceRef,
    'workspace',
    'OpenClaw approval context workspaceRef',
  );
  const agentRef = normalizeOptionalAdapterRef<AgentRef>(
    input.agentRef,
    'agent',
    'OpenClaw approval context agentRef',
  );
  const actorRef = normalizeOptionalAdapterRef<ActorRef>(
    input.actorRef,
    'actor',
    'OpenClaw approval context actorRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'OpenClaw approval context detailsRef',
  );
  const rawDebugRef = normalizeOptionalAdapterRef<AdapterRawDebugRef>(
    input.rawDebugRef,
    'raw-debug',
    'OpenClaw approval context rawDebugRef',
  );

  return Object.freeze({
    operationRef: normalizeAdapterRef<AdapterOperationRef>(
      input.operationRef,
      'operation',
      'OpenClaw approval context operationRef',
    ),
    correlationRef: normalizeAdapterRef<AdapterCorrelationRef>(
      input.correlationRef,
      'correlation',
      'OpenClaw approval context correlationRef',
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

function createApprovalPortFailure<T>(
  input: ApprovalPortFailureInput<T>,
): AdapterOperationResult<T> {
  return adapterErr(
    createAdapterSafeError({
      code: input.code,
      message: normalizeApprovalPortMessage(input.message, APPROVAL_PORT_FAILURE_MESSAGE, 240),
      ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    }),
    safeResultContext(input.context),
  );
}

function mapApprovalPortFailureCode(code: unknown): AdapterSafeErrorCode {
  switch (code) {
    case 'invalid-input':
      return 'invalid-input';
    case 'not-found':
      return 'not-found';
    case 'conflict':
      return 'conflict';
    case 'unauthorized':
      return 'unauthorized';
    case 'forbidden':
      return 'forbidden';
    case 'approval-unavailable':
    case 'port-unavailable':
      return 'dependency-missing';
    case 'approval-rejected':
    case 'timeout':
      return 'dependency-failed';
    case 'internal':
      return 'internal';
    default:
      return 'dependency-failed';
  }
}

function normalizeApprovalStateStatus(input: unknown): OpenClawApprovalStateStatus {
  if (
    typeof input !== 'string' ||
    !(OPENCLAW_APPROVAL_STATE_STATUSES as readonly string[]).includes(input)
  ) {
    throw new TypeError('Unsupported OpenClaw approval state status.');
  }

  return input as OpenClawApprovalStateStatus;
}

function decisionStatusToStateStatus(status: ApprovalBridgeDecisionStatus): OpenClawApprovalStateStatus {
  return normalizeApprovalStateStatus(status);
}

function normalizeApprovalPortState(input: {
  readonly result: Record<string, unknown>;
  readonly expectedApprovalRef: ApprovalBridgeRef;
  readonly fallbackStatus: OpenClawApprovalStateStatus;
  readonly fallbackDetailsRef?: AdapterDetailsRef | undefined;
  readonly fallbackCorrelationRef?: AdapterCorrelationRef | undefined;
}): OpenClawApprovalBridgeState {
  const stateInput = isPlainRecord(input.result.state) ? input.result.state : input.result;
  const approvalRef = normalizeApprovalRef(
    preferDefined(stateInput.approvalRef, input.expectedApprovalRef),
    'OpenClaw approval state approvalRef',
  );

  if (approvalRef !== input.expectedApprovalRef) {
    throw new TypeError('OpenClaw approval state approvalRef must match the request or decision ref.');
  }

  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    preferDefined(stateInput.detailsRef, input.fallbackDetailsRef),
    'details',
    'OpenClaw approval state detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    preferDefined(stateInput.correlationRef, input.fallbackCorrelationRef),
    'correlation',
    'OpenClaw approval state correlationRef',
  );

  return Object.freeze({
    approvalRef,
    status: normalizeApprovalStateStatus(preferDefined(stateInput.status, input.fallbackStatus)),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function validateOptionalFailureApprovalRef(
  result: Record<string, unknown>,
  errorRecord: Record<string, unknown> | undefined,
  expectedApprovalRef: ApprovalBridgeRef,
): void {
  const candidateApprovalRef = preferDefined(result.approvalRef, errorRecord?.approvalRef);
  if (candidateApprovalRef === undefined) {
    return;
  }

  const approvalRef = normalizeApprovalRef(candidateApprovalRef, 'OpenClaw approval failure approvalRef');
  if (approvalRef !== expectedApprovalRef) {
    throw new TypeError('OpenClaw approval failure approvalRef must match the request or decision ref.');
  }
}

function normalizeApprovalPortFailureResult<T>(input: {
  readonly result: Record<string, unknown>;
  readonly expectedApprovalRef: ApprovalBridgeRef;
  readonly context: AdapterOperationContext | undefined;
  readonly fallbackDetailsRef?: AdapterDetailsRef | undefined;
  readonly fallbackCorrelationRef?: AdapterCorrelationRef | undefined;
}): AdapterOperationResult<T> {
  const errorRecord = isPlainRecord(input.result.error) ? input.result.error : undefined;
  validateOptionalFailureApprovalRef(input.result, errorRecord, input.expectedApprovalRef);

  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    preferDefined(preferDefined(input.result.detailsRef, errorRecord?.detailsRef), input.fallbackDetailsRef),
    'details',
    'OpenClaw approval failure detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    preferDefined(
      preferDefined(input.result.correlationRef, errorRecord?.correlationRef),
      input.fallbackCorrelationRef,
    ),
    'correlation',
    'OpenClaw approval failure correlationRef',
  );
  const retryable =
    typeof input.result.retryable === 'boolean'
      ? input.result.retryable
      : typeof errorRecord?.retryable === 'boolean'
        ? errorRecord.retryable
        : undefined;

  return createApprovalPortFailure<T>({
    code: mapApprovalPortFailureCode(errorRecord?.code ?? input.result.code),
    message: normalizeApprovalPortMessage(
      errorRecord?.message ?? input.result.message,
      APPROVAL_PORT_FAILURE_MESSAGE,
      240,
    ),
    context: input.context,
    retryable,
    detailsRef,
    correlationRef,
  });
}

function normalizeSubmitPortResult(
  request: ApprovalBridgeRequest,
  result: unknown,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<OpenClawApprovalBridgeSubmission> {
  assertPlainRecord(result, 'OpenClaw approval submit result');
  rejectUnsafeApprovalPortFields(result, 'OpenClaw approval submit result');

  if (result.ok === true) {
    return adapterOk(
      Object.freeze({
        request,
        state: normalizeApprovalPortState({
          result,
          expectedApprovalRef: request.approvalRef,
          fallbackStatus: 'submitted',
          fallbackDetailsRef: request.detailsRef,
          fallbackCorrelationRef: request.correlationRef,
        }),
      }),
      context,
    );
  }

  if (result.ok === false) {
    return normalizeApprovalPortFailureResult<OpenClawApprovalBridgeSubmission>({
      result,
      expectedApprovalRef: request.approvalRef,
      context,
      fallbackDetailsRef: request.detailsRef,
      fallbackCorrelationRef: request.correlationRef,
    });
  }

  throw new TypeError('OpenClaw approval submit result must use an ok discriminator.');
}

function normalizeResolvePortResult(
  decision: ApprovalBridgeDecision,
  result: unknown,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<OpenClawApprovalBridgeResolution> {
  assertPlainRecord(result, 'OpenClaw approval resolve result');
  rejectUnsafeApprovalPortFields(result, 'OpenClaw approval resolve result');

  if (result.ok === true) {
    return adapterOk(
      Object.freeze({
        decision,
        state: normalizeApprovalPortState({
          result,
          expectedApprovalRef: decision.approvalRef,
          fallbackStatus: decisionStatusToStateStatus(decision.status),
          fallbackDetailsRef: decision.detailsRef,
          fallbackCorrelationRef: decision.correlationRef,
        }),
      }),
      context,
    );
  }

  if (result.ok === false) {
    return normalizeApprovalPortFailureResult<OpenClawApprovalBridgeResolution>({
      result,
      expectedApprovalRef: decision.approvalRef,
      context,
      fallbackDetailsRef: decision.detailsRef,
      fallbackCorrelationRef: decision.correlationRef,
    });
  }

  throw new TypeError('OpenClaw approval resolve result must use an ok discriminator.');
}

function hasSubmitApprovalPort(approvalPort: unknown): approvalPort is OpenClawApprovalPort {
  return isPlainRecord(approvalPort) && typeof approvalPort.submitApproval === 'function';
}

function hasResolveApprovalPort(approvalPort: unknown): approvalPort is OpenClawApprovalPort {
  return isPlainRecord(approvalPort) && typeof approvalPort.resolveApproval === 'function';
}

function hasCompleteApprovalPort(approvalPort: unknown): approvalPort is OpenClawApprovalPort {
  return hasSubmitApprovalPort(approvalPort) && hasResolveApprovalPort(approvalPort);
}

export function submitOpenClawApprovalBridgeRequest(
  input: SubmitOpenClawApprovalBridgeRequestInput,
): AdapterOperationResult<OpenClawApprovalBridgeSubmission> {
  let context: AdapterOperationContext | undefined;
  try {
    context = normalizeOptionalOperationContext(input.context);
  } catch {
    return createApprovalPortFailure<OpenClawApprovalBridgeSubmission>({
      code: 'invalid-input',
      message: 'OpenClaw approval operation context is invalid or unsafe.',
    });
  }

  if (!hasSubmitApprovalPort(input.approvalPort)) {
    return createApprovalPortFailure<OpenClawApprovalBridgeSubmission>({
      code: 'dependency-missing',
      message: 'OpenClaw approval submit port is not configured.',
      context,
    });
  }

  let request: ApprovalBridgeRequest;
  try {
    request = createApprovalBridgeRequest(input.request);
  } catch {
    return createApprovalPortFailure<OpenClawApprovalBridgeSubmission>({
      code: 'invalid-input',
      message: 'OpenClaw approval request is invalid or unsafe.',
      context,
    });
  }

  let portResult: unknown;
  try {
    portResult = input.approvalPort.submitApproval(request);
  } catch {
    return createApprovalPortFailure<OpenClawApprovalBridgeSubmission>({
      code: 'dependency-failed',
      message: 'OpenClaw approval submit port threw safely.',
      context,
      retryable: true,
      detailsRef: request.detailsRef,
      correlationRef: request.correlationRef,
    });
  }

  try {
    return normalizeSubmitPortResult(request, portResult, context);
  } catch {
    return createApprovalPortFailure<OpenClawApprovalBridgeSubmission>({
      code: 'dependency-failed',
      message: UNSAFE_APPROVAL_PORT_RESULT_MESSAGE,
      context,
      retryable: true,
      detailsRef: request.detailsRef,
      correlationRef: request.correlationRef,
    });
  }
}

export function resolveOpenClawApprovalBridgeDecision(
  input: ResolveOpenClawApprovalBridgeDecisionInput,
): AdapterOperationResult<OpenClawApprovalBridgeResolution> {
  let context: AdapterOperationContext | undefined;
  try {
    context = normalizeOptionalOperationContext(input.context);
  } catch {
    return createApprovalPortFailure<OpenClawApprovalBridgeResolution>({
      code: 'invalid-input',
      message: 'OpenClaw approval operation context is invalid or unsafe.',
    });
  }

  if (!hasResolveApprovalPort(input.approvalPort)) {
    return createApprovalPortFailure<OpenClawApprovalBridgeResolution>({
      code: 'dependency-missing',
      message: 'OpenClaw approval resolve port is not configured.',
      context,
    });
  }

  let decision: ApprovalBridgeDecision;
  try {
    decision = createApprovalBridgeDecision(input.decision);
  } catch {
    return createApprovalPortFailure<OpenClawApprovalBridgeResolution>({
      code: 'invalid-input',
      message: 'OpenClaw approval decision is invalid or unsafe.',
      context,
    });
  }

  if (input.permissionDecision === undefined) {
    return createApprovalPortFailure<OpenClawApprovalBridgeResolution>({
      code: 'forbidden',
      message: 'OpenClaw approval resolution requires an allowed permission decision before port call.',
      context,
      detailsRef: decision.detailsRef,
      correlationRef: decision.correlationRef,
    });
  }

  if (!isPermissionAllowed(input.permissionDecision)) {
    return createApprovalPortFailure<OpenClawApprovalBridgeResolution>({
      code: 'forbidden',
      message: 'OpenClaw approval resolution permission denied before port call.',
      context,
      ...(input.permissionDecision.detailsRef === undefined
        ? { detailsRef: decision.detailsRef }
        : { detailsRef: input.permissionDecision.detailsRef }),
      ...(input.permissionDecision.correlationRef === undefined
        ? { correlationRef: decision.correlationRef }
        : { correlationRef: input.permissionDecision.correlationRef }),
    });
  }

  let portResult: unknown;
  try {
    portResult = input.approvalPort.resolveApproval(decision);
  } catch {
    return createApprovalPortFailure<OpenClawApprovalBridgeResolution>({
      code: 'dependency-failed',
      message: 'OpenClaw approval resolve port threw safely.',
      context,
      retryable: true,
      detailsRef: decision.detailsRef,
      correlationRef: decision.correlationRef,
    });
  }

  try {
    return normalizeResolvePortResult(decision, portResult, context);
  } catch {
    return createApprovalPortFailure<OpenClawApprovalBridgeResolution>({
      code: 'dependency-failed',
      message: UNSAFE_APPROVAL_PORT_RESULT_MESSAGE,
      context,
      retryable: true,
      detailsRef: decision.detailsRef,
      correlationRef: decision.correlationRef,
    });
  }
}

function normalizeReadinessRefs(input: ApprovalReadinessRefs): ApprovalReadinessRefs {
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'OpenClaw approval readiness detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'OpenClaw approval readiness correlationRef',
  );

  return Object.freeze({
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function createApprovalReadiness(input: {
  readonly status: 'pass' | 'warn' | 'fail' | 'unknown';
  readonly message: string;
  readonly refs?: ApprovalReadinessRefs | undefined;
}): OpenClawTelegramAdapterReadiness {
  const refs = input.refs ?? {};

  return summarizeAdapterReadiness({
    checks: [
      createAdapterReadinessCheck({
        component: 'approval',
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

function readinessCheckStatusFromApprovalStatus(status: unknown): 'pass' | 'warn' | 'fail' | 'unknown' {
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

export function summarizeOpenClawApprovalBridgeReadiness(input: {
  readonly approvalPort?: OpenClawApprovalPort | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
} = {}): OpenClawTelegramAdapterReadiness {
  let refs: ApprovalReadinessRefs;
  try {
    refs = normalizeReadinessRefs(input);
  } catch {
    return createApprovalReadiness({
      status: 'fail',
      message: 'OpenClaw approval readiness refs are invalid.',
    });
  }

  if (!hasCompleteApprovalPort(input.approvalPort)) {
    return createApprovalReadiness({
      status: 'fail',
      message: 'OpenClaw approval submit and resolve ports are not configured.',
      refs,
    });
  }

  if (input.approvalPort.getReadiness === undefined) {
    return createApprovalReadiness({
      status: 'pass',
      message: 'OpenClaw approval submit and resolve ports are injected.',
      refs,
    });
  }

  try {
    const readiness = input.approvalPort.getReadiness();
    assertPlainRecord(readiness, 'OpenClaw approval readiness result');
    rejectUnsafeApprovalPortFields(readiness, 'OpenClaw approval readiness result');

    return createApprovalReadiness({
      status: readinessCheckStatusFromApprovalStatus(readiness.status),
      message: normalizeApprovalPortMessage(
        readiness.message,
        'OpenClaw approval readiness port reported status.',
        MAX_APPROVAL_PORT_READINESS_MESSAGE_LENGTH,
      ),
      refs,
    });
  } catch {
    return createApprovalReadiness({
      status: 'fail',
      message: 'OpenClaw approval readiness port failed safely.',
      refs,
    });
  }
}

export function createOpenClawApprovalBridge(
  input: OpenClawApprovalBridgeInput = {},
): OpenClawApprovalBridge {
  return Object.freeze({
    submit(
      request: ApprovalBridgeRequestInput,
      context?: AdapterOperationContext,
    ): AdapterOperationResult<OpenClawApprovalBridgeSubmission> {
      return submitOpenClawApprovalBridgeRequest({
        approvalPort: input.approvalPort,
        request,
        context: context ?? input.context,
      });
    },

    resolve(
      decision: ApprovalBridgeDecisionInput,
      permissionDecision?: PermissionDecision,
      context?: AdapterOperationContext,
    ): AdapterOperationResult<OpenClawApprovalBridgeResolution> {
      return resolveOpenClawApprovalBridgeDecision({
        approvalPort: input.approvalPort,
        decision,
        permissionDecision,
        context: context ?? input.context,
      });
    },

    getReadiness(): OpenClawTelegramAdapterReadiness {
      return summarizeOpenClawApprovalBridgeReadiness({ approvalPort: input.approvalPort });
    },
  });
}
