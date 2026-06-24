import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRuntimeCapabilityRegistry,
  serializeRuntimeCapabilityRegistrySnapshot,
} from '../../dist/capability-registry.js';

const baseCapability = Object.freeze({
  capabilityRef: 'oca-wrapper',
  name: 'oca-wrapper',
  version: '0.1.0',
  kind: 'session',
  operationRefs: Object.freeze(['hazeteam.oca.start-session', 'hazeteam.oca.get-status']),
  readinessState: 'ready-fake',
  requirement: 'required',
  executionPosture: 'fake',
  summary: 'Fake session capability descriptor for safe registry tests.',
  detailRefs: Object.freeze(['details.oca-wrapper']),
});

const optionalCapability = Object.freeze({
  capabilityRef: 'diagnostic-panel',
  name: 'diagnostic-panel',
  version: '0.2.0',
  kind: 'diagnostic',
  operationRefs: Object.freeze(['hazeteam.diagnostic.describe']),
  readinessState: 'disabled',
  requirement: 'optional',
  executionPosture: 'disabled',
  summary: 'Optional diagnostic capability descriptor.',
});

const forbiddenTerms = [
  'rawproviderresponse',
  'rawruntimepayload',
  'rawtoolpayload',
  'rawclient',
  'clienthandle',
  'client',
  'token',
  'secret',
  'password',
  'credential',
  'apikey',
  'api key',
  'bearer',
  'stack',
  'filesystem',
  'storagepath',
  'storage path',
  'network',
  'webhook',
  'polling',
  'telegram',
];

function assertNoUnsafeTerms(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of forbiddenTerms) {
    assert.equal(serialized.includes(term), false, `serialized output must not include ${term}`);
  }
}

test('runtime capability registry registers, lists, finds, and snapshots safe descriptors', () => {
  const registry = createRuntimeCapabilityRegistry();

  const registered = registry.register(baseCapability);
  assert.equal(registered.ok, true);
  assert.deepEqual(registered.value, {
    descriptorVersion: 'w13d',
    capabilityRef: 'oca-wrapper',
    name: 'oca-wrapper',
    version: '0.1.0',
    kind: 'session',
    operationRefs: ['hazeteam.oca.start-session', 'hazeteam.oca.get-status'],
    readinessState: 'ready-fake',
    requirement: 'required',
    executionPosture: 'fake',
    summary: 'Fake session capability descriptor for safe registry tests.',
    detailRefs: ['details.oca-wrapper'],
  });

  const listed = registry.list();
  assert.equal(listed.length, 1);
  assert.deepEqual(listed[0], registered.value);

  const found = registry.find('oca-wrapper');
  assert.deepEqual(found, registered.value);

  const readiness = registry.readiness('oca-wrapper');
  assert.equal(readiness.ok, true);
  assert.equal(readiness.value.ready, true);
  assert.equal(readiness.value.blocking, false);
  assert.equal(readiness.value.readinessState, 'ready-fake');
  assert.equal(readiness.value.executionPosture, 'fake');

  const snapshot = serializeRuntimeCapabilityRegistrySnapshot(registry);
  assert.deepEqual(snapshot, registry.snapshot());
  assert.equal(snapshot.registryRef, 'runtime-capability-registry');
  assert.equal(snapshot.descriptorVersion, 'w13d');
  assert.equal(snapshot.effects, 'none');
  assert.equal(snapshot.capabilityCount, 1);
  assert.deepEqual(snapshot.capabilities, [registered.value]);
  assert.deepEqual(snapshot.readiness, [readiness.value]);
});

test('runtime capability registry rejects duplicate and invalid descriptors with safe results', () => {
  const registry = createRuntimeCapabilityRegistry();

  assert.equal(registry.register(baseCapability).ok, true);

  const duplicate = registry.register(baseCapability);
  assert.equal(duplicate.ok, false);
  assert.deepEqual(duplicate.error, {
    code: 'duplicate-capability-ref',
    message: 'Capability ref is already registered.',
    capabilityRef: 'oca-wrapper',
  });

  const invalidRef = registry.register({
    ...baseCapability,
    capabilityRef: 'Invalid Ref',
    name: 'invalid-ref',
  });
  assert.equal(invalidRef.ok, false);
  assert.equal(invalidRef.error.code, 'invalid-capability-ref');
  assert.equal(Object.hasOwn(invalidRef.error, 'capabilityRef'), false);

  const invalidVersion = registry.register({
    ...baseCapability,
    capabilityRef: 'bad-version',
    name: 'bad-version',
    version: 'latest',
  });
  assert.equal(invalidVersion.ok, false);
  assert.equal(invalidVersion.error.code, 'invalid-descriptor');
  assert.equal(invalidVersion.error.capabilityRef, 'bad-version');

  const unsupportedUnsafeField = registry.register({
    ...baseCapability,
    capabilityRef: 'unsafe-extra',
    name: 'unsafe-extra',
    rawClient: { unsafe: true },
  });
  assert.equal(unsupportedUnsafeField.ok, false);
  assert.equal(unsupportedUnsafeField.error.code, 'invalid-descriptor');
  assertNoUnsafeTerms(unsupportedUnsafeField);
});

test('runtime capability registry models missing required and optional readiness honestly', () => {
  const registry = createRuntimeCapabilityRegistry();

  const missingRequired = registry.describeRequirement({
    capabilityRef: 'oca-wrapper',
    name: 'oca-wrapper',
    version: '0.1.0',
    kind: 'session',
    requirement: 'required',
  });
  assert.equal(missingRequired.ok, true);
  assert.equal(missingRequired.value.readinessState, 'not-configured');
  assert.equal(missingRequired.value.requirement, 'required');
  assert.equal(missingRequired.value.ready, false);
  assert.equal(missingRequired.value.blocking, true);
  assert.deepEqual(missingRequired.value.operationRefs, []);

  const missingOptional = registry.describeRequirement({
    capabilityRef: 'diagnostic-panel',
    name: 'diagnostic-panel',
    version: '0.2.0',
    kind: 'diagnostic',
    requirement: 'optional',
  });
  assert.equal(missingOptional.ok, true);
  assert.equal(missingOptional.value.readinessState, 'disabled');
  assert.equal(missingOptional.value.requirement, 'optional');
  assert.equal(missingOptional.value.ready, false);
  assert.equal(missingOptional.value.blocking, false);

  assert.equal(registry.register(optionalCapability).ok, true);
  const optionalReadiness = registry.readiness('diagnostic-panel');
  assert.equal(optionalReadiness.ok, true);
  assert.equal(optionalReadiness.value.requirement, 'optional');
  assert.equal(optionalReadiness.value.readinessState, 'disabled');
  assert.equal(optionalReadiness.value.blocking, false);
});

test('runtime capability registry serialized outputs do not leak unsafe implementation terms', () => {
  const registry = createRuntimeCapabilityRegistry();
  const accepted = registry.register(baseCapability);
  const optional = registry.register(optionalCapability);
  const requiredReadiness = registry.describeRequirement({
    capabilityRef: 'missing-required-capability',
    name: 'missing-required-capability',
    requirement: 'required',
  });
  const optionalReadiness = registry.describeRequirement({
    capabilityRef: 'missing-optional-capability',
    name: 'missing-optional-capability',
    requirement: 'optional',
  });
  const rejected = registry.register({
    ...baseCapability,
    capabilityRef: 'unsafe-summary',
    name: 'unsafe-summary',
    summary: 'contains token value',
  });

  assert.equal(accepted.ok, true);
  assert.equal(optional.ok, true);
  assert.equal(requiredReadiness.ok, true);
  assert.equal(optionalReadiness.ok, true);
  assert.equal(rejected.ok, false);

  assertNoUnsafeTerms({
    accepted,
    optional,
    requiredReadiness,
    optionalReadiness,
    rejected,
    snapshot: registry.snapshot(),
    list: registry.list(),
  });
});
