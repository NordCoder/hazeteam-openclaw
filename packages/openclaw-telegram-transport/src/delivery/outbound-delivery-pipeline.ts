import {
  TELEGRAM_OUTBOUND_DIAGNOSTIC_CODES,
  TELEGRAM_OUTBOUND_FAILURE_REASONS,
  isSafeTelegramOutboundPublicJson,
  normalizeTelegramOutboundOptionalSafeRef,
  normalizeTelegramOutboundSafeRef,
  type TelegramOutboundBusinessReason,
  type TelegramOutboundBusinessResult,
  type TelegramOutboundDeliveryFailure,
  type TelegramOutboundDeliveryPort,
  type TelegramOutboundDeliveryProviderPort,
  type TelegramOutboundDeliveryRequest,
  type TelegramOutboundDeliveryResult,
  type TelegramOutboundDeliverySafeError,
  type TelegramOutboundDeliveryStatus,
  type TelegramOutboundDiagnosticCode,
  type TelegramOutboundFailureReason,
  type TelegramOutboundProviderAccepted,
  type TelegramOutboundProviderAcceptedSummary,
  type TelegramOutboundProviderAcknowledgement,
  type TelegramOutboundProviderAcknowledgementStatus,
  type TelegramOutboundProviderDeliveryRequest,
  type TelegramOutboundProviderRejected,
} from '../contracts/outbound-delivery.js';
import { isSafeTelegramOutboundDeliveryRequest } from '../outbound/outbound-delivery-request.js';

export type TelegramOutboundProviderPortStatus = 'available' | 'missing' | 'disabled';

export type TelegramOutboundCredentialStatus = 'available' | 'missing' | 'invalid' | 'unavailable';

export interface TelegramOutboundDeliveryReadinessInput {
  readonly providerPortStatus?: TelegramOutboundProviderPortStatus;
  readonly credentialStatus?: TelegramOutboundCredentialStatus;
  readonly willCallRemote?: false;
}

export interface TelegramOutboundDeliveryPipelineOptions {
  readonly providerPort?: TelegramOutboundDeliveryProviderPort;
  readonly readiness?: TelegramOutboundDeliveryReadinessInput;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function safeMessageFor(reasonCode: TelegramOutboundFailureReason): string {
  switch (reasonCode) {
    case 'invalid-request':
      return 'Outbound delivery request was rejected safely';
    case 'blocked-missing-provider-port':
      return 'Outbound delivery provider port is missing';
    case 'blocked-provider-disabled':
      return 'Outbound delivery provider is disabled';
    case 'blocked-missing-secret':
      return 'Outbound delivery credential reference is unavailable';
    case 'provider-unavailable':
      return 'Outbound delivery provider is unavailable';
    case 'provider-rejected':
      return 'Outbound delivery provider rejected the request';
    case 'rate-limited':
      return 'Outbound delivery provider rate limit was reached';
    case 'timeout':
      return 'Outbound delivery provider timed out';
    case 'conflict':
      return 'Outbound delivery conflicted with an existing operation';
    case 'invalid-provider-ack':
      return 'Outbound delivery provider acknowledgement was invalid';
  }
}

function businessResult(reason: TelegramOutboundBusinessReason): TelegramOutboundBusinessResult {
  return Object.freeze({
    status: 'not-evaluated',
    success: false,
    reason,
  } satisfies TelegramOutboundBusinessResult);
}

function safeError(
  reasonCode: TelegramOutboundFailureReason,
  diagnosticCode: TelegramOutboundDiagnosticCode,
  retryable: boolean,
): TelegramOutboundDeliverySafeError {
  return Object.freeze({
    reasonCode,
    diagnosticCode,
    componentRef: 'telegram:outbound-delivery',
    retryable,
    safeMessage: safeMessageFor(reasonCode),
  } satisfies TelegramOutboundDeliverySafeError);
}

function providerAcknowledgementSummary(
  request: TelegramOutboundDeliveryRequest,
  status: TelegramOutboundProviderAcknowledgementStatus,
  refs: {
    readonly messageRef?: string;
    readonly acknowledgementRef?: string;
    readonly idempotencyRef?: string;
    readonly deliveryAttemptRef?: string;
  } = {},
) {
  return Object.freeze({
    status,
    provider: request.provider,
    ...(refs.messageRef === undefined ? {} : { messageRef: refs.messageRef }),
    ...(refs.acknowledgementRef === undefined ? {} : { acknowledgementRef: refs.acknowledgementRef }),
    ...(refs.idempotencyRef === undefined ? {} : { idempotencyRef: refs.idempotencyRef }),
    ...(refs.deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef: refs.deliveryAttemptRef }),
  });
}

function failureResult(
  request: TelegramOutboundDeliveryRequest,
  deliveryStatus: TelegramOutboundDeliveryStatus & ('not-attempted' | 'provider-rejected'),
  acknowledgementStatus: TelegramOutboundProviderAcknowledgementStatus,
  reasonCode: TelegramOutboundFailureReason,
  diagnosticCode: TelegramOutboundDiagnosticCode,
  retryable: boolean,
  refs: {
    readonly acknowledgementRef?: string;
    readonly idempotencyRef?: string;
    readonly deliveryAttemptRef?: string;
  } = {},
): TelegramOutboundDeliveryFailure {
  const deliveryRef = normalizeTelegramOutboundSafeRef(request.deliveryRef, 'delivery:redacted');
  const correlationRef = normalizeTelegramOutboundOptionalSafeRef(request.correlationRef);
  const idempotencyRef = refs.idempotencyRef ?? normalizeTelegramOutboundOptionalSafeRef(request.idempotencyRef);
  const deliveryAttemptRef = refs.deliveryAttemptRef ?? normalizeTelegramOutboundOptionalSafeRef(request.deliveryAttemptRef);
  const acknowledgementRef = refs.acknowledgementRef;

  return Object.freeze({
    descriptorKind: 'telegram-outbound-delivery-result',
    ok: false,
    provider: request.provider,
    deliveryRef,
    deliveryStatus,
    providerAcknowledged: false,
    providerAcknowledgement: providerAcknowledgementSummary(request, acknowledgementStatus, {
      ...(acknowledgementRef === undefined ? {} : { acknowledgementRef }),
      ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
      ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
    }),
    businessResult: businessResult(deliveryStatus === 'not-attempted' ? 'delivery-not-attempted' : 'provider-rejected'),
    businessSuccess: false,
    error: safeError(reasonCode, diagnosticCode, retryable),
    retryable,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
  } satisfies TelegramOutboundDeliveryFailure);
}

function providerRequestFrom(request: TelegramOutboundDeliveryRequest): TelegramOutboundProviderDeliveryRequest {
  const correlationRef = normalizeTelegramOutboundOptionalSafeRef(request.correlationRef);
  const idempotencyRef = normalizeTelegramOutboundOptionalSafeRef(request.idempotencyRef);
  const deliveryAttemptRef = normalizeTelegramOutboundOptionalSafeRef(request.deliveryAttemptRef);

  return Object.freeze({
    descriptorKind: 'telegram-outbound-provider-delivery-request',
    provider: request.provider,
    deliveryRef: request.deliveryRef,
    target: request.target,
    content: request.content,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
  } satisfies TelegramOutboundProviderDeliveryRequest);
}

function normalizeFailureReason(value: unknown): TelegramOutboundFailureReason {
  return isOneOf(value, TELEGRAM_OUTBOUND_FAILURE_REASONS) ? value : 'provider-rejected';
}

function normalizeDiagnosticCode(value: unknown, fallback: TelegramOutboundDiagnosticCode): TelegramOutboundDiagnosticCode {
  return isOneOf(value, TELEGRAM_OUTBOUND_DIAGNOSTIC_CODES) ? value : fallback;
}

function successResult(
  request: TelegramOutboundDeliveryRequest,
  acknowledgement: TelegramOutboundProviderAccepted,
): TelegramOutboundDeliveryResult {
  const deliveryRef = normalizeTelegramOutboundSafeRef(request.deliveryRef, 'delivery:redacted');
  const messageRef = normalizeTelegramOutboundSafeRef(acknowledgement.providerMessageRef, 'message:telegram:redacted');
  const acknowledgementRef = normalizeTelegramOutboundOptionalSafeRef(acknowledgement.acknowledgementRef);
  const correlationRef = normalizeTelegramOutboundOptionalSafeRef(request.correlationRef);
  const idempotencyRef =
    normalizeTelegramOutboundOptionalSafeRef(acknowledgement.idempotencyRef) ??
    normalizeTelegramOutboundOptionalSafeRef(request.idempotencyRef);
  const deliveryAttemptRef =
    normalizeTelegramOutboundOptionalSafeRef(acknowledgement.deliveryAttemptRef) ??
    normalizeTelegramOutboundOptionalSafeRef(request.deliveryAttemptRef);

  const providerAcknowledgement = providerAcknowledgementSummary(request, 'accepted', {
    messageRef,
    ...(acknowledgementRef === undefined ? {} : { acknowledgementRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
  }) as TelegramOutboundProviderAcceptedSummary;

  return Object.freeze({
    descriptorKind: 'telegram-outbound-delivery-result',
    ok: true,
    provider: request.provider,
    deliveryRef,
    deliveryStatus: 'provider-acknowledged',
    providerAcknowledged: true,
    providerAcknowledgement,
    businessResult: businessResult('provider-ack-is-not-business-success'),
    businessSuccess: false,
    retryable: false,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
  });
}

function failureFromProviderAcknowledgement(
  request: TelegramOutboundDeliveryRequest,
  acknowledgement: TelegramOutboundProviderRejected,
): TelegramOutboundDeliveryFailure {
  const reasonCode = normalizeFailureReason(acknowledgement.reasonCode);
  const diagnosticCode = normalizeDiagnosticCode(acknowledgement.diagnosticCode, 'provider-returned-failure');
  const retryable = typeof acknowledgement.retryable === 'boolean' ? acknowledgement.retryable : reasonCode !== 'provider-rejected';
  const acknowledgementRef = normalizeTelegramOutboundOptionalSafeRef(acknowledgement.acknowledgementRef);
  const idempotencyRef =
    normalizeTelegramOutboundOptionalSafeRef(acknowledgement.idempotencyRef) ??
    normalizeTelegramOutboundOptionalSafeRef(request.idempotencyRef);
  const deliveryAttemptRef =
    normalizeTelegramOutboundOptionalSafeRef(acknowledgement.deliveryAttemptRef) ??
    normalizeTelegramOutboundOptionalSafeRef(request.deliveryAttemptRef);

  return failureResult(request, 'provider-rejected', 'rejected', reasonCode, diagnosticCode, retryable, {
    ...(acknowledgementRef === undefined ? {} : { acknowledgementRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
  });
}

function normalizeProviderAcknowledgement(
  request: TelegramOutboundDeliveryRequest,
  acknowledgement: TelegramOutboundProviderAcknowledgement,
): TelegramOutboundDeliveryResult {
  if (!isRecord(acknowledgement) || typeof acknowledgement.accepted !== 'boolean') {
    return failureResult(request, 'provider-rejected', 'invalid', 'invalid-provider-ack', 'invalid-provider-ack', true);
  }

  if (acknowledgement.accepted === false) {
    return failureFromProviderAcknowledgement(request, acknowledgement);
  }

  return successResult(request, acknowledgement);
}

function blockedByReadiness(
  readiness: TelegramOutboundDeliveryReadinessInput | undefined,
): { readonly reasonCode: TelegramOutboundFailureReason; readonly diagnosticCode: TelegramOutboundDiagnosticCode; readonly retryable: boolean } | undefined {
  if (readiness === undefined) {
    return undefined;
  }

  if (readiness.providerPortStatus === 'disabled') {
    return Object.freeze({ reasonCode: 'blocked-provider-disabled', diagnosticCode: 'provider-disabled', retryable: false });
  }

  if (readiness.providerPortStatus === 'missing') {
    return Object.freeze({ reasonCode: 'blocked-missing-provider-port', diagnosticCode: 'missing-provider-port', retryable: true });
  }

  if (
    readiness.credentialStatus === 'missing' ||
    readiness.credentialStatus === 'invalid' ||
    readiness.credentialStatus === 'unavailable'
  ) {
    return Object.freeze({ reasonCode: 'blocked-missing-secret', diagnosticCode: 'missing-secret', retryable: true });
  }

  return undefined;
}

export function createTelegramOutboundDeliveryPort(options: TelegramOutboundDeliveryPipelineOptions): TelegramOutboundDeliveryPort {
  return Object.freeze({
    descriptorKind: 'telegram-outbound-delivery-port',
    effects: 'none-until-invoked',
    providerClientConstructed: false,
    defaultNetworkBehavior: 'none',
    deliver(request: TelegramOutboundDeliveryRequest): Promise<TelegramOutboundDeliveryResult> {
      return deliverTelegramOutboundRequest(options, request);
    },
  } satisfies TelegramOutboundDeliveryPort);
}

export async function deliverTelegramOutboundRequest(
  options: TelegramOutboundDeliveryPipelineOptions,
  request: TelegramOutboundDeliveryRequest,
): Promise<TelegramOutboundDeliveryResult> {
  if (!isSafeTelegramOutboundDeliveryRequest(request)) {
    return failureResult(request, 'not-attempted', 'not-attempted', 'invalid-request', 'invalid-delivery-request', false);
  }

  const readinessBlock = blockedByReadiness(options.readiness);
  if (readinessBlock !== undefined) {
    return failureResult(
      request,
      'not-attempted',
      'not-attempted',
      readinessBlock.reasonCode,
      readinessBlock.diagnosticCode,
      readinessBlock.retryable,
    );
  }

  if (options.providerPort === undefined || typeof options.providerPort.deliver !== 'function') {
    return failureResult(request, 'not-attempted', 'not-attempted', 'blocked-missing-provider-port', 'missing-provider-port', true);
  }

  try {
    const acknowledgement = await options.providerPort.deliver(providerRequestFrom(request));
    const result = normalizeProviderAcknowledgement(request, acknowledgement);
    return isSafeTelegramOutboundPublicJson(result)
      ? result
      : failureResult(request, 'provider-rejected', 'invalid', 'invalid-provider-ack', 'invalid-provider-ack', true);
  } catch {
    return failureResult(request, 'provider-rejected', 'rejected', 'provider-rejected', 'provider-threw', true);
  }
}
