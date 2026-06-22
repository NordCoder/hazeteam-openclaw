import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AgentRef,
  WorkspaceRef,
} from './refs.js';

const PERMISSION_ACTIONS = [
  'send-message',
  'invoke-command',
  'consume-callback',
  'resolve-approval',
  'admin-topic-binding',
] as const;
const PERMISSION_RESOURCE_KINDS = [
  'workspace',
  'agent',
  'topic',
  'callback',
  'approval',
  'delivery',
] as const;
const MAX_PERMISSION_REASON_LENGTH = 160;
const DEFAULT_PERMISSION_DENIAL_REASON = 'Permission denied.';
const UNSAFE_ASSIGNMENT_PATTERN = /\b[A-Za-z][A-Za-z0-9_-]{0,40}\b\s*[:=]\s*\S+/gu;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionResourceKind = (typeof PERMISSION_RESOURCE_KINDS)[number];

export interface PermissionRequirement {
  readonly action: PermissionAction;
  readonly resourceKind: PermissionResourceKind;
  readonly actorRef?: ActorRef;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly resourceRef?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export type PermissionDecisionStatus = 'allowed' | 'denied';

export interface PermissionDecision {
  readonly status: PermissionDecisionStatus;
  readonly requirement: PermissionRequirement;
  readonly reason?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

function isPermissionAction(action: string): action is PermissionAction {
  return (PERMISSION_ACTIONS as readonly string[]).includes(action);
}

function isPermissionResourceKind(kind: string): kind is PermissionResourceKind {
  return (PERMISSION_RESOURCE_KINDS as readonly string[]).includes(kind);
}

function normalizePermissionRequirement(requirement: PermissionRequirement): PermissionRequirement {
  if (!isPermissionAction(requirement.action)) {
    throw new TypeError('Unsupported permission action.');
  }

  if (!isPermissionResourceKind(requirement.resourceKind)) {
    throw new TypeError('Unsupported permission resource kind.');
  }

  return Object.freeze({
    action: requirement.action,
    resourceKind: requirement.resourceKind,
    ...(requirement.actorRef === undefined ? {} : { actorRef: requirement.actorRef }),
    ...(requirement.workspaceRef === undefined ? {} : { workspaceRef: requirement.workspaceRef }),
    ...(requirement.agentRef === undefined ? {} : { agentRef: requirement.agentRef }),
    ...(requirement.resourceRef === undefined ? {} : { resourceRef: requirement.resourceRef }),
    ...(requirement.detailsRef === undefined ? {} : { detailsRef: requirement.detailsRef }),
    ...(requirement.correlationRef === undefined
      ? {}
      : { correlationRef: requirement.correlationRef }),
  });
}

function normalizePermissionReason(reason: string): string {
  const normalizedReason = reason
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(UNSAFE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  const safeReason = normalizedReason.length === 0 ? DEFAULT_PERMISSION_DENIAL_REASON : normalizedReason;

  if (safeReason.length <= MAX_PERMISSION_REASON_LENGTH) {
    return safeReason;
  }

  return `${safeReason.slice(0, MAX_PERMISSION_REASON_LENGTH - 3)}...`;
}

export function allowPermission(requirement: PermissionRequirement): PermissionDecision {
  return Object.freeze({
    status: 'allowed',
    requirement: normalizePermissionRequirement(requirement),
  });
}

export function denyPermission(input: {
  readonly requirement: PermissionRequirement;
  readonly reason: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}): PermissionDecision {
  return Object.freeze({
    status: 'denied',
    requirement: normalizePermissionRequirement(input.requirement),
    reason: normalizePermissionReason(input.reason),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
  });
}

export function isPermissionAllowed(
  decision: PermissionDecision,
): decision is PermissionDecision & { readonly status: 'allowed' } {
  return decision.status === 'allowed';
}

export function isPermissionDenied(
  decision: PermissionDecision,
): decision is PermissionDecision & { readonly status: 'denied' } {
  return decision.status === 'denied';
}
