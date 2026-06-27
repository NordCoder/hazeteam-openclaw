import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ASSIGNED_FAN_IN_FILES = Object.freeze([
  ['packages', 'openclaw-adapter', 'src', 'durable-state', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'index.ts'],
  ['packages', 'openclaw-adapter', 'tests', 'unit', 'durable-state', 'durable-state-fan-in.test.mjs'],
  ['tests', 'static', 'w21f-durable-state-fan-in-public-surface.test.mjs'],
  ['docs', 'roadmap', 'current-development-state.md'],
  ['docs', 'roadmap', 'w21f-durable-state-docs-and-fan-in.md'],
]);

const DURABLE_STATE_BARREL = ASSIGNED_FAN_IN_FILES[0];
const PACKAGE_ROOT_SOURCE = ASSIGNED_FAN_IN_FILES[1];
const W21F_ROADMAP_NOTE = ASSIGNED_FAN_IN_FILES[5];
const CURRENT_STATE_DOC = ASSIGNED_FAN_IN_FILES[4];

const ALLOWED_DURABLE_STATE_BARREL_SNIPPETS = Object.freeze([
  "export type * from './durable-state-contract-types.js';",
  "export { createFakeInertAdapterStateStore } from './fake-inert-adapter-state-store-port.js';",
  "export type * from './fake-inert-adapter-state-store-port.js';",
  'FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE',
  'createFakeInertReplayIdempotencyStateBoundary',
  "} from './fake-inert-replay-idempotency-state-boundary.js';",
  "export type * from './fake-inert-replay-idempotency-state-boundary.js';",
]);

const SAFE_RUNTIME_EXPORT_NAMES = Object.freeze([
  'FAKE_INERT_REPLAY_IDEMPOTENCY_STATE_BOUNDARY_POSTURE',
  'createFakeInertAdapterStateStore',
  'createFakeInertReplayIdempotencyStateBoundary',
]);

const FORBIDDEN_EXPORTED_NAME_FRAGMENTS = Object.freeze([
  'rawProvider',
  'rawCallback',
  'rawPayload',
  'secret',
  'credential',
  'authHeader',
  'endpoint',
  'localPath',
  'stackTrace',
  'stdout',
  'stderr',
  'client',
  'sdk',
  'handle',
  'processEnv',
  'runtimeValue',
]);

const FORBIDDEN_FAN_IN_SNIPPETS = Object.freeze([
  'production durable backend ready',
  'production storage ready',
  'durable-backend-ready',
  'database adapter',
  'cache adapter',
  'queue adapter',
  'migration runner',
  'backup runner',
  'restore runner',
  'replay CLI',
  'recovery runtime',
  'listener runtime',
  'webhook runtime',
  'polling runtime',
  'provider SDK',
  'provider client',
  'default network',
  'default secret',
  'deployment runtime',
  'production provider runtime',
  'OCA readiness',
  'LifeOS readiness',
  'sidecar readiness',
  'real-provider success',
]);

function repoPath(segments) {
  return path.join(repoRoot, ...segments);
}

function asRepoRelative(segments) {
  return segments.join('/');
}

function readUtf8(segments) {
  return readFileSync(repoPath(segments), 'utf8');
}

function assertIncludes(source, expected, label) {
  assert.equal(source.includes(expected), true, `${label} should include ${expected}`);
}

function assertDoesNotInclude(source, forbidden, label) {
  assert.equal(source.includes(forbidden), false, `${label} should not include ${forbidden}`);
}

function exportedNamesFromDurableStateBarrel(source) {
  const names = new Set();

  for (const match of source.matchAll(/export \{([\s\S]*?)\}\s+from/gu)) {
    for (const rawName of match[1].split(',')) {
      const name = rawName.trim();

      if (name.length > 0) {
        names.add(name);
      }
    }
  }

  return [...names].sort();
}

test('W21F static guard is scoped to assigned fan-in files only', () => {
  assert.deepEqual(
    ASSIGNED_FAN_IN_FILES.map(asRepoRelative),
    [
      'packages/openclaw-adapter/src/durable-state/index.ts',
      'packages/openclaw-adapter/src/index.ts',
      'packages/openclaw-adapter/tests/unit/durable-state/durable-state-fan-in.test.mjs',
      'tests/static/w21f-durable-state-fan-in-public-surface.test.mjs',
      'docs/roadmap/current-development-state.md',
      'docs/roadmap/w21f-durable-state-docs-and-fan-in.md',
    ],
  );
});

test('package root exports durable-state fan-in only through the assigned local barrel', () => {
  const packageRootSource = readUtf8(PACKAGE_ROOT_SOURCE);

  assertIncludes(packageRootSource, "export * from './durable-state/index.js';", 'package root source');
  assertDoesNotInclude(packageRootSource, 'durable-state-contract-types', 'package root source');
  assertDoesNotInclude(packageRootSource, 'fake-inert-adapter-state-store-port', 'package root source');
  assertDoesNotInclude(packageRootSource, 'fake-inert-replay-idempotency-state-boundary', 'package root source');
});

test('durable-state barrel exports only W21B/W21C/W21D fake/inert fan-in surfaces', () => {
  const barrelSource = readUtf8(DURABLE_STATE_BARREL);

  for (const snippet of ALLOWED_DURABLE_STATE_BARREL_SNIPPETS) {
    assertIncludes(barrelSource, snippet, 'durable-state barrel');
  }

  assert.deepEqual(exportedNamesFromDurableStateBarrel(barrelSource), SAFE_RUNTIME_EXPORT_NAMES);
  assertDoesNotInclude(barrelSource, 'runtime-values', 'durable-state barrel');
  assertDoesNotInclude(barrelSource, 'provider', 'durable-state barrel');
  assertDoesNotInclude(barrelSource, 'openclaw/index', 'durable-state barrel');
  assertDoesNotInclude(barrelSource, 'storage/index', 'durable-state barrel');
});

test('exported runtime names remain safe and fake/inert', () => {
  const exportedNames = exportedNamesFromDurableStateBarrel(readUtf8(DURABLE_STATE_BARREL));

  for (const name of exportedNames) {
    assert.match(name, /FakeInert|FAKE_INERT/u);

    for (const forbidden of FORBIDDEN_EXPORTED_NAME_FRAGMENTS) {
      assert.equal(name.toLowerCase().includes(forbidden.toLowerCase()), false, `${name} exposed ${forbidden}`);
    }
  }
});

test('assigned W21F source files do not introduce forbidden durable-state fan-in behavior', () => {
  for (const file of ASSIGNED_FAN_IN_FILES) {
    const relative = asRepoRelative(file);
    const source = readUtf8(file);

    if (relative === 'tests/static/w21f-durable-state-fan-in-public-surface.test.mjs') {
      continue;
    }

    for (const forbidden of FORBIDDEN_FAN_IN_SNIPPETS) {
      assertDoesNotInclude(source, forbidden, relative);
    }
  }
});

test('roadmap note and current state preserve guarded classification and non-production posture', () => {
  const roadmapNote = readUtf8(W21F_ROADMAP_NOTE);
  const currentState = readUtf8(CURRENT_STATE_DOC);

  for (const source of [roadmapNote, currentState]) {
    assertIncludes(
      source,
      'adapter-ready-for-real-system-integration under explicit gates',
      'W21F docs classification',
    );
    assertIncludes(source, 'not production-ready', 'W21F docs non-production posture');
    assertIncludes(source, 'no production durable backend', 'W21F docs durable backend non-claim');
    assertIncludes(source, 'no production storage readiness', 'W21F docs storage non-claim');
    assertIncludes(source, 'no real-provider success claim', 'W21F docs provider non-claim');
  }
});

test('W21F docs keep future non-goals unimplemented and avoid production-readiness claims', () => {
  const docs = [readUtf8(W21F_ROADMAP_NOTE), readUtf8(CURRENT_STATE_DOC)].join('\n');

  for (const expected of [
    'no deployment/runtime/provider/OCA/LifeOS/sidecar readiness',
    'no production durable backend behavior',
    'no runtime/provider/network/secret/deployment behavior',
  ]) {
    assertIncludes(docs, expected, 'W21F docs');
  }

  assertDoesNotInclude(docs, 'production-ready adapter', 'W21F docs');
  assertDoesNotInclude(docs, 'production durable backend ready', 'W21F docs');
  assertDoesNotInclude(docs, 'production storage ready', 'W21F docs');
});
