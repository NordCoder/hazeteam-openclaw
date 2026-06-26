import type { AdapterOperationContext } from '../contracts/context.js';
import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AgentRef,
  WorkspaceRef,
} from '../contracts/refs.js';
import { parseOpenClawAdapterRef } from '../contracts/refs.js';
import type { OpenClawTelegramAdapterReadiness } from '../contracts/readiness.js';
import { createAdapterReadinessCheck, summarizeAdapterReadiness } from '../contracts/readiness.js';
import type {
  AdapterOperationResult,
  AdapterSafeErrorCode,
} from '../contracts/result.js';
import { adapterErr, adapterOk, createAdapterSafeError } from '../contracts/result.js';
import type { AdapterCorePublicFacade } from '../host/core-host-factory.js';

const ADAPTER_COMMAND_FACADE_KIND = 'adapter-command-facade' as const;
const ADAPTER_COMMAND_INTENT_KIND = 'adapter-command-intent' as const;
const ADAPTER_COMMAND_RESULT_KIND = 'adapter-command-result' as const;

const ADAPTER_COMMAND_FACADE_TARGETS = ['host-action', 'user-intent'] as const;
const ADAPTER_COMMAND_RESULT_STATUSES = ['accepted', 'completed', 'rejected', 'not-run'] as const;
const REQUIRED_COMMAND_FACADE_METHOD_NAMES = ['submitHostAction', 'submitUserIntent'] as const;

const MAX_COMMAND_NAME_LENGTH = 32;
const MAX_COMMAND_KIND_LENGTH = 80;
const MAX_COMMAND_TEXT_LENGTH = 4_096;
const MAX_COMMAND_RESULT_MESSAGE_LENGTH = 1_000;
const MAX_COMMAND_REF_LENGTH = 256;
const MAX_COMMAND_ARGUMENT_REFS = 32;
const MAX_COMMAND_METADATA_DEPTH = 8;
const MAX_COMMAND_METADATA_KEYS = 80;
const COMMAND_NAME_PATTERN = /^[a-z][a-z0-9_-]*$/u;
const SAFE_COMMAND_IDENTIFIER_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const SAFE_COMMAND_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const POSIX_PATH_PATTERN = /(?:\/[A-Za-z0-9._~-]+){2,}/gu;
const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:\\[^\s]+/gu;
const CORE_COMMAND_FAILURE_MESSAGE = 'Core command facade failed safely.';
const CORE_COMMAND_INVALID_RESULT_MESSAGE = 'Core command facade returned an unsafe or invalid result.';

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

const UNSAFE_COMMAND_FIELD_NAMES = new Set([
  'apiclient',
  'apikey',
  'approvalpayload',
  'authorization',
  'bottoken',
  'callbackpayload',
  'callbackquery',
  'clienthandle',
  'coreresult',
  'credential',
  'deploymenthandle',
  'endpoint',
  'filesystempath',
  'handler',
  'logstream',
  'openclawclient',
  'password',
  'platformhandle',
  'provider',
  'providerobject',
  'providerresponse',
  'rawcallbackbody',
  'rawcoreresult',
  'rawerror',
  'rawlog',
  'rawopenclawevent',
  'rawopenclawresponse',
  'rawproviderobject',
  'rawproviderresponse',
  'rawruntimepayload',
  'rawtelegramupdate',
  'rawtoolpayload',
  'rawupdate',
  'runtimepayload',
  'sdkclient',
  'secret',
  'stack',
  'storagepath',
  'storageroot',
  'telegramupdate',
  'tokenvalue',
  'toolpayload',
]);
const UNSAFE_COMMAND_FIELD_NAME_PARTS = SENSITIVE_TEXT_TERM_PARTS;

export type AdapterCommandFacadeTarget = (typeof ADAPTER_COMMAND_FACADE_TARGETS)[number];
export type AdapterCommandFacadeMethodName = (typeof REQUIRED_COMMAND_FACADE_METHOD_NAMES)[number];
export type AdapterCommandResultStatus = (typeof ADAPTER_COMMAND_RESULT_STATUSES)[number];

export type AdapterCommandJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly AdapterCommandJsonValue[]
  | { readonly [key: string]: AdapterCommandJsonValue };

export interface AdapterNormalizedCommandIntent {
  readonly intentRef: AdapterOperationRef;
  readonly target: AdapterCommandFacadeTarget;
  readonly commandName: string;
  readonly commandKind?: string | undefined;
  readonly text?: string | undefined;
  readonly argumentRefs?: readonly string[] | undefined;
  readonly resourceRef?: string | undefined;
  readonly workspaceRef?: WorkspaceRef | undefined;
  readonly agentRef?: AgentRef | undefined;
  readonly actorRef?: ActorRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly data?: AdapterCommandJsonValue | undefined;
}

export interface AdapterCommandCoreInput {
  readonly kind: typeof ADAPTER_COMMAND_INTENT_KIND;
  readonly intentRef: AdapterOperationRef;
  readonly target: AdapterCommandFacadeTarget;
  readonly commandName: string;
  readonly commandKind?: string | undefined;
  readonly text?: string | undefined;
  readonly argumentRefs?: readonly string[] | undefined;
  readonly resourceRef?: string | undefined;
  readonly workspaceRef?: WorkspaceRef | undefined;
  readonly agentRef?: AgentRef | undefined;
  readonly actorRef?: ActorRef | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
  readonly data?: AdapterCommandJsonValue | undefined;
}

export interface AdapterCommandFacadeResult {
  readonly kind: typeof ADAPTER_COMMAND_RESULT_KIND;
  readonly intentRef: AdapterOperationRef;
  readonly target: AdapterCommandFacadeTarget;
  readonly commandName: string;
  readonly status: AdapterCommandResultStatus;
  readonly resultRef?: string | undefined;
  readonly message?: string | undefined;
  readonly correlationRef?: AdapterCorrelationRef | undefined;
  readonly detailsRef?: AdapterDetailsRef | undefined;
}

export interface AdapterCommandFacadeDescriptor {
  readonly kind: typeof ADAPTER_COMMAND_FACADE_KIND;
  readonly configuredMethods: readonly AdapterCommandFacadeMethodName[];
  readonly missingRequiredMethods: readonly AdapterCommandFacadeMethodName[];
  readonly readiness: OpenClawTelegramAdapterReadiness;
}

export interface AdapterCommandFacadeInput {
  readonly facade?: AdapterCorePublicFacade | undefined;
  readonly context?: AdapterOperationContext | undefined;
}

export interface AdapterCommandFacadeDispatchInput {
  readonly facade?: AdapterCorePublicFacade | undefined;
  readonly intent: AdapterNormalizedCommandIntent;
  readonly context?: AdapterOperationContext | undefined;
}

export interface AdapterCommandFacade {
  readonly submit: (
    intent: AdapterNormalizedCommandIntent,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<AdapterCommandFacadeResult>>;
  readonly describe: () => AdapterCommandFacadeDescriptor;
  readonly getReadiness: () => OpenClawTelegramAdapterReadiness;
}

interface NormalizedCommandIntentWithCoreInput {
  readonly intent: AdapterNormalizedCommandIntent;
  readonly coreInput: AdapterCommandCoreInput;
}

interface CommandFailureInput {
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

function isUnsafeCommandFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_COMMAND_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_COMMAND_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function rejectUnsafeCommandFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeCommandFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeCommandFieldName(fieldName)) {
      throw new TypeError(
        `${label} must not include raw provider, callback, runtime, SDK, core, tool, secret, endpoint, stack, or path fields.`,
      );
    }
    rejectUnsafeCommandFields(value, label, seen);
  }
}

function redactSensitiveCommandText(text: string): string {
  const withoutSensitiveAssignments = SENSITIVE_TEXT_PATTERNS.reduce(
    (currentText, pattern) => currentText.replace(pattern, '[redacted]'),
    text,
  );

  return withoutSensitiveAssignments
    .replace(POSIX_PATH_PATTERN, '[redacted]')
    .replace(WINDOWS_PATH_PATTERN, '[redacted]');
}

function normalizeCommandMessage(
  input: unknown,
  fallback: string,
  maxLength = MAX_COMMAND_RESULT_MESSAGE_LENGTH,
): string {
  if (typeof input !== 'string') {
    return fallback;
  }

  const normalized = redactSensitiveCommandText(
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

function normalizeBoundedText(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = redactSensitiveCommandText(
    input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim(),
  );

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new TypeError(`${label} must be non-empty bounded safe text.`);
  }

  return normalized;
}

function normalizeOptionalBoundedText(
  input: unknown,
  label: string,
  maxLength: number,
): string | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeBoundedText(input, label, maxLength);
}

function normalizeCommandName(input: unknown): string {
  const normalized = normalizeBoundedText(input, 'Command name', MAX_COMMAND_NAME_LENGTH)
    .replace(/^\//u, '')
    .toLowerCase();

  if (!COMMAND_NAME_PATTERN.test(normalized)) {
    throw new TypeError('Command name must be a safe bounded command identifier.');
  }

  return normalized;
}

function normalizeCommandKind(input: unknown): string | undefined {
  if (input === undefined) {
    return undefined;
  }

  const normalized = normalizeBoundedText(input, 'Command kind', MAX_COMMAND_KIND_LENGTH);
  if (!SAFE_COMMAND_IDENTIFIER_PATTERN.test(normalized)) {
    throw new TypeError('Command kind must be a safe bounded identifier.');
  }

  return normalized;
}

function normalizeCommandTarget(input: unknown): AdapterCommandFacadeTarget {
  if (
    typeof input !== 'string' ||
    !(ADAPTER_COMMAND_FACADE_TARGETS as readonly string[]).includes(input)
  ) {
    throw new TypeError('Command facade target is unsupported.');
  }

  return input as AdapterCommandFacadeTarget;
}

function commandTargetToMethodName(target: AdapterCommandFacadeTarget): AdapterCommandFacadeMethodName {
  return target === 'host-action' ? 'submitHostAction' : 'submitUserIntent';
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

function normalizeSafeCommandRef(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.replace(CONTROL_CHARACTER_PATTERN, ' ').replace(/\s+/gu, ' ').trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_COMMAND_REF_LENGTH ||
    !SAFE_COMMAND_REF_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a safe opaque reference.`);
  }

  return normalized;
}

function normalizeOptionalSafeCommandRef(input: unknown, label: string): string | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeSafeCommandRef(input, label);
}

function normalizeArgumentRefs(argumentRefs: unknown): readonly string[] | undefined {
  if (argumentRefs === undefined) {
    return undefined;
  }

  if (!Array.isArray(argumentRefs)) {
    throw new TypeError('Command argumentRefs must be an array.');
  }

  if (argumentRefs.length > MAX_COMMAND_ARGUMENT_REFS) {
    throw new TypeError('Command argumentRefs must be bounded.');
  }

  const seenRefs = new Set<string>();
  const normalizedRefs: string[] = [];
  for (const argumentRef of argumentRefs) {
    const normalizedRef = normalizeSafeCommandRef(argumentRef, 'Command argument ref');
    if (seenRefs.has(normalizedRef)) {
      throw new TypeError('Command argumentRefs must be unique.');
    }
    seenRefs.add(normalizedRef);
    normalizedRefs.push(normalizedRef);
  }

  return Object.freeze(normalizedRefs);
}

function normalizeCommandJsonValue(
  input: unknown,
  label: string,
  depth = 0,
  seen = new Set<object>(),
): AdapterCommandJsonValue {
  if (input === null || typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new TypeError(`${label} must contain only finite numbers.`);
    }
    return input;
  }

  if (typeof input === 'string') {
    return normalizeBoundedText(input, label, MAX_COMMAND_TEXT_LENGTH);
  }

  if (input === undefined || typeof input === 'bigint' || typeof input === 'function' || typeof input === 'symbol') {
    throw new TypeError(`${label} must be JSON-serializable.`);
  }

  if (depth >= MAX_COMMAND_METADATA_DEPTH) {
    throw new TypeError(`${label} exceeds the safe metadata depth limit.`);
  }

  if (Array.isArray(input)) {
    if (seen.has(input)) {
      throw new TypeError(`${label} must not contain circular references.`);
    }
    seen.add(input);
    return Object.freeze(
      input.map((value, index) => normalizeCommandJsonValue(value, `${label}[${index}]`, depth + 1, seen)),
    );
  }

  if (!isPlainRecord(input)) {
    throw new TypeError(`${label} must be JSON-serializable.`);
  }

  if (seen.has(input)) {
    throw new TypeError(`${label} must not contain circular references.`);
  }
  seen.add(input);
  rejectUnsafeCommandFields(input, label);

  const entries = Object.entries(input);
  if (entries.length > MAX_COMMAND_METADATA_KEYS) {
    throw new TypeError(`${label} has too many keys.`);
  }

  const output: Record<string, AdapterCommandJsonValue> = {};
  for (const [fieldName, value] of entries) {
    if (fieldName.length === 0 || fieldName.length > MAX_COMMAND_REF_LENGTH) {
      throw new TypeError(`${label} field names must be bounded.`);
    }
    if (isUnsafeCommandFieldName(fieldName)) {
      throw new TypeError(`${label} contains an unsafe field name.`);
    }
    output[fieldName] = normalizeCommandJsonValue(value, `${label}.${fieldName}`, depth + 1, seen);
  }

  return Object.freeze(output);
}

function normalizeOptionalCommandJsonValue(input: unknown): AdapterCommandJsonValue | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeCommandJsonValue(input, 'Command data');
}

function normalizeCommandIntent(
  input: AdapterNormalizedCommandIntent,
): NormalizedCommandIntentWithCoreInput {
  assertPlainRecord(input, 'Command intent');
  rejectUnsafeCommandFields(input, 'Command intent');

  const intentRef = normalizeAdapterRef<AdapterOperationRef>(input.intentRef, 'operation', 'Command intentRef');
  const target = normalizeCommandTarget(input.target);
  const commandName = normalizeCommandName(input.commandName);
  const commandKind = normalizeCommandKind(input.commandKind);
  const text = normalizeOptionalBoundedText(input.text, 'Command text', MAX_COMMAND_TEXT_LENGTH);
  const argumentRefs = normalizeArgumentRefs(input.argumentRefs);
  const resourceRef = normalizeOptionalSafeCommandRef(input.resourceRef, 'Command resourceRef');
  const workspaceRef = normalizeOptionalAdapterRef<WorkspaceRef>(
    input.workspaceRef,
    'workspace',
    'Command workspaceRef',
  );
  const agentRef = normalizeOptionalAdapterRef<AgentRef>(input.agentRef, 'agent', 'Command agentRef');
  const actorRef = normalizeOptionalAdapterRef<ActorRef>(input.actorRef, 'actor', 'Command actorRef');
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Command correlationRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Command detailsRef',
  );
  const data = normalizeOptionalCommandJsonValue(input.data);

  const normalizedIntent: AdapterNormalizedCommandIntent = Object.freeze({
    intentRef,
    target,
    commandName,
    ...(commandKind === undefined ? {} : { commandKind }),
    ...(text === undefined ? {} : { text }),
    ...(argumentRefs === undefined ? {} : { argumentRefs }),
    ...(resourceRef === undefined ? {} : { resourceRef }),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(data === undefined ? {} : { data }),
  });

  return Object.freeze({
    intent: normalizedIntent,
    coreInput: Object.freeze({
      kind: ADAPTER_COMMAND_INTENT_KIND,
      ...normalizedIntent,
    }),
  });
}

function normalizeResultStatus(input: unknown): AdapterCommandResultStatus {
  if (
    typeof input === 'string' &&
    (ADAPTER_COMMAND_RESULT_STATUSES as readonly string[]).includes(input)
  ) {
    return input as AdapterCommandResultStatus;
  }

  return 'accepted';
}

function preferDefined(primary: unknown, fallback: unknown): unknown {
  return primary === undefined ? fallback : primary;
}

function getRecordValue(record: Record<string, unknown>, key: string): unknown {
  return record[key];
}

function normalizeCommandBoundarySuccess(
  intent: AdapterNormalizedCommandIntent,
  result: Record<string, unknown>,
): AdapterCommandFacadeResult {
  const value = isPlainRecord(result.value) ? result.value : result;
  rejectUnsafeCommandFields(value, 'Core command facade success');

  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    preferDefined(getRecordValue(value, 'correlationRef'), intent.correlationRef),
    'correlation',
    'Command result correlationRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    preferDefined(getRecordValue(value, 'detailsRef'), intent.detailsRef),
    'details',
    'Command result detailsRef',
  );
  const resultRef = normalizeOptionalSafeCommandRef(getRecordValue(value, 'resultRef'), 'Command resultRef');
  const message = normalizeOptionalBoundedText(
    getRecordValue(value, 'message'),
    'Command result message',
    MAX_COMMAND_RESULT_MESSAGE_LENGTH,
  );

  return Object.freeze({
    kind: ADAPTER_COMMAND_RESULT_KIND,
    intentRef: intent.intentRef,
    target: intent.target,
    commandName: intent.commandName,
    status: normalizeResultStatus(getRecordValue(value, 'status')),
    ...(resultRef === undefined ? {} : { resultRef }),
    ...(message === undefined ? {} : { message }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
  });
}

function mapCommandFailureCode(code: unknown): AdapterSafeErrorCode {
  switch (code) {
    case 'invalid-input':
      return 'invalid-input';
    case 'not-found':
      return 'not-found';
    case 'conflict':
      return 'conflict';
    case 'unauthorized':
    case 'permission-denied':
    case 'token-invalid':
    case 'token-consumed':
      return 'forbidden';
    case 'forbidden':
      return 'forbidden';
    case 'not-ready':
    case 'dependency-missing':
      return 'dependency-missing';
    case 'dependency-timeout':
    case 'timeout':
    case 'dependency-failed':
      return 'dependency-failed';
    case 'not-implemented':
      return 'not-implemented';
    case 'internal':
      return 'internal';
    default:
      return 'dependency-failed';
  }
}

function createCommandFailure(
  input: CommandFailureInput,
): AdapterOperationResult<AdapterCommandFacadeResult> {
  return adapterErr(
    createAdapterSafeError({
      code: input.code,
      message: normalizeCommandMessage(input.message, CORE_COMMAND_FAILURE_MESSAGE, 240),
      ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    }),
    input.context,
  );
}

function normalizeCommandBoundaryFailure(
  intent: AdapterNormalizedCommandIntent,
  result: Record<string, unknown>,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<AdapterCommandFacadeResult> {
  const errorRecord = isPlainRecord(result.error) ? result.error : result;
  rejectUnsafeCommandFields(errorRecord, 'Core command facade failure');

  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    preferDefined(errorRecord.correlationRef, intent.correlationRef),
    'correlation',
    'Command failure correlationRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    preferDefined(errorRecord.detailsRef, intent.detailsRef),
    'details',
    'Command failure detailsRef',
  );
  const retryable = typeof errorRecord.retryable === 'boolean' ? errorRecord.retryable : undefined;
  const message = normalizeCommandMessage(errorRecord.message, CORE_COMMAND_FAILURE_MESSAGE, 240);

  return createCommandFailure({
    code: mapCommandFailureCode(errorRecord.code ?? result.code ?? result.status),
    message,
    context,
    retryable,
    detailsRef,
    correlationRef,
  });
}

function normalizeCommandBoundaryResult(
  intent: AdapterNormalizedCommandIntent,
  result: unknown,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<AdapterCommandFacadeResult> {
  assertPlainRecord(result, 'Core command facade result');
  rejectUnsafeCommandFields(result, 'Core command facade result');

  if (result.ok === false) {
    return normalizeCommandBoundaryFailure(intent, result, context);
  }

  if (result.ok === true || result.status !== undefined || result.value !== undefined) {
    return adapterOk(normalizeCommandBoundarySuccess(intent, result), context);
  }

  throw new TypeError('Core command facade result must be a safe envelope.');
}

function invalidCommandInputResult(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<AdapterCommandFacadeResult> {
  return createCommandFailure({
    code: 'invalid-input',
    message,
    context,
  });
}

function getAvailableCommandFacadeMethods(
  facade?: AdapterCorePublicFacade,
): readonly AdapterCommandFacadeMethodName[] {
  if (facade === undefined) {
    return Object.freeze([]);
  }

  return Object.freeze(
    REQUIRED_COMMAND_FACADE_METHOD_NAMES.filter((methodName) => typeof facade[methodName] === 'function'),
  );
}

export function getMissingRequiredAdapterCommandFacadeMethods(
  facade?: AdapterCorePublicFacade,
): readonly AdapterCommandFacadeMethodName[] {
  const configuredMethods = new Set<AdapterCommandFacadeMethodName>(getAvailableCommandFacadeMethods(facade));

  return Object.freeze(
    REQUIRED_COMMAND_FACADE_METHOD_NAMES.filter((methodName) => !configuredMethods.has(methodName)),
  );
}

export function summarizeAdapterCommandFacadeReadiness(input: {
  readonly facade?: AdapterCorePublicFacade | undefined;
} = {}): OpenClawTelegramAdapterReadiness {
  const availableMethods = getAvailableCommandFacadeMethods(input.facade);
  const missingRequiredMethods = getMissingRequiredAdapterCommandFacadeMethods(input.facade);
  const checks = [
    createAdapterReadinessCheck({
      component: 'core.command-facade',
      status: input.facade === undefined ? 'fail' : 'pass',
      message:
        input.facade === undefined
          ? 'Core command facade is not injected.'
          : 'Core command facade is injected as an adapter-owned boundary.',
    }),
    createAdapterReadinessCheck({
      component: 'core.command-facade.methods',
      status: missingRequiredMethods.length === 0 ? 'pass' : 'fail',
      message:
        missingRequiredMethods.length === 0
          ? 'Required command facade methods are available.'
          : `Missing required command facade methods: ${missingRequiredMethods.join(', ')}.`,
    }),
    ...availableMethods.map((methodName) =>
      createAdapterReadinessCheck({
        component: `core.command-facade.${methodName}`,
        status: 'pass',
        message: `Command facade method ${methodName} is available.`,
      }),
    ),
  ];

  return summarizeAdapterReadiness({ checks });
}

export function describeAdapterCommandFacade(input: {
  readonly facade?: AdapterCorePublicFacade | undefined;
} = {}): AdapterCommandFacadeDescriptor {
  const configuredMethods = getAvailableCommandFacadeMethods(input.facade);
  const missingRequiredMethods = getMissingRequiredAdapterCommandFacadeMethods(input.facade);

  return Object.freeze({
    kind: ADAPTER_COMMAND_FACADE_KIND,
    configuredMethods,
    missingRequiredMethods,
    readiness: summarizeAdapterCommandFacadeReadiness(input),
  });
}

export async function submitAdapterCommandIntent(
  input: AdapterCommandFacadeDispatchInput,
): Promise<AdapterOperationResult<AdapterCommandFacadeResult>> {
  let normalized: NormalizedCommandIntentWithCoreInput;
  try {
    normalized = normalizeCommandIntent(input.intent);
  } catch (error) {
    return invalidCommandInputResult(
      error instanceof Error ? error.message : 'Command intent is invalid.',
      input.context,
    );
  }

  const methodName = commandTargetToMethodName(normalized.intent.target);
  const method = input.facade?.[methodName];
  if (typeof method !== 'function') {
    return createCommandFailure({
      code: 'dependency-missing',
      message: `Core command facade method ${methodName} is not configured.`,
      context: input.context,
      retryable: true,
      correlationRef: normalized.intent.correlationRef,
      detailsRef: normalized.intent.detailsRef,
    });
  }

  let boundaryResult: unknown;
  try {
    boundaryResult = await Promise.resolve(method(normalized.coreInput, input.context));
  } catch {
    return createCommandFailure({
      code: 'dependency-failed',
      message: 'Core command facade threw or rejected during dispatch.',
      context: input.context,
      correlationRef: normalized.intent.correlationRef,
      detailsRef: normalized.intent.detailsRef,
    });
  }

  try {
    return normalizeCommandBoundaryResult(normalized.intent, boundaryResult, input.context);
  } catch {
    return createCommandFailure({
      code: 'dependency-failed',
      message: CORE_COMMAND_INVALID_RESULT_MESSAGE,
      context: input.context,
      correlationRef: normalized.intent.correlationRef,
      detailsRef: normalized.intent.detailsRef,
    });
  }
}

export function createAdapterCommandFacade(input: AdapterCommandFacadeInput = {}): AdapterCommandFacade {
  return Object.freeze({
    submit(
      intent: AdapterNormalizedCommandIntent,
      context?: AdapterOperationContext,
    ): Promise<AdapterOperationResult<AdapterCommandFacadeResult>> {
      return submitAdapterCommandIntent({
        facade: input.facade,
        intent,
        context: context ?? input.context,
      });
    },

    describe(): AdapterCommandFacadeDescriptor {
      return describeAdapterCommandFacade({ facade: input.facade });
    },

    getReadiness(): OpenClawTelegramAdapterReadiness {
      return summarizeAdapterCommandFacadeReadiness({ facade: input.facade });
    },
  });
}
