import type { AdapterOperationContext } from '../../contracts/context.js';
import {
  createTelegramActionButton,
  createTelegramDeliverySafeError,
  createTelegramExternalMessageRef,
  type TelegramActionButtonGroup,
  type TelegramDeliveryChatId,
  type TelegramDeliveryChannelId,
  type TelegramDeliveryContentFormat,
  type TelegramDeliveryFailure,
  type TelegramDeliveryMessageId,
  type TelegramDeliveryMessageThreadId,
  type TelegramDeliveryRequest,
  type TelegramDeliveryResult,
  type TelegramDeliverySafeErrorCode,
  type TelegramDeliverySuccess,
  type TelegramDeliveryTarget,
  type TelegramDeliveryTextContent,
} from '../../contracts/delivery.js';
import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
  type AdapterOperationResult,
} from '../../contracts/result.js';
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
} from '../../contracts/refs.js';

const TELEGRAM_REF_VALUE_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const MAX_TELEGRAM_REF_LENGTH = 256;
const MAX_DELIVERY_TEXT_LENGTH = 4_096;
const DEFAULT_PORT_FAILURE_MESSAGE = 'OpenClaw delivery port failed';
const DEFAULT_PORT_THROWN_MESSAGE = 'OpenClaw delivery port failed';
const TELEGRAM_DELIVERY_CONTENT_FORMATS = ['plain', 'markdown', 'html'] as const satisfies readonly TelegramDeliveryContentFormat[];
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
const UNSAFE_OPENCLAW_DELIVERY_FIELD_NAMES = new Set([
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
  'rawdeliveryresponse',
  'rawerror',
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
const UNSAFE_OPENCLAW_DELIVERY_FIELD_NAME_PARTS = [
  ['api', 'key'],
  ['auth', 'orization'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['pass', 'wd'],
  ['sec', 'ret'],
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

type MaybePromise<T> = T | Promise<T>;

export interface OpenClawDeliveryPortSendMessageRequest {
  readonly deliveryRef: AdapterOperationRef;
  readonly channelId: TelegramDeliveryChannelId;
  readonly chatId: TelegramDeliveryChatId;
  readonly messageThreadId: TelegramDeliveryMessageThreadId;
  readonly format: TelegramDeliveryContentFormat;
  readonly text: string;
  readonly buttonGroups?: readonly TelegramActionButtonGroup[];
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly context?: AdapterOperationContext;
}

export interface OpenClawDeliveryPortSuccess {
  readonly ok: true;
  readonly messageId: TelegramDeliveryMessageId;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface OpenClawDeliveryPortFailureError {
  readonly code: TelegramDeliverySafeErrorCode;
  readonly message: unknown;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface OpenClawDeliveryPortFailure {
  readonly ok: false;
  readonly error: OpenClawDeliveryPortFailureError;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export type OpenClawDeliveryPortResult = OpenClawDeliveryPortSuccess | OpenClawDeliveryPortFailure;

export interface OpenClawDeliveryPort {
  readonly sendMessage: (
    request: OpenClawDeliveryPortSendMessageRequest,
  ) => MaybePromise<OpenClawDeliveryPortResult>;
}

export interface OpenClawDeliveryAdapter {
  readonly send: (request: TelegramDeliveryRequest) => Promise<AdapterOperationResult<TelegramDeliveryResult>>;
}

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isUnsafeOpenClawDeliveryFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_OPENCLAW_DELIVERY_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_OPENCLAW_DELIVERY_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function rejectUnsafeOpenClawDeliveryFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeOpenClawDeliveryFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeOpenClawDeliveryFieldName(fieldName)) {
      throw new TypeError(
        `${label} must not include raw provider, SDK, storage, delivery attempt, or sensitive fields.`,
      );
    }
    rejectUnsafeOpenClawDeliveryFields(value, label, seen);
  }
}

function redactSensitiveText(text: string): string {
  return SENSITIVE_TEXT_PATTERNS.reduce(
    (currentText, pattern) => currentText.replace(pattern, '[redacted]'),
    text,
  );
}

function normalizeBoundedText(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = redactSensitiveText(
    input.replace(/[\u0000-\u0008\u000B-\u001F\u007F]+/gu, ' ').trim(),
  );

  if (normalized.length === 0 || normalized.length > MAX_DELIVERY_TEXT_LENGTH) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
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
  assertPlainObject(target, 'OpenClaw delivery target');
  rejectUnsafeOpenClawDeliveryFields(target, 'OpenClaw delivery target');

  return Object.freeze({
    channelId: normalizePrefixedTelegramRef<TelegramDeliveryChannelId>(
      target.channelId,
      'telegram-channel:',
      'OpenClaw delivery target channelId',
    ),
    chatId: normalizePrefixedTelegramRef<TelegramDeliveryChatId>(
      target.chatId,
      'telegram-chat:',
      'OpenClaw delivery target chatId',
    ),
    messageThreadId: normalizePrefixedTelegramRef<TelegramDeliveryMessageThreadId>(
      target.messageThreadId,
      'telegram-thread:',
      'OpenClaw delivery target messageThreadId',
    ),
    ...(target.workspaceRef === undefined
      ? {}
      : {
          workspaceRef: normalizeAdapterRef<WorkspaceRef>(
            target.workspaceRef,
            'workspace',
            'OpenClaw delivery target workspaceRef',
          ),
        }),
    ...(target.agentRef === undefined
      ? {}
      : {
          agentRef: normalizeAdapterRef<AgentRef>(
            target.agentRef,
            'agent',
            'OpenClaw delivery target agentRef',
          ),
        }),
  });
}

function normalizeOperationContext(context: AdapterOperationContext): AdapterOperationContext {
  assertPlainObject(context, 'OpenClaw delivery operation context');
  rejectUnsafeOpenClawDeliveryFields(context, 'OpenClaw delivery operation context');

  return Object.freeze({
    operationRef: normalizeOperationRef(context.operationRef, 'OpenClaw delivery context operationRef'),
    correlationRef: normalizeCorrelationRef(
      context.correlationRef,
      'OpenClaw delivery context correlationRef',
    ),
    ...(context.workspaceRef === undefined
      ? {}
      : {
          workspaceRef: normalizeAdapterRef<WorkspaceRef>(
            context.workspaceRef,
            'workspace',
            'OpenClaw delivery context workspaceRef',
          ),
        }),
    ...(context.agentRef === undefined
      ? {}
      : {
          agentRef: normalizeAdapterRef<AgentRef>(
            context.agentRef,
            'agent',
            'OpenClaw delivery context agentRef',
          ),
        }),
    ...(context.actorRef === undefined
      ? {}
      : {
          actorRef: normalizeAdapterRef<ActorRef>(
            context.actorRef,
            'actor',
            'OpenClaw delivery context actorRef',
          ),
        }),
    ...(context.detailsRef === undefined
      ? {}
      : {
          detailsRef: normalizeAdapterRef<AdapterDetailsRef>(
            context.detailsRef,
            'details',
            'OpenClaw delivery context detailsRef',
          ),
        }),
    ...(context.rawDebugRef === undefined
      ? {}
      : {
          rawDebugRef: normalizeAdapterRef<AdapterRawDebugRef>(
            context.rawDebugRef,
            'raw-debug',
            'OpenClaw delivery context rawDebugRef',
          ),
        }),
  });
}

function normalizeDeliveryContentFormat(input: unknown): TelegramDeliveryContentFormat {
  if (
    typeof input !== 'string' ||
    !(TELEGRAM_DELIVERY_CONTENT_FORMATS as readonly string[]).includes(input)
  ) {
    throw new TypeError('OpenClaw delivery content format must be supported.');
  }

  return input as TelegramDeliveryContentFormat;
}

function normalizeButtonGroup(group: TelegramActionButtonGroup): TelegramActionButtonGroup {
  assertPlainObject(group, 'OpenClaw delivery button group');
  rejectUnsafeOpenClawDeliveryFields(group, 'OpenClaw delivery button group');

  if (!Array.isArray(group.buttons)) {
    throw new TypeError('OpenClaw delivery button group buttons must be an array.');
  }

  return Object.freeze({
    buttons: Object.freeze(
      group.buttons.map((button) =>
        createTelegramActionButton({
          label: button.label,
          payload: button.payload,
          ...(button.style === undefined ? {} : { style: button.style }),
        }),
      ),
    ),
  });
}

function normalizeDeliveryContent(content: TelegramDeliveryTextContent): TelegramDeliveryTextContent {
  assertPlainObject(content, 'OpenClaw delivery content');
  rejectUnsafeOpenClawDeliveryFields(content, 'OpenClaw delivery content');

  const buttonGroups = content.buttonGroups?.map(normalizeButtonGroup);

  return Object.freeze({
    format: normalizeDeliveryContentFormat(content.format),
    text: normalizeBoundedText(content.text, 'OpenClaw delivery content text'),
    ...(buttonGroups === undefined ? {} : { buttonGroups: Object.freeze(buttonGroups) }),
  });
}

function normalizeTelegramDeliveryRequest(request: TelegramDeliveryRequest): TelegramDeliveryRequest {
  assertPlainObject(request, 'OpenClaw delivery request');
  rejectUnsafeOpenClawDeliveryFields(request, 'OpenClaw delivery request');

  const context = request.context === undefined ? undefined : normalizeOperationContext(request.context);
  const correlationRef =
    request.correlationRef === undefined
      ? undefined
      : normalizeCorrelationRef(request.correlationRef, 'OpenClaw delivery request correlationRef');

  return Object.freeze({
    deliveryRef: normalizeOperationRef(request.deliveryRef, 'OpenClaw delivery request deliveryRef'),
    target: normalizeDeliveryTarget(request.target),
    content: normalizeDeliveryContent(request.content),
    ...(context === undefined ? {} : { context }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function isDeliverySafeErrorCode(code: string): code is TelegramDeliverySafeErrorCode {
  return (TELEGRAM_DELIVERY_SAFE_ERROR_CODES as readonly string[]).includes(code);
}

function normalizeDeliverySafeErrorCode(code: unknown): TelegramDeliverySafeErrorCode {
  if (typeof code !== 'string' || !isDeliverySafeErrorCode(code)) {
    throw new TypeError('OpenClaw delivery port failure has unsupported error code.');
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

function normalizePortMessageId(input: unknown): TelegramDeliveryMessageId {
  return normalizePrefixedTelegramRef<TelegramDeliveryMessageId>(
    input,
    'telegram-message:',
    'OpenClaw delivery port messageId',
  );
}

export function createOpenClawDeliveryPortRequest(
  request: TelegramDeliveryRequest,
): OpenClawDeliveryPortSendMessageRequest {
  const normalizedRequest = normalizeTelegramDeliveryRequest(request);

  return Object.freeze({
    deliveryRef: normalizedRequest.deliveryRef,
    channelId: normalizedRequest.target.channelId,
    chatId: normalizedRequest.target.chatId,
    messageThreadId: normalizedRequest.target.messageThreadId,
    format: normalizedRequest.content.format,
    text: normalizedRequest.content.text,
    ...(normalizedRequest.content.buttonGroups === undefined
      ? {}
      : { buttonGroups: normalizedRequest.content.buttonGroups }),
    ...(normalizedRequest.target.workspaceRef === undefined
      ? {}
      : { workspaceRef: normalizedRequest.target.workspaceRef }),
    ...(normalizedRequest.target.agentRef === undefined ? {} : { agentRef: normalizedRequest.target.agentRef }),
    ...(normalizedRequest.correlationRef === undefined
      ? {}
      : { correlationRef: normalizedRequest.correlationRef }),
    ...(normalizedRequest.context === undefined ? {} : { context: normalizedRequest.context }),
  });
}

function normalizePortSuccessResult(
  result: OpenClawDeliveryPortSuccess,
  request: TelegramDeliveryRequest,
): TelegramDeliverySuccess {
  assertPlainObject(result, 'OpenClaw delivery port success result');
  rejectUnsafeOpenClawDeliveryFields(result, 'OpenClaw delivery port success result');

  const correlationCandidate = result.correlationRef ?? request.correlationRef;
  const correlationRef =
    correlationCandidate === undefined
      ? undefined
      : normalizeCorrelationRef(correlationCandidate, 'OpenClaw delivery success correlationRef');
  const externalMessageRef = createTelegramExternalMessageRef({
    target: request.target,
    messageId: normalizePortMessageId(result.messageId),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });

  return Object.freeze({
    ok: true,
    deliveryRef: request.deliveryRef,
    externalMessageRef,
    ...(request.context === undefined ? {} : { context: request.context }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizePortFailureResult(
  result: OpenClawDeliveryPortFailure,
  request: TelegramDeliveryRequest,
): TelegramDeliveryFailure {
  assertPlainObject(result, 'OpenClaw delivery port failure result');
  assertPlainObject(result.error, 'OpenClaw delivery port failure error');
  rejectUnsafeOpenClawDeliveryFields(result, 'OpenClaw delivery port failure result');

  const retryable =
    normalizeOptionalBoolean(result.retryable, 'OpenClaw delivery failure retryable') ??
    normalizeOptionalBoolean(result.error.retryable, 'OpenClaw delivery failure error retryable') ??
    false;
  const detailsCandidate = result.detailsRef ?? result.error.detailsRef;
  const correlationCandidate = result.correlationRef ?? result.error.correlationRef ?? request.correlationRef;
  const detailsRef =
    detailsCandidate === undefined
      ? undefined
      : normalizeDetailsRef(detailsCandidate, 'OpenClaw delivery failure detailsRef');
  const correlationRef =
    correlationCandidate === undefined
      ? undefined
      : normalizeCorrelationRef(correlationCandidate, 'OpenClaw delivery failure correlationRef');
  const error = createTelegramDeliverySafeError({
    code: normalizeDeliverySafeErrorCode(result.error.code),
    message: result.error.message ?? DEFAULT_PORT_FAILURE_MESSAGE,
    retryable,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });

  return Object.freeze({
    ok: false,
    deliveryRef: request.deliveryRef,
    error,
    retryable,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(request.context === undefined ? {} : { context: request.context }),
  });
}

function normalizePortResult(
  result: OpenClawDeliveryPortResult,
  request: TelegramDeliveryRequest,
): TelegramDeliveryResult {
  assertPlainObject(result, 'OpenClaw delivery port result');

  if (result.ok === true) {
    return normalizePortSuccessResult(result, request);
  }

  if (result.ok === false) {
    return normalizePortFailureResult(result, request);
  }

  throw new TypeError('OpenClaw delivery port result must be a delivery result.');
}

function createPortThrownFailure(request: TelegramDeliveryRequest): TelegramDeliveryFailure {
  const error = createTelegramDeliverySafeError({
    code: 'provider-unavailable',
    message: DEFAULT_PORT_THROWN_MESSAGE,
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

function normalizePort(port: OpenClawDeliveryPort): OpenClawDeliveryPort {
  if (typeof port !== 'object' || port === null || typeof port.sendMessage !== 'function') {
    throw new TypeError('OpenClaw delivery adapter requires an injected delivery port.');
  }

  return port;
}

export async function sendOpenClawDeliveryRequest(input: {
  readonly request: TelegramDeliveryRequest;
  readonly port: OpenClawDeliveryPort;
}): Promise<AdapterOperationResult<TelegramDeliveryResult>> {
  let request: TelegramDeliveryRequest;
  try {
    request = normalizeTelegramDeliveryRequest(input.request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid OpenClaw delivery request';

    return adapterErr(
      createAdapterSafeError({
        code: 'invalid-input',
        message,
        retryable: false,
      }),
    );
  }

  let port: OpenClawDeliveryPort;
  try {
    port = normalizePort(input.port);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenClaw delivery port is missing';

    return adapterErr(
      createAdapterSafeError({
        code: 'dependency-missing',
        message,
        retryable: true,
        ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
      }),
      request.context,
    );
  }

  let portResult: OpenClawDeliveryPortResult;
  try {
    portResult = await port.sendMessage(createOpenClawDeliveryPortRequest(request));
  } catch {
    return adapterOk(createPortThrownFailure(request), request.context);
  }

  try {
    return adapterOk(normalizePortResult(portResult, request), request.context);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid OpenClaw delivery port result';

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
}

export function createOpenClawDeliveryAdapter(input: { readonly port: OpenClawDeliveryPort }): OpenClawDeliveryAdapter {
  const port = input.port;

  return Object.freeze({
    send(request: TelegramDeliveryRequest): Promise<AdapterOperationResult<TelegramDeliveryResult>> {
      return sendOpenClawDeliveryRequest({ request, port });
    },
  });
}
