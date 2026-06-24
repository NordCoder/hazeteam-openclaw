import assert from 'node:assert/strict';
import test from 'node:test';

import { ok } from 'hazeteam-core/foundation';
import {
  CORE_INTERACTION_CONTRACT_VERSION,
  CORE_INTERACTION_METHOD_NAMES,
  assertInMemoryHostSessionBindingStore,
  createCoreInteractionHost,
  describeCoreInteractionHostContract,
  describeCoreInteractionPortInventory,
  validateCoreInteractionPortInventory,
} from 'hazeteam-core/host';
import {
  createInMemoryPresentationActionTokenStore,
  createInMemoryPresentationOutboxStore,
} from 'hazeteam-core/presentation';

const FIXED_NOW = '2026-06-24T00:00:00.000Z';

const REQUIRED_CORE_HOST_METHODS = Object.freeze([
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
]);

const REQUIRED_READY_PORTS = Object.freeze([
  'agentControlHost',
  'presentationOutboxStore',
  'presentationActionTokenStore',
  'sessionBindingStore',
]);

const FORBIDDEN_PUBLIC_LEAK_TERMS = Object.freeze([
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'rawApprovalPayload',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
  'filesystem',
  'storageRoot',
  'storagePath',
]);

function fixedNow() {
  return FIXED_NOW;
}

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertObjectLike(value, label) {
  assert.notEqual(value, null, `${label} must not be null`);
  assert.equal(typeof value, 'object', `${label} must be object-like`);
  assert.equal(Array.isArray(value), false, `${label} must not be an array`);
}

function assertJsonSerializable(value, label) {
  const serialized = JSON.stringify(value);
  assert.notEqual(serialized, undefined, `${label} must be JSON-serializable`);
  JSON.parse(serialized);
  return serialized;
}

function assertNoForbiddenPublicLeakTerms(value, label) {
  const serialized = assertJsonSerializable(value, label);
  const normalizedSerialized = normalizeForLeakScan(serialized);

  for (const forbiddenTerm of FORBIDDEN_PUBLIC_LEAK_TERMS) {
    assert.equal(
      normalizedSerialized.includes(normalizeForLeakScan(forbiddenTerm)),
      false,
      `${label} serialized output exposes forbidden term ${forbiddenTerm}`,
    );
  }

  const queue = [value];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      const normalizedKey = normalizeForLeakScan(key);
      for (const forbiddenTerm of FORBIDDEN_PUBLIC_LEAK_TERMS) {
        assert.notEqual(
          normalizedKey,
          normalizeForLeakScan(forbiddenTerm),
          `${label} exposes forbidden public field ${key}`,
        );
      }

      if (nestedValue !== null && typeof nestedValue === 'object') {
        queue.push(nestedValue);
      }
    }
  }
}

function createFakeAgentControlHost() {
  const surface = Object.freeze({
    contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
    agentRef: Object.freeze({ id: 'agent:w12b-core-host' }),
    workspaceRef: Object.freeze({ id: 'workspace:w12b-core-host' }),
    displayName: 'W12B Core Host',
    topicTitle: 'W12B Core Host',
    helpText: 'Deterministic fake surface for W12B real core host composition.',
    availability: 'active',
    commands: Object.freeze([]),
  });

  return Object.freeze({
    listAgentSurfaces() {
      return ok(Object.freeze([surface]));
    },
    getAgentSurface() {
      return ok(surface);
    },
    dispatch(action) {
      return Promise.resolve(ok(Object.freeze({
        contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
        agentRef: action.agentRef ?? surface.agentRef,
        workspaceRef: action.workspaceRef ?? surface.workspaceRef,
        ...(action.sessionRef !== undefined ? { sessionRef: action.sessionRef } : {}),
        outboundItems: Object.freeze([]),
        updatedAt: FIXED_NOW,
        executionContext: Object.freeze({
          contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
          workspaceRef: action.workspaceRef ?? surface.workspaceRef,
          preparedAt: FIXED_NOW,
        }),
      })));
    },
  });
}

function createRealCoreHostWithFakePorts() {
  return createCoreInteractionHost({
    agentControlHost: createFakeAgentControlHost(),
    sessionBindingStore: assertInMemoryHostSessionBindingStore({ now: fixedNow }),
    presentationOutboxStore: createInMemoryPresentationOutboxStore({ now: fixedNow }),
    presentationActionTokenStore: createInMemoryPresentationActionTokenStore({
      now: fixedNow,
      createTokenId: () => 'presentation-action-token:w12b',
    }),
    now: fixedNow,
    correlationId: 'correlation:w12b-real-core-host',
  });
}

test('W12B composes the real public core host facade with fake in-memory ports', async () => {
  const coreHost = createRealCoreHostWithFakePorts();
  assertObjectLike(coreHost, 'core host facade');

  const contract = describeCoreInteractionHostContract();
  assert.equal(contract.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);
  assert.equal(contract.facadeStatus, 'production_composed');
  assert.deepEqual([...contract.methods], [...REQUIRED_CORE_HOST_METHODS]);
  assert.deepEqual([...CORE_INTERACTION_METHOD_NAMES], [...REQUIRED_CORE_HOST_METHODS]);

  for (const methodName of REQUIRED_CORE_HOST_METHODS) {
    assert.equal(typeof coreHost[methodName], 'function', `core host facade exposes ${methodName}`);
  }

  const readinessEnvelope = await coreHost.getPortReadiness({
    correlationId: 'correlation:w12b-readiness',
  });

  assertObjectLike(readinessEnvelope, 'core host readiness envelope');
  assert.equal(readinessEnvelope.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);
  assert.equal(readinessEnvelope.ok, true);
  assertObjectLike(readinessEnvelope.value, 'core host readiness value');
  assert.equal(readinessEnvelope.value.operationName, 'getPortReadiness');
  assert.equal(readinessEnvelope.value.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);
  assert.equal(readinessEnvelope.value.status, 'partial');
  assert.equal(readinessEnvelope.value.readiness.sideEffects, 'none');

  const requiredReadinessByName = new Map(
    readinessEnvelope.value.readiness.required.map((entry) => [entry.name, entry]),
  );

  for (const portName of REQUIRED_READY_PORTS) {
    assert.equal(requiredReadinessByName.get(portName)?.status, 'ready', `${portName} is provided`);
  }

  assertNoForbiddenPublicLeakTerms(readinessEnvelope, 'core host readiness envelope');
});

test('W12B inspects public port inventory through hazeteam-core/host only', () => {
  const inventory = describeCoreInteractionPortInventory();

  assertObjectLike(inventory, 'core interaction port inventory');
  assert.equal(validateCoreInteractionPortInventory(inventory), true);
  assert.equal(inventory.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);

  const requiredPortNames = Object.keys(inventory.requiredPorts).sort();
  assert.deepEqual(requiredPortNames, [...REQUIRED_READY_PORTS].sort());

  assertNoForbiddenPublicLeakTerms(inventory, 'core interaction port inventory');
});
