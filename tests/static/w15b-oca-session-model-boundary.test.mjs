import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readText(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function readJson(...segments) {
  return JSON.parse(readText(...segments));
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

const expectedOcaWrapperPackage = Object.freeze({
  name: '@hazeteam/oca-wrapper',
  version: '0.0.0',
  private: true,
  description: 'Safe W15A OCA runtime capability descriptor metadata for registry integration.',
  type: 'module',
  sideEffects: false,
  main: './dist/index.js',
  types: './dist/index.d.ts',
  exports: Object.freeze({
    '.': Object.freeze({
      types: './dist/index.d.ts',
      import: './dist/index.js',
    }),
  }),
  files: Object.freeze(['dist']),
  scripts: Object.freeze({
    clean: 'node ../../scripts/clean.mjs',
    build: 'tsc -b tsconfig.json --pretty false',
    typecheck: 'tsc -p tsconfig.json --noEmit --pretty false',
    'test:unit': "find tests/unit -type f -name '*.test.mjs' -exec node --test {} +",
    test: 'npm run test:unit',
  }),
});

function readSessionModelSource() {
  return readText('packages', 'oca-wrapper', 'src', 'session-model.ts');
}

test('W15B session model leaf exists and package metadata stays safe', () => {
  assertFile('packages', 'oca-wrapper', 'src', 'session-model.ts');
  assertFile('packages', 'oca-wrapper', 'tests', 'unit', 'session-model.test.mjs');

  const packageJson = readJson('packages', 'oca-wrapper', 'package.json');
  assert.deepEqual(packageJson, expectedOcaWrapperPackage);
});

test('W15B source has no provider, private core, runtime, network, or execution imports', () => {
  const source = readSessionModelSource();

  assert.doesNotMatch(source, /^import\s/mu, 'session model should not import anything');
  assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/src(?:\/|['"])/u, 'session model imports hazeteam-core/src');
  assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u, 'session model imports hazeteam-core/dist');
  assert.doesNotMatch(source, /from\s+['"](?:openai|@openai\/|@anthropic\/|@modelcontextprotocol\/|oca|@openclaw\/oca|codex|@codex\/)/iu, 'session model imports a provider SDK');
  assert.doesNotMatch(source, /process\s*\.\s*env/u, 'session model reads process.env');
  assert.doesNotMatch(source, /from\s+['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads)['"]/u, 'session model imports a runtime module');
  assert.doesNotMatch(source, /import\(\s*['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads)['"]\s*\)/u, 'session model dynamically imports a runtime module');
  assert.doesNotMatch(source, /\bfetch\s*\(/u, 'session model calls fetch');
  assert.doesNotMatch(source, /\bWebSocket\b/u, 'session model references WebSocket');
  assert.doesNotMatch(source, /\bEventSource\b/u, 'session model references EventSource');
  assert.doesNotMatch(source, /\bset(?:Timeout|Interval)\s*\(/u, 'session model creates a timer');
  assert.doesNotMatch(source, /\baddEventListener\s*\(/u, 'session model registers a listener');
  assert.doesNotMatch(source, /\bcreateServer\s*\(/u, 'session model creates a server');
  assert.doesNotMatch(source, /\.listen\s*\(/u, 'session model starts a listener');
  assert.doesNotMatch(source, /\b(?:webhook|polling|listener)\b/iu, 'session model includes runtime intake wording');
  assert.doesNotMatch(source, /\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk)\b/u, 'session model constructs a runtime client');
  assert.doesNotMatch(source, /\b(?:startSession|continueSession|sendInput|getStatus|getOutput|cancelSession|archiveSession)\s*\(/u, 'session model implements session execution behavior');
});

test('W15B source does not expose unsafe public field names', () => {
  const source = readSessionModelSource();
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

  for (const fieldName of forbiddenPublicFieldNames) {
    const publicFieldPattern = new RegExp(`\\breadonly\\s+${fieldName}\\b|\\b${fieldName}\\s*:`, 'u');
    assert.doesNotMatch(source, publicFieldPattern, `session-model.ts exposes unsafe public field ${fieldName}`);
  }
});

test('W15B unit tests import built session model and do not import source directly', () => {
  const testSource = readText('packages', 'oca-wrapper', 'tests', 'unit', 'session-model.test.mjs');

  assert.match(testSource, /from\s+['"]\.\.\/\.\.\/dist\/session-model\.js['"]/u);
  assert.doesNotMatch(testSource, /from\s+['"]\.\.\/\.\.\/src\/session-model/u);
});

test('W15B leaves root package, lockfile, manifests, W15A descriptor, docs, workflows, and broad test layers unchanged', () => {
  const rootPackage = readJson('package.json');
  for (const workspacePackage of requiredWorkspacePackages) {
    assert.equal(rootPackage.workspaces.includes(workspacePackage), true, `${workspacePackage} should remain in root workspaces`);
  }
  assert.deepEqual(rootPackage.scripts, expectedRootScripts);

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

  const descriptorSource = readText('packages', 'oca-wrapper', 'src', 'capability-descriptor.ts');
  assert.equal(descriptorSource.includes('session-model'), false);
  assert.match(descriptorSource, /contractSlice:\s*'W15A'/u);
  assert.match(descriptorSource, /Descriptor-only OCA session capability/u);

  assertFile('.github', 'workflows', 'ci.yml');
  assertFile('docs', 'README.md');
  assertFile('docs', 'index.md');
  assertFile('docs', 'roadmap', 'current-development-state.md');
  assertFile('docs', 'architecture', 'parallel-execution-and-fanin.md');
  assertFile('docs', 'release', 'known-limitations.md');
  assertDir('tests', 'acceptance');
  assertDir('tests', 'integration');
  assertDir('tests', 'smoke');
});