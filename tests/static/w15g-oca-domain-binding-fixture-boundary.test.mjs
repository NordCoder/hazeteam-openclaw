import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const domainPackageDir = repoPath('packages', 'domain-lifeos');
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

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readJson(...segments) {
  return JSON.parse(readFileSync(repoPath(...segments), 'utf8'));
}

function readText(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
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

function walkFiles(startDir) {
  const files = [];

  function visit(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'dist' && entry.name !== 'node_modules') {
          visit(absolute);
        }
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

function domainSourceFiles() {
  return walkFiles(path.join(domainPackageDir, 'src')).filter((filePath) => filePath.endsWith('.ts'));
}

function assertNoMatchInDomainSource(pattern, message) {
  for (const sourceFile of domainSourceFiles()) {
    const relativePath = path.relative(repoRoot, sourceFile);
    const source = readFileSync(sourceFile, 'utf8');
    assert.doesNotMatch(source, pattern, `${relativePath} ${message}`);
  }
}

test('domain-lifeos is registered as a workspace package and lockfile link', () => {
  const rootPackage = readJson('package.json');
  const lockfile = readJson('package-lock.json');

  assert.deepEqual(rootPackage.workspaces, [
    'packages/domain-lifeos',
    'packages/openclaw-adapter',
    'packages/openclaw-plugin-runtime',
    'packages/openclaw-telegram-transport',
    'packages/openclaw-testkit',
    'packages/oca-wrapper',
  ]);
  assert.deepEqual(rootPackage.scripts, expectedRootScripts);

  assert.equal(lockfile.packages[''].workspaces.includes('packages/domain-lifeos'), true);
  assert.deepEqual(lockfile.packages['node_modules/@hazeteam/domain-lifeos'], {
    resolved: 'packages/domain-lifeos',
    link: true,
  });
  assert.deepEqual(lockfile.packages['packages/domain-lifeos'], {
    name: '@hazeteam/domain-lifeos',
    version: '0.0.0',
  });
});

test('domain-lifeos package skeleton exists', () => {
  assertDir('packages', 'domain-lifeos');
  assertFile('packages', 'domain-lifeos', 'README.md');
  assertFile('packages', 'domain-lifeos', 'package.json');
  assertFile('packages', 'domain-lifeos', 'tsconfig.json');
  assertFile('packages', 'domain-lifeos', 'src', 'index.ts');
  assertFile('packages', 'domain-lifeos', 'src', 'oca-agent-fixture.ts');
  assertFile('packages', 'domain-lifeos', 'tests', 'unit', 'oca-agent-fixture.test.mjs');

  const packageJson = readJson('packages', 'domain-lifeos', 'package.json');
  assert.equal(packageJson.name, '@hazeteam/domain-lifeos');
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.sideEffects, false);
  assert.equal(packageJson.exports['.'].import, './dist/index.js');
});

test('domain source has no provider, OCA SDK, private core, or internal wrapper imports', () => {
  assertNoMatchInDomainSource(/\bimport\s+[^;]*\bfrom\s+['"][^'"]*(?:telegram|telegraf|grammy|openclaw-sdk|oca-sdk|codex|opencode|provider)[^'"]*['"]/iu, 'imports provider or OCA SDK modules');
  assertNoMatchInDomainSource(/\bimport\s*\(\s*['"][^'"]*(?:telegram|telegraf|grammy|openclaw-sdk|oca-sdk|codex|opencode|provider)[^'"]*['"]\s*\)/iu, 'dynamically imports provider or OCA SDK modules');
  assertNoMatchInDomainSource(/\brequire\(\s*['"][^'"]*(?:telegram|telegraf|grammy|openclaw-sdk|oca-sdk|codex|opencode|provider)[^'"]*['"]\s*\)/iu, 'requires provider or OCA SDK modules');

  assertNoMatchInDomainSource(/from\s+['"]hazeteam-core\/(?:src|dist)(?:\/|['"])/u, 'imports private hazeteam-core paths');
  assertNoMatchInDomainSource(/import\(\s*['"]hazeteam-core\/(?:src|dist)(?:\/|['"])/u, 'dynamically imports private hazeteam-core paths');
  assertNoMatchInDomainSource(/require\(\s*['"]hazeteam-core\/(?:src|dist)(?:\/|['"])/u, 'requires private hazeteam-core paths');

  assertNoMatchInDomainSource(/from\s+['"][^'"]*packages\/oca-wrapper\/(?:src|dist)(?:\/|['"])/u, 'imports OCA wrapper internals');
  assertNoMatchInDomainSource(/from\s+['"][^'"]*@hazeteam\/oca-wrapper\/(?:src|dist)(?:\/|['"])/u, 'imports OCA wrapper internal package files');
  assertNoMatchInDomainSource(/from\s+['"][^'"]*(?:session-store|fake-client|operation-handlers|session-model|presentation)[^'"]*['"]/u, 'imports OCA mechanics modules');
});

test('domain source has no environment, filesystem, network, or runtime module access', () => {
  assertNoMatchInDomainSource(/\bprocess\.env\b/u, 'reads process.env');
  assertNoMatchInDomainSource(/\bimport\s+[^;]*\bfrom\s+['"]node:(?:fs|fs\/promises|path|child_process|net|http|https|dgram|tls|dns|worker_threads|cluster|process|timers|events)['"]/u, 'imports forbidden runtime modules');
  assertNoMatchInDomainSource(/\bimport\s+[^;]*\bfrom\s+['"](?:fs|fs\/promises|path|child_process|net|http|https|dgram|tls|dns|worker_threads|cluster|process|timers|events)['"]/u, 'imports forbidden runtime modules');
  assertNoMatchInDomainSource(/\brequire\(\s*['"](?:node:)?(?:fs|fs\/promises|path|child_process|net|http|https|dgram|tls|dns|worker_threads|cluster|process|timers|events)['"]\s*\)/u, 'requires forbidden runtime modules');
});

test('domain source has no event source, callback, timer, or runtime construction mechanics', () => {
  assertNoMatchInDomainSource(/\bfetch\s*\(/u, 'calls fetch');
  assertNoMatchInDomainSource(/\b(?:WebSocket|EventSource)\b/u, 'constructs event source objects');
  assertNoMatchInDomainSource(/\baddEventListener\s*\(/u, 'registers listeners');
  assertNoMatchInDomainSource(/\b(?:webhook|polling|listener)\b/iu, 'contains transport intake mechanics');
  assertNoMatchInDomainSource(/\b(?:setTimeout|setInterval|setImmediate|queueMicrotask)\s*\(/u, 'uses timer mechanics');
  assertNoMatchInDomainSource(/\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk|SDK)\b/u, 'constructs runtime clients');
});

test('domain fixture declares false ownership for OCA mechanics instead of implementing them', () => {
  const source = readText('packages', 'domain-lifeos', 'src', 'oca-agent-fixture.ts');

  assert.match(source, /domainOwnsSessionLifecycle:\s*false/u);
  assert.match(source, /domainOwnsSessionStore:\s*false/u);
  assert.match(source, /domainOwnsOperationHandlers:\s*false/u);
  assert.match(source, /domainOwnsApprovalExecution:\s*false/u);
  assert.match(source, /domainOwnsTopicPresentation:\s*false/u);
  assert.match(source, /providerSdkImports:\s*false/u);
  assert.match(source, /environmentReads:\s*false/u);
  assert.match(source, /filesystemReads:\s*false/u);
  assert.match(source, /networkCalls:\s*false/u);

  assertNoMatchInDomainSource(/\b(?:create|start|resume|transition|persist|execute|handle|render)Oca(?:Session|Store|Operation|Approval|Topic|Client)\b/u, 'implements OCA mechanics');
  assertNoMatchInDomainSource(/\b(?:SessionStore|FakeClient|OperationHandler|ApprovalExecutor|TopicUi)\b/u, 'declares OCA mechanics types');
});

test('root scripts and workflow topology stay bounded', () => {
  const rootPackage = readJson('package.json');
  const workflows = readdirSync(repoPath('.github', 'workflows')).filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'));
  const ciWorkflow = readText('.github', 'workflows', 'ci.yml');

  assert.deepEqual(rootPackage.scripts, expectedRootScripts);
  assert.deepEqual(workflows, ['ci.yml']);
  assert.match(ciWorkflow, /npm run check/u);
});
