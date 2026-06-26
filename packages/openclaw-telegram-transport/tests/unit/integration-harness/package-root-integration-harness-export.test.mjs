import assert from 'node:assert/strict';
import test from 'node:test';

const PACKAGE_ROOT_IMPORT = '../../../dist/index.js';

const REQUIRED_RUNTIME_EXPORTS = Object.freeze([
  'REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_KIND',
  'REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION',
  'REAL_INTEGRATION_PROVIDER_KINDS',
  'REAL_INTEGRATION_OPERATION_KINDS',
  'REAL_INTEGRATION_OPERATION_CLASSES',
  'REAL_INTEGRATION_PROVIDER_PORT_STATUSES',
  'REAL_INTEGRATION_NETWORK_GATE_STATUSES',
  'REAL_INTEGRATION_OPERATOR_ACKNOWLEDGEMENT_STATUSES',
  'REAL_INTEGRATION_RUNTIME_CREDENTIAL_STATUSES',
  'REAL_INTEGRATION_PROVIDER_ACK_STATUSES',
  'REAL_INTEGRATION_BUSINESS_RESULTS',
  'REAL_INTEGRATION_ATTEMPT_READINESS_STATUSES',
  'REAL_INTEGRATION_NORMALIZED_ATTEMPT_STATUSES',
  'createRealIntegrationAttemptPlanDescriptor',
  'normalizeSuppliedRealIntegrationAttemptResult',
  'isSafeRealIntegrationAttemptJson',
]);

const W19D_DESCRIPTOR_SURFACES = Object.freeze([
  'config',
  'secrets',
  'channel-event-source',
  'delivery-port',
  'callback-handler-port',
  'topic-command-router',
  'real-smoke-gate',
  'integration-harness',
]);

const FORBIDDEN_MATERIAL = Object.freeze([
  'unsafe-provider-token-value',
  'unsafe-private-provider-ref',
  'https://provider.example.invalid/send',
  '/private/local/path',
  'unsafeProviderPayload',
  'unsafeCallbackPayload',
  'providerPayload',
  'callbackPayload',
  'stackTrace',
  'clientHandle',
  'providerHandle',
  'sdkHandle',
  'logOutput',
  'diffOutput',
  'commandOutput',
]);

const NETWORK_MODULE_PATTERN = /\b(?:node:)?(?:http|https|net|tls)\b/iu;

function loadedNetworkModuleEntries() {
  return new Set(process.moduleLoadList.filter((entry) => NETWORK_MODULE_PATTERN.test(entry)));
}

async function withRuntimeTripwire(fn) {
  const calls = [];
  const originals = new Map();

  function replaceGlobal(name) {
    if (name === 'WebSocket' && !(name in globalThis)) {
      return;
    }

    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: () => {
        calls.push(name);
        throw new Error(`W19D package root import invoked forbidden runtime primitive: ${name}`);
      },
    });
  }

  replaceGlobal('fetch');
  replaceGlobal('WebSocket');
  replaceGlobal('setInterval');

  const beforeModules = loadedNetworkModuleEntries();

  try {
    const result = await fn();
    const afterModules = loadedNetworkModuleEntries();
    const newlyLoadedNetworkModules = [...afterModules].filter((entry) => !beforeModules.has(entry));

    assert.deepEqual(calls, [], 'package root import must not invoke guarded runtime primitives');
    assert.deepEqual(newlyLoadedNetworkModules, [], 'package root import must not dynamically load core network modules');

    return result;
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(globalThis, name);
      } else {
        Object.defineProperty(globalThis, name, descriptor);
      }
    }
  }
}

function readyPlanInput(overrides = {}) {
  return {
    providerKind: 'telegram-openclaw',
    operationKind: 'delivery',
    operationClass: 'ephemeral-write',
    correlationRef: 'corr:w19d:ready',
    targetRef: 'target:w19d:ready',
    providerPortStatus: 'available',
    networkGateStatus: 'open',
    operatorAcknowledgementStatus: 'acknowledged',
    runtimeCredentialStatus: 'configured-redacted',
    ...overrides,
  };
}

function assertPublicJsonNoLeak(value, isSafeRealIntegrationAttemptJson) {
  const output = JSON.stringify(value);
  assert.equal(typeof output, 'string');
  assert.deepEqual(JSON.parse(output), value);

  for (const term of FORBIDDEN_MATERIAL) {
    assert.equal(output.includes(term), false, `package-root public JSON leaked ${term}`);
  }

  if (value.descriptorKind === 'real-integration-attempt-contract' || value.descriptorKind === 'real-integration-attempt-result') {
    assert.equal(isSafeRealIntegrationAttemptJson(value), true);
  }
}

test('W19D package root exports the real integration attempt harness surface', async () => {
  await withRuntimeTripwire(async () => {
    const packageRoot = await import(PACKAGE_ROOT_IMPORT);

    for (const exportName of REQUIRED_RUNTIME_EXPORTS) {
      assert.equal(Object.hasOwn(packageRoot, exportName), true, `missing package root export ${exportName}`);
    }

    assert.equal(packageRoot.REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_KIND, 'real-integration-attempt-contract');
    assert.equal(packageRoot.REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION, 'w19a');
    assert.deepEqual(packageRoot.REAL_INTEGRATION_PROVIDER_KINDS, ['telegram', 'openclaw', 'telegram-openclaw']);
    assert.deepEqual(packageRoot.REAL_INTEGRATION_OPERATION_KINDS, ['delivery', 'callback-acknowledgement']);
    assert.deepEqual(packageRoot.REAL_INTEGRATION_PROVIDER_PORT_STATUSES, ['missing', 'available']);
    assert.deepEqual(packageRoot.REAL_INTEGRATION_NETWORK_GATE_STATUSES, ['closed', 'open']);
    assert.deepEqual(packageRoot.REAL_INTEGRATION_OPERATOR_ACKNOWLEDGEMENT_STATUSES, ['missing', 'acknowledged']);
    assert.deepEqual(packageRoot.REAL_INTEGRATION_RUNTIME_CREDENTIAL_STATUSES, [
      'configured-redacted',
      'redacted',
      'missing',
      'invalid',
      'unavailable',
    ]);
    assert.deepEqual(packageRoot.REAL_INTEGRATION_PROVIDER_ACK_STATUSES, [
      'not-attempted',
      'provider-acknowledged',
      'provider-rejected',
    ]);
    assert.deepEqual(packageRoot.REAL_INTEGRATION_BUSINESS_RESULTS, [
      'not-attempted',
      'business-succeeded',
      'business-failed-safe',
    ]);
    assert.equal(typeof packageRoot.createRealIntegrationAttemptPlanDescriptor, 'function');
    assert.equal(typeof packageRoot.normalizeSuppliedRealIntegrationAttemptResult, 'function');
    assert.equal(typeof packageRoot.isSafeRealIntegrationAttemptJson, 'function');
  });
});

test('W19D package descriptor documents integration harness public metadata', async () => {
  await withRuntimeTripwire(async () => {
    const packageRoot = await import(PACKAGE_ROOT_IMPORT);
    const description = packageRoot.describeOpenClawTelegramTransport();
    const descriptor = description.descriptor;

    assert.equal(description.package.productionReady, false);
    assert.equal(description.package.status, 'w19-integration-harness-public-export');
    assert.equal(description.package.contractSlice, 'W19D');
    assert.equal(descriptor.descriptorVersion, 'w19d');
    assert.equal(descriptor.packageStatus, 'w19-integration-harness-public-export');
    assert.equal(descriptor.readiness, 'adapter-ready-for-real-system-integration-under-explicit-gates');
    assert.equal(descriptor.scope, 'w19-integration-harness-public-export');
    assert.equal(descriptor.productionReady, false);
    assert.equal(descriptor.defaultNetworkBehavior, 'none');
    assert.equal(descriptor.runtimeClientConstructedByDefault, false);
    assert.equal(descriptor.listenerWebhookPollingRuntime, false);
    assert.equal(descriptor.effects, 'none');
    assert.equal(descriptor.realSmokeDefault, 'skipped-or-blocked');
    assert.deepEqual(descriptor.publicSurfaces, W19D_DESCRIPTOR_SURFACES);
    assert.deepEqual(packageRoot.OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES, W19D_DESCRIPTOR_SURFACES);
    assert.equal(descriptor.publicSurfaces.includes('integration-harness'), true);
    assert.equal(packageRoot.OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES.includes('integration-harness'), true);

    assertPublicJsonNoLeak(description, packageRoot.isSafeRealIntegrationAttemptJson);
  });
});

test('W19D package root exposes callable inert attempt descriptor creation', async () => {
  await withRuntimeTripwire(async () => {
    const packageRoot = await import(PACKAGE_ROOT_IMPORT);
    const descriptor = packageRoot.createRealIntegrationAttemptPlanDescriptor();

    assert.equal(descriptor.descriptorKind, 'real-integration-attempt-contract');
    assert.equal(descriptor.descriptorVersion, 'w19a');
    assert.equal(descriptor.runtimeClaim, 'not-production-runtime');
    assert.equal(descriptor.readinessClaim, 'explicit-gate-only');
    assert.equal(descriptor.providerPortStatus, 'missing');
    assert.equal(descriptor.networkGateStatus, 'closed');
    assert.equal(descriptor.operatorAcknowledgementStatus, 'missing');
    assert.equal(descriptor.runtimeCredentialStatus, 'missing');
    assert.equal(descriptor.attemptReadinessStatus, 'blocked-missing-port');
    assert.equal(descriptor.willCallRemote, false);
    assert.equal(descriptor.effects, 'none');
    assert.equal(descriptor.noDefaultNetwork, true);
    assert.equal(descriptor.noSecretLoading, true);
    assert.equal(descriptor.providerAcknowledgementImpliesBusinessSuccess, false);
    assert.equal(descriptor.readyToAttemptIsPass, false);
    assert.equal(descriptor.passRequiresProviderAckAndBusinessSuccess, true);
    assert.equal(descriptor.jsonSerializable, true);

    assertPublicJsonNoLeak(descriptor, packageRoot.isSafeRealIntegrationAttemptJson);
  });
});

test('W19D ready-to-attempt from package root is not pass', async () => {
  await withRuntimeTripwire(async () => {
    const packageRoot = await import(PACKAGE_ROOT_IMPORT);
    const plan = packageRoot.createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
    const result = packageRoot.normalizeSuppliedRealIntegrationAttemptResult({ plan });

    assert.equal(plan.attemptReadinessStatus, 'ready-to-attempt');
    assert.equal(plan.readyToAttemptIsPass, false);
    assert.equal(result.attemptStatus, 'ready-to-attempt');
    assert.equal(result.readyToAttemptIsPass, false);
    assert.equal(result.providerAcknowledged, false);
    assert.equal(result.businessSucceeded, false);
    assert.equal(result.passed, false);
    assert.equal(result.willCallRemote, false);
    assert.equal(result.effects, 'none');

    assertPublicJsonNoLeak(plan, packageRoot.isSafeRealIntegrationAttemptJson);
    assertPublicJsonNoLeak(result, packageRoot.isSafeRealIntegrationAttemptJson);
  });
});

test('W19D provider acknowledgement without business success is not pass from package root', async () => {
  await withRuntimeTripwire(async () => {
    const packageRoot = await import(PACKAGE_ROOT_IMPORT);
    const plan = packageRoot.createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
    const result = packageRoot.normalizeSuppliedRealIntegrationAttemptResult({
      plan,
      attemptExecutorInvoked: true,
      attemptEvidenceStatus: 'supplied-redacted',
      providerAckStatus: 'provider-acknowledged',
      businessResult: 'not-attempted',
      redactedEvidenceRef: 'evidence:w19d:ack-only',
    });

    assert.equal(result.attemptStatus, 'provider-acknowledged');
    assert.equal(result.providerAckStatus, 'provider-acknowledged');
    assert.equal(result.providerAcknowledged, true);
    assert.equal(result.businessResult, 'not-attempted');
    assert.equal(result.businessSucceeded, false);
    assert.equal(result.providerAcknowledgementImpliesBusinessSuccess, false);
    assert.equal(result.passed, false);
    assert.equal(result.willCallRemote, true);

    assertPublicJsonNoLeak(result, packageRoot.isSafeRealIntegrationAttemptJson);
  });
});

test('W19D package root pass requires supplied redacted provider acknowledgement plus business success', async () => {
  await withRuntimeTripwire(async () => {
    const packageRoot = await import(PACKAGE_ROOT_IMPORT);
    const plan = packageRoot.createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
    const missingEvidence = packageRoot.normalizeSuppliedRealIntegrationAttemptResult({
      plan,
      attemptExecutorInvoked: true,
      providerAckStatus: 'provider-acknowledged',
      businessResult: 'business-succeeded',
      redactedEvidenceRef: 'evidence:w19d:missing-evidence',
    });
    const passed = packageRoot.normalizeSuppliedRealIntegrationAttemptResult({
      plan,
      attemptExecutorInvoked: true,
      attemptEvidenceStatus: 'supplied-redacted',
      providerAckStatus: 'provider-acknowledged',
      businessResult: 'business-succeeded',
      redactedEvidenceRef: 'evidence:w19d:provider-ack-business-success',
    });

    assert.equal(missingEvidence.attemptStatus, 'ready-to-attempt');
    assert.equal(missingEvidence.passed, false);
    assert.equal(missingEvidence.attemptEvidenceStatus, 'not-supplied');

    assert.equal(passed.attemptStatus, 'business-succeeded');
    assert.equal(passed.attemptEvidenceStatus, 'supplied-redacted');
    assert.equal(passed.providerAckStatus, 'provider-acknowledged');
    assert.equal(passed.providerAcknowledged, true);
    assert.equal(passed.businessResult, 'business-succeeded');
    assert.equal(passed.businessSucceeded, true);
    assert.equal(passed.passed, true);
    assert.equal(passed.noLeakResult, 'passed');
    assert.equal(passed.redactedFailure, 'none');
    assert.equal(passed.willCallRemote, true);
    assert.equal(passed.effects, 'injected-attempt-executor-invoked');

    assertPublicJsonNoLeak(missingEvidence, packageRoot.isSafeRealIntegrationAttemptJson);
    assertPublicJsonNoLeak(passed, packageRoot.isSafeRealIntegrationAttemptJson);
  });
});

test('W19D package root real integration harness unsafe supplied output fails safe without leaking', async () => {
  await withRuntimeTripwire(async () => {
    const packageRoot = await import(PACKAGE_ROOT_IMPORT);
    const plan = packageRoot.createRealIntegrationAttemptPlanDescriptor(readyPlanInput());
    const result = packageRoot.normalizeSuppliedRealIntegrationAttemptResult({
      plan,
      attemptExecutorInvoked: true,
      attemptEvidenceStatus: 'supplied-redacted',
      providerAckStatus: 'provider-acknowledged',
      businessResult: 'business-succeeded',
      redactedEvidenceRef: 'evidence:w19d:unsafe',
      rawProviderPayload: 'unsafe-provider-token-value',
      callbackPayload: { unsafeCallbackPayload: 'unsafe-private-provider-ref' },
      redactedFailureSummary: 'https://provider.example.invalid/send /private/local/path stackTrace clientHandle providerHandle sdkHandle logOutput diffOutput commandOutput',
    });

    assert.equal(result.attemptStatus, 'failed-safe-unsafe-output');
    assert.equal(result.passed, false);
    assert.equal(result.providerAcknowledged, false);
    assert.equal(result.businessSucceeded, false);
    assert.equal(result.redactedFailure, 'unsafe-output-redacted');
    assert.equal(result.noLeakResult, 'failed-safe');
    assert.equal(result.willCallRemote, false);
    assert.equal(result.effects, 'none');

    const output = JSON.stringify(result);
    assert.deepEqual(JSON.parse(output), result);
    for (const term of FORBIDDEN_MATERIAL) {
      assert.equal(output.includes(term), false, `unsafe package-root result leaked ${term}`);
    }
  });
});
