import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyPluginLifecycleTransition,
  createInitialPluginLifecycleSnapshot,
  createOpenClawToolRegistry,
  createRuntimeCapabilityRegistry,
  describePluginLifecycleSnapshot,
} from '../../dist/index.js';
import {
  composeOpenClawRuntime,
  describeOpenClawRuntimeProfile,
  isOpenClawRuntimeCompositionJsonSafe,
} from '../../dist/composition.js';

const FIXED_NOW = '2026-06-25T00:00:00.000Z';

function assertJsonRoundTrip(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
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

function createToolRegistrySnapshot() {
  const registry = createOpenClawToolRegistry({ defaultAvailability: 'dry-run' });
  const result = registry.registerToolDescriptor({
    toolRef: 'hazeteam.diagnostics.runtime_composition',
    title: 'Runtime composition diagnostic',
    description: 'Returns bounded runtime composition status',
    category: 'diagnostic',
    ownerRef: 'runtime.diagnostics',
    inputSchemaBoundary: {
      schemaRef: 'schema.runtime.composition.input',
      boundary: 'safe-json-object',
      version: 'v1',
    },
    outputSchemaBoundary: {
      schemaRef: 'schema.runtime.composition.output',
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
      capabilityRef: 'runtime-diagnostics',
    },
    handlerReference: {
      kind: 'diagnostic',
      ref: 'handler.runtime.diagnostics',
    },
    availability: {
      posture: 'dry-run',
      defaultEnabled: false,
      readinessRef: 'component:tools',
    },
    workspaceScoped: false,
  });

  assert.equal(result.ok, true);
  return registry.serializeRegistrySnapshot();
}

function createCapabilityRegistrySnapshot() {
  const registry = createRuntimeCapabilityRegistry();
  const result = registry.register({
    capabilityRef: 'runtime-diagnostics',
    name: 'runtime-diagnostics',
    version: '0.1.0',
    kind: 'diagnostic',
    operationRefs: ['hazeteam.diagnostics.runtime_composition'],
    readinessState: 'ready-fake',
    requirement: 'optional',
    executionPosture: 'fake',
    summary: 'Fake runtime diagnostic capability descriptor.',
  });

  assert.equal(result.ok, true);
  return registry.snapshot();
}

function readyBindings() {
  return [
    {
      bindingRef: 'binding:adapter-foundation',
      kind: 'adapter-foundation',
      status: 'ready',
      safeSummary: 'Adapter foundation descriptor is available',
    },
    {
      bindingRef: 'binding:config',
      kind: 'config',
      status: 'ready',
      safeSummary: 'Runtime config descriptor is available',
    },
    {
      bindingRef: 'binding:core-facade',
      kind: 'core-facade',
      status: 'ready',
      safeSummary: 'Core facade descriptor is available',
    },
    {
      bindingRef: 'binding:store',
      kind: 'store',
      status: 'ready',
      safeSummary: 'Adapter state store descriptor is available',
    },
    {
      bindingRef: 'binding:transport',
      kind: 'transport',
      status: 'ready',
      safeSummary: 'Transport descriptor is available',
    },
  ];
}

test('runtime profile descriptors use CD11.2 vocabulary without runtime effects', () => {
  const fake = describeOpenClawRuntimeProfile({ profile: 'fake' });
  assert.deepEqual(fake, {
    profile: 'fake',
    productionReady: false,
    willCallRemote: false,
    realNetworkEnabled: false,
    requiresSecrets: false,
    usesResolvedSecretValue: false,
    allowedEffects: ['none'],
    blockedReasons: [],
    safeSummary: 'Deterministic fake profile with no external effects.',
  });

  const gated = describeOpenClawRuntimeProfile({ profile: 'secret-gated-smoke' });
  assert.equal(gated.productionReady, false);
  assert.equal(gated.willCallRemote, false);
  assert.equal(gated.realNetworkEnabled, false);
  assert.equal(gated.requiresSecrets, true);
  assert.equal(gated.usesResolvedSecretValue, false);
  assert.deepEqual(gated.allowedEffects, ['none']);
  assert.deepEqual(gated.blockedReasons, ['runtime-value-gate-closed', 'real-network-gate-closed']);
});

test('fake runtime composition combines lifecycle, registry snapshots, bindings, readiness, and diagnostics safely', () => {
  const composition = composeOpenClawRuntime({
    compositionRef: 'runtime:composition:fake',
    profile: 'fake',
    generatedAt: FIXED_NOW,
    lifecycle: createReadyLifecycleDescription(),
    toolRegistrySnapshot: createToolRegistrySnapshot(),
    capabilityRegistrySnapshot: createCapabilityRegistrySnapshot(),
    bindings: readyBindings(),
  });

  assert.equal(composition.kind, 'openclaw-runtime-composition');
  assert.equal(composition.descriptorVersion, 'cd11.2-w17a');
  assert.equal(composition.compositionRef, 'runtime:composition:fake');
  assert.equal(composition.profile.profile, 'fake');
  assert.equal(composition.productionReady, false);
  assert.equal(composition.effects, 'none');
  assert.equal(composition.fakeE2eCompatible, true);
  assert.equal(composition.lifecycle.acceptsWork, true);
  assert.equal(composition.toolRegistrySnapshot.toolCount, 1);
  assert.equal(composition.capabilityRegistrySnapshot.capabilityCount, 1);
  assert.equal(composition.readiness.status, 'fake-ready');
  assert.equal(composition.readiness.localEvidenceOnly, true);
  assert.equal(composition.readiness.adapterReadyForRealSystemIntegration, false);
  assert.equal(composition.readiness.aggregate.status, 'ready');
  assert.deepEqual(composition.readiness.missingRequired, []);
  assert.deepEqual(composition.blockedReasons, []);
  assert.deepEqual(composition.actionableNextSteps, ['continue-fake-e2e-acceptance-evidence']);
  assert.equal(composition.profile.willCallRemote, false);
  assert.equal(composition.profile.realNetworkEnabled, false);

  assertJsonRoundTrip(composition);
  assert.equal(isOpenClawRuntimeCompositionJsonSafe(composition), true);
});

test('missing required runtime bindings produce safe not-ready evidence, not a readiness claim', () => {
  const composition = composeOpenClawRuntime({
    compositionRef: 'runtime:composition:missing-bindings',
    profile: 'fake',
    generatedAt: FIXED_NOW,
    lifecycle: createReadyLifecycleDescription(),
  });

  assert.equal(composition.fakeE2eCompatible, false);
  assert.equal(composition.readiness.status, 'not-ready');
  assert.equal(composition.readiness.adapterReadyForRealSystemIntegration, false);
  assert.deepEqual(composition.blockedReasons, [
    'missing-required-binding',
    'readiness-aggregate-not-ready',
  ]);
  assert.ok(composition.readiness.missingRequired.includes('component:adapter-foundation'));
  assert.ok(composition.readiness.missingRequired.includes('component:core-facade'));
  assert.ok(composition.readiness.missingRequired.includes('component:transport'));
  assert.deepEqual(composition.actionableNextSteps, ['provide-required-runtime-bindings']);

  assertJsonRoundTrip(composition);
  assert.equal(isOpenClawRuntimeCompositionJsonSafe(composition), true);
});

test('secret-gated smoke profile remains blocked without explicit gates and still has no remote behavior', () => {
  const composition = composeOpenClawRuntime({
    compositionRef: 'runtime:composition:gated-smoke',
    profile: 'secret-gated-smoke',
    generatedAt: FIXED_NOW,
    lifecycle: createReadyLifecycleDescription(),
    bindings: [
      ...readyBindings().filter((binding) => binding.kind !== 'store'),
      {
        bindingRef: 'binding:credential-resolver',
        kind: 'credential-resolver',
        status: 'ready',
        safeSummary: 'Runtime value resolver descriptor is available',
      },
    ],
  });

  assert.equal(composition.profile.profile, 'secret-gated-smoke');
  assert.equal(composition.profile.requiresSecrets, true);
  assert.equal(composition.profile.usesResolvedSecretValue, false);
  assert.equal(composition.profile.willCallRemote, false);
  assert.equal(composition.profile.realNetworkEnabled, false);
  assert.equal(composition.readiness.status, 'profile-gated');
  assert.equal(composition.readiness.adapterReadyForRealSystemIntegration, false);
  assert.deepEqual(composition.profile.blockedReasons, [
    'runtime-value-gate-closed',
    'real-network-gate-closed',
  ]);
  assert.ok(composition.actionableNextSteps.includes('keep-secret-gated-edge-explicitly-blocked'));

  assertJsonRoundTrip(composition);
  assert.equal(isOpenClawRuntimeCompositionJsonSafe(composition), true);
});

test('runtime composition redacts unsafe diagnostic summaries and refs', () => {
  const composition = composeOpenClawRuntime({
    compositionRef: 'runtime:composition:diagnostics',
    profile: 'fake',
    generatedAt: FIXED_NOW,
    lifecycle: createReadyLifecycleDescription(),
    bindings: readyBindings(),
    diagnostics: [
      {
        diagnosticRef: 'diagnostic:unsafe-input',
        status: 'warn',
        safeSummary: 'raw provider payload from /tmp/provider.txt',
        detailsRef: 'https://example.invalid/detail',
      },
    ],
  });
  const diagnostic = composition.safeDiagnostics.find(
    (item) => item.diagnosticRef === 'diagnostic:unsafe-input',
  );

  assert.ok(diagnostic);
  assert.equal(diagnostic.safeSummary, 'redacted');
  assert.equal(diagnostic.detailsRef, 'redacted-ref');
  assert.equal(isOpenClawRuntimeCompositionJsonSafe(composition), true);
});
