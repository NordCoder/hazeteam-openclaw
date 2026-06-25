import type { SafeChannelEventDto } from './channel-event-source.js';

export const TOPIC_COMMAND_ROUTER_REASON_CODES = Object.freeze([
  'routed',
  'ignored',
  'unbound-topic',
  'unknown-command',
  'disabled-binding',
  'unsupported-event-kind',
  'missing-command',
  'invalid-safe-event',
  'safe-help',
] as const);

export type TopicCommandRouterReasonCode = (typeof TOPIC_COMMAND_ROUTER_REASON_CODES)[number];
export type TopicCommandRouterStatus = 'routed' | 'ignored' | 'safe-help';
export type TopicCommandRouterDecisionKind = 'route-to-command-intent' | 'render-safe-help' | 'ignore-safely';
export type TopicCommandBindingStatus = 'active' | 'disabled' | 'archived' | 'migrating' | 'conflict';
export type TopicCommandNamespace = 'telegram' | 'workspace' | 'agent' | 'core' | 'admin';

export interface TopicCommandRoutingAuthority {
  readonly descriptorKind: 'topic-command-routing-authority';
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef: string;
  readonly authority: 'channelRef+chatRef+threadRef';
}

export interface TopicCommandBindingKey {
  readonly channelRef: string;
  readonly chatRef: string;
  readonly threadRef: string;
}

export interface TopicCommandBindingTarget {
  readonly workspaceRef: string;
  readonly agentRef: string;
  readonly hostSessionRef: string;
  readonly uiDescriptorRef?: string;
  readonly domainPackageRef?: string;
}

export interface TopicCommandBindingDisplay {
  readonly displayTitle?: string;
  readonly agentDisplayName?: string;
  readonly workspaceDisplayName?: string;
  readonly description?: string;
  readonly routingAuthority: false;
}

export interface TopicCommandBindingDescriptor {
  readonly descriptorKind: 'topic-command-topic-binding';
  readonly bindingRef: string;
  readonly key: TopicCommandBindingKey;
  readonly target: TopicCommandBindingTarget;
  readonly status: TopicCommandBindingStatus;
  readonly display?: TopicCommandBindingDisplay;
}

export interface TopicCommandDescriptor {
  readonly descriptorKind: 'topic-command-descriptor';
  readonly commandRef: string;
  readonly commandName: string;
  readonly namespace: TopicCommandNamespace;
  readonly intentKind: string;
  readonly requiresBinding: boolean;
  readonly enabled: boolean;
}

export interface TopicCommandProjectionInput {
  readonly descriptorKind?: string;
  readonly commandRef?: unknown;
  readonly commandName?: unknown;
  readonly argumentText?: unknown;
  readonly routingAuthority?: false;
}

export interface TopicCommandSafeEventInput {
  readonly descriptorKind?: string;
  readonly descriptorVersion?: string;
  readonly eventKind?: unknown;
  readonly channelRef?: unknown;
  readonly chatRef?: unknown;
  readonly threadRef?: unknown;
  readonly text?: unknown;
  readonly command?: TopicCommandProjectionInput;
}

export interface TopicCommandRouterInput {
  readonly descriptorKind?: 'topic-command-router-input';
  readonly commandRef?: string;
  readonly correlationRef?: string;
  readonly channelEvent: SafeChannelEventDto | TopicCommandSafeEventInput;
  readonly topicBindings?: readonly TopicCommandBindingDescriptor[];
  readonly commandDescriptors?: readonly TopicCommandDescriptor[];
}

export interface TopicCommandSafeCommandSummary {
  readonly descriptorKind: 'topic-command-safe-command-summary';
  readonly commandName: string;
  readonly argumentText?: string;
}

export interface TopicCommandIntentDescriptor {
  readonly descriptorKind: 'topic-command-intent-descriptor';
  readonly intentRef: string;
  readonly commandRef: string;
  readonly commandName: string;
  readonly namespace: TopicCommandNamespace;
  readonly intentKind: string;
  readonly bindingRef: string;
  readonly routingAuthority: TopicCommandRoutingAuthority;
  readonly target: TopicCommandBindingTarget;
  readonly argumentText?: string;
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly commandExecuted: false;
}

export interface TopicCommandSafeHelpDescriptor {
  readonly descriptorKind: 'topic-command-safe-help';
  readonly reasonCode: 'safe-help';
  readonly helpKind: 'command-help' | 'missing-command' | 'unbound-topic' | 'unknown-command' | 'disabled-binding' | 'unsupported-event-kind';
  readonly safeMessage: string;
  readonly availableCommands: readonly string[];
  readonly routingAuthority?: TopicCommandRoutingAuthority;
}

export interface TopicCommandRouterIssue {
  readonly code: TopicCommandRouterReasonCode;
  readonly severity: 'info' | 'warning' | 'blocked';
  readonly componentRef: 'topic-command-router';
  readonly summary: string;
}

export interface TopicCommandRouterResult {
  readonly descriptorKind: 'topic-command-router-result';
  readonly descriptorVersion: 'w14e';
  readonly ok: boolean;
  readonly status: TopicCommandRouterStatus;
  readonly reasonCode: TopicCommandRouterReasonCode;
  readonly decisionKind: TopicCommandRouterDecisionKind;
  readonly routingAuthority?: TopicCommandRoutingAuthority;
  readonly command?: TopicCommandSafeCommandSummary;
  readonly intent?: TopicCommandIntentDescriptor;
  readonly help?: TopicCommandSafeHelpDescriptor;
  readonly issues: readonly TopicCommandRouterIssue[];
  readonly effects: 'none';
  readonly willCallRemote: false;
  readonly commandExecuted: false;
  readonly jsonSerializable: true;
}

interface CommandData {
  readonly commandName: string;
  readonly argumentText?: string;
}

interface ValidEvent {
  readonly descriptorKind: 'topic-command-validated-event';
  readonly routingAuthority: TopicCommandRoutingAuthority;
  readonly text?: string;
  readonly command?: TopicCommandProjectionInput;
}

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:_-]{0,255}$/u;
const SAFE_COMMAND_PATTERN = /^[a-z][a-z0-9_]{0,31}$/u;
const MAX_ARGUMENT_TEXT_LENGTH = 256;

const UNSAFE_KEY_PATTERNS = Object.freeze([
  /token/iu,
  /secret/iu,
  /credential/iu,
  /password/iu,
  /api\s*key/iu,
  /apikey/iu,
  /authorization/iu,
  /header/iu,
  /client/iu,
  /sdk/iu,
  /provider\s*object/iu,
  /payload/iu,
  /body/iu,
  /endpoint/iu,
  /url/iu,
  /path/iu,
  /stack/iu,
] as const);

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

export const TOPIC_COMMAND_ROUTER_DEFAULT_COMMANDS = Object.freeze([
  { descriptorKind: 'topic-command-descriptor', commandRef: 'topic-command:help', commandName: 'help', namespace: 'telegram', intentKind: 'telegram.help', requiresBinding: false, enabled: true },
  { descriptorKind: 'topic-command-descriptor', commandRef: 'topic-command:actions', commandName: 'actions', namespace: 'agent', intentKind: 'agent.actions', requiresBinding: true, enabled: true },
  { descriptorKind: 'topic-command-descriptor', commandRef: 'topic-command:status', commandName: 'status', namespace: 'workspace', intentKind: 'workspace.status', requiresBinding: true, enabled: true },
] as const satisfies readonly TopicCommandDescriptor[]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function containsUnsafeText(value: string): boolean {
  return UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function isSafeRef(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 && SAFE_REF_PATTERN.test(value) && !containsUnsafeText(value);
}

function isSafeCommandName(value: unknown): value is string {
  return typeof value === 'string' && SAFE_COMMAND_PATTERN.test(value) && !containsUnsafeText(value);
}

function hasUnsafeSurface(value: Record<string, unknown>): boolean {
  return Object.entries(value).some(([key, fieldValue]) => {
    return UNSAFE_KEY_PATTERNS.some((pattern) => pattern.test(key)) || (typeof fieldValue === 'string' && containsUnsafeText(fieldValue));
  });
}

function issue(code: TopicCommandRouterReasonCode, severity: TopicCommandRouterIssue['severity'], summary: string): TopicCommandRouterIssue {
  return Object.freeze({ code, severity, componentRef: 'topic-command-router', summary } satisfies TopicCommandRouterIssue);
}

function createAuthority(channelRef: string, chatRef: string, threadRef: string): TopicCommandRoutingAuthority {
  return Object.freeze({ descriptorKind: 'topic-command-routing-authority', channelRef, chatRef, threadRef, authority: 'channelRef+chatRef+threadRef' } satisfies TopicCommandRoutingAuthority);
}

function result(input: {
  readonly ok: boolean;
  readonly status: TopicCommandRouterStatus;
  readonly reasonCode: TopicCommandRouterReasonCode;
  readonly decisionKind: TopicCommandRouterDecisionKind;
  readonly routingAuthority?: TopicCommandRoutingAuthority;
  readonly command?: TopicCommandSafeCommandSummary;
  readonly intent?: TopicCommandIntentDescriptor;
  readonly help?: TopicCommandSafeHelpDescriptor;
  readonly issues: readonly TopicCommandRouterIssue[];
}): TopicCommandRouterResult {
  const base = {
    descriptorKind: 'topic-command-router-result',
    descriptorVersion: 'w14e',
    ok: input.ok,
    status: input.status,
    reasonCode: input.reasonCode,
    decisionKind: input.decisionKind,
    issues: Object.freeze([...input.issues]),
    effects: 'none',
    willCallRemote: false,
    commandExecuted: false,
    jsonSerializable: true,
  } satisfies Omit<TopicCommandRouterResult, 'routingAuthority' | 'command' | 'intent' | 'help'>;

  return Object.freeze({
    ...base,
    ...(input.routingAuthority === undefined ? {} : { routingAuthority: input.routingAuthority }),
    ...(input.command === undefined ? {} : { command: input.command }),
    ...(input.intent === undefined ? {} : { intent: input.intent }),
    ...(input.help === undefined ? {} : { help: input.help }),
  } satisfies TopicCommandRouterResult);
}

function invalid(issues: readonly TopicCommandRouterIssue[], routingAuthority?: TopicCommandRoutingAuthority): TopicCommandRouterResult {
  return result({ ok: false, status: 'ignored', reasonCode: 'invalid-safe-event', decisionKind: 'ignore-safely', ...(routingAuthority === undefined ? {} : { routingAuthority }), issues });
}

function validateEvent(channelEvent: unknown, issues: TopicCommandRouterIssue[]): ValidEvent | TopicCommandRouterResult {
  if (!isRecord(channelEvent) || hasUnsafeSurface(channelEvent)) {
    issues.push(issue('invalid-safe-event', 'blocked', 'Channel event was rejected safely'));
    return invalid(issues);
  }

  const channelRef = isSafeRef(channelEvent.channelRef) ? channelEvent.channelRef : undefined;
  const chatRef = isSafeRef(channelEvent.chatRef) ? channelEvent.chatRef : undefined;
  const threadRef = isSafeRef(channelEvent.threadRef) ? channelEvent.threadRef : undefined;
  const routingAuthority = channelRef !== undefined && chatRef !== undefined && threadRef !== undefined ? createAuthority(channelRef, chatRef, threadRef) : undefined;

  if (channelEvent.eventKind !== 'message') {
    if (routingAuthority === undefined) {
      issues.push(issue('invalid-safe-event', 'blocked', 'Safe routing refs were missing or invalid'));
      return invalid(issues);
    }
    issues.push(issue('unsupported-event-kind', 'info', 'Event kind is not command-routable'));
    return result({ ok: false, status: 'ignored', reasonCode: 'unsupported-event-kind', decisionKind: 'ignore-safely', routingAuthority, issues });
  }

  if (routingAuthority === undefined) {
    issues.push(issue('invalid-safe-event', 'blocked', 'Safe routing refs were missing or invalid'));
    return invalid(issues);
  }

  return Object.freeze({
    descriptorKind: 'topic-command-validated-event',
    routingAuthority,
    ...(typeof channelEvent.text === 'string' ? { text: channelEvent.text } : {}),
    ...(isRecord(channelEvent.command) ? { command: channelEvent.command as TopicCommandProjectionInput } : {}),
  } satisfies ValidEvent);
}

function argumentText(value: unknown): { readonly ok: boolean; readonly value?: string } {
  if (value === undefined || value === null || value === '') {
    return Object.freeze({ ok: true });
  }
  if (typeof value !== 'string') {
    return Object.freeze({ ok: false });
  }
  const normalized = value.replace(/\s+/gu, ' ').trim();
  if (normalized.length === 0) {
    return Object.freeze({ ok: true });
  }
  return containsUnsafeText(normalized) ? Object.freeze({ ok: false }) : Object.freeze({ ok: true, value: normalized.slice(0, MAX_ARGUMENT_TEXT_LENGTH) });
}

function parseCommandText(text: string): { readonly ok: boolean; readonly command?: CommandData } {
  const normalized = text.replace(/\s+/gu, ' ').trim();
  if (!normalized.startsWith('/')) {
    return Object.freeze({ ok: true });
  }
  if (containsUnsafeText(normalized)) {
    return Object.freeze({ ok: false });
  }
  const match = /^\/(?<name>[a-z][a-z0-9_]{0,31})(?:\s+(?<args>.*))?$/iu.exec(normalized);
  const name = match?.groups?.name?.toLowerCase();
  if (!isSafeCommandName(name)) {
    return Object.freeze({ ok: false });
  }
  const args = argumentText(match?.groups?.args);
  if (!args.ok) {
    return Object.freeze({ ok: false });
  }
  return Object.freeze({ ok: true, command: Object.freeze({ commandName: name, ...(args.value === undefined ? {} : { argumentText: args.value }) } satisfies CommandData) });
}

function extractCommand(event: ValidEvent): { readonly ok: boolean; readonly command?: CommandData } {
  if (event.command === undefined) {
    return event.text === undefined ? Object.freeze({ ok: true }) : parseCommandText(event.text);
  }
  if (event.command.commandRef !== undefined && !isSafeRef(event.command.commandRef)) {
    return Object.freeze({ ok: false });
  }
  const name = typeof event.command.commandName === 'string' ? event.command.commandName.toLowerCase() : undefined;
  if (!isSafeCommandName(name)) {
    return Object.freeze({ ok: false });
  }
  const args = argumentText(event.command.argumentText);
  if (!args.ok) {
    return Object.freeze({ ok: false });
  }
  return Object.freeze({ ok: true, command: Object.freeze({ commandName: name, ...(args.value === undefined ? {} : { argumentText: args.value }) } satisfies CommandData) });
}

function commandSummary(command: CommandData): TopicCommandSafeCommandSummary {
  return Object.freeze({ descriptorKind: 'topic-command-safe-command-summary', commandName: command.commandName, ...(command.argumentText === undefined ? {} : { argumentText: command.argumentText }) } satisfies TopicCommandSafeCommandSummary);
}

function safeTarget(target: TopicCommandBindingTarget): boolean {
  return isSafeRef(target.workspaceRef) && isSafeRef(target.agentRef) && isSafeRef(target.hostSessionRef) && (target.uiDescriptorRef === undefined || isSafeRef(target.uiDescriptorRef)) && (target.domainPackageRef === undefined || isSafeRef(target.domainPackageRef));
}

function bindingMatches(binding: TopicCommandBindingDescriptor, authority: TopicCommandRoutingAuthority): boolean {
  const key = binding.key;
  return binding.descriptorKind === 'topic-command-topic-binding' && isSafeRef(binding.bindingRef) && safeTarget(binding.target) && key.channelRef === authority.channelRef && key.chatRef === authority.chatRef && key.threadRef === authority.threadRef;
}

function commandDescriptor(descriptors: readonly TopicCommandDescriptor[], name: string): TopicCommandDescriptor | undefined {
  return descriptors.find((descriptor) => descriptor.descriptorKind === 'topic-command-descriptor' && descriptor.enabled && descriptor.commandName === name && isSafeCommandName(descriptor.commandName) && isSafeRef(descriptor.commandRef) && !containsUnsafeText(descriptor.intentKind));
}

function safeHelp(kind: TopicCommandSafeHelpDescriptor['helpKind'], descriptors: readonly TopicCommandDescriptor[], routingAuthority: TopicCommandRoutingAuthority): TopicCommandSafeHelpDescriptor {
  return Object.freeze({
    descriptorKind: 'topic-command-safe-help',
    reasonCode: 'safe-help',
    helpKind: kind,
    safeMessage: kind === 'command-help' ? 'Safe command help is available' : 'Command was not routed and safe help is available',
    availableCommands: Object.freeze(descriptors.filter((descriptor) => descriptor.enabled && isSafeCommandName(descriptor.commandName)).map((descriptor) => descriptor.commandName).sort()),
    routingAuthority,
  } satisfies TopicCommandSafeHelpDescriptor);
}

function hash(value: string): string {
  let hashValue = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hashValue ^= value.charCodeAt(index);
    hashValue = Math.imul(hashValue, 16777619) >>> 0;
  }
  return hashValue.toString(16).padStart(8, '0');
}

function intent(descriptor: TopicCommandDescriptor, binding: TopicCommandBindingDescriptor, routingAuthority: TopicCommandRoutingAuthority, command: CommandData): TopicCommandIntentDescriptor {
  const base = {
    descriptorKind: 'topic-command-intent-descriptor',
    intentRef: 'topic-command-intent:' + hash([descriptor.commandRef, binding.bindingRef, routingAuthority.channelRef, routingAuthority.chatRef, routingAuthority.threadRef].join('|')),
    commandRef: descriptor.commandRef,
    commandName: descriptor.commandName,
    namespace: descriptor.namespace,
    intentKind: descriptor.intentKind,
    bindingRef: binding.bindingRef,
    routingAuthority,
    target: Object.freeze({ ...binding.target } satisfies TopicCommandBindingTarget),
    effects: 'none',
    willCallRemote: false,
    commandExecuted: false,
  } satisfies Omit<TopicCommandIntentDescriptor, 'argumentText'>;
  return command.argumentText === undefined ? Object.freeze(base) : Object.freeze({ ...base, argumentText: command.argumentText } satisfies TopicCommandIntentDescriptor);
}

export function routeTopicCommand(input: TopicCommandRouterInput): TopicCommandRouterResult {
  const issues: TopicCommandRouterIssue[] = [];
  const descriptors = input.commandDescriptors ?? TOPIC_COMMAND_ROUTER_DEFAULT_COMMANDS;
  const event = validateEvent(input.channelEvent, issues);
  if (event.descriptorKind === 'topic-command-router-result') {
    return event;
  }

  const extracted = extractCommand(event);
  if (!extracted.ok) {
    issues.push(issue('invalid-safe-event', 'blocked', 'Command projection was rejected safely'));
    return invalid(issues, event.routingAuthority);
  }
  if (extracted.command === undefined) {
    issues.push(issue('missing-command', 'info', 'No safe command was available to route'));
    return result({ ok: false, status: 'ignored', reasonCode: 'missing-command', decisionKind: 'ignore-safely', routingAuthority: event.routingAuthority, help: safeHelp('missing-command', descriptors, event.routingAuthority), issues });
  }

  const summary = commandSummary(extracted.command);
  const descriptor = commandDescriptor(descriptors, extracted.command.commandName);
  if (descriptor === undefined) {
    issues.push(issue('unknown-command', 'info', 'Unknown command resolved to safe help'));
    return result({ ok: false, status: 'safe-help', reasonCode: 'unknown-command', decisionKind: 'render-safe-help', routingAuthority: event.routingAuthority, command: summary, help: safeHelp('unknown-command', descriptors, event.routingAuthority), issues });
  }

  const binding = descriptor.requiresBinding ? (input.topicBindings ?? []).find((candidate) => bindingMatches(candidate, event.routingAuthority)) : undefined;
  if (descriptor.requiresBinding && binding === undefined) {
    issues.push(issue('unbound-topic', 'info', 'Routing authority has no active binding'));
    return result({ ok: false, status: 'safe-help', reasonCode: 'unbound-topic', decisionKind: 'render-safe-help', routingAuthority: event.routingAuthority, command: summary, help: safeHelp('unbound-topic', descriptors, event.routingAuthority), issues });
  }
  if (binding !== undefined && binding.status !== 'active') {
    issues.push(issue('disabled-binding', 'info', 'Binding is not active'));
    return result({ ok: false, status: 'ignored', reasonCode: 'disabled-binding', decisionKind: 'ignore-safely', routingAuthority: event.routingAuthority, command: summary, help: safeHelp('disabled-binding', descriptors, event.routingAuthority), issues });
  }
  if (!descriptor.requiresBinding || descriptor.intentKind === 'telegram.help') {
    issues.push(issue('safe-help', 'info', 'Safe command help was selected'));
    return result({ ok: false, status: 'safe-help', reasonCode: 'safe-help', decisionKind: 'render-safe-help', routingAuthority: event.routingAuthority, command: summary, help: safeHelp('command-help', descriptors, event.routingAuthority), issues });
  }

  const activeBinding = binding;
  if (activeBinding === undefined) {
    issues.push(issue('unbound-topic', 'info', 'Routing authority has no active binding'));
    return result({ ok: false, status: 'safe-help', reasonCode: 'unbound-topic', decisionKind: 'render-safe-help', routingAuthority: event.routingAuthority, command: summary, help: safeHelp('unbound-topic', descriptors, event.routingAuthority), issues });
  }

  issues.push(issue('routed', 'info', 'Command was routed to a safe intent descriptor'));
  return result({ ok: true, status: 'routed', reasonCode: 'routed', decisionKind: 'route-to-command-intent', routingAuthority: event.routingAuthority, command: summary, intent: intent(descriptor, activeBinding, event.routingAuthority, extracted.command), issues });
}

export function isSafeTopicCommandRouterJson(value: unknown): boolean {
  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === 'string' && !UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(encoded));
  } catch {
    return false;
  }
}
