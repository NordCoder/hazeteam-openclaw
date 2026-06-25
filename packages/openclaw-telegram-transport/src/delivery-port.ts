export const DELIVERY_PROVIDER_KINDS = Object.freeze(['telegram', 'openclaw'] as const);

export type DeliveryProviderKind = (typeof DELIVERY_PROVIDER_KINDS)[number];

export const DELIVERY_CONTENT_FORMATS = Object.freeze(['plain', 'markdown', 'html'] as const);

export type DeliveryContentFormat = (typeof DELIVERY_CONTENT_FORMATS)[number];

export const DELIVERY_FAILURE_REASON_CODES = Object.freeze([
  'invalid-request',
  'target-not-found',
  'provider-unavailable',
  'provider-rejected',
  'rate-limited',
  'timeout',
  'conflict',
  'internal',
] as const);

export type DeliveryFailureReasonCode = (typeof DELIVERY_FAILURE_REASON_CODES)[number];

export type DeliveryDiagnosticCode =
  | 'invalid-rendered-content'
  | 'invalid-delivery-target'
  | 'provider-disabled'
  | 'missing-secret'
  | 'provider-not-configured'
  | 'provider-returned-failure'
  | 'provider-threw'
  | 'invalid-provider-ack';

export type DeliveryStatus = 'not-attempted' | 'provider-acknowledged' | 'provider-rejected';

export type DeliveryBusinessStatus = 'not-marked-delivered' | 'not-marked-failed';

export interface RenderedDeliveryTarget {
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef: string;
  readonly workspaceRef?: string;
  readonly agentRef?: string;
  readonly hostSessionRef?: string;
  readonly bindingRef?: string;
}

export interface DeliveryActionButton {
  readonly label: string;
  readonly actionRef: string;
}

export interface DeliveryActionButtonGroup {
  readonly buttons: readonly DeliveryActionButton[];
}

export interface RenderedDeliveryContent {
  readonly descriptorKind: 'rendered-delivery-content';
  readonly format: DeliveryContentFormat;
  readonly text: string;
  readonly buttonGroups?: readonly DeliveryActionButtonGroup[];
  readonly attachmentRefs?: readonly string[];
}

export interface DeliveryReadinessProviderGate {
  readonly provider: DeliveryProviderKind;
  readonly mode?: 'disabled' | 'dry-run' | 'real';
  readonly classification?: string;
  readonly readiness?: string;
  readonly secretStatus?: string;
  readonly willCallRemote?: false;
}

export interface DeliveryReadinessGate {
  readonly status?: string;
  readonly providers?: readonly DeliveryReadinessProviderGate[];
}

export interface RenderedDeliveryRequest {
  readonly descriptorKind: 'rendered-delivery-request';
  readonly deliveryRef: string;
  readonly provider: DeliveryProviderKind;
  readonly target: RenderedDeliveryTarget;
  readonly content: RenderedDeliveryContent;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
  readonly previousExternalMessageRef?: string;
  readonly readiness?: DeliveryReadinessGate;
}

export interface DeliveryProviderClientRequest {
  readonly descriptorKind: 'provider-delivery-client-request';
  readonly deliveryRef: string;
  readonly provider: DeliveryProviderKind;
  readonly target: RenderedDeliveryTarget;
  readonly content: RenderedDeliveryContent;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
  readonly previousExternalMessageRef?: string;
}

export interface DeliveryProviderAcknowledged {
  readonly ok: true;
  readonly provider?: DeliveryProviderKind;
  readonly externalMessageRef?: unknown;
  readonly idempotencyRef?: unknown;
  readonly deliveryAttemptRef?: unknown;
}

export interface DeliveryProviderRejected {
  readonly ok: false;
  readonly reasonCode?: unknown;
  readonly retryable?: unknown;
  readonly diagnosticCode?: unknown;
  readonly detailsRef?: unknown;
  readonly idempotencyRef?: unknown;
  readonly deliveryAttemptRef?: unknown;
}

export type DeliveryProviderAcknowledgement = DeliveryProviderAcknowledged | DeliveryProviderRejected;

export interface InjectedDeliveryProviderClient {
  readonly deliver: (
    request: DeliveryProviderClientRequest,
  ) => Promise<DeliveryProviderAcknowledgement> | DeliveryProviderAcknowledgement;
}

export interface DeliveryPortOptions {
  readonly client: InjectedDeliveryProviderClient;
  readonly readiness?: DeliveryReadinessGate;
}

export interface DeliveryExternalMessageRef {
  readonly descriptorKind: 'transport-external-message-ref';
  readonly provider: DeliveryProviderKind;
  readonly messageRef: string;
  readonly deliveryRef: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
}

export interface DeliverySafeError {
  readonly reasonCode: DeliveryFailureReasonCode;
  readonly diagnosticCode: DeliveryDiagnosticCode;
  readonly componentRef: string;
  readonly retryable: boolean;
  readonly safeMessage: string;
}

export interface DeliveryPortSuccess {
  readonly descriptorKind: 'transport-delivery-result';
  readonly ok: true;
  readonly provider: DeliveryProviderKind;
  readonly deliveryRef: string;
  readonly deliveryStatus: 'provider-acknowledged';
  readonly providerAcknowledged: true;
  readonly businessStatus: 'not-marked-delivered';
  readonly businessSuccess: false;
  readonly externalMessageRef: DeliveryExternalMessageRef;
  readonly retryable: false;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
}

export interface DeliveryPortFailure {
  readonly descriptorKind: 'transport-delivery-result';
  readonly ok: false;
  readonly provider: DeliveryProviderKind;
  readonly deliveryRef: string;
  readonly deliveryStatus: 'not-attempted' | 'provider-rejected';
  readonly providerAcknowledged: false;
  readonly businessStatus: 'not-marked-failed';
  readonly businessSuccess: false;
  readonly error: DeliverySafeError;
  readonly retryable: boolean;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
  readonly detailsRef?: string;
}

export type DeliveryPortResult = DeliveryPortSuccess | DeliveryPortFailure;

export interface InjectedDeliveryPort {
  readonly descriptorKind: 'injected-provider-delivery-port';
  readonly effects: 'none-until-invoked';
  readonly providerClientConstructed: false;
  readonly willCallRemoteWithoutClient: false;
  readonly deliver: (request: RenderedDeliveryRequest) => Promise<DeliveryPortResult>;
}

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:-]{0,159}$/u;
const MAX_SAFE_REF_LENGTH = 160;
const MAX_TEXT_LENGTH = 4096;
const MAX_LABEL_LENGTH = 64;
const MAX_BUTTON_GROUPS = 8;
const MAX_BUTTONS_PER_GROUP = 8;
const MAX_ATTACHMENTS = 8;

const UNSAFE_OUTPUT_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\braw(?:Delivery|Provider|Transport|Body|Update|Result)?\b/u,
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function containsUnsafeText(value: string): boolean {
  return UNSAFE_OUTPUT_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeSafeRef(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (!SAFE_REF_PATTERN.test(normalized) || containsUnsafeText(normalized)) {
    return fallback;
  }

  return normalized;
}

function normalizeOptionalSafeRef(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = normalizeSafeRef(value, 'ref:redacted');
  return normalized === 'ref:redacted' ? undefined : normalized;
}

function safeString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength && !containsUnsafeText(value);
}

function safeMessageFor(reasonCode: DeliveryFailureReasonCode): string {
  switch (reasonCode) {
    case 'invalid-request':
      return 'Delivery request was rejected safely';
    case 'target-not-found':
      return 'Delivery target was not available';
    case 'provider-unavailable':
      return 'Delivery provider is unavailable';
    case 'provider-rejected':
      return 'Delivery provider rejected the request';
    case 'rate-limited':
      return 'Delivery provider rate limit was reached';
    case 'timeout':
      return 'Delivery provider timed out';
    case 'conflict':
      return 'Delivery conflicted with an existing operation';
    case 'internal':
      return 'Delivery failed safely';
  }
}

function createSafeError(
  reasonCode: DeliveryFailureReasonCode,
  diagnosticCode: DeliveryDiagnosticCode,
  retryable: boolean,
): DeliverySafeError {
  return Object.freeze({
    reasonCode,
    diagnosticCode,
    componentRef: 'transport:delivery',
    retryable,
    safeMessage: safeMessageFor(reasonCode),
  } satisfies DeliverySafeError);
}

function failureResult(
  request: RenderedDeliveryRequest,
  deliveryStatus: DeliveryPortFailure['deliveryStatus'],
  reasonCode: DeliveryFailureReasonCode,
  diagnosticCode: DeliveryDiagnosticCode,
  retryable: boolean,
  extras: {
    readonly idempotencyRef?: string;
    readonly deliveryAttemptRef?: string;
    readonly detailsRef?: string;
  } = {},
): DeliveryPortFailure {
  const correlationRef = normalizeOptionalSafeRef(request.correlationRef);
  const idempotencyRef = extras.idempotencyRef ?? normalizeOptionalSafeRef(request.idempotencyRef);
  const deliveryAttemptRef = extras.deliveryAttemptRef ?? normalizeOptionalSafeRef(request.deliveryAttemptRef);

  return Object.freeze({
    descriptorKind: 'transport-delivery-result',
    ok: false,
    provider: request.provider,
    deliveryRef: normalizeSafeRef(request.deliveryRef, 'delivery:redacted'),
    deliveryStatus,
    providerAcknowledged: false,
    businessStatus: 'not-marked-failed',
    businessSuccess: false,
    error: createSafeError(reasonCode, diagnosticCode, retryable),
    retryable,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
    ...(extras.detailsRef === undefined ? {} : { detailsRef: extras.detailsRef }),
  } satisfies DeliveryPortFailure);
}

function providerGateFor(
  provider: DeliveryProviderKind,
  requestReadiness?: DeliveryReadinessGate,
  optionsReadiness?: DeliveryReadinessGate,
): DeliveryReadinessProviderGate | undefined {
  const readiness = requestReadiness ?? optionsReadiness;
  const providers = readiness?.providers;

  if (providers === undefined) {
    return undefined;
  }

  return providers.find((gate) => gate.provider === provider);
}

function classifyReadinessGate(
  provider: DeliveryProviderKind,
  requestReadiness?: DeliveryReadinessGate,
  optionsReadiness?: DeliveryReadinessGate,
): DeliveryDiagnosticCode | undefined {
  const gate = providerGateFor(provider, requestReadiness, optionsReadiness);

  if (gate === undefined) {
    return undefined;
  }

  if (gate.mode === 'disabled' || gate.classification === 'disabled' || gate.readiness === 'disabled') {
    return 'provider-disabled';
  }

  if (
    gate.classification === 'missing-secret' ||
    gate.readiness === 'blocked-by-secret' ||
    gate.secretStatus === 'missing' ||
    gate.secretStatus === 'invalid' ||
    gate.secretStatus === 'unavailable'
  ) {
    return 'missing-secret';
  }

  if (gate.classification === 'missing' || gate.readiness === 'missing') {
    return 'provider-not-configured';
  }

  return undefined;
}

function validateTarget(target: RenderedDeliveryTarget): boolean {
  return (
    normalizeOptionalSafeRef(target.channelRef) === target.channelRef &&
    normalizeOptionalSafeRef(target.chatRef) === target.chatRef &&
    normalizeOptionalSafeRef(target.threadRef) === target.threadRef &&
    (target.workspaceRef === undefined || normalizeOptionalSafeRef(target.workspaceRef) === target.workspaceRef) &&
    (target.agentRef === undefined || normalizeOptionalSafeRef(target.agentRef) === target.agentRef) &&
    (target.hostSessionRef === undefined || normalizeOptionalSafeRef(target.hostSessionRef) === target.hostSessionRef) &&
    (target.bindingRef === undefined || normalizeOptionalSafeRef(target.bindingRef) === target.bindingRef)
  );
}

function validateButtonGroups(groups: readonly DeliveryActionButtonGroup[] | undefined): boolean {
  if (groups === undefined) {
    return true;
  }

  if (!Array.isArray(groups) || groups.length > MAX_BUTTON_GROUPS) {
    return false;
  }

  return groups.every((group) => {
    if (!Array.isArray(group.buttons) || group.buttons.length > MAX_BUTTONS_PER_GROUP) {
      return false;
    }

    return group.buttons.every(
      (button: DeliveryActionButton) => safeString(button.label, MAX_LABEL_LENGTH) && normalizeOptionalSafeRef(button.actionRef) === button.actionRef,
    );
  });
}

function validateAttachmentRefs(attachmentRefs: readonly string[] | undefined): boolean {
  if (attachmentRefs === undefined) {
    return true;
  }

  if (!Array.isArray(attachmentRefs) || attachmentRefs.length > MAX_ATTACHMENTS) {
    return false;
  }

  return attachmentRefs.every((attachmentRef) => normalizeOptionalSafeRef(attachmentRef) === attachmentRef);
}

function validateContent(content: RenderedDeliveryContent): boolean {
  return (
    content.descriptorKind === 'rendered-delivery-content' &&
    isOneOf(content.format, DELIVERY_CONTENT_FORMATS) &&
    safeString(content.text, MAX_TEXT_LENGTH) &&
    validateButtonGroups(content.buttonGroups) &&
    validateAttachmentRefs(content.attachmentRefs)
  );
}

function validateRequest(request: RenderedDeliveryRequest): DeliveryDiagnosticCode | undefined {
  if (
    !isOneOf(request.provider, DELIVERY_PROVIDER_KINDS) ||
    request.descriptorKind !== 'rendered-delivery-request' ||
    normalizeOptionalSafeRef(request.deliveryRef) !== request.deliveryRef
  ) {
    return 'invalid-rendered-content';
  }

  if (!validateTarget(request.target)) {
    return 'invalid-delivery-target';
  }

  if (!validateContent(request.content)) {
    return 'invalid-rendered-content';
  }

  return undefined;
}

function clientRequestFrom(request: RenderedDeliveryRequest): DeliveryProviderClientRequest {
  const correlationRef = normalizeOptionalSafeRef(request.correlationRef);
  const idempotencyRef = normalizeOptionalSafeRef(request.idempotencyRef);
  const deliveryAttemptRef = normalizeOptionalSafeRef(request.deliveryAttemptRef);
  const previousExternalMessageRef = normalizeOptionalSafeRef(request.previousExternalMessageRef);

  return Object.freeze({
    descriptorKind: 'provider-delivery-client-request',
    deliveryRef: request.deliveryRef,
    provider: request.provider,
    target: request.target,
    content: request.content,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
    ...(previousExternalMessageRef === undefined ? {} : { previousExternalMessageRef }),
  } satisfies DeliveryProviderClientRequest);
}

function normalizeReasonCode(value: unknown): DeliveryFailureReasonCode {
  return isOneOf(value, DELIVERY_FAILURE_REASON_CODES) ? value : 'provider-rejected';
}

function normalizeDiagnosticCode(value: unknown, fallback: DeliveryDiagnosticCode): DeliveryDiagnosticCode {
  const allowed = [
    'invalid-rendered-content',
    'invalid-delivery-target',
    'provider-disabled',
    'missing-secret',
    'provider-not-configured',
    'provider-returned-failure',
    'provider-threw',
    'invalid-provider-ack',
  ] as const satisfies readonly DeliveryDiagnosticCode[];

  return isOneOf(value, allowed) ? value : fallback;
}

function successResult(
  request: RenderedDeliveryRequest,
  acknowledgement: DeliveryProviderAcknowledged,
): DeliveryPortSuccess {
  const deliveryRef = normalizeSafeRef(request.deliveryRef, 'delivery:redacted');
  const messageRef = normalizeSafeRef(
    acknowledgement.externalMessageRef,
    `message:${request.provider}:redacted`,
  );
  const correlationRef = normalizeOptionalSafeRef(request.correlationRef);
  const idempotencyRef = normalizeOptionalSafeRef(acknowledgement.idempotencyRef) ?? normalizeOptionalSafeRef(request.idempotencyRef);
  const deliveryAttemptRef =
    normalizeOptionalSafeRef(acknowledgement.deliveryAttemptRef) ?? normalizeOptionalSafeRef(request.deliveryAttemptRef);

  return Object.freeze({
    descriptorKind: 'transport-delivery-result',
    ok: true,
    provider: request.provider,
    deliveryRef,
    deliveryStatus: 'provider-acknowledged',
    providerAcknowledged: true,
    businessStatus: 'not-marked-delivered',
    businessSuccess: false,
    externalMessageRef: Object.freeze({
      descriptorKind: 'transport-external-message-ref',
      provider: request.provider,
      messageRef,
      deliveryRef,
      ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
      ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
    } satisfies DeliveryExternalMessageRef),
    retryable: false,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
  } satisfies DeliveryPortSuccess);
}

function failureFromAcknowledgement(
  request: RenderedDeliveryRequest,
  acknowledgement: DeliveryProviderRejected,
): DeliveryPortFailure {
  const reasonCode = normalizeReasonCode(acknowledgement.reasonCode);
  const retryable = typeof acknowledgement.retryable === 'boolean' ? acknowledgement.retryable : reasonCode !== 'provider-rejected';
  const diagnosticCode = normalizeDiagnosticCode(acknowledgement.diagnosticCode, 'provider-returned-failure');
  const idempotencyRef = normalizeOptionalSafeRef(acknowledgement.idempotencyRef) ?? normalizeOptionalSafeRef(request.idempotencyRef);
  const deliveryAttemptRef =
    normalizeOptionalSafeRef(acknowledgement.deliveryAttemptRef) ?? normalizeOptionalSafeRef(request.deliveryAttemptRef);
  const detailsRef = normalizeOptionalSafeRef(acknowledgement.detailsRef);

  return failureResult(request, 'provider-rejected', reasonCode, diagnosticCode, retryable, {
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
  });
}

function normalizeAcknowledgement(
  request: RenderedDeliveryRequest,
  acknowledgement: DeliveryProviderAcknowledgement,
): DeliveryPortResult {
  if (!isRecord(acknowledgement) || typeof acknowledgement.ok !== 'boolean') {
    return failureResult(request, 'provider-rejected', 'provider-rejected', 'invalid-provider-ack', true);
  }

  if (acknowledgement.ok === false) {
    return failureFromAcknowledgement(request, acknowledgement);
  }

  return successResult(request, acknowledgement);
}

export function createInjectedDeliveryPort(options: DeliveryPortOptions): InjectedDeliveryPort {
  return Object.freeze({
    descriptorKind: 'injected-provider-delivery-port',
    effects: 'none-until-invoked',
    providerClientConstructed: false,
    willCallRemoteWithoutClient: false,
    deliver(request: RenderedDeliveryRequest): Promise<DeliveryPortResult> {
      return deliverRenderedRequest(options, request);
    },
  } satisfies InjectedDeliveryPort);
}

export async function deliverRenderedRequest(
  options: DeliveryPortOptions,
  request: RenderedDeliveryRequest,
): Promise<DeliveryPortResult> {
  const invalidRequest = validateRequest(request);
  if (invalidRequest !== undefined) {
    return failureResult(request, 'not-attempted', 'invalid-request', invalidRequest, false);
  }

  const blockedByReadiness = classifyReadinessGate(request.provider, request.readiness, options.readiness);
  if (blockedByReadiness !== undefined) {
    return failureResult(request, 'not-attempted', 'provider-unavailable', blockedByReadiness, blockedByReadiness !== 'provider-disabled');
  }

  try {
    const acknowledgement = await options.client.deliver(clientRequestFrom(request));
    return normalizeAcknowledgement(request, acknowledgement);
  } catch {
    return failureResult(request, 'provider-rejected', 'provider-rejected', 'provider-threw', true);
  }
}

export function isSafeDeliveryResultJson(value: unknown): boolean {
  const encoded = JSON.stringify(value);

  if (encoded === undefined) {
    return false;
  }

  return !containsUnsafeText(encoded);
}
