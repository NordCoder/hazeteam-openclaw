import {
  TELEGRAM_OUTBOUND_CONTENT_FORMATS,
  TELEGRAM_OUTBOUND_DELIVERY_PROVIDERS,
  isTelegramOutboundSafeRef,
  isTelegramOutboundSafeText,
  isSafeTelegramOutboundPublicJson,
  normalizeTelegramOutboundOptionalSafeRef,
  type TelegramOutboundActionButton,
  type TelegramOutboundActionButtonRow,
  type TelegramOutboundContentFormat,
  type TelegramOutboundDeliveryContent,
  type TelegramOutboundDeliveryProvider,
  type TelegramOutboundDeliveryRequest,
  type TelegramOutboundDeliveryTarget,
  type TelegramOutboundDiagnosticCode,
  type TelegramOutboundFailureReason,
} from '../contracts/outbound-delivery.js';

export interface TelegramOutboundDeliveryTargetInput {
  readonly channelRef?: unknown;
  readonly chatRef?: unknown;
  readonly threadRef?: unknown;
  readonly workspaceRef?: unknown;
  readonly agentRef?: unknown;
  readonly hostSessionRef?: unknown;
  readonly bindingRef?: unknown;
}

export interface TelegramOutboundActionButtonInput {
  readonly label?: unknown;
  readonly actionRef?: unknown;
}

export interface TelegramOutboundActionButtonRowInput {
  readonly buttons?: unknown;
}

export interface TelegramOutboundDeliveryContentInput {
  readonly format?: unknown;
  readonly text?: unknown;
  readonly buttonRows?: unknown;
  readonly attachmentRefs?: unknown;
}

export interface TelegramOutboundDeliveryRequestInput {
  readonly provider?: unknown;
  readonly deliveryRef?: unknown;
  readonly target?: unknown;
  readonly content?: unknown;
  readonly correlationRef?: unknown;
  readonly idempotencyRef?: unknown;
  readonly deliveryAttemptRef?: unknown;
}

export interface TelegramOutboundDeliveryRequestBuildFailure {
  readonly descriptorKind: 'telegram-outbound-delivery-request-build-result';
  readonly ok: false;
  readonly reasonCode: TelegramOutboundFailureReason;
  readonly diagnosticCode: TelegramOutboundDiagnosticCode;
  readonly safeMessage: string;
}

export interface TelegramOutboundDeliveryRequestBuildSuccess {
  readonly descriptorKind: 'telegram-outbound-delivery-request-build-result';
  readonly ok: true;
  readonly request: TelegramOutboundDeliveryRequest;
}

export type TelegramOutboundDeliveryRequestBuildResult =
  | TelegramOutboundDeliveryRequestBuildFailure
  | TelegramOutboundDeliveryRequestBuildSuccess;

const MAX_TEXT_LENGTH = 4096;
const MAX_LABEL_LENGTH = 64;
const MAX_BUTTON_ROWS = 8;
const MAX_BUTTONS_PER_ROW = 8;
const MAX_ATTACHMENTS = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function buildFailure(
  diagnosticCode: TelegramOutboundDiagnosticCode,
  safeMessage: string,
): TelegramOutboundDeliveryRequestBuildFailure {
  return Object.freeze({
    descriptorKind: 'telegram-outbound-delivery-request-build-result',
    ok: false,
    reasonCode: 'invalid-request',
    diagnosticCode,
    safeMessage,
  } satisfies TelegramOutboundDeliveryRequestBuildFailure);
}

function normalizeRequiredRef(value: unknown): string | undefined {
  const normalized = normalizeTelegramOutboundOptionalSafeRef(value);
  return normalized === undefined || !isTelegramOutboundSafeRef(normalized) ? undefined : normalized;
}

function normalizeTarget(input: unknown): TelegramOutboundDeliveryTarget | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const channelRef = normalizeRequiredRef(input.channelRef);
  const chatRef = normalizeRequiredRef(input.chatRef);
  const threadRef = normalizeRequiredRef(input.threadRef);

  if (channelRef === undefined || chatRef === undefined || threadRef === undefined) {
    return undefined;
  }

  const workspaceRef = normalizeTelegramOutboundOptionalSafeRef(input.workspaceRef);
  const agentRef = normalizeTelegramOutboundOptionalSafeRef(input.agentRef);
  const hostSessionRef = normalizeTelegramOutboundOptionalSafeRef(input.hostSessionRef);
  const bindingRef = normalizeTelegramOutboundOptionalSafeRef(input.bindingRef);

  return Object.freeze({
    channelRef,
    chatRef,
    threadRef,
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(hostSessionRef === undefined ? {} : { hostSessionRef }),
    ...(bindingRef === undefined ? {} : { bindingRef }),
  } satisfies TelegramOutboundDeliveryTarget);
}

function normalizeButtonRows(input: unknown): readonly TelegramOutboundActionButtonRow[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Array.isArray(input) || input.length > MAX_BUTTON_ROWS) {
    return undefined;
  }

  const rows: TelegramOutboundActionButtonRow[] = [];
  for (const row of input) {
    if (!isRecord(row) || !Array.isArray(row.buttons) || row.buttons.length > MAX_BUTTONS_PER_ROW) {
      return undefined;
    }

    const buttons: TelegramOutboundActionButton[] = [];
    for (const button of row.buttons) {
      if (!isRecord(button) || !isTelegramOutboundSafeText(button.label, MAX_LABEL_LENGTH)) {
        return undefined;
      }

      const actionRef = normalizeRequiredRef(button.actionRef);
      if (actionRef === undefined) {
        return undefined;
      }

      buttons.push(Object.freeze({ label: button.label, actionRef } satisfies TelegramOutboundActionButton));
    }

    rows.push(Object.freeze({ buttons } satisfies TelegramOutboundActionButtonRow));
  }

  return Object.freeze(rows);
}

function normalizeAttachmentRefs(input: unknown): readonly string[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Array.isArray(input) || input.length > MAX_ATTACHMENTS) {
    return undefined;
  }

  const attachmentRefs: string[] = [];
  for (const attachmentRefInput of input) {
    const attachmentRef = normalizeRequiredRef(attachmentRefInput);
    if (attachmentRef === undefined) {
      return undefined;
    }

    attachmentRefs.push(attachmentRef);
  }

  return Object.freeze(attachmentRefs);
}

function normalizeContent(input: unknown): TelegramOutboundDeliveryContent | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  if (!isOneOf(input.format, TELEGRAM_OUTBOUND_CONTENT_FORMATS)) {
    return undefined;
  }

  if (!isTelegramOutboundSafeText(input.text, MAX_TEXT_LENGTH)) {
    return undefined;
  }

  const buttonRows = normalizeButtonRows(input.buttonRows);
  if (input.buttonRows !== undefined && buttonRows === undefined) {
    return undefined;
  }

  const attachmentRefs = normalizeAttachmentRefs(input.attachmentRefs);
  if (input.attachmentRefs !== undefined && attachmentRefs === undefined) {
    return undefined;
  }

  return Object.freeze({
    descriptorKind: 'telegram-outbound-delivery-content',
    format: input.format,
    text: input.text,
    ...(buttonRows === undefined ? {} : { buttonRows }),
    ...(attachmentRefs === undefined ? {} : { attachmentRefs }),
  } satisfies TelegramOutboundDeliveryContent);
}

export function createTelegramOutboundDeliveryRequest(
  input: TelegramOutboundDeliveryRequestInput,
): TelegramOutboundDeliveryRequestBuildResult {
  if (!isOneOf(input.provider ?? 'telegram', TELEGRAM_OUTBOUND_DELIVERY_PROVIDERS)) {
    return buildFailure('invalid-delivery-request', 'Outbound delivery provider was rejected safely');
  }

  const provider: TelegramOutboundDeliveryProvider = input.provider ?? 'telegram';
  const deliveryRef = normalizeRequiredRef(input.deliveryRef);
  if (deliveryRef === undefined) {
    return buildFailure('invalid-delivery-request', 'Outbound delivery reference was rejected safely');
  }

  const target = normalizeTarget(input.target);
  if (target === undefined) {
    return buildFailure('invalid-delivery-target', 'Outbound delivery target was rejected safely');
  }

  const content = normalizeContent(input.content);
  if (content === undefined) {
    return buildFailure('invalid-delivery-content', 'Outbound delivery content was rejected safely');
  }

  const correlationRef = normalizeTelegramOutboundOptionalSafeRef(input.correlationRef);
  const idempotencyRef = normalizeTelegramOutboundOptionalSafeRef(input.idempotencyRef);
  const deliveryAttemptRef = normalizeTelegramOutboundOptionalSafeRef(input.deliveryAttemptRef);

  const request = Object.freeze({
    descriptorKind: 'telegram-outbound-delivery-request',
    provider,
    deliveryRef,
    target,
    content,
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(deliveryAttemptRef === undefined ? {} : { deliveryAttemptRef }),
  } satisfies TelegramOutboundDeliveryRequest);

  return Object.freeze({
    descriptorKind: 'telegram-outbound-delivery-request-build-result',
    ok: true,
    request,
  } satisfies TelegramOutboundDeliveryRequestBuildSuccess);
}

export function isSafeTelegramOutboundDeliveryRequest(value: unknown): value is TelegramOutboundDeliveryRequest {
  if (!isRecord(value)) {
    return false;
  }

  if (value.descriptorKind !== 'telegram-outbound-delivery-request') {
    return false;
  }

  const reconstructed = createTelegramOutboundDeliveryRequest({
    provider: value.provider,
    deliveryRef: value.deliveryRef,
    target: value.target,
    content: value.content,
    correlationRef: value.correlationRef,
    idempotencyRef: value.idempotencyRef,
    deliveryAttemptRef: value.deliveryAttemptRef,
  });

  return reconstructed.ok && isSafeTelegramOutboundPublicJson(reconstructed.request);
}
