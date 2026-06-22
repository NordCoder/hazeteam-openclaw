import type { ActorRef, AdapterPublicId, AgentRef, WorkspaceRef } from "./refs.js";

export type PermissionRequirementKind =
  | "read_topic"
  | "execute_command"
  | "click_action"
  | "approve_tool_request"
  | "manage_topic_binding"
  | "cancel_session"
  | "consume_action_token";

export interface PermissionRequirement {
  readonly kind: PermissionRequirementKind;
  readonly action: string;
  readonly ref?: AdapterPublicId;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly bindingRef?: AdapterPublicId;
  readonly tokenRef?: AdapterPublicId;
  readonly minRole?: string;
}

export type PermissionDeniedReason =
  | "missing_role"
  | "actor_not_bound"
  | "binding_disabled"
  | "policy_missing"
  | "action_not_allowed"
  | "unsafe_context";

export interface PermissionAllowedDecision {
  readonly allowed: true;
  readonly requirement: PermissionRequirement;
  readonly actor?: ActorRef;
}

export interface PermissionDeniedDecision {
  readonly allowed: false;
  readonly requirement: PermissionRequirement;
  readonly actor?: ActorRef;
  readonly reason: PermissionDeniedReason;
  readonly code: string;
  readonly safeMessage: string;
  readonly detailsRef?: string;
}

export type PermissionDecision = PermissionAllowedDecision | PermissionDeniedDecision;

export function allowPermission(
  requirement: PermissionRequirement,
  actor?: ActorRef
): PermissionAllowedDecision {
  return {
    allowed: true,
    requirement,
    ...(actor === undefined ? {} : { actor })
  };
}

export function denyPermission(
  requirement: PermissionRequirement,
  reason: PermissionDeniedReason,
  safeMessage: string,
  input: { readonly actor?: ActorRef; readonly code?: string; readonly detailsRef?: string } = {}
): PermissionDeniedDecision {
  return {
    allowed: false,
    requirement,
    reason,
    code: input.code ?? reason,
    safeMessage,
    ...(input.actor === undefined ? {} : { actor: input.actor }),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef })
  };
}
