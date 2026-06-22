const OPENCLAW_ADAPTER_REF_KINDS = [
  'workspace',
  'agent',
  'actor',
  'operation',
  'correlation',
  'raw-debug',
  'details',
] as const;

const MAX_REF_VALUE_LENGTH = 256;
const SAFE_REF_VALUE_PATTERN = /^[A-Za-z0-9._~-]+$/u;

export type OpenClawAdapterRefKind = (typeof OPENCLAW_ADAPTER_REF_KINDS)[number];

export type OpenClawAdapterRef = `${OpenClawAdapterRefKind}:${string}`;
export type WorkspaceRef = `workspace:${string}`;
export type AgentRef = `agent:${string}`;
export type ActorRef = `actor:${string}`;
export type AdapterOperationRef = `operation:${string}`;
export type AdapterCorrelationRef = `correlation:${string}`;
export type AdapterRawDebugRef = `raw-debug:${string}`;
export type AdapterDetailsRef = `details:${string}`;

export interface ParsedOpenClawAdapterRef {
  readonly kind: OpenClawAdapterRefKind;
  readonly value: string;
  readonly ref: OpenClawAdapterRef;
}

function isSupportedOpenClawAdapterRefKind(kind: string): kind is OpenClawAdapterRefKind {
  return (OPENCLAW_ADAPTER_REF_KINDS as readonly string[]).includes(kind);
}

function isSafeOpenClawAdapterRefValue(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_REF_VALUE_LENGTH &&
    SAFE_REF_VALUE_PATTERN.test(value)
  );
}

function normalizeOpenClawAdapterRefValue(value: string): string {
  const normalizedValue = value.trim();

  if (!isSafeOpenClawAdapterRefValue(normalizedValue)) {
    throw new TypeError(
      'OpenClaw adapter refs must use a non-empty safe value without whitespace, path separators, or raw payload separators.',
    );
  }

  return normalizedValue;
}

export function createOpenClawAdapterRef(
  kind: OpenClawAdapterRefKind,
  value: string,
): OpenClawAdapterRef {
  if (!isSupportedOpenClawAdapterRefKind(kind)) {
    throw new TypeError('Unsupported OpenClaw adapter ref kind.');
  }

  return `${kind}:${normalizeOpenClawAdapterRefValue(value)}` as OpenClawAdapterRef;
}

export function createWorkspaceRef(value: string): WorkspaceRef {
  return createOpenClawAdapterRef('workspace', value) as WorkspaceRef;
}

export function createAgentRef(value: string): AgentRef {
  return createOpenClawAdapterRef('agent', value) as AgentRef;
}

export function createActorRef(value: string): ActorRef {
  return createOpenClawAdapterRef('actor', value) as ActorRef;
}

export function createAdapterOperationRef(value: string): AdapterOperationRef {
  return createOpenClawAdapterRef('operation', value) as AdapterOperationRef;
}

export function createAdapterCorrelationRef(value: string): AdapterCorrelationRef {
  return createOpenClawAdapterRef('correlation', value) as AdapterCorrelationRef;
}

export function createAdapterRawDebugRef(value: string): AdapterRawDebugRef {
  return createOpenClawAdapterRef('raw-debug', value) as AdapterRawDebugRef;
}

export function createAdapterDetailsRef(value: string): AdapterDetailsRef {
  return createOpenClawAdapterRef('details', value) as AdapterDetailsRef;
}

export function parseOpenClawAdapterRef(candidate: unknown): ParsedOpenClawAdapterRef | null {
  if (typeof candidate !== 'string') {
    return null;
  }

  const separatorIndex = candidate.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex !== candidate.lastIndexOf(':')) {
    return null;
  }

  const kind = candidate.slice(0, separatorIndex);
  if (!isSupportedOpenClawAdapterRefKind(kind)) {
    return null;
  }

  const value = candidate.slice(separatorIndex + 1);
  if (!isSafeOpenClawAdapterRefValue(value)) {
    return null;
  }

  return {
    kind,
    value,
    ref: candidate as OpenClawAdapterRef,
  };
}

export function isOpenClawAdapterRef(candidate: unknown): candidate is OpenClawAdapterRef {
  return parseOpenClawAdapterRef(candidate) !== null;
}
