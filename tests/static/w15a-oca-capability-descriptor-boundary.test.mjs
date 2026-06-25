import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ocaWrapperRoot = repoPath('packages', 'oca-wrapper');
const ocaWrapperSourceRoot = repoPath('packages', 'oca-wrapper', 'src');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readJson(...segments) {
  return JSON.parse(readFileSync(repoPath(...segments), 'utf8'));
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

function assertDir(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isDirectory(), true, `${segments.join('/')} should be a directory`);
}

function walkFiles(startDir, skipNames = new Set(['dist', 'node_modules'])) {
  const files = [];

  function visit(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      if (skipNames.has(entry.name)) {
        continue;
      }

      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }

      if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }

  visit(startDir);
  return files;
}

function readPackageSources() {
  return walkFiles(ocaWrapperSourceRoot)
    .filter((sourceFile) => sourceFile.endsWith('.ts'))
    .map((sourceFile) => ({
      relativePath: path.relative(repoRoot, sourceFile),
      source: readFileSync(sourceFile, 'utf8'),
    }));
}

const expectedRootScripts = Object.freeze({
  clean: 'node scripts/clean.mjs',
  build: 'npm run build --workspaces',
  typecheck: 'npm run typecheck --workspaces',
  'test:static': 'node --test tests/static/*.test.mjs',
  'test:unit': 'npm run build && npm run test:unit --workspaces',
  'test:acceptance': 'npm run build && node --test tests/acceptance/*.test.mjs',
  'test:core-integration': 'npm run build && node --test tests/integration/w12b-real-core-host-composition.test.mjs tests/integration/w12c-adapter-real-core-fake-telegram-e2e.test.mjs tests/integration/w12d-callback-token-real-core-lifecycle.test.mjs',
  'test:real-smoke': 'npm run build && node --test tests/smoke/w14f-secret-gated-real-transport-smoke.test.mjs',
  test: 'npm run test:static && npm run test:unit && npm run test:acceptance',
  check: 'npm run build && npm run typecheck && npm run test',
});

const requiredWorkspacePackages = Object.freeze([
  'packages/openclaw-adapter',
  'packages/openclaw-plugin-runtime',
  'packages/openclaw-telegram-transport',
  'packages/openclaw-testkit',
  'packages/oca-wrapper',
]);

test('W15A oca-wrapper package is included in workspace topology without root script drift', () => {
  const rootPackage = readJson('package.json');

  for (const workspacePackage of requiredWorkspacePackages) {
    assert.equal(rootPackage.workspaces.includes(workspacePackage), true, `${workspacePackage} should remain in root workspaces`);
  }
  assert.deepEqual(rootPackage.scripts, expectedRootScripts);
});

test('W15A package-lock contains only the oca-wrapper workspace link and package entry', () => {
  const lockfile = readJson('package-lock.json');

  assert.equal(lockfile.packages[''].workspaces.includes('packages/oca-wrapper'), true);
  assert.deepEqual(lockfile.packages['node_modules/@hazeteam/oca-wrapper'], {
    resolved: 'packages/oca-wrapper',
    link: true,
  });
  assert.deepEqual(lockfile.packages['packages/oca-wrapper'], {
    name: '@hazeteam/oca-wrapper',
    version: '0.0.0',
  });
});

test('W15A oca-wrapper package skeleton exists', () => {
  assertDir('packages', 'oca-wrapper');
  assertFile('packages', 'oca-wrapper', 'README.md');
  assertFile('packages', 'oca-wrapper', 'package.json');
  assertFile('packages', 'oca-wrapper', 'tsconfig.json');
  assertFile('packages', 'oca-wrapper', 'src', 'index.ts');
  assertFile('packages', 'oca-wrapper', 'src', 'capability-descriptor.ts');
  assertFile('packages', 'oca-wrapper', 'tests', 'unit', 'capability-descriptor.test.mjs');

  const packageJson = readJson('packages', 'oca-wrapper', 'package.json');
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.sideEffects, false);
  assert.equal(packageJson.main, './dist/index.js');
  assert.equal(packageJson.types, './dist/index.d.ts');
  assert.deepEqual(Object.keys(packageJson.scripts), ['clean', 'build', 'typecheck', 'test:unit', 'test']);
});

test('W15A oca-wrapper source stays descriptor-only and free of provider/runtime imports', () => {
  assert.equal(existsSync(ocaWrapperRoot), true);

  for (const { relativePath, source } of readPackageSources()) {
    assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/src(?:\/|['"])/u, `${relativePath} imports hazeteam-core/src`);
    assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u, `${relativePath} imports hazeteam-core/dist`);
    assert.doesNotMatch(source, /from\s+['"](?:openai|@openai\/|@anthropic\/|@modelcontextprotocol\/|oca|@openclaw\/oca|codex|@codex\/)/iu, `${relativePath} imports a provider SDK`);
    assert.doesNotMatch(source, /process\s*\.\s*env/u, `${relativePath} reads process.env`);
    assert.doesNotMatch(source, /from\s+['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads)['"]/u, `${relativePath} imports a runtime boundary module`);
    assert.doesNotMatch(source, /import\(\s*['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads)['"]\s*\)/u, `${relativePath} dynamically imports a runtime boundary module`);
    assert.doesNotMatch(source, /\bfetch\s*\(/u, `${relativePath} calls fetch`);
    assert.doesNotMatch(source, /\bWebSocket\b/u, `${relativePath} references WebSocket`);
    assert.doesNotMatch(source, /\bEventSource\b/u, `${relativePath} references EventSource`);
    assert.doesNotMatch(source, /\bset(?:Timeout|Interval)\s*\(/u, `${relativePath} creates a timer`);
    assert.doesNotMatch(source, /\baddEventListener\s*\(/u, `${relativePath} registers a listener`);
    assert.doesNotMatch(source, /\bcreateServer\s*\(/u, `${relativePath} creates a server`);
    assert.doesNotMatch(source, /\.listen\s*\(/u, `${relativePath} starts a listener`);
    assert.doesNotMatch(source, /\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk)\b/u, `${relativePath} constructs a runtime object`);
    assert.doesNotMatch(source, /\b(?:startSession|continueSession|sendInput|getStatus|getOutput|cancelSession|archiveSession)\s*\(/u, `${relativePath} implements session behavior`);
  }
});

test('W15A oca-wrapper public interfaces avoid unsafe public fields', () => {
  const forbiddenPublicFieldNames = [
    'rawLog',
    'rawDiff',
    'rawOutput',
    'rawPath',
    'filePath',
    'repoPath',
    'workspacePath',
    'providerPayload',
    'runtimePayload',
    'clientHandle',
    'sdkClient',
    'processId',
    'token',
    'secret',
    'credential',
    'stack',
    'endpoint',
    'commandOutput',
  ];

  for (const { relativePath, source } of readPackageSources()) {
    for (const fieldName of forbiddenPublicFieldNames) {
      const publicFieldPattern = new RegExp(`\\breadonly\\s+${fieldName}\\b|\\b${fieldName}\\s*:`, 'u');
      assert.doesNotMatch(source, publicFieldPattern, `${relativePath} exposes unsafe public field ${fieldName}`);
    }
  }
});