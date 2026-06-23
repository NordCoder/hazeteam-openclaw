import type { AdapterOperationContext } from '../contracts/context.js';
import {
  createTelegramDeliverySafeError,
  createTelegramExternalMessageRef,
  type TelegramDeliveryChatId,
  type TelegramDeliveryChannelId,
  type TelegramDeliveryFailure,
  type TelegramDeliveryMessageId,
  type TelegramDeliveryMessageThreadId,
  type TelegramDeliveryRequest,
  type TelegramDeliveryResult,
  type TelegramDeliverySafeError,
  type TelegramDeliverySafeErrorCode,
  type TelegramDeliverySuccess,
  type TelegramDeliveryTarget,
} from '../contracts/delivery.js';
import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
  type AdapterOperationResult,
} from '../contracts/result.js';
import {
  parseOpenClawAdapterRef,
  type ActorRef,
  type AdapterCorrelationRef,
  type AdapterDetailsRef,
  type AdapterOperationRef,
  type AdapterRawDebugRef,
  type AgentRef,
  type OpenClawAdapterRefKind,
  type WorkspaceRef,
} from '../contracts/refs.js';
import {
  createTelegramRenderFragment,
  type TelegramRenderFragment,
} from '../rendering/telegram-renderer.js';

const TELEGRAM_REF_VALUE_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const MAX_TELEGRAM_REF_LENGTH = 256;
const TELEGRAM_DELIVERY_SAFE_ERROR_CODES = [
  'invalid-request',
  'target-not-found',
  'provider-unavailable',
  'provider-rejected',
  'rate-limited',
  'timeout',
  'conflict',
  'internal',
] as const satisfies readonly TelegramDeliverySafeErrorCode[];
const DEFAULT_SINK_THROWN_MESSAGE = 'Telegram delivery sink failed';

const UNSAFE_DELIVERY_FIELD_NAMES = new Set([
  'apikey',
  'approvalpayload',
  'authorization',
  'bottoken',
  'callbackquery',
  'credential',
  'deliveryattempt',
  'deploymenthandle',
  'filesystempath',
  'handler',
  'openclawclient',
  'password',
  'passwd',
  'platformhandle',
  'provider',
  'providerack',
  'providerobject',
  'rawcallbackbody',
  'rawopenclawevent',
  'rawproviderobject',
  'rawproviderresponse',
  'rawtelegramupdate',
  'rawtoolpayload',
  'rawupdate',
  'sdkclient',
  'secret',
  'stack',
  'storagepath',
  'storageroot',
  'telegramupdate',
  'toolpayload',
]);
const UNSAFE_DELIVERY_FIELD_NAME_PARTS = [
  ['api', 'key'],
  ['auth', 'orization'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['pass', 'wd'],
  ['sec', 'ret'],
] as const;

export interface TelegramDeliverySink {
  readonly submit: (request: TelegramDeliveryRequest) => TelegramDeliveryResult;
}

export interface TelegramDeliveryPump {
  readonly deliver: (
    input: TelegramDeliveryPumpRequestInput,
  ) => AdapterOperationResult<TelegramDeliveryPumpDecision>;
}

export interface TelegramDeliveryPumpFragmentInput {
  readonly deliveryRef: AdapterOperationRef;
  readonly target: TelegramDeliveryTarget;
  readonly fragment: TelegramRenderFragment;
  readonly context?: AdapterOperationContext;
  readonly correlationRef?: AdapterCorrelationRef;
}

export type TelegramDeliveryPumpRequestInput =
  | TelegramDeliveryRequest
  | TelegramDeliveryPumpFragmentInput;

export interface TelegramDeliveryPumpDeliveredDecision {
  readonly kind: 'delivered';
  readonly deliveryRef: AdapterOperationRef;
  readonly deliveryResult: TelegramDeliverySuccess;
  readonly externalMessageRef: TelegramDeliverySuccess['externalMessageRef'];
  readonly sinkCalled: true;
  readonly retryable: false;
  readonly shouldMarkDelivered: true;
  readonly shouldMarkFailed: false;
  readonly shouldRetry: false;
}

export interface TelegramDeliveryPumpFailedDecision {
  readonly kind: 'failed';
  readonly deliveryRef: AdapterOperationRef;
  readonly deliveryResult: TelegramDeliveryFailure;
  readonly error: TelegramDeliverySafeError;
  readonly sinkCalled: true;
  readonly retryable: boolean;
  readonly shouldMarkDelivered: false;
  readonly shouldMarkFailed: true;
  readonly shouldRetry: boolean;
}

export type TelegramDeliveryPumpDecision =
  | TelegramDeliveryPumpDeliveredDecision
  | TelegramDeliveryPumpFailedDecision;

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isUnsafeDeliveryFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_DELIVERY_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_DELIVERY_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function rejectUnsafeDeliveryFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeDeliveryFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeDeliveryFieldName(fieldName)) {
      throw new TypeError(
        `${label} must not include raw provider, SDK, storage, delivery attempt, or sensitive fields.`,
      );
    }
    rejectUnsafeDeliveryFields(value, label, seen);
  }
}

function normalizeAdapterRef<T extends string>(
  input: unknown,
  kind: OpenClawAdapterRefKind,
  label: string,
): T {
  const parsed = parseOpenClawAdapterRef(input);

  if (parsed?.kind !== kind) {
    throw new TypeError(`${label} must be a safe adapter ref.`);
  }

  return parsed.ref as T;
}

function normalizeOperationRef(input: unknown, label: string): AdapterOperationRef {
  return normalizeAdapterRef<AdapterOperationRef>(input, 'operation', label);
}

function normalizeCorrelationRef(input: unknown, label: string): AdapterCorrelationRef {
  return normalizeAdapterRef<AdapterCorrelationRef>(input, 'correlation', label);
}

function normalizeDetailsRef(input: unknown, label: string): AdapterDetailsRef {
  return normalizeAdapterRef<AdapterDetailsRef>(input, 'details', label);
}

function normalizePrefixedTelegramRef<T extends string>(input: unknown, prefix: string, label: string): T {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.replace(/[\u0000-\u001F\u007F]+/gu, ' ').replace(/\s+/gu, ' ').trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_TELEGRAM_REF_LENGTH ||
    !normalized.startsWith(prefix) ||
    !TELEGRAM_REF_VALUE_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a safe Telegram delivery ref.`);
  }

  return normalized as T;
}

function normalizeDeliveryTarget(target: TelegramDeliveryTarget): TelegramDeliveryTarget {
  assertPlainObject(target, 'Telegram delivery pump target');
  rejectUnsafeDeliveryFields(target, 'Telegram delivery pump target');

  return Object.freeze({
    channelId: normalizePrefixedTelegramRef<TelegramDeliveryChannelId>(
      target.channelId,
      'telegram-channel:',
      'Telegram delivery pump target channelId',
    ),
    chatId: normalizePrefixedTelegramRef<TelegramDeliveryChatId>(
      target.chatId,
      'telegram-chat:',
      'Telegram delivery pump target chatId',
    ),
    messageThreadId: normalizePrefixedTelegramRef<TelegramDeliveryMessageThreadId>(
      target.messageThreadId,
      'telegram-thread:',
      'Telegram delivery pump target messageThreadId',
    ),
    ...(target.workspaceRef === undefined
      ? {}
      : {
          workspaceRef: normalizeAdapterRef<WorkspaceRef>(
            target.workspaceRef,
            'workspace',
            'Telegram delivery pump target workspaceRef',
          ),
        }),
    ...(target.agentRef === undefined
      ? {}
      : {
          agentRef: normalizeAdapterRef<AgentRef>(
            target.agentRef,
            'agent',
            'Telegram delivery pump target agentRef',
          ),
        }),
  });
}

function normalizeOperationContext(context: AdapterOperationContext): AdapterOperationContext {
  assertPlainObject(context, 'Telegram delivery pump operation context');
  rejectUnsafeDeliveryFields(context, 'Telegram delivery pump operation context');

  return Object.freeze({
    operationRef: normalizeOperationRef(context.operationRef, 'Telegram delivery pump context operationRef'),
    correlationRef: normalizeCorrelationRef(
      context.correlationRef,
      'Telegram delivery pump context correlationRef',
    ),
    ...(context.workspaceRef === undefined
      ? {}
      : {
          workspaceRef: normalizeAdapterRef<WorkspaceRef>(
            context.workspaceRef,
            'workspace',
            'Telegram delivery pump context workspaceRef',
          ),
        }),
    ...(context.agentRef === undefined
      ? {}
      : {
          agentRef: normalizeAdapterRef<AgentRef>(
            context.agentRef,
            'agent',
            'Telegram delivery pump context agentRef',
          ),
        }),
    ...(context.actorRef === undefined
      ? {}
      : {
          actorRef: normalizeAdapterRef<ActorRef>(
            context.actorRef,
            'actor',
            'Telegram delivery pump context actorRef',
          ),
        }),
    ...(context.detailsRef === undefined
      ? {}
      : {
          detailsRef: normalizeAdapterRef<AdapterDetailsRef>(
            context.detailsRef,
            'details',
            'Telegram delivery pump context detailsRef',
          ),
        }),
    ...(context.rawDebugRef === undefined
      ? {}
      : {
          rawDebugRef: normalizeAdapterRef<AdapterRawDebugRef>(
            context.rawDebugRef,
            'raw-debug',
            'Telegram delivery pump context rawDebugRef',
          ),
        }),
  });
}

function hasFragment(
  input: TelegramDeliveryPumpRequestInput & Record<string, unknown>,
): input is TelegramDeliveryPumpFragmentInput & Record<string, unknown> {
  return 'fragment' in input;
}

export function createTelegramDeliveryPumpRequest(
  input: TelegramDeliveryPumpRequestInput,
): TelegramDeliveryRequest {
  assertPlainObject(input, 'Telegram delivery pump request input');
  rejectUnsafeDeliveryFields(input, 'Telegram delivery pump request input');

  if (hasFragment(input)) {
    const fragment = createTelegramRenderFragment(input.fragment.content);
    const context = input.context === undefined ? undefined : normalizeOperationContext(input.context);
    const correlationRef =
      input.correlationRef === undefined
        ? undefined
        : normalizeCorrelationRef(input.correlationRef, 'Telegram delivery pump correlationRef');

    return Object.freeze({
      deliveryRef: normalizeOperationRef(input.deliveryRef, 'Telegram delivery pump deliveryRef'),
      target: normalizeDeliveryTarget(input.target),
      content: fragment.content,
      ...(context === undefined ? {} : { context }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    });
  }

  const context = input.context === undefined ? undefined : normalizeOperationContext(input.context);
  const correlationRef =
    input.correlationRef === undefined
      ? undefined
      : normalizeCorrelationRef(input.correlationRef, 'Telegram delivery pump correlationRef');
  const fragment = createTelegramRenderFragment(input.content);

  return Object.freeze({
    deliveryRef: normalizeOperationRef(input.deliveryRef, 'Telegram delivery pump deliveryRef'),
    target: normalizeDeliveryTarget(input.target),
    content: fragment.content,
    ...(context === undefined ? {} : { context }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function isDeliverySafeErrorCode(code: string): code is TelegramDeliverySafeErrorCode {
  return (TELEGRAM_DELIVERY_SAFE_ERROR_CODES as readonly string[]).includes(code);
}

function normalizeDeliverySafeErrorCode(code: unknown): TelegramDeliverySafeErrorCode {
  if (typeof code !== 'string' || !isDeliverySafeErrorCode(code)) {
    throw new TypeError('Telegram delivery pump sink result has unsupported error code.');
  }

  return code;
}

function normalizeOptionalBoolean(input: unknown, label: string): boolean | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (typeof input !== 'boolean') {
    throw new TypeError(`${label} must be a boolean.`);
  }

  return input;
}

function assertSameDeliveryRef(actual: AdapterOperationRef, expected: AdapterOperationRef): void {
  if (actual !== expected) {
    throw new TypeError('Telegram delivery pump sink result deliveryRef must match the request.');
  }
}

function assertSameTarget(
  actual: TelegramDeliverySuccess['externalMessageRef'],
  expected: TelegramDeliveryTarget,
): void {
  if (
    actual.channelId !== expected.channelId ||
    actual.chatId !== expected.chatId ||
    actual.messageThreadId !== expected.messageThreadId ||
    actual.workspaceRef !== expected.workspaceRef ||
    actual.agentRef !== expected.agentRef
  ) {
    throw new TypeError('Telegram delivery pump sink result target must match the request target.');
  }
}

function normalizeSuccessResult(
  result: TelegramDeliverySuccess,
  request: TelegramDeliveryRequest,
): TelegramDeliverySuccess {
  assertPlainObject(result, 'Telegram delivery pump sink success result');
  assertPlainObject(result.externalMessageRef, 'Telegram delivery pump external message ref');

  const deliveryRef = normalizeOperationRef(
    result.deliveryRef,
    'Telegram delivery pump success deliveryRef',
  );
  assertSameDeliveryRef(deliveryRef, request.deliveryRef);

  const externalMessageRef = Object.freeze({
    channelId: normalizePrefixedTelegramRef<TelegramDeliveryChannelId>(
      result.externalMessageRef.channelId,
      'telegram-channel:',
      'Telegram delivery pump external message channelId',
    ),
    chatId: normalizePrefixedTelegramRef<TelegramDeliveryChatId>(
      result.externalMessageRef.chatId,
      'telegram-chat:',
      'Telegram delivery pump external message chatId',
    ),
    messageThreadId: normalizePrefixedTelegramRef<TelegramDeliveryMessageThreadId>(
      result.externalMessageRef.messageThreadId,
      'telegram-thread:',
      'Telegram delivery pump external messageThreadId',
    ),
    messageId: normalizePrefixedTelegramRef<TelegramDeliveryMessageId>(
      result.externalMessageRef.messageId,
      'telegram-message:',
      'Telegram delivery pump external messageId',
    ),
    ...(result.externalMessageRef.workspaceRef === undefined
      ? {}
      : {
          workspaceRef: normalizeAdapterRef<WorkspaceRef>(
            result.externalMessageRef.workspaceRef,
            'workspace',
            'Telegram delivery pump external workspaceRef',
          ),
        }),
    ...(result.externalMessageRef.agentRef === undefined
      ? {}
      : {
          agentRef: normalizeAdapterRef<AgentRef>(
            result.externalMessageRef.agentRef,
            'agent',
            'Telegram delivery pump external agentRef',
          ),
        }),
    ...(result.externalMessageRef.correlationRef === undefined
      ? {}
      : {
          correlationRef: normalizeCorrelationRef(
            result.externalMessageRef.correlationRef,
            'Telegram delivery pump external correlationRef',
          ),
        }),
  });
  assertSameTarget(externalMessageRef, request.target);

  const correlationCandidate = result.correlationRef ?? externalMessageRef.correlationRef ?? request.correlationRef;
  const correlationRef =
    correlationCandidate === undefined
      ? undefined
      : normalizeCorrelationRef(correlationCandidate, 'Telegram delivery pump success correlationRef');

  return Object.freeze({
    ok: true,
    deliveryRef,
    externalMessageRef: createTelegramExternalMessageRef({
      target: request.target,
      messageId: externalMessageRef.messageId,
      ...(correlationRef === undefined ? {} : { correlationRef }),
    }),
    ...(request.context === undefined ? {} : { context: request.context }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeFailureResult(
  result: TelegramDeliveryFailure,
  request: TelegramDeliveryRequest,
): TelegramDeliveryFailure {
  assertPlainObject(result, 'Telegram delivery pump sink failure result');
  assertPlainObject(result.error, 'Telegram delivery pump sink failure error');

  const deliveryRef = normalizeOperationRef(
    result.deliveryRef,
    'Telegram delivery pump failure deliveryRef',
  );
  assertSameDeliveryRef(deliveryRef, request.deliveryRef);

  const retryable =
    normalizeOptionalBoolean(result.retryable, 'Telegram delivery pump failure retryable') ??
    normalizeOptionalBoolean(result.error.retryable, 'Telegram delivery pump failure error retryable') ??
    false;
  const detailsCandidate = result.detailsRef ?? result.error.detailsRef;
  const correlationCandidate = result.correlationRef ?? result.error.correlationRef ?? request.correlationRef;
  const detailsRef =
    detailsCandidate === undefined
      ? undefined
      : normalizeDetailsRef(detailsCandidate, 'Telegram delivery pump failure detailsRef');
  const correlationRef =
    correlationCandidate === undefined
      ? undefined
      : normalizeCorrelationRef(correlationCandidate, 'Telegram delivery pump failure correlationRef');
  const error = createTelegramDeliverySafeError({
    code: normalizeDeliverySafeErrorCode(result.error.code),
    message: result.error.message,
    retryable,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });

  return Object.freeze({
    ok: false,
    deliveryRef,
    error,
    retryable,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(request.context === undefined ? {} : { context: request.context }),
  });
}

function normalizeSinkResult(
  result: TelegramDeliveryResult,
  request: TelegramDeliveryRequest,
): TelegramDeliveryResult {
  assertPlainObject(result, 'Telegram delivery pump sink result');
  rejectUnsafeDeliveryFields(result, 'Telegram delivery pump sink result');

  if (result.ok === true) {
    return normalizeSuccessResult(result, request);
  }

  if (result.ok === false) {
    return normalizeFailureResult(result, request);
  }

  throw new TypeError('Telegram delivery pump sink result must be a delivery result.');
}

function createDeliveredDecision(
  deliveryResult: TelegramDeliverySuccess,
): TelegramDeliveryPumpDeliveredDecision {
  return Object.freeze({
    kind: 'delivered',
    deliveryRef: deliveryResult.deliveryRef,
    deliveryResult,
    externalMessageRef: deliveryResult.externalMessageRef,
    sinkCalled: true,
    retryable: false,
    shouldMarkDelivered: true,
    shouldMarkFailed: false,
    shouldRetry: false,
  });
}

function createFailedDecision(
  deliveryResult: TelegramDeliveryFailure,
): TelegramDeliveryPumpFailedDecision {
  const retryable = deliveryResult.retryable ?? deliveryResult.error.retryable ?? false;

  return Object.freeze({
    kind: 'failed',
    deliveryRef: deliveryResult.deliveryRef,
    deliveryResult,
    error: deliveryResult.error,
    sinkCalled: true,
    retryable,
    shouldMarkDelivered: false,
    shouldMarkFailed: true,
    shouldRetry: retryable,
  });
}

function createSinkThrownFailure(
  request: TelegramDeliveryRequest,
): TelegramDeliveryFailure {
  const error = createTelegramDeliverySafeError({
    code: 'provider-unavailable',
    message: DEFAULT_SINK_THROWN_MESSAGE,
    retryable: true,
    ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
  });

  return Object.freeze({
    ok: false,
    deliveryRef: request.deliveryRef,
    error,
    retryable: true,
    ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
    ...(request.context === undefined ? {} : { context: request.context }),
  });
}

export function pumpTelegramDeliveryRequest(input: {
  readonly request: TelegramDeliveryPumpRequestInput;
  readonly sink: TelegramDeliverySink;
}): AdapterOperationResult<TelegramDeliveryPumpDecision> {
  let request: TelegramDeliveryRequest;

  try {
    request = createTelegramDeliveryPumpRequest(input.request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Telegram delivery pump request';

    return adapterErr(
      createAdapterSafeError({
        code: 'invalid-input',
        message,
      }),
    );
  }

  if (typeof input.sink !== 'object' || input.sink === null || typeof input.sink.submit !== 'function') {
    return adapterErr(
      createAdapterSafeError({
        code: 'dependency-missing',
        message: 'Telegram delivery pump requires an injected delivery sink.',
        retryable: true,
        ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
      }),
      request.context,
    );
  }

  let sinkResult: TelegramDeliveryResult;
  try {
    sinkResult = input.sink.submit(request);
  } catch {
    return adapterOk(createFailedDecision(createSinkThrownFailure(request)), request.context);
  }

  let normalizedResult: TelegramDeliveryResult;
  try {
    normalizedResult = normalizeSinkResult(sinkResult, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Telegram delivery sink result';

    return adapterErr(
      createAdapterSafeError({
        code: 'dependency-failed',
        message,
        retryable: true,
        ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
      }),
      request.context,
    );
  }

  if (normalizedResult.ok) {
    return adapterOk(createDeliveredDecision(normalizedResult), request.context);
  }

  return adapterOk(createFailedDecision(normalizedResult), request.context);
}

export function createTelegramDeliveryPump(input: {
  readonly sink: TelegramDeliverySink;
}): TelegramDeliveryPump {
  const sink = input.sink;

  return Object.freeze({
    deliver(request: TelegramDeliveryPumpRequestInput): AdapterOperationResult<TelegramDeliveryPumpDecision> {
      return pumpTelegramDeliveryRequest({ request, sink });
    },
  });
}
