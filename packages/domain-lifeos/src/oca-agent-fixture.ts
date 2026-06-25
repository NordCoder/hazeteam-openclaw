export type LifeosOcaAgentRef = 'agent:lifeos-coder';
export type LifeosOcaPackageRef = 'domain-package:lifeos';
export type LifeosOcaCapabilityRef = 'oca-wrapper';
export type LifeosOcaProfileRef = 'runtime-capability-profile:oca-default';
export type LifeosOcaCapabilityBindingRef = 'capability-binding:lifeos-oca-default';
export type LifeosOcaWorkspaceRef = 'workspace:lifeos';
export type LifeosOcaRoleRef = 'agent-role:coding-assistant';

export type LifeosOcaOperationRef =
  | 'hazeteam.oca.start-session'
  | 'hazeteam.oca.continue-session'
  | 'hazeteam.oca.get-status'
  | 'hazeteam.oca.get-output'
  | 'hazeteam.oca.diff-get'
  | 'hazeteam.oca.review-request'
  | 'hazeteam.oca.review-submit'
  | 'hazeteam.oca.branch-summarize';

export type LifeosOcaCommandRef =
  | 'domain-command:lifeos.oca.start-session'
  | 'domain-command:lifeos.oca.continue-session'
  | 'domain-command:lifeos.oca.status'
  | 'domain-command:lifeos.oca.output-summary'
  | 'domain-command:lifeos.oca.diff-summary'
  | 'domain-command:lifeos.oca.review-request';

export type LifeosOcaApprovalMode = 'read-only' | 'approval-required';

export interface LifeosOcaUiHints {
  readonly homeCardSection: 'lifeos-oca-sessions';
  readonly showSessionStatus: true;
  readonly showDiffActions: true;
  readonly showReviewActions: true;
}

export interface LifeosOcaAgentDescriptor {
  readonly agentRef: LifeosOcaAgentRef;
  readonly displayName: 'LifeOS Coding Agent';
  readonly roleRef: LifeosOcaRoleRef;
  readonly workspaceRef: LifeosOcaWorkspaceRef;
  readonly summary: string;
  readonly capabilityBindingRefs: readonly LifeosOcaCapabilityBindingRef[];
}

export interface LifeosOcaCapabilityBinding {
  readonly bindingRef: LifeosOcaCapabilityBindingRef;
  readonly capabilityRef: LifeosOcaCapabilityRef;
  readonly requirement: 'required';
  readonly profileRef: LifeosOcaProfileRef;
  readonly allowedOperationRefs: readonly LifeosOcaOperationRef[];
  readonly uiHints: LifeosOcaUiHints;
}

export interface LifeosOcaCommandSurface {
  readonly commandRef: LifeosOcaCommandRef;
  readonly label: string;
  readonly summary: string;
  readonly capabilityRef: LifeosOcaCapabilityRef;
  readonly operationRef: LifeosOcaOperationRef;
  readonly approvalMode: LifeosOcaApprovalMode;
  readonly visible: true;
}

export interface LifeosOcaFixtureSafety {
  readonly descriptorOnly: true;
  readonly domainOwnsSessionLifecycle: false;
  readonly domainOwnsSessionStore: false;
  readonly domainOwnsOperationHandlers: false;
  readonly domainOwnsApprovalExecution: false;
  readonly domainOwnsTopicPresentation: false;
  readonly providerSdkImports: false;
  readonly environmentReads: false;
  readonly filesystemReads: false;
  readonly networkCalls: false;
}

export interface LifeosOcaAgentFixture {
  readonly descriptorVersion: 'w15g-domain-binding-fixture';
  readonly packageRef: LifeosOcaPackageRef;
  readonly agent: LifeosOcaAgentDescriptor;
  readonly capabilityBindings: readonly LifeosOcaCapabilityBinding[];
  readonly commandSurface: readonly LifeosOcaCommandSurface[];
  readonly uiHints: LifeosOcaUiHints;
  readonly safety: LifeosOcaFixtureSafety;
}

export const LIFEOS_OCA_ALLOWED_OPERATION_REFS = Object.freeze([
  'hazeteam.oca.start-session',
  'hazeteam.oca.continue-session',
  'hazeteam.oca.get-status',
  'hazeteam.oca.get-output',
  'hazeteam.oca.diff-get',
  'hazeteam.oca.review-request',
  'hazeteam.oca.review-submit',
  'hazeteam.oca.branch-summarize',
] as const satisfies readonly LifeosOcaOperationRef[]);

export const LIFEOS_OCA_UI_HINTS = Object.freeze({
  homeCardSection: 'lifeos-oca-sessions',
  showSessionStatus: true,
  showDiffActions: true,
  showReviewActions: true,
} as const satisfies LifeosOcaUiHints);

const LIFEOS_OCA_AGENT_FIXTURE = Object.freeze({
  descriptorVersion: 'w15g-domain-binding-fixture',
  packageRef: 'domain-package:lifeos',
  agent: Object.freeze({
    agentRef: 'agent:lifeos-coder',
    displayName: 'LifeOS Coding Agent',
    roleRef: 'agent-role:coding-assistant',
    workspaceRef: 'workspace:lifeos',
    summary: 'Declarative LifeOS agent fixture for OCA-assisted coding work.',
    capabilityBindingRefs: Object.freeze(['capability-binding:lifeos-oca-default'] as const),
  } as const satisfies LifeosOcaAgentDescriptor),
  capabilityBindings: Object.freeze([
    Object.freeze({
      bindingRef: 'capability-binding:lifeos-oca-default',
      capabilityRef: 'oca-wrapper',
      requirement: 'required',
      profileRef: 'runtime-capability-profile:oca-default',
      allowedOperationRefs: LIFEOS_OCA_ALLOWED_OPERATION_REFS,
      uiHints: LIFEOS_OCA_UI_HINTS,
    } as const satisfies LifeosOcaCapabilityBinding),
  ] as const),
  commandSurface: Object.freeze([
    command('domain-command:lifeos.oca.start-session', 'Start coding session', 'Request an approved OCA coding session.', 'hazeteam.oca.start-session', 'approval-required'),
    command('domain-command:lifeos.oca.continue-session', 'Continue coding session', 'Request continuation of an existing OCA coding session.', 'hazeteam.oca.continue-session', 'approval-required'),
    command('domain-command:lifeos.oca.status', 'Show session status', 'Show the safe status summary for an OCA coding session.', 'hazeteam.oca.get-status', 'read-only'),
    command('domain-command:lifeos.oca.output-summary', 'Show output summary', 'Show the safe output summary for an OCA coding session.', 'hazeteam.oca.get-output', 'read-only'),
    command('domain-command:lifeos.oca.diff-summary', 'Show diff summary', 'Show the safe diff summary for an OCA coding session.', 'hazeteam.oca.diff-get', 'read-only'),
    command('domain-command:lifeos.oca.review-request', 'Request review', 'Request an approved OCA review action.', 'hazeteam.oca.review-request', 'approval-required'),
  ] as const),
  uiHints: LIFEOS_OCA_UI_HINTS,
  safety: Object.freeze({
    descriptorOnly: true,
    domainOwnsSessionLifecycle: false,
    domainOwnsSessionStore: false,
    domainOwnsOperationHandlers: false,
    domainOwnsApprovalExecution: false,
    domainOwnsTopicPresentation: false,
    providerSdkImports: false,
    environmentReads: false,
    filesystemReads: false,
    networkCalls: false,
  } as const satisfies LifeosOcaFixtureSafety),
} as const satisfies LifeosOcaAgentFixture);

export function describeLifeosOcaAgentFixture(): LifeosOcaAgentFixture {
  return getLifeosOcaAgentFixture();
}

export function getLifeosOcaAgentFixture(): LifeosOcaAgentFixture {
  return cloneFixture(LIFEOS_OCA_AGENT_FIXTURE);
}

export function isSafeLifeosOcaAgentFixtureJson(value: unknown): boolean {
  return isSafeSerializableValue(value);
}

function command(
  commandRef: LifeosOcaCommandRef,
  label: string,
  summary: string,
  operationRef: LifeosOcaOperationRef,
  approvalMode: LifeosOcaApprovalMode,
): LifeosOcaCommandSurface {
  return Object.freeze({
    commandRef,
    label,
    summary,
    capabilityRef: 'oca-wrapper',
    operationRef,
    approvalMode,
    visible: true,
  } satisfies LifeosOcaCommandSurface);
}

function cloneFixture(fixture: LifeosOcaAgentFixture): LifeosOcaAgentFixture {
  const uiHints = cloneUiHints(fixture.uiHints);

  return Object.freeze({
    descriptorVersion: fixture.descriptorVersion,
    packageRef: fixture.packageRef,
    agent: Object.freeze({
      ...fixture.agent,
      capabilityBindingRefs: Object.freeze([...fixture.agent.capabilityBindingRefs]),
    } satisfies LifeosOcaAgentDescriptor),
    capabilityBindings: Object.freeze(
      fixture.capabilityBindings.map((binding) =>
        Object.freeze({
          ...binding,
          allowedOperationRefs: Object.freeze([...binding.allowedOperationRefs]),
          uiHints: cloneUiHints(binding.uiHints),
        } satisfies LifeosOcaCapabilityBinding),
      ),
    ),
    commandSurface: Object.freeze(fixture.commandSurface.map((surface) => Object.freeze({ ...surface } satisfies LifeosOcaCommandSurface))),
    uiHints,
    safety: Object.freeze({ ...fixture.safety } satisfies LifeosOcaFixtureSafety),
  } satisfies LifeosOcaAgentFixture);
}

function cloneUiHints(uiHints: LifeosOcaUiHints): LifeosOcaUiHints {
  return Object.freeze({ ...uiHints } satisfies LifeosOcaUiHints);
}

function isSafeSerializableValue(value: unknown): boolean {
  if (value === null) {
    return true;
  }

  if (typeof value === 'string') {
    return !containsUnsafeText(value);
  }

  if (typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isSafeSerializableValue);
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (UNSAFE_PUBLIC_JSON_KEYS.has(key) || containsUnsafeText(key) || !isSafeSerializableValue(child)) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function containsUnsafeText(value: string): boolean {
  const normalized = value.toLowerCase();

  return UNSAFE_PUBLIC_TEXT_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function fromCharCodes(codes: readonly number[]): string {
  return String.fromCharCode(...codes);
}

const UNSAFE_PUBLIC_JSON_KEYS = new Set(
  [
    [114, 97, 119, 76, 111, 103],
    [114, 97, 119, 68, 105, 102, 102],
    [114, 97, 119, 79, 117, 116, 112, 117, 116],
    [114, 97, 119, 80, 97, 116, 104],
    [102, 105, 108, 101, 80, 97, 116, 104],
    [114, 101, 112, 111, 80, 97, 116, 104],
    [119, 111, 114, 107, 115, 112, 97, 99, 101, 80, 97, 116, 104],
    [112, 114, 111, 118, 105, 100, 101, 114, 80, 97, 121, 108, 111, 97, 100],
    [114, 117, 110, 116, 105, 109, 101, 80, 97, 121, 108, 111, 97, 100],
    [99, 108, 105, 101, 110, 116, 72, 97, 110, 100, 108, 101],
    [115, 100, 107, 67, 108, 105, 101, 110, 116],
    [112, 114, 111, 99, 101, 115, 115, 73, 100],
    [116, 111, 107, 101, 110],
    [115, 101, 99, 114, 101, 116],
    [99, 114, 101, 100, 101, 110, 116, 105, 97, 108],
    [115, 116, 97, 99, 107],
    [101, 110, 100, 112, 111, 105, 110, 116],
    [99, 111, 109, 109, 97, 110, 100, 79, 117, 116, 112, 117, 116],
  ].map(fromCharCodes),
);

const UNSAFE_PUBLIC_TEXT_FRAGMENTS = Object.freeze(
  [
    [114, 97, 119, 108, 111, 103],
    [114, 97, 119, 100, 105, 102, 102],
    [114, 97, 119, 111, 117, 116, 112, 117, 116],
    [114, 97, 119, 112, 97, 116, 104],
    [102, 105, 108, 101, 58, 47, 47],
    [47, 117, 115, 114, 47],
    [47, 104, 111, 109, 101, 47],
    [47, 118, 97, 114, 47],
    [92, 92],
    [112, 114, 111, 118, 105, 100, 101, 114, 112, 97, 121, 108, 111, 97, 100],
    [114, 117, 110, 116, 105, 109, 101, 112, 97, 121, 108, 111, 97, 100],
    [99, 108, 105, 101, 110, 116, 104, 97, 110, 100, 108, 101],
    [115, 100, 107, 99, 108, 105, 101, 110, 116],
    [112, 114, 111, 99, 101, 115, 115, 105, 100],
    [98, 101, 97, 114, 101, 114],
    [116, 111, 107, 101, 110],
    [115, 101, 99, 114, 101, 116],
    [99, 114, 101, 100, 101, 110, 116, 105, 97, 108],
    [115, 116, 97, 99, 107],
    [101, 110, 100, 112, 111, 105, 110, 116],
    [99, 111, 109, 109, 97, 110, 100, 111, 117, 116, 112, 117, 116],
  ].map(fromCharCodes),
);
