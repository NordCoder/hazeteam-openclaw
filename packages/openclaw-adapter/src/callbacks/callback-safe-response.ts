import type {
  AdapterOperationResult,
  AdapterSafeError,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  PermissionDecision,
} from '../contracts/index.js';
import type {
  OpenClawTelegramCallbackTokenConsumption,
  OpenClawTelegramCallbackTokenFlowDecision,
  OpenClawTelegramCallbackTokenVerification,
} from './callback-token-flow.js';

export type OpenClawTelegramCallbackSafeResponseStatus =
  | 'accepted'
  | 'permission-denied'
  | 'failed-safe';

export type OpenClawTelegramCallbackSafePermissionStatus = PermissionDecision['status'];

export interface OpenClawTelegramCallbackSafeFailure {
  readonly code: AdapterSafeError['code'];
  readonly message: string;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

interface OpenClawTelegramCallbackSafeResponseBase {
  readonly kind: 'openclaw-telegram-callback-safe-response';
  readonly status: OpenClawTelegramCallbackSafeResponseStatus;
  readonly tokenConsumed: boolean;
  readonly permissionStatus?: OpenClawTelegramCallbackSafePermissionStatus;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface OpenClawTelegramCallbackAcceptedResponse
  extends OpenClawTelegramCallbackSafeResponseBase {
  readonly status: 'accepted';
  readonly tokenConsumed: true;
  readonly permissionStatus: 'allowed';
  readonly verificationStatus: OpenClawTelegramCallbackTokenVerification['status'];
  readonly consumptionStatus: OpenClawTelegramCallbackTokenConsumption['status'];
}

export interface OpenClawTelegramCallbackPermissionDeniedResponse
  extends OpenClawTelegramCallbackSafeResponseBase {
  readonly status: 'permission-denied';
  readonly tokenConsumed: false;
  readonly permissionStatus: 'denied';
  readonly reason?: string;
}

export interface OpenClawTelegramCallbackFailedSafeResponse
  extends OpenClawTelegramCallbackSafeResponseBase {
  readonly status: 'failed-safe';
  readonly tokenConsumed: false;
  readonly failure: OpenClawTelegramCallbackSafeFailure;
}

export type OpenClawTelegramCallbackSafeResponse =
  | OpenClawTelegramCallbackAcceptedResponse
  | OpenClawTelegramCallbackPermissionDeniedResponse
  | OpenClawTelegramCallbackFailedSafeResponse;

function permissionDetailsRef(permission: PermissionDecision): AdapterDetailsRef | undefined {
  return permission.detailsRef ?? permission.requirement.detailsRef;
}

function permissionCorrelationRef(permission: PermissionDecision): AdapterCorrelationRef | undefined {
  return permission.correlationRef ?? permission.requirement.correlationRef;
}

function decisionDetailsRef(
  decision: OpenClawTelegramCallbackTokenFlowDecision,
): AdapterDetailsRef | undefined {
  if (decision.status === 'permission-denied') {
    return permissionDetailsRef(decision.permission);
  }

  return (
    decision.consumption.detailsRef ??
    decision.verification.detailsRef ??
    permissionDetailsRef(decision.permission)
  );
}

function decisionCorrelationRef(
  decision: OpenClawTelegramCallbackTokenFlowDecision,
): AdapterCorrelationRef | undefined {
  if (decision.status === 'permission-denied') {
    return permissionCorrelationRef(decision.permission);
  }

  return (
    decision.consumption.correlationRef ??
    decision.verification.correlationRef ??
    permissionCorrelationRef(decision.permission)
  );
}

function safeFailure(error: AdapterSafeError): OpenClawTelegramCallbackSafeFailure {
  return Object.freeze({
    code: error.code,
    message: error.message,
    ...(error.retryable === undefined ? {} : { retryable: error.retryable }),
    ...(error.detailsRef === undefined ? {} : { detailsRef: error.detailsRef }),
    ...(error.correlationRef === undefined ? {} : { correlationRef: error.correlationRef }),
  });
}

/**
 * Projects a callback-token flow result into a public response envelope.
 *
 * The callback-token flow keeps the legacy local name `callbackPayload` for the parsed Telegram
 * action-button envelope. That value is a bounded opaque handle envelope, not a raw provider
 * callback body. This response intentionally does not expose callback payload strings, token
 * references, raw callback/provider payloads, provider handles, endpoints, paths, or stack traces.
 */
export function createOpenClawTelegramCallbackSafeResponse(
  result: AdapterOperationResult<OpenClawTelegramCallbackTokenFlowDecision>,
): OpenClawTelegramCallbackSafeResponse {
  if (!result.ok) {
    const failure = safeFailure(result.error);

    return Object.freeze({
      kind: 'openclaw-telegram-callback-safe-response',
      status: 'failed-safe',
      tokenConsumed: false,
      failure,
      ...(failure.detailsRef === undefined ? {} : { detailsRef: failure.detailsRef }),
      ...(failure.correlationRef === undefined ? {} : { correlationRef: failure.correlationRef }),
    });
  }

  if (result.value.status === 'permission-denied') {
    const detailsRef = decisionDetailsRef(result.value);
    const correlationRef = decisionCorrelationRef(result.value);

    return Object.freeze({
      kind: 'openclaw-telegram-callback-safe-response',
      status: 'permission-denied',
      tokenConsumed: false,
      permissionStatus: 'denied',
      ...(result.value.permission.reason === undefined ? {} : { reason: result.value.permission.reason }),
      ...(detailsRef === undefined ? {} : { detailsRef }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    });
  }

  const detailsRef = decisionDetailsRef(result.value);
  const correlationRef = decisionCorrelationRef(result.value);

  return Object.freeze({
    kind: 'openclaw-telegram-callback-safe-response',
    status: 'accepted',
    tokenConsumed: true,
    permissionStatus: 'allowed',
    verificationStatus: result.value.verification.status,
    consumptionStatus: result.value.consumption.status,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}
