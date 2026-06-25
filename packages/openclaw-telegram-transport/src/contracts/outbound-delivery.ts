export const TELEGRAM_OUTBOUND_DELIVERY_PROVIDERS = Object.freeze(['telegram'] as const);

export type TelegramOutboundDeliveryProvider = (typeof TELEGRAM_OUTBOUND_DELIVERY_PROVIDERS)[number];

export const TELEGRAM_OUTBOUND_CONTENT_FORMATS = Object.freeze(['plain', 'markdown', 'html'] as const);

export type TelegramOutboundContentFormat = (typeof TELEGRAM_OUTBOUND_CONTENT_FORMATS)[number];

export const TELEGRAM_OUTBOUND_FAILURE_REASONS = Object.freeze([
  'invalid-request',
  'blocked-missing-provider-port',
  'blocked-provider-disabled',
  'blocked-missing-secret',
  'provider-unavailable',
  'provider-rejected',
  'rate-limited',
  'timeout',
  'conflict',
  'invalid-provider-ack',
] as const);

export type TelegramOutboundFailureReason = (typeof TELEGRAM_OUTBOUND_FAILURE_REASONS)[number];

export const TELEGRAM_OUTBOUND_DIAGNOSTIC_CODES = Object.freeze([
  'invalid-delivery-request',
  'invalid-delivery-target',
  'invalid-delivery-content',
  'missing-provider-port',
  'provider-disabled',
  'missing-secret',
  'provider-returned-failure',
  'provider-threw',
  'invalid-provider-ack',
] as const);

export type TelegramOutboundDiagnosticCode = (typeof TELEGRAM_OUTBOUND_DIAGNOSTIC_CODES)[number];

export type TelegramOutboundDeliveryStatus = 'not-attempted' | 'provider-acknowledged' | 'provider-rejected';

export type TelegramOutboundProviderAcknowledgementStatus = 'not-attempted' | 'accepted' | 'rejected' | 'invalid';

export type TelegramOutboundBusinessStatus = 'not-evaluated';

export type TelegramOutboundBusinessReason =
  | 'provider-ack-is-not-business-success'
  | 'delivery-not-attempted'
  | 'provider-rejected';

export interface TelegramOutboundDeliveryTarget {
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef: string;
  readonly workspaceRef?: string;
  readonly agentRef?: string;
  readonly hostSessionRef?: string;
  readonly bindingRef?: string;
}

export interface TelegramOutboundActionButton {
  readonly label: string;
  readonly actionRef: string;
}

export interface TelegramOutboundActionButtonRow {
  readonly buttons: readonly TelegramOutboundActionButton[];
}

export interface TelegramOutboundDeliveryContent {
  readonly descriptorKind: 'telegram-outbound-delivery-content';
  readonly format: TelegramOutboundContentFormat;
  readonly text: string;
  readonly buttonRows?: readonly TelegramOutboundActionButtonRow[];
  readonly attachmentRefs?: readonly string[];
}

export interface TelegramOutboundDeliveryRequest {
  readonly descriptorKind: 'telegram-outbound-delivery-request';
  readonly provider: TelegramOutboundDeliveryProvider;
  readonly deliveryRef: string;
  readonly target: TelegramOutboundDeliveryTarget;
  readonly content: TelegramOutboundDeliveryContent;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
}

export interface TelegramOutboundProviderDeliveryRequest {
  readonly descriptorKind: 'telegram-outbound-provider-delivery-request';
  readonly provider: TelegramOutboundDeliveryProvider;
  readonly deliveryRef: string;
  readonly target: TelegramOutboundDeliveryTarget;
  readonly content: TelegramOutboundDeliveryContent;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
}

export interface TelegramOutboundProviderAccepted {
  readonly accepted: true;
  readonly providerMessageRef?: unknown;
  readonly acknowledgementRef?: unknown;
  readonly idempotencyRef?: unknown;
  readonly deliveryAttemptRef?: unknown;
}

export interface TelegramOutboundProviderRejected {
  readonly accepted: false;
  readonly reasonCode?: unknown;
  readonly retryable?: unknown;
  readonly diagnosticCode?: unknown;
  readonly acknowledgementRef?: unknown;
  readonly idempotencyRef?: unknown;
  readonly deliveryAttemptRef?: unknown;
}

export type TelegramOutboundProviderAcknowledgement =
  | TelegramOutboundProviderAccepted
  | TelegramOutboundProviderRejected;

export interface TelegramOutboundDeliveryProviderPort {
  readonly deliver: (
    request: TelegramOutboundProviderDeliveryRequest,
  ) => Promise<TelegramOutboundProviderAcknowledgement> | TelegramOutboundProviderAcknowledgement;
}

export interface TelegramOutboundBusinessResult {
  readonly status: TelegramOutboundBusinessStatus;
  readonly success: false;
  readonly reason: TelegramOutboundBusinessReason;
}

export interface TelegramOutboundProviderAcknowledgementSummary {
  readonly status: TelegramOutboundProviderAcknowledgementStatus;
  readonly provider: TelegramOutboundDeliveryProvider;
  readonly messageRef?: string;
  readonly acknowledgementRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
}

export interface TelegramOutboundProviderAcceptedSummary extends TelegramOutboundProviderAcknowledgementSummary {
  readonly status: 'accepted';
  readonly messageRef: string;
}

export interface TelegramOutboundDeliverySafeError {
  readonly reasonCode: TelegramOutboundFailureReason;
  readonly diagnosticCode: TelegramOutboundDiagnosticCode;
  readonly componentRef: 'telegram:outbound-delivery';
  readonly retryable: boolean;
  readonly safeMessage: string;
}

export interface TelegramOutboundDeliverySuccess {
  readonly descriptorKind: 'telegram-outbound-delivery-result';
  readonly ok: true;
  readonly provider: TelegramOutboundDeliveryProvider;
  readonly deliveryRef: string;
  readonly deliveryStatus: 'provider-acknowledged';
  readonly providerAcknowledged: true;
  readonly providerAcknowledgement: TelegramOutboundProviderAcceptedSummary;
  readonly businessResult: TelegramOutboundBusinessResult;
  readonly businessSuccess: false;
  readonly retryable: false;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
}

export interface TelegramOutboundDeliveryFailure {
  readonly descriptorKind: 'telegram-outbound-delivery-result';
  readonly ok: false;
  readonly provider: TelegramOutboundDeliveryProvider;
  readonly deliveryRef: string;
  readonly deliveryStatus: 'not-attempted' | 'provider-rejected';
  readonly providerAcknowledged: false;
  readonly providerAcknowledgement: TelegramOutboundProviderAcknowledgementSummary;
  readonly businessResult: TelegramOutboundBusinessResult;
  readonly businessSuccess: false;
  readonly error: TelegramOutboundDeliverySafeError;
  readonly retryable: boolean;
  readonly correlationRef?: string;
  readonly idempotencyRef?: string;
  readonly deliveryAttemptRef?: string;
}

export type TelegramOutboundDeliveryResult = TelegramOutboundDeliverySuccess | TelegramOutboundDeliveryFailure;

export interface TelegramOutboundDeliveryPort {
  readonly descriptorKind: 'telegram-outbound-delivery-port';
  readonly effects: 'none-until-invoked';
  readonly providerClientConstructed: false;
  readonly defaultNetworkBehavior: 'none';
  readonly deliver: (request: TelegramOutboundDeliveryRequest) => Promise<TelegramOutboundDeliveryResult>;
}

export const TELEGRAM_OUTBOUND_SAFE_REF_FALLBACK = 'ref:redacted';

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:-]{0,159}$/u;
const MAX_SAFE_REF_LENGTH = 160;

const UNSAFE_PUBLIC_TEXT_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\b(?:chat_id|thread_id|stack trace)\b/iu,
  /\bprovider(?:body|result|object|handle|client|sdk)\b/iu,
] as const);

export function containsTelegramOutboundUnsafePublicText(value: string): boolean {
  return UNSAFE_PUBLIC_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

export function normalizeTelegramOutboundSafeRef(value: unknown, fallback = TELEGRAM_OUTBOUND_SAFE_REF_FALLBACK): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, MAX_SAFE_REF_LENGTH);
  if (!SAFE_REF_PATTERN.test(normalized) || containsTelegramOutboundUnsafePublicText(normalized)) {
    return fallback;
  }

  return normalized;
}

export function normalizeTelegramOutboundOptionalSafeRef(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = normalizeTelegramOutboundSafeRef(value);
  return normalized === TELEGRAM_OUTBOUND_SAFE_REF_FALLBACK ? undefined : normalized;
}

export function isTelegramOutboundSafeRef(value: unknown): value is string {
  return typeof value === 'string' && normalizeTelegramOutboundOptionalSafeRef(value) === value;
}

export function isTelegramOutboundSafeText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength &&
    !containsTelegramOutboundUnsafePublicText(value)
  );
}

export function isSafeTelegramOutboundPublicJson(value: unknown): boolean {
  const encoded = JSON.stringify(value);

  return typeof encoded === 'string' && !containsTelegramOutboundUnsafePublicText(encoded);
}
