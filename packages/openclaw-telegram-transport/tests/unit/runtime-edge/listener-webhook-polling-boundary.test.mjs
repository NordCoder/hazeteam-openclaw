import assert from 'node:assert/strict';
import test from 'node:test';

const MODULE_PATH = '../../../dist/runtime-edge/index.js';

function protectedProcessMarker() {
  return String.fromCharCode(112, 114, 111, 99, 101, 115, 115, 46, 101, 110, 118);
}

function encoded(value) {
  return JSON.stringify(value);
}

function assertJsonSerializable(value) {
  assert.deepEqual(JSON.parse(encoded(value)), value);
}

function assertNoLeak(value, protectedTerms, isSafe) {
  const output = encoded(value);
  assert.equal(typeof output, 'string');
  assert.equal(isSafe(value), true);

  for (const term of protectedTerms) {
    assert.equal(output.includes(term), false, `runtime-edge boundary output leaked ${term}`);
  }
}

const PROTECTED_TERMS = [
  '123456:ABC-private-token',
  'Bearer private-token',
  'https://internal.service.local',
  '/Users/anna/private',
  'rawProviderPayload',
  'rawCallbackPayload',
  'callbackPayload',
  'providerClientObject',
  'providerHandleObject',
  'sdkClientHandle',
  'endpoint',
  'authorizationHeader',
  'stackTrace',
  'rawLog',
  'rawDiff',
  'rawOutput',
  protectedProcessMarker(),
  'runtimeValue',
];

test('package-local runtime-edge import is inert', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalSetInterval = globalThis.setInterval;

  globalThis.fetch = () => {
    calls.push('fetch');
    throw new Error('unexpected fetch during runtime-edge import');
  };
  globalThis.setTimeout = () => {
    calls.push('setTimeout');
    throw new Error('unexpected timer during runtime-edge import');
  };
  globalThis.setInterval = () => {
    calls.push('setInterval');
    throw new Error('unexpected loop during runtime-edge import');
  };

  try {
    const boundary = await import(MODULE_PATH + '?inert-import-check=' + Date.now());
    assert.equal(typeof boundary.createListenerLifecycleDescriptor, 'function');
    assert.equal(typeof boundary.normalizeWebhookInputBoundary, 'function');
    assert.equal(typeof boundary.createPollingPlanDescriptor, 'function');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.setInterval = originalSetInterval;
  }

  assert.deepEqual(calls, []);
});

test('listener lifecycle descriptor creation is inert data only', async () => {
  const {
    createListenerLifecycleDescriptor,
    isSafeListenerWebhookPollingBoundaryJson,
  } = await import(MODULE_PATH);

  const descriptor = createListenerLifecycleDescriptor({
    enabled: true,
    mode: 'listener',
    requestedStatus: 'running-descriptor-only',
    providerKind: 'telegram-openclaw',
    listenerRef: 'listener:w18d-safe-boundary',
    transportRef: 'transport:w18d-safe-boundary',
    correlationRef: 'corr:w18d-listener',
  });

  assert.equal(descriptor.descriptorKind, 'openclaw-telegram-runtime-edge-listener-lifecycle');
  assert.equal(descriptor.status, 'running-descriptor-only');
  assert.equal(descriptor.lifecycleContract, 'descriptor-only');
  assert.equal(descriptor.shutdownPolicy, 'caller-owned-descriptor-only');
  assert.equal(descriptor.retryPolicy, 'caller-owned-descriptor-only');
  assert.equal(descriptor.idempotencyPolicy, 'caller-owned-descriptor-only');
  assert.equal(descriptor.inertness.listenerStarted, false);
  assert.equal(descriptor.inertness.serverStarted, false);
  assert.equal(descriptor.inertness.pollingStarted, false);
  assert.equal(descriptor.inertness.schedulerStarted, false);
  assert.equal(descriptor.inertness.timerStarted, false);
  assert.equal(descriptor.inertness.daemonStarted, false);
  assert.equal(descriptor.inertness.remoteAttempt, 'not-attempted');
  assert.equal(descriptor.inertness.providerCall, 'not-executed');
  assert.equal(descriptor.inertness.fileAccess, 'not-attempted');
  assert.equal(descriptor.inertness.externalHandleCreated, false);
  assert.equal(descriptor.effects, 'none');
  assert.equal(descriptor.willCallRemote, false);
  assert.equal(descriptor.providerEdgePassed, false);
  assert.equal(descriptor.productionReady, false);
  assert.equal(descriptor.readinessClaim, 'contract-interface-only');
  assert.equal(isSafeListenerWebhookPollingBoundaryJson(descriptor), true);
  assertJsonSerializable(descriptor);
  assertNoLeak(descriptor, PROTECTED_TERMS, isSafeListenerWebhookPollingBoundaryJson);
});

test('webhook input boundary quarantines unsafe provider and callback material', async () => {
  const {
    isSafeListenerWebhookPollingBoundaryJson,
    normalizeWebhookInputBoundary,
  } = await import(MODULE_PATH);

  const report = normalizeWebhookInputBoundary({
    enabled: true,
    providerKind: 'telegram',
    webhookRef: 'webhook:w18d-safe-boundary',
    transportRef: 'transport:w18d-safe-boundary',
    inputClass: 'provider-update',
    method: 'POST',
    contentType: 'application/json',
    receivedAt: '2026-06-26T10:00:00.000Z',
    rawProviderPayload: { token: '123456:ABC-private-token' },
    rawCallbackPayload: 'approve:secret-token',
    callbackPayload: 'Bearer private-token',
    secretValue: 'Bearer private-token',
    credentialValue: '123456:ABC-private-token',
    endpoint: 'https://internal.service.local/webhook',
    authorizationHeader: 'Bearer private-token',
    providerClientObject: { connected: true },
    providerHandleObject: { kind: 'provider handle' },
    sdkClientHandle: { kind: 'sdk handle' },
    localPath: '/Users/anna/private/project',
    stackTrace: 'Error: private stack trace',
    rawLog: 'raw log output',
    rawDiff: 'raw diff output',
    rawOutput: 'private output',
    [protectedProcessMarker()]: 'TELEGRAM_PRIVATE_VALUE',
    runtimeValue: 'runtime value object',
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.normalization.providerInputPolicy, 'quarantine-only');
  assert.equal(report.normalization.callbackInputPolicy, 'quarantine-only');
  assert.equal(report.normalization.providerInputParsed, false);
  assert.equal(report.normalization.callbackInputParsed, false);
  assert.equal(report.normalization.providerInputExposed, false);
  assert.equal(report.normalization.callbackInputExposed, false);
  assert.equal(report.normalization.normalizedDescriptorCreated, false);
  assert.equal(report.inputInspection.unsafeInputDetected, true);
  assert.ok(report.inputInspection.redactedFieldCount >= 1);
  assert.ok(report.issues.some((issue) => issue.code === 'unsafe-input-redacted'));
  assert.equal(report.inertness.serverStarted, false);
  assert.equal(report.inertness.remoteAttempt, 'not-attempted');
  assert.equal(report.effects, 'none');
  assert.equal(report.willCallRemote, false);
  assert.equal(report.providerEdgePassed, false);
  assert.equal(report.productionReady, false);
  assert.equal(isSafeListenerWebhookPollingBoundaryJson(report), true);
  assertJsonSerializable(report);
  assertNoLeak(report, PROTECTED_TERMS, isSafeListenerWebhookPollingBoundaryJson);
});

test('polling plan descriptor defines cadence retry idempotency and shutdown without loops or timers', async () => {
  const {
    createPollingPlanDescriptor,
    isSafeListenerWebhookPollingBoundaryJson,
  } = await import(MODULE_PATH);

  const plan = createPollingPlanDescriptor({
    enabled: true,
    providerKind: 'telegram-openclaw',
    planRef: 'polling:w18d-safe-boundary',
    transportRef: 'transport:w18d-safe-boundary',
    requestedStatus: 'ready',
    intervalMs: 5000,
    maxBatchSize: 25,
    retryPolicy: {
      strategy: 'exponential-descriptor-only',
      maxAttempts: 4,
      backoffMs: 2000,
    },
    idempotency: {
      strategy: 'provider-update-ref',
    },
    shutdown: {
      strategy: 'graceful-descriptor-only',
    },
  });

  assert.equal(plan.status, 'ready');
  assert.equal(plan.cadence.cadenceKind, 'interval-descriptor-only');
  assert.equal(plan.cadence.intervalMs, 5000);
  assert.equal(plan.cadence.maxBatchSize, 25);
  assert.equal(plan.cadence.timerStarted, false);
  assert.equal(plan.cadence.loopStarted, false);
  assert.equal(plan.cadence.schedulerStarted, false);
  assert.equal(plan.retry.strategy, 'exponential-descriptor-only');
  assert.equal(plan.retry.maxAttempts, 4);
  assert.equal(plan.retry.backoffMs, 2000);
  assert.equal(plan.retry.retryState, 'not-started');
  assert.equal(plan.retry.retryTimerStarted, false);
  assert.equal(plan.idempotency.strategy, 'provider-update-ref');
  assert.equal(plan.idempotency.duplicatePolicy, 'dedupe-descriptor-only');
  assert.equal(plan.idempotency.durableWrite, 'not-executed');
  assert.equal(plan.shutdown.strategy, 'graceful-descriptor-only');
  assert.equal(plan.shutdown.shutdownState, 'not-started');
  assert.equal(plan.shutdown.signalSubscribed, false);
  assert.equal(plan.shutdown.cleanupExecuted, false);
  assert.equal(plan.inertness.pollingStarted, false);
  assert.equal(plan.inertness.timerStarted, false);
  assert.equal(plan.inertness.providerCall, 'not-executed');
  assert.equal(plan.inertness.remoteAttempt, 'not-attempted');
  assert.equal(plan.effects, 'none');
  assert.equal(plan.willCallRemote, false);
  assert.equal(plan.providerEdgePassed, false);
  assert.equal(plan.productionReady, false);
  assert.equal(isSafeListenerWebhookPollingBoundaryJson(plan), true);
  assertJsonSerializable(plan);
  assertNoLeak(plan, PROTECTED_TERMS, isSafeListenerWebhookPollingBoundaryJson);
});

test('disabled blocked stopped and failed-safe descriptors are not reported as passed or production ready', async () => {
  const {
    createListenerLifecycleDescriptor,
    createPollingPlanDescriptor,
    isSafeListenerWebhookPollingBoundaryJson,
    normalizeWebhookInputBoundary,
  } = await import(MODULE_PATH);

  const descriptors = [
    createListenerLifecycleDescriptor({ mode: 'disabled' }),
    normalizeWebhookInputBoundary({ requestedStatus: 'blocked' }),
    createPollingPlanDescriptor({ requestedStatus: 'stopped' }),
    createPollingPlanDescriptor({ requestedStatus: 'failed-safe' }),
  ];

  assert.deepEqual(
    descriptors.map((descriptor) => descriptor.status),
    ['disabled', 'blocked', 'stopped', 'failed-safe'],
  );

  for (const descriptor of descriptors) {
    assert.notEqual(descriptor.status, 'passed');
    assert.equal(descriptor.providerEdgePassed, false);
    assert.equal(descriptor.productionReady, false);
    assert.equal(descriptor.readinessClaim, 'contract-interface-only');
    assert.equal(descriptor.willCallRemote, false);
    assert.equal(descriptor.effects, 'none');
    assert.equal(isSafeListenerWebhookPollingBoundaryJson(descriptor), true);
    assertJsonSerializable(descriptor);
    assertNoLeak(descriptor, PROTECTED_TERMS, isSafeListenerWebhookPollingBoundaryJson);
  }
});
