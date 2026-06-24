export type OpenClawToolCategory = 'core' | 'adapter' | 'domain' | 'capability' | 'diagnostic';

export type OpenClawToolApprovalClassification = 'none' | 'required' | 'dry-run-only' | 'disallowed';

export type OpenClawToolEffectClassification = 'none' | 'read' | 'state-change' | 'external-effect';

export type OpenClawToolAvailabilityPosture = 'available' | 'disabled' | 'dry-run' | 'not-ready';

export type OpenClawToolInputBoundary = 'unknown-json' | 'safe-json-object' | 'safe-command-input';

export type OpenClawToolCapabilityBindingKind = 'none' | 'optional' | 'required';

export type OpenClawToolHandlerReferenceKind =
  | 'core-facade'
  | 'adapter-port'
  | 'domain-command'
  | 'capability-port'
  | 'diagnostic';

export type OpenClawToolRegistryRejectionCode =
  | 'approval_metadata_required'
  | 'category_mismatch'
  | 'duplicate_tool_ref'
  | 'executable_descriptor_value'
  | 'invalid_descriptor'
  | 'invalid_lookup_ref'
  | 'invalid_tool_ref'
  | 'not_found'
  | 'non_serializable_descriptor_value'
  | 'unsafe_descriptor_value';

export interface OpenClawToolSchemaBoundaryDescriptor {
  readonly schemaRef: string;
  readonly boundary: OpenClawToolInputBoundary;
  readonly version?: string;
}

export interface OpenClawToolApprovalDescriptor {
  readonly classification: OpenClawToolApprovalClassification;
  readonly reasonRef?: string;
}

export interface OpenClawToolCapabilityBindingRef {
  readonly binding: OpenClawToolCapabilityBindingKind;
  readonly capabilityRef?: string;
}

export interface OpenClawToolHandlerReferenceDescriptor {
  readonly kind: OpenClawToolHandlerReferenceKind;
  readonly ref: string;
}

export interface OpenClawToolAvailabilityDescriptor {
  readonly posture: OpenClawToolAvailabilityPosture;
  readonly defaultEnabled: boolean;
  readonly readinessRef?: string;
}

export interface OpenClawToolDescriptor {
  readonly toolRef: string;
  readonly title: string;
  readonly description: string;
  readonly category: OpenClawToolCategory;
  readonly ownerRef: string;
  readonly inputSchemaBoundary: OpenClawToolSchemaBoundaryDescriptor;
  readonly outputSchemaBoundary?: OpenClawToolSchemaBoundaryDescriptor;
  readonly approval: OpenClawToolApprovalDescriptor;
  readonly effect: OpenClawToolEffectClassification;
  readonly capabilityBinding: OpenClawToolCapabilityBindingRef;
  readonly handlerReference: OpenClawToolHandlerReferenceDescriptor;
  readonly availability: OpenClawToolAvailabilityDescriptor;
  readonly workspaceScoped: boolean;
  readonly topicCommandSafe?: boolean;
}

export interface OpenClawToolRegistrySnapshot {
  readonly kind: 'openclaw-tool-registry-snapshot';
  readonly descriptorVersion: 'w13c';
  readonly toolCount: number;
  readonly defaultAvailability: OpenClawToolAvailabilityPosture;
  readonly tools: readonly OpenClawToolDescriptor[];
}

export interface OpenClawToolRegistryRejection {
  readonly code: OpenClawToolRegistryRejectionCode;
  readonly summary: string;
  readonly safe: true;
}

export interface OpenClawToolRegistryOk<TValue> {
  readonly ok: true;
  readonly value: TValue;
}

export interface OpenClawToolRegistryRejected {
  readonly ok: false;
  readonly error: OpenClawToolRegistryRejection;
}

export type OpenClawToolRegistryResult<TValue> = OpenClawToolRegistryOk<TValue> | OpenClawToolRegistryRejected;

export interface OpenClawToolRegistry {
  readonly registerToolDescriptor: (descriptor: unknown) => OpenClawToolRegistryResult<OpenClawToolDescriptor>;
  readonly listToolDescriptors: () => readonly OpenClawToolDescriptor[];
  readonly findToolDescriptor: (toolRef: string) => OpenClawToolDescriptor | undefined;
  readonly getToolDescriptor: (toolRef: string) => OpenClawToolRegistryResult<OpenClawToolDescriptor>;
  readonly serializeRegistrySnapshot: () => OpenClawToolRegistrySnapshot;
}

const TOOL_REF_PATTERN = /^hazeteam\.(?:core|adapter|agent|workspace|oca|diagnostics)\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/u;
const SAFE_REF_PATTERN = /^[a-z][a-z0-9]*(?:(?:[._:-])[a-z0-9][a-z0-9_-]*)*$/u;
const SAFE_VERSION_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;

const TOOL_APPROVAL_CLASSIFICATIONS = ['none', 'required', 'dry-run-only', 'disallowed'] as const;
const TOOL_EFFECT_CLASSIFICATIONS = ['none', 'read', 'state-change', 'external-effect'] as const;
const TOOL_CATEGORIES = ['core', 'adapter', 'domain', 'capability', 'diagnostic'] as const;
const TOOL_INPUT_BOUNDARIES = ['unknown-json', 'safe-json-object', 'safe-command-input'] as const;
const TOOL_CAPABILITY_BINDINGS = ['none', 'optional', 'required'] as const;
const TOOL_HANDLER_REFERENCE_KINDS = [
  'core-facade',
  'adapter-port',
  'domain-command',
  'capability-port',
  'diagnostic',
] as const;
const TOOL_AVAILABILITY_POSTURES = ['available', 'disabled', 'dry-run', 'not-ready'] as const;

const UNSAFE_PUBLIC_TEXT = [
  'rawtoolpayload',
  'rawopenclawevent',
  'rawruntimepayload',
  'rawproviderresponse',
  'token',
  'secret',
  'password',
  'credential',
  'apikey',
  'bearer',
  'stack',
  'filesystem',
  'storagepath',
  'network',
  'webhook',
  'polling',
  'telegram',
] as const;

function ok<TValue>(value: TValue): OpenClawToolRegistryOk<TValue> {
  return Object.freeze({ ok: true, value });
}

function rejected(code: OpenClawToolRegistryRejectionCode): OpenClawToolRegistryRejected {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code,
      summary: 'Descriptor was rejected by the safe OpenClaw tool registry boundary.',
      safe: true,
    }),
  });
}

function notFound(): OpenClawToolRegistryRejected {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: 'not_found',
      summary: 'No registered descriptor matched the safe lookup reference.',
      safe: true,
    }),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function isOneOf<TValue extends string>(value: unknown, allowed: readonly TValue[]): value is TValue {
  return typeof value === 'string' && allowed.includes(value as TValue);
}

function isSafeRef(value: unknown): value is string {
  return typeof value === 'string' && SAFE_REF_PATTERN.test(value) && !containsUnsafePublicText(value);
}

function isSafeVersion(value: unknown): value is string {
  return typeof value === 'string' && SAFE_VERSION_PATTERN.test(value) && !containsUnsafePublicText(value);
}

function containsUnsafePublicText(value: string): boolean {
  const lowered = value.toLowerCase();
  return UNSAFE_PUBLIC_TEXT.some((term) => lowered.includes(term));
}

function validatePublicData(value: unknown, depth = 0): OpenClawToolRegistryRejectionCode | undefined {
  if (depth > 12) {
    return 'non_serializable_descriptor_value';
  }

  if (value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return containsUnsafePublicText(value) ? 'unsafe_descriptor_value' : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return Number.isFinite(value as number) ? undefined : 'non_serializable_descriptor_value';
  }

  if (typeof value === 'function') {
    return 'executable_descriptor_value';
  }

  if (typeof value === 'undefined' || typeof value === 'symbol' || typeof value === 'bigint') {
    return 'non_serializable_descriptor_value';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const itemResult = validatePublicData(item, depth + 1);
      if (itemResult !== undefined) {
        return itemResult;
      }
    }

    return undefined;
  }

  if (!isRecord(value)) {
    return 'non_serializable_descriptor_value';
  }

  for (const [key, item] of Object.entries(value)) {
    if (containsUnsafePublicText(key)) {
      return 'unsafe_descriptor_value';
    }

    const itemResult = validatePublicData(item, depth + 1);
    if (itemResult !== undefined) {
      return itemResult;
    }
  }

  return undefined;
}

export function isSafeOpenClawToolRef(toolRef: string): boolean {
  return TOOL_REF_PATTERN.test(toolRef) && !containsUnsafePublicText(toolRef);
}

function categoryMatchesToolRef(category: OpenClawToolCategory, toolRef: string): boolean {
  if (category === 'domain') {
    return toolRef.startsWith('hazeteam.agent.') || toolRef.startsWith('hazeteam.workspace.');
  }

  if (category === 'diagnostic') {
    return toolRef.startsWith('hazeteam.diagnostics.');
  }

  return toolRef.startsWith(`hazeteam.${category}.`);
}

function validateSchemaBoundary(value: unknown): value is OpenClawToolSchemaBoundaryDescriptor {
  if (!isRecord(value)) {
    return false;
  }

  if (!isSafeRef(value.schemaRef) || !isOneOf(value.boundary, TOOL_INPUT_BOUNDARIES)) {
    return false;
  }

  if ('version' in value && !isSafeVersion(value.version)) {
    return false;
  }

  return true;
}

function validateApprovalDescriptor(value: unknown): value is OpenClawToolApprovalDescriptor {
  if (!isRecord(value) || !isOneOf(value.classification, TOOL_APPROVAL_CLASSIFICATIONS)) {
    return false;
  }

  if ('reasonRef' in value && !isSafeRef(value.reasonRef)) {
    return false;
  }

  return true;
}

function validateCapabilityBinding(value: unknown): value is OpenClawToolCapabilityBindingRef {
  if (!isRecord(value) || !isOneOf(value.binding, TOOL_CAPABILITY_BINDINGS)) {
    return false;
  }

  if (value.binding === 'none') {
    return !('capabilityRef' in value);
  }

  return isSafeRef(value.capabilityRef);
}

function validateHandlerReference(value: unknown): value is OpenClawToolHandlerReferenceDescriptor {
  if (!isRecord(value) || !isOneOf(value.kind, TOOL_HANDLER_REFERENCE_KINDS)) {
    return false;
  }

  return isSafeRef(value.ref);
}

function validateAvailability(value: unknown): value is OpenClawToolAvailabilityDescriptor {
  if (!isRecord(value) || !isOneOf(value.posture, TOOL_AVAILABILITY_POSTURES)) {
    return false;
  }

  if (typeof value.defaultEnabled !== 'boolean') {
    return false;
  }

  if ('readinessRef' in value && !isSafeRef(value.readinessRef)) {
    return false;
  }

  return true;
}

export function validateOpenClawToolDescriptor(
  descriptor: unknown,
): OpenClawToolRegistryResult<OpenClawToolDescriptor> {
  const publicDataResult = validatePublicData(descriptor);
  if (publicDataResult !== undefined) {
    return rejected(publicDataResult);
  }

  if (!isRecord(descriptor)) {
    return rejected('invalid_descriptor');
  }

  if (typeof descriptor.toolRef !== 'string' || !isSafeOpenClawToolRef(descriptor.toolRef)) {
    return rejected('invalid_tool_ref');
  }

  if (!isOneOf(descriptor.category, TOOL_CATEGORIES)) {
    return rejected('invalid_descriptor');
  }

  if (!categoryMatchesToolRef(descriptor.category, descriptor.toolRef)) {
    return rejected('category_mismatch');
  }

  if (
    typeof descriptor.title !== 'string' ||
    descriptor.title.length < 1 ||
    typeof descriptor.description !== 'string' ||
    descriptor.description.length < 1 ||
    !isSafeRef(descriptor.ownerRef) ||
    !validateSchemaBoundary(descriptor.inputSchemaBoundary) ||
    ('outputSchemaBoundary' in descriptor && !validateSchemaBoundary(descriptor.outputSchemaBoundary)) ||
    !validateApprovalDescriptor(descriptor.approval) ||
    !isOneOf(descriptor.effect, TOOL_EFFECT_CLASSIFICATIONS) ||
    !validateCapabilityBinding(descriptor.capabilityBinding) ||
    !validateHandlerReference(descriptor.handlerReference) ||
    !validateAvailability(descriptor.availability) ||
    typeof descriptor.workspaceScoped !== 'boolean' ||
    ('topicCommandSafe' in descriptor && typeof descriptor.topicCommandSafe !== 'boolean')
  ) {
    return rejected('invalid_descriptor');
  }

  if (descriptor.effect !== 'none' && !('approval' in descriptor)) {
    return rejected('approval_metadata_required');
  }

  return ok(freezeToolDescriptor(descriptor));
}

function cloneSchemaBoundary(value: OpenClawToolSchemaBoundaryDescriptor): OpenClawToolSchemaBoundaryDescriptor {
  const cloned: OpenClawToolSchemaBoundaryDescriptor = {
    schemaRef: value.schemaRef,
    boundary: value.boundary,
    ...(value.version === undefined ? {} : { version: value.version }),
  };

  return Object.freeze(cloned);
}

function cloneApproval(value: OpenClawToolApprovalDescriptor): OpenClawToolApprovalDescriptor {
  const cloned: OpenClawToolApprovalDescriptor = {
    classification: value.classification,
    ...(value.reasonRef === undefined ? {} : { reasonRef: value.reasonRef }),
  };

  return Object.freeze(cloned);
}

function cloneCapabilityBinding(value: OpenClawToolCapabilityBindingRef): OpenClawToolCapabilityBindingRef {
  const cloned: OpenClawToolCapabilityBindingRef = {
    binding: value.binding,
    ...(value.capabilityRef === undefined ? {} : { capabilityRef: value.capabilityRef }),
  };

  return Object.freeze(cloned);
}

function cloneHandlerReference(value: OpenClawToolHandlerReferenceDescriptor): OpenClawToolHandlerReferenceDescriptor {
  return Object.freeze({
    kind: value.kind,
    ref: value.ref,
  });
}

function cloneAvailability(value: OpenClawToolAvailabilityDescriptor): OpenClawToolAvailabilityDescriptor {
  const cloned: OpenClawToolAvailabilityDescriptor = {
    posture: value.posture,
    defaultEnabled: value.defaultEnabled,
    ...(value.readinessRef === undefined ? {} : { readinessRef: value.readinessRef }),
  };

  return Object.freeze(cloned);
}

function freezeToolDescriptor(value: OpenClawToolDescriptor): OpenClawToolDescriptor {
  const descriptor: OpenClawToolDescriptor = {
    toolRef: value.toolRef,
    title: value.title,
    description: value.description,
    category: value.category,
    ownerRef: value.ownerRef,
    inputSchemaBoundary: cloneSchemaBoundary(value.inputSchemaBoundary),
    ...(value.outputSchemaBoundary === undefined
      ? {}
      : { outputSchemaBoundary: cloneSchemaBoundary(value.outputSchemaBoundary) }),
    approval: cloneApproval(value.approval),
    effect: value.effect,
    capabilityBinding: cloneCapabilityBinding(value.capabilityBinding),
    handlerReference: cloneHandlerReference(value.handlerReference),
    availability: cloneAvailability(value.availability),
    workspaceScoped: value.workspaceScoped,
    ...(value.topicCommandSafe === undefined ? {} : { topicCommandSafe: value.topicCommandSafe }),
  };

  return Object.freeze(descriptor);
}

export function createOpenClawToolRegistry(options?: {
  readonly defaultAvailability?: OpenClawToolAvailabilityPosture;
}): OpenClawToolRegistry {
  const registered = new Map<string, OpenClawToolDescriptor>();
  const defaultAvailability = options?.defaultAvailability ?? 'not-ready';

  function registerToolDescriptor(descriptor: unknown): OpenClawToolRegistryResult<OpenClawToolDescriptor> {
    const validated = validateOpenClawToolDescriptor(descriptor);
    if (!validated.ok) {
      return validated;
    }

    if (registered.has(validated.value.toolRef)) {
      return rejected('duplicate_tool_ref');
    }

    registered.set(validated.value.toolRef, validated.value);
    return ok(validated.value);
  }

  function listToolDescriptors(): readonly OpenClawToolDescriptor[] {
    return Object.freeze([...registered.values()].sort((left, right) => left.toolRef.localeCompare(right.toolRef)));
  }

  function findToolDescriptor(toolRef: string): OpenClawToolDescriptor | undefined {
    if (!isSafeOpenClawToolRef(toolRef)) {
      return undefined;
    }

    return registered.get(toolRef);
  }

  function getToolDescriptor(toolRef: string): OpenClawToolRegistryResult<OpenClawToolDescriptor> {
    if (!isSafeOpenClawToolRef(toolRef)) {
      return rejected('invalid_lookup_ref');
    }

    const descriptor = registered.get(toolRef);
    return descriptor === undefined ? notFound() : ok(descriptor);
  }

  function serializeRegistrySnapshot(): OpenClawToolRegistrySnapshot {
    return Object.freeze({
      kind: 'openclaw-tool-registry-snapshot',
      descriptorVersion: 'w13c',
      toolCount: registered.size,
      defaultAvailability,
      tools: listToolDescriptors(),
    });
  }

  return Object.freeze({
    registerToolDescriptor,
    listToolDescriptors,
    findToolDescriptor,
    getToolDescriptor,
    serializeRegistrySnapshot,
  });
}
