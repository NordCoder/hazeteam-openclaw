export const RUNTIME_CAPABILITY_KINDS = Object.freeze([
  'runtime',
  'automation',
  'session',
  'tool-bundle',
  'approval',
  'diagnostic',
] as const);

export type RuntimeCapabilityKind = (typeof RUNTIME_CAPABILITY_KINDS)[number];

export const RUNTIME_CAPABILITY_READINESS_STATES = Object.freeze([
  'not-configured',
  'disabled',
  'ready-dry-run',
  'ready-fake',
  'degraded',
  'failed',
] as const);

export type RuntimeCapabilityReadinessState = (typeof RUNTIME_CAPABILITY_READINESS_STATES)[number];

export const RUNTIME_CAPABILITY_REQUIREMENTS = Object.freeze(['required', 'optional'] as const);

export type RuntimeCapabilityRequirement = (typeof RUNTIME_CAPABILITY_REQUIREMENTS)[number];

export const RUNTIME_CAPABILITY_EXECUTION_POSTURES = Object.freeze([
  'dry-run',
  'fake',
  'disabled',
  'blocked',
] as const);

export type RuntimeCapabilityExecutionPosture = (typeof RUNTIME_CAPABILITY_EXECUTION_POSTURES)[number];

export interface RuntimeCapabilityDescriptorInput {
  readonly capabilityRef: string;
  readonly name: string;
  readonly version: string;
  readonly kind: RuntimeCapabilityKind;
  readonly operationRefs: readonly string[];
  readonly readinessState: RuntimeCapabilityReadinessState;
  readonly requirement: RuntimeCapabilityRequirement;
  readonly executionPosture: RuntimeCapabilityExecutionPosture;
  readonly summary: string;
  readonly detailRefs?: readonly string[];
}

export interface SafeRuntimeCapabilityDescriptor extends RuntimeCapabilityDescriptorInput {
  readonly descriptorVersion: 'w13d';
}

export interface RuntimeCapabilityReadinessDescriptor {
  readonly capabilityRef: string;
  readonly name: string;
  readonly version: string;
  readonly kind: RuntimeCapabilityKind;
  readonly readinessState: RuntimeCapabilityReadinessState;
  readonly requirement: RuntimeCapabilityRequirement;
  readonly executionPosture: RuntimeCapabilityExecutionPosture;
  readonly ready: boolean;
  readonly blocking: boolean;
  readonly operationRefs: readonly string[];
  readonly summary: string;
  readonly detailRefs?: readonly string[];
}

export interface RuntimeCapabilityRequirementDescriptor {
  readonly capabilityRef: string;
  readonly name: string;
  readonly version?: string;
  readonly kind?: RuntimeCapabilityKind;
  readonly requirement: RuntimeCapabilityRequirement;
}

export interface RuntimeCapabilityRegistrySnapshot {
  readonly registryRef: 'runtime-capability-registry';
  readonly descriptorVersion: 'w13d';
  readonly effects: 'none';
  readonly capabilityCount: number;
  readonly capabilities: readonly SafeRuntimeCapabilityDescriptor[];
  readonly readiness: readonly RuntimeCapabilityReadinessDescriptor[];
}

export type RuntimeCapabilityRegistryErrorCode =
  | 'invalid-descriptor'
  | 'duplicate-capability-ref'
  | 'invalid-capability-ref'
  | 'invalid-requirement';

export interface RuntimeCapabilityRegistryError {
  readonly code: RuntimeCapabilityRegistryErrorCode;
  readonly message: string;
  readonly capabilityRef?: string;
}

export type RuntimeCapabilityRegistryResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly error: RuntimeCapabilityRegistryError;
    };

export interface RuntimeCapabilityRegistry {
  readonly register: (
    descriptor: RuntimeCapabilityDescriptorInput,
  ) => RuntimeCapabilityRegistryResult<SafeRuntimeCapabilityDescriptor>;
  readonly list: () => readonly SafeRuntimeCapabilityDescriptor[];
  readonly find: (capabilityRef: string) => SafeRuntimeCapabilityDescriptor | undefined;
  readonly get: (capabilityRef: string) => RuntimeCapabilityRegistryResult<SafeRuntimeCapabilityDescriptor>;
  readonly readiness: (capabilityRef: string) => RuntimeCapabilityRegistryResult<RuntimeCapabilityReadinessDescriptor>;
  readonly describeRequirement: (
    requirement: RuntimeCapabilityRequirementDescriptor,
  ) => RuntimeCapabilityRegistryResult<RuntimeCapabilityReadinessDescriptor>;
  readonly snapshot: () => RuntimeCapabilityRegistrySnapshot;
}

const SAFE_REF_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const SAFE_VERSION_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[a-z0-9][a-z0-9.-]*)?$/;
const MAX_REF_LENGTH = 96;
const MAX_VERSION_LENGTH = 48;
const MAX_SUMMARY_LENGTH = 180;
const MAX_OPERATION_REFS = 64;
const MAX_DETAIL_REFS = 32;

const DESCRIPTOR_KEYS = new Set([
  'capabilityRef',
  'name',
  'version',
  'kind',
  'operationRefs',
  'readinessState',
  'requirement',
  'executionPosture',
  'summary',
  'detailRefs',
]);

const UNSAFE_DESCRIPTOR_TERMS = Object.freeze([
  'rawproviderresponse',
  'rawruntimepayload',
  'rawtoolpayload',
  'rawclient',
  'clienthandle',
  'client',
  'token',
  'secret',
  'password',
  'credential',
  'apikey',
  'api key',
  'bearer',
  'stack',
  'filesystem',
  'storagepath',
  'storage path',
  'network',
  'webhook',
  'polling',
  'telegram',
] as const);

export function createRuntimeCapabilityRegistry(): RuntimeCapabilityRegistry {
  const descriptors = new Map<string, SafeRuntimeCapabilityDescriptor>();

  return Object.freeze({
    register(descriptor: RuntimeCapabilityDescriptorInput) {
      const normalized = normalizeCapabilityDescriptor(descriptor);
      if (!normalized.ok) {
        return normalized;
      }

      if (descriptors.has(normalized.value.capabilityRef)) {
        return failure('duplicate-capability-ref', 'Capability ref is already registered.', normalized.value.capabilityRef);
      }

      descriptors.set(normalized.value.capabilityRef, normalized.value);
      return success(cloneCapabilityDescriptor(normalized.value));
    },

    list() {
      return Object.freeze([...descriptors.values()].map(cloneCapabilityDescriptor));
    },

    find(capabilityRef: string) {
      if (!isSafeRef(capabilityRef)) {
        return undefined;
      }

      const descriptor = descriptors.get(capabilityRef);
      return descriptor === undefined ? undefined : cloneCapabilityDescriptor(descriptor);
    },

    get(capabilityRef: string) {
      if (!isSafeRef(capabilityRef)) {
        return failure('invalid-capability-ref', 'Capability ref is invalid.');
      }

      const descriptor = descriptors.get(capabilityRef);
      if (descriptor === undefined) {
        return failure('invalid-capability-ref', 'Capability ref is not registered.', capabilityRef);
      }

      return success(cloneCapabilityDescriptor(descriptor));
    },

    readiness(capabilityRef: string) {
      if (!isSafeRef(capabilityRef)) {
        return failure('invalid-capability-ref', 'Capability ref is invalid.');
      }

      const descriptor = descriptors.get(capabilityRef);
      if (descriptor === undefined) {
        return failure('invalid-capability-ref', 'Capability ref is not registered.', capabilityRef);
      }

      return success(createCapabilityReadinessDescriptor(descriptor));
    },

    describeRequirement(requirement: RuntimeCapabilityRequirementDescriptor) {
      const normalized = normalizeRequirementDescriptor(requirement);
      if (!normalized.ok) {
        return normalized;
      }

      const descriptor = descriptors.get(normalized.value.capabilityRef);
      if (descriptor !== undefined) {
        return success(createCapabilityReadinessDescriptor(descriptor));
      }

      return success(createMissingCapabilityReadinessDescriptor(normalized.value));
    },

    snapshot() {
      const capabilities = [...descriptors.values()].map(cloneCapabilityDescriptor);
      const readiness = [...descriptors.values()].map(createCapabilityReadinessDescriptor);

      return Object.freeze({
        registryRef: 'runtime-capability-registry',
        descriptorVersion: 'w13d',
        effects: 'none',
        capabilityCount: capabilities.length,
        capabilities: Object.freeze(capabilities),
        readiness: Object.freeze(readiness),
      } satisfies RuntimeCapabilityRegistrySnapshot);
    },
  } satisfies RuntimeCapabilityRegistry);
}

export function normalizeCapabilityDescriptor(
  descriptor: RuntimeCapabilityDescriptorInput,
): RuntimeCapabilityRegistryResult<SafeRuntimeCapabilityDescriptor> {
  if (!isRecord(descriptor)) {
    return failure('invalid-descriptor', 'Capability descriptor must be a safe object.');
  }

  for (const key of Object.keys(descriptor)) {
    if (!DESCRIPTOR_KEYS.has(key)) {
      return failure('invalid-descriptor', 'Capability descriptor contains unsupported fields.');
    }
  }

  if (!isSafeRef(descriptor.capabilityRef)) {
    return failure('invalid-capability-ref', 'Capability ref is invalid.');
  }

  if (!isSafeRef(descriptor.name)) {
    return failure('invalid-descriptor', 'Capability name is invalid.');
  }

  if (!isSafeVersion(descriptor.version)) {
    return failure('invalid-descriptor', 'Capability version is invalid.', descriptor.capabilityRef);
  }

  if (!isRuntimeCapabilityKind(descriptor.kind)) {
    return failure('invalid-descriptor', 'Capability kind is invalid.', descriptor.capabilityRef);
  }

  if (!isRuntimeCapabilityReadinessState(descriptor.readinessState)) {
    return failure('invalid-descriptor', 'Capability readiness state is invalid.', descriptor.capabilityRef);
  }

  if (!isRuntimeCapabilityRequirement(descriptor.requirement)) {
    return failure('invalid-requirement', 'Capability requirement is invalid.', descriptor.capabilityRef);
  }

  if (!isRuntimeCapabilityExecutionPosture(descriptor.executionPosture)) {
    return failure('invalid-descriptor', 'Capability posture is invalid.', descriptor.capabilityRef);
  }

  const operationRefs = normalizeSafeRefList(descriptor.operationRefs, MAX_OPERATION_REFS);
  if (operationRefs === undefined) {
    return failure('invalid-descriptor', 'Capability operation refs are invalid.', descriptor.capabilityRef);
  }

  const detailRefs = descriptor.detailRefs === undefined ? undefined : normalizeSafeRefList(descriptor.detailRefs, MAX_DETAIL_REFS);
  if (descriptor.detailRefs !== undefined && detailRefs === undefined) {
    return failure('invalid-descriptor', 'Capability detail refs are invalid.', descriptor.capabilityRef);
  }

  if (!isSafeSummary(descriptor.summary)) {
    return failure('invalid-descriptor', 'Capability summary is invalid.', descriptor.capabilityRef);
  }

  const base = {
    descriptorVersion: 'w13d',
    capabilityRef: descriptor.capabilityRef,
    name: descriptor.name,
    version: descriptor.version,
    kind: descriptor.kind,
    operationRefs,
    readinessState: descriptor.readinessState,
    requirement: descriptor.requirement,
    executionPosture: descriptor.executionPosture,
    summary: descriptor.summary,
  } satisfies Omit<SafeRuntimeCapabilityDescriptor, 'detailRefs'>;

  if (detailRefs !== undefined) {
    return success(
      Object.freeze({
        ...base,
        detailRefs,
      } satisfies SafeRuntimeCapabilityDescriptor),
    );
  }

  return success(Object.freeze(base satisfies SafeRuntimeCapabilityDescriptor));
}

export function createCapabilityReadinessDescriptor(
  descriptor: SafeRuntimeCapabilityDescriptor,
): RuntimeCapabilityReadinessDescriptor {
  const ready = descriptor.readinessState === 'ready-dry-run' || descriptor.readinessState === 'ready-fake';
  const blocking = descriptor.requirement === 'required' && !ready;

  const base = {
    capabilityRef: descriptor.capabilityRef,
    name: descriptor.name,
    version: descriptor.version,
    kind: descriptor.kind,
    readinessState: descriptor.readinessState,
    requirement: descriptor.requirement,
    executionPosture: descriptor.executionPosture,
    ready,
    blocking,
    operationRefs: Object.freeze([...descriptor.operationRefs]),
    summary: descriptor.summary,
  } satisfies Omit<RuntimeCapabilityReadinessDescriptor, 'detailRefs'>;

  if (descriptor.detailRefs !== undefined) {
    return Object.freeze({
      ...base,
      detailRefs: Object.freeze([...descriptor.detailRefs]),
    } satisfies RuntimeCapabilityReadinessDescriptor);
  }

  return Object.freeze(base satisfies RuntimeCapabilityReadinessDescriptor);
}

export function createMissingCapabilityReadinessDescriptor(
  requirement: RuntimeCapabilityRequirementDescriptor,
): RuntimeCapabilityReadinessDescriptor {
  const required = requirement.requirement === 'required';
  const kind = requirement.kind ?? 'runtime';
  const version = requirement.version ?? '0.0.0';
  const readinessState = required ? 'not-configured' : 'disabled';

  return Object.freeze({
    capabilityRef: requirement.capabilityRef,
    name: requirement.name,
    version,
    kind,
    readinessState,
    requirement: requirement.requirement,
    executionPosture: 'blocked',
    ready: false,
    blocking: required,
    operationRefs: Object.freeze([]),
    summary: required
      ? 'Required capability descriptor is not registered.'
      : 'Optional capability descriptor is not registered.',
  } satisfies RuntimeCapabilityReadinessDescriptor);
}

export function serializeRuntimeCapabilityRegistrySnapshot(
  registry: RuntimeCapabilityRegistry,
): RuntimeCapabilityRegistrySnapshot {
  return registry.snapshot();
}

function normalizeRequirementDescriptor(
  requirement: RuntimeCapabilityRequirementDescriptor,
): RuntimeCapabilityRegistryResult<RuntimeCapabilityRequirementDescriptor> {
  if (!isRecord(requirement)) {
    return failure('invalid-requirement', 'Capability requirement must be a safe object.');
  }

  if (!isSafeRef(requirement.capabilityRef) || !isSafeRef(requirement.name)) {
    return failure('invalid-capability-ref', 'Capability requirement ref is invalid.');
  }

  if (!isRuntimeCapabilityRequirement(requirement.requirement)) {
    return failure('invalid-requirement', 'Capability requirement is invalid.', requirement.capabilityRef);
  }

  if (requirement.version !== undefined && !isSafeVersion(requirement.version)) {
    return failure('invalid-requirement', 'Capability requirement version is invalid.', requirement.capabilityRef);
  }

  if (requirement.kind !== undefined && !isRuntimeCapabilityKind(requirement.kind)) {
    return failure('invalid-requirement', 'Capability requirement kind is invalid.', requirement.capabilityRef);
  }

  const base = {
    capabilityRef: requirement.capabilityRef,
    name: requirement.name,
    requirement: requirement.requirement,
  } satisfies Omit<RuntimeCapabilityRequirementDescriptor, 'version' | 'kind'>;

  return success(
    Object.freeze({
      ...base,
      ...(requirement.version === undefined ? {} : { version: requirement.version }),
      ...(requirement.kind === undefined ? {} : { kind: requirement.kind }),
    } satisfies RuntimeCapabilityRequirementDescriptor),
  );
}

function cloneCapabilityDescriptor(descriptor: SafeRuntimeCapabilityDescriptor): SafeRuntimeCapabilityDescriptor {
  const base = {
    descriptorVersion: descriptor.descriptorVersion,
    capabilityRef: descriptor.capabilityRef,
    name: descriptor.name,
    version: descriptor.version,
    kind: descriptor.kind,
    operationRefs: Object.freeze([...descriptor.operationRefs]),
    readinessState: descriptor.readinessState,
    requirement: descriptor.requirement,
    executionPosture: descriptor.executionPosture,
    summary: descriptor.summary,
  } satisfies Omit<SafeRuntimeCapabilityDescriptor, 'detailRefs'>;

  if (descriptor.detailRefs !== undefined) {
    return Object.freeze({
      ...base,
      detailRefs: Object.freeze([...descriptor.detailRefs]),
    } satisfies SafeRuntimeCapabilityDescriptor);
  }

  return Object.freeze(base satisfies SafeRuntimeCapabilityDescriptor);
}

function normalizeSafeRefList(value: readonly string[], maxItems: number): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length > maxItems) {
    return undefined;
  }

  const refs: string[] = [];
  for (const ref of value) {
    if (!isSafeRef(ref)) {
      return undefined;
    }

    refs.push(ref);
  }

  return Object.freeze(refs);
}

function isRuntimeCapabilityKind(value: unknown): value is RuntimeCapabilityKind {
  return typeof value === 'string' && RUNTIME_CAPABILITY_KINDS.includes(value as RuntimeCapabilityKind);
}

function isRuntimeCapabilityReadinessState(value: unknown): value is RuntimeCapabilityReadinessState {
  return (
    typeof value === 'string' &&
    RUNTIME_CAPABILITY_READINESS_STATES.includes(value as RuntimeCapabilityReadinessState)
  );
}

function isRuntimeCapabilityRequirement(value: unknown): value is RuntimeCapabilityRequirement {
  return typeof value === 'string' && RUNTIME_CAPABILITY_REQUIREMENTS.includes(value as RuntimeCapabilityRequirement);
}

function isRuntimeCapabilityExecutionPosture(value: unknown): value is RuntimeCapabilityExecutionPosture {
  return (
    typeof value === 'string' &&
    RUNTIME_CAPABILITY_EXECUTION_POSTURES.includes(value as RuntimeCapabilityExecutionPosture)
  );
}

function isSafeRef(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_REF_LENGTH &&
    SAFE_REF_PATTERN.test(value) &&
    !hasUnsafeTerm(value)
  );
}

function isSafeVersion(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_VERSION_LENGTH && SAFE_VERSION_PATTERN.test(value);
}

function isSafeSummary(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_SUMMARY_LENGTH &&
    !hasUnsafeTerm(value)
  );
}

function hasUnsafeTerm(value: string): boolean {
  const normalized = value.toLowerCase();
  return UNSAFE_DESCRIPTOR_TERMS.some((term) => normalized.includes(term));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function success<T>(value: T): RuntimeCapabilityRegistryResult<T> {
  return Object.freeze({ ok: true, value });
}

function failure(
  code: RuntimeCapabilityRegistryErrorCode,
  message: string,
  capabilityRef?: string,
): RuntimeCapabilityRegistryResult<never> {
  const error = capabilityRef === undefined ? { code, message } : { code, message, capabilityRef };
  return Object.freeze({ ok: false, error: Object.freeze(error) });
}
