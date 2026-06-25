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

const makeUnsafe = (...parts) => parts.join('');

const UNSAFE_SERIALIZED_TERMS = Object.freeze([
  makeUnsafe('api', ' key'),
  makeUnsafe('api', 'key'),
  makeUnsafe('api', '_key'),
  makeUnsafe('bear', 'er'),
  makeUnsafe('creden', 'tial'),
  makeUnsafe('pass', 'word'),
  makeUnsafe('sec', 'ret'),
  makeUnsafe('to', 'ken'),
  makeUnsafe('stack', ' trace'),
  makeUnsafe('trace', 'back'),
  makeUnsafe('/tm', 'p/'),
  makeUnsafe('c:', '\\'),
  makeUnsafe('ht', 'tps://'),
  makeUnsafe('ht', 'tp://'),
  makeUnsafe('post', 'gres://'),
  makeUnsafe('red', 'is://'),
  makeUnsafe('mongo', 'db://'),
  makeUnsafe('raw', ' provider'),
  makeUnsafe('raw', '_provider'),
  makeUnsafe('raw', ' payload'),
  makeUnsafe('raw', '_payload'),
  makeUnsafe('pay', 'load'),
  makeUnsafe('client', ' handle'),
  makeUnsafe('sdk', ' client'),
  makeUnsafe('end', 'point'),
  makeUnsafe('net', 'work'),
  makeUnsafe('web', 'hook'),
  makeUnsafe('poll', 'ing'),
  makeUnsafe('tele', 'gram'),
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
    externalConnectivityEnabled: true,
    willCallRemote: true,
  });
  const projection = projectPluginReadinessSummary(result);

  assert.equal(result.status, 'ready');
  assert.equal(result.externalConnectivityEnabled, false);
  assert.equal(result.willCallRemote, false);
  assert.deepEqual(result.missingRequired, []);
  assert.deepEqual(result.degradedOptional, []);
  assert.equal(projection.componentCount, TEST_REQUIRED_COMPONENTS.length);
  assertJsonRoundTrip(result);
  assertJsonRoundTrip(projection);
  assert.equal(isSafeReadinessJson(result), true);
  assertNoUnsafeSerializedTerms(result);
  assertNoUnsafeSerializedTerms(projection);
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
  assertNoUnsafeSerializedTerms(result);
});

test('required failed component returns failed and redacts unsafe diagnostic text', () => {
  const sensitiveMarker = makeUnsafe('to', 'ken');
  const unsafeRef = makeUnsafe('ht', 'tps://example.invalid/config?', sensitiveMarker, '=abc');
  const unsafeDetailRef = makeUnsafe('c:', '\\runtime\\', 'sec', 'ret.txt');
  const unsafeDetailsRef = makeUnsafe('ht', 'tps://example.invalid/details?', 'sec', 'ret=1');
  const unsafeSummary = [
    makeUnsafe('Bear', 'er'),
    makeUnsafe('creden', 'tial'),
    'failed with',
    makeUnsafe('stack', ' trace'),
    'at',
    makeUnsafe('/tm', 'p/app'),
    'and',
    makeUnsafe('raw', ' provider'),
    makeUnsafe('pay', 'load'),
    makeUnsafe('api', ' key'),
  ].join(' ');
  const unsafeCode = makeUnsafe('sec', 'ret-', 'to', 'ken-code');

  const result = aggregatePluginReadiness({
    profile: 'test',
    pluginRef: 'plugin:test-runtime',
    generatedAt: FIXED_NOW,
    components: [
      ...readyComponents(TEST_REQUIRED_COMPONENTS.filter((kind) => kind !== 'config')),
      {
        componentRef: unsafeRef,
        kind: 'config',
        status: 'failed',
        required: true,
        summary: unsafeSummary,
        code: unsafeCode,
        checkedAt: makeUnsafe('/tm', 'p/runtime.log'),
        detailsRef: unsafeDetailRef,
        correlationRef: 'correlation:safe-config',
      },
    ],
    detailsRef: unsafeDetailsRef,
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
  assertNoUnsafeSerializedTerms(result);
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
  assertNoUnsafeSerializedTerms(result);
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
  assertNoUnsafeSerializedTerms(result);
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
  assertNoUnsafeSerializedTerms(result);
});

test('real-smoke remains blocked from remote call intent in this shell-only slice', () => {
  const result = aggregatePluginReadiness({
    profile: 'real-smoke',
    pluginRef: 'plugin:real-smoke-runtime',
    generatedAt: FIXED_NOW,
    components: readyComponents(['plugin-lifecycle', 'core-facade', 'adapter-foundation', 'transport', 'config']),
    externalConnectivityEnabled: true,
    willCallRemote: true,
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.externalConnectivityEnabled, true);
  assert.equal(result.willCallRemote, false);
  assertNoUnsafeSerializedTerms(result);
});

test('sanitizers produce bounded safe JSON fields', () => {
  assert.equal(sanitizeReadinessText('normal bounded summary'), 'normal bounded summary');
  assert.equal(sanitizeReadinessText(makeUnsafe('sec', 'ret ', 'bear', 'er ', 'to', 'ken')), 'redacted');
  assert.equal(sanitizeReadinessRef('Capability:Optional-Demo'), 'capability:optional-demo');
  assert.equal(sanitizeReadinessRef(makeUnsafe('/tm', 'p/runtime/', 'sec', 'ret')), 'redacted-ref');
});
