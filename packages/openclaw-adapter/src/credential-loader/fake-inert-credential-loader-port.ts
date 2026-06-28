import type {
  CredentialLoaderCredentialKind,
  CredentialLoaderCredentialRef,
  CredentialLoaderConfigurationRef,
  CredentialLoaderDiagnostic,
  CredentialLoaderIssueCode,
  CredentialLoaderIssueSeverity,
  CredentialLoaderIssueSummary,
  CredentialLoaderProfileRef,
  CredentialLoaderPublicOutputClass,
  CredentialLoaderReadinessClaim,
  CredentialLoaderReadinessResult,
  CredentialLoaderReadinessStatus,
  CredentialLoaderRedactionState,
  CredentialLoaderRequirement,
  CredentialLoaderRequirementDescriptor,
  CredentialLoaderRequirementRef,
  CredentialLoaderResolutionResult,
  CredentialLoaderResolutionStatus,
  CredentialLoaderSafeText,
  CredentialLoaderSourceClass,
  RedactedCredentialDescriptor,
} from './credential-loader-contract.js';

const MAX_REQUIREMENTS = 50;
const MAX_REQUIREMENT_STATES = 100;
const MAX_SAFE_TEXT_LENGTH = 240;
const MAX_PUBLIC_DIAGNOSTICS = 100;
const MAX_DESCRIPTOR_DIAGNOSTICS = 12;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const URI_LIKE_PATTERN = /[a-z][a-z0-9+.-]*:\/\/\S+/giu;
const ABSOLUTE_LOCATION_PATTERN = /(?:\b[A-Za-z]:\\\S+|(?:\/[A-Za-z0-9._~-]+){2,})/gu;
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const REQUIREMENT_REF_PREFIX = 'credential-requirement:';
const CREDENTIAL_REF_PREFIX = 'credential:';
const CONFIGURATION_REF_PREFIX = 'configuration:';
const PROFILE_REF_PREFIX = 'credential-profile:';
const DEFAULT_AGGREGATE_CREDENTIAL_REF = 'credential:fake-inert-loader' as const;
const DEFAULT_AGGREGATE_LABEL = 'fake-inert-credential-loader';
const SAFE_DESCRIPTOR_REASON = 'Credential requirement is represented as a redacted descriptor only.';

const READINESS_CLAIM: CredentialLoaderReadinessClaim = 'credential-loader-not-production-ready';
const READINESS_OUTPUT_CLASS: CredentialLoaderPublicOutputClass = 'readiness-only';
const RESOLUTION_OUTPUT_CLASS: CredentialLoaderPublicOutputClass = 'redacted-descriptor-only';

const BLOCKING_INPUT_STATES = new Set<FakeInertCredentialLoaderInputState>([
  'missing',
  'invalid',
  'unavailable',
  'blocked',
  'disabled',
  'redacted-only',
  'not-attempted',
]);

const READINESS_BLOCKING_PRIORITY: readonly CredentialLoaderReadinessStatus[] = [
  'invalid',
  'blocked',
  'unavailable',
  'disabled',
  'missing',
  'redacted-only',
];

const CREDENTIAL_KINDS: ReadonlySet<string> = new Set([
  'provider-credential',
  'transport-credential',
  'runtime-configuration',
  'operator-gate',
  'test-fixture-credential',
  'generic-configuration',
  'unknown',
]);

const SOURCE_CLASSES: ReadonlySet<string> = new Set([
  'injected-port',
  'operator-provided',
  'deployment-profile',
  'managed-vault',
  'test-fixture',
  'redacted-only',
  'unavailable',
  'unknown',
]);

export type FakeInertCredentialLoaderInputState = CredentialLoaderReadinessStatus | 'not-attempted';

export interface FakeInertCredentialRequirementState {
  readonly requirementRef?: CredentialLoaderRequirementRef;
  readonly credentialRef?: CredentialLoaderCredentialRef;
  readonly state: FakeInertCredentialLoaderInputState;
  readonly sourceClass?: CredentialLoaderSourceClass;
  readonly redactedLabel?: CredentialLoaderSafeText;
  readonly safeReason?: CredentialLoaderSafeText;
  readonly safeHint?: CredentialLoaderSafeText;
  readonly safeDiagnostics?: readonly CredentialLoaderSafeText[];
}

export interface FakeInertCredentialOperatorGateState {
  readonly gateState: FakeInertCredentialLoaderInputState;
  readonly required?: boolean;
  readonly safeReason?: CredentialLoaderSafeText;
  readonly safeHint?: CredentialLoaderSafeText;
}

export interface FakeInertCredentialLoaderInput {
  readonly requirements: readonly CredentialLoaderRequirement[];
  readonly requirementStates?: readonly FakeInertCredentialRequirementState[];
  readonly defaultRequirementState?: FakeInertCredentialLoaderInputState;
  readonly operatorGateState?: FakeInertCredentialOperatorGateState;
  readonly redactedLoaderLabel?: CredentialLoaderSafeText;
}

export interface FakeInertCredentialLoaderPort {
  readonly describeReadiness: (input: FakeInertCredentialLoaderInput) => CredentialLoaderReadinessResult;
  readonly resolveRedacted: (input: FakeInertCredentialLoaderInput) => CredentialLoaderResolutionResult;
}

interface NormalizedRequirement {
  readonly requirement: CredentialLoaderRequirement;
  readonly diagnostics: readonly CredentialLoaderDiagnostic[];
}

interface RequirementEvaluation {
  readonly descriptor: CredentialLoaderRequirementDescriptor;
  readonly diagnostics: readonly CredentialLoaderDiagnostic[];
}

export function createFakeInertCredentialLoaderPort(): FakeInertCredentialLoaderPort {
  return fakeInertCredentialLoaderPort;
}

export const fakeInertCredentialLoaderPort: FakeInertCredentialLoaderPort = Object.freeze({
  describeReadiness: describeFakeInertCredentialReadiness,
  resolveRedacted: resolveFakeInertCredentialResolution,
});

export function describeFakeInertCredentialReadiness(
  input: FakeInertCredentialLoaderInput,
): CredentialLoaderReadinessResult {
  const evaluations = evaluateRequirements(input);
  const requirementDescriptors = freezeArray(evaluations.map((evaluation) => evaluation.descriptor));
  const requirementIssues = evaluations.flatMap((evaluation) => evaluation.diagnostics);
  const gateIssues = describeOperatorGate(input.operatorGateState);
  const issues = boundDiagnostics([...requirementIssues, ...gateIssues]);
  const readinessStatus = deriveCredentialReadinessStatus(requirementDescriptors, input.operatorGateState);
  const issueSummary = summarizeCredentialLoaderIssues(issues);

  return Object.freeze({
    resultKind: 'credential-loader-readiness',
    readinessStatus,
    readinessClaim: READINESS_CLAIM,
    publicOutputClass: READINESS_OUTPUT_CLASS,
    credentialDescriptor: buildAggregateCredentialDescriptor({
      readinessStatus,
      issueSummary,
      issues,
      redactedLoaderLabel: input.redactedLoaderLabel,
      requirements: requirementDescriptors,
    }),
    requirementDescriptors,
    issueSummary,
    issues,
  });
}

export function resolveFakeInertCredentialResolution(
  input: FakeInertCredentialLoaderInput,
): CredentialLoaderResolutionResult {
  const readiness = describeFakeInertCredentialReadiness(input);

  return Object.freeze({
    resultKind: 'credential-loader-resolution',
    resolutionStatus: deriveResolutionStatus(readiness.readinessStatus),
    readinessStatus: readiness.readinessStatus,
    readinessClaim: READINESS_CLAIM,
    publicOutputClass: RESOLUTION_OUTPUT_CLASS,
    credentialDescriptor: readiness.credentialDescriptor,
    issueSummary: readiness.issueSummary,
    issues: readiness.issues,
  });
}

export function summarizeCredentialLoaderIssues(
  issues: readonly CredentialLoaderDiagnostic[],
): CredentialLoaderIssueSummary {
  const boundedIssues = issues.slice(0, MAX_PUBLIC_DIAGNOSTICS);

  return Object.freeze({
    total: boundedIssues.length,
    blocking: boundedIssues.filter((issue) => issue.blocking).length,
    missing: boundedIssues.filter((issue) => isMissingIssueCode(issue.issueCode)).length,
    invalid: boundedIssues.filter((issue) => issue.issueCode === 'invalid-descriptor').length,
    unavailable: boundedIssues.filter((issue) => issue.issueCode === 'loader-unavailable').length,
    redactedOnly: boundedIssues.filter((issue) => issue.issueCode === 'redacted-only').length,
  });
}

export function isFakeInertCredentialLoaderOutputJsonSafe(
  output: CredentialLoaderReadinessResult | CredentialLoaderResolutionResult,
): boolean {
  try {
    return JSON.stringify(output) !== undefined;
  } catch {
    return false;
  }
}

function evaluateRequirements(input: FakeInertCredentialLoaderInput): readonly RequirementEvaluation[] {
  const states = input.requirementStates?.slice(0, MAX_REQUIREMENT_STATES) ?? [];
  const defaultState = normalizeInputState(input.defaultRequirementState ?? 'missing');

  return freezeArray(
    input.requirements
      .slice(0, MAX_REQUIREMENTS)
      .map((requirement, index) => evaluateRequirement(requirement, index, states, defaultState))
      .sort((left, right) => compareRequirementDescriptors(left.descriptor, right.descriptor)),
  );
}

function evaluateRequirement(
  requirement: CredentialLoaderRequirement,
  index: number,
  states: readonly FakeInertCredentialRequirementState[],
  defaultState: FakeInertCredentialLoaderInputState,
): RequirementEvaluation {
  const normalized = normalizeRequirement(requirement, index);
  const explicitState = findRequirementState(normalized.requirement, states);
  const state = normalizeInputState(explicitState?.state ?? defaultState);
  const readinessStatus = toReadinessStatus(state);
  const stateDiagnostic = buildStateDiagnostic(state, normalized.requirement.required, explicitState);
  const diagnostics = boundDescriptorDiagnostics([
    ...normalized.diagnostics,
    ...(stateDiagnostic === undefined ? [] : [stateDiagnostic]),
    ...safeTextDiagnostics(explicitState?.safeDiagnostics),
  ]);
  const safeReason = safeText(
    explicitState?.safeReason ?? defaultReasonForState(state),
    SAFE_DESCRIPTOR_REASON,
  );
  const redactedLabel = safeOptionalText(explicitState?.redactedLabel ?? normalized.requirement.redactedLabel);
  const sourceClass = normalizeSourceClass(explicitState?.sourceClass ?? normalized.requirement.sourceClass);
  const credentialDescriptor = buildCredentialDescriptor({
    requirement: normalized.requirement,
    readinessStatus,
    state,
    sourceClass,
    redactedLabel,
    safeReason,
    diagnostics,
  });

  const descriptor: CredentialLoaderRequirementDescriptor = Object.freeze({
    descriptorKind: 'credential-requirement-descriptor',
    requirement: normalized.requirement,
    credentialDescriptor,
    readinessStatus,
    blocking: diagnostics.some((diagnostic) => diagnostic.blocking),
    safeReason,
  });

  return Object.freeze({ descriptor, diagnostics });
}

function buildCredentialDescriptor(input: {
  readonly requirement: CredentialLoaderRequirement;
  readonly readinessStatus: CredentialLoaderReadinessStatus;
  readonly state: FakeInertCredentialLoaderInputState;
  readonly sourceClass: CredentialLoaderSourceClass;
  readonly redactedLabel: CredentialLoaderSafeText | undefined;
  readonly safeReason: CredentialLoaderSafeText;
  readonly diagnostics: readonly CredentialLoaderDiagnostic[];
}): RedactedCredentialDescriptor {
  return Object.freeze({
    descriptorKind: 'redacted-credential-descriptor',
    credentialRef: input.requirement.credentialRef,
    credentialKind: input.requirement.credentialKind,
    sourceClass: input.sourceClass,
    readinessStatus: input.readinessStatus,
    redactionState: redactionStateForInputState(input.state),
    configuredRedacted: input.state === 'configured-redacted',
    required: input.requirement.required,
    ...(input.redactedLabel === undefined ? {} : { redactedLabel: input.redactedLabel }),
    safeReason: input.safeReason,
    ...(input.diagnostics.length === 0 ? {} : { safeDiagnostics: input.diagnostics }),
  });
}

function buildAggregateCredentialDescriptor(input: {
  readonly readinessStatus: CredentialLoaderReadinessStatus;
  readonly issueSummary: CredentialLoaderIssueSummary;
  readonly issues: readonly CredentialLoaderDiagnostic[];
  readonly redactedLoaderLabel: CredentialLoaderSafeText | undefined;
  readonly requirements: readonly CredentialLoaderRequirementDescriptor[];
}): RedactedCredentialDescriptor {
  const hasRequiredRequirement = input.requirements.some((descriptor) => descriptor.requirement.required);
  const safeReason = safeText(
    `Fake inert credential loader summary: ${input.issueSummary.blocking} blocking issue(s), ${input.issueSummary.total} total issue(s).`,
    SAFE_DESCRIPTOR_REASON,
  );
  const redactedLabel = safeText(input.redactedLoaderLabel ?? DEFAULT_AGGREGATE_LABEL, DEFAULT_AGGREGATE_LABEL);

  return Object.freeze({
    descriptorKind: 'redacted-credential-descriptor',
    credentialRef: DEFAULT_AGGREGATE_CREDENTIAL_REF,
    credentialKind: 'generic-configuration',
    sourceClass: 'test-fixture',
    readinessStatus: input.readinessStatus,
    redactionState: 'redacted',
    configuredRedacted: input.readinessStatus === 'configured-redacted',
    required: hasRequiredRequirement,
    redactedLabel,
    safeReason,
    ...(input.issues.length === 0 ? {} : { safeDiagnostics: input.issues.slice(0, MAX_DESCRIPTOR_DIAGNOSTICS) }),
  });
}

function deriveCredentialReadinessStatus(
  descriptors: readonly CredentialLoaderRequirementDescriptor[],
  operatorGateState: FakeInertCredentialOperatorGateState | undefined,
): CredentialLoaderReadinessStatus {
  const gateStatus = deriveBlockingGateReadinessStatus(operatorGateState);

  if (gateStatus !== undefined) {
    return gateStatus;
  }

  const blockingStatuses = new Set(
    descriptors
      .filter((descriptor) => descriptor.blocking)
      .map((descriptor) => descriptor.readinessStatus),
  );
  const priorityStatus = READINESS_BLOCKING_PRIORITY.find((status) => blockingStatuses.has(status));

  if (priorityStatus !== undefined) {
    return priorityStatus;
  }

  if (descriptors.length === 0) {
    return 'dry-run-ready';
  }

  if (descriptors.some((descriptor) => descriptor.readinessStatus === 'redacted-only')) {
    return 'redacted-only';
  }

  if (descriptors.some((descriptor) => descriptor.readinessStatus === 'dry-run-ready')) {
    return 'dry-run-ready';
  }

  return 'configured-redacted';
}

function deriveBlockingGateReadinessStatus(
  operatorGateState: FakeInertCredentialOperatorGateState | undefined,
): CredentialLoaderReadinessStatus | undefined {
  if (operatorGateState === undefined || operatorGateState.required === false) {
    return undefined;
  }

  const gateState = normalizeInputState(operatorGateState.gateState);

  if (!BLOCKING_INPUT_STATES.has(gateState)) {
    return undefined;
  }

  return toReadinessStatus(gateState);
}

function deriveResolutionStatus(readinessStatus: CredentialLoaderReadinessStatus): CredentialLoaderResolutionStatus {
  switch (readinessStatus) {
    case 'dry-run-ready':
      return 'not-attempted';
    case 'configured-redacted':
    case 'missing':
    case 'invalid':
    case 'unavailable':
    case 'blocked':
    case 'disabled':
    case 'redacted-only':
      return readinessStatus;
  }
}

function describeOperatorGate(
  operatorGateState: FakeInertCredentialOperatorGateState | undefined,
): readonly CredentialLoaderDiagnostic[] {
  if (operatorGateState === undefined) {
    return [];
  }

  const gateState = normalizeInputState(operatorGateState.gateState);
  const blocking = operatorGateState.required !== false && BLOCKING_INPUT_STATES.has(gateState);
  const diagnostic = buildDiagnosticForState({
    state: gateState,
    required: blocking,
    safeReason: operatorGateState.safeReason,
    safeHint: operatorGateState.safeHint,
    gate: true,
  });

  return diagnostic === undefined ? [] : [diagnostic];
}

function buildStateDiagnostic(
  state: FakeInertCredentialLoaderInputState,
  required: boolean,
  explicitState: FakeInertCredentialRequirementState | undefined,
): CredentialLoaderDiagnostic | undefined {
  return buildDiagnosticForState({
    state,
    required,
    safeReason: explicitState?.safeReason,
    safeHint: explicitState?.safeHint,
    gate: false,
  });
}

function buildDiagnosticForState(input: {
  readonly state: FakeInertCredentialLoaderInputState;
  readonly required: boolean;
  readonly safeReason: CredentialLoaderSafeText | undefined;
  readonly safeHint: CredentialLoaderSafeText | undefined;
  readonly gate: boolean;
}): CredentialLoaderDiagnostic | undefined {
  const issueCode = issueCodeForState(input.state, input.gate);

  if (issueCode === undefined) {
    return undefined;
  }

  const severity = issueSeverityForState(input.state, input.required);
  const safeMessage = safeText(input.safeReason ?? defaultReasonForState(input.state), defaultReasonForState(input.state));
  const safeHint = safeOptionalText(input.safeHint);

  return Object.freeze({
    issueCode,
    severity,
    safeMessage,
    ...(safeHint === undefined ? {} : { safeHint }),
    blocking: input.required && BLOCKING_INPUT_STATES.has(input.state),
  });
}

function issueCodeForState(
  state: FakeInertCredentialLoaderInputState,
  gate: boolean,
): CredentialLoaderIssueCode | undefined {
  switch (state) {
    case 'configured-redacted':
    case 'dry-run-ready':
      return undefined;
    case 'missing':
      return gate ? 'missing-operator-gate' : 'missing-requirement';
    case 'invalid':
      return 'invalid-descriptor';
    case 'unavailable':
      return 'loader-unavailable';
    case 'blocked':
      return 'blocked-by-policy';
    case 'disabled':
      return 'disabled-by-operator';
    case 'redacted-only':
      return 'redacted-only';
    case 'not-attempted':
      return 'not-attempted';
  }
}

function issueSeverityForState(
  state: FakeInertCredentialLoaderInputState,
  required: boolean,
): CredentialLoaderIssueSeverity {
  if (state === 'invalid') {
    return 'failed-safe';
  }

  return required && BLOCKING_INPUT_STATES.has(state) ? 'blocked' : 'info';
}

function normalizeRequirement(requirement: CredentialLoaderRequirement, index: number): NormalizedRequirement {
  const diagnostics: CredentialLoaderDiagnostic[] = [];
  const requirementRef = normalizeRef(
    requirement.requirementRef,
    REQUIREMENT_REF_PREFIX,
    `credential-requirement:invalid-${index}`,
    diagnostics,
  ) as CredentialLoaderRequirementRef;
  const credentialRef = normalizeRef(
    requirement.credentialRef,
    CREDENTIAL_REF_PREFIX,
    `credential:invalid-${index}`,
    diagnostics,
  ) as CredentialLoaderCredentialRef;
  const configurationRefs = normalizeConfigurationRefs(requirement.configurationRefs, diagnostics);
  const profileRef = normalizeOptionalRef(requirement.profileRef, PROFILE_REF_PREFIX) as CredentialLoaderProfileRef | undefined;
  const redactedLabel = safeOptionalText(requirement.redactedLabel);
  const safePurpose = safeOptionalText(requirement.safePurpose);

  const normalizedRequirement: CredentialLoaderRequirement = Object.freeze({
    requirementRef,
    credentialRef,
    credentialKind: normalizeCredentialKind(requirement.credentialKind),
    sourceClass: normalizeSourceClass(requirement.sourceClass),
    required: requirement.required === true,
    ...(redactedLabel === undefined ? {} : { redactedLabel }),
    ...(safePurpose === undefined ? {} : { safePurpose }),
    ...(configurationRefs.length === 0 ? {} : { configurationRefs }),
    ...(profileRef === undefined ? {} : { profileRef }),
  });

  return Object.freeze({ requirement: normalizedRequirement, diagnostics: boundDescriptorDiagnostics(diagnostics) });
}

function normalizeConfigurationRefs(
  refs: readonly CredentialLoaderConfigurationRef[] | undefined,
  diagnostics: CredentialLoaderDiagnostic[],
): readonly CredentialLoaderConfigurationRef[] {
  if (refs === undefined) {
    return [];
  }

  return freezeArray(
    refs
      .map((ref) => normalizeOptionalRef(ref, CONFIGURATION_REF_PREFIX) as CredentialLoaderConfigurationRef | undefined)
      .filter((ref): ref is CredentialLoaderConfigurationRef => ref !== undefined),
  );
}

function normalizeRef(
  value: string,
  prefix: string,
  fallback: string,
  diagnostics: CredentialLoaderDiagnostic[],
): string {
  const normalized = normalizeOptionalRef(value, prefix);

  if (normalized !== undefined) {
    return normalized;
  }

  diagnostics.push(
    Object.freeze({
      issueCode: 'invalid-descriptor',
      severity: 'failed-safe',
      safeMessage: 'Credential requirement included an unsafe descriptor ref and was replaced with a safe opaque ref.',
      blocking: true,
    }),
  );

  return fallback;
}

function normalizeOptionalRef(value: string | undefined, prefix: string): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(CONTROL_CHARACTER_PATTERN, ' ').trim();

  if (
    normalized.length <= prefix.length ||
    normalized.length > MAX_SAFE_TEXT_LENGTH ||
    !normalized.startsWith(prefix) ||
    !SAFE_REF_PATTERN.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

function findRequirementState(
  requirement: CredentialLoaderRequirement,
  states: readonly FakeInertCredentialRequirementState[],
): FakeInertCredentialRequirementState | undefined {
  return (
    states.find((state) => state.requirementRef === requirement.requirementRef) ??
    states.find((state) => state.credentialRef === requirement.credentialRef)
  );
}

function normalizeCredentialKind(kind: CredentialLoaderCredentialKind): CredentialLoaderCredentialKind {
  return CREDENTIAL_KINDS.has(kind) ? kind : 'unknown';
}

function normalizeSourceClass(sourceClass: CredentialLoaderSourceClass): CredentialLoaderSourceClass {
  return SOURCE_CLASSES.has(sourceClass) ? sourceClass : 'unknown';
}

function normalizeInputState(state: FakeInertCredentialLoaderInputState): FakeInertCredentialLoaderInputState {
  switch (state) {
    case 'configured-redacted':
    case 'missing':
    case 'invalid':
    case 'unavailable':
    case 'blocked':
    case 'disabled':
    case 'redacted-only':
    case 'dry-run-ready':
    case 'not-attempted':
      return state;
    default:
      return 'invalid';
  }
}

function toReadinessStatus(state: FakeInertCredentialLoaderInputState): CredentialLoaderReadinessStatus {
  return state === 'not-attempted' ? 'redacted-only' : state;
}

function redactionStateForInputState(state: FakeInertCredentialLoaderInputState): CredentialLoaderRedactionState {
  switch (state) {
    case 'configured-redacted':
    case 'dry-run-ready':
    case 'redacted-only':
      return 'redacted';
    case 'disabled':
      return 'not-applicable';
    case 'missing':
    case 'invalid':
    case 'unavailable':
    case 'blocked':
    case 'not-attempted':
      return 'not-present';
  }
}

function defaultReasonForState(state: FakeInertCredentialLoaderInputState): CredentialLoaderSafeText {
  switch (state) {
    case 'configured-redacted':
      return 'Credential requirement is configured as redacted descriptor only.';
    case 'missing':
      return 'Credential requirement is missing from the explicit fake input.';
    case 'invalid':
      return 'Credential requirement is marked invalid by the explicit fake input.';
    case 'unavailable':
      return 'Credential requirement source is unavailable in the explicit fake input.';
    case 'blocked':
      return 'Credential requirement is blocked by explicit fake policy state.';
    case 'disabled':
      return 'Credential requirement is disabled by explicit fake operator state.';
    case 'redacted-only':
      return 'Credential requirement has only a redacted public descriptor.';
    case 'dry-run-ready':
      return 'Credential requirement is ready only for dry-run descriptor evaluation.';
    case 'not-attempted':
      return 'Credential requirement resolution was not attempted.';
  }
}

function safeText(value: string, fallback: string): CredentialLoaderSafeText {
  if (typeof value !== 'string') {
    return fallback;
  }

  const sanitized = value
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(URI_LIKE_PATTERN, '[redacted]')
    .replace(ABSOLUTE_LOCATION_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  if (sanitized.length === 0) {
    return fallback;
  }

  if (sanitized.length <= MAX_SAFE_TEXT_LENGTH) {
    return sanitized;
  }

  return `${sanitized.slice(0, MAX_SAFE_TEXT_LENGTH - 3)}...`;
}

function safeOptionalText(value: string | undefined): CredentialLoaderSafeText | undefined {
  return value === undefined ? undefined : safeText(value, 'redacted');
}

function safeTextDiagnostics(values: readonly string[] | undefined): readonly CredentialLoaderDiagnostic[] {
  if (values === undefined) {
    return [];
  }

  return values.slice(0, MAX_DESCRIPTOR_DIAGNOSTICS).map((value) =>
    Object.freeze({
      issueCode: 'not-attempted',
      severity: 'info',
      safeMessage: safeText(value, 'redacted diagnostic'),
      blocking: false,
    }),
  );
}

function isMissingIssueCode(issueCode: CredentialLoaderIssueCode): boolean {
  return (
    issueCode === 'missing-credential-ref' ||
    issueCode === 'missing-requirement' ||
    issueCode === 'missing-operator-gate'
  );
}

function boundDiagnostics(issues: readonly CredentialLoaderDiagnostic[]): readonly CredentialLoaderDiagnostic[] {
  return freezeArray(issues.slice(0, MAX_PUBLIC_DIAGNOSTICS));
}

function boundDescriptorDiagnostics(issues: readonly CredentialLoaderDiagnostic[]): readonly CredentialLoaderDiagnostic[] {
  return freezeArray(issues.slice(0, MAX_DESCRIPTOR_DIAGNOSTICS));
}

function compareRequirementDescriptors(
  left: CredentialLoaderRequirementDescriptor,
  right: CredentialLoaderRequirementDescriptor,
): number {
  return (
    left.requirement.requirementRef.localeCompare(right.requirement.requirementRef) ||
    left.requirement.credentialRef.localeCompare(right.requirement.credentialRef)
  );
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}
