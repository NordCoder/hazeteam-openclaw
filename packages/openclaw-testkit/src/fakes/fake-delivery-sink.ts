const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const MAX_SAFE_REF_LENGTH = 256;
const MAX_SAFE_TEXT_LENGTH = 4000;
const MAX_SAFE_LABEL_LENGTH = 80;
const DEFAULT_FAILURE_MESSAGE = 'Telegram delivery failed';
const ASSIGNMENT_VALUE_PATTERN = /\b[A-Za-z][A-Za-z0-9_-]{0,40}\b\s*[:=]\s*\S+/gu;

const DELIVERY_CONTENT_FORMATS = ['plain', 'markdown', 'html'] as const;
const ACTION_BUTTON_STYLES = ['primary', 'secondary', 'danger'] as const;
const DELIVERY_ERROR_CODES = [
  'invalid-request',
  'target-not-found',
  'provider-unavailable',
  'provider-rejected',
  'rate-limited',
  'timeout',
  'conflict',
  'internal',
] as const;

export type FakeTelegramDeliveryContentFormat = (typeof DELIVERY_CONTENT_FORMATS)[number];
export type FakeTelegramActionButtonStyle = (typeof ACTION_BUTTON_STYLES)[number];
export type FakeTelegramDeliverySafeErrorCode = (typeof DELIVERY_ERROR_CODES)[number];

export type FakeTelegramDeliveryChannelId = `telegram-channel:${string}`;
export type FakeTelegramDeliveryChatId = `telegram-chat:${string}`;
export type FakeTelegramDeliveryMessageThreadId = `telegram-thread:${string}`;
export type FakeTelegramDeliveryMessageId = `telegram-message:${string}`;
export type FakeTelegramActionButtonPayload = `hz:${string}`;

export interface FakeTelegramDeliveryTarget {
  readonly channelId: FakeTelegramDeliveryChannelId;
  readonly chatId: FakeTelegramDeliveryChatId;
  readonly messageThreadId: FakeTelegramDeliveryMessageThreadId;
  readonly workspaceRef?: string | undefined;
  readonly agentRef?: string | undefined;
}

export interface FakeTelegramActionButton {
  readonly label: string;
  readonly payload: FakeTelegramActionButtonPayload;
  readonly style?: FakeTelegramActionButtonStyle | undefined;
}

export interface FakeTelegramActionButtonGroup {
  readonly buttons: readonly FakeTelegramActionButton[];
}

export interface FakeTelegramDeliveryTextContent {
  readonly format: FakeTelegramDeliveryContentFormat;
  readonly text: string;
  readonly buttonGroups?: readonly FakeTelegramActionButtonGroup[] | undefined;
}

export interface FakeTelegramDeliveryRequest {
  readonly deliveryRef: string;
  readonly target: FakeTelegramDeliveryTarget;
  readonly content: FakeTelegramDeliveryTextContent;
  readonly correlationRef?: string | undefined;
}

export interface FakeTelegramExternalMessageRef {
  readonly channelId: FakeTelegramDeliveryChannelId;
  readonly chatId: FakeTelegramDeliveryChatId;
  readonly messageThreadId: FakeTelegramDeliveryMessageThreadId;
  readonly messageId: FakeTelegramDeliveryMessageId;
  readonly workspaceRef?: string | undefined;
  readonly agentRef?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeTelegramDeliverySafeError {
  readonly code: FakeTelegramDeliverySafeErrorCode;
  readonly message: string;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeTelegramDeliverySuccess {
  readonly ok: true;
  readonly deliveryRef: string;
  readonly externalMessageRef: FakeTelegramExternalMessageRef;
  readonly correlationRef?: string | undefined;
}

export interface FakeTelegramDeliveryFailure {
  readonly ok: false;
  readonly deliveryRef: string;
  readonly error: FakeTelegramDeliverySafeError;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export type FakeTelegramDeliveryResult =
  | FakeTelegramDeliverySuccess
  | FakeTelegramDeliveryFailure;

export interface FakeTelegramDeliverySuccessInput {
  readonly request?: FakeTelegramDeliveryRequest | undefined;
  readonly deliveryRef?: string | undefined;
  readonly target?: FakeTelegramDeliveryTarget | undefined;
  readonly messageId?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeTelegramDeliveryFailureInput {
  readonly request?: FakeTelegramDeliveryRequest | undefined;
  readonly deliveryRef?: string | undefined;
  readonly code?: FakeTelegramDeliverySafeErrorCode | undefined;
  readonly message?: string | undefined;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeTelegramDeliverySinkOptions {
  readonly outcome?: 'success' | 'failure' | undefined;
  readonly results?: readonly FakeTelegramDeliveryResult[] | undefined;
  readonly failureCode?: FakeTelegramDeliverySafeErrorCode | undefined;
  readonly failureMessage?: string | undefined;
  readonly retryable?: boolean | undefined;
}

export interface FakeTelegramDeliverySink {
  readonly submit: (request: FakeTelegramDeliveryRequest) => FakeTelegramDeliveryResult;
  readonly getRequests: () => readonly FakeTelegramDeliveryRequest[];
  readonly getResults: () => readonly FakeTelegramDeliveryResult[];
}

function isOneOf<T extends readonly string[]>(values: T, candidate: string): candidate is T[number] {
  return values.includes(candidate);
}

function sanitizeText(input: unknown, label: string, maxLength = MAX_SAFE_TEXT_LENGTH): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(ASSIGNMENT_VALUE_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function sanitizeRef(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_SAFE_REF_LENGTH ||
    !SAFE_REF_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a safe reference.`);
  }

  return normalized;
}

function sanitizePrefixedRef<P extends string>(input: unknown, prefix: P, label: string): `${P}${string}` {
  const normalized = sanitizeRef(input, label);

  if (!normalized.startsWith(prefix)) {
    throw new TypeError(`${label} must start with ${prefix}.`);
  }

  return normalized as `${P}${string}`;
}

function sanitizeOptionalRef(input: string | undefined, label: string): string | undefined {
  return input === undefined ? undefined : sanitizeRef(input, label);
}

function normalizeTarget(input: FakeTelegramDeliveryTarget): FakeTelegramDeliveryTarget {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Fake Telegram delivery target must be an object.');
  }

  const workspaceRef = sanitizeOptionalRef(input.workspaceRef, 'Fake Telegram delivery workspaceRef');
  const agentRef = sanitizeOptionalRef(input.agentRef, 'Fake Telegram delivery agentRef');

  return Object.freeze({
    channelId: sanitizePrefixedRef(
      input.channelId,
      'telegram-channel:',
      'Fake Telegram delivery channelId',
    ),
    chatId: sanitizePrefixedRef(input.chatId, 'telegram-chat:', 'Fake Telegram delivery chatId'),
    messageThreadId: sanitizePrefixedRef(
      input.messageThreadId,
      'telegram-thread:',
      'Fake Telegram delivery messageThreadId',
    ),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
  });
}

function normalizeButton(input: FakeTelegramActionButton): FakeTelegramActionButton {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Fake Telegram action button must be an object.');
  }

  if (!isOneOf(ACTION_BUTTON_STYLES, input.style ?? 'secondary')) {
    throw new TypeError('Unsupported fake Telegram action button style.');
  }

  return Object.freeze({
    label: sanitizeText(input.label, 'Fake Telegram action button label', MAX_SAFE_LABEL_LENGTH),
    payload: sanitizePrefixedRef(input.payload, 'hz:', 'Fake Telegram action button payload'),
    ...(input.style === undefined ? {} : { style: input.style }),
  });
}

function normalizeButtonGroups(
  input: readonly FakeTelegramActionButtonGroup[] | undefined,
): readonly FakeTelegramActionButtonGroup[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  return Object.freeze(
    input.map((group) => {
      if (typeof group !== 'object' || group === null || !Array.isArray(group.buttons)) {
        throw new TypeError('Fake Telegram action button group must include buttons.');
      }

      return Object.freeze({
        buttons: Object.freeze(group.buttons.map((button) => normalizeButton(button))),
      });
    }),
  );
}

function normalizeContent(input: FakeTelegramDeliveryTextContent): FakeTelegramDeliveryTextContent {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Fake Telegram delivery content must be an object.');
  }

  if (!isOneOf(DELIVERY_CONTENT_FORMATS, input.format)) {
    throw new TypeError('Unsupported fake Telegram delivery content format.');
  }

  const buttonGroups = normalizeButtonGroups(input.buttonGroups);

  return Object.freeze({
    format: input.format,
    text: sanitizeText(input.text, 'Fake Telegram delivery text'),
    ...(buttonGroups === undefined ? {} : { buttonGroups }),
  });
}

function normalizeRequest(input: FakeTelegramDeliveryRequest): FakeTelegramDeliveryRequest {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Fake Telegram delivery request must be an object.');
  }

  const correlationRef = sanitizeOptionalRef(input.correlationRef, 'Fake Telegram delivery correlationRef');

  return Object.freeze({
    deliveryRef: sanitizeRef(input.deliveryRef, 'Fake Telegram deliveryRef'),
    target: normalizeTarget(input.target),
    content: normalizeContent(input.content),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeFailureCode(code: FakeTelegramDeliverySafeErrorCode): FakeTelegramDeliverySafeErrorCode {
  if (!isOneOf(DELIVERY_ERROR_CODES, code)) {
    throw new TypeError('Unsupported fake Telegram delivery failure code.');
  }

  return code;
}

function defaultMessageId(index: number): FakeTelegramDeliveryMessageId {
  return `telegram-message:fake-${index}`;
}

export function createFakeTelegramDeliverySuccess(
  input: FakeTelegramDeliverySuccessInput,
): FakeTelegramDeliverySuccess {
  const request = input.request === undefined ? undefined : normalizeRequest(input.request);
  const target = request?.target ?? (input.target === undefined ? undefined : normalizeTarget(input.target));

  if (target === undefined) {
    throw new TypeError('Fake Telegram delivery success requires a target or request.');
  }

  const deliveryRef = sanitizeRef(
    input.deliveryRef ?? request?.deliveryRef,
    'Fake Telegram delivery success deliveryRef',
  );
  const correlationRef = sanitizeOptionalRef(
    input.correlationRef ?? request?.correlationRef,
    'Fake Telegram delivery success correlationRef',
  );
  const messageId = sanitizePrefixedRef(
    input.messageId ?? defaultMessageId(1),
    'telegram-message:',
    'Fake Telegram delivery messageId',
  );

  return Object.freeze({
    ok: true,
    deliveryRef,
    externalMessageRef: Object.freeze({
      channelId: target.channelId,
      chatId: target.chatId,
      messageThreadId: target.messageThreadId,
      messageId,
      ...(target.workspaceRef === undefined ? {} : { workspaceRef: target.workspaceRef }),
      ...(target.agentRef === undefined ? {} : { agentRef: target.agentRef }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function createFakeTelegramDeliveryFailure(
  input: FakeTelegramDeliveryFailureInput,
): FakeTelegramDeliveryFailure {
  const request = input.request === undefined ? undefined : normalizeRequest(input.request);
  const deliveryRef = sanitizeRef(
    input.deliveryRef ?? request?.deliveryRef,
    'Fake Telegram delivery failure deliveryRef',
  );
  const correlationRef = sanitizeOptionalRef(
    input.correlationRef ?? request?.correlationRef,
    'Fake Telegram delivery failure correlationRef',
  );
  const detailsRef = sanitizeOptionalRef(input.detailsRef, 'Fake Telegram delivery failure detailsRef');
  const retryable = input.retryable ?? false;
  const code = normalizeFailureCode(input.code ?? 'provider-unavailable');

  return Object.freeze({
    ok: false,
    deliveryRef,
    error: Object.freeze({
      code,
      message: sanitizeText(input.message ?? DEFAULT_FAILURE_MESSAGE, 'Fake Telegram delivery failure message', 240),
      retryable,
      ...(detailsRef === undefined ? {} : { detailsRef }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    }),
    retryable,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function resultForRequest(
  request: FakeTelegramDeliveryRequest,
  options: FakeTelegramDeliverySinkOptions,
  index: number,
): FakeTelegramDeliveryResult {
  const configuredResult = options.results?.[Math.min(index - 1, options.results.length - 1)];

  if (configuredResult !== undefined) {
    if (configuredResult.ok) {
      return createFakeTelegramDeliverySuccess({
        request,
        messageId: configuredResult.externalMessageRef.messageId,
        correlationRef: configuredResult.correlationRef,
      });
    }

    return createFakeTelegramDeliveryFailure({
      request,
      code: configuredResult.error.code,
      message: configuredResult.error.message,
      retryable: configuredResult.retryable ?? configuredResult.error.retryable,
      detailsRef: configuredResult.detailsRef ?? configuredResult.error.detailsRef,
      correlationRef: configuredResult.correlationRef ?? configuredResult.error.correlationRef,
    });
  }

  if (options.outcome === 'failure') {
    return createFakeTelegramDeliveryFailure({
      request,
      code: options.failureCode,
      message: options.failureMessage,
      retryable: options.retryable,
    });
  }

  return createFakeTelegramDeliverySuccess({
    request,
    messageId: defaultMessageId(index),
  });
}

export function createFakeTelegramDeliverySink(
  options: FakeTelegramDeliverySinkOptions = {},
): FakeTelegramDeliverySink {
  const requests: FakeTelegramDeliveryRequest[] = [];
  const results: FakeTelegramDeliveryResult[] = [];

  return Object.freeze({
    submit(request: FakeTelegramDeliveryRequest): FakeTelegramDeliveryResult {
      const normalizedRequest = normalizeRequest(request);
      requests.push(normalizedRequest);

      const result = resultForRequest(normalizedRequest, options, requests.length);
      results.push(result);

      return result;
    },

    getRequests(): readonly FakeTelegramDeliveryRequest[] {
      return Object.freeze([...requests]);
    },

    getResults(): readonly FakeTelegramDeliveryResult[] {
      return Object.freeze([...results]);
    },
  });
}
