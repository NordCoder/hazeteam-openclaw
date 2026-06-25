import assert from 'node:assert/strict';
import test from 'node:test';

import {
  describeLifeosOcaAgentFixture,
  getLifeosOcaAgentFixture,
  isSafeLifeosOcaAgentFixtureJson,
} from '../../dist/index.js';

const registryCompatibleOperationRef = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
const unsafePublicFragments = [
  'rawlog',
  'rawdiff',
  'rawoutput',
  'rawpath',
  'filepath',
  'repopath',
  'workspacepath',
  'providerpayload',
  'runtimepayload',
  'clienthandle',
  'sdkclient',
  'processid',
  'bearer',
  'token',
  'secret',
  'credential',
  'stack',
  'endpoint',
  'commandoutput',
  'file://',
  '/usr/',
  '/home/',
  '/var/',
  '\\',
];

function assertNoUnsafePublicFragments(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of unsafePublicFragments) {
    assert.equal(serialized.includes(fragment), false, `fixture must not expose ${fragment}`);
  }
}

test('domain fixture exports a safe LifeOS agent descriptor', () => {
  const fixture = getLifeosOcaAgentFixture();

  assert.equal(fixture.descriptorVersion, 'w15g-domain-binding-fixture');
  assert.equal(fixture.packageRef, 'domain-package:lifeos');
  assert.equal(fixture.agent.agentRef, 'agent:lifeos-coder');
  assert.equal(fixture.agent.displayName, 'LifeOS Coding Agent');
  assert.equal(fixture.agent.roleRef, 'agent-role:coding-assistant');
  assert.equal(fixture.agent.workspaceRef, 'workspace:lifeos');
  assert.deepEqual(fixture.agent.capabilityBindingRefs, ['capability-binding:lifeos-oca-default']);
  assert.equal(fixture.commandSurface.length > 0, true);
});

test('OCA capability binding is declared without importing OCA mechanics', () => {
  const fixture = describeLifeosOcaAgentFixture();
  const [binding] = fixture.capabilityBindings;

  assert.equal(fixture.capabilityBindings.length, 1);
  assert.equal(binding.bindingRef, 'capability-binding:lifeos-oca-default');
  assert.equal(binding.capabilityRef, 'oca-wrapper');
  assert.equal(binding.requirement, 'required');
  assert.equal(binding.profileRef, 'runtime-capability-profile:oca-default');
  assert.deepEqual(binding.uiHints, fixture.uiHints);
});

test('allowed operations are safe, bounded, and command-linked', () => {
  const fixture = getLifeosOcaAgentFixture();
  const [binding] = fixture.capabilityBindings;
  const operationRefs = binding.allowedOperationRefs;

  assert.equal(operationRefs.length, 8);
  assert.equal(new Set(operationRefs).size, operationRefs.length);
  assert.equal(operationRefs.length <= 16, true);

  for (const operationRef of operationRefs) {
    assert.match(operationRef, registryCompatibleOperationRef);
    assert.equal(operationRef.startsWith('hazeteam.oca.'), true);
  }

  for (const command of fixture.commandSurface) {
    assert.equal(command.capabilityRef, 'oca-wrapper');
    assert.equal(operationRefs.includes(command.operationRef), true);
    assert.equal(command.visible, true);
    assert.match(command.commandRef, /^domain-command:lifeos\.oca\.[a-z0-9.-]+$/u);
    assert.match(command.approvalMode, /^(read-only|approval-required)$/u);
  }
});

test('UI hints are pure data only', () => {
  const fixture = getLifeosOcaAgentFixture();

  assert.deepEqual(fixture.uiHints, {
    homeCardSection: 'lifeos-oca-sessions',
    showSessionStatus: true,
    showDiffActions: true,
    showReviewActions: true,
  });

  for (const value of Object.values(fixture.uiHints)) {
    assert.equal(['string', 'boolean'].includes(typeof value), true);
  }
});

test('fixture is JSON-serializable and cloned on read', () => {
  const first = getLifeosOcaAgentFixture();
  const second = getLifeosOcaAgentFixture();
  const roundTripped = JSON.parse(JSON.stringify(first));

  assert.notEqual(first, second);
  assert.notEqual(first.capabilityBindings, second.capabilityBindings);
  assert.deepEqual(roundTripped, first);
  assert.equal(isSafeLifeosOcaAgentFixtureJson(first), true);
  assert.equal(isSafeLifeosOcaAgentFixtureJson(roundTripped), true);
});

test('no OCA mechanics are implemented by the domain fixture', () => {
  const fixture = getLifeosOcaAgentFixture();

  assert.deepEqual(fixture.safety, {
    descriptorOnly: true,
    domainOwnsSessionLifecycle: false,
    domainOwnsSessionStore: false,
    domainOwnsOperationHandlers: false,
    domainOwnsApprovalExecution: false,
    domainOwnsTopicPresentation: false,
    providerSdkImports: false,
    environmentReads: false,
    filesystemReads: false,
    networkCalls: false,
  });
});

test('fixture exposes no unsafe raw material or handles', () => {
  const fixture = getLifeosOcaAgentFixture();

  assertNoUnsafePublicFragments(fixture);

  assert.equal(isSafeLifeosOcaAgentFixtureJson({ rawLog: 'unsafe' }), false);
  assert.equal(isSafeLifeosOcaAgentFixtureJson({ safe: 'contains token value' }), false);
  assert.equal(isSafeLifeosOcaAgentFixtureJson({ safe: 'file:///tmp/value' }), false);
  assert.equal(isSafeLifeosOcaAgentFixtureJson({ safe: Number.NaN }), false);
});
