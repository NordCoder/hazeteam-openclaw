import type { AdapterOperationContext } from '../contracts/context.js';
import type { AdapterOperationResult } from '../contracts/result.js';
import type { OpenClawTelegramAdapterReadiness } from '../contracts/readiness.js';
import { adapterErr, adapterOk, createAdapterSafeError } from '../contracts/result.js';
import { createAdapterReadinessCheck, summarizeAdapterReadiness } from '../contracts/readiness.js';

export const ADAPTER_CORE_FACADE_METHOD_NAMES = [
  'submitHostAction',
  'submitUserIntent',
  'listPendingPresentations',
  'claimPresentation',
  'markPresentationDelivered',
  'markPresentationFailed',
  'issueActionToken',
  'verifyActionToken',
  'consumeActionToken',
  'drainRuntimeOnce',
  'getWorkflowStatus',
  'getHealth',
  'getPortReadiness',
] as const;

export const REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES = [
  'submitHostAction',
  'submitUserIntent',
  'listPendingPresentations',
  'claimPresentation',
  'markPresentationDelivered',
  'markPresentationFailed',
  'issueActionToken',
  'verifyActionToken',
  'consumeActionToken',
  'getPortReadiness',
] as const;

export const REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES = [
  'agentControlHost',
  'sessionBindingStore',
  'presentationOutboxStore',
  'presentationActionTokenStore',
] as const;

export const OPTIONAL_ADAPTER_CORE_HOST_PORT_NAMES = [
  'runtimeDrain',
  'workflowStatusReader',
  'healthReader',
  'readinessReader',
  'auditReader',
  'approvalReader',
] as const;

export const ADAPTER_CORE_HOST_PORT_NAMES = [
  ...REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES,
  ...OPTIONAL_ADAPTER_CORE_HOST_PORT_NAMES,
] as const;

export type AdapterCoreFacadeMethodName = (typeof ADAPTER_CORE_FACADE_METHOD_NAMES)[number];
export type RequiredAdapterCoreFacadeMethodName =
  (typeof REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES)[number];
export type AdapterCoreHostRequiredPortName = (typeof REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES)[number];
export type AdapterCoreHostOptionalPortName = (typeof OPTIONAL_ADAPTER_CORE_HOST_PORT_NAMES)[number];
export type AdapterCoreHostPortName = (typeof ADAPTER_CORE_HOST_PORT_NAMES)[number];

export type AdapterCoreFacadeMethod = (...args: unknown[]) => unknown;

export interface AdapterCorePublicFacade {
  readonly submitHostAction?: AdapterCoreFacadeMethod;
  readonly submitUserIntent?: AdapterCoreFacadeMethod;
  readonly listPendingPresentations?: AdapterCoreFacadeMethod;
  readonly claimPresentation?: AdapterCoreFacadeMethod;
  readonly markPresentationDelivered?: AdapterCoreFacadeMethod;
  readonly markPresentationFailed?: AdapterCoreFacadeMethod;
  readonly issueActionToken?: AdapterCoreFacadeMethod;
  readonly verifyActionToken?: AdapterCoreFacadeMethod;
  readonly consumeActionToken?: AdapterCoreFacadeMethod;
  readonly drainRuntimeOnce?: AdapterCoreFacadeMethod;
  readonly getWorkflowStatus?: AdapterCoreFacadeMethod;
  readonly getHealth?: AdapterCoreFacadeMethod;
  readonly getPortReadiness?: AdapterCoreFacadeMethod;
  readonly [methodName: string]: unknown;
}

export type AdapterCoreHostPort = object | AdapterCoreFacadeMethod;

export interface AdapterCoreHostPorts {
  readonly agentControlHost?: AdapterCoreHostPort;
  readonly sessionBindingStore?: AdapterCoreHostPort;
  readonly presentationOutboxStore?: AdapterCoreHostPort;
  readonly presentationActionTokenStore?: AdapterCoreHostPort;
  readonly runtimeDrain?: AdapterCoreHostPort;
  readonly workflowStatusReader?: AdapterCoreHostPort;
  readonly healthReader?: AdapterCoreHostPort;
  readonly readinessReader?: AdapterCoreHostPort;
  readonly auditReader?: AdapterCoreHostPort;
  readonly approvalReader?: AdapterCoreHostPort;
}

export interface AdapterCoreHostFactoryMetadataInput {
  readonly adapterId?: string;
  readonly adapterVersion?: string;
  readonly corePackageName?: string;
  readonly corePackageVersion?: string;
  readonly coreFacadeSource?: 'injected' | 'created' | 'unavailable' | (string & {});
  readonly notes?: readonly string[];
}

export interface AdapterCoreHostFactoryMetadata {
  readonly adapterId?: string;
  readonly adapterVersion?: string;
  readonly corePackageName: string;
  readonly corePackageVersion?: string;
  readonly coreFacadeSource: string;
  readonly notes: readonly string[];
}

export interface AdapterCoreHostFactoryInput {
  readonly facade?: AdapterCorePublicFacade;
  readonly ports?: AdapterCoreHostPorts;
  readonly metadata?: AdapterCoreHostFactoryMetadataInput;
  readonly context?: AdapterOperationContext;
}

export interface AdapterCoreHostBoundary {
  readonly facade?: AdapterCorePublicFacade;
  readonly ports: AdapterCoreHostPorts;
  readonly facadeMethods: readonly AdapterCoreFacadeMethodName[];
  readonly requiredFacadeMethods: readonly RequiredAdapterCoreFacadeMethodName[];
  readonly missingRequiredFacadeMethods: readonly RequiredAdapterCoreFacadeMethodName[];
  readonly configuredPorts: readonly AdapterCoreHostPortName[];
  readonly requiredPorts: readonly AdapterCoreHostRequiredPortName[];
  readonly missingRequiredPorts: readonly AdapterCoreHostRequiredPortName[];
  readonly readiness: OpenClawTelegramAdapterReadiness;
  readonly metadata: AdapterCoreHostFactoryMetadata;
}

export type AdapterCoreHostFactoryResult = AdapterOperationResult<AdapterCoreHostBoundary>;

const DEFAULT_CORE_PACKAGE_NAME = 'hazeteam-core';
const DEFAULT_CORE_FACADE_SOURCE_WITH_FACADE = 'injected';
const DEFAULT_CORE_FACADE_SOURCE_WITHOUT_FACADE = 'unavailable';
const MAX_METADATA_VALUE_LENGTH = 160;
const MAX_METADATA_NOTES = 12;
const UNSAFE_ASSIGNMENT_PATTERN = /\b[A-Za-z][A-Za-z0-9_-]{0,40}\b\s*[:=]\s*\S+/gu;

function isFacadeBoundary(value: unknown): value is AdapterCorePublicFacade {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function isPortsBoundary(value: unknown): value is AdapterCoreHostPorts {
  return typeof value === 'object' && value !== null;
}

function normalizeMetadataValue(fieldName: string, value: string): string {
  const normalized = value
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(UNSAFE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0) {
    throw new TypeError(`${fieldName} must be non-empty when provided.`);
  }

  if (normalized.length <= MAX_METADATA_VALUE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_METADATA_VALUE_LENGTH - 3)}...`;
}

function normalizeOptionalMetadataValue(fieldName: string, value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be a string when provided.`);
  }

  return normalizeMetadataValue(fieldName, value);
}

function normalizeMetadataNotes(notes: unknown): readonly string[] {
  if (notes === undefined) {
    return Object.freeze([]);
  }

  if (!Array.isArray(notes)) {
    throw new TypeError('metadata.notes must be an array when provided.');
  }

  return Object.freeze(
    notes.slice(0, MAX_METADATA_NOTES).map((note, index) => {
      if (typeof note !== 'string') {
        throw new TypeError(`metadata.notes[${index}] must be a string.`);
      }

      return normalizeMetadataValue(`metadata.notes[${index}]`, note);
    }),
  );
}

function createCoreHostFactoryMetadata(input: {
  readonly facade?: AdapterCorePublicFacade;
  readonly metadata?: AdapterCoreHostFactoryMetadataInput;
}): AdapterCoreHostFactoryMetadata {
  const metadata = input.metadata ?? {};
  const adapterId = normalizeOptionalMetadataValue('metadata.adapterId', metadata.adapterId);
  const adapterVersion = normalizeOptionalMetadataValue('metadata.adapterVersion', metadata.adapterVersion);
  const corePackageName =
    normalizeOptionalMetadataValue('metadata.corePackageName', metadata.corePackageName) ??
    DEFAULT_CORE_PACKAGE_NAME;
  const corePackageVersion = normalizeOptionalMetadataValue(
    'metadata.corePackageVersion',
    metadata.corePackageVersion,
  );
  const coreFacadeSource =
    normalizeOptionalMetadataValue('metadata.coreFacadeSource', metadata.coreFacadeSource) ??
    (input.facade === undefined
      ? DEFAULT_CORE_FACADE_SOURCE_WITHOUT_FACADE
      : DEFAULT_CORE_FACADE_SOURCE_WITH_FACADE);
  const notes = normalizeMetadataNotes(metadata.notes);

  return Object.freeze({
    ...(adapterId === undefined ? {} : { adapterId }),
    ...(adapterVersion === undefined ? {} : { adapterVersion }),
    corePackageName,
    ...(corePackageVersion === undefined ? {} : { corePackageVersion }),
    coreFacadeSource,
    notes,
  });
}

function cloneConfiguredPorts(ports: AdapterCoreHostPorts | undefined): AdapterCoreHostPorts {
  if (ports === undefined) {
    return Object.freeze({});
  }

  const clonedPorts: Partial<Record<AdapterCoreHostPortName, AdapterCoreHostPort>> = {};
  for (const portName of ADAPTER_CORE_HOST_PORT_NAMES) {
    const port = ports[portName];
    if (port !== undefined) {
      clonedPorts[portName] = port;
    }
  }

  return Object.freeze(clonedPorts) as AdapterCoreHostPorts;
}

export function getAvailableAdapterCoreFacadeMethods(
  facade?: AdapterCorePublicFacade,
): readonly AdapterCoreFacadeMethodName[] {
  if (facade === undefined) {
    return Object.freeze([]);
  }

  return Object.freeze(
    ADAPTER_CORE_FACADE_METHOD_NAMES.filter((methodName) => typeof facade[methodName] === 'function'),
  );
}

export function getMissingRequiredAdapterCoreFacadeMethods(
  facade?: AdapterCorePublicFacade,
): readonly RequiredAdapterCoreFacadeMethodName[] {
  const configuredMethods = new Set<AdapterCoreFacadeMethodName>(
    getAvailableAdapterCoreFacadeMethods(facade),
  );

  return Object.freeze(
    REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES.filter((methodName) => !configuredMethods.has(methodName)),
  );
}

export function getConfiguredAdapterCoreHostPorts(
  ports?: AdapterCoreHostPorts,
): readonly AdapterCoreHostPortName[] {
  if (ports === undefined) {
    return Object.freeze([]);
  }

  return Object.freeze(ADAPTER_CORE_HOST_PORT_NAMES.filter((portName) => ports[portName] !== undefined));
}

export function getMissingRequiredAdapterCoreHostPorts(
  ports?: AdapterCoreHostPorts,
): readonly AdapterCoreHostRequiredPortName[] {
  const configuredPorts = new Set<AdapterCoreHostPortName>(getConfiguredAdapterCoreHostPorts(ports));

  return Object.freeze(
    REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES.filter((portName) => !configuredPorts.has(portName)),
  );
}

export function summarizeAdapterCoreHostReadiness(input: {
  readonly facade?: AdapterCorePublicFacade;
  readonly ports?: AdapterCoreHostPorts;
}): OpenClawTelegramAdapterReadiness {
  const missingRequiredFacadeMethods = getMissingRequiredAdapterCoreFacadeMethods(input.facade);
  const missingRequiredPorts = getMissingRequiredAdapterCoreHostPorts(input.ports);
  const configuredOptionalPorts = OPTIONAL_ADAPTER_CORE_HOST_PORT_NAMES.filter(
    (portName) => input.ports?.[portName] !== undefined,
  );

  const checks = [
    createAdapterReadinessCheck({
      component: 'core',
      status: input.facade === undefined ? 'fail' : 'pass',
      message:
        input.facade === undefined
          ? 'Core interaction facade is not injected; public core package integration is not configured.'
          : 'Core interaction facade is injected as an adapter-owned structural boundary.',
    }),
    createAdapterReadinessCheck({
      component: 'core.facade',
      status: missingRequiredFacadeMethods.length === 0 ? 'pass' : 'fail',
      message:
        missingRequiredFacadeMethods.length === 0
          ? 'Required core facade methods are available on the injected boundary.'
          : `Missing required core facade methods: ${missingRequiredFacadeMethods.join(', ')}.`,
    }),
    createAdapterReadinessCheck({
      component: 'core.ports',
      status: missingRequiredPorts.length === 0 ? 'pass' : 'fail',
      message:
        missingRequiredPorts.length === 0
          ? 'Required core host ports are injected.'
          : `Missing required core host ports: ${missingRequiredPorts.join(', ')}.`,
    }),
    ...configuredOptionalPorts.map((portName) =>
      createAdapterReadinessCheck({
        component: `core.optional-${portName}`,
        status: 'pass',
        message: `Optional core host port ${portName} is injected.`,
      }),
    ),
  ];

  return summarizeAdapterReadiness({ checks });
}

function invalidInputResult(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterCoreHostFactoryResult {
  return adapterErr(
    createAdapterSafeError({
      code: 'invalid-input',
      message,
    }),
    context,
  );
}

export function createAdapterCoreHostFactory(
  input: AdapterCoreHostFactoryInput = {},
): AdapterCoreHostFactoryResult {
  if (input.facade !== undefined && !isFacadeBoundary(input.facade)) {
    return invalidInputResult('Core interaction facade must be an object or function when provided.', input.context);
  }

  if (input.ports !== undefined && !isPortsBoundary(input.ports)) {
    return invalidInputResult('Core host ports must be an object when provided.', input.context);
  }

  try {
    const ports = cloneConfiguredPorts(input.ports);
    const facadeMethods = getAvailableAdapterCoreFacadeMethods(input.facade);
    const missingRequiredFacadeMethods = getMissingRequiredAdapterCoreFacadeMethods(input.facade);
    const configuredPorts = getConfiguredAdapterCoreHostPorts(ports);
    const missingRequiredPorts = getMissingRequiredAdapterCoreHostPorts(ports);
    const metadata = createCoreHostFactoryMetadata(input);
    const readiness = summarizeAdapterCoreHostReadiness({
      ...(input.facade === undefined ? {} : { facade: input.facade }),
      ports,
    });

    return adapterOk(
      Object.freeze({
        ...(input.facade === undefined ? {} : { facade: input.facade }),
        ports,
        facadeMethods,
        requiredFacadeMethods: Object.freeze([...REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES]),
        missingRequiredFacadeMethods,
        configuredPorts,
        requiredPorts: Object.freeze([...REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES]),
        missingRequiredPorts,
        readiness,
        metadata,
      }),
      input.context,
    );
  } catch (error) {
    return invalidInputResult(
      error instanceof Error ? error.message : 'Core host factory input is invalid.',
      input.context,
    );
  }
}
