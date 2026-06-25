export const CALLBACK_PROVIDER_KINDS = Object.freeze(['telegram', 'openclaw'] as const);

export type CallbackProviderKind = (typeof CALLBACK_PROVIDER_KINDS)[number];

export const CALLBACK_PAYLOAD_KINDS = Object.freeze(['token-ref', 'action-ref', 'invalid'] as const);

export type CallbackPayloadKind = (typeof CALLBACK_PAYLOAD_KINDS)[number];

export type CallbackPayloadStatus = 'accepted' | 'rejected';

export type CallbackInputIssueSeverity = 'warning' | 'blocked';

export type CallbackInputIssueCode =
  | 'invalid-provider-normalized'
  | 'invalid-safe-ref-redacted'
  | 'invalid-callback-data'
  | 'unsafe-callback-data-redacted'
  | 'missing-callback-data'
  | 'invalid-timestamp-redacted'
  | 'invalid-context-ref-redacted';

export interface CallbackInputIssue {
  readonly code: CallbackInputIssueCode;
  readonly severity: CallbackInputIssueSeverity;
  readonly componentRef: string;
  readonly summary: string;
}

export interface CallbackExpectedTokenContextInput {
  readonly workspaceRef?: unknown;
  readonly agentRef?: unknown;
  readonly hostSessionRef?: unknown;
  readonly bindingRef?: unknown;
  readonly outboxRef?: unknown;
  readonly actionRef?: unknown;
  readonly approvalRef?: unknown;
  readonly capabilityRef?: unknown;
}

export interface CallbackExpectedTokenContext {
  readonly workspaceRef?: string;
  readonly agentRef?: string;
  readonly hostSessionRef?: string;
  readonly bindingRef?: string;
  readonly outboxRef?: string;
  readonly actionRef?: string;
  readonly approvalRef?: string;
  readonly capabilityRef?: string;
}

export interface CallbackProviderInput {
  readonly providerKind?: unknown;
  readonly callbackRef?: unknown;
  readonly correlationRef?: unknown;
  readonly channelRef?: unknown;
  readonly chatRef?: unknown;
  readonly threadRef?: unknown;
  readonly messageRef?: unknown;
  readonly actorRef?: unknown;
  readonly callbackData?: unknown;
  readonly receivedAt?: unknown;
  readonly occurredAt?: unknown;
  readonly expectedContext?: CallbackExpectedTokenContextInput;
}

export interface SafeCallbackDescriptor {
  readonly descriptorKind: 'callback-descriptor';
  readonly descriptorVersion: 'w14d';
  readonly providerKind: CallbackProviderKind;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef?: string;
  readonly messageRef?: string;
  readonly actorRef?: string;
  readonly receivedAt: string;
  readonly occurredAt?: string;
  readonly payloadKind: CallbackPayloadKind;
  readonly payloadStatus: CallbackPayloadStatus;
  readonly tokenRef?: string;
  readonly actionRef?: string;
  readonly expectedContext: CallbackExpectedTokenContext;
  readonly issueCount: number;
  readonly issues: readonly CallbackInputIssue[];
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export type CallbackPermissionPhase = 'before-token-consume';

export type CallbackPermissionStatus = 'allowed' | 'denied' | 'binding-not-found' | 'binding-disabled';

export type CallbackPermissionReasonCode =
  | 'permission-allowed'
  | 'actor-not-authorized'
  | 'binding-not-found'
  | 'binding-disabled'
  | 'permission-failed-safe';

export interface CallbackPermissionCheckInput {
  readonly descriptorKind: 'callback-permission-check';
  readonly descriptorVersion: 'w14d';
  readonly phase: CallbackPermissionPhase;
  readonly providerKind: CallbackProviderKind;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef?: string;
  readonly messageRef?: string;
  readonly actorRef?: string;
  readonly tokenRef?: string;
  readonly actionRef?: string;
  readonly expectedContext: CallbackExpectedTokenContext;
  readonly jsonSerializable: true;
}

export interface CallbackPermissionResult {
  readonly status: CallbackPermissionStatus;
  readonly reasonCode?: CallbackPermissionReasonCode;
  readonly retryable?: boolean;
  readonly detailsRef?: string;
}

export type CallbackTokenVerifyStatus = 'valid' | 'not-found' | 'context-mismatch' | 'expired' | 'already-consumed' | 'invalid';

export interface CallbackTokenVerifyInput {
  readonly descriptorKind: 'callback-token-verify';
  readonly descriptorVersion: 'w14d';
  readonly tokenRef: string;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly actorRef?: string;
  readonly expectedContext: CallbackExpectedTokenContext;
  readonly jsonSerializable: true;
}

export interface CallbackTokenVerifyResult {
  readonly status: CallbackTokenVerifyStatus;
  readonly reasonCode?: string;
  readonly retryable?: boolean;
  readonly detailsRef?: string;
}

export type CallbackTokenConsumeStatus =
  | 'consumed'
  | 'already-consumed'
  | 'consume-conflict'
  | 'not-found'
  | 'context-mismatch'
  | 'expired'
  | 'failed-safe';

export interface CallbackTokenConsumeInput {
  readonly descriptorKind: 'callback-token-consume';
  readonly descriptorVersion: 'w14d';
  readonly tokenRef: string;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly actorRef?: string;
  readonly expectedContext: CallbackExpectedTokenContext;
  readonly jsonSerializable: true;
}

export interface CallbackTokenConsumeResult {
  readonly status: CallbackTokenConsumeStatus;
  readonly reasonCode?: string;
  readonly retryable?: boolean;
  readonly detailsRef?: string;
}

export interface CallbackPermissionPort {
  checkPermission(input: CallbackPermissionCheckInput): CallbackPermissionResult | Promise<CallbackPermissionResult>;
}

export interface CallbackTokenConsumePort {
  verifyToken(input: CallbackTokenVerifyInput): CallbackTokenVerifyResult | Promise<CallbackTokenVerifyResult>;
  consumeToken(input: CallbackTokenConsumeInput): CallbackTokenConsumeResult | Promise<CallbackTokenConsumeResult>;
}

export interface CallbackBoundaryPorts {
  readonly permissions: CallbackPermissionPort;
  readonly tokens: CallbackTokenConsumePort;
}

export type CallbackDecisionStatus =
  | 'permission-denied'
  | 'invalid-payload'
  | 'binding-not-found'
  | 'binding-disabled'
  | 'token-not-found'
  | 'token-context-mismatch'
  | 'token-expired'
  | 'token-consumed'
  | 'token-consume-conflict'
  | 'acknowledged-only'
  | 'failed-safe';

export type CallbackReplayStatus = 'not-replay' | 'duplicate-safe' | 'conflict-safe';

export interface CallbackDecision {
  readonly descriptorKind: 'callback-decision';
  readonly descriptorVersion: 'w14d';
  readonly status: CallbackDecisionStatus;
  readonly providerKind: CallbackProviderKind;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly tokenConsumed: boolean;
  readonly businessAccepted: boolean;
  readonly retryable: boolean;
  readonly replayStatus: CallbackReplayStatus;
  readonly reasonCode: string;
  readonly tokenRef?: string;
  readonly actionRef?: string;
  readonly detailsRef?: string;
  readonly jsonSerializable: true;
}

export type ProviderCallbackAcknowledgementStatus = 'ack-required' | 'ack-not-required';

export type ProviderCallbackAcknowledgementText =
  | 'Processing'
  | 'Not allowed'
  | 'Action expired'
  | 'Already processed'
  | 'Could not process safely';

export interface ProviderCallbackAcknowledgementDescriptor {
  readonly descriptorKind: 'provider-callback-acknowledgement';
  readonly descriptorVersion: 'w14d';
  readonly providerKind: CallbackProviderKind;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly status: ProviderCallbackAcknowledgementStatus;
  readonly displayText: ProviderCallbackAcknowledgementText;
  readonly acknowledgesBusinessSuccess: false;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export interface CallbackBoundaryValue {
  readonly descriptorKind: 'callback-boundary-result';
  readonly descriptorVersion: 'w14d';
  readonly descriptor: SafeCallbackDescriptor;
  readonly providerAcknowledgement: ProviderCallbackAcknowledgementDescriptor;
  readonly decision: CallbackDecision;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export interface SafeCallbackError {
  readonly code: 'failed-safe';
  readonly message: 'Callback processing failed safely';
  readonly retryable: boolean;
  readonly correlationRef?: string;
  readonly detailsRef?: string;
}

export type CallbackBoundaryResult =
  | { readonly ok: true; readonly value: CallbackBoundaryValue }
  | { readonly ok: false; readonly error: SafeCallbackError };

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:-]{0,119}$/u;
const MAX_SAFE_REF_LENGTH = 120;
const MAX_CALLBACK_DATA_LENGTH = 160;
const SAFE_TIMESTAMP_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}t[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,3})?z$/u;

const UNSAFE_TEXT_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }

  return fallback;
}

function hasUnsafeText(value: string): boolean {
  return UNSAFE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeRef(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (normalized.length === 0 || !SAFE_REF_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    return fallback;
  }

  return normalized;
}

function safeOptionalRef(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (normalized.length === 0 || !SAFE_REF_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    return undefined;
  }

  return normalized;
}

function createIssue(
  code: CallbackInputIssueCode,
  severity: CallbackInputIssueSeverity,
  componentRef: string,
  summary: string,
): CallbackInputIssue {
  return Object.freeze({
    code,
    severity,
    componentRef,
    summary,
  } satisfies CallbackInputIssue);
}

function normalizeTimestamp(value: unknown, fallback: string, issues: CallbackInputIssue[]): string {
  if (typeof value !== 'string') {
    if (value !== undefined) {
      issues.push(createIssue('invalid-timestamp-redacted', 'warning', 'callback:time', 'Timestamp was normalized safely'));
    }

    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!SAFE_TIMESTAMP_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    issues.push(createIssue('invalid-timestamp-redacted', 'warning', 'callback:time', 'Timestamp was normalized safely'));
    return fallback;
  }

  return normalized;
}

function parseCallbackData(value: unknown): {
  readonly payloadKind: CallbackPayloadKind;
  readonly payloadStatus: CallbackPayloadStatus;
  readonly tokenRef?: string;
  readonly actionRef?: string;
  readonly issue?: CallbackInputIssue;
} {
  if (value === undefined || value === null || value === '') {
    return Object.freeze({
      payloadKind: 'invalid',
      payloadStatus: 'rejected',
      issue: createIssue('missing-callback-data', 'blocked', 'callback:data', 'Callback data was missing'),
    });
  }

  if (typeof value !== 'string') {
    return Object.freeze({
      payloadKind: 'invalid',
      payloadStatus: 'rejected',
      issue: createIssue('invalid-callback-data', 'blocked', 'callback:data', 'Callback data was rejected safely'),
    });
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CALLBACK_DATA_LENGTH || hasUnsafeText(trimmed)) {
    return Object.freeze({
      payloadKind: 'invalid',
      payloadStatus: 'rejected',
      issue: createIssue('unsafe-callback-data-redacted', 'blocked', 'callback:data', 'Callback data was rejected safely'),
    });
  }

  if (trimmed.startsWith('hz:')) {
    const tokenRef = safeOptionalRef(trimmed.slice(3));
    if (tokenRef !== undefined) {
      return Object.freeze({
        payloadKind: 'token-ref',
        payloadStatus: 'accepted',
        tokenRef,
      });
    }
  }

  if (trimmed.startsWith('action:')) {
    const actionRef = safeOptionalRef(trimmed.slice(7));
    if (actionRef !== undefined) {
      return Object.freeze({
        payloadKind: 'action-ref',
        payloadStatus: 'accepted',
        actionRef,
      });
    }
  }

  return Object.freeze({
    payloadKind: 'invalid',
    payloadStatus: 'rejected',
    issue: createIssue('unsafe-callback-data-redacted', 'blocked', 'callback:data', 'Callback data was rejected safely'),
  });
}

function normalizeExpectedContext(value: unknown, issues: CallbackInputIssue[]): CallbackExpectedTokenContext {
  if (!isRecord(value)) {
    return Object.freeze({} satisfies CallbackExpectedTokenContext);
  }

  const workspaceRef = safeOptionalRef(value.workspaceRef);
  const agentRef = safeOptionalRef(value.agentRef);
  const hostSessionRef = safeOptionalRef(value.hostSessionRef);
  const bindingRef = safeOptionalRef(value.bindingRef);
  const outboxRef = safeOptionalRef(value.outboxRef);
  const actionRef = safeOptionalRef(value.actionRef);
  const approvalRef = safeOptionalRef(value.approvalRef);
  const capabilityRef = safeOptionalRef(value.capabilityRef);

  for (const key of ['workspaceRef', 'agentRef', 'hostSessionRef', 'bindingRef', 'outboxRef', 'actionRef', 'approvalRef', 'capabilityRef']) {
    if (value[key] !== undefined && safeOptionalRef(value[key]) === undefined) {
      issues.push(createIssue('invalid-context-ref-redacted', 'warning', 'callback:context', 'Context reference was redacted safely'));
    }
  }

  return Object.freeze({
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(hostSessionRef === undefined ? {} : { hostSessionRef }),
    ...(bindingRef === undefined ? {} : { bindingRef }),
    ...(outboxRef === undefined ? {} : { outboxRef }),
    ...(actionRef === undefined ? {} : { actionRef }),
    ...(approvalRef === undefined ? {} : { approvalRef }),
    ...(capabilityRef === undefined ? {} : { capabilityRef }),
  } satisfies CallbackExpectedTokenContext);
}

export function normalizeCallbackProviderInput(input: CallbackProviderInput): SafeCallbackDescriptor {
  const issues: CallbackInputIssue[] = [];
  const providerKind = normalizeOneOf(input.providerKind, CALLBACK_PROVIDER_KINDS, 'telegram');

  if (input.providerKind !== undefined && providerKind !== input.providerKind) {
    issues.push(
      createIssue('invalid-provider-normalized', 'warning', 'callback:provider', 'Callback provider was normalized safely'),
    );
  }

  const callbackRef = normalizeRef(input.callbackRef, `callback:${providerKind}:redacted`);
  const correlationRef = normalizeRef(input.correlationRef, `corr:${providerKind}:callback:redacted`);
  const channelRef = normalizeRef(input.channelRef, `channel:${providerKind}:redacted`);
  const chatRef = normalizeRef(input.chatRef, `chat:${providerKind}:redacted`);
  const threadRef = safeOptionalRef(input.threadRef);
  const messageRef = safeOptionalRef(input.messageRef);
  const actorRef = safeOptionalRef(input.actorRef);
  const receivedAt = normalizeTimestamp(input.receivedAt, 'time:unknown', issues);
  const occurredAt = input.occurredAt === undefined ? undefined : normalizeTimestamp(input.occurredAt, 'time:unknown', issues);
  const parsed = parseCallbackData(input.callbackData);
  const expectedContext = normalizeExpectedContext(input.expectedContext, issues);

  for (const [componentRef, original, normalized] of [
    ['callback:ref', input.callbackRef, callbackRef],
    ['callback:correlation', input.correlationRef, correlationRef],
    ['callback:channel', input.channelRef, channelRef],
    ['callback:chat', input.chatRef, chatRef],
  ] as const) {
    if (original !== undefined && typeof original === 'string' && safeOptionalRef(original) === undefined) {
      issues.push(createIssue('invalid-safe-ref-redacted', 'warning', componentRef, 'Callback reference was redacted safely'));
    }

    if (original !== undefined && typeof original !== 'string' && normalized.endsWith(':redacted')) {
      issues.push(createIssue('invalid-safe-ref-redacted', 'warning', componentRef, 'Callback reference was redacted safely'));
    }
  }

  if (parsed.issue !== undefined) {
    issues.push(parsed.issue);
  }

  return Object.freeze({
    descriptorKind: 'callback-descriptor',
    descriptorVersion: 'w14d',
    providerKind,
    callbackRef,
    correlationRef,
    channelRef,
    chatRef,
    ...(threadRef === undefined ? {} : { threadRef }),
    ...(messageRef === undefined ? {} : { messageRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    receivedAt,
    ...(occurredAt === undefined ? {} : { occurredAt }),
    payloadKind: parsed.payloadKind,
    payloadStatus: parsed.payloadStatus,
    ...(parsed.tokenRef === undefined ? {} : { tokenRef: parsed.tokenRef }),
    ...(parsed.actionRef === undefined ? {} : { actionRef: parsed.actionRef }),
    expectedContext,
    issueCount: issues.length,
    issues: Object.freeze([...issues]),
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies SafeCallbackDescriptor);
}

function permissionCheckInput(descriptor: SafeCallbackDescriptor): CallbackPermissionCheckInput {
  return Object.freeze({
    descriptorKind: 'callback-permission-check',
    descriptorVersion: 'w14d',
    phase: 'before-token-consume',
    providerKind: descriptor.providerKind,
    callbackRef: descriptor.callbackRef,
    correlationRef: descriptor.correlationRef,
    channelRef: descriptor.channelRef,
    chatRef: descriptor.chatRef,
    ...(descriptor.threadRef === undefined ? {} : { threadRef: descriptor.threadRef }),
    ...(descriptor.messageRef === undefined ? {} : { messageRef: descriptor.messageRef }),
    ...(descriptor.actorRef === undefined ? {} : { actorRef: descriptor.actorRef }),
    ...(descriptor.tokenRef === undefined ? {} : { tokenRef: descriptor.tokenRef }),
    ...(descriptor.actionRef === undefined ? {} : { actionRef: descriptor.actionRef }),
    expectedContext: descriptor.expectedContext,
    jsonSerializable: true,
  } satisfies CallbackPermissionCheckInput);
}

function tokenVerifyInput(descriptor: SafeCallbackDescriptor, tokenRef: string): CallbackTokenVerifyInput {
  return Object.freeze({
    descriptorKind: 'callback-token-verify',
    descriptorVersion: 'w14d',
    tokenRef,
    callbackRef: descriptor.callbackRef,
    correlationRef: descriptor.correlationRef,
    ...(descriptor.actorRef === undefined ? {} : { actorRef: descriptor.actorRef }),
    expectedContext: descriptor.expectedContext,
    jsonSerializable: true,
  } satisfies CallbackTokenVerifyInput);
}

function tokenConsumeInput(descriptor: SafeCallbackDescriptor, tokenRef: string): CallbackTokenConsumeInput {
  return Object.freeze({
    descriptorKind: 'callback-token-consume',
    descriptorVersion: 'w14d',
    tokenRef,
    callbackRef: descriptor.callbackRef,
    correlationRef: descriptor.correlationRef,
    ...(descriptor.actorRef === undefined ? {} : { actorRef: descriptor.actorRef }),
    expectedContext: descriptor.expectedContext,
    jsonSerializable: true,
  } satisfies CallbackTokenConsumeInput);
}

function normalizeDetailsRef(value: unknown): string | undefined {
  return safeOptionalRef(value);
}

function createDecision(
  descriptor: SafeCallbackDescriptor,
  status: CallbackDecisionStatus,
  options: {
    readonly tokenConsumed?: boolean;
    readonly businessAccepted?: boolean;
    readonly retryable?: boolean;
    readonly replayStatus?: CallbackReplayStatus;
    readonly reasonCode?: string;
    readonly detailsRef?: string | undefined;
  } = {},
): CallbackDecision {
  const detailsRef = normalizeDetailsRef(options.detailsRef);

  return Object.freeze({
    descriptorKind: 'callback-decision',
    descriptorVersion: 'w14d',
    status,
    providerKind: descriptor.providerKind,
    callbackRef: descriptor.callbackRef,
    correlationRef: descriptor.correlationRef,
    tokenConsumed: options.tokenConsumed ?? false,
    businessAccepted: options.businessAccepted ?? false,
    retryable: options.retryable ?? false,
    replayStatus: options.replayStatus ?? 'not-replay',
    reasonCode: safeOptionalRef(options.reasonCode) ?? status,
    ...(descriptor.tokenRef === undefined ? {} : { tokenRef: descriptor.tokenRef }),
    ...(descriptor.actionRef === undefined ? {} : { actionRef: descriptor.actionRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    jsonSerializable: true,
  } satisfies CallbackDecision);
}

function acknowledgementText(status: CallbackDecisionStatus, replayStatus: CallbackReplayStatus): ProviderCallbackAcknowledgementText {
  if (replayStatus === 'duplicate-safe') {
    return 'Already processed';
  }

  if (status === 'permission-denied' || status === 'binding-disabled' || status === 'binding-not-found') {
    return 'Not allowed';
  }

  if (status === 'token-expired') {
    return 'Action expired';
  }

  if (status === 'invalid-payload' || status === 'failed-safe' || status === 'token-consume-conflict') {
    return 'Could not process safely';
  }

  return 'Processing';
}

function createAcknowledgement(
  descriptor: SafeCallbackDescriptor,
  decision: CallbackDecision,
): ProviderCallbackAcknowledgementDescriptor {
  return Object.freeze({
    descriptorKind: 'provider-callback-acknowledgement',
    descriptorVersion: 'w14d',
    providerKind: descriptor.providerKind,
    callbackRef: descriptor.callbackRef,
    correlationRef: descriptor.correlationRef,
    status: 'ack-required',
    displayText: acknowledgementText(decision.status, decision.replayStatus),
    acknowledgesBusinessSuccess: false,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies ProviderCallbackAcknowledgementDescriptor);
}

function createValue(descriptor: SafeCallbackDescriptor, decision: CallbackDecision): CallbackBoundaryValue {
  return Object.freeze({
    descriptorKind: 'callback-boundary-result',
    descriptorVersion: 'w14d',
    descriptor,
    providerAcknowledgement: createAcknowledgement(descriptor, decision),
    decision,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies CallbackBoundaryValue);
}

function mapPermissionDecision(descriptor: SafeCallbackDescriptor, result: CallbackPermissionResult): CallbackDecision | undefined {
  if (result.status === 'allowed') {
    return undefined;
  }

  if (result.status === 'binding-not-found') {
    return createDecision(descriptor, 'binding-not-found', {
      reasonCode: result.reasonCode ?? 'binding-not-found',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'binding-disabled') {
    return createDecision(descriptor, 'binding-disabled', {
      reasonCode: result.reasonCode ?? 'binding-disabled',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  return createDecision(descriptor, 'permission-denied', {
    reasonCode: result.reasonCode ?? 'actor-not-authorized',
    retryable: result.retryable ?? false,
    detailsRef: result.detailsRef,
  });
}

function mapVerifyDecision(descriptor: SafeCallbackDescriptor, result: CallbackTokenVerifyResult): CallbackDecision | undefined {
  if (result.status === 'valid') {
    return undefined;
  }

  if (result.status === 'not-found') {
    return createDecision(descriptor, 'token-not-found', {
      reasonCode: result.reasonCode ?? 'token-not-found',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'context-mismatch') {
    return createDecision(descriptor, 'token-context-mismatch', {
      reasonCode: result.reasonCode ?? 'token-context-mismatch',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'expired') {
    return createDecision(descriptor, 'token-expired', {
      reasonCode: result.reasonCode ?? 'token-expired',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'already-consumed') {
    return createDecision(descriptor, 'token-consumed', {
      reasonCode: result.reasonCode ?? 'duplicate-callback-replay-safe',
      retryable: false,
      replayStatus: 'duplicate-safe',
      detailsRef: result.detailsRef,
    });
  }

  return createDecision(descriptor, 'failed-safe', {
    reasonCode: result.reasonCode ?? 'token-invalid',
    retryable: result.retryable ?? false,
    detailsRef: result.detailsRef,
  });
}

function mapConsumeDecision(descriptor: SafeCallbackDescriptor, result: CallbackTokenConsumeResult): CallbackDecision {
  if (result.status === 'consumed') {
    return createDecision(descriptor, 'token-consumed', {
      tokenConsumed: true,
      businessAccepted: true,
      reasonCode: result.reasonCode ?? 'token-consumed-after-permission',
      retryable: false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'already-consumed') {
    return createDecision(descriptor, 'token-consumed', {
      reasonCode: result.reasonCode ?? 'duplicate-callback-replay-safe',
      retryable: false,
      replayStatus: 'duplicate-safe',
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'consume-conflict') {
    return createDecision(descriptor, 'token-consume-conflict', {
      reasonCode: result.reasonCode ?? 'token-consume-conflict-safe',
      retryable: result.retryable ?? true,
      replayStatus: 'conflict-safe',
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'not-found') {
    return createDecision(descriptor, 'token-not-found', {
      reasonCode: result.reasonCode ?? 'token-not-found',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'context-mismatch') {
    return createDecision(descriptor, 'token-context-mismatch', {
      reasonCode: result.reasonCode ?? 'token-context-mismatch',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'expired') {
    return createDecision(descriptor, 'token-expired', {
      reasonCode: result.reasonCode ?? 'token-expired',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  return createDecision(descriptor, 'failed-safe', {
    reasonCode: result.reasonCode ?? 'token-consume-failed-safe',
    retryable: result.retryable ?? false,
    detailsRef: result.detailsRef,
  });
}

function safeError(correlationRef: string): CallbackBoundaryResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: 'failed-safe',
      message: 'Callback processing failed safely',
      retryable: false,
      correlationRef,
    } satisfies SafeCallbackError),
  } satisfies CallbackBoundaryResult);
}

export async function processCallbackBoundary(
  input: CallbackProviderInput,
  ports: CallbackBoundaryPorts,
): Promise<CallbackBoundaryResult> {
  const descriptor = normalizeCallbackProviderInput(input);

  if (descriptor.payloadStatus === 'rejected') {
    const decision = createDecision(descriptor, 'invalid-payload', {
      reasonCode: 'invalid-callback-data-redacted',
    });
    return Object.freeze({ ok: true, value: createValue(descriptor, decision) } satisfies CallbackBoundaryResult);
  }

  let permissionResult: CallbackPermissionResult;
  try {
    permissionResult = await ports.permissions.checkPermission(permissionCheckInput(descriptor));
  } catch {
    return safeError(descriptor.correlationRef);
  }

  const permissionDecision = mapPermissionDecision(descriptor, permissionResult);
  if (permissionDecision !== undefined) {
    return Object.freeze({ ok: true, value: createValue(descriptor, permissionDecision) } satisfies CallbackBoundaryResult);
  }

  if (descriptor.tokenRef === undefined) {
    const decision = createDecision(descriptor, 'acknowledged-only', {
      businessAccepted: true,
      reasonCode: 'safe-action-ref-acknowledged',
    });
    return Object.freeze({ ok: true, value: createValue(descriptor, decision) } satisfies CallbackBoundaryResult);
  }

  let verifyResult: CallbackTokenVerifyResult;
  try {
    verifyResult = await ports.tokens.verifyToken(tokenVerifyInput(descriptor, descriptor.tokenRef));
  } catch {
    return safeError(descriptor.correlationRef);
  }

  const verifyDecision = mapVerifyDecision(descriptor, verifyResult);
  if (verifyDecision !== undefined) {
    return Object.freeze({ ok: true, value: createValue(descriptor, verifyDecision) } satisfies CallbackBoundaryResult);
  }

  let consumeResult: CallbackTokenConsumeResult;
  try {
    consumeResult = await ports.tokens.consumeToken(tokenConsumeInput(descriptor, descriptor.tokenRef));
  } catch {
    return safeError(descriptor.correlationRef);
  }

  return Object.freeze({ ok: true, value: createValue(descriptor, mapConsumeDecision(descriptor, consumeResult)) } satisfies CallbackBoundaryResult);
}

export function isSafeCallbackPortJson(value: unknown): boolean {
  let encoded: string;

  try {
    encoded = JSON.stringify(value);
  } catch {
    return false;
  }

  if (typeof encoded !== 'string') {
    return false;
  }

  return !hasUnsafeText(encoded);
}
