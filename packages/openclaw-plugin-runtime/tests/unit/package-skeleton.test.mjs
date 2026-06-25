import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR,
  OPENCLAW_PLUGIN_RUNTIME_PACKAGE,
  OPENCLAW_PLUGIN_RUNTIME_PUBLIC_SURFACES,
  describeOpenClawPluginRuntime,
} from '../../dist/index.js';

test('@hazeteam/openclaw-plugin-runtime exports fan-in package metadata', () => {
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.name, '@hazeteam/openclaw-plugin-runtime');
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.status, 'runtime-shell');
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.productionReady, false);
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.contractSlice, 'W13A-W13F');
  assert.deepEqual(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.publicSurfaces, [
    'lifecycle',
    'tool-registry',
    'capability-registry',
    'readiness',
  ]);
  assert.deepEqual(Object.keys(OPENCLAW_PLUGIN_RUNTIME_PACKAGE).sort(), [
    'contractSlice',
    'name',
    'productionReady',
    'publicSurfaces',
    'status',
  ]);
});

test('@hazeteam/openclaw-plugin-runtime exposes a JSON-serializable fan-in descriptor', () => {
  const encoded = JSON.stringify(OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR);
  const decoded = JSON.parse(encoded);

  assert.deepEqual(OPENCLAW_PLUGIN_RUNTIME_PUBLIC_SURFACES, [
    'lifecycle',
    'tool-registry',
    'capability-registry',
    'readiness',
  ]);
  assert.deepEqual(decoded, {
    kind: 'openclaw-plugin-runtime',
    packageName: '@hazeteam/openclaw-plugin-runtime',
    packageStatus: 'runtime-shell',
    descriptorVersion: 'w13f',
    readiness: 'fake-dry-run-capable',
    productionReady: false,
    effects: 'none',
    scope: 'plugin-runtime-shell',
    publicSurfaces: ['lifecycle', 'tool-registry', 'capability-registry', 'readiness'],
  });
});

test('@hazeteam/openclaw-plugin-runtime describe function is no-effect and not production ready', () => {
  const first = describeOpenClawPluginRuntime();
  const second = describeOpenClawPluginRuntime();

  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
  assert.equal(first.package.productionReady, false);
  assert.equal(first.package.status, 'runtime-shell');
  assert.equal(first.descriptor.readiness, 'fake-dry-run-capable');
  assert.equal(first.descriptor.effects, 'none');
});

test('@hazeteam/openclaw-plugin-runtime public output does not expose unsafe implementation terms', () => {
  const publicOutput = JSON.stringify({
    package: OPENCLAW_PLUGIN_RUNTIME_PACKAGE,
    descriptor: OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR,
    description: describeOpenClawPluginRuntime(),
  }).toLowerCase();

  const forbiddenTerms = [
    'api key',
    'bearer',
    'cache',
    'client',
    'codex',
    'credential',
    'database',
    'dotenv',
    'filesystem',
    'lifeos',
    'network',
    'oca',
    'password',
    'polling',
    'queue',
    'scheduler',
    'sdk',
    'secret',
    'sidecar',
    'stack trace',
    'telegram',
    'token',
    'webhook',
  ];

  for (const term of forbiddenTerms) {
    assert.equal(publicOutput.includes(term), false, `public output must not include ${term}`);
  }
});
