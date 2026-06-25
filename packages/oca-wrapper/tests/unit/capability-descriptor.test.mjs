import assert from 'node:assert/strict';
import test from 'node:test';

import { createRuntimeCapabilityRegistry } from '../../../openclaw-plugin-runtime/dist/index.js';
import {
  OCA_WRAPPER_OPERATION_REFS,
  describeOcaWrapper,
  getOcaWrapperCapabilityDescriptor,
  isSafeOcaCapabilityDescriptorJson,
  listOcaWrapperOperationDescriptors,
} from '../../dist/index.js';

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
];

function assertNoUnsafeTerms(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of forbiddenTerms) {
    assert.equal(serialized.includes(term), false, `serialized output must not include ${term}`);
  }
}

test('OCA wrapper descriptor exposes W15A descriptor-only package metadata', () => {
  const description = describeOcaWrapper();

  assert.equal(description.package.name, '@hazeteam/oca-wrapper');
  assert.equal(description.package.status, 'w15a-descriptor-only');
  assert.equal(description.package.productionReady, false);
  assert.equal(description.package.effects, 'none');
  assert.equal(description.package.contractSlice, 'W15A');
  assert.equal(description.package.defaultExecutionPosture, 'fake');
  assert.deepEqual(description.package.publicSurfaces, [
    'capability-descriptor',
    'operation-descriptors',
    'safe-json-check',
  ]);
  assert.equal(isSafeOcaCapabilityDescriptorJson(description), true);
  assertNoUnsafeTerms(description.capability);
});

test('OCA wrapper capability descriptor is registry-compatible safe data', () => {
  const descriptor = getOcaWrapperCapabilityDescriptor();

  assert.deepEqual(descriptor, {
    capabilityRef: 'oca-wrapper',
    name: 'oca-wrapper',
    version: '0.1.0',
    kind: 'session',
    operationRefs: [...OCA_WRAPPER_OPERATION_REFS],
    readinessState: 'ready-fake',
    requirement: 'optional',
    executionPosture: 'fake',
    summary: 'Descriptor-only OCA session capability for fake readiness.',
    detailRefs: ['hazeteam.oca.w15a'],
  });
  assert.equal(isSafeOcaCapabilityDescriptorJson(descriptor), true);
  assertNoUnsafeTerms(descriptor);
});

test('OCA operation descriptors classify reads separately from approval-gated operations', () => {
  const operations = listOcaWrapperOperationDescriptors();
  const byRef = new Map(operations.map((operation) => [operation.operationRef, operation]));

  assert.equal(operations.length, OCA_WRAPPER_OPERATION_REFS.length);
  assert.deepEqual(
    operations.map((operation) => operation.operationRef),
    [...OCA_WRAPPER_OPERATION_REFS],
  );

  for (const operationRef of [
    'hazeteam.oca.get-status',
    'hazeteam.oca.get-output',
    'hazeteam.oca.list',
    'hazeteam.oca.diff-get',
    'hazeteam.oca.branch-summarize',
    'hazeteam.oca.logs-summarize',
  ]) {
    assert.equal(byRef.get(operationRef)?.approval, 'read-only', `${operationRef} should be read-only`);
  }

  for (const operationRef of [
    'hazeteam.oca.start-session',
    'hazeteam.oca.continue-session',
    'hazeteam.oca.send-input',
    'hazeteam.oca.cancel',
    'hazeteam.oca.archive',
    'hazeteam.oca.review-request',
  ]) {
    assert.equal(
      byRef.get(operationRef)?.approval,
      'approval-required-external-effect',
      `${operationRef} should require approval`,
    );
  }

  assert.equal(byRef.get('hazeteam.oca.review-submit')?.approval, 'approval-required-repository-mutation');
  assert.equal(isSafeOcaCapabilityDescriptorJson(operations), true);
});

test('OCA descriptor registers with the existing runtime capability registry', () => {
  const registry = createRuntimeCapabilityRegistry();
  const descriptor = getOcaWrapperCapabilityDescriptor();

  const registered = registry.register(descriptor);
  assert.equal(registered.ok, true);
  assert.equal(registered.value.capabilityRef, 'oca-wrapper');
  assert.equal(registered.value.readinessState, 'ready-fake');
  assert.equal(registered.value.executionPosture, 'fake');
  assert.deepEqual(registered.value.operationRefs, [...OCA_WRAPPER_OPERATION_REFS]);

  const readiness = registry.readiness('oca-wrapper');
  assert.equal(readiness.ok, true);
  assert.equal(readiness.value.ready, true);
  assert.equal(readiness.value.blocking, false);
  assert.equal(readiness.value.readinessState, 'ready-fake');
  assert.equal(readiness.value.executionPosture, 'fake');

  const snapshot = registry.snapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
  assert.equal(isSafeOcaCapabilityDescriptorJson(snapshot), true);
  assertNoUnsafeTerms(snapshot);
});

test('missing required OCA capability is blocking when descriptor is not registered', () => {
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
  assert.equal(missingRequired.value.executionPosture, 'blocked');
  assert.equal(missingRequired.value.ready, false);
  assert.equal(missingRequired.value.blocking, true);
  assert.deepEqual(missingRequired.value.operationRefs, []);
  assert.deepEqual(JSON.parse(JSON.stringify(missingRequired.value)), missingRequired.value);
});
