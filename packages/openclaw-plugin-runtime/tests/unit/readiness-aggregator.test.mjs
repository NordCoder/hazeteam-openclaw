import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPENCLAW_PLUGIN_READINESS_COMPONENT_KINDS,
  OPENCLAW_PLUGIN_READINESS_PROFILES,
  aggregatePluginReadiness,
  isSafeReadinessJson,
  projectPluginReadinessSummary,
  readinessCheckStatus,
  sanitizeReadinessRef,
  sanitizeReadinessText,
} from '../../dist/readiness.js';

const FIXED_NOW = '2026-06-25T00:00:00.000Z';

const TEST_REQUIRED_COMPONENTS = Object.freeze([
  'plugin-lifecycle',
  'adapter-foundation',
  'core-facade',
  'stores',
  'transport',
  'config',
]);

const EMBEDDED_REQUIRED_COMPONENTS = Object.freeze([
  'plugin-lifecycle',
  'core-facade',
  'adapter-foundation',
  'stores',
  'transport',
  'tools',
  'config',
]);

const PRODUCTION_REQUIRED_COMPONENTS = Object.freeze([
  'plugin-lifecycle',
  'core-facade',
  'adapter-foundation',
  'transport',
  'capability',
  'config',
  'stores',
  'tools',
]);

const UNSAFE_SERIALIZED_TERMS = Object.freeze([
  'api key',
  'apikey',
  'api_key',
  'bearer',
  'credential',
  'password',
  'secret',
  'token',
  'stack trace',
  'traceback',
  '/tmp/',
  'c:\\',
  'https://',
  'http://',
  'postgres://',
  'redis://',
  'mongodb://',
  'raw provider',
  'raw_provider',
  'raw payload',
  'raw_payload',
  'payload',
  'client handle',
  'sdk client',
  'endpoint',
]);

function readyComponent(kind) {
  return Object.freeze({
    componentRef: `component:${kind}`,
    kind,
    status: 'ready',
    summary: 'Component ready',
    code: 'ready',
    checkedAt: FIXED_NOW,
  });
}

function readyComponents(kinds) {
  return kinds.map((kind) => readyComponent(kind));
}

function assertJsonRoundTrip(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
}

function assertNoUnsafeSerializedTerms(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of UNSAFE_SERIALIZED_TERMS) {
    assert.equal(serialized.includes(term), false, `serialized output must not include ${term}`);
  }
}

test('readiness model exposes required W13 profiles and safe component kinds', () => {
  assert.deepEqual([...OPENCLAW_PLUGIN_READINESS_PROFILES], [
    'test',
    'dry-run',
    'embedded-core',
    'sidecar-core',
    'real-smoke',
    'production',
  ]);
  assert.deepEqual([...OPENCLAW_PLUGIN_READINESS_COMPONENT_KINDS], [
    'plugin-lifecycle',
    'core-facade',
    'adapter-foundation',
    'transport',
    'capability',
    'config',
    'stores',
    'tools',
  ]);
});

test('all required dry-run components passing produces a ready JSON summary with no remote call intent', () => {
  const result = aggregatePluginReadiness({
    profile: 'dry-run',
    pluginRef: 'plugin:test-runtime',
    generatedAt: FIXED_NOW,
    components: readyComponents(TEST_REQUIRED_COMPONENTS),
    realNetworkEnabled: true,
    willCallRemote: true,
  });
  const projection = projectPluginReadinessSummary(result);

  assert.equal(result.status, 'ready');
  assert.equal(result.realNetworkEnabled, false);
  assert.equal(result.willCallRemote, false);
  assert.deepEqual(result.missingRequired, []);
  assert.deepEqual(result.degradedOptional, []);
  assert.equal(projection.componentCount, TEST_REQUIRED_COMPONENTS.length);
  assertJsonRoundTrip(result);
  assertJsonRoundTrip(projection);
  assert.equal(isSafeReadinessJson(result), true);
});

test('missing required embedded-core dependency becomes not-ready with safe missing dependency refs', () => {
  const components = readyComponents(EMBEDDED_REQUIRED_COMPONENTS.filter((kind) => kind !== 'core-facade'));
  const result = aggregatePluginReadiness({
    profile: 'embedded-core',
    pluginRef: 'plugin:embedded-runtime',
    generatedAt: FIXED_NOW,
    components,
  });

  assert.equal(result.status, 'not-ready');
  assert.deepEqual(result.missingRequired, ['component:core-facade']);
  assert.equal(result.components.find((component) => component.kind === 'core-facade')?.status, 'missing');
  assert.equal(result.components.find((component) => component.kind === 'core-facade')?.required, true);
  assert.equal(isSafeReadinessJson(result), true);
});

test('required failed component returns failed and redacts unsafe diagnostic text', () => {
  const result = aggregatePluginReadiness({
    profile: 'test',
    pluginRef: 'plugin:test-runtime',
    generatedAt: FIXED_NOW,
    components: [
      ...readyComponents(TEST_REQUIRED_COMPONENTS.filter((kind) => kind !== 'config')),
      {
        componentRef: 'https://example.invalid/config?token=abc',
        kind: 'config',
        status: 'failed',
        required: true,
        summary: 'Bearer credential failed with stack trace at /tmp/app and raw provider payload api key',
        code: 'secret-token-code',
        checkedAt: '/tmp/runtime.log',
        detailsRef: 'c:\\runtime\\secret.txt',
        correlationRef: 'correlation:safe-config',
      },
    ],
    detailsRef: 'https://example.invalid/details?secret=1',
  });

  const failedConfig = result.components.find((component) => component.kind === 'config');

  assert.equal(result.status, 'failed');
  assert.equal(failedConfig?.componentRef, 'redacted-ref');
  assert.equal(failedConfig?.summary, 'redacted');
  assert.equal(failedConfig?.code, 'redacted');
  assert.equal(failedConfig?.checkedAt, FIXED_NOW);
  assert.equal(failedConfig?.detailsRef, 'redacted-ref');
  assert.equal(failedConfig?.correlationRef, 'correlation:safe-config');
  assert.equal(result.detailsRef, 'redacted-ref');
  assert.equal(isSafeReadinessJson(result), true);
  assertNoUnsafeSerializedTerms(result);
});

test('missing optional capability is non-fatal unless explicitly required', () => {
  const result = aggregatePluginReadiness({
    profile: 'dry-run',
    pluginRef: 'plugin:test-runtime',
    generatedAt: FIXED_NOW,
    components: [
      ...readyComponents(TEST_REQUIRED_COMPONENTS),
      {
        componentRef: 'capability:optional-demo',
        kind: 'capability',
        status: 'missing',
        required: false,
        summary: 'Optional component unavailable',
        code: 'missing-optional',
        checkedAt: FIXED_NOW,
      },
    ],
  });

  assert.equal(result.status, 'degraded');
  assert.deepEqual(result.missingRequired, []);
  assert.deepEqual(result.degradedOptional, ['capability:optional-demo']);
  assert.notEqual(result.status, 'not-ready');
  assert.notEqual(result.status, 'failed');
  assert.equal(isSafeReadinessJson(result), true);
});

test('capability missing becomes required when requested by explicit input', () => {
  const result = aggregatePluginReadiness({
    profile: 'dry-run',
    pluginRef: 'plugin:test-runtime',
    generatedAt: FIXED_NOW,
    requiredKinds: ['capability'],
    components: readyComponents(TEST_REQUIRED_COMPONENTS),
  });

  assert.equal(result.status, 'not-ready');
  assert.deepEqual(result.missingRequired, ['component:capability']);
  assert.equal(result.degradedOptional.length, 0);
});

test('production profile does not overclaim readiness when production capability is absent', () => {
  const result = aggregatePluginReadiness({
    profile: 'production',
    pluginRef: 'plugin:production-runtime',
    generatedAt: FIXED_NOW,
    components: readyComponents(PRODUCTION_REQUIRED_COMPONENTS.filter((kind) => kind !== 'capability')),
  });

  assert.equal(result.status, 'not-ready');
  assert.deepEqual(result.missingRequired, ['component:capability']);
  assert.equal(result.willCallRemote, false);
  assert.equal(isSafeReadinessJson(result), true);
});

test('optional disabled component remains explicitly non-fatal', () => {
  const result = aggregatePluginReadiness({
    profile: 'test',
    pluginRef: 'plugin:test-runtime',
    generatedAt: FIXED_NOW,
    components: [
      ...readyComponents(TEST_REQUIRED_COMPONENTS),
      {
        componentRef: 'tools:optional-extra',
        kind: 'tools',
        status: 'disabled',
        required: false,
        summary: 'Optional component disabled',
        code: 'disabled-optional',
        checkedAt: FIXED_NOW,
      },
    ],
  });

  const optionalTools = result.components.find((component) => component.componentRef === 'tools:optional-extra');

  assert.equal(result.status, 'ready');
  assert.deepEqual(result.disabledOptional, ['tools:optional-extra']);
  assert.equal(optionalTools?.required, false);
  assert.equal(optionalTools === undefined ? undefined : readinessCheckStatus(optionalTools), 'disabled');
});

test('real-smoke remains blocked from remote call intent in this shell-only slice', () => {
  const result = aggregatePluginReadiness({
    profile: 'real-smoke',
    pluginRef: 'plugin:real-smoke-runtime',
    generatedAt: FIXED_NOW,
    components: readyComponents(['plugin-lifecycle', 'core-facade', 'adapter-foundation', 'transport', 'config']),
    realNetworkEnabled: true,
    willCallRemote: true,
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.realNetworkEnabled, true);
  assert.equal(result.willCallRemote, false);
});

test('sanitizers produce bounded safe JSON fields', () => {
  assert.equal(sanitizeReadinessText('normal bounded summary'), 'normal bounded summary');
  assert.equal(sanitizeReadinessText('secret bearer token'), 'redacted');
  assert.equal(sanitizeReadinessRef('Capability:Optional-Demo'), 'capability:optional-demo');
  assert.equal(sanitizeReadinessRef('/tmp/runtime/secret'), 'redacted-ref');
});
