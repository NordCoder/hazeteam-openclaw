import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
  isPermissionAllowed,
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
import {
  createApprovalBridgeDecision,
  createApprovalBridgePermissionRequirement,
  resolveApprovalBridgeDecision,
  type ApprovalBridgeDecision,
  type ApprovalBridgeDecisionInput,
  type ApprovalBridgeResolver,
} from './approval-bridge.js';

export interface ComposeApprovalBridgeResolutionInput {
  readonly resolver?: ApprovalBridgeResolver;
  readonly decision: ApprovalBridgeDecisionInput;
  readonly actor?: PermissionEvaluatorActorContext;
  readonly permissionContext?: PermissionEvaluatorContext;
  readonly permissionGrants?: readonly PermissionEvaluatorGrant[];
  readonly permissionRequirement?: PermissionRequirement;
  readonly permissionEvaluator?: PermissionEvaluator;
  readonly context?: AdapterOperationContext;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface ComposedApprovalBridgeResolution {
  readonly decision: ApprovalBridgeDecision;
  readonly permission: PermissionDecision & { readonly status: 'allowed' };
}

function approvalCompositionFailure<T>(input: {
  readonly code: 'invalid-input' | 'forbidden' | 'dependency-missing' | 'dependency-failed';
  readonly message: string;
  readonly retryable?: boolean;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}): AdapterOperationResult<T> {
  return adapterErr(
    createAdapterSafeError({
      code: input.code,
      message: input.message,
      ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    }),
  );
}

function getPermissionDetailsRef(input: {
  readonly permission?: PermissionDecision;
  readonly decision?: ApprovalBridgeDecision;
  readonly detailsRef?: AdapterDetailsRef;
}): AdapterDetailsRef | undefined {
  return (
    input.permission?.detailsRef ??
    input.permission?.requirement.detailsRef ??
    input.decision?.detailsRef ??
    input.detailsRef
  );
}

function getPermissionCorrelationRef(input: {
  readonly permission?: PermissionDecision;
  readonly decision?: ApprovalBridgeDecision;
  readonly correlationRef?: AdapterCorrelationRef;
}): AdapterCorrelationRef | undefined {
  return (
    input.permission?.correlationRef ??
    input.permission?.requirement.correlationRef ??
    input.decision?.correlationRef ??
    input.correlationRef
  );
}

function createDefaultApprovalPermissionRequirement(input: {
  readonly decision: ApprovalBridgeDecision;
  readonly actor?: PermissionEvaluatorActorContext;
  readonly context?: PermissionEvaluatorContext;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}): PermissionRequirement {
  return createApprovalBridgePermissionRequirement({
    approvalRef: input.decision.approvalRef,
    ...(input.decision.actorRef === undefined && input.actor?.actorRef === undefined
      ? {}
      : { actorRef: (input.decision.actorRef ?? input.actor?.actorRef) as ActorRef }),
    ...(input.context?.workspaceRef === undefined
      ? {}
      : { workspaceRef: input.context.workspaceRef as WorkspaceRef }),
    ...(input.context?.agentRef === undefined ? {} : { agentRef: input.context.agentRef as AgentRef }),
    ...(input.detailsRef === undefined && input.decision.detailsRef === undefined
      ? {}
      : { detailsRef: (input.decision.detailsRef ?? input.detailsRef) as AdapterDetailsRef }),
    ...(input.correlationRef === undefined && input.decision.correlationRef === undefined
      ? {}
      : {
          correlationRef: (input.decision.correlationRef ?? input.correlationRef) as AdapterCorrelationRef,
        }),
  });
}

function createApprovalPermissionEvaluationInput(
  input: ComposeApprovalBridgeResolutionInput,
  decision: ApprovalBridgeDecision,
): PermissionEvaluationInput {
  const requirement =
    input.permissionRequirement ??
    createDefaultApprovalPermissionRequirement({
      decision,
      ...(input.actor === undefined ? {} : { actor: input.actor }),
      ...(input.permissionContext === undefined ? {} : { context: input.permissionContext }),
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    });

  return Object.freeze({
    requirement,
    ...(input.actor === undefined ? {} : { actor: input.actor }),
    ...(input.permissionContext === undefined ? {} : { context: input.permissionContext }),
    ...(input.permissionGrants === undefined ? {} : { grants: input.permissionGrants }),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
  });
}

export async function resolveApprovalBridgeDecisionWithPermission(
  input: ComposeApprovalBridgeResolutionInput,
): Promise<AdapterOperationResult<ComposedApprovalBridgeResolution>> {
  if (typeof input !== 'object' || input === null) {
    return approvalCompositionFailure({
      code: 'invalid-input',
      message: 'Approval composition input must be an object.',
    });
  }

  let decision: ApprovalBridgeDecision;
  try {
    decision = createApprovalBridgeDecision(input.decision);
  } catch {
    return approvalCompositionFailure({
      code: 'invalid-input',
      message: 'Approval composition decision is invalid or unsafe.',
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    });
  }

  const permissionEvaluator = input.permissionEvaluator ?? evaluateOpenClawTelegramPermission;
  if (typeof permissionEvaluator !== 'function') {
    return approvalCompositionFailure({
      code: 'dependency-missing',
      message: 'Approval permission evaluator is missing.',
      ...(decision.detailsRef === undefined ? {} : { detailsRef: decision.detailsRef }),
      ...(decision.correlationRef === undefined ? {} : { correlationRef: decision.correlationRef }),
    });
  }

  let permission: PermissionDecision;
  try {
    permission = permissionEvaluator(createApprovalPermissionEvaluationInput(input, decision));
  } catch {
    return approvalCompositionFailure({
      code: 'dependency-failed',
      message: 'Approval permission evaluation failed safely.',
      retryable: false,
      ...(decision.detailsRef === undefined ? {} : { detailsRef: decision.detailsRef }),
      ...(decision.correlationRef === undefined ? {} : { correlationRef: decision.correlationRef }),
    });
  }

  if (!isPermissionAllowed(permission)) {
    const detailsRef = getPermissionDetailsRef({
      permission,
      decision,
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    });
    const correlationRef = getPermissionCorrelationRef({
      permission,
      decision,
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    });

    return approvalCompositionFailure({
      code: 'forbidden',
      message: 'Approval resolution permission denied before resolver boundary call.',
      ...(detailsRef === undefined ? {} : { detailsRef }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    });
  }

  const resolution = await resolveApprovalBridgeDecision({
    ...(input.resolver === undefined ? {} : { resolver: input.resolver }),
    decision,
    permissionDecision: permission,
    ...(input.context === undefined ? {} : { context: input.context }),
  });

  if (!resolution.ok) {
    return resolution;
  }

  return adapterOk(
    Object.freeze({
      decision: resolution.value.decision,
      permission,
    }),
    resolution.context,
  );
}
