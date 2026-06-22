import type { AdapterOperationContext } from "./refs.js";

export interface AdapterSafeError {
  readonly code: string;
  readonly safeMessage: string;
  readonly retryable: boolean;
  readonly detailsRef?: string;
}

export interface AdapterSafeErrorInput {
  readonly code: string;
  readonly safeMessage: string;
  readonly retryable?: boolean;
  readonly detailsRef?: string;
}

export interface AdapterOperationSuccess<T> extends AdapterOperationContext {
  readonly ok: true;
  readonly value: T;
}

export interface AdapterOperationFailure extends AdapterOperationContext {
  readonly ok: false;
  readonly error: AdapterSafeError;
}

export type AdapterOperationResult<T> = AdapterOperationSuccess<T> | AdapterOperationFailure;

function normalizeSafeText(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new TypeError(`${label} must be non-empty`);
  }
  return normalized;
}

export function createAdapterSafeError(input: AdapterSafeErrorInput): AdapterSafeError {
  return {
    code: normalizeSafeText(input.code, "adapterSafeError.code"),
    safeMessage: normalizeSafeText(input.safeMessage, "adapterSafeError.safeMessage"),
    retryable: input.retryable === true,
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef })
  };
}

export function adapterOk<T>(
  value: T,
  context: AdapterOperationContext = {}
): AdapterOperationResult<T> {
  return { ok: true, value, ...context };
}

export function adapterErr<T = never>(
  error: AdapterSafeErrorInput,
  context: AdapterOperationContext = {}
): AdapterOperationResult<T> {
  return { ok: false, error: createAdapterSafeError(error), ...context };
}

export function isAdapterOk<T>(result: AdapterOperationResult<T>): result is AdapterOperationSuccess<T> {
  return result.ok === true;
}

export function isAdapterErr<T>(result: AdapterOperationResult<T>): result is AdapterOperationFailure {
  return result.ok === false;
}
