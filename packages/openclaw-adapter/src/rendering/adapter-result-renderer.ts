import type { AdapterOperationContext } from '../contracts/context.js';
import type { TelegramDeliveryRequest, TelegramDeliveryTarget } from '../contracts/delivery.js';
import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
  type AdapterOperationResult,
} from '../contracts/result.js';
import type { AdapterCorrelationRef, AdapterOperationRef } from '../contracts/refs.js';
import {
  createTelegramRenderDeliveryRequest,
  renderTelegramInput,
  type SafePresentationLikeInput,
  type TelegramRenderableInput,
  type TelegramRenderFragment,
} from './telegram-renderer.js';

const DEFAULT_ADAPTER_RESULT_FAILURE_TITLE = 'Adapter operation failed';
const DEFAULT_RESULT_RENDER_COMPOSITION_ERROR = 'Telegram adapter result render composition failed';

const UNSAFE_RESULT_COMPOSITION_FIELD_NAMES = new Set([
  'approvalpayload',
  'callbackquery',
  'deliveryattempt',
  'deliveryresult',
  'deploymenthandle',
  'externalmessageref',
  'filesystempath',
  'handler',
  'openclawclient',
  'platformhandle',
  'provider',
  'providerack',
  'providerobject',
  'rawcallbackbody',
  'rawopenclawevent',
  'rawproviderack',
  'rawproviderobject',
  'rawproviderpayload',
  'rawproviderresponse',
  'rawtelegramupdate',
  'rawtoolpayload',
  'rawupdate',
  'sdkclient',
  'stack',
  'storagepath',
  'storageroot',
  'telegramupdate',
  'toolpayload',
]);
const UNSAFE_RESULT_COMPOSITION_FIELD_NAME_PARTS = [
  ['api', 'key'],
  ['auth', 'orization'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['pass', 'wd'],
  ['sec', 'ret'],
] as const;

export interface TelegramAdapterResultRenderInput {
  readonly result: AdapterOperationResult<TelegramRenderableInput>;
}

export interface TelegramAdapterResultDeliveryRequestInput {
  readonly deliveryRef: AdapterOperationRef;
  readonly target: TelegramDeliveryTarget;
  readonly result: AdapterOperationResult<TelegramRenderableInput>;
  readonly context?: AdapterOperationContext;
  readonly correlationRef?: AdapterCorrelationRef;
}

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isUnsafeResultCompositionFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_RESULT_COMPOSITION_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_RESULT_COMPOSITION_FIELD_NAME_PARTS.some((parts) =>
      normalizedFieldName.includes(parts.join('')),
    )
  );
}

function rejectUnsafeResultCompositionFields(
  input: unknown,
  label: string,
  seen = new Set<object>(),
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
      rejectUnsafeResultCompositionFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeResultCompositionFieldName(fieldName)) {
      throw new TypeError(
        `${label} must not include raw provider, SDK, delivery acknowledgement, storage, or sensitive fields.`,
      );
    }
    rejectUnsafeResultCompositionFields(value, label, seen);
  }
}

function failurePresentationForAdapterResult(
  result: Extract<AdapterOperationResult<TelegramRenderableInput>, { readonly ok: false }>,
): SafePresentationLikeInput {
  const safeError = createAdapterSafeError(result.error);

  return Object.freeze({
    intent: safeError.code === 'unauthorized' || safeError.code === 'forbidden' ? 'warning' : 'error',
    title: DEFAULT_ADAPTER_RESULT_FAILURE_TITLE,
    body: Object.freeze([
      Object.freeze({
        text: safeError.message,
      }),
    ]),
  });
}

function safeCompositionError(error: unknown): AdapterOperationResult<never> {
  const message = error instanceof Error ? error.message : DEFAULT_RESULT_RENDER_COMPOSITION_ERROR;

  return adapterErr(
    createAdapterSafeError({
      code: 'invalid-input',
      message,
    }),
  );
}

function renderNormalizedAdapterResult(
  result: AdapterOperationResult<TelegramRenderableInput>,
): TelegramRenderFragment {
  assertPlainObject(result, 'Telegram adapter result render input result');

  if (result.ok === true) {
    return renderTelegramInput(result.value);
  }

  if (result.ok === false) {
    return renderTelegramInput(failurePresentationForAdapterResult(result));
  }

  throw new TypeError('Telegram adapter result render input result must be an adapter operation result.');
}

export function renderTelegramAdapterResult(
  input: TelegramAdapterResultRenderInput,
): AdapterOperationResult<TelegramRenderFragment> {
  try {
    assertPlainObject(input, 'Telegram adapter result render input');
    rejectUnsafeResultCompositionFields(input, 'Telegram adapter result render input');

    return adapterOk(renderNormalizedAdapterResult(input.result));
  } catch (error) {
    return safeCompositionError(error);
  }
}

export function createTelegramAdapterResultDeliveryRequest(
  input: TelegramAdapterResultDeliveryRequestInput,
): AdapterOperationResult<TelegramDeliveryRequest> {
  try {
    assertPlainObject(input, 'Telegram adapter result delivery request input');
    rejectUnsafeResultCompositionFields(input, 'Telegram adapter result delivery request input');

    const renderResult = renderTelegramAdapterResult({ result: input.result });

    if (!renderResult.ok) {
      return renderResult;
    }

    const context = input.context ?? input.result.context;
    const request = createTelegramRenderDeliveryRequest({
      deliveryRef: input.deliveryRef,
      target: input.target,
      source: renderResult.value,
      ...(context === undefined ? {} : { context }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    });

    return adapterOk(request, request.context);
  } catch (error) {
    return safeCompositionError(error);
  }
}
