import type { AdapterOperationContext } from '../../contracts/context.js';
import type {
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AgentRef,
  ActorRef,
  OpenClawAdapterRef,
  OpenClawAdapterRefKind,
  WorkspaceRef,
} from '../../contracts/refs.js';
import { parseOpenClawAdapterRef } from '../../contracts/refs.js';
import type { AdapterOperationResult } from '../../contracts/result.js';
import { adapterErr, adapterOk, createAdapterSafeError } from '../../contracts/result.js';
import type { OpenClawTelegramAdapterReadiness } from '../../contracts/readiness.js';
import { createAdapterReadinessCheck, summarizeAdapterReadiness } from '../../contracts/readiness.js';
import type { AdapterCoreHostPorts } from '../../host/core-host-factory.js';

export const DURABLE_CORE_STORE_ADAPTER_NAMES = [
  'sessionBindingStore',
  'presentationOutboxStore',
  'presentationActionTokenStore',
] as const;

export type DurableCoreStoreAdapterName = (typeof DURABLE_CORE_STORE_ADAPTER_NAMES)[number];

export type DurableCoreRecordKind =
  | 'core.session-binding'
  | 'core.presentation-outbox'
  | 'core.action-token';

export type DurableCoreSessionBindingStatus = 'active' | 'superseded' | 'expired' | 'revoked';

export type DurableCorePresentationOutboxStatus =
  | 'pending'
  | 'claimed'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type DurableCoreActionTokenStatus = 'issued' | 'verified' | 'consumed' | 'expired' | 'revoked';

export interface DurableCoreSerializedRecordDescriptor {
  readonly format: string;
  readonly contentRef?: OpenClawAdapterRef;
  readonly summary?: string;
}

export interface DurableCoreSafeRecordBase {
  readonly recordKind: DurableCoreRecordKind;
  readonly recordKey: string;
  readonly updatedByOperationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly safeMessage?: string;
  readonly serializedPayloadDescriptor?: DurableCoreSerializedRecordDescriptor;
}

export interface DurableCoreSessionBindingRecord extends DurableCoreSafeRecordBase {
  readonly recordKind: 'core.session-binding';
  readonly externalSessionRef: OpenClawAdapterRef;
  readonly hostSessionRef: OpenClawAdapterRef;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly actorRef?: ActorRef;
  readonly status: DurableCoreSessionBindingStatus;
}

export interface DurableCorePresentationOutboxRecord extends DurableCoreSafeRecordBase {
  readonly recordKind: 'core.presentation-outbox';
  readonly presentationRef: OpenClawAdapterRef;
  readonly status: DurableCorePresentationOutboxStatus;
  readonly claimRef?: OpenClawAdapterRef;
  readonly deliveryRequestRef?: OpenClawAdapterRef;
  readonly externalMessageRef?: OpenClawAdapterRef;
  readonly attemptRef?: OpenClawAdapterRef;
}

export interface DurableCoreActionTokenRecord extends DurableCoreSafeRecordBase {
  readonly recordKind: 'core.action-token';
  readonly actionTokenRef: OpenClawAdapterRef;
  readonly presentationRef?: OpenClawAdapterRef;
  readonly actorRef?: ActorRef;
  readonly status: DurableCoreActionTokenStatus;
  readonly issuedByOperationRef?: AdapterOperationRef;
  readonly consumedByOperationRef?: AdapterOperationRef;
}

export interface DurableCoreRecordListInput {
  readonly status?: string;
  readonly limit?: number;
}

export type MaybePromise<T> = T | Promise<T>;

export interface DurableCoreRecordStore<TRecord extends DurableCoreSafeRecordBase> {
  readonly get: (recordKey: string) => MaybePromise<unknown | null | undefined>;
  readonly put: (record: TRecord) => MaybePromise<unknown>;
  readonly delete?: (recordKey: string) => MaybePromise<unknown>;
  readonly list?: (input?: DurableCoreRecordListInput) => MaybePromise<readonly unknown[]>;
}

export interface DurableCoreStoreAdapterBoundaries {
  readonly sessionBindingStore?: DurableCoreRecordStore<DurableCoreSessionBindingRecord>;
  readonly presentationOutboxStore?: DurableCoreRecordStore<DurableCorePresentationOutboxRecord>;
  readonly presentationActionTokenStore?: DurableCoreRecordStore<DurableCoreActionTokenRecord>;
}

export interface DurableCoreStoreAdapterBundleInput {
  readonly boundaries?: DurableCoreStoreAdapterBoundaries;
  readonly context?: AdapterOperationContext;
}

export interface DurableCoreStoreAdapterBundle {
  readonly adapters: DurableCoreStoreAdapters;
  readonly ports: DurableCoreHostStorePorts;
  readonly configuredStores: readonly DurableCoreStoreAdapterName[];
  readonly missingStores: readonly DurableCoreStoreAdapterName[];
  readonly readiness: OpenClawTelegramAdapterReadiness;
}

export interface DurableCoreStoreAdapters {
  readonly sessionBindingStore?: DurableCoreSessionBindingStoreAdapter;
  readonly presentationOutboxStore?: DurableCorePresentationOutboxStoreAdapter;
  readonly presentationActionTokenStore?: DurableCorePresentationActionTokenStoreAdapter;
}

export type DurableCoreHostStorePorts = Pick<AdapterCoreHostPorts, DurableCoreStoreAdapterName>;

export interface DurableCoreSessionBindingStoreAdapter {
  readonly get: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreSessionBindingRecord | undefined>>;
  readonly put: (
    record: unknown,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreSessionBindingRecord>>;
  readonly delete: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<{ readonly deleted: true }>>;
  readonly list: (
    input?: DurableCoreRecordListInput,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<readonly DurableCoreSessionBindingRecord[]>>;
  readonly getSessionBinding: DurableCoreSessionBindingStoreAdapter['get'];
  readonly putSessionBinding: DurableCoreSessionBindingStoreAdapter['put'];
}

export interface DurableCorePresentationOutboxStoreAdapter {
  readonly get: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCorePresentationOutboxRecord | undefined>>;
  readonly put: (
    record: unknown,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCorePresentationOutboxRecord>>;
  readonly delete: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<{ readonly deleted: true }>>;
  readonly list: (
    input?: DurableCoreRecordListInput,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<readonly DurableCorePresentationOutboxRecord[]>>;
  readonly getPresentationOutboxRecord: DurableCorePresentationOutboxStoreAdapter['get'];
  readonly putPresentationOutboxRecord: DurableCorePresentationOutboxStoreAdapter['put'];
  readonly listPendingPresentationOutboxRecords: (
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<readonly DurableCorePresentationOutboxRecord[]>>;
}

export interface DurableCorePresentationActionTokenStoreAdapter {
  readonly get: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreActionTokenRecord | undefined>>;
  readonly put: (
    record: unknown,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreActionTokenRecord>>;
  readonly delete: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<{ readonly deleted: true }>>;
  readonly list: (
    input?: DurableCoreRecordListInput,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<readonly DurableCoreActionTokenRecord[]>>;
  readonly consumeActionTokenRecord: (
    recordKey: string,
    input?: DurableCoreActionTokenConsumeInput,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreActionTokenRecord>>;
  readonly getActionTokenRecord: DurableCorePresentationActionTokenStoreAdapter['get'];
  readonly putActionTokenRecord: DurableCorePresentationActionTokenStoreAdapter['put'];
}

export interface DurableCoreActionTokenConsumeInput {
  readonly consumedByOperationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly safeMessage?: string;
}

const RECORD_KEY_PATTERN = /^[A-Za-z0-9._~:-]+$/u;
const MAX_RECORD_KEY_LENGTH = 256;
const MAX_SAFE_MESSAGE_LENGTH = 240;
const MAX_DESCRIPTOR_FORMAT_LENGTH = 80;
const SESSION_BINDING_STATUSES = ['active', 'superseded', 'expired', 'revoked'] as const;
const PRESENTATION_OUTBOX_STATUSES = ['pending', 'claimed', 'delivered', 'failed', 'cancelled'] as const;
const ACTION_TOKEN_STATUSES = ['issued', 'verified', 'consumed', 'expired', 'revoked'] as const;
const SAFE_DESCRIPTOR_FORMAT_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const SENSITIVE_ASSIGNMENT_TERMS = [
  ['bot', 'token'].join('[_-]?'),
  ['api', 'key'].join('[_-]?'),
  'authorization',
  'password',
  'passwd',
  ['sec', 'ret'].join(''),
  'credential',
];
const SENSITIVE_ASSIGNMENT_PATTERN = new RegExp(
  `\\b(?:${SENSITIVE_ASSIGNMENT_TERMS.join('|')})\\b\\s*[:=]\\s*\\S+`,
  'giu',
);

const BASE_RECORD_ALLOWED_KEYS = [
  'recordKind',
  'recordKey',
  'updatedByOperationRef',
  'correlationRef',
  'detailsRef',
  'safeMessage',
  'serializedPayloadDescriptor',
] as const;

const SESSION_BINDING_ALLOWED_KEYS = new Set([
  ...BASE_RECORD_ALLOWED_KEYS,
  'externalSessionRef',
  'hostSessionRef',
  'workspaceRef',
  'agentRef',
  'actorRef',
  'status',
]);

const PRESENTATION_OUTBOX_ALLOWED_KEYS = new Set([
  ...BASE_RECORD_ALLOWED_KEYS,
  'presentationRef',
  'status',
  'claimRef',
  'deliveryRequestRef',
  'externalMessageRef',
  'attemptRef',
]);

const ACTION_TOKEN_ALLOWED_KEYS = new Set([
  ...BASE_RECORD_ALLOWED_KEYS,
  'actionTokenRef',
  'presentationRef',
  'actorRef',
  'status',
  'issuedByOperationRef',
  'consumedByOperationRef',
]);

const SERIALIZED_DESCRIPTOR_ALLOWED_KEYS = new Set(['format', 'contentRef', 'summary']);
const ACTION_TOKEN_CONSUME_ALLOWED_KEYS = new Set([
  'consumedByOperationRef',
  'correlationRef',
  'detailsRef',
  'safeMessage',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new TypeError(`${label} contains unsupported fields.`);
    }
  }
}

function normalizeRecordKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('recordKey must be a string.');
  }

  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_RECORD_KEY_LENGTH ||
    !RECORD_KEY_PATTERN.test(normalized)
  ) {
    throw new TypeError('recordKey must be a non-empty safe identifier.');
  }

  return normalized;
}

function normalizeOptionalSafeMessage(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new TypeError('safeMessage must be a string when provided.');
  }

  const normalized = value
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0) {
    return undefined;
  }

  if (normalized.length <= MAX_SAFE_MESSAGE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_SAFE_MESSAGE_LENGTH - 3)}...`;
}

function normalizeAdapterRef<TRef extends OpenClawAdapterRef>(
  fieldName: string,
  value: unknown,
  expectedKind?: OpenClawAdapterRefKind,
): TRef {
  const parsed = parseOpenClawAdapterRef(value);
  if (parsed === null || (expectedKind !== undefined && parsed.kind !== expectedKind)) {
    throw new TypeError(`${fieldName} must be a safe adapter ref.`);
  }

  return parsed.ref as TRef;
}

function normalizeOptionalAdapterRef<TRef extends OpenClawAdapterRef>(
  fieldName: string,
  value: unknown,
  expectedKind?: OpenClawAdapterRefKind,
): TRef | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeAdapterRef<TRef>(fieldName, value, expectedKind);
}

function normalizeRecordKind(
  value: unknown,
  expectedKind: DurableCoreRecordKind,
  label: string,
): DurableCoreRecordKind {
  if (value === undefined) {
    return expectedKind;
  }

  if (value !== expectedKind) {
    throw new TypeError(`${label} has an unsupported record kind.`);
  }

  return expectedKind;
}

function normalizeStatus<TStatus extends string>(
  fieldName: string,
  value: unknown,
  allowedStatuses: readonly TStatus[],
): TStatus {
  if (typeof value !== 'string' || !allowedStatuses.includes(value as TStatus)) {
    throw new TypeError(`${fieldName} has an unsupported status.`);
  }

  return value as TStatus;
}

function normalizeOptionalLimit(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value <= 0 || value > 1_000) {
    throw new TypeError('limit must be a positive integer no greater than 1000 when provided.');
  }

  return value;
}

function normalizeSerializedPayloadDescriptor(
  value: unknown,
): DurableCoreSerializedRecordDescriptor | undefined {
  if (value === undefined) {
    return undefined;
  }

  assertRecord(value, 'serializedPayloadDescriptor');
  assertAllowedKeys(value, SERIALIZED_DESCRIPTOR_ALLOWED_KEYS, 'serializedPayloadDescriptor');

  if (typeof value.format !== 'string') {
    throw new TypeError('serializedPayloadDescriptor.format must be a string.');
  }

  const format = value.format.trim();
  if (
    format.length === 0 ||
    format.length > MAX_DESCRIPTOR_FORMAT_LENGTH ||
    !SAFE_DESCRIPTOR_FORMAT_PATTERN.test(format)
  ) {
    throw new TypeError('serializedPayloadDescriptor.format must be a safe identifier.');
  }

  const contentRef = normalizeOptionalAdapterRef('serializedPayloadDescriptor.contentRef', value.contentRef);
  const summary = normalizeOptionalSafeMessage(value.summary);

  return Object.freeze({
    format,
    ...(contentRef === undefined ? {} : { contentRef }),
    ...(summary === undefined ? {} : { summary }),
  });
}

function normalizeBaseRecord(input: {
  readonly record: Record<string, unknown>;
  readonly expectedKind: DurableCoreRecordKind;
  readonly label: string;
}): DurableCoreSafeRecordBase {
  return Object.freeze({
    recordKind: normalizeRecordKind(input.record.recordKind, input.expectedKind, input.label),
    recordKey: normalizeRecordKey(input.record.recordKey),
    ...optionalRecordRef('updatedByOperationRef', input.record.updatedByOperationRef, 'operation'),
    ...optionalRecordRef('correlationRef', input.record.correlationRef, 'correlation'),
    ...optionalRecordRef('detailsRef', input.record.detailsRef, 'details'),
    ...optionalSafeMessageField(input.record.safeMessage),
    ...optionalSerializedDescriptorField(input.record.serializedPayloadDescriptor),
  });
}

function optionalRecordRef<TRef extends OpenClawAdapterRef>(
  fieldName: string,
  value: unknown,
  expectedKind?: OpenClawAdapterRefKind,
): { readonly [key: string]: TRef } | Record<string, never> {
  const ref = normalizeOptionalAdapterRef<TRef>(fieldName, value, expectedKind);
  return ref === undefined ? {} : { [fieldName]: ref };
}

function optionalSafeMessageField(
  value: unknown,
): { readonly safeMessage: string } | Record<string, never> {
  const safeMessage = normalizeOptionalSafeMessage(value);
  return safeMessage === undefined ? {} : { safeMessage };
}

function optionalSerializedDescriptorField(
  value: unknown,
): { readonly serializedPayloadDescriptor: DurableCoreSerializedRecordDescriptor } | Record<string, never> {
  const descriptor = normalizeSerializedPayloadDescriptor(value);
  return descriptor === undefined ? {} : { serializedPayloadDescriptor: descriptor };
}

function normalizeListInput(input: unknown): DurableCoreRecordListInput {
  if (input === undefined) {
    return Object.freeze({});
  }

  assertRecord(input, 'list input');
  assertAllowedKeys(input, new Set(['status', 'limit']), 'list input');

  const limit = normalizeOptionalLimit(input.limit);
  return Object.freeze({
    ...(input.status === undefined ? {} : { status: normalizeRecordKey(input.status) }),
    ...(limit === undefined ? {} : { limit }),
  });
}

function invalidInputResult<T>(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(
    createAdapterSafeError({
      code: 'invalid-input',
      message,
    }),
    context,
  );
}

function dependencyMissingResult<T>(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(
    createAdapterSafeError({
      code: 'dependency-missing',
      message,
    }),
    context,
  );
}

function dependencyFailedResult<T>(
  storeName: DurableCoreStoreAdapterName,
  operation: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(
    createAdapterSafeError({
      code: 'dependency-failed',
      message: `Durable core ${storeName} boundary failed during ${operation}.`,
      retryable: true,
    }),
    context,
  );
}

function notFoundResult<T>(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(
    createAdapterSafeError({
      code: 'not-found',
      message,
    }),
    context,
  );
}

function conflictResult<T>(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(
    createAdapterSafeError({
      code: 'conflict',
      message,
    }),
    context,
  );
}

function isDurableCoreRecordStore(value: unknown): value is DurableCoreRecordStore<DurableCoreSafeRecordBase> {
  return (
    isRecord(value) &&
    typeof value.get === 'function' &&
    typeof value.put === 'function' &&
    (value.delete === undefined || typeof value.delete === 'function') &&
    (value.list === undefined || typeof value.list === 'function')
  );
}

function assertDurableCoreRecordStore(
  value: unknown,
  storeName: DurableCoreStoreAdapterName,
): asserts value is DurableCoreRecordStore<DurableCoreSafeRecordBase> {
  if (!isDurableCoreRecordStore(value)) {
    throw new TypeError(`Durable core ${storeName} boundary must expose get and put functions.`);
  }
}

async function getNormalizedRecord<TRecord extends DurableCoreSafeRecordBase>(input: {
  readonly storeName: DurableCoreStoreAdapterName;
  readonly boundary: DurableCoreRecordStore<TRecord>;
  readonly recordKey: string;
  readonly normalize: (record: unknown) => TRecord;
  readonly context?: AdapterOperationContext;
}): Promise<AdapterOperationResult<TRecord | undefined>> {
  const recordKey = normalizeRecordKey(input.recordKey);
  let rawRecord: unknown | null | undefined;

  try {
    rawRecord = await input.boundary.get(recordKey);
  } catch {
    return dependencyFailedResult(input.storeName, 'read', input.context);
  }

  if (rawRecord === undefined || rawRecord === null) {
    return adapterOk(undefined, input.context);
  }

  try {
    return adapterOk(input.normalize(rawRecord), input.context);
  } catch (error) {
    return invalidInputResult(
      error instanceof Error ? error.message : 'Durable core record is malformed.',
      input.context,
    );
  }
}

async function putNormalizedRecord<TRecord extends DurableCoreSafeRecordBase>(input: {
  readonly storeName: DurableCoreStoreAdapterName;
  readonly boundary: DurableCoreRecordStore<TRecord>;
  readonly record: unknown;
  readonly normalize: (record: unknown) => TRecord;
  readonly context?: AdapterOperationContext;
}): Promise<AdapterOperationResult<TRecord>> {
  let record: TRecord;
  try {
    record = input.normalize(input.record);
  } catch (error) {
    return invalidInputResult(
      error instanceof Error ? error.message : 'Durable core record is malformed.',
      input.context,
    );
  }

  try {
    await input.boundary.put(record);
  } catch {
    return dependencyFailedResult(input.storeName, 'write', input.context);
  }

  return adapterOk(record, input.context);
}

async function deleteRecord(input: {
  readonly storeName: DurableCoreStoreAdapterName;
  readonly boundary: DurableCoreRecordStore<DurableCoreSafeRecordBase>;
  readonly recordKey: string;
  readonly context?: AdapterOperationContext;
}): Promise<AdapterOperationResult<{ readonly deleted: true }>> {
  if (input.boundary.delete === undefined) {
    return dependencyMissingResult(
      `Durable core ${input.storeName} boundary does not expose delete.`,
      input.context,
    );
  }

  const recordKey = normalizeRecordKey(input.recordKey);

  try {
    await input.boundary.delete(recordKey);
  } catch {
    return dependencyFailedResult(input.storeName, 'delete', input.context);
  }

  return adapterOk(Object.freeze({ deleted: true as const }), input.context);
}

async function listNormalizedRecords<TRecord extends DurableCoreSafeRecordBase>(input: {
  readonly storeName: DurableCoreStoreAdapterName;
  readonly boundary: DurableCoreRecordStore<TRecord>;
  readonly filter?: DurableCoreRecordListInput;
  readonly normalize: (record: unknown) => TRecord;
  readonly context?: AdapterOperationContext;
}): Promise<AdapterOperationResult<readonly TRecord[]>> {
  if (input.boundary.list === undefined) {
    return dependencyMissingResult(
      `Durable core ${input.storeName} boundary does not expose list.`,
      input.context,
    );
  }

  let rawRecords: readonly unknown[];
  try {
    rawRecords = await input.boundary.list(input.filter);
  } catch {
    return dependencyFailedResult(input.storeName, 'list', input.context);
  }

  try {
    const normalized = rawRecords.map((record) => input.normalize(record));
    const status = input.filter?.status;
    const filtered =
      status === undefined
        ? normalized
        : normalized.filter((record) => 'status' in record && record.status === status);
    const limited = input.filter?.limit === undefined ? filtered : filtered.slice(0, input.filter.limit);
    return adapterOk(Object.freeze(limited), input.context);
  } catch (error) {
    return invalidInputResult(
      error instanceof Error ? error.message : 'Durable core records are malformed.',
      input.context,
    );
  }
}

export function normalizeDurableCoreSessionBindingRecord(
  input: unknown,
): DurableCoreSessionBindingRecord {
  assertRecord(input, 'session binding record');
  assertAllowedKeys(input, SESSION_BINDING_ALLOWED_KEYS, 'session binding record');
  const baseRecord = normalizeBaseRecord({
    record: input,
    expectedKind: 'core.session-binding',
    label: 'session binding record',
  });

  return Object.freeze({
    ...baseRecord,
    recordKind: 'core.session-binding' as const,
    externalSessionRef: normalizeAdapterRef('externalSessionRef', input.externalSessionRef),
    hostSessionRef: normalizeAdapterRef('hostSessionRef', input.hostSessionRef),
    ...optionalRecordRef<WorkspaceRef>('workspaceRef', input.workspaceRef, 'workspace'),
    ...optionalRecordRef<AgentRef>('agentRef', input.agentRef, 'agent'),
    ...optionalRecordRef<ActorRef>('actorRef', input.actorRef, 'actor'),
    status: normalizeStatus('status', input.status, SESSION_BINDING_STATUSES),
  });
}

export function normalizeDurableCorePresentationOutboxRecord(
  input: unknown,
): DurableCorePresentationOutboxRecord {
  assertRecord(input, 'presentation outbox record');
  assertAllowedKeys(input, PRESENTATION_OUTBOX_ALLOWED_KEYS, 'presentation outbox record');
  const baseRecord = normalizeBaseRecord({
    record: input,
    expectedKind: 'core.presentation-outbox',
    label: 'presentation outbox record',
  });

  return Object.freeze({
    ...baseRecord,
    recordKind: 'core.presentation-outbox' as const,
    presentationRef: normalizeAdapterRef('presentationRef', input.presentationRef),
    status: normalizeStatus('status', input.status, PRESENTATION_OUTBOX_STATUSES),
    ...optionalRecordRef('claimRef', input.claimRef),
    ...optionalRecordRef('deliveryRequestRef', input.deliveryRequestRef),
    ...optionalRecordRef('externalMessageRef', input.externalMessageRef),
    ...optionalRecordRef('attemptRef', input.attemptRef),
  });
}

export function normalizeDurableCoreActionTokenRecord(input: unknown): DurableCoreActionTokenRecord {
  assertRecord(input, 'action token record');
  assertAllowedKeys(input, ACTION_TOKEN_ALLOWED_KEYS, 'action token record');
  const baseRecord = normalizeBaseRecord({
    record: input,
    expectedKind: 'core.action-token',
    label: 'action token record',
  });

  return Object.freeze({
    ...baseRecord,
    recordKind: 'core.action-token' as const,
    actionTokenRef: normalizeAdapterRef('actionTokenRef', input.actionTokenRef),
    ...optionalRecordRef('presentationRef', input.presentationRef),
    ...optionalRecordRef<ActorRef>('actorRef', input.actorRef, 'actor'),
    status: normalizeStatus('status', input.status, ACTION_TOKEN_STATUSES),
    ...optionalRecordRef<AdapterOperationRef>(
      'issuedByOperationRef',
      input.issuedByOperationRef,
      'operation',
    ),
    ...optionalRecordRef<AdapterOperationRef>(
      'consumedByOperationRef',
      input.consumedByOperationRef,
      'operation',
    ),
  });
}

export function summarizeDurableCoreStoreReadiness(
  boundaries: DurableCoreStoreAdapterBoundaries = {},
): OpenClawTelegramAdapterReadiness {
  const checks = DURABLE_CORE_STORE_ADAPTER_NAMES.map((storeName) => {
    const boundary = boundaries[storeName];
    return createAdapterReadinessCheck({
      component: `storage.core.${storeName}`,
      status: isDurableCoreRecordStore(boundary) ? 'pass' : 'fail',
      message: isDurableCoreRecordStore(boundary)
        ? `Durable core ${storeName} boundary is configured.`
        : `Durable core ${storeName} boundary is missing or malformed.`,
    });
  });

  return summarizeAdapterReadiness({ checks });
}

export function createDurableCoreSessionBindingStoreAdapter(
  boundary: DurableCoreRecordStore<DurableCoreSessionBindingRecord>,
): DurableCoreSessionBindingStoreAdapter {
  assertDurableCoreRecordStore(boundary, 'sessionBindingStore');

  const get = (recordKey: string, context?: AdapterOperationContext) =>
    getNormalizedRecord({
      storeName: 'sessionBindingStore',
      boundary,
      recordKey,
      normalize: normalizeDurableCoreSessionBindingRecord,
      context,
    });
  const put = (record: unknown, context?: AdapterOperationContext) =>
    putNormalizedRecord({
      storeName: 'sessionBindingStore',
      boundary,
      record,
      normalize: normalizeDurableCoreSessionBindingRecord,
      context,
    });
  const remove = (recordKey: string, context?: AdapterOperationContext) =>
    deleteRecord({ storeName: 'sessionBindingStore', boundary, recordKey, context });
  const list = (input?: DurableCoreRecordListInput, context?: AdapterOperationContext) => {
    const filter = normalizeListInput(input);
    return listNormalizedRecords({
      storeName: 'sessionBindingStore',
      boundary,
      filter,
      normalize: normalizeDurableCoreSessionBindingRecord,
      context,
    });
  };

  return Object.freeze({
    get,
    put,
    delete: remove,
    list,
    getSessionBinding: get,
    putSessionBinding: put,
  });
}

export function createDurableCorePresentationOutboxStoreAdapter(
  boundary: DurableCoreRecordStore<DurableCorePresentationOutboxRecord>,
): DurableCorePresentationOutboxStoreAdapter {
  assertDurableCoreRecordStore(boundary, 'presentationOutboxStore');

  const get = (recordKey: string, context?: AdapterOperationContext) =>
    getNormalizedRecord({
      storeName: 'presentationOutboxStore',
      boundary,
      recordKey,
      normalize: normalizeDurableCorePresentationOutboxRecord,
      context,
    });
  const put = (record: unknown, context?: AdapterOperationContext) =>
    putNormalizedRecord({
      storeName: 'presentationOutboxStore',
      boundary,
      record,
      normalize: normalizeDurableCorePresentationOutboxRecord,
      context,
    });
  const remove = (recordKey: string, context?: AdapterOperationContext) =>
    deleteRecord({ storeName: 'presentationOutboxStore', boundary, recordKey, context });
  const list = (input?: DurableCoreRecordListInput, context?: AdapterOperationContext) => {
    const filter = normalizeListInput(input);
    return listNormalizedRecords({
      storeName: 'presentationOutboxStore',
      boundary,
      filter,
      normalize: normalizeDurableCorePresentationOutboxRecord,
      context,
    });
  };
  const listPendingPresentationOutboxRecords = (context?: AdapterOperationContext) =>
    list(Object.freeze({ status: 'pending' }), context);

  return Object.freeze({
    get,
    put,
    delete: remove,
    list,
    getPresentationOutboxRecord: get,
    putPresentationOutboxRecord: put,
    listPendingPresentationOutboxRecords,
  });
}

export function createDurableCorePresentationActionTokenStoreAdapter(
  boundary: DurableCoreRecordStore<DurableCoreActionTokenRecord>,
): DurableCorePresentationActionTokenStoreAdapter {
  assertDurableCoreRecordStore(boundary, 'presentationActionTokenStore');

  const get = (recordKey: string, context?: AdapterOperationContext) =>
    getNormalizedRecord({
      storeName: 'presentationActionTokenStore',
      boundary,
      recordKey,
      normalize: normalizeDurableCoreActionTokenRecord,
      context,
    });
  const put = (record: unknown, context?: AdapterOperationContext) =>
    putNormalizedRecord({
      storeName: 'presentationActionTokenStore',
      boundary,
      record,
      normalize: normalizeDurableCoreActionTokenRecord,
      context,
    });
  const remove = (recordKey: string, context?: AdapterOperationContext) =>
    deleteRecord({ storeName: 'presentationActionTokenStore', boundary, recordKey, context });
  const list = (input?: DurableCoreRecordListInput, context?: AdapterOperationContext) => {
    const filter = normalizeListInput(input);
    return listNormalizedRecords({
      storeName: 'presentationActionTokenStore',
      boundary,
      filter,
      normalize: normalizeDurableCoreActionTokenRecord,
      context,
    });
  };
  const consumeActionTokenRecord = async (
    recordKey: string,
    input?: DurableCoreActionTokenConsumeInput,
    context?: AdapterOperationContext,
  ): Promise<AdapterOperationResult<DurableCoreActionTokenRecord>> => {
    const lookup = await get(recordKey, context);
    if (!lookup.ok) {
      return lookup;
    }

    if (lookup.value === undefined) {
      return notFoundResult('Durable core action token record was not found.', context);
    }

    if (lookup.value.status === 'consumed') {
      return conflictResult('Durable core action token record is already consumed.', context);
    }

    if (lookup.value.status === 'expired' || lookup.value.status === 'revoked') {
      return conflictResult('Durable core action token record is not consumable.', context);
    }

    let consumeInput: DurableCoreActionTokenConsumeInput;
    try {
      consumeInput = normalizeActionTokenConsumeInput(input);
    } catch (error) {
      return invalidInputResult(
        error instanceof Error ? error.message : 'Durable core action token consume input is malformed.',
        context,
      );
    }

    const consumed = normalizeDurableCoreActionTokenRecord({
      ...lookup.value,
      status: 'consumed',
      ...(consumeInput.consumedByOperationRef === undefined
        ? {}
        : { consumedByOperationRef: consumeInput.consumedByOperationRef }),
      ...(consumeInput.correlationRef === undefined ? {} : { correlationRef: consumeInput.correlationRef }),
      ...(consumeInput.detailsRef === undefined ? {} : { detailsRef: consumeInput.detailsRef }),
      ...(consumeInput.safeMessage === undefined ? {} : { safeMessage: consumeInput.safeMessage }),
    });

    return put(consumed, context);
  };

  return Object.freeze({
    get,
    put,
    delete: remove,
    list,
    consumeActionTokenRecord,
    getActionTokenRecord: get,
    putActionTokenRecord: put,
  });
}

function normalizeActionTokenConsumeInput(input: unknown): DurableCoreActionTokenConsumeInput {
  if (input === undefined) {
    return Object.freeze({});
  }

  assertRecord(input, 'action token consume input');
  assertAllowedKeys(input, ACTION_TOKEN_CONSUME_ALLOWED_KEYS, 'action token consume input');

  return Object.freeze({
    ...optionalRecordRef<AdapterOperationRef>(
      'consumedByOperationRef',
      input.consumedByOperationRef,
      'operation',
    ),
    ...optionalRecordRef<AdapterCorrelationRef>('correlationRef', input.correlationRef, 'correlation'),
    ...optionalRecordRef<AdapterDetailsRef>('detailsRef', input.detailsRef, 'details'),
    ...optionalSafeMessageField(input.safeMessage),
  });
}

function createAdapters(
  boundaries: DurableCoreStoreAdapterBoundaries,
): DurableCoreStoreAdapters {
  return Object.freeze({
    ...(boundaries.sessionBindingStore === undefined
      ? {}
      : { sessionBindingStore: createDurableCoreSessionBindingStoreAdapter(boundaries.sessionBindingStore) }),
    ...(boundaries.presentationOutboxStore === undefined
      ? {}
      : {
          presentationOutboxStore: createDurableCorePresentationOutboxStoreAdapter(
            boundaries.presentationOutboxStore,
          ),
        }),
    ...(boundaries.presentationActionTokenStore === undefined
      ? {}
      : {
          presentationActionTokenStore: createDurableCorePresentationActionTokenStoreAdapter(
            boundaries.presentationActionTokenStore,
          ),
        }),
  });
}

function createPorts(adapters: DurableCoreStoreAdapters): DurableCoreHostStorePorts {
  return Object.freeze({
    ...(adapters.sessionBindingStore === undefined
      ? {}
      : { sessionBindingStore: adapters.sessionBindingStore }),
    ...(adapters.presentationOutboxStore === undefined
      ? {}
      : { presentationOutboxStore: adapters.presentationOutboxStore }),
    ...(adapters.presentationActionTokenStore === undefined
      ? {}
      : { presentationActionTokenStore: adapters.presentationActionTokenStore }),
  });
}

function listConfiguredStores(boundaries: DurableCoreStoreAdapterBoundaries): readonly DurableCoreStoreAdapterName[] {
  return Object.freeze(
    DURABLE_CORE_STORE_ADAPTER_NAMES.filter((storeName) => isDurableCoreRecordStore(boundaries[storeName])),
  );
}

function listMissingStores(boundaries: DurableCoreStoreAdapterBoundaries): readonly DurableCoreStoreAdapterName[] {
  return Object.freeze(
    DURABLE_CORE_STORE_ADAPTER_NAMES.filter((storeName) => !isDurableCoreRecordStore(boundaries[storeName])),
  );
}

export function createDurableCoreStoreAdapterBundle(
  input: DurableCoreStoreAdapterBundleInput = {},
): AdapterOperationResult<DurableCoreStoreAdapterBundle> {
  const boundaries = input.boundaries ?? {};
  if (!isRecord(boundaries)) {
    return invalidInputResult('Durable core store boundaries must be an object.', input.context);
  }

  try {
    const adapters = createAdapters(boundaries);
    const ports = createPorts(adapters);

    return adapterOk(
      Object.freeze({
        adapters,
        ports,
        configuredStores: listConfiguredStores(boundaries),
        missingStores: listMissingStores(boundaries),
        readiness: summarizeDurableCoreStoreReadiness(boundaries),
      }),
      input.context,
    );
  } catch (error) {
    return invalidInputResult(
      error instanceof Error ? error.message : 'Durable core store adapter bundle input is invalid.',
      input.context,
    );
  }
}
