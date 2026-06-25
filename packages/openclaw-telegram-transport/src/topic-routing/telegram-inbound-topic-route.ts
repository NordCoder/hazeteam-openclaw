import { projectSafeTelegramInboundChannelEvent } from '../channel-events/safe-channel-event.js';

import type {
  SafeTelegramInboundChannelEvent,
  TelegramInboundCallbackPathDescriptor,
  TelegramInboundCommandDescriptor,
  TelegramInboundCommandIntentDescriptor,
  TelegramInboundIssue,
  TelegramInboundRoutingAuthority,
  TelegramInboundSafeCommandSummary,
  TelegramInboundSafeHelpDescriptor,
  TelegramInboundTextIntent,
  TelegramInboundTopicBindingDescriptor,
  TelegramInboundTopicBindingTarget,
  TelegramInboundTopicRouteResult,
} from '../contracts/inbound-topic-route.js';

export interface TelegramInboundTopicRouteInput {
  readonly providerUpdate: unknown;
  readonly topicBindings?: readonly TelegramInboundTopicBindingDescriptor[];
  readonly commandDescriptors?: readonly TelegramInboundCommandDescriptor[];
  readonly seenIdempotencyRefs?: readonly string[];
}

interface CommandData {
  readonly commandName: string;
  readonly argumentText?: string;
}

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:_-]{0,255}$/u;
const SAFE_COMMAND_PATTERN = /^[a-z][a-z0-9_]{0,31}$/u;
const MAX_ARGUMENT_LENGTH = 256;

const UNSAFE_VALUE_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._:-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\b(?:token|secret|credential|password|apikey|api-key)\b/iu,
  /provider\s*object/iu,
  /\b(?:stack|trace)\b/iu,
] as const);

export const TELEGRAM_INBOUND_DEFAULT_COMMANDS = Object.freeze([
  {
    descriptorKind: 'w17c-telegram-command-descriptor',
    commandRef: 'telegram-command:help',
    commandName: 'help',
    namespace: 'telegram',
    intentKind: 'telegram.help',
    requiresBinding: false,
    enabled: true,
  },
  {
    descriptorKind: 'w17c-telegram-command-descriptor',
    commandRef: 'telegram-command:actions',
    commandName: 'actions',
    namespace: 'agent',
    intentKind: 'agent.actions',
    requiresBinding: true,
    enabled: true,
  },
  {
    descriptorKind: 'w17c-telegram-command-descriptor',
    commandRef: 'telegram-command:status',
    commandName: 'status',
    namespace: 'workspace',
    intentKind: 'workspace.status',
    requiresBinding: true,
    enabled: true,
  },
] as const satisfies readonly TelegramInboundCommandDescriptor[]);

function containsUnsafeText(value: string): boolean {
  return UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function isSafeRef(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 && SAFE_REF_PATTERN.test(value) && !containsUnsafeText(value);
}

function isSafeCommandName(value: unknown): value is string {
  return typeof value === 'string' && SAFE_COMMAND_PATTERN.test(value) && !containsUnsafeText(value);
}

function issue(code: TelegramInboundIssue['code'], severity: TelegramInboundIssue['severity'], summary: string): TelegramInboundIssue {
  return Object.freeze({ code, severity, componentRef: 'w17c-telegram-topic-routing', summary } satisfies TelegramInboundIssue);
}

function hash(value: string): string {
  let hashValue = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hashValue ^= value.charCodeAt(index);
    hashValue = Math.imul(hashValue, 16777619) >>> 0;
  }
  return hashValue.toString(16).padStart(8, '0');
}

function authorityFor(event: SafeTelegramInboundChannelEvent): TelegramInboundRoutingAuthority {
  return Object.freeze({
    descriptorKind: 'w17c-telegram-routing-authority',
    channelRef: event.channelRef,
    chatRef: event.chatRef,
    threadRef: event.threadRef,
    authority: 'channelRef+chatRef+threadRef',
  } satisfies TelegramInboundRoutingAuthority);
}

function safeResult(input: {
  readonly ok: boolean;
  readonly status: TelegramInboundTopicRouteResult['status'];
  readonly reasonCode: TelegramInboundTopicRouteResult['reasonCode'];
  readonly decisionKind: TelegramInboundTopicRouteResult['decisionKind'];
  readonly channelEvent?: SafeTelegramInboundChannelEvent;
  readonly routingAuthority?: TelegramInboundRoutingAuthority;
  readonly command?: TelegramInboundSafeCommandSummary;
  readonly callbackPath?: TelegramInboundCallbackPathDescriptor;
  readonly intent?: TelegramInboundCommandIntentDescriptor;
  readonly help?: TelegramInboundSafeHelpDescriptor;
  readonly issues: readonly TelegramInboundIssue[];
}): TelegramInboundTopicRouteResult {
  const base = {
    descriptorKind: 'w17c-telegram-inbound-topic-route-result',
    descriptorVersion: 'w17c',
    ok: input.ok,
    status: input.status,
    reasonCode: input.reasonCode,
    decisionKind: input.decisionKind,
    issues: Object.freeze([...input.issues]),
    effects: 'none',
    willCallRemote: false,
    commandExecuted: false,
    readinessClaim: 'local-inbound-topic-route-evidence-only',
    productionReady: false,
    jsonSerializable: true,
  } satisfies Omit<TelegramInboundTopicRouteResult, 'channelEvent' | 'routingAuthority' | 'command' | 'callbackPath' | 'intent' | 'help'>;

  return Object.freeze({
    ...base,
    ...(input.channelEvent === undefined ? {} : { channelEvent: input.channelEvent }),
    ...(input.routingAuthority === undefined ? {} : { routingAuthority: input.routingAuthority }),
    ...(input.command === undefined ? {} : { command: input.command }),
    ...(input.callbackPath === undefined ? {} : { callbackPath: input.callbackPath }),
    ...(input.intent === undefined ? {} : { intent: input.intent }),
    ...(input.help === undefined ? {} : { help: input.help }),
  } satisfies TelegramInboundTopicRouteResult);
}

function commandSummary(descriptor: TelegramInboundCommandDescriptor, command: CommandData): TelegramInboundSafeCommandSummary {
  const base = {
    descriptorKind: 'w17c-telegram-safe-command-summary',
    commandRef: descriptor.commandRef,
    commandName: command.commandName,
  } satisfies Omit<TelegramInboundSafeCommandSummary, 'argumentText'>;
  return command.argumentText === undefined ? Object.freeze(base) : Object.freeze({ ...base, argumentText: command.argumentText } satisfies TelegramInboundSafeCommandSummary);
}

function safeTarget(target: TelegramInboundTopicBindingTarget): boolean {
  return isSafeRef(target.workspaceRef) && isSafeRef(target.agentRef) && isSafeRef(target.hostSessionRef) && (target.uiDescriptorRef === undefined || isSafeRef(target.uiDescriptorRef)) && (target.domainPackageRef === undefined || isSafeRef(target.domainPackageRef));
}

function bindingMatches(binding: TelegramInboundTopicBindingDescriptor, authority: TelegramInboundRoutingAuthority): boolean {
  return binding.descriptorKind === 'w17c-telegram-topic-binding' && isSafeRef(binding.bindingRef) && safeTarget(binding.target) && binding.key.channelRef === authority.channelRef && binding.key.chatRef === authority.chatRef && binding.key.threadRef === authority.threadRef;
}

function descriptorFor(descriptors: readonly TelegramInboundCommandDescriptor[], name: string): TelegramInboundCommandDescriptor | undefined {
  return descriptors.find((descriptor) => descriptor.descriptorKind === 'w17c-telegram-command-descriptor' && descriptor.enabled && descriptor.commandName === name && isSafeCommandName(descriptor.commandName) && isSafeRef(descriptor.commandRef) && !containsUnsafeText(descriptor.intentKind));
}

function safeHelp(
  kind: TelegramInboundSafeHelpDescriptor['helpKind'],
  descriptors: readonly TelegramInboundCommandDescriptor[],
  routingAuthority: TelegramInboundRoutingAuthority,
): TelegramInboundSafeHelpDescriptor {
  return Object.freeze({
    descriptorKind: 'w17c-telegram-safe-help',
    helpKind: kind,
    safeMessage: kind === 'command-help' ? 'Safe command help is available' : 'Inbound command was not routed',
    availableCommands: Object.freeze(descriptors.filter((descriptor) => descriptor.enabled && isSafeCommandName(descriptor.commandName)).map((descriptor) => descriptor.commandName).sort()),
    routingAuthority,
  } satisfies TelegramInboundSafeHelpDescriptor);
}

function commandFromTextIntent(textIntent: TelegramInboundTextIntent | undefined): { readonly ok: boolean; readonly command?: CommandData; readonly malformed: boolean } {
  if (textIntent === undefined) {
    return Object.freeze({ ok: true, malformed: false });
  }

  if (textIntent.malformedCommand) {
    return Object.freeze({ ok: false, malformed: true });
  }

  if (textIntent.commandName === undefined) {
    return Object.freeze({ ok: true, malformed: false });
  }

  const normalizedName = textIntent.commandName.toLowerCase();
  if (!isSafeCommandName(normalizedName)) {
    return Object.freeze({ ok: false, malformed: true });
  }

  if (textIntent.argumentText === undefined) {
    return Object.freeze({ ok: true, malformed: false, command: Object.freeze({ commandName: normalizedName } satisfies CommandData) });
  }

  const argumentText = textIntent.argumentText.replace(/\s+/gu, ' ').trim();
  if (argumentText.length === 0) {
    return Object.freeze({ ok: true, malformed: false, command: Object.freeze({ commandName: normalizedName } satisfies CommandData) });
  }
  if (containsUnsafeText(argumentText)) {
    return Object.freeze({ ok: false, malformed: true });
  }
  return Object.freeze({ ok: true, malformed: false, command: Object.freeze({ commandName: normalizedName, argumentText: argumentText.slice(0, MAX_ARGUMENT_LENGTH) } satisfies CommandData) });
}

function createIntent(
  descriptor: TelegramInboundCommandDescriptor,
  binding: TelegramInboundTopicBindingDescriptor,
  routingAuthority: TelegramInboundRoutingAuthority,
  command: CommandData,
): TelegramInboundCommandIntentDescriptor {
  const base = {
    descriptorKind: 'w17c-telegram-command-intent',
    intentRef: 'telegram-command-intent:' + hash([descriptor.commandRef, binding.bindingRef, routingAuthority.channelRef, routingAuthority.chatRef, routingAuthority.threadRef].join('|')),
    commandRef: descriptor.commandRef,
    commandName: descriptor.commandName,
    namespace: descriptor.namespace,
    intentKind: descriptor.intentKind,
    bindingRef: binding.bindingRef,
    routingAuthority,
    target: Object.freeze({ ...binding.target } satisfies TelegramInboundTopicBindingTarget),
    effects: 'none',
    willCallRemote: false,
    commandExecuted: false,
  } satisfies Omit<TelegramInboundCommandIntentDescriptor, 'argumentText'>;
  return command.argumentText === undefined ? Object.freeze(base) : Object.freeze({ ...base, argumentText: command.argumentText } satisfies TelegramInboundCommandIntentDescriptor);
}

function createCallbackPath(event: SafeTelegramInboundChannelEvent, routingAuthority: TelegramInboundRoutingAuthority): TelegramInboundCallbackPathDescriptor | undefined {
  if (event.callbackIntent === undefined) {
    return undefined;
  }

  return Object.freeze({
    descriptorKind: 'w17c-telegram-callback-path',
    callbackRef: event.callbackIntent.callbackRef,
    callbackTokenRef: event.callbackIntent.callbackTokenRef,
    routingAuthority,
    permissionChecked: false,
    tokenConsumed: false,
    effects: 'none',
    willCallRemote: false,
  } satisfies TelegramInboundCallbackPathDescriptor);
}

export function prepareTelegramInboundTopicRoute(input: TelegramInboundTopicRouteInput): TelegramInboundTopicRouteResult {
  const projection = projectSafeTelegramInboundChannelEvent(input.providerUpdate);
  const issues: TelegramInboundIssue[] = [...projection.issues];

  if (!projection.ok || projection.event === undefined) {
    return safeResult({ ok: false, status: 'rejected', reasonCode: projection.reasonCode, decisionKind: 'reject-safely', issues });
  }

  const event = projection.event;
  const routingAuthority = authorityFor(event);
  const descriptors = input.commandDescriptors ?? TELEGRAM_INBOUND_DEFAULT_COMMANDS;

  if ((input.seenIdempotencyRefs ?? []).includes(event.idempotencyRef)) {
    issues.push(issue('already-processed', 'info', 'Duplicate inbound event was ignored without rerouting'));
    return safeResult({ ok: false, status: 'already-processed', reasonCode: 'already-processed', decisionKind: 'deduplicate-safely', channelEvent: event, routingAuthority, issues });
  }

  if (event.eventKind === 'callback') {
    const callbackPath = createCallbackPath(event, routingAuthority);
    if (callbackPath === undefined) {
      issues.push(issue('invalid-provider-input', 'blocked', 'Callback event was missing a safe callback descriptor'));
      return safeResult({ ok: false, status: 'rejected', reasonCode: 'invalid-provider-input', decisionKind: 'reject-safely', channelEvent: event, routingAuthority, issues });
    }
    issues.push(issue('callback-forwarded', 'info', 'Callback event was forwarded to the callback permission path without token consumption'));
    return safeResult({ ok: true, status: 'callback-forwarded', reasonCode: 'callback-forwarded', decisionKind: 'forward-callback-path', channelEvent: event, routingAuthority, callbackPath, issues });
  }

  if (event.eventKind !== 'message') {
    issues.push(issue('unsupported-event-kind', 'info', 'Event kind is not command-routable'));
    return safeResult({ ok: false, status: 'ignored', reasonCode: 'unsupported-event-kind', decisionKind: 'ignore-safely', channelEvent: event, routingAuthority, help: safeHelp('unsupported-event-kind', descriptors, routingAuthority), issues });
  }

  const command = commandFromTextIntent(event.textIntent);
  if (!command.ok || command.malformed) {
    issues.push(issue('malformed-command', 'blocked', 'Malformed inbound command was rejected safely'));
    return safeResult({ ok: false, status: 'rejected', reasonCode: 'malformed-command', decisionKind: 'reject-safely', channelEvent: event, routingAuthority, help: safeHelp('malformed-command', descriptors, routingAuthority), issues });
  }

  if (command.command === undefined) {
    issues.push(issue('missing-command', 'info', 'No routable command was present in the safe channel event'));
    return safeResult({ ok: false, status: 'ignored', reasonCode: 'missing-command', decisionKind: 'ignore-safely', channelEvent: event, routingAuthority, help: safeHelp('missing-command', descriptors, routingAuthority), issues });
  }

  const descriptor = descriptorFor(descriptors, command.command.commandName);
  if (descriptor === undefined) {
    issues.push(issue('unknown-command', 'info', 'Unknown command resolved to safe help'));
    const fallbackDescriptor = Object.freeze({ ...TELEGRAM_INBOUND_DEFAULT_COMMANDS[0] } satisfies TelegramInboundCommandDescriptor);
    return safeResult({ ok: false, status: 'safe-help', reasonCode: 'unknown-command', decisionKind: 'render-safe-help', channelEvent: event, routingAuthority, command: commandSummary(fallbackDescriptor, command.command), help: safeHelp('unknown-command', descriptors, routingAuthority), issues });
  }

  const summary = commandSummary(descriptor, command.command);
  if (!descriptor.requiresBinding || descriptor.intentKind === 'telegram.help') {
    issues.push(issue('safe-help', 'info', 'Safe command help was prepared'));
    return safeResult({ ok: false, status: 'safe-help', reasonCode: 'safe-help', decisionKind: 'render-safe-help', channelEvent: event, routingAuthority, command: summary, help: safeHelp('command-help', descriptors, routingAuthority), issues });
  }

  const binding = (input.topicBindings ?? []).find((candidate) => bindingMatches(candidate, routingAuthority));
  if (binding === undefined) {
    issues.push(issue('unbound-topic', 'info', 'Routing authority has no topic binding'));
    return safeResult({ ok: false, status: 'safe-help', reasonCode: 'unbound-topic', decisionKind: 'render-safe-help', channelEvent: event, routingAuthority, command: summary, help: safeHelp('unbound-topic', descriptors, routingAuthority), issues });
  }

  if (binding.status !== 'active') {
    issues.push(issue('disabled-binding', 'info', 'Topic binding is not active'));
    return safeResult({ ok: false, status: 'ignored', reasonCode: 'disabled-binding', decisionKind: 'ignore-safely', channelEvent: event, routingAuthority, command: summary, help: safeHelp('disabled-binding', descriptors, routingAuthority), issues });
  }

  const intent = createIntent(descriptor, binding, routingAuthority, command.command);
  issues.push(issue('routed', 'info', 'Inbound command route was prepared without executing command behavior'));
  return safeResult({ ok: true, status: 'routed', reasonCode: 'routed', decisionKind: 'prepare-command-intent', channelEvent: event, routingAuthority, command: summary, intent, issues });
}

export function isSafeTelegramInboundTopicRouteJson(value: unknown): boolean {
  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === 'string' && !UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(encoded));
  } catch {
    return false;
  }
}
