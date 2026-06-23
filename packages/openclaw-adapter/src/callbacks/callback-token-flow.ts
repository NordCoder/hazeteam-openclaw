import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
  type ActorRef,
  type AdapterCorrelationRef,
  type AdapterDetailsRef,
  type AdapterOperationContext,
  type AdapterOperationResult,
  type AgentRef,
  type PermissionDecision,
  type PermissionRequirement,
  type WorkspaceRef,
} from '../contracts/index.js';
import {
  evaluateOpenClawTelegramPermission,
  type PermissionEvaluationInput,
  type PermissionEvaluator,
  type PermissionEvaluatorActorContext,
  type PermissionEvaluatorContext,
  type PermissionEvaluatorGrant,
} from '../permissions/index.js';

export type OpenClawTelegramCallbackPayloadPrefix = 'hz';
export type OpenClawTelegramCallbackTokenRef = string;
export type OpenClawTelegramCallbackFlowStatus = 'permission-denied' | 'token-consumed';
export type OpenClawTelegramTokenBoundaryStatus = 'verified' | 'consumed';

export interface OpenClawTelegramCallbackPayload {
  readonly kind: 'openclaw-telegram-callback-payload';
  readonly prefix: OpenClawTelegramCallbackPayloadPrefix;
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
}

export interface OpenClawTelegramCallbackTokenExpectedContext {
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly actorRef?: ActorRef;
  readonly hostSessionRef?: string;
  readonly outboxRef?: string;
  readonly presentationRef?: string;
  readonly actionRef?: string;
  readonly approvalRef?: string;
  readonly bindingRef?: string;
  readonly resourceRef?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface OpenClawTelegramCallbackTokenVerifyRequest {
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly expectedContext: OpenClawTelegramCallbackTokenExpectedContext;
  readonly callbackPayload: OpenClawTelegramCallbackPayload;
  readonly context?: AdapterOperationContext;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface OpenClawTelegramCallbackTokenConsumeRequest {
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly expectedContext: OpenClawTelegramCallbackTokenExpectedContext;
  readonly callbackPayload: OpenClawTelegramCallbackPayload;
  readonly verification: OpenClawTelegramCallbackTokenVerification;
  readonly context?: AdapterOperationContext;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface OpenClawTelegramCallbackTokenVerification {
  readonly status: 'verified';
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly verificationRef?: string;
  readonly actionRef?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface OpenClawTelegramCallbackTokenConsumption {
  readonly status: 'consumed';
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly consumptionRef?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export type OpenClawTelegramCallbackTokenVerifier = (
  input: OpenClawTelegramCallbackTokenVerifyRequest,
) => AdapterOperationResult<OpenClawTelegramCallbackTokenVerification>;

export type OpenClawTelegramCallbackTokenConsumer = (
  input: OpenClawTelegramCallbackTokenConsumeRequest,
) => AdapterOperationResult<OpenClawTelegramCallbackTokenConsumption>;

export interface OpenClawTelegramCallbackTokenFlowInput {
  readonly payload: unknown;
  readonly actor?: PermissionEvaluatorActorContext;
  readonly permissionContext?: PermissionEvaluatorContext;
  readonly permissionGrants?: readonly PermissionEvaluatorGrant[];
  readonly permissionRequirement?: PermissionRequirement;
  readonly permissionEvaluator?: PermissionEvaluator;
  readonly expectedTokenContext?: OpenClawTelegramCallbackTokenExpectedContext;
  readonly verifyToken: OpenClawTelegramCallbackTokenVerifier;
  readonly consumeToken: OpenClawTelegramCallbackTokenConsumer;
  readonly context?: AdapterOperationContext;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface OpenClawTelegramCallbackPermissionDeniedDecision {
  readonly status: 'permission-denied';
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly permission: PermissionDecision;
  readonly tokenConsumed: false;
}

export interface OpenClawTelegramCallbackTokenConsumedDecision {
  readonly status: 'token-consumed';
  readonly tokenRef: OpenClawTelegramCallbackTokenRef;
  readonly permission: PermissionDecision & { readonly status: 'allowed' };
  readonly verification: OpenClawTelegramCallbackTokenVerification;
  readonly consumption: OpenClawTelegramCallbackTokenConsumption;
  readonly tokenConsumed: true;
}

export type OpenClawTelegramCallbackTokenFlowDecision =
  | OpenClawTelegramCallbackPermissionDeniedDecision
  | OpenClawTelegramCallbackTokenConsumedDecision;

const CALLBACK_PAYLOAD_PREFIX = 'hz:';
const MAX_CALLBACK_PAYLOAD_LENGTH = 256;
const MAX_SAFE_BOUNDARY_REF_LENGTH = 256;
const SAFE_CALLBACK_TOKEN_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;

function callbackFlowError(input: {
  readonly code: Parameters<typeof createAdapterSafeError>[0]['code'];
  readonly message: string;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}): ReturnType<typeof createAdapterSafeError> {
  return createAdapterSafeError({
    code: input.code,
    message: input.message,
    ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
  });
}

function isSafeBoundaryRef(candidate: string): boolean {
  return (
    candidate.length > 0 &&
    candidate.length <= MAX_SAFE_BOUNDARY_REF_LENGTH &&
    SAFE_CALLBACK_TOKEN_REF_PATTERN.test(candidate)
  );
}

function normalizeSafeBoundaryRef<T extends string>(input: unknown, label: string): T {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a safe string ref.`);
  }

  const normalized = input.trim();
  if (!isSafeBoundaryRef(normalized)) {
    throw new TypeError(`${label} must be bounded and must not contain whitespace or raw payload separators.`);
  }

  return normalized as T;
}

function normalizeOptionalSafeBoundaryRef<T extends string>(input: unknown, label: string): T | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeSafeBoundaryRef<T>(input, label);
}

function normalizeExpectedTokenContext(
  input: OpenClawTelegramCallbackTokenExpectedContext | undefined,
): OpenClawTelegramCallbackTokenExpectedContext {
  if (input === undefined) {
    return Object.freeze({});
  }

  return Object.freeze({
    ...(input.workspaceRef === undefined
      ? {}
      : {
          workspaceRef: normalizeSafeBoundaryRef<WorkspaceRef>(
            input.workspaceRef,
            'Expected callback token workspaceRef',
          ),
        }),
    ...(input.agentRef === undefined
      ? {}
      : {
          agentRef: normalizeSafeBoundaryRef<AgentRef>(
            input.agentRef,
            'Expected callback token agentRef',
          ),
        }),
    ...(input.actorRef === undefined
      ? {}
      : {
          actorRef: normalizeSafeBoundaryRef<ActorRef>(
            input.actorRef,
            'Expected callback token actorRef',
          ),
        }),
    ...(input.hostSessionRef === undefined
      ? {}
      : {
          hostSessionRef: normalizeSafeBoundaryRef<string>(
            input.hostSessionRef,
            'Expected callback token hostSessionRef',
          ),
        }),
    ...(input.outboxRef === undefined
      ? {}
      : {
          outboxRef: normalizeSafeBoundaryRef<string>(
            input.outboxRef,
            'Expected callback token outboxRef',
          ),
        }),
    ...(input.presentationRef === undefined
      ? {}
      : {
          presentationRef: normalizeSafeBoundaryRef<string>(
            input.presentationRef,
            'Expected callback token presentationRef',
          ),
        }),
    ...(input.actionRef === undefined
      ? {}
      : {
          actionRef: normalizeSafeBoundaryRef<string>(
            input.actionRef,
            'Expected callback token actionRef',
          ),
        }),
    ...(input.approvalRef === undefined
      ? {}
      : {
          approvalRef: normalizeSafeBoundaryRef<string>(
            input.approvalRef,
            'Expected callback token approvalRef',
          ),
        }),
    ...(input.bindingRef === undefined
      ? {}
      : {
          bindingRef: normalizeSafeBoundaryRef<string>(
            input.bindingRef,
            'Expected callback token bindingRef',
          ),
        }),
    ...(input.resourceRef === undefined
      ? {}
      : {
          resourceRef: normalizeSafeBoundaryRef<string>(
            input.resourceRef,
            'Expected callback token resourceRef',
          ),
        }),
    ...(input.detailsRef === undefined
      ? {}
      : {
          detailsRef: normalizeSafeBoundaryRef<AdapterDetailsRef>(
            input.detailsRef,
            'Expected callback token detailsRef',
          ),
        }),
    ...(input.correlationRef === undefined
      ? {}
      : {
          correlationRef: normalizeSafeBoundaryRef<AdapterCorrelationRef>(
            input.correlationRef,
            'Expected callback token correlationRef',
          ),
        }),
  });
}

function getDetailsRef(input: OpenClawTelegramCallbackTokenFlowInput): AdapterDetailsRef | undefined {
  return input.detailsRef ?? input.context?.detailsRef ?? input.expectedTokenContext?.detailsRef;
}

function getCorrelationRef(input: OpenClawTelegramCallbackTokenFlowInput): AdapterCorrelationRef | undefined {
  return input.correlationRef ?? input.context?.correlationRef ?? input.expectedTokenContext?.correlationRef;
}

function createDefaultPermissionRequirement(
  input: OpenClawTelegramCallbackTokenFlowInput,
  tokenRef: OpenClawTelegramCallbackTokenRef,
  expectedContext: OpenClawTelegramCallbackTokenExpectedContext,
): PermissionRequirement {
  const resourceRef = expectedContext.resourceRef ?? expectedContext.actionRef ?? expectedContext.approvalRef ?? `callback:${tokenRef}`;
  const detailsRef = getDetailsRef(input);
  const correlationRef = getCorrelationRef(input);

  return Object.freeze({
    action: 'consume-callback',
    resourceKind: 'callback',
    ...(input.actor?.actorRef === undefined ? {} : { actorRef: input.actor.actorRef }),
    ...(expectedContext.workspaceRef === undefined ? {} : { workspaceRef: expectedContext.workspaceRef }),
    ...(expectedContext.agentRef === undefined ? {} : { agentRef: expectedContext.agentRef }),
    resourceRef,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function createPermissionEvaluationInput(
  input: OpenClawTelegramCallbackTokenFlowInput,
  tokenRef: OpenClawTelegramCallbackTokenRef,
  expectedContext: OpenClawTelegramCallbackTokenExpectedContext,
): PermissionEvaluationInput {
  const detailsRef = getDetailsRef(input);
  const correlationRef = getCorrelationRef(input);

  return Object.freeze({
    requirement:
      input.permissionRequirement ?? createDefaultPermissionRequirement(input, tokenRef, expectedContext),
    ...(input.actor === undefined ? {} : { actor: input.actor }),
    ...(input.permissionContext === undefined ? {} : { context: input.permissionContext }),
    ...(input.permissionGrants === undefined ? {} : { grants: input.permissionGrants }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeTokenVerification(
  input: OpenClawTelegramCallbackTokenVerification,
  expectedTokenRef: OpenClawTelegramCallbackTokenRef,
): OpenClawTelegramCallbackTokenVerification {
  if (input.status !== 'verified') {
    throw new TypeError('Callback token verification status must be verified.');
  }

  const tokenRef = normalizeSafeBoundaryRef<OpenClawTelegramCallbackTokenRef>(
    input.tokenRef,
    'Callback token verification tokenRef',
  );
  if (tokenRef !== expectedTokenRef) {
    throw new TypeError('Callback token verification tokenRef must match parsed callback tokenRef.');
  }

  const verificationRef = normalizeOptionalSafeBoundaryRef<string>(
    input.verificationRef,
    'Callback token verificationRef',
  );
  const actionRef = normalizeOptionalSafeBoundaryRef<string>(input.actionRef, 'Callback token actionRef');
  const detailsRef = normalizeOptionalSafeBoundaryRef<AdapterDetailsRef>(
    input.detailsRef,
    'Callback token verification detailsRef',
  );
  const correlationRef = normalizeOptionalSafeBoundaryRef<AdapterCorrelationRef>(
    input.correlationRef,
    'Callback token verification correlationRef',
  );

  return Object.freeze({
    status: 'verified',
    tokenRef,
    ...(verificationRef === undefined ? {} : { verificationRef }),
    ...(actionRef === undefined ? {} : { actionRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeTokenConsumption(
  input: OpenClawTelegramCallbackTokenConsumption,
  expectedTokenRef: OpenClawTelegramCallbackTokenRef,
): OpenClawTelegramCallbackTokenConsumption {
  if (input.status !== 'consumed') {
    throw new TypeError('Callback token consumption status must be consumed.');
  }

  const tokenRef = normalizeSafeBoundaryRef<OpenClawTelegramCallbackTokenRef>(
    input.tokenRef,
    'Callback token consumption tokenRef',
  );
  if (tokenRef !== expectedTokenRef) {
    throw new TypeError('Callback token consumption tokenRef must match parsed callback tokenRef.');
  }

  const consumptionRef = normalizeOptionalSafeBoundaryRef<string>(
    input.consumptionRef,
    'Callback token consumptionRef',
  );
  const detailsRef = normalizeOptionalSafeBoundaryRef<AdapterDetailsRef>(
    input.detailsRef,
    'Callback token consumption detailsRef',
  );
  const correlationRef = normalizeOptionalSafeBoundaryRef<AdapterCorrelationRef>(
    input.correlationRef,
    'Callback token consumption correlationRef',
  );

  return Object.freeze({
    status: 'consumed',
    tokenRef,
    ...(consumptionRef === undefined ? {} : { consumptionRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function parseOpenClawTelegramCallbackPayload(
  payload: unknown,
): AdapterOperationResult<OpenClawTelegramCallbackPayload> {
  if (typeof payload !== 'string') {
    return adapterErr(
      callbackFlowError({ code: 'invalid-input', message: 'Callback payload is malformed.' }),
    );
  }

  const normalizedPayload = payload.trim();
  if (
    normalizedPayload.length === 0 ||
    normalizedPayload.length > MAX_CALLBACK_PAYLOAD_LENGTH ||
    !normalizedPayload.startsWith(CALLBACK_PAYLOAD_PREFIX)
  ) {
    return adapterErr(
      callbackFlowError({ code: 'invalid-input', message: 'Callback payload is malformed.' }),
    );
  }

  const tokenRef = normalizedPayload.slice(CALLBACK_PAYLOAD_PREFIX.length);
  if (!isSafeBoundaryRef(tokenRef)) {
    return adapterErr(
      callbackFlowError({ code: 'invalid-input', message: 'Callback token reference is malformed.' }),
    );
  }

  return adapterOk(
    Object.freeze({
      kind: 'openclaw-telegram-callback-payload',
      prefix: 'hz',
      tokenRef,
    }),
  );
}

export function runOpenClawTelegramCallbackTokenFlow(
  input: OpenClawTelegramCallbackTokenFlowInput,
): AdapterOperationResult<OpenClawTelegramCallbackTokenFlowDecision> {
  const parseResult = parseOpenClawTelegramCallbackPayload(input.payload);
  if (!parseResult.ok) {
    return adapterErr(parseResult.error, input.context);
  }

  const detailsRef = getDetailsRef(input);
  const correlationRef = getCorrelationRef(input);

  let expectedContext: OpenClawTelegramCallbackTokenExpectedContext;
  try {
    expectedContext = normalizeExpectedTokenContext(input.expectedTokenContext);
  } catch {
    return adapterErr(
      callbackFlowError({
        code: 'invalid-input',
        message: 'Callback token expected context is malformed.',
        ...(detailsRef === undefined ? {} : { detailsRef }),
        ...(correlationRef === undefined ? {} : { correlationRef }),
      }),
      input.context,
    );
  }

  const permissionEvaluator = input.permissionEvaluator ?? evaluateOpenClawTelegramPermission;
  if (typeof permissionEvaluator !== 'function') {
    return adapterErr(
      callbackFlowError({
        code: 'dependency-missing',
        message: 'Callback permission evaluator is missing.',
        retryable: false,
        ...(detailsRef === undefined ? {} : { detailsRef }),
        ...(correlationRef === undefined ? {} : { correlationRef }),
      }),
      input.context,
    );
  }

  if (typeof input.verifyToken !== 'function' || typeof input.consumeToken !== 'function') {
    return adapterErr(
      callbackFlowError({
        code: 'dependency-missing',
        message: 'Callback token verifier or consumer is missing.',
        retryable: false,
        ...(detailsRef === undefined ? {} : { detailsRef }),
        ...(correlationRef === undefined ? {} : { correlationRef }),
      }),
      input.context,
    );
  }

  let permission: PermissionDecision;
  try {
    permission = permissionEvaluator(
      createPermissionEvaluationInput(input, parseResult.value.tokenRef, expectedContext),
    );
  } catch {
    return adapterErr(
      callbackFlowError({
        code: 'dependency-failed',
        message: 'Callback permission evaluation failed safely.',
        retryable: false,
        ...(detailsRef === undefined ? {} : { detailsRef }),
        ...(correlationRef === undefined ? {} : { correlationRef }),
      }),
      input.context,
    );
  }

  if (permission.status !== 'allowed') {
    return adapterOk(
      Object.freeze({
        status: 'permission-denied',
        tokenRef: parseResult.value.tokenRef,
        permission,
        tokenConsumed: false,
      }),
      input.context,
    );
  }

  const verifyRequest = Object.freeze({
    tokenRef: parseResult.value.tokenRef,
    expectedContext,
    callbackPayload: parseResult.value,
    ...(input.context === undefined ? {} : { context: input.context }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });

  let verifyResult: AdapterOperationResult<OpenClawTelegramCallbackTokenVerification>;
  try {
    verifyResult = input.verifyToken(verifyRequest);
  } catch {
    return adapterErr(
      callbackFlowError({
        code: 'dependency-failed',
        message: 'Callback token verification failed safely.',
        retryable: true,
        ...(detailsRef === undefined ? {} : { detailsRef }),
        ...(correlationRef === undefined ? {} : { correlationRef }),
      }),
      input.context,
    );
  }

  if (!verifyResult.ok) {
    return adapterErr(verifyResult.error, input.context);
  }

  let verification: OpenClawTelegramCallbackTokenVerification;
  try {
    verification = normalizeTokenVerification(verifyResult.value, parseResult.value.tokenRef);
  } catch {
    return adapterErr(
      callbackFlowError({
        code: 'dependency-failed',
        message: 'Callback token verification returned an invalid safe result.',
        retryable: false,
        ...(detailsRef === undefined ? {} : { detailsRef }),
        ...(correlationRef === undefined ? {} : { correlationRef }),
      }),
      input.context,
    );
  }

  const consumeRequest = Object.freeze({
    tokenRef: parseResult.value.tokenRef,
    expectedContext,
    callbackPayload: parseResult.value,
    verification,
    ...(input.context === undefined ? {} : { context: input.context }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });

  let consumeResult: AdapterOperationResult<OpenClawTelegramCallbackTokenConsumption>;
  try {
    consumeResult = input.consumeToken(consumeRequest);
  } catch {
    return adapterErr(
      callbackFlowError({
        code: 'dependency-failed',
        message: 'Callback token consume failed safely.',
        retryable: true,
        ...(detailsRef === undefined ? {} : { detailsRef }),
        ...(correlationRef === undefined ? {} : { correlationRef }),
      }),
      input.context,
    );
  }

  if (!consumeResult.ok) {
    return adapterErr(consumeResult.error, input.context);
  }

  let consumption: OpenClawTelegramCallbackTokenConsumption;
  try {
    consumption = normalizeTokenConsumption(consumeResult.value, parseResult.value.tokenRef);
  } catch {
    return adapterErr(
      callbackFlowError({
        code: 'dependency-failed',
        message: 'Callback token consume returned an invalid safe result.',
        retryable: false,
        ...(detailsRef === undefined ? {} : { detailsRef }),
        ...(correlationRef === undefined ? {} : { correlationRef }),
      }),
      input.context,
    );
  }

  return adapterOk(
    Object.freeze({
      status: 'token-consumed',
      tokenRef: parseResult.value.tokenRef,
      permission,
      verification,
      consumption,
      tokenConsumed: true,
    }),
    input.context,
  );
}
