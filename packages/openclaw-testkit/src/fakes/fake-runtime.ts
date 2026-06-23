const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const SAFE_KIND_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const MAX_SAFE_REF_LENGTH = 256;
const MAX_SAFE_KIND_LENGTH = 80;
const MAX_SAFE_TEXT_LENGTH = 1000;
const DEFAULT_RUNTIME_FAILURE_MESSAGE = 'Fake runtime dispatch failed';
const ASSIGNMENT_VALUE_PATTERN = /\b[A-Za-z][A-Za-z0-9_-]{0,40}\b\s*[:=]\s*\S+/gu;

const RUNTIME_ERROR_CODES = [
  'invalid-input',
  'runtime-unavailable',
  'runtime-rejected',
  'timeout',
  'internal',
] as const;

export type FakeRuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[number];

export interface FakeRuntimeIntent {
  readonly kind: string;
  readonly text?: string | undefined;
  readonly resourceRef?: string | undefined;
}

export interface FakeRuntimeDispatchInput {
  readonly dispatchRef: string;
  readonly intent: FakeRuntimeIntent;
  readonly workspaceRef?: string | undefined;
  readonly agentRef?: string | undefined;
  readonly actorRef?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeRuntimeOutput {
  readonly outputRef: string;
  readonly message: string;
}

export interface FakeRuntimeSafeError {
  readonly code: FakeRuntimeErrorCode;
  readonly message: string;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeRuntimeSuccess {
  readonly ok: true;
  readonly dispatchRef: string;
  readonly output: FakeRuntimeOutput;
  readonly correlationRef?: string | undefined;
}

export interface FakeRuntimeFailure {
  readonly ok: false;
  readonly dispatchRef: string;
  readonly error: FakeRuntimeSafeError;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export type FakeRuntimeResult = FakeRuntimeSuccess | FakeRuntimeFailure;

export interface FakeRuntimeSuccessInput {
  readonly dispatch?: FakeRuntimeDispatchInput | undefined;
  readonly dispatchRef?: string | undefined;
  readonly outputRef?: string | undefined;
  readonly message?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeRuntimeFailureInput {
  readonly dispatch?: FakeRuntimeDispatchInput | undefined;
  readonly dispatchRef?: string | undefined;
  readonly code?: FakeRuntimeErrorCode | undefined;
  readonly message?: string | undefined;
  readonly retryable?: boolean | undefined;
  readonly detailsRef?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeOpenClawRuntimeOptions {
  readonly outcome?: 'success' | 'failure' | undefined;
  readonly results?: readonly FakeRuntimeResult[] | undefined;
  readonly failureCode?: FakeRuntimeErrorCode | undefined;
  readonly failureMessage?: string | undefined;
  readonly retryable?: boolean | undefined;
}

export interface FakeOpenClawRuntime {
  readonly dispatch: (input: FakeRuntimeDispatchInput) => FakeRuntimeResult;
  readonly getDispatches: () => readonly FakeRuntimeDispatchInput[];
  readonly getResults: () => readonly FakeRuntimeResult[];
}

function isRuntimeErrorCode(code: string): code is FakeRuntimeErrorCode {
  return (RUNTIME_ERROR_CODES as readonly string[]).includes(code);
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
  const normalized = sanitizeText(input, label, MAX_SAFE_REF_LENGTH);

  if (!SAFE_REF_PATTERN.test(normalized)) {
    throw new TypeError(`${label} must be a safe reference.`);
  }

  return normalized;
}

function sanitizeOptionalRef(input: string | undefined, label: string): string | undefined {
  return input === undefined ? undefined : sanitizeRef(input, label);
}

function sanitizeKind(input: unknown, label: string): string {
  const normalized = sanitizeText(input, label, MAX_SAFE_KIND_LENGTH);

  if (!SAFE_KIND_PATTERN.test(normalized)) {
    throw new TypeError(`${label} must be a safe kind identifier.`);
  }

  return normalized;
}

function normalizeIntent(input: FakeRuntimeIntent): FakeRuntimeIntent {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Fake runtime intent must be an object.');
  }

  const text = input.text === undefined ? undefined : sanitizeText(input.text, 'Fake runtime intent text');
  const resourceRef = sanitizeOptionalRef(input.resourceRef, 'Fake runtime intent resourceRef');

  return Object.freeze({
    kind: sanitizeKind(input.kind, 'Fake runtime intent kind'),
    ...(text === undefined ? {} : { text }),
    ...(resourceRef === undefined ? {} : { resourceRef }),
  });
}

function normalizeDispatch(input: FakeRuntimeDispatchInput): FakeRuntimeDispatchInput {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Fake runtime dispatch input must be an object.');
  }

  const workspaceRef = sanitizeOptionalRef(input.workspaceRef, 'Fake runtime workspaceRef');
  const agentRef = sanitizeOptionalRef(input.agentRef, 'Fake runtime agentRef');
  const actorRef = sanitizeOptionalRef(input.actorRef, 'Fake runtime actorRef');
  const correlationRef = sanitizeOptionalRef(input.correlationRef, 'Fake runtime correlationRef');

  return Object.freeze({
    dispatchRef: sanitizeRef(input.dispatchRef, 'Fake runtime dispatchRef'),
    intent: normalizeIntent(input.intent),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function defaultOutputRef(index: number): string {
  return `runtime-output:fake-${index}`;
}

function normalizeFailureCode(code: FakeRuntimeErrorCode): FakeRuntimeErrorCode {
  if (!isRuntimeErrorCode(code)) {
    throw new TypeError('Unsupported fake runtime failure code.');
  }

  return code;
}

export function createFakeRuntimeSuccess(input: FakeRuntimeSuccessInput): FakeRuntimeSuccess {
  const dispatch = input.dispatch === undefined ? undefined : normalizeDispatch(input.dispatch);
  const dispatchRef = sanitizeRef(
    input.dispatchRef ?? dispatch?.dispatchRef,
    'Fake runtime success dispatchRef',
  );
  const correlationRef = sanitizeOptionalRef(
    input.correlationRef ?? dispatch?.correlationRef,
    'Fake runtime success correlationRef',
  );
  const outputRef = sanitizeRef(input.outputRef ?? defaultOutputRef(1), 'Fake runtime outputRef');

  return Object.freeze({
    ok: true,
    dispatchRef,
    output: Object.freeze({
      outputRef,
      message: sanitizeText(input.message ?? 'Fake runtime dispatch completed', 'Fake runtime output message'),
    }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function createFakeRuntimeFailure(input: FakeRuntimeFailureInput): FakeRuntimeFailure {
  const dispatch = input.dispatch === undefined ? undefined : normalizeDispatch(input.dispatch);
  const dispatchRef = sanitizeRef(
    input.dispatchRef ?? dispatch?.dispatchRef,
    'Fake runtime failure dispatchRef',
  );
  const correlationRef = sanitizeOptionalRef(
    input.correlationRef ?? dispatch?.correlationRef,
    'Fake runtime failure correlationRef',
  );
  const detailsRef = sanitizeOptionalRef(input.detailsRef, 'Fake runtime failure detailsRef');
  const retryable = input.retryable ?? false;
  const code = normalizeFailureCode(input.code ?? 'runtime-unavailable');

  return Object.freeze({
    ok: false,
    dispatchRef,
    error: Object.freeze({
      code,
      message: sanitizeText(input.message ?? DEFAULT_RUNTIME_FAILURE_MESSAGE, 'Fake runtime failure message', 240),
      retryable,
      ...(detailsRef === undefined ? {} : { detailsRef }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    }),
    retryable,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function resultForDispatch(
  dispatch: FakeRuntimeDispatchInput,
  options: FakeOpenClawRuntimeOptions,
  index: number,
): FakeRuntimeResult {
  const configuredResult = options.results?.[Math.min(index - 1, options.results.length - 1)];

  if (configuredResult !== undefined) {
    if (configuredResult.ok) {
      return createFakeRuntimeSuccess({
        dispatch,
        outputRef: configuredResult.output.outputRef,
        message: configuredResult.output.message,
        correlationRef: configuredResult.correlationRef,
      });
    }

    return createFakeRuntimeFailure({
      dispatch,
      code: configuredResult.error.code,
      message: configuredResult.error.message,
      retryable: configuredResult.retryable ?? configuredResult.error.retryable,
      detailsRef: configuredResult.detailsRef ?? configuredResult.error.detailsRef,
      correlationRef: configuredResult.correlationRef ?? configuredResult.error.correlationRef,
    });
  }

  if (options.outcome === 'failure') {
    return createFakeRuntimeFailure({
      dispatch,
      code: options.failureCode,
      message: options.failureMessage,
      retryable: options.retryable,
    });
  }

  return createFakeRuntimeSuccess({
    dispatch,
    outputRef: defaultOutputRef(index),
  });
}

export function createFakeOpenClawRuntime(
  options: FakeOpenClawRuntimeOptions = {},
): FakeOpenClawRuntime {
  const dispatches: FakeRuntimeDispatchInput[] = [];
  const results: FakeRuntimeResult[] = [];

  return Object.freeze({
    dispatch(input: FakeRuntimeDispatchInput): FakeRuntimeResult {
      const normalizedDispatch = normalizeDispatch(input);
      dispatches.push(normalizedDispatch);

      const result = resultForDispatch(normalizedDispatch, options, dispatches.length);
      results.push(result);

      return result;
    },

    getDispatches(): readonly FakeRuntimeDispatchInput[] {
      return Object.freeze([...dispatches]);
    },

    getResults(): readonly FakeRuntimeResult[] {
      return Object.freeze([...results]);
    },
  });
}
