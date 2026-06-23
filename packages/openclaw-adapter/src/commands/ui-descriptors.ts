import {
  createTelegramActionButtonPayload,
  type TelegramActionButtonPayload,
  type TelegramActionButtonStyle,
} from '../contracts/delivery.js';

const TELEGRAM_TEXT_BLOCK_KIND = 'telegram-text-block' as const;
const TELEGRAM_ACTION_BUTTON_DESCRIPTOR_KIND = 'telegram-action-button-descriptor' as const;
const TELEGRAM_BUTTON_GROUP_DESCRIPTOR_KIND = 'telegram-button-group-descriptor' as const;
const TELEGRAM_CARD_DESCRIPTOR_KIND = 'telegram-card-descriptor' as const;

const TELEGRAM_TEXT_BLOCK_TONES = ['plain', 'muted', 'strong', 'code'] as const;
const TELEGRAM_ACTION_BUTTON_STYLES = ['primary', 'secondary', 'danger'] as const;
const TELEGRAM_CARD_INTENTS = [
  'info',
  'success',
  'warning',
  'error',
  'command-help',
  'action-request',
] as const;

const MAX_TELEGRAM_TEXT_BLOCK_LENGTH = 2_000;
const MAX_TELEGRAM_ACTION_BUTTON_LABEL_LENGTH = 80;
const MAX_TELEGRAM_ACTION_BUTTON_ACCESSIBILITY_LABEL_LENGTH = 120;
const MAX_TELEGRAM_CARD_TITLE_LENGTH = 140;
const MAX_TELEGRAM_CARD_TEXT_BLOCKS = 12;
const MAX_TELEGRAM_CARD_BUTTON_GROUPS = 8;
const MAX_TELEGRAM_BUTTONS_PER_GROUP = 8;

const UNSAFE_DESCRIPTOR_FIELD_NAMES = new Set([
  'apikey',
  'approvalpayload',
  'bottoken',
  'callbackquery',
  'credential',
  'execute',
  'handler',
  'password',
  'provider',
  'providerobject',
  'rawcallbackbody',
  'rawopenclawevent',
  'rawproviderobject',
  'rawproviderresponse',
  'rawtelegramupdate',
  'rawtoolpayload',
  'rawupdate',
  'secret',
  'telegramupdate',
  'toolpayload',
]);

export type TelegramTextBlockTone = (typeof TELEGRAM_TEXT_BLOCK_TONES)[number];
export type TelegramCardIntent = (typeof TELEGRAM_CARD_INTENTS)[number];

export interface TelegramTextBlock {
  readonly kind: typeof TELEGRAM_TEXT_BLOCK_KIND;
  readonly text: string;
  readonly tone?: TelegramTextBlockTone;
}

export interface TelegramActionButtonDescriptor {
  readonly kind: typeof TELEGRAM_ACTION_BUTTON_DESCRIPTOR_KIND;
  readonly label: string;
  readonly payload: TelegramActionButtonPayload;
  readonly style?: TelegramActionButtonStyle;
  readonly accessibilityLabel?: string;
}

export interface TelegramButtonGroupDescriptor {
  readonly kind: typeof TELEGRAM_BUTTON_GROUP_DESCRIPTOR_KIND;
  readonly buttons: readonly TelegramActionButtonDescriptor[];
}

export interface TelegramCardDescriptor {
  readonly kind: typeof TELEGRAM_CARD_DESCRIPTOR_KIND;
  readonly intent: TelegramCardIntent;
  readonly title: string;
  readonly body?: readonly TelegramTextBlock[];
  readonly buttonGroups?: readonly TelegramButtonGroupDescriptor[];
}

export interface TelegramTextBlockInput {
  readonly text: string;
  readonly tone?: TelegramTextBlockTone;
}

export interface TelegramActionButtonDescriptorInput {
  readonly label: string;
  readonly payload: string;
  readonly style?: TelegramActionButtonStyle;
  readonly accessibilityLabel?: string;
}

export interface TelegramButtonGroupDescriptorInput {
  readonly buttons: readonly TelegramActionButtonDescriptor[];
}

export interface TelegramCardDescriptorInput {
  readonly intent?: TelegramCardIntent;
  readonly title: string;
  readonly body?: readonly TelegramTextBlock[];
  readonly buttonGroups?: readonly TelegramButtonGroupDescriptor[];
}

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function rejectUnsafeDescriptorFields(input: Record<string, unknown>, label: string): void {
  for (const fieldName of Object.keys(input)) {
    if (UNSAFE_DESCRIPTOR_FIELD_NAMES.has(fieldName.toLowerCase())) {
      throw new TypeError(`${label} must not include raw provider, tool, approval, or handler fields.`);
    }
  }
}

function normalizeBoundedString(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function normalizeTelegramTextBlockTone(tone: unknown): TelegramTextBlockTone {
  if (
    typeof tone !== 'string' ||
    !(TELEGRAM_TEXT_BLOCK_TONES as readonly string[]).includes(tone)
  ) {
    throw new TypeError('Unsupported Telegram text block tone.');
  }

  return tone as TelegramTextBlockTone;
}

function normalizeTelegramActionButtonStyle(style: unknown): TelegramActionButtonStyle {
  if (
    typeof style !== 'string' ||
    !(TELEGRAM_ACTION_BUTTON_STYLES as readonly string[]).includes(style)
  ) {
    throw new TypeError('Unsupported Telegram action button style.');
  }

  return style as TelegramActionButtonStyle;
}

function normalizeTelegramCardIntent(intent: unknown): TelegramCardIntent {
  if (typeof intent !== 'string' || !(TELEGRAM_CARD_INTENTS as readonly string[]).includes(intent)) {
    throw new TypeError('Unsupported Telegram card intent.');
  }

  return intent as TelegramCardIntent;
}

function normalizeTelegramTextBlockDescriptor(input: unknown): TelegramTextBlock {
  assertPlainObject(input, 'Telegram text block descriptor');
  rejectUnsafeDescriptorFields(input, 'Telegram text block descriptor');

  if (input.kind !== TELEGRAM_TEXT_BLOCK_KIND) {
    throw new TypeError('Telegram text block descriptor kind is invalid.');
  }

  return createTelegramTextBlock({
    text: input.text as string,
    ...(input.tone === undefined ? {} : { tone: input.tone as TelegramTextBlockTone }),
  });
}

function normalizeTelegramActionButtonDescriptor(input: unknown): TelegramActionButtonDescriptor {
  assertPlainObject(input, 'Telegram action button descriptor');
  rejectUnsafeDescriptorFields(input, 'Telegram action button descriptor');

  if (input.kind !== TELEGRAM_ACTION_BUTTON_DESCRIPTOR_KIND) {
    throw new TypeError('Telegram action button descriptor kind is invalid.');
  }

  return createTelegramActionButtonDescriptor({
    label: input.label as string,
    payload: input.payload as string,
    ...(input.style === undefined ? {} : { style: input.style as TelegramActionButtonStyle }),
    ...(input.accessibilityLabel === undefined
      ? {}
      : { accessibilityLabel: input.accessibilityLabel as string }),
  });
}

function normalizeTelegramButtonGroupDescriptor(input: unknown): TelegramButtonGroupDescriptor {
  assertPlainObject(input, 'Telegram button group descriptor');
  rejectUnsafeDescriptorFields(input, 'Telegram button group descriptor');

  if (input.kind !== TELEGRAM_BUTTON_GROUP_DESCRIPTOR_KIND) {
    throw new TypeError('Telegram button group descriptor kind is invalid.');
  }

  return createTelegramButtonGroupDescriptor({
    buttons: input.buttons as readonly TelegramActionButtonDescriptor[],
  });
}

export function createTelegramTextBlock(input: TelegramTextBlockInput): TelegramTextBlock {
  assertPlainObject(input, 'Telegram text block input');
  rejectUnsafeDescriptorFields(input, 'Telegram text block input');

  return Object.freeze({
    kind: TELEGRAM_TEXT_BLOCK_KIND,
    text: normalizeBoundedString(input.text, 'Telegram text block text', MAX_TELEGRAM_TEXT_BLOCK_LENGTH),
    ...(input.tone === undefined ? {} : { tone: normalizeTelegramTextBlockTone(input.tone) }),
  });
}

export function createTelegramActionButtonDescriptor(
  input: TelegramActionButtonDescriptorInput,
): TelegramActionButtonDescriptor {
  assertPlainObject(input, 'Telegram action button descriptor input');
  rejectUnsafeDescriptorFields(input, 'Telegram action button descriptor input');

  return Object.freeze({
    kind: TELEGRAM_ACTION_BUTTON_DESCRIPTOR_KIND,
    label: normalizeBoundedString(
      input.label,
      'Telegram action button descriptor label',
      MAX_TELEGRAM_ACTION_BUTTON_LABEL_LENGTH,
    ),
    payload: createTelegramActionButtonPayload(input.payload),
    ...(input.style === undefined ? {} : { style: normalizeTelegramActionButtonStyle(input.style) }),
    ...(input.accessibilityLabel === undefined
      ? {}
      : {
          accessibilityLabel: normalizeBoundedString(
            input.accessibilityLabel,
            'Telegram action button descriptor accessibility label',
            MAX_TELEGRAM_ACTION_BUTTON_ACCESSIBILITY_LABEL_LENGTH,
          ),
        }),
  });
}

export function createTelegramButtonGroupDescriptor(
  input: TelegramButtonGroupDescriptorInput,
): TelegramButtonGroupDescriptor {
  assertPlainObject(input, 'Telegram button group descriptor input');
  rejectUnsafeDescriptorFields(input, 'Telegram button group descriptor input');

  if (!Array.isArray(input.buttons)) {
    throw new TypeError('Telegram button group descriptor buttons must be an array.');
  }

  if (input.buttons.length === 0 || input.buttons.length > MAX_TELEGRAM_BUTTONS_PER_GROUP) {
    throw new TypeError('Telegram button group descriptor buttons must be non-empty and bounded.');
  }

  const buttons = input.buttons.map((button) => normalizeTelegramActionButtonDescriptor(button));

  return Object.freeze({
    kind: TELEGRAM_BUTTON_GROUP_DESCRIPTOR_KIND,
    buttons: Object.freeze(buttons),
  });
}

export function createTelegramCardDescriptor(input: TelegramCardDescriptorInput): TelegramCardDescriptor {
  assertPlainObject(input, 'Telegram card descriptor input');
  rejectUnsafeDescriptorFields(input, 'Telegram card descriptor input');

  const body = input.body === undefined ? undefined : [...input.body];
  const buttonGroups = input.buttonGroups === undefined ? undefined : [...input.buttonGroups];

  if (body !== undefined && body.length > MAX_TELEGRAM_CARD_TEXT_BLOCKS) {
    throw new TypeError('Telegram card descriptor body must be bounded.');
  }

  if (buttonGroups !== undefined && buttonGroups.length > MAX_TELEGRAM_CARD_BUTTON_GROUPS) {
    throw new TypeError('Telegram card descriptor button groups must be bounded.');
  }

  const normalizedBody = body?.map((block) => normalizeTelegramTextBlockDescriptor(block));
  const normalizedButtonGroups = buttonGroups?.map((group) =>
    normalizeTelegramButtonGroupDescriptor(group),
  );

  return Object.freeze({
    kind: TELEGRAM_CARD_DESCRIPTOR_KIND,
    intent: input.intent === undefined ? 'info' : normalizeTelegramCardIntent(input.intent),
    title: normalizeBoundedString(input.title, 'Telegram card descriptor title', MAX_TELEGRAM_CARD_TITLE_LENGTH),
    ...(normalizedBody === undefined ? {} : { body: Object.freeze(normalizedBody) }),
    ...(normalizedButtonGroups === undefined
      ? {}
      : { buttonGroups: Object.freeze(normalizedButtonGroups) }),
  });
}

export function isTelegramCardDescriptor(candidate: unknown): candidate is TelegramCardDescriptor {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return false;
  }

  if ((candidate as Record<string, unknown>).kind !== TELEGRAM_CARD_DESCRIPTOR_KIND) {
    return false;
  }

  try {
    createTelegramCardDescriptor(candidate as TelegramCardDescriptorInput);
    return true;
  } catch {
    return false;
  }
}
