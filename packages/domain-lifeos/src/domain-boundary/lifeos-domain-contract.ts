export type LifeosJsonPrimitive = string | number | boolean | null;

export type LifeosDomainRef = `domain:lifeos:${string}`;
export type LifeosAgentRef = `agent:lifeos:${string}`;
export type LifeosWorkspaceRef = `workspace:${string}`;
export type LifeosActorRef = `actor:${string}`;
export type LifeosPrincipalRef = `principal:${string}`;
export type LifeosPolicyRef = `domain-policy:lifeos:${string}`;
export type LifeosApprovalRef = `domain-approval:lifeos:${string}`;
export type LifeosCapabilityRef = `runtime-capability:${string}`;
export type LifeosCapabilityActionRef = `capability-action:${string}`;
export type LifeosSafeAttachmentRef = `attachment:lifeos:${string}`;
export type LifeosCorrelationRef = `correlation:${string}`;
export type LifeosIdempotencyRef = `idempotency:${string}`;
export type LifeosDomainEventRef = `domain-event:lifeos:${string}`;
export type LifeosDomainCommandRef = `domain-command:lifeos:${string}`;
export type LifeosSafeFieldRef = `safe-field:lifeos:${string}`;
export type LifeosPresentationRef = `presentation:lifeos:${string}`;

export type LifeosDomainContractPosture =
  | 'contract-only'
  | 'descriptor-only'
  | 'fake-or-inert-below-production'
  | 'not-implemented'
  | 'not-production-ready';

export type LifeosRedactionStatus = 'redacted-json-safe' | 'safe-ref-only' | 'bounded-summary-only';

export type LifeosAttemptGateState =
  | 'not-configured'
  | 'blocked'
  | 'ready-to-attempt-not-pass'
  | 'ready-to-run-not-pass';

export type LifeosProviderAcknowledgementBoundary =
  | 'not-attempted'
  | 'acknowledgement-only-not-business-success'
  | 'business-success-requires-separate-evidence';

export type LifeosDomainEventKind =
  | 'domain-context-described'
  | 'agent-context-described'
  | 'workspace-context-described'
  | 'domain-command-described'
  | 'approval-requirement-described'
  | 'capability-declaration-described'
  | 'public-projection-described';

export type LifeosDomainEventSourceScope =
  | 'adapter-normalized-context'
  | 'plugin-normalized-context'
  | 'domain-descriptor-context'
  | 'capability-safe-summary-context'
  | 'operator-safe-context';

export type LifeosDomainCommandKind =
  | 'topic-command-descriptor'
  | 'quick-action-descriptor'
  | 'status-query-descriptor'
  | 'approval-control-descriptor'
  | 'capability-action-descriptor'
  | 'admin-control-descriptor';

export type LifeosDomainCommandVisibility = 'visible' | 'hidden' | 'admin' | 'advanced';

export type LifeosDomainInputValueKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'safe-ref'
  | 'safe-ref-list'
  | 'bounded-text'
  | 'readonly-array'
  | 'plain-readonly-object';

export type LifeosApprovalMode =
  | 'not-required'
  | 'policy-controlled'
  | 'required-before-external-effect'
  | 'required-before-sensitive-output'
  | 'blocked-until-policy-evaluated';

export type LifeosApprovalRiskClass =
  | 'read-only'
  | 'safe-summary'
  | 'external-read'
  | 'external-effect'
  | 'sensitive-output'
  | 'destructive'
  | 'administrative';

export type LifeosIdempotencyStrategyKind =
  | 'derived-from-domain-event-ref'
  | 'derived-from-command-ref'
  | 'derived-from-approval-ref'
  | 'derived-from-capability-action-ref'
  | 'caller-supplied-safe-ref'
  | 'not-required-read-only';

export type LifeosAttachmentKind = 'document' | 'image' | 'reference' | 'summary';

/**
 * Domain descriptors are vocabulary, not product behavior. Values crossing this
 * boundary must stay JSON-safe: primitives, readonly arrays, and plain readonly
 * objects only.
 */
export interface LifeosSafeFieldDescriptor {
  readonly fieldRef: LifeosSafeFieldRef;
  readonly displayLabel: string;
  readonly valueKind: LifeosDomainInputValueKind;
  readonly required: boolean;
  readonly redactionStatus: LifeosRedactionStatus;
  readonly maxLength?: number;
  readonly maxItems?: number;
}

export interface LifeosSafeInputShapeDescriptor {
  readonly shapeKind: 'lifeos-safe-input-shape-descriptor';
  readonly fields: readonly LifeosSafeFieldDescriptor[];
  readonly allowsFunctions: false;
  readonly allowsClasses: false;
  readonly allowsSymbols: false;
  readonly allowsNonJsonValues: false;
}

export interface LifeosIdempotencyStrategyDescriptor {
  readonly strategyKind: LifeosIdempotencyStrategyKind;
  readonly idempotencyRef?: LifeosIdempotencyRef;
  readonly replaySafe: boolean;
  readonly duplicateExternalEffectAllowed: false;
}

export interface LifeosSafeAttachmentDescriptor {
  readonly attachmentRef: LifeosSafeAttachmentRef;
  readonly attachmentKind: LifeosAttachmentKind;
  readonly summary: string;
  readonly redactionStatus: LifeosRedactionStatus;
}

/**
 * Domain event descriptors describe domain-significant vocabulary only. They are
 * not event handlers and do not claim that events are captured, stored, routed,
 * or executed.
 */
export interface LifeosDomainEventDescriptor {
  readonly descriptorKind: 'lifeos-domain-event-descriptor';
  readonly eventRef: LifeosDomainEventRef;
  readonly eventKind: LifeosDomainEventKind;
  readonly domainRef: LifeosDomainRef;
  readonly sourceScope: LifeosDomainEventSourceScope;
  readonly agentRefs: readonly LifeosAgentRef[];
  readonly workspaceRef?: LifeosWorkspaceRef;
  readonly actorRef?: LifeosActorRef;
  readonly principalRef?: LifeosPrincipalRef;
  readonly correlationRef?: LifeosCorrelationRef;
  readonly idempotencyRef?: LifeosIdempotencyRef;
  readonly attachmentRefs: readonly LifeosSafeAttachmentRef[];
  readonly summary: string;
  readonly redactionStatus: LifeosRedactionStatus;
  readonly contractPosture: LifeosDomainContractPosture;
}

export interface LifeosPolicyRequirementDescriptor {
  readonly policyRef: LifeosPolicyRef;
  readonly appliesToCommandRefs: readonly LifeosDomainCommandRef[];
  readonly appliesToCapabilityActionRefs: readonly LifeosCapabilityActionRef[];
  readonly summary: string;
  readonly enforcementOwner: 'plugin-core-policy-boundary';
}

export interface LifeosApprovalRequirement {
  readonly approvalRef: LifeosApprovalRef;
  readonly approvalMode: LifeosApprovalMode;
  readonly riskClass: LifeosApprovalRiskClass;
  readonly summary: string;
  readonly presentationRef?: LifeosPresentationRef;
  readonly correlationRef?: LifeosCorrelationRef;
  readonly approvalBoundary: 'declarative-requirement-only';
}

/**
 * Domain-to-OCA declarations may name the capability action a command needs.
 * They are not OCA execution and do not own OCA runtime mechanics.
 */
export interface LifeosDomainToOcaDeclaration {
  readonly declarationKind: 'lifeos-domain-to-oca-declaration';
  readonly capabilityRef: LifeosCapabilityRef;
  readonly capabilityActionRef: LifeosCapabilityActionRef;
  readonly allowedForAgentRefs: readonly LifeosAgentRef[];
  readonly approvalRequirement?: LifeosApprovalRequirement;
  readonly idempotencyStrategy?: LifeosIdempotencyStrategyDescriptor;
  readonly ocaBoundary: 'domain-to-oca-declaration-not-oca-execution';
}

/**
 * Domain command descriptors are command vocabulary, not command handlers. They
 * do not perform provider IO, start OCA work, mutate state, or load runtime
 * values.
 */
export interface LifeosDomainCommandDescriptor {
  readonly descriptorKind: 'lifeos-domain-command-descriptor';
  readonly commandRef: LifeosDomainCommandRef;
  readonly commandKind: LifeosDomainCommandKind;
  readonly domainRef: LifeosDomainRef;
  readonly visibility: LifeosDomainCommandVisibility;
  readonly displayLabel: string;
  readonly summary: string;
  readonly aliases: readonly string[];
  readonly agentRefs: readonly LifeosAgentRef[];
  readonly workspaceRef?: LifeosWorkspaceRef;
  readonly inputShape?: LifeosSafeInputShapeDescriptor;
  readonly policyRefs: readonly LifeosPolicyRef[];
  readonly approvalRequirement?: LifeosApprovalRequirement;
  readonly capabilityActionRef?: LifeosCapabilityActionRef;
  readonly domainToOcaDeclaration?: LifeosDomainToOcaDeclaration;
  readonly idempotencyStrategy?: LifeosIdempotencyStrategyDescriptor;
  readonly contractBoundary: 'descriptor-only-not-handler';
}

export interface LifeosDomainBoundaryInvariantDescriptor {
  readonly invariantKind: 'lifeos-domain-boundary-invariant';
  readonly domainDescriptorsAreProductBehavior: false;
  readonly domainCommandDescriptorsAreHandlers: false;
  readonly domainToOcaDeclarationsAreOcaExecution: false;
  readonly providerAcknowledgementBoundary: LifeosProviderAcknowledgementBoundary;
  readonly attemptGateState: LifeosAttemptGateState;
  readonly fakeOrInertBoundaryPosture: 'below-production-readiness';
  readonly productionReady: false;
}

/**
 * Redacted public projections expose descriptor-level information only. They do
 * not expose opaque runtime objects, provider objects, runtime values, or
 * unbounded diagnostic material.
 */
export interface LifeosRedactedPublicDomainProjection {
  readonly projectionKind: 'lifeos-redacted-public-domain-projection';
  readonly domainRef: LifeosDomainRef;
  readonly agentRef?: LifeosAgentRef;
  readonly workspaceRef?: LifeosWorkspaceRef;
  readonly actorRef?: LifeosActorRef;
  readonly principalRef?: LifeosPrincipalRef;
  readonly eventRef?: LifeosDomainEventRef;
  readonly commandRef?: LifeosDomainCommandRef;
  readonly policyRefs: readonly LifeosPolicyRef[];
  readonly approvalRefs: readonly LifeosApprovalRef[];
  readonly capabilityActionRefs: readonly LifeosCapabilityActionRef[];
  readonly attachmentRefs: readonly LifeosSafeAttachmentRef[];
  readonly correlationRef?: LifeosCorrelationRef;
  readonly idempotencyRef?: LifeosIdempotencyRef;
  readonly summary: string;
  readonly redactionStatus: LifeosRedactionStatus;
  readonly contractPosture: LifeosDomainContractPosture;
  readonly providerAcknowledgementBoundary: LifeosProviderAcknowledgementBoundary;
  readonly attemptGateState?: LifeosAttemptGateState;
  readonly productionReady: false;
  readonly safeScalarContext: readonly LifeosJsonPrimitive[];
}
