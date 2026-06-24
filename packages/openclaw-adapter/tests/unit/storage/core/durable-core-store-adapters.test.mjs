import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createDurableCoreStoreAdapterBundle,
  normalizeDurableCorePresentationOutboxRecord,
  normalizeDurableCoreSessionBindingRecord,
  summarizeDurableCoreStoreReadiness,
} from '../../../../dist/storage/core/durable-core-store-adapters.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const forbiddenSerializedTerms = [
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'toolPayload',
  'approvalPayload',
  'rawApprovalPayload',
  'rawCoreResult',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
  'filesystemPath',
  'storagePath',
];

function readPackageSource(...segments) {
  return readFileSync(path.join(packageRoot, ...segments), 'utf8');
}

function createFakeRecordStore(initialRecords = []) {
  const records = new Map(initialRecords.map((record) => [record.recordKey, record]));

  return Object.freeze({
    get: (recordKey) => records.get(recordKey),
    put: (record) => {
      records.set(record.recordKey, record);
      return record;
    },
    delete: (recordKey) => {
      records.delete(recordKey);
    },
    list: () => [...records.values()],
    dump: () => [...records.values()],
  });
}

function createSessionBindingRecord(overrides = {}) {
  return Object.freeze({
    recordKey: 'session:one',
    externalSessionRef: 'correlation:telegram-chat-1',
    hostSessionRef: 'correlation:core-session-1',
    workspaceRef: 'workspace:main',
    agentRef: 'agent:assistant',
    actorRef: 'actor:user-1',
    status: 'active',
    updatedByOperationRef: 'operation:bind-1',
    correlationRef: 'correlation:flow-1',
    detailsRef: 'details:session-1',
    safeMessage: 'session binding persisted',
    ...overrides,
  });
}

function createPresentationOutboxRecord(overrides = {}) {
  return Object.freeze({
    recordKey: 'presentation:one',
    presentationRef: 'details:presentation-1',
    deliveryRequestRef: 'details:delivery-1',
    status: 'pending',
    correlationRef: 'correlation:presentation-flow-1',
    serializedPayloadDescriptor: Object.freeze({
      format: 'json-safe-ref',
      contentRef: 'details:rendered-safe-1',
      summary: 'safe descriptor only',
    }),
    ...overrides,
  });
}

function createActionTokenRecord(overrides = {}) {
  return Object.freeze({
    recordKey: 'token:one',
    actionTokenRef: 'details:token-1',
    presentationRef: 'details:presentation-1',
    actorRef: 'actor:user-1',
    status: 'issued',
    issuedByOperationRef: 'operation:issue-1',
    correlationRef: 'correlation:token-flow-1',
    ...overrides,
  });
}

function protectedMarker(...parts) {
  return parts.join('');
}

function assertNoForbiddenSerializedTerms(value) {
  const serialized = JSON.stringify(value);
  for (const term of forbiddenSerializedTerms) {
    assert.equal(serialized.includes(term), false, `serialized output leaked ${term}`);
  }
}

test('creates a durable core store adapter bundle from injected fake record stores', () => {
  const boundaries = Object.freeze({
    sessionBindingStore: createFakeRecordStore(),
    presentationOutboxStore: createFakeRecordStore(),
    presentationActionTokenStore: createFakeRecordStore(),
  });

  const result = createDurableCoreStoreAdapterBundle({ boundaries });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.configuredStores, [
    'sessionBindingStore',
    'presentationOutboxStore',
    'presentationActionTokenStore',
  ]);
  assert.deepEqual(result.value.missingStores, []);
  assert.equal(result.value.readiness.status, 'ready');
  assert.equal(result.value.ports.sessionBindingStore, result.value.adapters.sessionBindingStore);
  assert.equal(result.value.ports.presentationOutboxStore, result.value.adapters.presentationOutboxStore);
  assert.equal(
    result.value.ports.presentationActionTokenStore,
    result.value.adapters.presentationActionTokenStore,
  );
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.adapters), true);
  assert.equal(Object.isFrozen(result.value.ports), true);
});

test('summarizes missing durable core store boundaries without creating fake success', () => {
  const boundaries = Object.freeze({
    sessionBindingStore: createFakeRecordStore(),
  });

  const bundle = createDurableCoreStoreAdapterBundle({ boundaries });
  const readiness = summarizeDurableCoreStoreReadiness(boundaries);

  assert.equal(bundle.ok, true);
  assert.deepEqual(bundle.value.configuredStores, ['sessionBindingStore']);
  assert.deepEqual(bundle.value.missingStores, [
    'presentationOutboxStore',
    'presentationActionTokenStore',
  ]);
  assert.equal(bundle.value.readiness.status, 'not-ready');
  assert.equal(readiness.status, 'not-ready');
  assert.deepEqual(
    readiness.checks.map((check) => [check.component, check.status]),
    [
      ['storage.core.sessionBindingStore', 'pass'],
      ['storage.core.presentationOutboxStore', 'fail'],
      ['storage.core.presentationActionTokenStore', 'fail'],
    ],
  );
});

test('persists and reads safe session binding records through injected storage', async () => {
  const sessionBoundary = createFakeRecordStore();
  const bundle = createDurableCoreStoreAdapterBundle({
    boundaries: {
      sessionBindingStore: sessionBoundary,
    },
  });

  assert.equal(bundle.ok, true);
  const adapter = bundle.value.adapters.sessionBindingStore;
  assert.ok(adapter);

  const put = await adapter.putSessionBinding(createSessionBindingRecord());
  assert.equal(put.ok, true);
  assert.equal(put.value.recordKind, 'core.session-binding');
  assert.equal(put.value.externalSessionRef, 'correlation:telegram-chat-1');
  assert.equal(Object.isFrozen(put.value), true);

  const get = await adapter.getSessionBinding('session:one');
  assert.equal(get.ok, true);
  assert.equal(get.value.hostSessionRef, 'correlation:core-session-1');
  assertNoForbiddenSerializedTerms(get);
});

test('persists, reads, and lists safe presentation outbox records through injected storage', async () => {
  const outboxBoundary = createFakeRecordStore();
  const bundle = createDurableCoreStoreAdapterBundle({
    boundaries: {
      presentationOutboxStore: outboxBoundary,
    },
  });

  assert.equal(bundle.ok, true);
  const adapter = bundle.value.adapters.presentationOutboxStore;
  assert.ok(adapter);

  const first = await adapter.putPresentationOutboxRecord(createPresentationOutboxRecord());
  const second = await adapter.putPresentationOutboxRecord(
    createPresentationOutboxRecord({
      recordKey: 'presentation:two',
      presentationRef: 'details:presentation-2',
      status: 'delivered',
      externalMessageRef: 'details:external-message-2',
    }),
  );

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const pending = await adapter.listPendingPresentationOutboxRecords();
  assert.equal(pending.ok, true);
  assert.deepEqual(
    pending.value.map((record) => record.recordKey),
    ['presentation:one'],
  );
  assertNoForbiddenSerializedTerms(pending);
});

test('consumes action token records through a safe consume-like transition', async () => {
  const tokenBoundary = createFakeRecordStore();
  const bundle = createDurableCoreStoreAdapterBundle({
    boundaries: {
      presentationActionTokenStore: tokenBoundary,
    },
  });

  assert.equal(bundle.ok, true);
  const adapter = bundle.value.adapters.presentationActionTokenStore;
  assert.ok(adapter);

  const put = await adapter.putActionTokenRecord(createActionTokenRecord());
  assert.equal(put.ok, true);

  const consumed = await adapter.consumeActionTokenRecord('token:one', {
    consumedByOperationRef: 'operation:consume-1',
    correlationRef: 'correlation:callback-1',
    safeMessage: 'permission checked before consume',
  });
  assert.equal(consumed.ok, true);
  assert.equal(consumed.value.status, 'consumed');
  assert.equal(consumed.value.consumedByOperationRef, 'operation:consume-1');

  const secondConsume = await adapter.consumeActionTokenRecord('token:one', {
    consumedByOperationRef: 'operation:consume-2',
  });
  assert.equal(secondConsume.ok, false);
  assert.equal(secondConsume.error.code, 'conflict');
  assertNoForbiddenSerializedTerms(consumed);
  assertNoForbiddenSerializedTerms(secondConsume);
});

test('rejects malformed records and unsupported fields without leaking forbidden field names', async () => {
  const sessionBoundary = createFakeRecordStore();
  const outboxBoundary = createFakeRecordStore([
    createPresentationOutboxRecord({ recordKey: 'presentation:ok' }),
    {
      recordKey: 'presentation:bad',
      presentationRef: 'details:presentation-bad',
      status: 'pending',
      rawCoreResult: Object.freeze({ stack: 'secret' }),
    },
  ]);
  const bundle = createDurableCoreStoreAdapterBundle({
    boundaries: {
      sessionBindingStore: sessionBoundary,
      presentationOutboxStore: outboxBoundary,
    },
  });

  assert.equal(bundle.ok, true);

  const malformedSession = await bundle.value.adapters.sessionBindingStore.putSessionBinding({
    ...createSessionBindingRecord(),
    rawUpdate: Object.freeze({ botToken: 'abc' }),
  });
  assert.equal(malformedSession.ok, false);
  assert.equal(malformedSession.error.code, 'invalid-input');

  const malformedList = await bundle.value.adapters.presentationOutboxStore.list();
  assert.equal(malformedList.ok, false);
  assert.equal(malformedList.error.code, 'invalid-input');

  assertNoForbiddenSerializedTerms(malformedSession);
  assertNoForbiddenSerializedTerms(malformedList);
});

test('normalizers redact sensitive assignments from safe messages and preserve only safe descriptors', () => {
  const session = normalizeDurableCoreSessionBindingRecord(
    createSessionBindingRecord({
      safeMessage: 'stored botToken=abc apiKey=def secret=ghi password=jkl credential=mno',
    }),
  );
  const outbox = normalizeDurableCorePresentationOutboxRecord(
    createPresentationOutboxRecord({
      serializedPayloadDescriptor: Object.freeze({
        format: 'json-safe-ref',
        contentRef: 'details:safe-content',
        summary: 'descriptor secret=hidden',
      }),
    }),
  );

  assert.match(session.safeMessage, /\[redacted\]/u);
  assert.match(outbox.serializedPayloadDescriptor.summary, /\[redacted\]/u);
  assertNoForbiddenSerializedTerms(session);
  assertNoForbiddenSerializedTerms(outbox);
});

test('redacts standalone protected terms from safeMessage before persistence and DTO return', async () => {
  const sessionBoundary = createFakeRecordStore();
  const bundle = createDurableCoreStoreAdapterBundle({
    boundaries: {
      sessionBindingStore: sessionBoundary,
    },
  });

  assert.equal(bundle.ok, true);
  const standaloneProtectedTerm = protectedMarker('raw', 'Update');
  const put = await bundle.value.adapters.sessionBindingStore.putSessionBinding(
    createSessionBindingRecord({
      recordKey: 'session:protected-message',
      safeMessage: `stored ${standaloneProtectedTerm} marker only`,
    }),
  );

  assert.equal(put.ok, true);
  assert.match(put.value.safeMessage, /\[redacted\]/u);
  assert.equal(put.value.safeMessage.includes(standaloneProtectedTerm), false);

  const [persisted] = sessionBoundary.dump();
  assert.match(persisted.safeMessage, /\[redacted\]/u);
  assert.equal(JSON.stringify(persisted).includes(standaloneProtectedTerm), false);
  assertNoForbiddenSerializedTerms(put);
  assertNoForbiddenSerializedTerms(persisted);
});

test('redacts standalone protected terms from serialized payload summaries before persistence and DTO return', async () => {
  const outboxBoundary = createFakeRecordStore();
  const bundle = createDurableCoreStoreAdapterBundle({
    boundaries: {
      presentationOutboxStore: outboxBoundary,
    },
  });

  assert.equal(bundle.ok, true);
  const standaloneProtectedTerm = protectedMarker('raw', 'Provider', 'Response');
  const put = await bundle.value.adapters.presentationOutboxStore.putPresentationOutboxRecord(
    createPresentationOutboxRecord({
      recordKey: 'presentation:protected-summary',
      serializedPayloadDescriptor: Object.freeze({
        format: 'json-safe-ref',
        contentRef: 'details:rendered-safe-2',
        summary: `summary mentions ${standaloneProtectedTerm} value`,
      }),
    }),
  );

  assert.equal(put.ok, true);
  assert.match(put.value.serializedPayloadDescriptor.summary, /\[redacted\]/u);
  assert.equal(put.value.serializedPayloadDescriptor.summary.includes(standaloneProtectedTerm), false);

  const [persisted] = outboxBoundary.dump();
  assert.match(persisted.serializedPayloadDescriptor.summary, /\[redacted\]/u);
  assert.equal(JSON.stringify(persisted).includes(standaloneProtectedTerm), false);
  assertNoForbiddenSerializedTerms(put);
  assertNoForbiddenSerializedTerms(persisted);
});

test('rejects record keys containing protected terms and does not persist them', async () => {
  const sessionBoundary = createFakeRecordStore();
  const bundle = createDurableCoreStoreAdapterBundle({
    boundaries: {
      sessionBindingStore: sessionBoundary,
    },
  });

  assert.equal(bundle.ok, true);
  const put = await bundle.value.adapters.sessionBindingStore.putSessionBinding(
    createSessionBindingRecord({
      recordKey: `session:${protectedMarker('storage', 'Path')}`,
    }),
  );

  assert.equal(put.ok, false);
  assert.equal(put.error.code, 'invalid-input');
  assert.deepEqual(sessionBoundary.dump(), []);
  assertNoForbiddenSerializedTerms(put);
});

test('rejects adapter refs containing protected terms and does not persist them', async () => {
  const outboxBoundary = createFakeRecordStore();
  const bundle = createDurableCoreStoreAdapterBundle({
    boundaries: {
      presentationOutboxStore: outboxBoundary,
    },
  });

  assert.equal(bundle.ok, true);
  const put = await bundle.value.adapters.presentationOutboxStore.putPresentationOutboxRecord(
    createPresentationOutboxRecord({
      recordKey: 'presentation:protected-ref',
      externalMessageRef: `details:${protectedMarker('bot', 'Token')}`,
    }),
  );

  assert.equal(put.ok, false);
  assert.equal(put.error.code, 'invalid-input');
  assert.deepEqual(outboxBoundary.dump(), []);
  assertNoForbiddenSerializedTerms(put);
});

test('new durable core storage files avoid private core imports and real infrastructure calls', () => {
  const source = readPackageSource('src', 'storage', 'core', 'durable-core-store-adapters.ts');

  assert.doesNotMatch(source, /hazeteam-core\/(?:src|dist|tests)(?:\/|['"])/u);
  assert.doesNotMatch(source, /from\s+['"]\.\.\/\.\.\/.*hazeteam-core/u);
  assert.doesNotMatch(source, /\b(?:fetch|setTimeout|setInterval|Date\.now|Math\.random)\s*\(/u);
  assert.doesNotMatch(source, /\b(?:readFile|writeFile|openSync|createConnection|connect)\s*\(/u);
});
