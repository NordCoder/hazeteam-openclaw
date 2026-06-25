import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOpenClawToolRegistry,
  isSafeOpenClawToolRef,
  validateOpenClawToolDescriptor,
} from '../../dist/tool-registry.js';

const forbiddenTerms = [
  'rawtoolpayload',
  'rawopenclawevent',
  'rawruntimepayload',
  'rawproviderresponse',
  'token',
  'secret',
  'password',
  'credential',
  'apikey',
  'bearer',
  'stack',
  'filesystem',
  'storagepath',
  'network',
  'webhook',
  'polling',
  'telegram',
];

function assertNoLeak(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of forbiddenTerms) {
    assert.equal(serialized.includes(term), false, `public output must not include ${term}`);
  }
}

function createDescriptor(overrides = {}) {
  return {
    toolRef: 'hazeteam.core.get_workspace_status',
    title: 'Workspace status',
    description: 'Returns bounded workspace status summary',
    category: 'core',
    ownerRef: 'plugin.core',
    inputSchemaBoundary: {
      schemaRef: 'schema.workspace_status.input',
      boundary: 'safe-json-object',
      version: 'v1',
    },
    outputSchemaBoundary: {
      schemaRef: 'schema.workspace_status.output',
      boundary: 'safe-json-object',
      version: 'v1',
    },
    approval: {
      classification: 'none',
      reasonRef: 'approval.none',
    },
    effect: 'read',
    capabilityBinding: {
      binding: 'none',
    },
    handlerReference: {
      kind: 'core-facade',
      ref: 'handler.core.workspace_status',
    },
    availability: {
      posture: 'available',
      defaultEnabled: true,
      readinessRef: 'readiness.plugin',
    },
    workspaceScoped: true,
    ...overrides,
  };
}

test('tool refs are bounded to safe registry names', () => {
  assert.equal(isSafeOpenClawToolRef('hazeteam.core.submit_user_intent'), true);
  assert.equal(isSafeOpenClawToolRef('hazeteam.workspace.open_dashboard'), true);
  assert.equal(isSafeOpenClawToolRef('hazeteam.core.token_export'), false);
  assert.equal(isSafeOpenClawToolRef('other.core.submit_user_intent'), false);
  assert.equal(isSafeOpenClawToolRef('hazeteam.core.SubmitUserIntent'), false);
});

test('registry registers, lists, looks up, and serializes safe descriptors', () => {
  const registry = createOpenClawToolRegistry({ defaultAvailability: 'not-ready' });
  const first = createDescriptor();
  const second = createDescriptor({
    toolRef: 'hazeteam.agent.show_help',
    title: 'Agent help',
    description: 'Returns bounded agent help summary',
    category: 'domain',
    ownerRef: 'domain.agent',
    inputSchemaBoundary: {
      schemaRef: 'schema.agent_help.input',
      boundary: 'safe-command-input',
      version: 'v1',
    },
    outputSchemaBoundary: {
      schemaRef: 'schema.agent_help.output',
      boundary: 'safe-json-object',
      version: 'v1',
    },
    handlerReference: {
      kind: 'domain-command',
      ref: 'handler.agent.help',
    },
  });

  const firstResult = registry.registerToolDescriptor(first);
  const secondResult = registry.registerToolDescriptor(second);

  assert.equal(firstResult.ok, true);
  assert.equal(secondResult.ok, true);
  assert.equal(registry.listToolDescriptors().length, 2);
  assert.equal(registry.findToolDescriptor('hazeteam.agent.show_help')?.toolRef, 'hazeteam.agent.show_help');

  const getResult = registry.getToolDescriptor('hazeteam.core.get_workspace_status');
  assert.equal(getResult.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(getResult.value)), getResult.value);

  const snapshot = registry.serializeRegistrySnapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
  assert.equal(snapshot.kind, 'openclaw-tool-registry-snapshot');
  assert.equal(snapshot.descriptorVersion, 'w13c');
  assert.equal(snapshot.toolCount, 2);
  assertNoLeak(firstResult);
  assertNoLeak(secondResult);
  assertNoLeak(snapshot);
});

test('duplicate tool descriptors are rejected with safe output only', () => {
  const registry = createOpenClawToolRegistry();
  const descriptor = createDescriptor();

  assert.equal(registry.registerToolDescriptor(descriptor).ok, true);

  const duplicate = registry.registerToolDescriptor(descriptor);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'duplicate_tool_ref');
  assertNoLeak(duplicate);
});

test('effectful descriptors require explicit approval metadata', () => {
  const { approval, ...missingApproval } = createDescriptor({
    effect: 'state-change',
  });

  assert.equal(approval.classification, 'none');

  const validation = validateOpenClawToolDescriptor(missingApproval);
  assert.equal(validation.ok, false);
  assert.equal(validation.error.code, 'approval_metadata_required');
  assertNoLeak(validation);
});

test('unsafe descriptor values are rejected without echoing unsafe input', () => {
  const unsafe = createDescriptor({
    description: 'contains token and rawProviderResponse details',
  });

  const validation = validateOpenClawToolDescriptor(unsafe);
  assert.equal(validation.ok, false);
  assert.equal(validation.error.code, 'unsafe_descriptor_value');
  assertNoLeak(validation);
});

test('executable handler-like values are rejected and never called', () => {
  let called = false;
  const descriptor = createDescriptor({
    handlerReference: {
      kind: 'core-facade',
      ref: 'handler.core.workspace_status',
      invoke: () => {
        called = true;
      },
    },
  });

  const validation = validateOpenClawToolDescriptor(descriptor);
  assert.equal(validation.ok, false);
  assert.equal(validation.error.code, 'executable_descriptor_value');
  assert.equal(called, false);
  assertNoLeak(validation);
});

test('invalid lookup and not-found results stay safe and structured', () => {
  const registry = createOpenClawToolRegistry();

  const invalidLookup = registry.getToolDescriptor('hazeteam.core.password_export');
  assert.equal(invalidLookup.ok, false);
  assert.equal(invalidLookup.error.code, 'invalid_lookup_ref');
  assert.equal(registry.findToolDescriptor('hazeteam.core.password_export'), undefined);

  const notFound = registry.getToolDescriptor('hazeteam.core.get_workspace_status');
  assert.equal(notFound.ok, false);
  assert.equal(notFound.error.code, 'not_found');
  assertNoLeak(invalidLookup);
  assertNoLeak(notFound);
});
