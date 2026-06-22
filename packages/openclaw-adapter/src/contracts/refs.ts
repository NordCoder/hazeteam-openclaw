/**
 * Shared public-safe reference primitives for the adapter contract layers.
 *
 * These shapes are deliberately small and portable: they carry stable public
 * identifiers and display-safe metadata only, with no raw platform payloads,
 * SDK objects, secrets, or hazeteam-core private source objects.
 */
export type AdapterPublicId = string;
export type AdapterIsoTimestamp = string;

export interface WorkspaceRef {
  readonly id: AdapterPublicId;
}

export interface AgentRef {
  readonly id: AdapterPublicId;
  readonly kind?: string;
}

export interface ActorRef {
  readonly externalUserId: AdapterPublicId;
  readonly displayName?: string;
  readonly username?: string;
  readonly roles?: readonly string[];
  readonly isBot?: boolean;
}

export interface CorrelationRef {
  readonly id: AdapterPublicId;
}

export interface AdapterOperationRef {
  readonly id: AdapterPublicId;
}

export interface AdapterOperationContext {
  readonly correlation?: CorrelationRef;
  readonly operation?: AdapterOperationRef;
  readonly occurredAt?: AdapterIsoTimestamp;
}

function normalizePublicId(value: string, label: string): AdapterPublicId {
  const id = value.trim();
  if (id.length === 0) {
    throw new TypeError(`${label} must be a non-empty public-safe id`);
  }
  return id;
}

export function createWorkspaceRef(id: string): WorkspaceRef {
  return { id: normalizePublicId(id, "workspaceRef.id") };
}

export function createAgentRef(id: string, kind?: string): AgentRef {
  const ref: AgentRef = { id: normalizePublicId(id, "agentRef.id") };
  return kind === undefined ? ref : { ...ref, kind };
}

export function createActorRef(input: ActorRef): ActorRef {
  return {
    externalUserId: normalizePublicId(input.externalUserId, "actor.externalUserId"),
    ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
    ...(input.username === undefined ? {} : { username: input.username }),
    ...(input.roles === undefined ? {} : { roles: [...input.roles] }),
    ...(input.isBot === undefined ? {} : { isBot: input.isBot })
  };
}

export function createCorrelationRef(id: string): CorrelationRef {
  return { id: normalizePublicId(id, "correlationRef.id") };
}

export function createAdapterOperationRef(id: string): AdapterOperationRef {
  return { id: normalizePublicId(id, "adapterOperationRef.id") };
}
