import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceFiles = Object.freeze([
  ['packages', 'oca-wrapper', 'src', 'fake-client.ts'],
  ['packages', 'oca-wrapper', 'src', 'operation-handlers.ts'],
]);

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readText(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

function readSources() {
  return sourceFiles.map((segments) => ({
    relativePath: segments.join('/'),
    source: readText(...segments),
  }));
}

test('W15D fake client and operation handler leaf files exist', () => {
  assertFile('packages', 'oca-wrapper', 'src', 'fake-client.ts');
  assertFile('packages', 'oca-wrapper', 'src', 'operation-handlers.ts');
  assertFile('packages', 'oca-wrapper', 'tests', 'unit', 'fake-client-operation-handlers.test.mjs');
});

test('W15D source has no provider, private core, runtime, network, or filesystem imports', () => {
  for (const { relativePath, source } of readSources()) {
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
    assert.doesNotMatch(source, /\b(?:webhook|polling|listener)\b/iu, `${relativePath} includes runtime intake wording`);
    assert.doesNotMatch(source, /\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk)\b/u, `${relativePath} constructs a runtime client`);
  }
});

test('W15D source does not import session store, approval execution, topic UI, or domain binding surfaces', () => {
  for (const { relativePath, source } of readSources()) {
    assert.doesNotMatch(source, /from\s+['"].*session-store/u, `${relativePath} imports session store`);
    assert.doesNotMatch(source, /from\s+['"].*(?:approval-token|token-consume|consume-token|approval-store|runtime-tool-approval)/iu, `${relativePath} imports approval execution`);
    assert.doesNotMatch(source, /from\s+['"].*(?:topic-ui|topic-binding|domain-lifeos|domain-package|binding-fixture)/iu, `${relativePath} imports topic UI or domain binding`);
    assert.doesNotMatch(source, /\b(?:consumeApproval|consumeToken|executeApproval|approvalExecution)\b/u, `${relativePath} implements approval execution`);
    assert.doesNotMatch(source, /\b(?:topicUi|topicBinding|domainBinding|domainFixture|packageFanIn)\b/u, `${relativePath} implements future fan-in work`);
  }
});

test('W15D public fields avoid unsafe raw provider and runtime leak names', () => {
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

  for (const { relativePath, source } of readSources()) {
    for (const fieldName of forbiddenPublicFieldNames) {
      const publicFieldPattern = new RegExp(`\\breadonly\\s+${fieldName}\\b|\\b${fieldName}\\s*:`, 'u');
      assert.doesNotMatch(source, publicFieldPattern, `${relativePath} exposes unsafe public field ${fieldName}`);
    }
  }
});

test('W15D unit tests import built dist files and avoid source imports', () => {
  const testSource = readText('packages', 'oca-wrapper', 'tests', 'unit', 'fake-client-operation-handlers.test.mjs');

  assert.match(testSource, /from\s+['"]\.\.\/\.\.\/dist\/fake-client\.js['"]/u);
  assert.match(testSource, /from\s+['"]\.\.\/\.\.\/dist\/operation-handlers\.js['"]/u);
  assert.doesNotMatch(testSource, /from\s+['"]\.\.\/\.\.\/src\/fake-client/u);
  assert.doesNotMatch(testSource, /from\s+['"]\.\.\/\.\.\/src\/operation-handlers/u);
});