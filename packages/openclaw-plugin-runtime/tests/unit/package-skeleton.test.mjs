import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR,
  OPENCLAW_PLUGIN_RUNTIME_PACKAGE,
  describeOpenClawPluginRuntime,
} from '../../dist/index.js';

test('@hazeteam/openclaw-plugin-runtime exports skeleton metadata', () => {
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.name, '@hazeteam/openclaw-plugin-runtime');
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.status, 'skeleton');
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.productionReady, false);
  assert.equal(OPENCLAW_PLUGIN_RUNTIME_PACKAGE.contractSlice, 'W13A');
  assert.deepEqual(Object.keys(OPENCLAW_PLUGIN_RUNTIME_PACKAGE).sort(), [
    'contractSlice',
    'name',
    'productionReady',
    'status',
  ]);
});

test('@hazeteam/openclaw-plugin-runtime exposes a JSON-serializable descriptor', () => {
  const encoded = JSON.stringify(OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR);
  const decoded = JSON.parse(encoded);

  assert.deepEqual(decoded, {
    kind: 'openclaw-plugin-runtime',
    packageName: '@hazeteam/openclaw-plugin-runtime',
    packageStatus: 'skeleton',
    descriptorVersion: 'w13a',
    readiness: 'not-configured',
    productionReady: false,
    effects: 'none',
    scope: 'package-boundary',
  });
});

test('@hazeteam/openclaw-plugin-runtime describe function is no-effect and not production ready', () => {
  const first = describeOpenClawPluginRuntime();
  const second = describeOpenClawPluginRuntime();

  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
  assert.equal(first.package.productionReady, false);
  assert.equal(first.descriptor.readiness, 'not-configured');
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
