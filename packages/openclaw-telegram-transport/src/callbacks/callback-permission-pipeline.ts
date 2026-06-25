export const TELEGRAM_CALLBACK_PIPELINE_PROVIDER_KINDS = Object.freeze(['telegram', 'openclaw'] as const);

export type TelegramCallbackPipelineProviderKind = (typeof TELEGRAM_CALLBACK_PIPELINE_PROVIDER_KINDS)[number];

export type TelegramCallbackPayloadKind = 'callback-token' | 'action-ref' | 'unsupported' | 'malformed';
export type TelegramCallbackPayloadStatus = 'accepted' | 'rejected';
export type TelegramCallbackTokenPresence = 'present' | 'absent' | 'malformed';
export type TelegramCallbackPipelineEffect = 'none';
export type TelegramCallbackPipelineReplayStatus = 'not-replay' | 'duplicate-safe' | 'conflict-safe';
export type TelegramCallbackPipelineIssueSeverity = 'warning' | 'blocked';

export type TelegramCallbackPipelineIssueCode =
  | 'provider-normalized'
  | 'safe-ref-redacted'
  | 'timestamp-normalized'
  | 'context-ref-redacted'
  | 'callback-data-missing'
  | 'callback-data-rejected'
  | 'callback-action-unsupported';

export interface TelegramCallbackPipelineIssue {
  readonly code: TelegramCallbackPipelineIssueCode;
  readonly severity: TelegramCallbackPipelineIssueSeverity;
  readonly componentRef: string;
  readonly summary: string;
}

export interface TelegramCallbackExpectedContextInput {
  readonly workspaceRef?: unknown;
  readonly agentRef?: unknown;
  readonly hostSessionRef?: unknown;
  readonly bindingRef?: unknown;
  readonly actionRef?: unknown;
  readonly approvalRef?: unknown;
  readonly capabilityRef?: unknown;
}

export interface TelegramCallbackExpectedContext {
  readonly workspaceRef?: string;
  readonly agentRef?: string;
  readonly hostSessionRef?: string;
  readonly bindingRef?: string;
  readonly actionRef?: string;
  readonly approvalRef?: string;
  readonly capabilityRef?: string;
}

export interface TelegramCallbackPipelineInput {
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
  readonly profileRef?: unknown;
  readonly permissionRef?: unknown;
  readonly idempotencyRef?: unknown;
  readonly expectedContext?: TelegramCallbackExpectedContextInput;
}

export interface TelegramCallbackSafeDescriptor {
  readonly descriptorKind: 'telegram-callback-safe-descriptor';
  readonly descriptorVersion: 'w17e';
  readonly providerKind: TelegramCallbackPipelineProviderKind;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef?: string;
  readonly messageRef?: string;
  readonly actorRef?: string;
  readonly actionRef?: string;
  readonly permissionRef: string;
  readonly tokenRef?: string;
  readonly tokenPresence: TelegramCallbackTokenPresence;
  readonly idempotencyRef: string;
  readonly profileRef: string;
  readonly receivedAt: string;
  readonly payloadKind: TelegramCallbackPayloadKind;
  readonly payloadStatus: TelegramCallbackPayloadStatus;
  readonly expectedContext: TelegramCallbackExpectedContext;
  readonly issueCount: number;
  readonly issues: readonly TelegramCallbackPipelineIssue[];
  readonly effects: TelegramCallbackPipelineEffect;
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export type TelegramCallbackPermissionStatus = 'allowed' | 'denied' | 'missing-binding' | 'disabled-binding' | 'failed-safe';

export interface TelegramCallbackPermissionInput {
  readonly descriptorKind: 'telegram-callback-permission-check';
  readonly descriptorVersion: 'w17e';
  readonly phase: 'before-token-consume';
  readonly providerKind: TelegramCallbackPipelineProviderKind;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef?: string;
  readonly messageRef?: string;
  readonly actorRef?: string;
  readonly actionRef?: string;
  readonly permissionRef: string;
  readonly tokenPresence: TelegramCallbackTokenPresence;
  readonly idempotencyRef: string;
  readonly expectedContext: TelegramCallbackExpectedContext;
  readonly jsonSerializable: true;
}

export interface TelegramCallbackPermissionResult {
  readonly status: TelegramCallbackPermissionStatus;
  readonly reasonCode?: string;
  readonly retryable?: boolean;
  readonly detailsRef?: string;
}

export type TelegramCallbackTokenVerifyStatus =
  | 'verified'
  | 'missing'
  | 'invalid'
  | 'expired'
  | 'context-mismatch'
  | 'already-consumed'
  | 'failed-safe';

export interface TelegramCallbackTokenVerifyInput {
  readonly descriptorKind: 'telegram-callback-token-verify';
  readonly descriptorVersion: 'w17e';
  readonly tokenRef: string;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly actorRef?: string;
  readonly idempotencyRef: string;
  readonly expectedContext: TelegramCallbackExpectedContext;
  readonly jsonSerializable: true;
}

export interface TelegramCallbackTokenVerifyResult {
  readonly status: TelegramCallbackTokenVerifyStatus;
  readonly reasonCode?: string;
  readonly retryable?: boolean;
  readonly detailsRef?: string;
}

export type TelegramCallbackTokenConsumeStatus =
  | 'consumed'
  | 'already-consumed'
  | 'consume-conflict'
  | 'missing'
  | 'expired'
  | 'context-mismatch'
  | 'failed-safe';

export interface TelegramCallbackTokenConsumeInput {
  readonly descriptorKind: 'telegram-callback-token-consume';
  readonly descriptorVersion: 'w17e';
  readonly tokenRef: string;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly actorRef?: string;
  readonly idempotencyRef: string;
  readonly expectedContext: TelegramCallbackExpectedContext;
  readonly jsonSerializable: true;
}

export interface TelegramCallbackTokenConsumeResult {
  readonly status: TelegramCallbackTokenConsumeStatus;
  readonly reasonCode?: string;
  readonly retryable?: boolean;
  readonly detailsRef?: string;
}

export interface TelegramCallbackPermissionPort {
  checkPermission(input: TelegramCallbackPermissionInput): TelegramCallbackPermissionResult | Promise<TelegramCallbackPermissionResult>;
}

export interface TelegramCallbackTokenPort {
  verifyToken(input: TelegramCallbackTokenVerifyInput): TelegramCallbackTokenVerifyResult | Promise<TelegramCallbackTokenVerifyResult>;
  consumeToken(input: TelegramCallbackTokenConsumeInput): TelegramCallbackTokenConsumeResult | Promise<TelegramCallbackTokenConsumeResult>;
}

export interface TelegramCallbackPermissionPipelinePorts {
  readonly permissions: TelegramCallbackPermissionPort;
  readonly tokens: TelegramCallbackTokenPort;
}

export type TelegramCallbackPipelineDecisionStatus =
  | 'authorized-token-consumed'
  | 'provider-ack-only'
  | 'permission-denied'
  | 'missing-binding'
  | 'disabled-binding'
  | 'token-missing'
  | 'token-invalid'
  | 'token-expired'
  | 'token-context-mismatch'
  | 'token-already-consumed'
  | 'duplicate-callback'
  | 'consume-conflict'
  | 'unsafe-payload-rejected'
  | 'unsupported-action'
  | 'failed-safe-redacted';

export interface TelegramCallbackPipelineDecision {
  readonly descriptorKind: 'telegram-callback-pipeline-decision';
  readonly descriptorVersion: 'w17e';
  readonly status: TelegramCallbackPipelineDecisionStatus;
  readonly safeDecision: TelegramCallbackPipelineDecisionStatus;
  readonly providerAcknowledged: false;
  readonly permissionAllowed: boolean;
  readonly tokenVerified: boolean;
  readonly tokenConsumed: boolean;
  readonly businessCompleted: false;
  readonly replayStatus: TelegramCallbackPipelineReplayStatus;
  readonly blockedReason: string;
  readonly retryable: boolean;
  readonly correlationRef: string;
  readonly detailsRef?: string;
  readonly jsonSerializable: true;
}

export type TelegramCallbackAcknowledgementText =
  | 'Processing'
  | 'Not allowed'
  | 'Action expired'
  | 'Already processed'
  | 'Unsupported action'
  | 'Could not process safely';

export interface TelegramCallbackSafeAcknowledgement {
  readonly descriptorKind: 'telegram-callback-safe-acknowledgement';
  readonly descriptorVersion: 'w17e';
  readonly providerKind: TelegramCallbackPipelineProviderKind;
  readonly callbackRef: string;
  readonly correlationRef: string;
  readonly acknowledgementRequired: true;
  readonly displayText: TelegramCallbackAcknowledgementText;
  readonly providerAcknowledged: false;
  readonly acknowledgesBusinessSuccess: false;
  readonly effects: TelegramCallbackPipelineEffect;
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

export interface TelegramCallbackPermissionPipelineValue {
  readonly descriptorKind: 'telegram-callback-permission-pipeline-result';
  readonly descriptorVersion: 'w17e';
  readonly descriptor: TelegramCallbackSafeDescriptor;
  readonly providerAcknowledgement: TelegramCallbackSafeAcknowledgement;
  readonly decision: TelegramCallbackPipelineDecision;
  readonly effects: TelegramCallbackPipelineEffect;
  readonly willCallRemote: false;
  readonly jsonSerializable: true;
}

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

function hasUnsafeText(value: string): boolean {
  return UNSAFE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function issue(
  code: TelegramCallbackPipelineIssueCode,
  severity: TelegramCallbackPipelineIssueSeverity,
  componentRef: string,
  summary: string,
): TelegramCallbackPipelineIssue {
  return Object.freeze({ code, severity, componentRef, summary } satisfies TelegramCallbackPipelineIssue);
}

function normalizeRef(value: unknown, fallback: string, issues: TelegramCallbackPipelineIssue[], componentRef: string): string {
  if (typeof value !== 'string') {
    if (value !== undefined) {
      issues.push(issue('safe-ref-redacted', 'warning', componentRef, 'Reference was normalized safely'));
    }
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (normalized.length === 0 || !SAFE_REF_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    issues.push(issue('safe-ref-redacted', 'warning', componentRef, 'Reference was normalized safely'));
    return fallback;
  }

  return normalized;
}

function optionalRef(value: unknown, issues: TelegramCallbackPipelineIssue[], componentRef: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    issues.push(issue('safe-ref-redacted', 'warning', componentRef, 'Reference was redacted safely'));
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (normalized.length === 0 || !SAFE_REF_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    issues.push(issue('safe-ref-redacted', 'warning', componentRef, 'Reference was redacted safely'));
    return undefined;
  }

  return normalized;
}

function maybeRef(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (normalized.length === 0 || !SAFE_REF_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizeProvider(value: unknown, issues: TelegramCallbackPipelineIssue[]): TelegramCallbackPipelineProviderKind {
  if (typeof value === 'string' && (TELEGRAM_CALLBACK_PIPELINE_PROVIDER_KINDS as readonly string[]).includes(value)) {
    return value as TelegramCallbackPipelineProviderKind;
  }

  if (value !== undefined) {
    issues.push(issue('provider-normalized', 'warning', 'callback:provider', 'Provider was normalized safely'));
  }

  return 'telegram';
}

function normalizeTimestamp(value: unknown, issues: TelegramCallbackPipelineIssue[]): string {
  if (typeof value !== 'string') {
    if (value !== undefined) {
      issues.push(issue('timestamp-normalized', 'warning', 'callback:time', 'Timestamp was normalized safely'));
    }
    return 'time:unknown';
  }

  const normalized = value.trim().toLowerCase();
  if (!SAFE_TIMESTAMP_PATTERN.test(normalized) || hasUnsafeText(normalized)) {
    issues.push(issue('timestamp-normalized', 'warning', 'callback:time', 'Timestamp was normalized safely'));
    return 'time:unknown';
  }

  return normalized;
}

function normalizeExpectedContext(
  input: TelegramCallbackExpectedContextInput | undefined,
  issues: TelegramCallbackPipelineIssue[],
): TelegramCallbackExpectedContext {
  if (!isRecord(input)) {
    return Object.freeze({} satisfies TelegramCallbackExpectedContext);
  }

  const workspaceRef = optionalRef(input.workspaceRef, issues, 'callback:context');
  const agentRef = optionalRef(input.agentRef, issues, 'callback:context');
  const hostSessionRef = optionalRef(input.hostSessionRef, issues, 'callback:context');
  const bindingRef = optionalRef(input.bindingRef, issues, 'callback:context');
  const actionRef = optionalRef(input.actionRef, issues, 'callback:context');
  const approvalRef = optionalRef(input.approvalRef, issues, 'callback:context');
  const capabilityRef = optionalRef(input.capabilityRef, issues, 'callback:context');

  return Object.freeze({
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(hostSessionRef === undefined ? {} : { hostSessionRef }),
    ...(bindingRef === undefined ? {} : { bindingRef }),
    ...(actionRef === undefined ? {} : { actionRef }),
    ...(approvalRef === undefined ? {} : { approvalRef }),
    ...(capabilityRef === undefined ? {} : { capabilityRef }),
  } satisfies TelegramCallbackExpectedContext);
}

function parseCallbackData(value: unknown, issues: TelegramCallbackPipelineIssue[]): {
  readonly payloadKind: TelegramCallbackPayloadKind;
  readonly payloadStatus: TelegramCallbackPayloadStatus;
  readonly tokenRef?: string;
  readonly actionRef?: string;
  readonly tokenPresence: TelegramCallbackTokenPresence;
} {
  if (value === undefined || value === null || value === '') {
    issues.push(issue('callback-data-missing', 'blocked', 'callback:data', 'Callback data was missing'));
    return Object.freeze({ payloadKind: 'malformed', payloadStatus: 'rejected', tokenPresence: 'malformed' });
  }

  if (typeof value !== 'string') {
    issues.push(issue('callback-data-rejected', 'blocked', 'callback:data', 'Callback data was rejected safely'));
    return Object.freeze({ payloadKind: 'malformed', payloadStatus: 'rejected', tokenPresence: 'malformed' });
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CALLBACK_DATA_LENGTH || hasUnsafeText(trimmed)) {
    issues.push(issue('callback-data-rejected', 'blocked', 'callback:data', 'Callback data was rejected safely'));
    return Object.freeze({ payloadKind: 'malformed', payloadStatus: 'rejected', tokenPresence: 'malformed' });
  }

  for (const prefix of ['hz:', 'token:'] as const) {
    if (trimmed.startsWith(prefix)) {
      const tokenRef = maybeRef(trimmed.slice(prefix.length));
      if (tokenRef !== undefined) {
        return Object.freeze({ payloadKind: 'callback-token', payloadStatus: 'accepted', tokenRef, tokenPresence: 'present' });
      }
      issues.push(issue('callback-data-rejected', 'blocked', 'callback:data', 'Callback data was rejected safely'));
      return Object.freeze({ payloadKind: 'malformed', payloadStatus: 'rejected', tokenPresence: 'malformed' });
    }
  }

  if (trimmed.startsWith('action:')) {
    const actionRef = maybeRef(trimmed.slice('action:'.length));
    if (actionRef !== undefined) {
      return Object.freeze({ payloadKind: 'action-ref', payloadStatus: 'accepted', actionRef, tokenPresence: 'absent' });
    }
    issues.push(issue('callback-data-rejected', 'blocked', 'callback:data', 'Callback data was rejected safely'));
    return Object.freeze({ payloadKind: 'malformed', payloadStatus: 'rejected', tokenPresence: 'malformed' });
  }

  issues.push(issue('callback-action-unsupported', 'blocked', 'callback:data', 'Callback action was not supported'));
  return Object.freeze({ payloadKind: 'unsupported', payloadStatus: 'rejected', tokenPresence: 'absent' });
}

export function normalizeTelegramCallbackDescriptor(input: TelegramCallbackPipelineInput): TelegramCallbackSafeDescriptor {
  const issues: TelegramCallbackPipelineIssue[] = [];
  const providerKind = normalizeProvider(input.providerKind, issues);
  const callbackRef = normalizeRef(input.callbackRef, `callback:${providerKind}:redacted`, issues, 'callback:ref');
  const correlationRef = normalizeRef(input.correlationRef, `corr:${providerKind}:callback:redacted`, issues, 'callback:correlation');
  const channelRef = normalizeRef(input.channelRef, `channel:${providerKind}:redacted`, issues, 'callback:channel');
  const chatRef = normalizeRef(input.chatRef, `chat:${providerKind}:redacted`, issues, 'callback:chat');
  const threadRef = optionalRef(input.threadRef, issues, 'callback:thread');
  const messageRef = optionalRef(input.messageRef, issues, 'callback:message');
  const actorRef = optionalRef(input.actorRef, issues, 'callback:actor');
  const permissionRef = normalizeRef(input.permissionRef, 'permission:callback-default', issues, 'callback:permission');
  const idempotencyRef = normalizeRef(input.idempotencyRef, `idem:${providerKind}:callback:redacted`, issues, 'callback:idempotency');
  const profileRef = normalizeRef(input.profileRef, 'profile:default', issues, 'callback:profile');
  const receivedAt = normalizeTimestamp(input.receivedAt, issues);
  const parsed = parseCallbackData(input.callbackData, issues);
  const expectedContext = normalizeExpectedContext(input.expectedContext, issues);

  return Object.freeze({
    descriptorKind: 'telegram-callback-safe-descriptor',
    descriptorVersion: 'w17e',
    providerKind,
    callbackRef,
    correlationRef,
    channelRef,
    chatRef,
    ...(threadRef === undefined ? {} : { threadRef }),
    ...(messageRef === undefined ? {} : { messageRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(parsed.actionRef === undefined ? {} : { actionRef: parsed.actionRef }),
    permissionRef,
    ...(parsed.tokenRef === undefined ? {} : { tokenRef: parsed.tokenRef }),
    tokenPresence: parsed.tokenPresence,
    idempotencyRef,
    profileRef,
    receivedAt,
    payloadKind: parsed.payloadKind,
    payloadStatus: parsed.payloadStatus,
    expectedContext,
    issueCount: issues.length,
    issues: Object.freeze([...issues]),
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies TelegramCallbackSafeDescriptor);
}

function permissionInput(descriptor: TelegramCallbackSafeDescriptor): TelegramCallbackPermissionInput {
  return Object.freeze({
    descriptorKind: 'telegram-callback-permission-check',
    descriptorVersion: 'w17e',
    phase: 'before-token-consume',
    providerKind: descriptor.providerKind,
    callbackRef: descriptor.callbackRef,
    correlationRef: descriptor.correlationRef,
    channelRef: descriptor.channelRef,
    chatRef: descriptor.chatRef,
    ...(descriptor.threadRef === undefined ? {} : { threadRef: descriptor.threadRef }),
    ...(descriptor.messageRef === undefined ? {} : { messageRef: descriptor.messageRef }),
    ...(descriptor.actorRef === undefined ? {} : { actorRef: descriptor.actorRef }),
    ...(descriptor.actionRef === undefined ? {} : { actionRef: descriptor.actionRef }),
    permissionRef: descriptor.permissionRef,
    tokenPresence: descriptor.tokenPresence,
    idempotencyRef: descriptor.idempotencyRef,
    expectedContext: descriptor.expectedContext,
    jsonSerializable: true,
  } satisfies TelegramCallbackPermissionInput);
}

function verifyInput(descriptor: TelegramCallbackSafeDescriptor, tokenRef: string): TelegramCallbackTokenVerifyInput {
  return Object.freeze({
    descriptorKind: 'telegram-callback-token-verify',
    descriptorVersion: 'w17e',
    tokenRef,
    callbackRef: descriptor.callbackRef,
    correlationRef: descriptor.correlationRef,
    ...(descriptor.actorRef === undefined ? {} : { actorRef: descriptor.actorRef }),
    idempotencyRef: descriptor.idempotencyRef,
    expectedContext: descriptor.expectedContext,
    jsonSerializable: true,
  } satisfies TelegramCallbackTokenVerifyInput);
}

function consumeInput(descriptor: TelegramCallbackSafeDescriptor, tokenRef: string): TelegramCallbackTokenConsumeInput {
  return Object.freeze({
    descriptorKind: 'telegram-callback-token-consume',
    descriptorVersion: 'w17e',
    tokenRef,
    callbackRef: descriptor.callbackRef,
    correlationRef: descriptor.correlationRef,
    ...(descriptor.actorRef === undefined ? {} : { actorRef: descriptor.actorRef }),
    idempotencyRef: descriptor.idempotencyRef,
    expectedContext: descriptor.expectedContext,
    jsonSerializable: true,
  } satisfies TelegramCallbackTokenConsumeInput);
}

function safeDetailsRef(value: unknown): string | undefined {
  return maybeRef(value);
}

function safeReason(value: unknown, fallback: string): string {
  return maybeRef(value) ?? fallback;
}

function decision(
  descriptor: TelegramCallbackSafeDescriptor,
  status: TelegramCallbackPipelineDecisionStatus,
  options: {
    readonly permissionAllowed?: boolean;
    readonly tokenVerified?: boolean;
    readonly tokenConsumed?: boolean;
    readonly replayStatus?: TelegramCallbackPipelineReplayStatus;
    readonly blockedReason?: string;
    readonly retryable?: boolean;
    readonly detailsRef?: string | undefined;
  } = {},
): TelegramCallbackPipelineDecision {
  const detailsRef = safeDetailsRef(options.detailsRef);

  return Object.freeze({
    descriptorKind: 'telegram-callback-pipeline-decision',
    descriptorVersion: 'w17e',
    status,
    safeDecision: status,
    providerAcknowledged: false,
    permissionAllowed: options.permissionAllowed ?? false,
    tokenVerified: options.tokenVerified ?? false,
    tokenConsumed: options.tokenConsumed ?? false,
    businessCompleted: false,
    replayStatus: options.replayStatus ?? 'not-replay',
    blockedReason: safeReason(options.blockedReason, status),
    retryable: options.retryable ?? false,
    correlationRef: descriptor.correlationRef,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    jsonSerializable: true,
  } satisfies TelegramCallbackPipelineDecision);
}

function acknowledgementText(decisionStatus: TelegramCallbackPipelineDecisionStatus, replayStatus: TelegramCallbackPipelineReplayStatus): TelegramCallbackAcknowledgementText {
  if (replayStatus === 'duplicate-safe' || decisionStatus === 'token-already-consumed' || decisionStatus === 'duplicate-callback') {
    return 'Already processed';
  }

  if (decisionStatus === 'permission-denied' || decisionStatus === 'missing-binding' || decisionStatus === 'disabled-binding') {
    return 'Not allowed';
  }

  if (decisionStatus === 'token-expired') {
    return 'Action expired';
  }

  if (decisionStatus === 'unsupported-action') {
    return 'Unsupported action';
  }

  if (
    decisionStatus === 'unsafe-payload-rejected' ||
    decisionStatus === 'failed-safe-redacted' ||
    decisionStatus === 'token-invalid' ||
    decisionStatus === 'consume-conflict' ||
    decisionStatus === 'token-context-mismatch'
  ) {
    return 'Could not process safely';
  }

  return 'Processing';
}

function acknowledgement(
  descriptor: TelegramCallbackSafeDescriptor,
  callbackDecision: TelegramCallbackPipelineDecision,
): TelegramCallbackSafeAcknowledgement {
  return Object.freeze({
    descriptorKind: 'telegram-callback-safe-acknowledgement',
    descriptorVersion: 'w17e',
    providerKind: descriptor.providerKind,
    callbackRef: descriptor.callbackRef,
    correlationRef: descriptor.correlationRef,
    acknowledgementRequired: true,
    displayText: acknowledgementText(callbackDecision.status, callbackDecision.replayStatus),
    providerAcknowledged: false,
    acknowledgesBusinessSuccess: false,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies TelegramCallbackSafeAcknowledgement);
}

function value(descriptor: TelegramCallbackSafeDescriptor, callbackDecision: TelegramCallbackPipelineDecision): TelegramCallbackPermissionPipelineValue {
  return Object.freeze({
    descriptorKind: 'telegram-callback-permission-pipeline-result',
    descriptorVersion: 'w17e',
    descriptor,
    providerAcknowledgement: acknowledgement(descriptor, callbackDecision),
    decision: callbackDecision,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
  } satisfies TelegramCallbackPermissionPipelineValue);
}

function permissionDecision(
  descriptor: TelegramCallbackSafeDescriptor,
  result: TelegramCallbackPermissionResult,
): TelegramCallbackPipelineDecision | undefined {
  if (result.status === 'allowed') {
    return undefined;
  }

  if (result.status === 'missing-binding') {
    return decision(descriptor, 'missing-binding', {
      blockedReason: result.reasonCode ?? 'missing-binding',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'disabled-binding') {
    return decision(descriptor, 'disabled-binding', {
      blockedReason: result.reasonCode ?? 'disabled-binding',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'failed-safe') {
    return decision(descriptor, 'failed-safe-redacted', {
      blockedReason: result.reasonCode ?? 'permission-failed-safe',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  return decision(descriptor, 'permission-denied', {
    blockedReason: result.reasonCode ?? 'actor-not-authorized',
    retryable: result.retryable ?? false,
    detailsRef: result.detailsRef,
  });
}

function verifyDecision(
  descriptor: TelegramCallbackSafeDescriptor,
  result: TelegramCallbackTokenVerifyResult,
): TelegramCallbackPipelineDecision | undefined {
  if (result.status === 'verified') {
    return undefined;
  }

  if (result.status === 'missing') {
    return decision(descriptor, 'token-missing', {
      permissionAllowed: true,
      blockedReason: result.reasonCode ?? 'token-missing',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'expired') {
    return decision(descriptor, 'token-expired', {
      permissionAllowed: true,
      blockedReason: result.reasonCode ?? 'token-expired',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'context-mismatch') {
    return decision(descriptor, 'token-context-mismatch', {
      permissionAllowed: true,
      blockedReason: result.reasonCode ?? 'token-context-mismatch',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'already-consumed') {
    return decision(descriptor, 'duplicate-callback', {
      permissionAllowed: true,
      blockedReason: result.reasonCode ?? 'duplicate-callback',
      replayStatus: 'duplicate-safe',
      retryable: false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'failed-safe') {
    return decision(descriptor, 'failed-safe-redacted', {
      permissionAllowed: true,
      blockedReason: result.reasonCode ?? 'token-verify-failed-safe',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  return decision(descriptor, 'token-invalid', {
    permissionAllowed: true,
    blockedReason: result.reasonCode ?? 'token-invalid',
    retryable: result.retryable ?? false,
    detailsRef: result.detailsRef,
  });
}

function consumeDecision(descriptor: TelegramCallbackSafeDescriptor, result: TelegramCallbackTokenConsumeResult): TelegramCallbackPipelineDecision {
  if (result.status === 'consumed') {
    return decision(descriptor, 'authorized-token-consumed', {
      permissionAllowed: true,
      tokenVerified: true,
      tokenConsumed: true,
      blockedReason: result.reasonCode ?? 'authorized-token-consumed',
      retryable: false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'already-consumed') {
    return decision(descriptor, 'duplicate-callback', {
      permissionAllowed: true,
      tokenVerified: true,
      blockedReason: result.reasonCode ?? 'duplicate-callback',
      replayStatus: 'duplicate-safe',
      retryable: false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'consume-conflict') {
    return decision(descriptor, 'consume-conflict', {
      permissionAllowed: true,
      tokenVerified: true,
      blockedReason: result.reasonCode ?? 'consume-conflict',
      replayStatus: 'conflict-safe',
      retryable: result.retryable ?? true,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'missing') {
    return decision(descriptor, 'token-missing', {
      permissionAllowed: true,
      tokenVerified: true,
      blockedReason: result.reasonCode ?? 'token-missing',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'expired') {
    return decision(descriptor, 'token-expired', {
      permissionAllowed: true,
      tokenVerified: true,
      blockedReason: result.reasonCode ?? 'token-expired',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  if (result.status === 'context-mismatch') {
    return decision(descriptor, 'token-context-mismatch', {
      permissionAllowed: true,
      tokenVerified: true,
      blockedReason: result.reasonCode ?? 'token-context-mismatch',
      retryable: result.retryable ?? false,
      detailsRef: result.detailsRef,
    });
  }

  return decision(descriptor, 'failed-safe-redacted', {
    permissionAllowed: true,
    tokenVerified: true,
    blockedReason: result.reasonCode ?? 'token-consume-failed-safe',
    retryable: result.retryable ?? false,
    detailsRef: result.detailsRef,
  });
}

export async function processTelegramCallbackPermissionPipeline(
  input: TelegramCallbackPipelineInput,
  ports: TelegramCallbackPermissionPipelinePorts,
): Promise<TelegramCallbackPermissionPipelineValue> {
  const descriptor = normalizeTelegramCallbackDescriptor(input);

  if (descriptor.payloadKind === 'malformed') {
    return value(
      descriptor,
      decision(descriptor, 'unsafe-payload-rejected', { blockedReason: 'unsafe-payload-rejected' }),
    );
  }

  if (descriptor.payloadKind === 'unsupported') {
    return value(descriptor, decision(descriptor, 'unsupported-action', { blockedReason: 'unsupported-action' }));
  }

  let checkedPermission: TelegramCallbackPermissionResult;
  try {
    checkedPermission = await ports.permissions.checkPermission(permissionInput(descriptor));
  } catch {
    return value(descriptor, decision(descriptor, 'failed-safe-redacted', { blockedReason: 'permission-check-failed-safe' }));
  }

  const deniedDecision = permissionDecision(descriptor, checkedPermission);
  if (deniedDecision !== undefined) {
    return value(descriptor, deniedDecision);
  }

  if (descriptor.tokenRef === undefined) {
    return value(
      descriptor,
      decision(descriptor, 'provider-ack-only', {
        permissionAllowed: true,
        blockedReason: 'provider-ack-only',
      }),
    );
  }

  let verifiedToken: TelegramCallbackTokenVerifyResult;
  try {
    verifiedToken = await ports.tokens.verifyToken(verifyInput(descriptor, descriptor.tokenRef));
  } catch {
    return value(
      descriptor,
      decision(descriptor, 'failed-safe-redacted', {
        permissionAllowed: true,
        blockedReason: 'token-verify-failed-safe',
      }),
    );
  }

  const failedVerifyDecision = verifyDecision(descriptor, verifiedToken);
  if (failedVerifyDecision !== undefined) {
    return value(descriptor, failedVerifyDecision);
  }

  let consumedToken: TelegramCallbackTokenConsumeResult;
  try {
    consumedToken = await ports.tokens.consumeToken(consumeInput(descriptor, descriptor.tokenRef));
  } catch {
    return value(
      descriptor,
      decision(descriptor, 'failed-safe-redacted', {
        permissionAllowed: true,
        tokenVerified: true,
        blockedReason: 'token-consume-failed-safe',
      }),
    );
  }

  return value(descriptor, consumeDecision(descriptor, consumedToken));
}

export function isSafeTelegramCallbackPermissionPipelineJson(valueToCheck: unknown): boolean {
  let encoded: string;

  try {
    encoded = JSON.stringify(valueToCheck);
  } catch {
    return false;
  }

  if (typeof encoded !== 'string') {
    return false;
  }

  return !hasUnsafeText(encoded);
}
