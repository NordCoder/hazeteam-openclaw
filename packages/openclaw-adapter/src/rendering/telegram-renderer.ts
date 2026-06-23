import type { AdapterOperationContext } from '../contracts/context.js';
import {
  createTelegramActionButton,
  type TelegramActionButton,
  type TelegramActionButtonGroup,
  type TelegramDeliveryChatId,
  type TelegramDeliveryChannelId,
  type TelegramDeliveryContentFormat,
  type TelegramDeliveryMessageThreadId,
  type TelegramDeliveryRequest,
  type TelegramDeliveryTarget,
  type TelegramDeliveryTextContent,
} from '../contracts/delivery.js';
import {
  parseOpenClawAdapterRef,
  type AdapterCorrelationRef,
  type AdapterOperationRef,
  type AgentRef,
  type WorkspaceRef,
} from '../contracts/refs.js';
import {
  createTelegramActionButtonDescriptor,
  createTelegramButtonGroupDescriptor,
  createTelegramCardDescriptor,
  createTelegramTextBlock,
  type TelegramActionButtonDescriptor,
  type TelegramButtonGroupDescriptor,
  type TelegramCardDescriptor,
  type TelegramCardIntent,
  type TelegramTextBlock,
  type TelegramTextBlockTone,
} from '../commands/ui-descriptors.js';

const TELEGRAM_RENDER_FRAGMENT_KIND = 'telegram-render-fragment' as const;
const TELEGRAM_RENDER_FORMAT: TelegramDeliveryContentFormat = 'plain';
const MAX_RENDERED_TEXT_LENGTH = 2_000;
const MAX_PRESENTATION_BODY_BLOCKS = 12;
const MAX_PRESENTATION_BUTTON_GROUPS = 8;
const TELEGRAM_REF_VALUE_PATTERN = /^[A-Za-z0-9._:~-]+$/u;

const UNSAFE_RENDER_FIELD_NAMES = new Set([
  'approvalpayload',
  'callbackquery',
  'deliveryattempt',
  'externalmessageref',
  'filesystempath',
  'handler',
  'openclawclient',
  'provider',
  'providerack',
  'providerobject',
  'rawcallbackbody',
  'rawopenclawevent',
  'rawproviderobject',
  'rawproviderresponse',
  'rawtelegramupdate',
  'rawtoolpayload',
  'rawupdate',
  'sdkclient',
  'stack',
  'storageroot',
  'telegramupdate',
  'toolpayload',
]);
const UNSAFE_RENDER_FIELD_NAME_PARTS = [
  ['api', 'key'],
  ['auth', 'orization'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['pass', 'wd'],
  ['sec', 'ret'],
] as const;
const SENSITIVE_RENDER_TEXT_TERM_PARTS = [
  ['api', 'key'],
  ['auth', 'orization'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['pass', 'wd'],
  ['sec', 'ret'],
] as const;
const SENSITIVE_RENDER_TEXT_PATTERNS = SENSITIVE_RENDER_TEXT_TERM_PARTS.map(
  (parts) => new RegExp(`\\b${parts.join('')}\\b\\s*[:=]\\s*\\S+`, 'giu'),
);

export interface TelegramRenderFragment {
  readonly kind: typeof TELEGRAM_RENDER_FRAGMENT_KIND;
  readonly content: TelegramDeliveryTextContent;
}

export interface SafePresentationTextBlockInput {
  readonly text: string;
  readonly tone?: TelegramTextBlockTone;
}

export interface SafePresentationActionButtonInput {
  readonly label: string;
  readonly payload: string;
  readonly style?: TelegramActionButtonDescriptor['style'];
}

export interface SafePresentationButtonGroupInput {
  readonly buttons: readonly SafePresentationActionButtonInput[];
}

export interface SafePresentationLikeInput {
  readonly title: string;
  readonly intent?: TelegramCardIntent;
  readonly body?: readonly SafePresentationTextBlockInput[];
  readonly buttonGroups?: readonly SafePresentationButtonGroupInput[];
}

export type TelegramRenderableInput =
  | TelegramRenderFragment
  | TelegramCardDescriptor
  | SafePresentationLikeInput;

export interface TelegramDeliveryRenderRequestInput {
  readonly deliveryRef: AdapterOperationRef;
  readonly target: TelegramDeliveryTarget;
  readonly source: TelegramRenderableInput;
  readonly context?: AdapterOperationContext;
  readonly correlationRef?: AdapterCorrelationRef;
}

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isUnsafeRenderFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_RENDER_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_RENDER_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function rejectUnsafeRenderFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeRenderFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeRenderFieldName(fieldName)) {
      throw new TypeError(
        `${label} must not include raw provider, SDK, storage, delivery attempt, or sensitive fields.`,
      );
    }
    rejectUnsafeRenderFields(value, label, seen);
  }
}

function redactSensitiveRenderedText(text: string): string {
  return SENSITIVE_RENDER_TEXT_PATTERNS.reduce(
    (currentText, pattern) => currentText.replace(pattern, '[redacted]'),
    text,
  );
}

function normalizeBoundedRenderedText(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = redactSensitiveRenderedText(
    input
      .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim(),
  );

  if (normalized.length === 0 || normalized.length > MAX_RENDERED_TEXT_LENGTH) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function normalizeRenderedTextOutput(text: string): string {
  const normalized = redactSensitiveRenderedText(text);

  if (normalized.length === 0 || normalized.length > MAX_RENDERED_TEXT_LENGTH) {
    throw new TypeError('Rendered Telegram text must be non-empty and bounded.');
  }

  return normalized;
}

function renderTextBlock(block: TelegramTextBlock): string {
  const normalizedText = normalizeBoundedRenderedText(block.text, 'Telegram text block text');

  switch (block.tone) {
    case undefined:
    case 'plain':
      return normalizedText;
    case 'muted':
      return `(${normalizedText})`;
    case 'strong':
      return normalizedText;
    case 'code':
      return normalizedText
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
    default: {
      const unreachable: never = block.tone;
      return unreachable;
    }
  }
}

function normalizeTelegramActionButtonDescriptorToDeliveryButton(
  button: TelegramActionButtonDescriptor,
): TelegramActionButton {
  return createTelegramActionButton({
    label: button.label,
    payload: button.payload,
    ...(button.style === undefined ? {} : { style: button.style }),
  });
}

function normalizeTelegramButtonGroupDescriptorToDeliveryGroup(
  group: TelegramButtonGroupDescriptor,
): TelegramActionButtonGroup {
  return Object.freeze({
    buttons: Object.freeze(group.buttons.map(normalizeTelegramActionButtonDescriptorToDeliveryButton)),
  });
}

function normalizeTelegramDeliveryContent(input: TelegramDeliveryTextContent): TelegramDeliveryTextContent {
  assertPlainObject(input, 'Telegram delivery content');
  rejectUnsafeRenderFields(input, 'Telegram delivery content');

  if (input.format !== TELEGRAM_RENDER_FORMAT) {
    throw new TypeError('Telegram renderer currently emits and accepts plain delivery content only.');
  }

  const buttonGroups = input.buttonGroups?.map((group) => {
    assertPlainObject(group, 'Telegram delivery button group');

    if (!Array.isArray(group.buttons)) {
      throw new TypeError('Telegram delivery button group buttons must be an array.');
    }

    return Object.freeze({
      buttons: Object.freeze(
        group.buttons.map((button) =>
          createTelegramActionButton({
            label: button.label,
            payload: button.payload,
            ...(button.style === undefined ? {} : { style: button.style }),
          }),
        ),
      ),
    });
  });

  return Object.freeze({
    format: TELEGRAM_RENDER_FORMAT,
    text: normalizeRenderedTextOutput(input.text),
    ...(buttonGroups === undefined ? {} : { buttonGroups: Object.freeze(buttonGroups) }),
  });
}

function normalizeOperationRef(input: AdapterOperationRef): AdapterOperationRef {
  const parsed = parseOpenClawAdapterRef(input);

  if (parsed?.kind !== 'operation') {
    throw new TypeError('Telegram render deliveryRef must be a safe operation ref.');
  }

  return parsed.ref as AdapterOperationRef;
}

function normalizeCorrelationRef(input: AdapterCorrelationRef): AdapterCorrelationRef {
  const parsed = parseOpenClawAdapterRef(input);

  if (parsed?.kind !== 'correlation') {
    throw new TypeError('Telegram render correlationRef must be a safe correlation ref.');
  }

  return parsed.ref as AdapterCorrelationRef;
}

function normalizePrefixedRef<T extends string>(input: unknown, prefix: string, label: string): T {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 256 ||
    !normalized.startsWith(prefix) ||
    !TELEGRAM_REF_VALUE_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a safe prefixed ref.`);
  }

  return normalized as T;
}

function normalizeDeliveryTarget(target: TelegramDeliveryTarget): TelegramDeliveryTarget {
  assertPlainObject(target, 'Telegram render delivery target');
  rejectUnsafeRenderFields(target, 'Telegram render delivery target');

  return Object.freeze({
    channelId: normalizePrefixedRef<TelegramDeliveryChannelId>(
      target.channelId,
      'telegram-channel:',
      'Telegram render delivery target channelId',
    ),
    chatId: normalizePrefixedRef<TelegramDeliveryChatId>(
      target.chatId,
      'telegram-chat:',
      'Telegram render delivery target chatId',
    ),
    messageThreadId: normalizePrefixedRef<TelegramDeliveryMessageThreadId>(
      target.messageThreadId,
      'telegram-thread:',
      'Telegram render delivery target messageThreadId',
    ),
    ...(target.workspaceRef === undefined
      ? {}
      : {
          workspaceRef: normalizePrefixedRef<WorkspaceRef>(
            target.workspaceRef,
            'workspace:',
            'Telegram render delivery target workspaceRef',
          ),
        }),
    ...(target.agentRef === undefined
      ? {}
      : {
          agentRef: normalizePrefixedRef<AgentRef>(
            target.agentRef,
            'agent:',
            'Telegram render delivery target agentRef',
          ),
        }),
  });
}

function isTelegramRenderFragmentLike(candidate: unknown): candidate is TelegramRenderFragment {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    !Array.isArray(candidate) &&
    (candidate as Record<string, unknown>).kind === TELEGRAM_RENDER_FRAGMENT_KIND
  );
}

function isTelegramCardDescriptorLike(candidate: unknown): candidate is TelegramCardDescriptor {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    !Array.isArray(candidate) &&
    (candidate as Record<string, unknown>).kind === 'telegram-card-descriptor'
  );
}

export function createTelegramRenderFragment(
  content: TelegramDeliveryTextContent,
): TelegramRenderFragment {
  return Object.freeze({
    kind: TELEGRAM_RENDER_FRAGMENT_KIND,
    content: normalizeTelegramDeliveryContent(content),
  });
}

export function isTelegramRenderFragment(candidate: unknown): candidate is TelegramRenderFragment {
  if (!isTelegramRenderFragmentLike(candidate)) {
    return false;
  }

  try {
    createTelegramRenderFragment(candidate.content);
    return true;
  } catch {
    return false;
  }
}

export function renderTelegramCardDescriptor(card: TelegramCardDescriptor): TelegramRenderFragment {
  rejectUnsafeRenderFields(card, 'Telegram card render input');

  const safeCard = createTelegramCardDescriptor(card);
  const body = safeCard.body?.map(renderTextBlock) ?? [];
  const text = normalizeRenderedTextOutput([safeCard.title, ...body].join('\n\n'));
  const buttonGroups = safeCard.buttonGroups?.map(normalizeTelegramButtonGroupDescriptorToDeliveryGroup);

  return createTelegramRenderFragment({
    format: TELEGRAM_RENDER_FORMAT,
    text,
    ...(buttonGroups === undefined ? {} : { buttonGroups }),
  });
}

export function renderSafePresentationLike(input: SafePresentationLikeInput): TelegramRenderFragment {
  assertPlainObject(input, 'Safe presentation render input');
  rejectUnsafeRenderFields(input, 'Safe presentation render input');

  const body = input.body === undefined ? undefined : [...input.body];
  const buttonGroups = input.buttonGroups === undefined ? undefined : [...input.buttonGroups];

  if (body !== undefined && body.length > MAX_PRESENTATION_BODY_BLOCKS) {
    throw new TypeError('Safe presentation body must be bounded.');
  }

  if (buttonGroups !== undefined && buttonGroups.length > MAX_PRESENTATION_BUTTON_GROUPS) {
    throw new TypeError('Safe presentation button groups must be bounded.');
  }

  const card = createTelegramCardDescriptor({
    title: input.title,
    ...(input.intent === undefined ? {} : { intent: input.intent }),
    ...(body === undefined
      ? {}
      : {
          body: body.map((block) =>
            createTelegramTextBlock({
              text: block.text,
              ...(block.tone === undefined ? {} : { tone: block.tone }),
            }),
          ),
        }),
    ...(buttonGroups === undefined
      ? {}
      : {
          buttonGroups: buttonGroups.map((group) =>
            createTelegramButtonGroupDescriptor({
              buttons: group.buttons.map((button) =>
                createTelegramActionButtonDescriptor({
                  label: button.label,
                  payload: button.payload,
                  ...(button.style === undefined ? {} : { style: button.style }),
                }),
              ),
            }),
          ),
        }),
  });

  return renderTelegramCardDescriptor(card);
}

export function renderTelegramInput(input: TelegramRenderableInput): TelegramRenderFragment {
  rejectUnsafeRenderFields(input, 'Telegram render input');

  if (isTelegramRenderFragmentLike(input)) {
    return createTelegramRenderFragment(input.content);
  }

  if (isTelegramCardDescriptorLike(input)) {
    return renderTelegramCardDescriptor(input);
  }

  return renderSafePresentationLike(input);
}

export function createTelegramRenderDeliveryRequest(
  input: TelegramDeliveryRenderRequestInput,
): TelegramDeliveryRequest {
  assertPlainObject(input, 'Telegram render delivery request input');
  rejectUnsafeRenderFields(input, 'Telegram render delivery request input');

  const fragment = renderTelegramInput(input.source);

  return Object.freeze({
    deliveryRef: normalizeOperationRef(input.deliveryRef),
    target: normalizeDeliveryTarget(input.target),
    content: fragment.content,
    ...(input.context === undefined ? {} : { context: input.context }),
    ...(input.correlationRef === undefined
      ? {}
      : { correlationRef: normalizeCorrelationRef(input.correlationRef) }),
  });
}
