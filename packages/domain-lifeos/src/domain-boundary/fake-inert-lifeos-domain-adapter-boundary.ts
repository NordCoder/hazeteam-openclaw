import type {
  LifeosActorRef,
  LifeosAgentRef,
  LifeosApprovalMode,
  LifeosApprovalRef,
  LifeosApprovalRequirement,
  LifeosApprovalRiskClass,
  LifeosAttachmentKind,
  LifeosAttemptGateState,
  LifeosCapabilityActionRef,
  LifeosCapabilityRef,
  LifeosCorrelationRef,
  LifeosDomainBoundaryInvariantDescriptor,
  LifeosDomainCommandDescriptor,
  LifeosDomainCommandKind,
  LifeosDomainCommandRef,
  LifeosDomainCommandVisibility,
  LifeosDomainContractPosture,
  LifeosDomainEventDescriptor,
  LifeosDomainEventKind,
  LifeosDomainEventRef,
  LifeosDomainEventSourceScope,
  LifeosDomainInputValueKind,
  LifeosDomainRef,
  LifeosDomainToOcaDeclaration,
  LifeosIdempotencyRef,
  LifeosIdempotencyStrategyDescriptor,
  LifeosIdempotencyStrategyKind,
  LifeosJsonPrimitive,
  LifeosPolicyRef,
  LifeosPolicyRequirementDescriptor,
  LifeosPresentationRef,
  LifeosPrincipalRef,
  LifeosProviderAcknowledgementBoundary,
  LifeosRedactedPublicDomainProjection,
  LifeosRedactionStatus,
  LifeosSafeAttachmentDescriptor,
  LifeosSafeAttachmentRef,
  LifeosSafeFieldDescriptor,
  LifeosSafeFieldRef,
  LifeosSafeInputShapeDescriptor,
  LifeosWorkspaceRef,
} from './lifeos-domain-contract.js';

export interface LifeosNormalizedSafeAdapterContext {
  readonly domainRef: LifeosDomainRef;
  readonly agentRefs: readonly LifeosAgentRef[];
  readonly workspaceRef?: LifeosWorkspaceRef;
  readonly actorRef?: LifeosActorRef;
  readonly principalRef?: LifeosPrincipalRef;
  readonly correlationRef?: LifeosCorrelationRef;
  readonly idempotencyRef?: LifeosIdempotencyRef;
  readonly safeAttachmentRefs?: readonly LifeosSafeAttachmentRef[];
  readonly safeAliases?: readonly string[];
  readonly safeBoundedSummary?: string;
  readonly safeScalarContext?: readonly LifeosJsonPrimitive[];
}

export interface LifeosSafeFieldInput {
  readonly fieldRef: LifeosSafeFieldRef;
  readonly displayLabel: string;
  readonly valueKind: LifeosDomainInputValueKind;
  readonly required?: boolean;
  readonly redactionStatus?: LifeosRedactionStatus;
  readonly maxLength?: number;
  readonly maxItems?: number;
}

export interface LifeosSafeAttachmentInput {
  readonly attachmentRef: LifeosSafeAttachmentRef;
  readonly attachmentKind: LifeosAttachmentKind;
  readonly summary: string;
  readonly redactionStatus?: LifeosRedactionStatus;
}

export interface LifeosDomainEventInput {
  readonly context: LifeosNormalizedSafeAdapterContext;
  readonly eventRef: LifeosDomainEventRef;
  readonly eventKind: LifeosDomainEventKind;
  readonly sourceScope?: LifeosDomainEventSourceScope;
  readonly attachmentRefs?: readonly LifeosSafeAttachmentRef[];
  readonly summary?: string;
  readonly redactionStatus?: LifeosRedactionStatus;
  readonly contractPosture?: LifeosDomainContractPosture;
}

export interface LifeosPolicyRequirementInput {
  readonly policyRef: LifeosPolicyRef;
  readonly appliesToCommandRefs?: readonly LifeosDomainCommandRef[];
  readonly appliesToCapabilityActionRefs?: readonly LifeosCapabilityActionRef[];
  readonly summary?: string;
}

export interface LifeosApprovalRequirementInput {
  readonly approvalRef: LifeosApprovalRef;
  readonly approvalMode: LifeosApprovalMode;
  readonly riskClass: LifeosApprovalRiskClass;
  readonly summary?: string;
  readonly presentationRef?: LifeosPresentationRef;
  readonly correlationRef?: LifeosCorrelationRef;
}

export interface LifeosDomainToOcaDeclarationInput {
  readonly capabilityRef: LifeosCapabilityRef;
  readonly capabilityActionRef: LifeosCapabilityActionRef;
  readonly allowedForAgentRefs?: readonly LifeosAgentRef[];
  readonly approvalRequirement?: LifeosApprovalRequirement;
  readonly approvalRequirementInput?: LifeosApprovalRequirementInput;
  readonly idempotencyStrategy?: LifeosIdempotencyStrategyDescriptor;
  readonly idempotencyStrategyKind?: LifeosIdempotencyStrategyKind;
  readonly idempotencyRef?: LifeosIdempotencyRef;
}

export interface LifeosDomainCommandInput {
  readonly context: LifeosNormalizedSafeAdapterContext;
  readonly commandRef: LifeosDomainCommandRef;
  readonly commandKind: LifeosDomainCommandKind;
  readonly visibility?: LifeosDomainCommandVisibility;
  readonly displayLabel: string;
  readonly summary?: string;
  readonly aliases?: readonly string[];
  readonly inputFields?: readonly LifeosSafeFieldInput[];
  readonly policyRefs?: readonly LifeosPolicyRef[];
  readonly approvalRequirement?: LifeosApprovalRequirement;
  readonly approvalRequirementInput?: LifeosApprovalRequirementInput;
  readonly capabilityActionRef?: LifeosCapabilityActionRef;
  readonly domainToOcaDeclaration?: LifeosDomainToOcaDeclaration;
  readonly domainToOcaDeclarationInput?: LifeosDomainToOcaDeclarationInput;
  readonly idempotencyStrategy?: LifeosIdempotencyStrategyDescriptor;
  readonly idempotencyStrategyKind?: LifeosIdempotencyStrategyKind;
}

export interface LifeosDomainProjectionInput {
  readonly context: LifeosNormalizedSafeAdapterContext;
  readonly eventDescriptor?: LifeosDomainEventDescriptor;
  readonly commandDescriptor?: LifeosDomainCommandDescriptor;
  readonly policyRequirements?: readonly LifeosPolicyRequirementDescriptor[];
  readonly approvalRequirements?: readonly LifeosApprovalRequirement[];
  readonly domainToOcaDeclarations?: readonly LifeosDomainToOcaDeclaration[];
  readonly attachmentDescriptors?: readonly LifeosSafeAttachmentDescriptor[];
  readonly invariant?: LifeosDomainBoundaryInvariantDescriptor;
  readonly summary?: string;
  readonly redactionStatus?: LifeosRedactionStatus;
  readonly contractPosture?: LifeosDomainContractPosture;
  readonly safeScalarContext?: readonly LifeosJsonPrimitive[];
}

export interface LifeosBoundaryInvariantInput {
  readonly providerAcknowledgementBoundary?: LifeosProviderAcknowledgementBoundary;
  readonly attemptGateState?: LifeosAttemptGateState;
}

export interface FakeInertLifeosDomainAdapterBoundary {
  readonly describeDomainEvent: (input: LifeosDomainEventInput) => LifeosDomainEventDescriptor;
  readonly describeDomainCommand: (input: LifeosDomainCommandInput) => LifeosDomainCommandDescriptor;
  readonly describePolicyRequirement: (input: LifeosPolicyRequirementInput) => LifeosPolicyRequirementDescriptor;
  readonly describeApprovalRequirement: (input: LifeosApprovalRequirementInput) => LifeosApprovalRequirement;
  readonly declareDomainToOca: (input: LifeosDomainToOcaDeclarationInput, context: LifeosNormalizedSafeAdapterContext) => LifeosDomainToOcaDeclaration;
  readonly describeBoundaryInvariant: (input?: LifeosBoundaryInvariantInput) => LifeosDomainBoundaryInvariantDescriptor;
  readonly describeSafeAttachment: (input: LifeosSafeAttachmentInput) => LifeosSafeAttachmentDescriptor;
  readonly projectPublicly: (input: LifeosDomainProjectionInput) => LifeosRedactedPublicDomainProjection;
}

export function createFakeInertLifeosDomainAdapterBoundary(): FakeInertLifeosDomainAdapterBoundary {
  return Object.freeze({
    describeDomainEvent,
    describeDomainCommand,
    describePolicyRequirement,
    describeApprovalRequirement,
    declareDomainToOca,
    describeBoundaryInvariant,
    describeSafeAttachment,
    projectPublicly,
  } satisfies FakeInertLifeosDomainAdapterBoundary);
}

export const fakeInertLifeosDomainAdapterBoundary = createFakeInertLifeosDomainAdapterBoundary();

export function describeDomainEvent(input: LifeosDomainEventInput): LifeosDomainEventDescriptor {
  const context = input.context;

  return Object.freeze({
    descriptorKind: 'lifeos-domain-event-descriptor',
    eventRef: input.eventRef,
    eventKind: input.eventKind,
    domainRef: context.domainRef,
    sourceScope: input.sourceScope ?? 'adapter-normalized-context',
    agentRefs: cloneRefs(context.agentRefs),
    workspaceRef: context.workspaceRef,
    actorRef: context.actorRef,
    principalRef: context.principalRef,
    correlationRef: context.correlationRef,
    idempotencyRef: context.idempotencyRef,
    attachmentRefs: mergeRefs(context.safeAttachmentRefs, input.attachmentRefs),
    summary: boundedSummary(input.summary ?? context.safeBoundedSummary, defaultEventSummary(input.eventKind)),
    redactionStatus: input.redactionStatus ?? 'redacted-json-safe',
    contractPosture: input.contractPosture ?? 'fake-or-inert-below-production',
  } satisfies LifeosDomainEventDescriptor);
}

export function describeDomainCommand(input: LifeosDomainCommandInput): LifeosDomainCommandDescriptor {
  const context = input.context;
  const approvalRequirement = input.approvalRequirement ?? describeOptionalApprovalRequirement(input.approvalRequirementInput);
  const domainToOcaDeclaration =
    input.domainToOcaDeclaration ?? describeOptionalDomainToOcaDeclaration(input.domainToOcaDeclarationInput, context, approvalRequirement);
  const idempotencyStrategy =
    input.idempotencyStrategy ??
    domainToOcaDeclaration?.idempotencyStrategy ??
    describeIdempotencyStrategy(
      input.idempotencyStrategyKind ?? defaultIdempotencyStrategyKind(input.commandKind, input.capabilityActionRef ?? domainToOcaDeclaration?.capabilityActionRef),
      context.idempotencyRef,
    );

  return Object.freeze({
    descriptorKind: 'lifeos-domain-command-descriptor',
    commandRef: input.commandRef,
    commandKind: input.commandKind,
    domainRef: context.domainRef,
    visibility: input.visibility ?? defaultVisibility(input.commandKind),
    displayLabel: boundedLabel(input.displayLabel, 'LifeOS domain command'),
    summary: boundedSummary(input.summary ?? context.safeBoundedSummary, defaultCommandSummary(input.commandKind)),
    aliases: mergeAliases(context.safeAliases, input.aliases),
    agentRefs: cloneRefs(context.agentRefs),
    workspaceRef: context.workspaceRef,
    inputShape: describeOptionalInputShape(input.inputFields),
    policyRefs: cloneRefs(input.policyRefs),
    approvalRequirement,
    capabilityActionRef: input.capabilityActionRef ?? domainToOcaDeclaration?.capabilityActionRef,
    domainToOcaDeclaration,
    idempotencyStrategy,
    contractBoundary: 'descriptor-only-not-handler',
  } satisfies LifeosDomainCommandDescriptor);
}

export function describePolicyRequirement(input: LifeosPolicyRequirementInput): LifeosPolicyRequirementDescriptor {
  return Object.freeze({
    policyRef: input.policyRef,
    appliesToCommandRefs: cloneRefs(input.appliesToCommandRefs),
    appliesToCapabilityActionRefs: cloneRefs(input.appliesToCapabilityActionRefs),
    summary: boundedSummary(input.summary, 'Declarative LifeOS policy requirement owned by the plugin core policy boundary.'),
    enforcementOwner: 'plugin-core-policy-boundary',
  } satisfies LifeosPolicyRequirementDescriptor);
}

export function describeApprovalRequirement(input: LifeosApprovalRequirementInput): LifeosApprovalRequirement {
  return Object.freeze({
    approvalRef: input.approvalRef,
    approvalMode: input.approvalMode,
    riskClass: input.riskClass,
    summary: boundedSummary(input.summary, defaultApprovalSummary(input.approvalMode, input.riskClass)),
    presentationRef: input.presentationRef,
    correlationRef: input.correlationRef,
    approvalBoundary: 'declarative-requirement-only',
  } satisfies LifeosApprovalRequirement);
}

export function declareDomainToOca(
  input: LifeosDomainToOcaDeclarationInput,
  context: LifeosNormalizedSafeAdapterContext,
): LifeosDomainToOcaDeclaration {
  const approvalRequirement = input.approvalRequirement ?? describeOptionalApprovalRequirement(input.approvalRequirementInput);

  return Object.freeze({
    declarationKind: 'lifeos-domain-to-oca-declaration',
    capabilityRef: input.capabilityRef,
    capabilityActionRef: input.capabilityActionRef,
    allowedForAgentRefs: cloneRefs(input.allowedForAgentRefs ?? context.agentRefs),
    approvalRequirement,
    idempotencyStrategy:
      input.idempotencyStrategy ??
      describeIdempotencyStrategy(input.idempotencyStrategyKind ?? 'derived-from-capability-action-ref', input.idempotencyRef ?? context.idempotencyRef),
    ocaBoundary: 'domain-to-oca-declaration-not-oca-execution',
  } satisfies LifeosDomainToOcaDeclaration);
}

export function describeBoundaryInvariant(input: LifeosBoundaryInvariantInput = {}): LifeosDomainBoundaryInvariantDescriptor {
  return Object.freeze({
    invariantKind: 'lifeos-domain-boundary-invariant',
    domainDescriptorsAreProductBehavior: false,
    domainCommandDescriptorsAreHandlers: false,
    domainToOcaDeclarationsAreOcaExecution: false,
    providerAcknowledgementBoundary: input.providerAcknowledgementBoundary ?? 'not-attempted',
    attemptGateState: input.attemptGateState ?? 'not-configured',
    fakeOrInertBoundaryPosture: 'below-production-readiness',
    productionReady: false,
  } satisfies LifeosDomainBoundaryInvariantDescriptor);
}

export function describeSafeAttachment(input: LifeosSafeAttachmentInput): LifeosSafeAttachmentDescriptor {
  return Object.freeze({
    attachmentRef: input.attachmentRef,
    attachmentKind: input.attachmentKind,
    summary: boundedSummary(input.summary, 'Safe LifeOS attachment reference.'),
    redactionStatus: input.redactionStatus ?? 'safe-ref-only',
  } satisfies LifeosSafeAttachmentDescriptor);
}

export function projectPublicly(input: LifeosDomainProjectionInput): LifeosRedactedPublicDomainProjection {
  const context = input.context;
  const invariant = input.invariant ?? describeBoundaryInvariant();
  const command = input.commandDescriptor;
  const event = input.eventDescriptor;
  const declarations = cloneItems(input.domainToOcaDeclarations);
  const approvalRequirements = cloneItems(input.approvalRequirements);
  const attachmentDescriptors = cloneItems(input.attachmentDescriptors);

  return Object.freeze({
    projectionKind: 'lifeos-redacted-public-domain-projection',
    domainRef: context.domainRef,
    agentRef: firstRef(command?.agentRefs) ?? firstRef(event?.agentRefs) ?? firstRef(context.agentRefs),
    workspaceRef: command?.workspaceRef ?? event?.workspaceRef ?? context.workspaceRef,
    actorRef: event?.actorRef ?? context.actorRef,
    principalRef: event?.principalRef ?? context.principalRef,
    eventRef: event?.eventRef,
    commandRef: command?.commandRef,
    policyRefs: mergeRefs(command?.policyRefs, collectPolicyRefs(input.policyRequirements)),
    approvalRefs: collectApprovalRefs(command, declarations, approvalRequirements),
    capabilityActionRefs: collectCapabilityActionRefs(command, declarations),
    attachmentRefs: mergeRefs(context.safeAttachmentRefs, event?.attachmentRefs, attachmentDescriptors.map((attachment) => attachment.attachmentRef)),
    correlationRef: event?.correlationRef ?? command?.approvalRequirement?.correlationRef ?? context.correlationRef,
    idempotencyRef: event?.idempotencyRef ?? command?.idempotencyStrategy?.idempotencyRef ?? context.idempotencyRef,
    summary: boundedSummary(input.summary ?? command?.summary ?? event?.summary ?? context.safeBoundedSummary, 'Redacted fake inert LifeOS domain projection.'),
    redactionStatus: input.redactionStatus ?? 'redacted-json-safe',
    contractPosture: input.contractPosture ?? commandPosture(command) ?? event?.contractPosture ?? 'fake-or-inert-below-production',
    providerAcknowledgementBoundary: invariant.providerAcknowledgementBoundary,
    attemptGateState: invariant.attemptGateState,
    productionReady: false,
    safeScalarContext: describeSafeScalarContext(input.safeScalarContext ?? context.safeScalarContext),
  } satisfies LifeosRedactedPublicDomainProjection);
}

function describeOptionalApprovalRequirement(input: LifeosApprovalRequirementInput | undefined): LifeosApprovalRequirement | undefined {
  return input === undefined ? undefined : describeApprovalRequirement(input);
}

function describeOptionalDomainToOcaDeclaration(
  input: LifeosDomainToOcaDeclarationInput | undefined,
  context: LifeosNormalizedSafeAdapterContext,
  fallbackApprovalRequirement: LifeosApprovalRequirement | undefined,
): LifeosDomainToOcaDeclaration | undefined {
  if (input === undefined) {
    return undefined;
  }

  return declareDomainToOca(
    {
      ...input,
      approvalRequirement: input.approvalRequirement ?? fallbackApprovalRequirement,
    },
    context,
  );
}

function describeOptionalInputShape(fields: readonly LifeosSafeFieldInput[] | undefined): LifeosSafeInputShapeDescriptor | undefined {
  if (fields === undefined) {
    return undefined;
  }

  return Object.freeze({
    shapeKind: 'lifeos-safe-input-shape-descriptor',
    fields: Object.freeze(fields.slice(0, MAX_FIELD_COUNT).map(describeSafeField)),
    allowsFunctions: false,
    allowsClasses: false,
    allowsSymbols: false,
    allowsNonJsonValues: false,
  } satisfies LifeosSafeInputShapeDescriptor);
}

function describeSafeField(field: LifeosSafeFieldInput): LifeosSafeFieldDescriptor {
  return Object.freeze({
    fieldRef: field.fieldRef,
    displayLabel: boundedLabel(field.displayLabel, 'Safe input'),
    valueKind: field.valueKind,
    required: field.required ?? false,
    redactionStatus: field.redactionStatus ?? 'redacted-json-safe',
    maxLength: field.maxLength,
    maxItems: field.maxItems,
  } satisfies LifeosSafeFieldDescriptor);
}

function describeIdempotencyStrategy(
  strategyKind: LifeosIdempotencyStrategyKind,
  idempotencyRef: LifeosIdempotencyRef | undefined,
): LifeosIdempotencyStrategyDescriptor {
  return Object.freeze({
    strategyKind,
    idempotencyRef,
    replaySafe: true,
    duplicateExternalEffectAllowed: false,
  } satisfies LifeosIdempotencyStrategyDescriptor);
}

function defaultIdempotencyStrategyKind(
  commandKind: LifeosDomainCommandKind,
  capabilityActionRef: LifeosCapabilityActionRef | undefined,
): LifeosIdempotencyStrategyKind {
  if (commandKind === 'status-query-descriptor') {
    return 'not-required-read-only';
  }

  if (capabilityActionRef !== undefined) {
    return 'derived-from-capability-action-ref';
  }

  return 'derived-from-command-ref';
}

function defaultVisibility(commandKind: LifeosDomainCommandKind): LifeosDomainCommandVisibility {
  if (commandKind === 'admin-control-descriptor') {
    return 'admin';
  }

  if (commandKind === 'approval-control-descriptor') {
    return 'advanced';
  }

  return 'visible';
}

function defaultEventSummary(eventKind: LifeosDomainEventKind): string {
  return `Descriptor-only LifeOS domain event: ${eventKind}.`;
}

function defaultCommandSummary(commandKind: LifeosDomainCommandKind): string {
  return `Descriptor-only LifeOS domain command: ${commandKind}.`;
}

function defaultApprovalSummary(approvalMode: LifeosApprovalMode, riskClass: LifeosApprovalRiskClass): string {
  return `Declarative approval requirement: ${approvalMode} for ${riskClass}.`;
}

function commandPosture(command: LifeosDomainCommandDescriptor | undefined): LifeosDomainContractPosture | undefined {
  return command === undefined ? undefined : 'fake-or-inert-below-production';
}

function collectPolicyRefs(policyRequirements: readonly LifeosPolicyRequirementDescriptor[] | undefined): readonly LifeosPolicyRef[] {
  return Object.freeze(cloneItems(policyRequirements).map((policy) => policy.policyRef));
}

function collectApprovalRefs(
  command: LifeosDomainCommandDescriptor | undefined,
  declarations: readonly LifeosDomainToOcaDeclaration[],
  approvalRequirements: readonly LifeosApprovalRequirement[],
): readonly LifeosApprovalRef[] {
  return uniqueRefs(
    [
      command?.approvalRequirement?.approvalRef,
      command?.domainToOcaDeclaration?.approvalRequirement?.approvalRef,
      ...declarations.map((declaration) => declaration.approvalRequirement?.approvalRef),
      ...approvalRequirements.map((approval) => approval.approvalRef),
    ].filter(isDefined),
  );
}

function collectCapabilityActionRefs(
  command: LifeosDomainCommandDescriptor | undefined,
  declarations: readonly LifeosDomainToOcaDeclaration[],
): readonly LifeosCapabilityActionRef[] {
  return uniqueRefs([command?.capabilityActionRef, command?.domainToOcaDeclaration?.capabilityActionRef, ...declarations.map((declaration) => declaration.capabilityActionRef)].filter(isDefined));
}

function describeSafeScalarContext(input: readonly LifeosJsonPrimitive[] | undefined): readonly LifeosJsonPrimitive[] {
  if (input === undefined) {
    return Object.freeze([] as LifeosJsonPrimitive[]);
  }

  return Object.freeze(
    input
      .slice(0, MAX_SAFE_SCALAR_COUNT)
      .map((value) => (typeof value === 'string' ? boundedSummary(value, 'redacted') : value))
      .filter(isSafePrimitive),
  );
}

function mergeAliases(...sources: readonly (readonly string[] | undefined)[]): readonly string[] {
  return Object.freeze(
    uniqueStrings(
      sources
        .flatMap((source) => source ?? [])
        .map((alias) => boundedAlias(alias))
        .filter((alias) => alias.length > 0),
    ).slice(0, MAX_ALIAS_COUNT),
  );
}

function mergeRefs<T extends string>(...sources: readonly (readonly T[] | undefined)[]): readonly T[] {
  return Object.freeze(uniqueRefs(sources.flatMap((source) => source ?? [])).slice(0, MAX_REF_COUNT));
}

function cloneRefs<T extends string>(source: readonly T[] | undefined): readonly T[] {
  return Object.freeze((source ?? []).slice(0, MAX_REF_COUNT));
}

function cloneItems<T>(source: readonly T[] | undefined): readonly T[] {
  return Object.freeze([...(source ?? [])]);
}

function uniqueRefs<T extends string>(source: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(source)].slice(0, MAX_REF_COUNT));
}

function uniqueStrings(source: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(source)]);
}

function firstRef<T extends string>(source: readonly T[] | undefined): T | undefined {
  return source?.[0];
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function isSafePrimitive(value: LifeosJsonPrimitive): boolean {
  return value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
}

function boundedAlias(value: string): string {
  return boundedText(value, '', MAX_ALIAS_LENGTH);
}

function boundedLabel(value: string, fallback: string): string {
  return boundedText(value, fallback, MAX_LABEL_LENGTH);
}

function boundedSummary(value: string | undefined, fallback: string): string {
  return boundedText(value, fallback, MAX_SUMMARY_LENGTH);
}

function boundedText(value: string | undefined, fallback: string, maxLength: number): string {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  const candidate = normalized.length === 0 || containsUnsafeFragment(normalized) ? fallback : normalized;

  return candidate.slice(0, maxLength);
}

function containsUnsafeFragment(value: string): boolean {
  const normalized = value.toLowerCase();

  return UNSAFE_TEXT_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function fromCharCodes(codes: readonly number[]): string {
  return String.fromCharCode(...codes);
}

const MAX_ALIAS_COUNT = 6;
const MAX_ALIAS_LENGTH = 48;
const MAX_FIELD_COUNT = 8;
const MAX_LABEL_LENGTH = 80;
const MAX_REF_COUNT = 16;
const MAX_SAFE_SCALAR_COUNT = 8;
const MAX_SUMMARY_LENGTH = 180;

const UNSAFE_TEXT_FRAGMENTS = Object.freeze(
  [
    [112, 97, 121, 108, 111, 97, 100],
    [116, 111, 107, 101, 110],
    [115, 101, 99, 114, 101, 116],
    [99, 114, 101, 100, 101, 110, 116, 105, 97, 108],
    [102, 105, 108, 101, 58, 47, 47],
    [47, 117, 115, 114, 47],
    [47, 104, 111, 109, 101, 47],
    [47, 118, 97, 114, 47],
    [92, 92],
    [115, 116, 100, 111, 117, 116],
    [115, 116, 100, 101, 114, 114],
    [99, 111, 109, 109, 97, 110, 100, 111, 117, 116, 112, 117, 116],
  ].map(fromCharCodes),
);
