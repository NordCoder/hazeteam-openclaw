import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

function listFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else if (stats.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

const w8LeafSourceFiles = [
  ['packages', 'openclaw-adapter', 'src', 'openclaw', 'channel', 'openclaw-channel-event-adapter.ts'],
  ['packages', 'openclaw-adapter', 'src', 'openclaw', 'delivery', 'openclaw-delivery-adapter.ts'],
  ['packages', 'openclaw-adapter', 'src', 'openclaw', 'runtime', 'openclaw-runtime-bridge.ts'],
  ['packages', 'openclaw-adapter', 'src', 'openclaw', 'approval', 'openclaw-approval-bridge.ts'],
];

const w8OpenClawBarrels = [
  ['packages', 'openclaw-adapter', 'src', 'openclaw', 'channel', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'openclaw', 'delivery', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'openclaw', 'runtime', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'openclaw', 'approval', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'openclaw', 'index.ts'],
];

const w8ProductionSources = [
  ...w8LeafSourceFiles,
  ...w8OpenClawBarrels,
  ['packages', 'openclaw-adapter', 'src', 'index.ts'],
];

test('Wave 8 OpenClaw leaf files and fan-in barrels exist', () => {
  for (const filePath of [...w8LeafSourceFiles, ...w8OpenClawBarrels]) {
    assertFile(...filePath);
  }
});

test('Wave 8 OpenClaw aggregate and root barrels expose fan-in paths', () => {
  const rootSource = readSource('packages', 'openclaw-adapter', 'src', 'index.ts');
  const openclawSource = readSource('packages', 'openclaw-adapter', 'src', 'openclaw', 'index.ts');

  assert.match(rootSource, /export \* from '\.\/openclaw\/index\.js';/u);
  assert.match(openclawSource, /\.\/channel\/index\.js/u);
  assert.match(openclawSource, /\.\/delivery\/index\.js/u);
  assert.match(openclawSource, /\.\/runtime\/index\.js/u);
  assert.match(openclawSource, /\.\/approval\/index\.js/u);
});

test('Wave 8 OpenClaw leaf source avoids private core paths and real infra calls', () => {
  const forbiddenPatterns = [
    /hazeteam-core\/src/u,
    /hazeteam-core\/dist/u,
    /\bfetch\s*\(/u,
    /\bsetTimeout\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\bDate\.now\s*\(/u,
    /\bMath\.random\s*\(/u,
    /\breadFile(?:Sync)?\s*\(/u,
    /\bwriteFile(?:Sync)?\s*\(/u,
    /\bopenSync\s*\(/u,
    /\bcreateConnection\s*\(/u,
    /\bconnect\s*\(/u,
    /from\s+['"]node:(?:http|https|net)['"]/u,
    /import\s*\(\s*['"]node:(?:http|https|net)['"]\s*\)/u,
  ];

  for (const filePath of w8LeafSourceFiles) {
    const source = readSource(...filePath);
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(source, pattern, `${filePath.join('/')} violates Wave 8 OpenClaw fan-in boundary`);
    }
  }
});

test('Wave 8 OpenClaw fan-in leaves adapter package manifest script surface unchanged', () => {
  const adapterPackage = JSON.parse(readSource('packages', 'openclaw-adapter', 'package.json'));

  assert.deepEqual(Object.keys(adapterPackage.scripts).sort(), [
    'build',
    'clean',
    'test',
    'test:unit',
    'typecheck',
  ]);
});

test('Wave 8 OpenClaw production source does not read env or secret variables', () => {
  const forbiddenEnvPatterns = [
    /\bprocess\.env\b/u,
    /\bimport\.meta\.env\b/u,
    /\bDeno\.env\b/u,
    /\bglobalThis\.process\??\.env\b/u,
  ];

  for (const filePath of w8ProductionSources) {
    const source = readSource(...filePath);
    for (const pattern of forbiddenEnvPatterns) {
      assert.doesNotMatch(source, pattern, `${filePath.join('/')} must not read env/secrets in production source`);
    }
  }
});

test('Wave 8 secret-gated real smoke work is limited to the inert placeholder test', () => {
  const acceptanceRoot = repoPath('tests', 'acceptance');
  const allowedRealSmokeFiles = new Set([
    repoPath('tests', 'acceptance', 'w8-openclaw-secret-gated-smoke.test.mjs'),
    repoPath('tests', 'acceptance', 'w9-secret-gated-real-smoke-suite.test.mjs'),
  ]);
  const suspiciousRealSmokePattern = /(?:^|[-_])(w9|wave[-_]?9|real[-_]?openclaw|openclaw[-_]?real|secret[-_]?gated|smoke)(?:[-_.]|$)/iu;

  for (const filePath of listFiles(acceptanceRoot)) {
    if (!filePath.endsWith('.test.mjs') || allowedRealSmokeFiles.has(filePath)) {
      continue;
    }

    assert.doesNotMatch(
      path.basename(filePath),
      suspiciousRealSmokePattern,
      `${path.relative(repoRoot, filePath)} looks like Wave 9 or real smoke work`,
    );
  }
});
