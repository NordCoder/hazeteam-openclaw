import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AdapterRawDebugRef,
  AgentRef,
  WorkspaceRef,
} from './refs.js';

export interface AdapterOperationContext {
  readonly operationRef: AdapterOperationRef;
  readonly correlationRef: AdapterCorrelationRef;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly actorRef?: ActorRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly rawDebugRef?: AdapterRawDebugRef;
}

export interface AdapterOperationInput {
  readonly operationRef: AdapterOperationRef;
  readonly correlationRef: AdapterCorrelationRef;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly actorRef?: ActorRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly rawDebugRef?: AdapterRawDebugRef;
}

export function createAdapterOperationContext(
  input: AdapterOperationInput,
): AdapterOperationContext {
  return Object.freeze({
    operationRef: input.operationRef,
    correlationRef: input.correlationRef,
    ...(input.workspaceRef === undefined ? {} : { workspaceRef: input.workspaceRef }),
    ...(input.agentRef === undefined ? {} : { agentRef: input.agentRef }),
    ...(input.actorRef === undefined ? {} : { actorRef: input.actorRef }),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.rawDebugRef === undefined ? {} : { rawDebugRef: input.rawDebugRef }),
  });
}
