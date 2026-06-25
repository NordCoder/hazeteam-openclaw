import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceSegments = Object.freeze(['packages', 'oca-wrapper', 'src', 'approval-runtime.ts']);
const sourceRelativePath = sourceSegments.join('/');

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

function approvalRuntimeSource() {
  return readText(...sourceSegments);
}

test('W15E approval runtime leaf file exists without package-root fan-in', () => {
  assertFile(...sourceSegments);
  assertFile('packages', 'oca-wrapper', 'tests', 'unit', 'approval-runtime.test.mjs');
  assertFile('tests', 'static', 'w15e-oca-approval-runtime-tool-integration-boundary.test.mjs');

  const indexSource = readText('packages', 'oca-wrapper', 'src', 'index.ts');
  assert.equal(indexSource.includes('approval-runtime'), false, 'W15H owns oca-wrapper package-root fan-in');
});

test('W15E approval runtime imports only safe local W15 leaf modules', () => {
  const source = approvalRuntimeSource();
  const importTargets = [...source.matchAll(/from\s+['"]([^'"]+)['"]/gu)].map((match) => match[1]);
  const allowedImports = Object.freeze(['./capability-descriptor.js', './session-model.js', './operation-handlers.js']);

  assert.notEqual(importTargets.length, 0, `${sourceRelativePath} should import only explicit safe leaves`);
  for (const target of importTargets) {
    assert.equal(allowedImports.includes(target), true, `${sourceRelativePath} imports only safe local W15A/W15B/W15D leaves`);
  }
});

test('W15E approval runtime excludes forbidden package and runtime imports', () => {
  const source = approvalRuntimeSource();

  assert.doesNotMatch(source, /from\s+['"].*session-store/u, `${sourceRelativePath} imports session store`);
  assert.doesNotMatch(source, /from\s+['"].*presentation/u, `${sourceRelativePath} imports presentation`);
  assert.doesNotMatch(source, /from\s+['"].*domain-lifeos/u, `${sourceRelativePath} imports domain-lifeos`);
  assert.doesNotMatch(source, /from\s+['"].*openclaw-plugin-runtime/u, `${sourceRelativePath} imports plugin runtime`);
  assert.doesNotMatch(source, /from\s+['"].*openclaw-adapter/u, `${sourceRelativePath} imports adapter`);
  assert.doesNotMatch(source, /from\s+['"].*openclaw-telegram-transport/u, `${sourceRelativePath} imports transport`);
  assert.doesNotMatch(source, /from\s+['"].*openclaw-testkit/u, `${sourceRelativePath} imports testkit`);
  assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/src(?:\/|['"])/u, `${sourceRelativePath} imports hazeteam-core/src`);
  assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u, `${sourceRelativePath} imports hazeteam-core/dist`);
  assert.doesNotMatch(source, /from\s+['"](?:openai|@openai\/|@anthropic\/|@modelcontextprotocol\/|oca|@openclaw\/oca|codex|@codex\/)/iu, `${sourceRelativePath} imports a provider or OCA SDK`);
  assert.doesNotMatch(source, /from\s+['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads|stream|url)['"]/u, `${sourceRelativePath} imports a filesystem, network, or runtime module`);
  assert.doesNotMatch(source, /import\(\s*['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads|stream|url)['"]\s*\)/u, `${sourceRelativePath} dynamically imports a filesystem, network, or runtime module`);
});

test('W15E approval runtime has no process, network, listener, timer, server, or client-constructor behavior', () => {
  const source = approvalRuntimeSource();

  assert.doesNotMatch(source, /process\s*\.\s*env/u, `${sourceRelativePath} reads process.env`);
  assert.doesNotMatch(source, /\bfetch\s*\(/u, `${sourceRelativePath} calls fetch`);
  assert.doesNotMatch(source, /\bWebSocket\b/u, `${sourceRelativePath} references WebSocket`);
  assert.doesNotMatch(source, /\bEventSource\b/u, `${sourceRelativePath} references EventSource`);
  assert.doesNotMatch(source, /\bset(?:Timeout|Interval)\s*\(/u, `${sourceRelativePath} creates a timer`);
  assert.doesNotMatch(source, /\baddEventListener\s*\(/u, `${sourceRelativePath} registers a listener`);
  assert.doesNotMatch(source, /\bcreateServer\s*\(/u, `${sourceRelativePath} creates a server`);
  assert.doesNotMatch(source, /\.listen\s*\(/u, `${sourceRelativePath} starts a listener`);
  assert.doesNotMatch(source, /\b(?:webhook|polling|listener)\b/iu, `${sourceRelativePath} includes runtime intake wording`);
  assert.doesNotMatch(source, /\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk)\b/u, `${sourceRelativePath} constructs a runtime client`);
  assert.doesNotMatch(source, /\bDate\s*\.\s*now\s*\(/u, `${sourceRelativePath} uses wall-clock time`);
  assert.doesNotMatch(source, /\bMath\s*\.\s*random\s*\(/u, `${sourceRelativePath} uses random values`);
});

test('W15E approval runtime does not implement approval token consumption, real OCA execution, credentials, sidecar, or deployment behavior', () => {
  const source = approvalRuntimeSource();

  assert.doesNotMatch(source, /\b(?:consumeApproval|consumeToken|tokenConsume|consume.*Token|verifyToken|approvalToken|callbackToken)\b/iu, `${sourceRelativePath} implements token consume behavior`);
  assert.doesNotMatch(source, /\b(?:realOca|productionOca|OcaRuntime|OcaClient|runOca|executeOca|realRuntime)\b/u, `${sourceRelativePath} implements real OCA runtime`);
  assert.doesNotMatch(source, /\b(?:loadCredential|credentialLoader|resolveSecret|secretHandle|vault|envSecret)\b/iu, `${sourceRelativePath} implements real credential loading`);
  assert.doesNotMatch(source, /\b(?:sidecar|deployment|deploy|healthEndpoint|migration|backup|restore)\b/iu, `${sourceRelativePath} implements sidecar or deployment behavior`);
});

test('W15E approval runtime public fields avoid unsafe names', () => {
  const source = approvalRuntimeSource();
  const forbiddenPublicFieldNames = [
    'token',
    'secret',
    'credential',
    'rawPayload',
    'providerPayload',
    'runtimePayload',
    'callbackData',
    'chatId',
    'threadId',
    'endpoint',
    'stack',
    'commandOutput',
    'rawLog',
    'rawDiff',
    'rawOutput',
    'path',
    'filePath',
    'repoPath',
    'workspacePath',
    'client',
    'clientHandle',
    'sdkClient',
    'processId',
  ];

  for (const fieldName of forbiddenPublicFieldNames) {
    const publicFieldPattern = new RegExp(`\\breadonly\\s+${fieldName}\\b|\\b${fieldName}\\s*:`, 'u');
    assert.doesNotMatch(source, publicFieldPattern, `${sourceRelativePath} exposes unsafe public field ${fieldName}`);
  }
});

test('W15E unit test imports built dist leaf modules and does not import source files directly', () => {
  const unitSource = readText('packages', 'oca-wrapper', 'tests', 'unit', 'approval-runtime.test.mjs');

  assert.match(unitSource, /from\s+['"]\.\.\/\.\.\/dist\/approval-runtime\.js['"]/u);
  assert.match(unitSource, /from\s+['"]\.\.\/\.\.\/dist\/operation-handlers\.js['"]/u);
  assert.doesNotMatch(unitSource, /from\s+['"]\.\.\/\.\.\/src\//u);
});
