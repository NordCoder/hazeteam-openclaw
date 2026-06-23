import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

function readSource(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function assertExportsExactlyOnce(source, modulePath, label) {
  const pattern = new RegExp(`export\\s+\\*\\s+from\\s+['"]${escapeRegExp(modulePath)}['"];`, 'gu');
  const matches = source.match(pattern) ?? [];
  assert.equal(matches.length, 1, `${label} must export ${modulePath} exactly once`);
}

const adapterRootWave4Exports = [
  './mapping/index.js',
  './rendering/index.js',
  './host/index.js',
  './permissions/index.js',
];

const wave4Barrels = [
  {
    label: 'mapping barrel',
    path: ['packages', 'openclaw-adapter', 'src', 'mapping', 'index.ts'],
    exports: ['./inbound-mapper.js'],
  },
  {
    label: 'rendering barrel',
    path: ['packages', 'openclaw-adapter', 'src', 'rendering', 'index.ts'],
    exports: ['./telegram-renderer.js'],
  },
  {
    label: 'host barrel',
    path: ['packages', 'openclaw-adapter', 'src', 'host', 'index.ts'],
    exports: ['./core-host-factory.js'],
  },
  {
    label: 'permissions barrel',
    path: ['packages', 'openclaw-adapter', 'src', 'permissions', 'index.ts'],
    exports: ['./permission-evaluator.js'],
  },
];

const futureRoadmapPathFreezePattern = new RegExp(
  [
    'packages/openclaw-adapter/src/(?:delivery|callbacks|runtime|approvals|storage|openclaw)',
    'packages/openclaw-adapter/tests/(?:integration|acceptance)',
    'packages/openclaw-testkit/tests/(?:integration|acceptance)',
    'tests/(?:integration|acceptance|fixtures)',
  ]
    .map((pattern) => pattern.replace(/\//gu, '\\/'))
    .join('|'),
  'u',
);

test('Wave 4 leaf files and fan-in boundary files exist', () => {
  for (const filePath of [
    ['packages', 'openclaw-adapter', 'src', 'mapping', 'inbound-mapper.ts'],
    ['packages', 'openclaw-adapter', 'src', 'mapping', 'index.ts'],
    ['packages', 'openclaw-adapter', 'src', 'rendering', 'telegram-renderer.ts'],
    ['packages', 'openclaw-adapter', 'src', 'rendering', 'index.ts'],
    ['packages', 'openclaw-adapter', 'src', 'host', 'core-host-factory.ts'],
    ['packages', 'openclaw-adapter', 'src', 'host', 'index.ts'],
    ['packages', 'openclaw-adapter', 'src', 'permissions', 'permission-evaluator.ts'],
    ['packages', 'openclaw-adapter', 'src', 'permissions', 'index.ts'],
    ['packages', 'openclaw-adapter', 'tests', 'unit', 'public-barrel-contracts.test.mjs'],
    ['tests', 'static', 'w4-fanin-boundary.test.mjs'],
  ]) {
    assertFile(...filePath);
  }
});

test('Wave 4 adapter root barrel exposes behavior shell subpaths', () => {
  const adapterRootSource = readSource('packages', 'openclaw-adapter', 'src', 'index.ts');
  for (const modulePath of adapterRootWave4Exports) {
    assertExportsExactlyOnce(adapterRootSource, modulePath, 'openclaw-adapter root barrel');
  }
});

test('Wave 4 local barrels expose exactly their merged shell modules', () => {
  for (const barrel of wave4Barrels) {
    assert.deepEqual(
      readSource(...barrel.path).trim().split(/\r?\n/u),
      barrel.exports.map((modulePath) => `export * from '${modulePath}';`),
      `${barrel.label} must expose only its Wave 4 shell module`,
    );
  }
});

test('Wave 4 static fan-in does not freeze future roadmap implementation directories', () => {
  const repositoryBoundarySource = readSource('tests', 'static', 'repository-boundary.test.mjs');

  assert.doesNotMatch(repositoryBoundarySource, /future implementation directory/u);
  assert.doesNotMatch(repositoryBoundarySource, /must not create future/u);
  assert.doesNotMatch(repositoryBoundarySource, futureRoadmapPathFreezePattern);
});
