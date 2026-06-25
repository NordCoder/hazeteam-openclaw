import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR,
  OPENCLAW_PLUGIN_RUNTIME_PACKAGE,
  OPENCLAW_PLUGIN_RUNTIME_PUBLIC_SURFACES,
  aggregatePluginReadiness,
  applyPluginLifecycleTransition,
  createInitialPluginLifecycleSnapshot,
  createOpenClawToolRegistry,
  createRuntimeCapabilityRegistry,
  describePluginLifecycleSnapshot,
  isSafeReadinessJson,
  projectPluginReadinessSummary,
  serializeRuntimeCapabilityRegistrySnapshot,
} from '../../dist/index.js';

const FIXED_NOW = '2026-06-25T00:00:00.000Z';

const unsafeSerializedTerms = [
  'api key',
  'apikey',
  'bearer',
  'credential',
  'password',
  'secret',
  'token',
  'stack trace',
  'traceback',
  'raw provider',
  'raw_provider',
  'raw payload',
  'raw_payload',
  'rawproviderresponse',
  'rawruntimepayload',
  'rawtoolpayload',
  'payload',
  'client handle',
  'sdk client',
  'https://',
  'http://',
  'postgres://',
  'redis://',
  'mongodb://',
  '/tmp/',
  'webhook',
  'polling',
  'telegram',
];

function assertJsonRoundTrip(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
}

function assertNoUnsafeSerializedTerms(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of unsafeSerializedTerms) {
    assert.equal(serialized.includes(term), false, `serialized output must not include ${term}`);
  }
}

function applyAccepted(snapshot, transition) {
  const result = applyPluginLifecycleTransition(snapshot, transition);
  assert.equal(result.ok, true);
  return result.snapshot;
}

function createReadyLifecycleDescription() {
  const configured = applyAccepted(createInitialPluginLifecycleSnapshot(), { type: 'configure' });
  const initialized = applyAccepted(configured, { type: 'initialize' });
  const started = applyAccepted(initialized, { type: 'start' });
  const ready = applyAccepted(started, { type: 'mark-ready' });

  return describePluginLifecycleSnapshot(ready);
}

function readyComponent(kind) {
  return {
    componentRef: `component:${kind}`,
    kind,
    status: 'ready',
    checkedAt: FIXED_NOW,
  };
}

test('package root intentionally exposes W13 public fan-in surfaces', () => {
  assert.deepEqual(OPENCLAW_PLUGIN_RUNTIME_PUBLIC_SURFACES, [
    'lifecycle',
    'tool-registry',
    'capability-registry',
    'readiness',
  ]);
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.status, 'runtime-shell');
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.productionReady, false);
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR.descriptorVersion, 'w13f');
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR.readiness, 'fake-dry-run-capable');
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR.effects, 'none');

  assertJsonRoundTrip(OPENCLAW_PLUGIN_RUNTIME_PACKAGE);
  assertJsonRoundTrip(OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR);
  assertNoUnsafeSerializedTerms({
    package: OPENCLAW_PLUGIN_RUNTIME_PACKAGE,
    descriptor: OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR,
  });
});

test('package root composes lifecycle, tool, capability, and readiness public APIs safely', () => {
  const lifecycleDescription = createReadyLifecycleDescription();

  const capabilityRegistry = createRuntimeCapabilityRegistry();
  const capabilityRegistration = capabilityRegistry.register({
    capabilityRef: 'demo-capability',
    name: 'demo-capability',
    version: '0.1.0',
    kind: 'diagnostic',
    operationRefs: ['hazeteam.diagnostics.describe'],
    readinessState: 'ready-fake',
    requirement: 'optional',
    executionPosture: 'fake',
    summary: 'Fake diagnostic capability descriptor.',
  });
  assert.equal(capabilityRegistration.ok, true);

  const capabilityReadiness = capabilityRegistry.readiness('demo-capability');
  assert.equal(capabilityReadiness.ok, true);
  assert.equal(capabilityReadiness.value.ready, true);
  assert.equal(capabilityReadiness.value.blocking, false);

  const capabilitySnapshot = serializeRuntimeCapabilityRegistrySnapshot(capabilityRegistry);

  const toolRegistry = createOpenClawToolRegistry({ defaultAvailability: 'dry-run' });
  const toolRegistration = toolRegistry.registerToolDescriptor({
    toolRef: 'hazeteam.diagnostics.describe_plugin',
    title: 'Plugin diagnostic summary',
    description: 'Returns bounded plugin diagnostic summary',
    category: 'diagnostic',
    ownerRef: 'plugin.diagnostics',
    inputSchemaBoundary: {
      schemaRef: 'schema.diagnostic.input',
      boundary: 'safe-json-object',
      version: 'v1',
    },
    outputSchemaBoundary: {
      schemaRef: 'schema.diagnostic.output',
      boundary: 'safe-json-object',
      version: 'v1',
    },
    approval: {
      classification: 'none',
      reasonRef: 'approval.none',
    },
    effect: 'none',
    capabilityBinding: {
      binding: 'optional',
      capabilityRef: 'demo-capability',
    },
    handlerReference: {
      kind: 'diagnostic',
      ref: 'handler.diagnostics.describe',
    },
    availability: {
      posture: 'dry-run',
      defaultEnabled: false,
      readinessRef: 'component:capability',
    },
    workspaceScoped: false,
  });
  assert.equal(toolRegistration.ok, true);

  const toolSnapshot = toolRegistry.serializeRegistrySnapshot();

  const readiness = aggregatePluginReadiness({
    profile: 'dry-run',
    pluginRef: 'plugin:runtime-shell',
    generatedAt: FIXED_NOW,
    components: [
      readyComponent('plugin-lifecycle'),
      readyComponent('adapter-foundation'),
      readyComponent('core-facade'),
      readyComponent('stores'),
      readyComponent('transport'),
      readyComponent('config'),
      readyComponent('tools'),
      readyComponent('capability'),
    ],
    externalConnectivityEnabled: true,
    willCallRemote: true,
  });
  const readinessSummary = projectPluginReadinessSummary(readiness);

  assert.equal(readiness.status, 'ready');
  assert.equal(readiness.externalConnectivityEnabled, false);
  assert.equal(readiness.willCallRemote, false);
  assert.deepEqual(readiness.missingRequired, []);
  assert.equal(readinessSummary.componentCount, 8);

  const publicOutput = {
    lifecycleDescription,
    capabilitySnapshot,
    capabilityReadiness: capabilityReadiness.value,
    toolSnapshot,
    readiness,
    readinessSummary,
  };

  assertJsonRoundTrip(publicOutput);
  assert.equal(isSafeReadinessJson(readiness), true);
  assertNoUnsafeSerializedTerms(publicOutput);
});
