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

const wave5SourceFiles = [
  ['packages', 'openclaw-adapter', 'src', 'delivery', 'delivery-pump.ts'],
  ['packages', 'openclaw-adapter', 'src', 'callbacks', 'callback-token-flow.ts'],
  ['packages', 'openclaw-adapter', 'src', 'runtime', 'runtime-bridge.ts'],
  ['packages', 'openclaw-adapter', 'src', 'approvals', 'approval-bridge.ts'],
];

const wave5Barrels = [
  {
    label: 'delivery barrel',
    path: ['packages', 'openclaw-adapter', 'src', 'delivery', 'index.ts'],
    exports: ['./delivery-pump.js'],
  },
  {
    label: 'callbacks barrel',
    path: ['packages', 'openclaw-adapter', 'src', 'callbacks', 'index.ts'],
    exports: ['./callback-token-flow.js'],
  },
  {
    label: 'runtime barrel',
    path: ['packages', 'openclaw-adapter', 'src', 'runtime', 'index.ts'],
    exports: ['./runtime-bridge.js'],
  },
  {
    label: 'approvals barrel',
    path: ['packages', 'openclaw-adapter', 'src', 'approvals', 'index.ts'],
    exports: ['./approval-bridge.js'],
  },
];

const adapterRootWave5Exports = [
  './delivery/index.js',
  './callbacks/index.js',
  './runtime/index.js',
  './approvals/index.js',
];

const forbiddenBoundaryImportPatterns = [
  /from\s+['"]hazeteam-core\/src(?:\/|['"])/u,
  /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u,
  /import\(\s*['"]hazeteam-core\/src(?:\/|['"])/u,
  /import\(\s*['"]hazeteam-core\/dist(?:\/|['"])/u,
  /require\(\s*['"]hazeteam-core\/src(?:\/|['"])/u,
  /require\(\s*['"]hazeteam-core\/dist(?:\/|['"])/u,
  /(?:from\s+|import\(\s*|require\(\s*)['"]\.\.\/openclaw\//u,
  /(?:from\s+|import\(\s*|require\(\s*)['"]\.\.\/\.\.\/openclaw\//u,
  /(?:from\s+|import\(\s*|require\(\s*)['"]\.\.\/storage\//u,
  /(?:from\s+|import\(\s*|require\(\s*)['"]\.\.\/\.\.\/storage\//u,
];

test('Wave 5 leaf files and module barrels exist', () => {
  for (const filePath of wave5SourceFiles) {
    assertFile(...filePath);
  }

  for (const barrel of wave5Barrels) {
    assertFile(...barrel.path);
  }

  assertFile('packages', 'openclaw-adapter', 'tests', 'unit', 'public-barrel-contracts.test.mjs');
  assertFile('tests', 'static', 'w5-fanin-boundary.test.mjs');
});

test('Wave 5 local barrels expose exactly their merged flow modules', () => {
  for (const barrel of wave5Barrels) {
    assert.deepEqual(
      readSource(...barrel.path).trim().split(/\r?\n/u),
      barrel.exports.map((modulePath) => `export * from '${modulePath}';`),
      `${barrel.label} must expose only its Wave 5 flow module`,
    );
  }
});

test('Wave 5 adapter root barrel exposes flow component subpaths exactly once', () => {
  const adapterRootSource = readSource('packages', 'openclaw-adapter', 'src', 'index.ts');

  for (const modulePath of adapterRootWave5Exports) {
    assertExportsExactlyOnce(adapterRootSource, modulePath, 'openclaw-adapter root barrel');
  }
});

test('Wave 5 production source avoids private core, future integration, and storage imports', () => {
  for (const filePath of [...wave5SourceFiles, ...wave5Barrels.map((barrel) => barrel.path)]) {
    const relativePath = filePath.join('/');
    const source = readSource(...filePath);

    for (const pattern of forbiddenBoundaryImportPatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath} imports through a forbidden boundary path`);
    }
  }
});
