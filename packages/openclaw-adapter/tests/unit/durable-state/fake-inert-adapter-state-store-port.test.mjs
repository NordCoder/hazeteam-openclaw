import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const DIST_MODULE_URL = new URL(
  '../../../dist/durable-state/fake-inert-adapter-state-store-port.js',
  import.meta.url,
);
const SOURCE_URL = new URL(
  '../../../src/durable-state/fake-inert-adapter-state-store-port.ts',
  import.meta.url,
);
const PACKAGE_ROOT_SOURCE_URL = new URL('../../../src/index.ts', import.meta.url);
const PACKAGE_ROOT_DIST_URL = new URL('../../../dist/index.js', import.meta.url);
const LOCAL_DURABLE_BARREL_URL = new URL('../../../src/durable-state/index.ts', import.meta.url);

const UNSAFE_PUBLIC_FIELD_NAMES = Object.freeze([
  'token',
  'secret',
  'credential',
  'password',
  'apiKey',
  'authHeader',
  'endpoint',
  'url',
  'rawPayload',
  'rawProviderPayload',
  'rawCallbackPayload',
  'stack',
  'stackTrace',
  'localPath',
  'stdout',
  'stderr',
  'client',
  'sdk',
  'handle',
  'processEnv',
  'runtimeValue',
]);

const FORBIDDEN_RUNTIME_SNIPPETS = Object.freeze([
  'process.env',
  "from 'node:fs'",
  'from "node:fs"',
  "from 'node:path'",
  'from "node:path"',
  "from 'node:http'",
  'from "node:http"',
  "from 'node:https'",
  'from "node:https"',
  "from 'node:net'",
  'from "node:net"',
  "from 'node:tls'",
  'from "node:tls"',
  "from 'node:dns'",
  'from "node:dns"',
  'fetch(',
  'new WebSocket',
  'EventSource',
  'setInterval(',
  'setTimeout(',
  'createServer(',
  '.listen(',
]);

const FORBIDDEN_BEHAVIOR_SNIPPETS = Object.freeze([
  'createStore',
  'openStore',
  'connectStore',
  'database',
  'cache',
  'queue',
  'migration',
  'backup',
  'restore',
  'replay CLI',
  'recovery runtime',
  'SQL',
  'ORM',
  'Prisma',
  'TypeORM',
  'Redis',
  'Kafka',
  'RabbitMQ',
  'SQLite',
  'Postgres',
]);

const FORBIDDEN_PUBLIC_SOURCE_SNIPPETS = Object.freeze([
  'rawPayload',
  'rawProviderPayload',
  'rawCallbackPayload',
  'apiKey',
  'authHeader',
  'endpoint',
  'stackTrace',
  'localPath',
  'stdout',
  'stderr',
  'processEnv',
  'runtimeValue',
]);

function readSource(url) {
  return readFileSync(url, 'utf8');
}

async function importStoreModule() {
  return import(DIST_MODULE_URL.href);
}

function assertJsonSafe(value, label) {
  const encoded = JSON.stringify(value);
  assert.equal(typeof encoded, 'string', `${label} should serialize to JSON`);
  assert.deepEqual(JSON.parse(encoded), value, `${label} should round-trip through JSON`);
}

function collectFieldNames(value, output = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFieldNames(item, output);
    }

    return output;
  }

  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      output.add(key);
      collectFieldNames(entry, output);
    }
  }

  return output;
}

function sourceFieldNames(source) {
  return [...source.matchAll(/\breadonly\s+([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:/gu)].map(
    (match) => match[1],
  );
}

function redactedSummary(status, safeRefs, issueCode = 'none') {
  return {
    summaryKind: 'redacted-summary',
    status,
    issueCode,
    safeRefs,
    jsonSafe: true,
  };
}

function baseRecord({ safeRef, stateRef, stateKind, status = 'active', issueCode = 'none' }) {
  return {
    safeRef,
    stateRef,
    stateKind,
    status,
    issueCode,
    redactedSummary: redactedSummary(status, [safeRef], issueCode),
    publicProjection: 'redacted-json-safe',
    representation: 'fake-inert-contract-only',
    runtimeOnlyValuesSerializable: false,
    productionDurableBackend: 'not-implemented',
  };
}

function topicBindingRecord() {
  return {
    ...baseRecord({
      safeRef: 'binding:topic-alpha',
      stateRef: 'state:topic-alpha',
      stateKind: 'topic-binding-state',
    }),
    bindingRef: 'binding:topic-alpha',
    channelRef: 'channel:synthetic-alpha',
    chatRef: 'chat:synthetic-alpha',
    threadRef: 'thread:synthetic-alpha',
    displayRef: 'display:synthetic-alpha',
    routingAuthority: 'channel-chat-thread-safe-refs',
  };
}

function callbackTokenRecord() {
  return {
    ...baseRecord({
      safeRef: 'callback:synthetic-alpha',
      stateRef: 'state:callback-alpha',
      stateKind: 'callback-token-state',
      status: 'issued',
    }),
    callbackRef: 'callback:synthetic-alpha',
    tokenRef: 'token-ref:synthetic-alpha',
    expectedContextRef: 'context:synthetic-alpha',
    opaqueRefOnly: true,
  };
}

function correlationRecord() {
  return {
    ...baseRecord({
      safeRef: 'correlation:flow-alpha',
      stateRef: 'state:correlation-alpha',
      stateKind: 'correlation-state',
    }),
    correlationRef: 'correlation:flow-alpha',
    componentRef: 'component:fake-inert-state-store',
    operationRef: 'operation:synthetic-alpha',
    severity: 'info',
    relatedRefs: ['binding:topic-alpha', 'callback:synthetic-alpha'],
  };
}

function deliveryAttemptRecord({ providerAcknowledged, businessSuccess }) {
  const status = businessSuccess
    ? 'business-succeeded'
    : providerAcknowledged
      ? 'acknowledgement-only'
      : 'not-attempted';
  const issueCode = businessSuccess ? 'none' : 'business-success-missing';

  return {
    ...baseRecord({
      safeRef: 'delivery-attempt:synthetic-alpha',
      stateRef: 'state:delivery-alpha',
      stateKind: 'delivery-attempt-state',
      status,
      issueCode,
    }),
    deliveryAttemptRef: 'delivery-attempt:synthetic-alpha',
    idempotencyRef: 'idempotency:delivery-alpha',
    messageRef: 'message:synthetic-alpha',
    providerAcknowledged,
    businessSuccess,
    retryability: 'unknown',
    duplicateDisposition: 'first-seen',
  };
}

function replayCursorRecord({ boundedCount }) {
  return {
    ...baseRecord({
      safeRef: 'replay:synthetic-alpha',
      stateRef: 'state:replay-alpha',
      stateKind: 'replay-cursor-state',
      status: 'processing',
      issueCode: 'fake-inert-only',
    }),
    replayRef: 'replay:synthetic-alpha',
    cursorRef: 'cursor:synthetic-alpha',
    replayMode: 'audit-only',
    duplicateDisposition: 'safe-noop',
    boundedCount,
  };
}

test('fake store can be created empty', async () => {
  const { createFakeInertAdapterStateStore } = await importStoreModule();
  const store = createFakeInertAdapterStateStore();

  assert.deepEqual(store.listRecordsByCategory('topic-binding-state'), []);
  assert.deepEqual(store.listRecordsByCategory('delivery-attempt-state'), []);
  assert.deepEqual(store.publicSnapshot(), {
    representation: 'fake-inert-contract-only',
    publicProjection: 'redacted-json-safe',
    durableBackendPosture: 'not-implemented',
    recordCount: 0,
    categoryCounts: [],
    records: [],
    jsonSafe: true,
  });
});

test('write, read, and list work for representative state categories', async () => {
  const { createFakeInertAdapterStateStore } = await importStoreModule();
  const store = createFakeInertAdapterStateStore();
  const binding = topicBindingRecord();
  const callback = callbackTokenRecord();
  const correlation = correlationRecord();

  assert.deepEqual(store.putRecord(binding), binding);
  assert.deepEqual(store.putRecord(callback), callback);
  assert.deepEqual(store.putRecord(correlation), correlation);

  assert.deepEqual(store.readRecord(binding.safeRef), binding);
  assert.deepEqual(store.readRecord(callback.safeRef), callback);
  assert.deepEqual(store.readRecord(correlation.safeRef), correlation);
  assert.deepEqual(store.listRecordsByCategory('topic-binding-state'), [binding]);
  assert.deepEqual(store.listRecordsByCategory('callback-token-state'), [callback]);
  assert.deepEqual(store.listRecordsByCategory('correlation-state'), [correlation]);
});

test('inbound idempotency reservation suppresses duplicate reservations', async () => {
  const { createFakeInertAdapterStateStore } = await importStoreModule();
  const store = createFakeInertAdapterStateStore();

  const first = store.reserveInboundIdempotencyRef({
    idempotencyRef: 'idempotency:inbound-alpha',
    eventRef: 'event:inbound-alpha',
  });
  const duplicate = store.reserveInboundIdempotencyRef({
    idempotencyRef: 'idempotency:inbound-alpha',
    eventRef: 'event:inbound-alpha',
  });

  assert.equal(first.reserved, true);
  assert.equal(first.effectSignalCreated, true);
  assert.equal(first.duplicateDisposition, 'first-seen');
  assert.equal(duplicate.reserved, false);
  assert.equal(duplicate.duplicateSuppressed, true);
  assert.equal(duplicate.effectSignalCreated, false);
  assert.equal(duplicate.duplicateDisposition, 'duplicate-suppressed');
  assert.deepEqual(store.listRecordsByCategory('inbound-idempotency-state'), [first.record]);
});

test('completed idempotency state remains stable under duplicate completion', async () => {
  const { createFakeInertAdapterStateStore } = await importStoreModule();
  const store = createFakeInertAdapterStateStore();

  store.reserveInboundIdempotencyRef({
    idempotencyRef: 'idempotency:complete-alpha',
    eventRef: 'event:complete-alpha',
  });

  const completed = store.markInboundIdempotencyRefCompleted({
    idempotencyRef: 'idempotency:complete-alpha',
  });
  const duplicateCompletion = store.markInboundIdempotencyRefCompleted({
    idempotencyRef: 'idempotency:complete-alpha',
  });

  assert.equal(completed.completed, true);
  assert.equal(completed.effectSignalCreated, false);
  assert.equal(completed.record.status, 'completed');
  assert.equal(duplicateCompletion.completed, false);
  assert.equal(duplicateCompletion.duplicateSuppressed, true);
  assert.equal(duplicateCompletion.effectSignalCreated, false);
  assert.deepEqual(duplicateCompletion.record, completed.record);
  assert.deepEqual(store.listRecordsByCategory('inbound-idempotency-state'), [completed.record]);
});

test('provider acknowledgement and business success remain separate on delivery records', async () => {
  const { createFakeInertAdapterStateStore } = await importStoreModule();
  const store = createFakeInertAdapterStateStore();

  const acknowledgementOnly = store.appendOrUpsertDeliveryAttempt(
    deliveryAttemptRecord({ providerAcknowledged: true, businessSuccess: false }),
  );

  assert.equal(acknowledgementOnly.providerAcknowledged, true);
  assert.equal(acknowledgementOnly.businessSuccess, false);
  assert.equal(acknowledgementOnly.status, 'acknowledgement-only');
  assert.equal(acknowledgementOnly.issueCode, 'business-success-missing');

  const businessSucceeded = store.appendOrUpsertDeliveryAttempt(
    deliveryAttemptRecord({ providerAcknowledged: true, businessSuccess: true }),
  );

  assert.equal(businessSucceeded.providerAcknowledged, true);
  assert.equal(businessSucceeded.businessSuccess, true);
  assert.equal(businessSucceeded.status, 'business-succeeded');
  assert.deepEqual(store.listRecordsByCategory('delivery-attempt-state'), [businessSucceeded]);
});

test('replay cursor update is fake/inert and does not imply recovery runtime', async () => {
  const { createFakeInertAdapterStateStore } = await importStoreModule();
  const store = createFakeInertAdapterStateStore();

  const firstCursor = store.updateReplayCursorState(replayCursorRecord({ boundedCount: 1 }));
  const updatedCursor = store.updateReplayCursorState(replayCursorRecord({ boundedCount: 2 }));

  assert.equal(firstCursor.replayMode, 'audit-only');
  assert.equal(updatedCursor.replayMode, 'audit-only');
  assert.equal(updatedCursor.boundedCount, 2);
  assert.equal(Object.hasOwn(updatedCursor, 'recoveryRuntimeStarted'), false);
  assert.equal(Object.hasOwn(updatedCursor, 'providerFetchReplayStarted'), false);
  assert.deepEqual(store.listRecordsByCategory('replay-cursor-state'), [updatedCursor]);
});

test('public snapshot is JSON-safe and does not expose forbidden field names', async () => {
  const { createFakeInertAdapterStateStore } = await importStoreModule();
  const store = createFakeInertAdapterStateStore([
    topicBindingRecord(),
    callbackTokenRecord(),
    correlationRecord(),
  ]);

  store.reserveInboundIdempotencyRef({
    idempotencyRef: 'idempotency:snapshot-alpha',
    eventRef: 'event:snapshot-alpha',
  });
  store.appendOrUpsertDeliveryAttempt(
    deliveryAttemptRecord({ providerAcknowledged: true, businessSuccess: false }),
  );
  store.updateReplayCursorState(replayCursorRecord({ boundedCount: 1 }));

  const snapshot = store.publicSnapshot();
  const fieldNames = collectFieldNames(snapshot);

  assertJsonSafe(snapshot, 'public snapshot');
  assert.equal(snapshot.jsonSafe, true);
  assert.equal(snapshot.recordCount, 6);
  assert.equal(fieldNames.has('tokenRef'), true, 'safe tokenRef vocabulary should remain allowed');
  assert.equal(fieldNames.has('providerAcknowledged'), true);
  assert.equal(fieldNames.has('businessSuccess'), true);

  for (const unsafeFieldName of UNSAFE_PUBLIC_FIELD_NAMES) {
    assert.equal(
      fieldNames.has(unsafeFieldName),
      false,
      `public snapshot exposed forbidden field ${unsafeFieldName}`,
    );
  }
});

test('source file contains no forbidden imports or production snippets', () => {
  const source = readSource(SOURCE_URL);

  assert.doesNotMatch(source, /^\s*import\s+(?!type\b)/mu, 'source should import types only');
  assert.doesNotMatch(source, /\brequire\s*\(/u, 'source should not require modules');
  assert.doesNotMatch(source, /\bclass\s+[A-Za-z0-9_$]*(Store|Backend|Repository)\b/u);
  assert.doesNotMatch(source, /\bfunction\s+(connect|migrate|recover|schedule|listen|poll)[A-Za-z0-9_$]*\b/u);

  for (const snippet of [
    ...FORBIDDEN_RUNTIME_SNIPPETS,
    ...FORBIDDEN_BEHAVIOR_SNIPPETS,
    ...FORBIDDEN_PUBLIC_SOURCE_SNIPPETS,
  ]) {
    assert.equal(source.includes(snippet), false, `source should not include forbidden snippet ${snippet}`);
  }
});

test('source file exposes no forbidden public field names', () => {
  const source = readSource(SOURCE_URL);
  const fields = new Set(sourceFieldNames(source));

  for (const unsafeFieldName of UNSAFE_PUBLIC_FIELD_NAMES) {
    assert.equal(fields.has(unsafeFieldName), false, `source exposed forbidden public field ${unsafeFieldName}`);
  }

  assert.equal(source.includes('tokenRef'), true, 'source should use safe tokenRef vocabulary');
  assert.equal(source.includes('providerAcknowledged'), true);
  assert.equal(source.includes('businessSuccess'), true);
});

test('W21C fake/inert store port fans into package root only through W21F durable-state barrel', async () => {
  const packageRootSource = readSource(PACKAGE_ROOT_SOURCE_URL);
  const localBarrel = readSource(LOCAL_DURABLE_BARREL_URL);
  const packageRootModule = await import(PACKAGE_ROOT_DIST_URL.href);

  assert.equal(packageRootSource.includes("export * from './durable-state/index.js';"), true);
  assert.equal(packageRootSource.includes('fake-inert-adapter-state-store-port'), false);
  assert.equal(localBarrel.includes("export { createFakeInertAdapterStateStore } from './fake-inert-adapter-state-store-port.js';"), true);
  assert.equal(localBarrel.includes("export type * from './fake-inert-adapter-state-store-port.js';"), true);
  assert.equal(typeof packageRootModule.createFakeInertAdapterStateStore, 'function');

  const rootStore = packageRootModule.createFakeInertAdapterStateStore();
  const snapshot = rootStore.publicSnapshot();

  assert.equal(snapshot.representation, 'fake-inert-contract-only');
  assert.equal(snapshot.publicProjection, 'redacted-json-safe');
  assert.equal(snapshot.durableBackendPosture, 'not-implemented');
  assert.equal(snapshot.jsonSafe, true);
  assertJsonSafe(snapshot, 'package-root fake store snapshot');
});
