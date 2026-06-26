import assert from 'node:assert/strict';
import test from 'node:test';

let integrationHarnessModule;
async function integrationHarness() {
  if (integrationHarnessModule === undefined) {
    integrationHarnessModule = await import('../../../dist/integration-harness/index.js');
  }

  return integrationHarnessModule;
}

const FORBIDDEN_MATERIAL = [
  '123456:ABC-private-provider',
  'Bearer provider-secret',
  'https://provider.internal/send',
  '/Users/anna/private',
  'rawProviderPayload',
  'rawCallbackPayload',
  'providerPayload',
  'callbackPayload',
  'stackTrace',
  'clientHandle',
  'providerHandle',
  'sdkHandle',
  'logOutput',
  'diffOutput',
  'commandOutput',
];

function encoded(value) {
  return JSON.stringify(value);
}

async function assertNoLeak(value) {
  const { isSafeRealIntegrationAttemptJson } = await integrationHarness();
  const output = encoded(value);
  assert.equal(typeof output, 'string');
  assert.equal(isSafeRealIntegrationAttemptJson(value), true);

  for (const term of FORBIDDEN_MATERIAL) {
    assert.equal(output.includes(term), false, `real integration attempt output leaked ${term}`);
  }
}

function readyPlanInput(overrides = {}) {
  return {
    providerKind: 'telegram-openclaw',
    operationKind: 'delivery',
    operationClass: 'ephemeral-write',
    correlationRef: 'corr:w19a:ready',
    targetRef: 'target:w19a:ready',
    providerPortStatus: 'available',
    networkGateStatus: 'open',
    operatorAcknowledgementStatus: 'acknowledged',
    runtimeCredentialStatus: 'configured-redacted',
    ...overrides,
  };
}

test('default descriptor is inert and safe to serialize', async () => {
  const { createRealIntegrationAttemptPlanDescriptor } = await integrationHarness();
  const descriptor = createRealIntegrationAttemptPlanDescriptor();

  assert.equal(descriptor.descriptorKind, 'real-integration-attempt-contract');
  assert.equal(descriptor.descriptorVersion, 'w19a');
  assert.equal(descriptor.contractKind, 'adapter-integration-harness');
  assert.equal(descriptor.readinessClaim, 'explicit-gate-only');
  assert.equal(descriptor.runtimeClaim, 'not-production-runtime');
  assert.equal(descriptor.providerPortStatus, 'missing');
  assert.equal(descriptor.attemptReadinessStatus, 'blocked-missing-port');
  assert.equal(descriptor.willCallRemote, false);
  assert.equal(descriptor.effects, 'none');
  assert.equal(descriptor.noDefaultNetwork, true);
  assert.equal(descriptor.noSecretLoading, true);
  assert.equal(descriptor.jsonSerializable, true);
  assert.deepEqual(JSON.parse(JSON.stringify(descriptor)), descriptor);
  await assertNoLeak(descriptor);
});

test('missing provider port blocks before an attempt can run', async () => {
  const { createRealIntegrationAttemptPlanDescriptor } = await integrationHarness();
  const descriptor = createRealIntegrationAttemptPlanDescriptor(
    readyPlanInput({ providerPortStatus: 'missing', injectedAttemptExecutorInvoked: true }),
  );

  assert.equal(descriptor.attemptReadinessStatus, 'blocked-missing-port');
  assert.equal(descriptor.willCallRemote, false);
  assert.equal(descriptor.effects, 'none');
  assert.equal(descriptor.providerAcknowledgementImpliesBusinessSuccess, false);
  await assertNoLeak(descriptor);
});

test('missing operator acknowledgement blocks before an attempt can run', async () => {
  const { createRealIntegrationAttemptPlanDescriptor } = await integrationHarness();
  const descriptor = createRealIntegrationAttemptPlanDescriptor(
    readyPlanInput({ operatorAcknowledgementStatus: 'missing', injectedAttemptExecutorInvoked: true }),
  );

  assert.equal(descriptor.attemptReadinessStatus, 'blocked-operator-ack-missing');
  assert.equal(descriptor.willCallRemote, false);
  assert.equal(descriptor.effects, 'none');
  await assertNoLeak(descriptor);
});

test('missing network gate blocks before an attempt can run', async () => {
  const { createRealIntegrationAttemptPlanDescriptor } = await integrationHarness();
  const descriptor = createRealIntegrationAttemptPlanDescriptor(
    readyPlanInput({ networkGateStatus: 'closed', injectedAttemptExecutorInvoked: true }),
  );

  assert.equal(descriptor.attemptReadinessStatus, 'blocked-network-gate-closed');
  assert.equal(descriptor.willCallRemote, false);
  assert.equal(descriptor.effects, 'none');
  await assertNoLeak(descriptor);
});

test('ready-to-attempt is not pass and does not call remote without injected executor invocation', async () => {
  const { createRealIntegrationAttemptPlanDescriptor, normalizeSuppliedRealIntegrationAttemptResult } = await integrationHarness();
  const plan = createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
  const result = normalizeSuppliedRealIntegrationAttemptResult({ plan });

  assert.equal(plan.attemptReadinessStatus, 'ready-to-attempt');
  assert.equal(plan.willCallRemote, false);
  assert.equal(result.attemptStatus, 'ready-to-attempt');
  assert.equal(result.passed, false);
  assert.equal(result.readyToAttemptIsPass, false);
  assert.equal(result.providerAcknowledged, false);
  assert.equal(result.businessSucceeded, false);
  assert.equal(result.willCallRemote, false);
  await assertNoLeak(result);
});

test('provider acknowledgement without business success is not pass', async () => {
  const { createRealIntegrationAttemptPlanDescriptor, normalizeSuppliedRealIntegrationAttemptResult } = await integrationHarness();
  const plan = createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
  const result = normalizeSuppliedRealIntegrationAttemptResult({
    plan,
    attemptExecutorInvoked: true,
    attemptEvidenceStatus: 'supplied-redacted',
    providerAckStatus: 'provider-acknowledged',
    businessResult: 'not-attempted',
    redactedEvidenceRef: 'evidence:w19a:ack-only',
  });

  assert.equal(result.attemptStatus, 'provider-acknowledged');
  assert.equal(result.providerAcknowledged, true);
  assert.equal(result.businessSucceeded, false);
  assert.equal(result.passed, false);
  assert.equal(result.providerAcknowledgementImpliesBusinessSuccess, false);
  assert.equal(result.willCallRemote, true);
  await assertNoLeak(result);
});

test('provider rejected fails safely', async () => {
  const { createRealIntegrationAttemptPlanDescriptor, normalizeSuppliedRealIntegrationAttemptResult } = await integrationHarness();
  const plan = createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
  const result = normalizeSuppliedRealIntegrationAttemptResult({
    plan,
    attemptExecutorInvoked: true,
    attemptEvidenceStatus: 'supplied-redacted',
    providerAckStatus: 'provider-rejected',
    businessResult: 'not-attempted',
    redactedEvidenceRef: 'evidence:w19a:provider-rejected',
  });

  assert.equal(result.attemptStatus, 'provider-rejected');
  assert.equal(result.providerAcknowledged, false);
  assert.equal(result.businessSucceeded, false);
  assert.equal(result.passed, false);
  assert.equal(result.redactedFailure, 'provider-rejected-safe');
  await assertNoLeak(result);
});

test('business failed safely fails safely after provider acknowledgement', async () => {
  const { createRealIntegrationAttemptPlanDescriptor, normalizeSuppliedRealIntegrationAttemptResult } = await integrationHarness();
  const plan = createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
  const result = normalizeSuppliedRealIntegrationAttemptResult({
    plan,
    attemptExecutorInvoked: true,
    attemptEvidenceStatus: 'supplied-redacted',
    providerAckStatus: 'provider-acknowledged',
    businessResult: 'business-failed-safe',
    redactedEvidenceRef: 'evidence:w19a:business-failed-safe',
  });

  assert.equal(result.attemptStatus, 'business-failed-safe');
  assert.equal(result.providerAcknowledged, true);
  assert.equal(result.businessSucceeded, false);
  assert.equal(result.passed, false);
  assert.equal(result.redactedFailure, 'business-failed-safe');
  await assertNoLeak(result);
});

test('supplied acknowledgement plus business success can pass', async () => {
  const { createRealIntegrationAttemptPlanDescriptor, normalizeSuppliedRealIntegrationAttemptResult } = await integrationHarness();
  const plan = createRealIntegrationAttemptPlanDescriptor(readyPlanInput({ injectedAttemptExecutorInvoked: true }));
  const result = normalizeSuppliedRealIntegrationAttemptResult({
    plan,
    attemptExecutorInvoked: true,
    attemptEvidenceStatus: 'supplied-redacted',
    providerAckStatus: 'provider-acknowledged',
    businessResult: 'business-succeeded',
    redactedEvidenceRef: 'evidence:w19a:provider-ack-business-success',
  });

  assert.equal(plan.willCallRemote, true);
  assert.equal(plan.effects, 'injected-attempt-executor-invoked');
  assert.equal(result.attemptStatus, 'business-succeeded');
  assert.equal(result.providerAcknowledged, true);
  assert.equal(result.businessSucceeded, true);
  assert.equal(result.passed, true);
  assert.equal(result.willCallRemote, true);
  assert.equal(result.effects, 'injected-attempt-executor-invoked');
  await assertNoLeak(result);
});

test('unsafe output fails safely and redacts', async () => {
  const { createRealIntegrationAttemptPlanDescriptor, normalizeSuppliedRealIntegrationAttemptResult } = await integrationHarness();
  const plan = createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
  const result = normalizeSuppliedRealIntegrationAttemptResult({
    plan,
    attemptExecutorInvoked: true,
    attemptEvidenceStatus: 'supplied-redacted',
    providerAckStatus: 'provider-acknowledged',
    businessResult: 'business-succeeded',
    redactedEvidenceRef: 'evidence:w19a:unsafe',
    rawProviderPayload: '123456:ABC-private-provider',
    callbackPayload: { authorization: 'Bearer provider-secret' },
    redactedFailureSummary: 'https://provider.internal/send /Users/anna/private stackTrace clientHandle providerHandle sdkHandle logOutput diffOutput commandOutput',
  });

  assert.equal(result.attemptStatus, 'failed-safe-unsafe-output');
  assert.equal(result.passed, false);
  assert.equal(result.providerAcknowledged, false);
  assert.equal(result.businessSucceeded, false);
  assert.equal(result.redactedFailure, 'unsafe-output-redacted');
  assert.equal(result.noLeakResult, 'failed-safe');
  assert.equal(result.willCallRemote, false);

  const output = encoded(result);
  for (const term of FORBIDDEN_MATERIAL) {
    assert.equal(output.includes(term), false, `unsafe result leaked ${term}`);
  }
  assert.deepEqual(JSON.parse(output), result);
});

test('malformed supplied result fails safely', async () => {
  const { createRealIntegrationAttemptPlanDescriptor, normalizeSuppliedRealIntegrationAttemptResult } = await integrationHarness();
  const plan = createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
  const result = normalizeSuppliedRealIntegrationAttemptResult({
    plan,
    attemptExecutorInvoked: true,
    attemptEvidenceStatus: 'supplied-redacted',
    businessResult: 'business-succeeded',
    redactedEvidenceRef: 'evidence:w19a:malformed',
  });

  assert.equal(result.attemptStatus, 'failed-safe-malformed-result');
  assert.equal(result.passed, false);
  assert.equal(result.redactedFailure, 'malformed-result-redacted');
  assert.equal(result.providerAckStatus, 'not-attempted');
  await assertNoLeak(result);
});

test('callback plan uses only safe callback refs', async () => {
  const { createRealIntegrationAttemptPlanDescriptor } = await integrationHarness();
  const descriptor = createRealIntegrationAttemptPlanDescriptor(
    readyPlanInput({
      operationKind: 'callback-acknowledgement',
      callbackRef: 'callback:w19a:safe',
      targetRef: 'target:w19a:ignored',
    }),
  );

  assert.equal(descriptor.operationKind, 'callback-acknowledgement');
  assert.equal(descriptor.callbackRef, 'callback:w19a:safe');
  assert.equal(Object.hasOwn(descriptor, 'targetRef'), false);
  assert.equal(descriptor.attemptReadinessStatus, 'ready-to-attempt');
  await assertNoLeak(descriptor);
});

test('JSON serialization does not leak forbidden material', async () => {
  const { createRealIntegrationAttemptPlanDescriptor, normalizeSuppliedRealIntegrationAttemptResult } = await integrationHarness();
  const plan = createRealIntegrationAttemptPlanDescriptor(
    readyPlanInput({
      correlationRef: 'Bearer provider-secret',
      targetRef: 'https://provider.internal/send',
    }),
  );
  const result = normalizeSuppliedRealIntegrationAttemptResult({
    plan,
    attemptExecutorInvoked: true,
    attemptEvidenceStatus: 'supplied-redacted',
    providerAckStatus: 'provider-acknowledged',
    businessResult: 'business-succeeded',
    redactedEvidenceRef: '/Users/anna/private',
  });

  assert.equal(plan.correlationRef, 'corr:w19a-real-integration-attempt');
  assert.equal(plan.targetRef, 'target:w19a:redacted');
  assert.equal(plan.attemptReadinessStatus, 'blocked-missing-safe-ref');
  assert.equal(result.redactedEvidenceRef, 'evidence:w19a:redacted');
  assert.deepEqual(JSON.parse(JSON.stringify(plan)), plan);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);

  for (const value of [plan, result]) {
    const output = encoded(value);
    for (const term of FORBIDDEN_MATERIAL) {
      assert.equal(output.includes(term), false, `serialized output leaked ${term}`);
    }
  }
});

test('importing the module has no side effects', async () => {
  let remoteCalls = 0;
  let timerCalls = 0;
  const hadFetch = Object.prototype.hasOwnProperty.call(globalThis, 'fetch');
  const hadTimer = Object.prototype.hasOwnProperty.call(globalThis, 'setInterval');
  const originalFetch = globalThis.fetch;
  const originalTimer = globalThis.setInterval;

  globalThis.fetch = function blockedFetch() {
    remoteCalls += 1;
    throw new Error('remote call should not run');
  };
  globalThis.setInterval = function blockedTimer() {
    timerCalls += 1;
    throw new Error('timer should not start');
  };

  try {
    const mod = await import(`../../../dist/integration-harness/index.js?side-effect-check=${Date.now()}`);
    const descriptor = mod.createRealIntegrationAttemptPlanDescriptor();

    assert.equal(remoteCalls, 0);
    assert.equal(timerCalls, 0);
    assert.equal(descriptor.effects, 'none');
    assert.equal(descriptor.willCallRemote, false);
  } finally {
    if (hadFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete globalThis.fetch;
    }

    if (hadTimer) {
      globalThis.setInterval = originalTimer;
    } else {
      delete globalThis.setInterval;
    }
  }
});
