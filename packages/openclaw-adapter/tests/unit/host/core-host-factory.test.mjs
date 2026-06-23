import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES,
  REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES,
  createAdapterCoreHostFactory,
  getAvailableAdapterCoreFacadeMethods,
  getConfiguredAdapterCoreHostPorts,
  getMissingRequiredAdapterCoreFacadeMethods,
  getMissingRequiredAdapterCoreHostPorts,
  summarizeAdapterCoreHostReadiness,
} from '../../../dist/host/core-host-factory.js';

function createCompleteFacade(method) {
  return Object.freeze(
    Object.fromEntries(REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES.map((methodName) => [methodName, method])),
  );
}

function createCompletePorts() {
  return Object.freeze({
    agentControlHost: Object.freeze({ kind: 'fake-agent-control-host' }),
    sessionBindingStore: Object.freeze({ kind: 'fake-session-binding-store' }),
    presentationOutboxStore: Object.freeze({ kind: 'fake-presentation-outbox-store' }),
    presentationActionTokenStore: Object.freeze({ kind: 'fake-presentation-action-token-store' }),
  });
}

test('creates a deterministic not-ready shell when core facade and ports are unavailable', () => {
  const result = createAdapterCoreHostFactory({
    metadata: {
      adapterId: 'openclaw-telegram',
    },
  });

  assert.equal(result.ok, true);
  assert.equal('facade' in result.value, false);
  assert.deepEqual(result.value.facadeMethods, []);
  assert.deepEqual(result.value.configuredPorts, []);
  assert.deepEqual(result.value.missingRequiredPorts, [...REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES]);
  assert.deepEqual(result.value.missingRequiredFacadeMethods, [
    ...REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES,
  ]);
  assert.equal(result.value.metadata.corePackageName, 'hazeteam-core');
  assert.equal(result.value.metadata.coreFacadeSource, 'unavailable');
  assert.equal(result.value.readiness.status, 'not-ready');
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.ports), true);
});

test('wraps an injected facade and required ports without invoking runtime behavior', () => {
  let calls = 0;
  const method = () => {
    calls += 1;
    throw new Error('core facade methods must not be called by the factory');
  };
  const facade = createCompleteFacade(method);
  const ports = createCompletePorts();

  const result = createAdapterCoreHostFactory({
    facade,
    ports: {
      ...ports,
      healthReader: Object.freeze({ kind: 'fake-health-reader' }),
    },
    metadata: {
      adapterId: 'openclaw-telegram',
      corePackageVersion: '0.0.0-test',
      notes: ['unsafe_value=123'],
    },
  });

  assert.equal(calls, 0);
  assert.equal(result.ok, true);
  assert.equal(result.value.facade, facade);
  assert.equal(result.value.ports.agentControlHost, ports.agentControlHost);
  assert.deepEqual(result.value.missingRequiredFacadeMethods, []);
  assert.deepEqual(result.value.missingRequiredPorts, []);
  assert.deepEqual(result.value.facadeMethods, [...REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES]);
  assert.equal(result.value.metadata.coreFacadeSource, 'injected');
  assert.deepEqual(result.value.metadata.notes, ['[redacted]']);
  assert.equal(result.value.readiness.status, 'ready');
  assert.equal(
    result.value.readiness.checks.some((check) => check.component === 'core.optional-healthReader'),
    true,
  );
});

test('reports available facade methods and missing required methods structurally', () => {
  const facade = Object.freeze({
    submitHostAction: () => undefined,
    submitUserIntent: 'not-callable',
    getPortReadiness: () => undefined,
  });

  assert.deepEqual(getAvailableAdapterCoreFacadeMethods(facade), [
    'submitHostAction',
    'getPortReadiness',
  ]);
  assert.deepEqual(getMissingRequiredAdapterCoreFacadeMethods(facade), [
    'submitUserIntent',
    'listPendingPresentations',
    'claimPresentation',
    'markPresentationDelivered',
    'markPresentationFailed',
    'issueActionToken',
    'verifyActionToken',
    'consumeActionToken',
  ]);
});

test('reports configured and missing core host ports without touching port internals', () => {
  const ports = Object.freeze({
    agentControlHost: Object.freeze({ dispatch: () => undefined }),
    presentationOutboxStore: Object.freeze({ claim: () => undefined }),
  });

  assert.deepEqual(getConfiguredAdapterCoreHostPorts(ports), [
    'agentControlHost',
    'presentationOutboxStore',
  ]);
  assert.deepEqual(getMissingRequiredAdapterCoreHostPorts(ports), [
    'sessionBindingStore',
    'presentationActionTokenStore',
  ]);
});

test('summarizes host readiness as safe public adapter readiness', () => {
  const readiness = summarizeAdapterCoreHostReadiness({
    facade: createCompleteFacade(() => undefined),
    ports: createCompletePorts(),
  });

  assert.equal(readiness.status, 'ready');
  assert.deepEqual(
    readiness.checks.map((check) => [check.component, check.status]),
    [
      ['core', 'pass'],
      ['core.facade', 'pass'],
      ['core.ports', 'pass'],
    ],
  );
});

test('returns safe errors for invalid injected shell inputs', () => {
  const invalidFacadeResult = createAdapterCoreHostFactory({ facade: 42 });
  assert.equal(invalidFacadeResult.ok, false);
  assert.equal(invalidFacadeResult.error.code, 'invalid-input');
  assert.match(invalidFacadeResult.error.message, /facade/u);

  const invalidMetadataResult = createAdapterCoreHostFactory({
    metadata: {
      notes: [42],
    },
  });
  assert.equal(invalidMetadataResult.ok, false);
  assert.equal(invalidMetadataResult.error.code, 'invalid-input');
  assert.match(invalidMetadataResult.error.message, /metadata\.notes\[0\]/u);
});
