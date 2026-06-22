import type { AdapterPublicId } from "./refs.js";

/**
 * S02C-local minimal delivery channel ref.
 *
 * This intentionally carries only the delivery-facing channel target fields and
 * avoids importing S02B channel-event contracts while S02B can run in parallel.
 * A later phase may reconcile this shape with the channel-event channel ref.
 */
export interface OpenClawTelegramDeliveryChannelRef {
  readonly id: AdapterPublicId;
  readonly kind: "telegram";
  readonly botRef?: string;
  readonly deploymentRef?: string;
}

export interface TelegramDeliveryTarget {
  readonly chatId: AdapterPublicId;
  readonly messageThreadId: AdapterPublicId;
  readonly replyToMessageId?: AdapterPublicId;
  readonly editMessageId?: AdapterPublicId;
}

export interface TelegramDeliveryContent {
  readonly text?: string;
  readonly richMessageRef?: AdapterPublicId;
  readonly parseMode?: "plain" | "markdown" | "html" | "rich";
}

export interface TelegramActionButton {
  readonly label: string;
  /** Opaque callback data only, for example `hz:<tokenRef>`; never a raw action payload. */
  readonly tokenPayload: string;
  readonly style?: "primary" | "secondary" | "danger";
}

export interface TelegramActionButtonGroup {
  readonly rows: readonly (readonly TelegramActionButton[])[];
}

export interface OpenClawTelegramDeliveryRequest {
  readonly deliveryRef: AdapterPublicId;
  readonly channelRef: OpenClawTelegramDeliveryChannelRef;
  readonly telegram: TelegramDeliveryTarget;
  readonly content: TelegramDeliveryContent;
  readonly actions?: readonly TelegramActionButtonGroup[];
  readonly notificationPolicy?: "normal" | "silent";
  readonly correlationId: AdapterPublicId;
}

export interface ExternalTelegramMessageRef {
  readonly chatId: AdapterPublicId;
  readonly messageThreadId?: AdapterPublicId;
  readonly messageId: AdapterPublicId;
}

export interface OpenClawTelegramDeliveryError {
  readonly code: string;
  readonly safeMessage: string;
  readonly retryable: boolean;
  readonly detailsRef?: AdapterPublicId;
}

export interface OpenClawTelegramDeliverySuccess {
  readonly ok: true;
  readonly deliveryRef: AdapterPublicId;
  readonly externalMessageRef?: ExternalTelegramMessageRef;
  readonly correlationId: AdapterPublicId;
}

export interface OpenClawTelegramDeliveryFailure {
  readonly ok: false;
  readonly deliveryRef: AdapterPublicId;
  readonly error: OpenClawTelegramDeliveryError;
  readonly correlationId: AdapterPublicId;
}

export type OpenClawTelegramDeliveryResult =
  | OpenClawTelegramDeliverySuccess
  | OpenClawTelegramDeliveryFailure;

function normalizeNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new TypeError(`${label} must be non-empty`);
  }
  return normalized;
}

function optionalNonEmpty(value: AdapterPublicId | undefined, label: string): AdapterPublicId | undefined {
  return value === undefined ? undefined : normalizeNonEmpty(value, label);
}

function normalizeTokenPayload(value: string): string {
  const normalized = normalizeNonEmpty(value, "telegramActionButton.tokenPayload");
  if (!normalized.startsWith("hz:")) {
    throw new TypeError("telegramActionButton.tokenPayload must be an opaque hz:<tokenRef> callback payload");
  }
  return normalized;
}

export function createOpenClawTelegramDeliveryChannelRef(
  input: OpenClawTelegramDeliveryChannelRef
): OpenClawTelegramDeliveryChannelRef {
  return {
    id: normalizeNonEmpty(input.id, "deliveryChannelRef.id"),
    kind: "telegram",
    ...(input.botRef === undefined ? {} : { botRef: input.botRef }),
    ...(input.deploymentRef === undefined ? {} : { deploymentRef: input.deploymentRef })
  };
}

export function createTelegramDeliveryTarget(input: TelegramDeliveryTarget): TelegramDeliveryTarget {
  return {
    chatId: normalizeNonEmpty(input.chatId, "telegramDeliveryTarget.chatId"),
    messageThreadId: normalizeNonEmpty(
      input.messageThreadId,
      "telegramDeliveryTarget.messageThreadId"
    ),
    ...(input.replyToMessageId === undefined
      ? {}
      : { replyToMessageId: normalizeNonEmpty(input.replyToMessageId, "telegramDeliveryTarget.replyToMessageId") }),
    ...(input.editMessageId === undefined
      ? {}
      : { editMessageId: normalizeNonEmpty(input.editMessageId, "telegramDeliveryTarget.editMessageId") })
  };
}

export function createTelegramDeliveryContent(input: TelegramDeliveryContent): TelegramDeliveryContent {
  return {
    ...(input.text === undefined ? {} : { text: normalizeNonEmpty(input.text, "telegramDeliveryContent.text") }),
    ...(input.richMessageRef === undefined
      ? {}
      : { richMessageRef: normalizeNonEmpty(input.richMessageRef, "telegramDeliveryContent.richMessageRef") }),
    ...(input.parseMode === undefined ? {} : { parseMode: input.parseMode })
  };
}

export function createTelegramActionButton(input: TelegramActionButton): TelegramActionButton {
  return {
    label: normalizeNonEmpty(input.label, "telegramActionButton.label"),
    tokenPayload: normalizeTokenPayload(input.tokenPayload),
    ...(input.style === undefined ? {} : { style: input.style })
  };
}

export function createTelegramActionButtonGroup(
  input: TelegramActionButtonGroup
): TelegramActionButtonGroup {
  return {
    rows: input.rows.map((row) => row.map((button) => createTelegramActionButton(button)))
  };
}

export function createExternalTelegramMessageRef(
  input: ExternalTelegramMessageRef
): ExternalTelegramMessageRef {
  const messageThreadId = optionalNonEmpty(input.messageThreadId, "externalTelegramMessageRef.messageThreadId");
  return {
    chatId: normalizeNonEmpty(input.chatId, "externalTelegramMessageRef.chatId"),
    ...(messageThreadId === undefined ? {} : { messageThreadId }),
    messageId: normalizeNonEmpty(input.messageId, "externalTelegramMessageRef.messageId")
  };
}

export function createOpenClawTelegramDeliveryError(
  input: OpenClawTelegramDeliveryError
): OpenClawTelegramDeliveryError {
  const detailsRef = optionalNonEmpty(input.detailsRef, "openClawTelegramDeliveryError.detailsRef");
  return {
    code: normalizeNonEmpty(input.code, "openClawTelegramDeliveryError.code"),
    safeMessage: normalizeNonEmpty(input.safeMessage, "openClawTelegramDeliveryError.safeMessage"),
    retryable: input.retryable,
    ...(detailsRef === undefined ? {} : { detailsRef })
  };
}

export function telegramDeliveryOk(input: OpenClawTelegramDeliverySuccess): OpenClawTelegramDeliveryResult {
  return {
    ok: true,
    deliveryRef: normalizeNonEmpty(input.deliveryRef, "telegramDeliveryResult.deliveryRef"),
    ...(input.externalMessageRef === undefined
      ? {}
      : { externalMessageRef: createExternalTelegramMessageRef(input.externalMessageRef) }),
    correlationId: normalizeNonEmpty(input.correlationId, "telegramDeliveryResult.correlationId")
  };
}

export function telegramDeliveryErr(input: OpenClawTelegramDeliveryFailure): OpenClawTelegramDeliveryResult {
  return {
    ok: false,
    deliveryRef: normalizeNonEmpty(input.deliveryRef, "telegramDeliveryResult.deliveryRef"),
    error: createOpenClawTelegramDeliveryError(input.error),
    correlationId: normalizeNonEmpty(input.correlationId, "telegramDeliveryResult.correlationId")
  };
}

export function isOpenClawTelegramDeliveryOk(
  result: OpenClawTelegramDeliveryResult
): result is OpenClawTelegramDeliverySuccess {
  return result.ok === true;
}

export function isOpenClawTelegramDeliveryErr(
  result: OpenClawTelegramDeliveryResult
): result is OpenClawTelegramDeliveryFailure {
  return result.ok === false;
}
