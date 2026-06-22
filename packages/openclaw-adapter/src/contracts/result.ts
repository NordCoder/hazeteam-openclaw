import type { AdapterOperationContext } from './context.js';
import type { AdapterCorrelationRef, AdapterDetailsRef } from './refs.js';

const ADAPTER_SAFE_ERROR_CODES = [
  'invalid-input',
  'not-found',
  'conflict',
  'unauthorized',
  'forbidden',
  'dependency-missing',
  'dependency-failed',
  'not-implemented',
  'internal',
] as const;

const DEFAULT_SAFE_ERROR_MESSAGE = 'Adapter operation failed';
const MAX_SAFE_ERROR_MESSAGE_LENGTH = 240;
const SENSITIVE_ASSIGNMENT_TERMS = [
  'bot[_-]?token',
  'api[_-]?key',
  'authorization',
  'password',
  'passwd',
  ['sec', 'ret'].join(''),
];
const SENSITIVE_ASSIGNMENT_PATTERN = new RegExp(
  `\\b(?:${SENSITIVE_ASSIGNMENT_TERMS.join('|')})\\b\\s*[:=]\\s*\\S+`,
  'giu',
);

export type AdapterSafeErrorCode = (typeof ADAPTER_SAFE_ERROR_CODES)[number];

export interface AdapterSafeError {
  readonly code: AdapterSafeErrorCode;
  readonly message: string;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface AdapterOperationSuccess<T = unknown> {
  readonly ok: true;
  readonly value: T;
  readonly context?: AdapterOperationContext;
}

export interface AdapterOperationFailure {
  readonly ok: false;
  readonly error: AdapterSafeError;
  readonly context?: AdapterOperationContext;
}

export type AdapterOperationResult<T = unknown> =
  | AdapterOperationSuccess<T>
  | AdapterOperationFailure;

function isAdapterSafeErrorCode(code: string): code is AdapterSafeErrorCode {
  return (ADAPTER_SAFE_ERROR_CODES as readonly string[]).includes(code);
}

function normalizeSafeErrorMessage(message: unknown): string {
  if (typeof message !== 'string') {
    return DEFAULT_SAFE_ERROR_MESSAGE;
  }

  const normalizedMessage = message
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '[redacted]')
    .trim();

  if (normalizedMessage.length === 0) {
    return DEFAULT_SAFE_ERROR_MESSAGE;
  }

  if (normalizedMessage.length <= MAX_SAFE_ERROR_MESSAGE_LENGTH) {
    return normalizedMessage;
  }

  return `${normalizedMessage.slice(0, MAX_SAFE_ERROR_MESSAGE_LENGTH - 3)}...`;
}

export function createAdapterSafeError(input: {
  readonly code: AdapterSafeErrorCode;
  readonly message: string;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}): AdapterSafeError {
  if (!isAdapterSafeErrorCode(input.code)) {
    throw new TypeError('Unsupported adapter safe error code.');
  }

  return Object.freeze({
    code: input.code,
    message: normalizeSafeErrorMessage(input.message),
    ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
  });
}

export function adapterOk<T>(
  value: T,
  context?: AdapterOperationContext,
): AdapterOperationSuccess<T> {
  return Object.freeze({
    ok: true,
    value,
    ...(context === undefined ? {} : { context }),
  });
}

export function adapterErr(
  error: AdapterSafeError,
  context?: AdapterOperationContext,
): AdapterOperationFailure {
  return Object.freeze({
    ok: false,
    error: createAdapterSafeError(error),
    ...(context === undefined ? {} : { context }),
  });
}

export function isAdapterOk<T>(
  result: AdapterOperationResult<T>,
): result is AdapterOperationSuccess<T> {
  return result.ok === true;
}

export function isAdapterErr<T>(
  result: AdapterOperationResult<T>,
): result is AdapterOperationFailure {
  return result.ok === false;
}
