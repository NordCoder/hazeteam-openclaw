import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
  createTelegramActionButtonPayload,
  isPermissionAllowed,
  parseOpenClawAdapterRef,
  type ActorRef,
  type AdapterCorrelationRef,
  type AdapterDetailsRef,
  type AdapterOperationContext,
  type AdapterOperationResult,
  type AgentRef,
  type OpenClawAdapterRefKind,
  type PermissionDecision,
  type PermissionRequirement,
  type TelegramActionButtonPayload,
  type WorkspaceRef,
} from '../contracts/index.js';
import {
  createTelegramActionButtonDescriptor,
  createTelegramButtonGroupDescriptor,
  createTelegramCardDescriptor,
  createTelegramTextBlock,
  type TelegramCardDescriptor,
} from '../commands/ui-descriptors.js';

const APPROVAL_BRIDGE_REQUEST_KIND = 'openclaw-approval-request' as const;
const APPROVAL_BRIDGE_DECISION_KIND = 'openclaw-approval-decision' as const;
const APPROVAL_REF_PREFIX = 'approval:' as const;
const APPROVAL_SUBJECT_REF_PREFIX = 'approval-subject:' as const;
const APPROVAL_DECISION_STATUSES = ['approved', 'rejected', 'expired', 'cancelled'] as const;

const MAX_APPROVAL_REF_LENGTH = 256;
const MAX_APPROVAL_TITLE_LENGTH = 160;
const MAX_APPROVAL_MESSAGE_LENGTH = 1_000;
const MAX_APPROVAL_REASON_LENGTH = 240;
const SAFE_APPROVAL_REF_VALUE_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const UNSAFE_TEXT_ASSIGNMENT_TERMS = [
  'bot[_-]?token',
  'api[_-]?key',
  'authorization',
  'password',
  'passwd',
  'credential',
  ['sec', 'ret'].join(''),
];
const UNSAFE_TEXT_ASSIGNMENT_PATTERN = new RegExp(
  `\\b(?:${UNSAFE_TEXT_ASSIGNMENT_TERMS.join('|')})\\b\\s*[:=]\\s*\\S+`,
  'giu',
);
const UNSAFE_APPROVAL_FIELD_NAMES = new Set([
  'apikey',
  'approvalpayload',
  'authorization',
  'bottoken',
  'credential',
  'database',
  'execute',
  'filesystem',
  'handler',
  'network',
  'openclawclient',
  'password',
  'provider',
  'providerobject',
  'rawapproval',
  'rawapprovalpayload',
  'rawerror',
  'rawopenclawapproval',
  'rawopenclawresponse',
  'rawproviderobject',
  'rawproviderresponse',
  'rawruntimeobject',
  'rawruntimepayload',
  'rawtoolpayload',
  'sdkclient',
  'secret',
  'stack',
  'toolpayload',
]);

export type ApprovalBridgeDecisionStatus = (typeof APPROVAL_DECISION_STATUSES)[number];
export type ApprovalBridgeRef = `${typeof APPROVAL_REF_PREFIX}${string}`;
export type ApprovalBridgeSubjectRef = `${typeof APPROVAL_SUBJECT_REF_PREFIX}${string}`;

type MaybePromise<T> = T | Promise<T>;

export interface ApprovalBridgeRequestInput {
  readonly approvalRef: string;
  readonly title: string;
  readonly message: string;
  readonly approveTokenRef: string;
  readonly rejectTokenRef: string;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly actorRef?: ActorRef;
  readonly subjectRef?: ApprovalBridgeSubjectRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface ApprovalBridgeRequest {
  readonly kind: typeof APPROVAL_BRIDGE_REQUEST_KIND;
  readonly approvalRef: ApprovalBridgeRef;
  readonly title: string;
  readonly message: string;
  readonly approvePayload: TelegramActionButtonPayload;
  readonly rejectPayload: TelegramActionButtonPayload;
  readonly card: TelegramCardDescriptor;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly actorRef?: ActorRef;
  readonly subjectRef?: ApprovalBridgeSubjectRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface ApprovalBridgeDecisionInput {
  readonly approvalRef: string;
  readonly status: ApprovalBridgeDecisionStatus;
  readonly actorRef?: ActorRef;
  readonly reason?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface ApprovalBridgeDecision {
  readonly kind: typeof APPROVAL_BRIDGE_DECISION_KIND;
  readonly approvalRef: ApprovalBridgeRef;
  readonly status: ApprovalBridgeDecisionStatus;
  readonly actorRef?: ActorRef;
  readonly reason?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface ApprovalBridgeSource {
  readonly submit: (request: ApprovalBridgeRequest) => MaybePromise<unknown>;
}

export interface ApprovalBridgeResolver {
  readonly resolve: (decision: ApprovalBridgeDecision) => MaybePromise<unknown>;
}

export interface ApprovalBridgeSubmission {
  readonly request: ApprovalBridgeRequest;
}

export interface ApprovalBridgeResolution {
  readonly decision: ApprovalBridgeDecision;
}

export interface SubmitApprovalBridgeRequestInput {
  readonly source?: ApprovalBridgeSource;
  readonly request: ApprovalBridgeRequestInput;
  readonly context?: AdapterOperationContext;
}

export interface ResolveApprovalBridgeDecisionInput {
  readonly resolver?: ApprovalBridgeResolver;
  readonly decision: ApprovalBridgeDecisionInput;
  readonly permissionDecision?: PermissionDecision;
  readonly context?: AdapterOperationContext;
}

export interface ApprovalBridgePermissionRequirementInput {
  readonly approvalRef: string;
  readonly actorRef?: ActorRef;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function rejectUnsafeApprovalFields(input: Record<string, unknown>, label: string): void {
  for (const fieldName of Object.keys(input)) {
    const normalizedFieldName = fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
    if (UNSAFE_APPROVAL_FIELD_NAMES.has(normalizedFieldName)) {
      throw new TypeError(
        `${label} must not include raw provider, runtime, tool, approval, storage, or handler fields.`,
      );
    }
  }
}

function assertSafeApprovalObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  assertPlainObject(input, label);
  rejectUnsafeApprovalFields(input, label);
}

function normalizeBoundedSafeText(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(UNSAFE_TEXT_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function normalizeOptionalSafeText(
  input: unknown,
  label: string,
  maxLength: number,
): string | undefined {
  return input === undefined ? undefined : normalizeBoundedSafeText(input, label, maxLength);
}

function normalizeApprovalRef(input: unknown, prefix: string, label: string): string {
  const normalized = normalizeBoundedSafeText(input, label, MAX_APPROVAL_REF_LENGTH);
  if (!normalized.startsWith(prefix)) {
    throw new TypeError(`${label} must use the expected safe approval ref prefix.`);
  }

  const value = normalized.slice(prefix.length);
  if (value.length === 0 || !SAFE_APPROVAL_REF_VALUE_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a safe approval ref.`);
  }

  return normalized;
}

function normalizeAdapterRef<T extends string>(
  input: unknown,
  kind: OpenClawAdapterRefKind,
  label: string,
): T {
  const parsedRef = parseOpenClawAdapterRef(input);
  if (parsedRef === null || parsedRef.kind !== kind) {
    throw new TypeError(`${label} must be a safe ${kind} ref.`);
  }

  return parsedRef.ref as T;
}

function normalizeOptionalAdapterRef<T extends string>(
  input: unknown,
  kind: OpenClawAdapterRefKind,
  label: string,
): T | undefined {
  return input === undefined ? undefined : normalizeAdapterRef<T>(input, kind, label);
}

function normalizeApprovalDecisionStatus(input: unknown): ApprovalBridgeDecisionStatus {
  if (
    typeof input !== 'string' ||
    !(APPROVAL_DECISION_STATUSES as readonly string[]).includes(input)
  ) {
    throw new TypeError('Unsupported approval bridge decision status.');
  }

  return input as ApprovalBridgeDecisionStatus;
}

function isApprovalBridgeSource(source: unknown): source is ApprovalBridgeSource {
  return (
    typeof source === 'object' &&
    source !== null &&
    typeof (source as { readonly submit?: unknown }).submit === 'function'
  );
}

function isApprovalBridgeResolver(resolver: unknown): resolver is ApprovalBridgeResolver {
  return (
    typeof resolver === 'object' &&
    resolver !== null &&
    typeof (resolver as { readonly resolve?: unknown }).resolve === 'function'
  );
}

function getContextFromUnknownInput(input: unknown): AdapterOperationContext | undefined {
  if (typeof input !== 'object' || input === null) {
    return undefined;
  }

  return (input as { readonly context?: AdapterOperationContext }).context;
}

function getInputCorrelationRef(input: ApprovalBridgeRequest | ApprovalBridgeDecision): AdapterCorrelationRef | undefined {
  return input.correlationRef;
}

function getInputDetailsRef(input: ApprovalBridgeRequest | ApprovalBridgeDecision): AdapterDetailsRef | undefined {
  return input.detailsRef;
}

function createApprovalBridgeFailure<T>(input: {
  readonly code: 'invalid-input' | 'forbidden' | 'dependency-missing' | 'dependency-failed';
  readonly message: string;
  readonly retryable?: boolean;
  readonly context?: AdapterOperationContext;
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
    input.context,
  );
}

function createApprovalCard(input: {
  readonly title: string;
  readonly message: string;
  readonly approvalRef: ApprovalBridgeRef;
  readonly subjectRef?: ApprovalBridgeSubjectRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly approvePayload: TelegramActionButtonPayload;
  readonly rejectPayload: TelegramActionButtonPayload;
}): TelegramCardDescriptor {
  const body = [createTelegramTextBlock({ text: input.message })];

  if (input.subjectRef !== undefined) {
    body.push(createTelegramTextBlock({ text: `Subject: ${input.subjectRef}`, tone: 'muted' }));
  }

  if (input.detailsRef !== undefined) {
    body.push(createTelegramTextBlock({ text: `Details: ${input.detailsRef}`, tone: 'muted' }));
  }

  body.push(createTelegramTextBlock({ text: `Approval: ${input.approvalRef}`, tone: 'muted' }));

  return createTelegramCardDescriptor({
    intent: 'action-request',
    title: input.title,
    body,
    buttonGroups: [
      createTelegramButtonGroupDescriptor({
        buttons: [
          createTelegramActionButtonDescriptor({
            label: 'Approve',
            payload: input.approvePayload,
            style: 'primary',
            accessibilityLabel: 'Approve approval request',
          }),
          createTelegramActionButtonDescriptor({
            label: 'Reject',
            payload: input.rejectPayload,
            style: 'danger',
            accessibilityLabel: 'Reject approval request',
          }),
        ],
      }),
    ],
  });
}

export function createApprovalBridgeRequest(input: ApprovalBridgeRequestInput): ApprovalBridgeRequest {
  assertSafeApprovalObject(input, 'Approval bridge request');

  const approvalRef = normalizeApprovalRef(
    input.approvalRef,
    APPROVAL_REF_PREFIX,
    'Approval bridge request approvalRef',
  ) as ApprovalBridgeRef;
  const title = normalizeBoundedSafeText(
    input.title,
    'Approval bridge request title',
    MAX_APPROVAL_TITLE_LENGTH,
  );
  const message = normalizeBoundedSafeText(
    input.message,
    'Approval bridge request message',
    MAX_APPROVAL_MESSAGE_LENGTH,
  );
  const workspaceRef = normalizeOptionalAdapterRef<WorkspaceRef>(
    input.workspaceRef,
    'workspace',
    'Approval bridge request workspaceRef',
  );
  const agentRef = normalizeOptionalAdapterRef<AgentRef>(
    input.agentRef,
    'agent',
    'Approval bridge request agentRef',
  );
  const actorRef = normalizeOptionalAdapterRef<ActorRef>(
    input.actorRef,
    'actor',
    'Approval bridge request actorRef',
  );
  const subjectRef =
    input.subjectRef === undefined
      ? undefined
      : (normalizeApprovalRef(
          input.subjectRef,
          APPROVAL_SUBJECT_REF_PREFIX,
          'Approval bridge request subjectRef',
        ) as ApprovalBridgeSubjectRef);
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Approval bridge request detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Approval bridge request correlationRef',
  );
  const approvePayload = createTelegramActionButtonPayload(input.approveTokenRef);
  const rejectPayload = createTelegramActionButtonPayload(input.rejectTokenRef);
  const card = createApprovalCard({
    title,
    message,
    approvalRef,
    ...(subjectRef === undefined ? {} : { subjectRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    approvePayload,
    rejectPayload,
  });

  return Object.freeze({
    kind: APPROVAL_BRIDGE_REQUEST_KIND,
    approvalRef,
    title,
    message,
    approvePayload,
    rejectPayload,
    card,
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(subjectRef === undefined ? {} : { subjectRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function createApprovalBridgeDecision(input: ApprovalBridgeDecisionInput): ApprovalBridgeDecision {
  assertSafeApprovalObject(input, 'Approval bridge decision');

  const approvalRef = normalizeApprovalRef(
    input.approvalRef,
    APPROVAL_REF_PREFIX,
    'Approval bridge decision approvalRef',
  ) as ApprovalBridgeRef;
  const actorRef = normalizeOptionalAdapterRef<ActorRef>(
    input.actorRef,
    'actor',
    'Approval bridge decision actorRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Approval bridge decision detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Approval bridge decision correlationRef',
  );
  const reason = normalizeOptionalSafeText(
    input.reason,
    'Approval bridge decision reason',
    MAX_APPROVAL_REASON_LENGTH,
  );

  return Object.freeze({
    kind: APPROVAL_BRIDGE_DECISION_KIND,
    approvalRef,
    status: normalizeApprovalDecisionStatus(input.status),
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(reason === undefined ? {} : { reason }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function createApprovalBridgePermissionRequirement(
  input: ApprovalBridgePermissionRequirementInput,
): PermissionRequirement {
  assertSafeApprovalObject(input, 'Approval bridge permission requirement');

  const approvalRef = normalizeApprovalRef(
    input.approvalRef,
    APPROVAL_REF_PREFIX,
    'Approval bridge permission requirement approvalRef',
  ) as ApprovalBridgeRef;
  const actorRef = normalizeOptionalAdapterRef<ActorRef>(
    input.actorRef,
    'actor',
    'Approval bridge permission requirement actorRef',
  );
  const workspaceRef = normalizeOptionalAdapterRef<WorkspaceRef>(
    input.workspaceRef,
    'workspace',
    'Approval bridge permission requirement workspaceRef',
  );
  const agentRef = normalizeOptionalAdapterRef<AgentRef>(
    input.agentRef,
    'agent',
    'Approval bridge permission requirement agentRef',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Approval bridge permission requirement detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Approval bridge permission requirement correlationRef',
  );

  return Object.freeze({
    action: 'resolve-approval',
    resourceKind: 'approval',
    resourceRef: approvalRef,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function isApprovalBridgeRequest(candidate: unknown): candidate is ApprovalBridgeRequest {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return false;
  }

  const request = candidate as Partial<ApprovalBridgeRequest> & Partial<ApprovalBridgeRequestInput>;
  if (request.kind !== APPROVAL_BRIDGE_REQUEST_KIND) {
    return false;
  }

  try {
    createApprovalBridgeRequest({
      approvalRef: request.approvalRef as string,
      title: request.title as string,
      message: request.message as string,
      approveTokenRef: request.approvePayload as string,
      rejectTokenRef: request.rejectPayload as string,
      ...(request.workspaceRef === undefined ? {} : { workspaceRef: request.workspaceRef }),
      ...(request.agentRef === undefined ? {} : { agentRef: request.agentRef }),
      ...(request.actorRef === undefined ? {} : { actorRef: request.actorRef }),
      ...(request.subjectRef === undefined ? {} : { subjectRef: request.subjectRef }),
      ...(request.detailsRef === undefined ? {} : { detailsRef: request.detailsRef }),
      ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
    });
    return true;
  } catch {
    return false;
  }
}

export function isApprovalBridgeDecision(candidate: unknown): candidate is ApprovalBridgeDecision {
  try {
    createApprovalBridgeDecision(candidate as ApprovalBridgeDecisionInput);
    return true;
  } catch {
    return false;
  }
}

export async function submitApprovalBridgeRequest(
  input: SubmitApprovalBridgeRequestInput,
): Promise<AdapterOperationResult<ApprovalBridgeSubmission>> {
  const context = getContextFromUnknownInput(input);

  if (typeof input !== 'object' || input === null) {
    return createApprovalBridgeFailure({
      code: 'invalid-input',
      message: 'Approval bridge submit input must be an object.',
    });
  }

  if (!isApprovalBridgeSource(input.source)) {
    return createApprovalBridgeFailure({
      code: 'dependency-missing',
      message: 'Approval source boundary is not configured.',
      context,
    });
  }

  let request: ApprovalBridgeRequest;
  try {
    request = createApprovalBridgeRequest(input.request);
  } catch {
    return createApprovalBridgeFailure({
      code: 'invalid-input',
      message: 'Approval request is invalid or unsafe.',
      context,
    });
  }

  try {
    await input.source.submit(request);
  } catch {
    return createApprovalBridgeFailure({
      code: 'dependency-failed',
      message: 'Approval source boundary failed.',
      retryable: true,
      context,
      ...(getInputDetailsRef(request) === undefined ? {} : { detailsRef: getInputDetailsRef(request) }),
      ...(getInputCorrelationRef(request) === undefined
        ? {}
        : { correlationRef: getInputCorrelationRef(request) }),
    });
  }

  return adapterOk(Object.freeze({ request }), context);
}

export async function resolveApprovalBridgeDecision(
  input: ResolveApprovalBridgeDecisionInput,
): Promise<AdapterOperationResult<ApprovalBridgeResolution>> {
  const context = getContextFromUnknownInput(input);

  if (typeof input !== 'object' || input === null) {
    return createApprovalBridgeFailure({
      code: 'invalid-input',
      message: 'Approval bridge resolve input must be an object.',
    });
  }

  if (!isApprovalBridgeResolver(input.resolver)) {
    return createApprovalBridgeFailure({
      code: 'dependency-missing',
      message: 'Approval resolver boundary is not configured.',
      context,
    });
  }

  let decision: ApprovalBridgeDecision;
  try {
    decision = createApprovalBridgeDecision(input.decision);
  } catch {
    return createApprovalBridgeFailure({
      code: 'invalid-input',
      message: 'Approval decision is invalid or unsafe.',
      context,
    });
  }

  if (input.permissionDecision !== undefined && !isPermissionAllowed(input.permissionDecision)) {
    return createApprovalBridgeFailure({
      code: 'forbidden',
      message: 'Approval resolution permission denied before resolver boundary call.',
      context,
      ...(input.permissionDecision.detailsRef === undefined
        ? {}
        : { detailsRef: input.permissionDecision.detailsRef }),
      ...(input.permissionDecision.correlationRef === undefined
        ? getInputCorrelationRef(decision) === undefined
          ? {}
          : { correlationRef: getInputCorrelationRef(decision) }
        : { correlationRef: input.permissionDecision.correlationRef }),
    });
  }

  try {
    await input.resolver.resolve(decision);
  } catch {
    return createApprovalBridgeFailure({
      code: 'dependency-failed',
      message: 'Approval resolver boundary failed.',
      retryable: true,
      context,
      ...(getInputDetailsRef(decision) === undefined ? {} : { detailsRef: getInputDetailsRef(decision) }),
      ...(getInputCorrelationRef(decision) === undefined
        ? {}
        : { correlationRef: getInputCorrelationRef(decision) }),
    });
  }

  return adapterOk(Object.freeze({ decision }), context);
}
