import { allowPermission, denyPermission } from '../contracts/index.js';
import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AgentRef,
  PermissionDecision,
  PermissionRequirement,
  WorkspaceRef,
} from '../contracts/index.js';

export type PermissionActorTrust = 'trusted' | 'untrusted' | 'unknown';
export type PermissionTopicBindingTrust = 'trusted-binding' | 'untrusted' | 'unknown';
export type PermissionTopicBindingStatus = 'active' | 'paused' | 'disabled' | 'unknown';
export type CallbackTokenPermissionPhase = 'before-token-consume' | 'after-token-consume';

export interface PermissionEvaluatorActorContext {
  readonly actorRef?: ActorRef;
  readonly trust?: PermissionActorTrust;
}

export interface PermissionEvaluatorTopicContext {
  readonly trust?: PermissionTopicBindingTrust;
  readonly status?: PermissionTopicBindingStatus;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly resourceRef?: string;
}

export interface PermissionEvaluatorContext {
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly resourceRef?: string;
  readonly topic?: PermissionEvaluatorTopicContext;
  readonly callbackTokenPhase?: CallbackTokenPermissionPhase;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface PermissionEvaluatorGrant {
  readonly requirement: PermissionRequirement;
}

export interface PermissionEvaluationInput {
  readonly requirement: PermissionRequirement;
  readonly actor?: PermissionEvaluatorActorContext;
  readonly context?: PermissionEvaluatorContext;
  readonly grants?: readonly PermissionEvaluatorGrant[];
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface PermissionBatchEvaluationInput {
  readonly requirements: readonly PermissionRequirement[];
  readonly actor?: PermissionEvaluatorActorContext;
  readonly context?: PermissionEvaluatorContext;
  readonly grants?: readonly PermissionEvaluatorGrant[];
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export type PermissionEvaluator = (input: PermissionEvaluationInput) => PermissionDecision;

export const PERMISSION_BEFORE_TOKEN_CONSUME_RULE = Object.freeze({
  action: 'consume-callback',
  order: 'permission-before-token-consume',
  denialReason: 'Permission must be evaluated before token consume.',
} as const);

const PERMISSION_SCOPE_FIELDS = ['actorRef', 'workspaceRef', 'agentRef', 'resourceRef'] as const;

function normalizePermissionRequirement(requirement: PermissionRequirement): PermissionRequirement {
  return allowPermission(requirement).requirement;
}

function normalizePermissionGrant(grant: PermissionEvaluatorGrant): PermissionEvaluatorGrant {
  return Object.freeze({
    requirement: normalizePermissionRequirement(grant.requirement),
  });
}

function normalizePermissionGrants(
  grants: readonly PermissionEvaluatorGrant[] = [],
): readonly PermissionEvaluatorGrant[] {
  return Object.freeze(grants.map((grant) => normalizePermissionGrant(grant)));
}

function createEffectivePermissionRequirement(input: PermissionEvaluationInput): PermissionRequirement {
  const context = input.context;
  const topic = context?.topic;
  const requirement = input.requirement;
  const actorRef = requirement.actorRef ?? input.actor?.actorRef;
  const workspaceRef = requirement.workspaceRef ?? topic?.workspaceRef ?? context?.workspaceRef;
  const agentRef = requirement.agentRef ?? topic?.agentRef ?? context?.agentRef;
  const resourceRef = requirement.resourceRef ?? topic?.resourceRef ?? context?.resourceRef;
  const detailsRef = requirement.detailsRef ?? context?.detailsRef ?? input.detailsRef;
  const correlationRef = requirement.correlationRef ?? context?.correlationRef ?? input.correlationRef;

  return normalizePermissionRequirement({
    action: requirement.action,
    resourceKind: requirement.resourceKind,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(resourceRef === undefined ? {} : { resourceRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function requiresTrustedTopicContext(requirement: PermissionRequirement): boolean {
  return (
    requirement.resourceKind === 'topic' ||
    requirement.resourceKind === 'callback' ||
    requirement.resourceKind === 'approval' ||
    requirement.resourceKind === 'delivery' ||
    requirement.action === 'send-message' ||
    requirement.action === 'invoke-command' ||
    requirement.action === 'consume-callback' ||
    requirement.action === 'resolve-approval'
  );
}

function requiresWorkspaceRef(requirement: PermissionRequirement): boolean {
  return (
    requirement.resourceKind === 'workspace' ||
    requirement.resourceKind === 'agent' ||
    requiresTrustedTopicContext(requirement)
  );
}

function requiresAgentRef(requirement: PermissionRequirement): boolean {
  return (
    requirement.resourceKind === 'agent' ||
    requirement.action === 'send-message' ||
    requirement.action === 'invoke-command' ||
    requirement.action === 'consume-callback' ||
    requirement.action === 'resolve-approval'
  );
}

function requiresResourceRef(requirement: PermissionRequirement): boolean {
  return (
    requirement.resourceKind === 'topic' ||
    requirement.resourceKind === 'callback' ||
    requirement.resourceKind === 'approval' ||
    requirement.resourceKind === 'delivery'
  );
}

function getContextDenialReason(
  input: PermissionEvaluationInput,
  requirement: PermissionRequirement,
): string | null {
  if (input.actor?.trust !== 'trusted') {
    return 'Actor context is not trusted.';
  }

  if (requirement.actorRef === undefined) {
    return 'Actor context is missing.';
  }

  if (requiresWorkspaceRef(requirement) && requirement.workspaceRef === undefined) {
    return 'Workspace context is missing.';
  }

  if (requiresAgentRef(requirement) && requirement.agentRef === undefined) {
    return 'Agent context is missing.';
  }

  if (requiresResourceRef(requirement) && requirement.resourceRef === undefined) {
    return 'Resource context is missing.';
  }

  if (requiresTrustedTopicContext(requirement)) {
    const topic = input.context?.topic;

    if (topic?.trust !== 'trusted-binding') {
      return 'Topic binding is not trusted.';
    }

    if (topic.status !== 'active') {
      return 'Topic binding is not active.';
    }
  }

  if (
    requirement.action === PERMISSION_BEFORE_TOKEN_CONSUME_RULE.action &&
    input.context?.callbackTokenPhase === 'after-token-consume'
  ) {
    return PERMISSION_BEFORE_TOKEN_CONSUME_RULE.denialReason;
  }

  return null;
}

function getDecisionDetailsRef(input: PermissionEvaluationInput): AdapterDetailsRef | undefined {
  return input.detailsRef ?? input.context?.detailsRef ?? input.requirement.detailsRef;
}

function getDecisionCorrelationRef(input: PermissionEvaluationInput): AdapterCorrelationRef | undefined {
  return input.correlationRef ?? input.context?.correlationRef ?? input.requirement.correlationRef;
}

function denyPermissionEvaluation(
  input: PermissionEvaluationInput,
  requirement: PermissionRequirement,
  reason: string,
): PermissionDecision {
  const detailsRef = getDecisionDetailsRef(input);
  const correlationRef = getDecisionCorrelationRef(input);

  return denyPermission({
    requirement,
    reason,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function permissionScopeFieldMatches(
  grantRequirement: PermissionRequirement,
  requestRequirement: PermissionRequirement,
  field: (typeof PERMISSION_SCOPE_FIELDS)[number],
): boolean {
  const grantValue = grantRequirement[field];
  return grantValue === undefined || grantValue === requestRequirement[field];
}

export function permissionGrantMatchesRequirement(
  grant: PermissionEvaluatorGrant,
  requirement: PermissionRequirement,
): boolean {
  const normalizedGrantRequirement = normalizePermissionGrant(grant).requirement;
  const normalizedRequirement = normalizePermissionRequirement(requirement);

  return (
    normalizedGrantRequirement.action === normalizedRequirement.action &&
    normalizedGrantRequirement.resourceKind === normalizedRequirement.resourceKind &&
    PERMISSION_SCOPE_FIELDS.every((field) =>
      permissionScopeFieldMatches(normalizedGrantRequirement, normalizedRequirement, field),
    )
  );
}

export function evaluateOpenClawTelegramPermission(input: PermissionEvaluationInput): PermissionDecision {
  const requirement = createEffectivePermissionRequirement(input);
  const contextDenialReason = getContextDenialReason(input, requirement);
  if (contextDenialReason !== null) {
    return denyPermissionEvaluation(input, requirement, contextDenialReason);
  }

  const grants = normalizePermissionGrants(input.grants);
  const matchingGrant = grants.find((grant) => permissionGrantMatchesRequirement(grant, requirement));
  if (matchingGrant === undefined) {
    return denyPermissionEvaluation(input, requirement, 'No matching adapter permission grant.');
  }

  return allowPermission(requirement);
}

export function evaluateOpenClawTelegramPermissions(
  input: PermissionBatchEvaluationInput,
): readonly PermissionDecision[] {
  return Object.freeze(
    input.requirements.map((requirement) =>
      evaluateOpenClawTelegramPermission({
        requirement,
        ...(input.actor === undefined ? {} : { actor: input.actor }),
        ...(input.context === undefined ? {} : { context: input.context }),
        ...(input.grants === undefined ? {} : { grants: input.grants }),
        ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
        ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
      }),
    ),
  );
}

export function createStaticPermissionEvaluator(input: {
  readonly grants: readonly PermissionEvaluatorGrant[];
}): PermissionEvaluator {
  const grants = normalizePermissionGrants(input.grants);

  return ({ grants: _ignoredGrants, ...evaluationInput }: PermissionEvaluationInput): PermissionDecision =>
    evaluateOpenClawTelegramPermission({
      ...evaluationInput,
      grants,
    });
}
