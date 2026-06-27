import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const PACKAGE_ROOT_DIST_URL = new URL('../../../dist/index.js', import.meta.url);
const DURABLE_STATE_DIST_URL = new URL('../../../dist/durable-state/index.js', import.meta.url);
const DURABLE_STATE_SOURCE_URL = new URL('../../../src/durable-state/index.ts', import.meta.url);
const PACKAGE_ROOT_SOURCE_URL = new URL('../../../src/index.ts', import.meta.url);

function readSource(url) {
  return readFileSync(url, 'utf8');
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

test('durable-state fan-in barrel exposes only already merged fake/inert runtime symbols', async () => {
  const durableStateModule = await import(DURABLE_STATE_DIST_URL.href);
  const packageRootModule = await import(PACKAGE_ROOT_DIST_URL.href);

  for (const module of [durableStateModule, packageRootModule]) {
    assert.equal(typeof module.createFakeInertAdapterStateStore, 'function');
    assert.equal(typeof module.createFakeInertReplayIdempotencyStateBoundary, 'function');
    assert.equal(typeof module.FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE, 'object');
  }

  assert.deepEqual(moduleRuntimeExportNames(durableStateModule), [
    'FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE',
    'createFakeInertAdapterStateStore',
    'createFakeInertReplayIdempotencyStateBoundary',
  ]);
});

test('durable-state fan-in source keeps W21B contracts as type-only public surface', () => {
  const durableStateSource = readSource(DURABLE_STATE_SOURCE_URL);
  const packageRootSource = readSource(PACKAGE_ROOT_SOURCE_URL);

  assert.match(durableStateSource, /^export type \* from '\.\/durable-state-contract-types\.js';/mu);
  assert.match(durableStateSource, /^export type \* from '\.\/fake-inert-adapter-state-store-port\.js';/mu);
  assert.match(durableStateSource, /^export type \* from '\.\/fake-inert-replay-idempotency-state-boundary\.js';/mu);
  assert.match(packageRootSource, /^export \* from '\.\/durable-state\/index\.js';/mu);
});

test('fan-in imports have no effects beyond module loading', async () => {
  const durableStateModule = await import(DURABLE_STATE_DIST_URL.href);
  const packageRootModule = await import(PACKAGE_ROOT_DIST_URL.href);

  assert.equal(Object.isFrozen(durableStateModule.FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE), true);
  assert.deepEqual(durableStateModule.FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE, {
    publicProjection: 'redacted-json-safe',
    representation: 'fake-inert-contract-only',
    runtimeOnlyValuesSerializable: false,
    productionDurableBackend: 'not-implemented',
    productionReadiness: 'not-production-ready',
    readyToAttemptIsPass: false,
    readyToRunIsPass: false,
    jsonSafe: true,
  });
  assert.deepEqual(
    packageRootModule.FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE,
    durableStateModule.FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE,
  );
});

test('fake/inert store is created explicitly and remains JSON-safe', async () => {
  const { createFakeInertAdapterStateStore } = await import(DURABLE_STATE_DIST_URL.href);
  const store = createFakeInertAdapterStateStore();
  const snapshot = store.publicSnapshot();

  assert.deepEqual(snapshot, {
    representation: 'fake-inert-contract-only',
    publicProjection: 'redacted-json-safe',
    durableBackendPosture: 'not-implemented',
    recordCount: 0,
    categoryCounts: [],
    records: [],
    jsonSafe: true,
  });
  assertJsonSafe(snapshot, 'empty explicit fake store snapshot');
});

test('replay and idempotency boundary is exercised only through explicit calls', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await import(PACKAGE_ROOT_DIST_URL.href);
  const boundary = createFakeInertReplayIdempotencyStateBoundary();

  assert.equal(boundary.publicSnapshot().recordCount, 0);

  const reservation = boundary.reserveInboundIdempotency({
    idempotencyRef: 'idempotency:fan-in-alpha',
    eventRef: 'event:fan-in-alpha',
  });
  const duplicate = boundary.reserveInboundIdempotency({
    idempotencyRef: 'idempotency:fan-in-alpha',
    eventRef: 'event:fan-in-alpha',
  });

  assert.equal(reservation.outcome, 'first-seen');
  assert.equal(reservation.effectSignalCreated, true);
  assert.equal(duplicate.outcome, 'duplicate-suppressed');
  assert.equal(duplicate.effectSignalCreated, false);
  assert.equal(boundary.publicSnapshot().recordCount, 1);
  assertJsonSafe(boundary.publicSnapshot(), 'explicit boundary snapshot');
});

test('provider acknowledgement remains separate from business success through fan-in export', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await import(DURABLE_STATE_DIST_URL.href);
  const boundary = createFakeInertReplayIdempotencyStateBoundary();

  const acknowledgementOnly = boundary.recordDeliveryAttemptReplayOutcome({
    deliveryAttemptRef: 'delivery-attempt:fan-in-ack-only',
    idempotencyRef: 'idempotency:fan-in-ack-only',
    providerAcknowledged: true,
    businessSuccess: false,
  });
  const businessSucceeded = boundary.recordDeliveryAttemptReplayOutcome({
    deliveryAttemptRef: 'delivery-attempt:fan-in-business-success',
    idempotencyRef: 'idempotency:fan-in-business-success',
    providerAcknowledged: true,
    businessSuccess: true,
  });

  assert.equal(acknowledgementOnly.providerAcknowledged, true);
  assert.equal(acknowledgementOnly.businessSuccess, false);
  assert.equal(acknowledgementOnly.providerAcknowledgementImpliesBusinessSuccess, false);
  assert.equal(acknowledgementOnly.outcome, 'acknowledgement-only');
  assert.equal(acknowledgementOnly.record.status, 'acknowledgement-only');
  assert.equal(acknowledgementOnly.record.issueCode, 'business-success-missing');
  assert.equal(businessSucceeded.providerAcknowledged, true);
  assert.equal(businessSucceeded.businessSuccess, true);
  assert.equal(businessSucceeded.record.status, 'business-succeeded');
  assertJsonSafe([acknowledgementOnly, businessSucceeded], 'delivery outcomes');
});

test('public fan-in outputs do not expose unsafe public fields or default runtime behavior', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await import(PACKAGE_ROOT_DIST_URL.href);
  const boundary = createFakeInertReplayIdempotencyStateBoundary();
  const output = boundary.decideCallbackConsumeReplay({
    decisionRef: 'decision:fan-in-blocked',
    callbackRef: 'callback:fan-in-blocked',
    permissionRef: 'permission:fan-in-blocked',
    consumeRef: 'consume:fan-in-blocked',
    permissionAllowed: false,
    tokenVerified: false,
  });
  const fields = collectFieldNames(output);

  assert.equal(output.permissionBeforeConsume, true);
  assert.equal(output.record.tokenConsumed, false);
  assert.equal(output.posture.productionDurableBackend, 'not-implemented');
  assert.equal(output.posture.productionReadiness, 'not-production-ready');
  assert.equal(output.posture.readyToAttemptIsPass, false);
  assert.equal(output.posture.readyToRunIsPass, false);
  assertJsonSafe(output, 'callback decision output');

  for (const forbidden of [
    'tokenValue',
    'rawToken',
    'callbackToken',
    'callbackTokenValue',
    'providerToken',
    'providerTokenValue',
    'secret',
    'credential',
    'credentialValue',
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
  ]) {
    assert.equal(fields.has(forbidden), false, `output exposed forbidden field ${forbidden}`);
  }
});

function moduleRuntimeExportNames(module) {
  return Object.keys(module).sort();
}
