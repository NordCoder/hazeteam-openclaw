import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const join = (...parts) => parts.join('');

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

function readPresentationSource() {
  return readText('packages', 'oca-wrapper', 'src', 'presentation.ts');
}

test('W15F presentation module and tests exist without package-root fan-in', () => {
  assertFile('packages', 'oca-wrapper', 'src', 'presentation.ts');
  assertFile('packages', 'oca-wrapper', 'tests', 'unit', 'presentation.test.mjs');
  const indexSource = readText('packages', 'oca-wrapper', 'src', 'index.ts');
  assert.equal(indexSource.includes('presentation'), false, 'W15H owns oca-wrapper package-root fan-in');
});

test('W15F presentation source has no provider, private core, transport, adapter, SDK, or runtime imports', () => {
  const source = readPresentationSource();
  assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/src(?:\/|['"])/u, 'presentation imports hazeteam-core/src');
  assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u, 'presentation imports hazeteam-core/dist');
  assert.doesNotMatch(source, /from\s+['"](?:openai|@openai\/|@anthropic\/|@modelcontextprotocol\/|oca|@openclaw\/oca|codex|@codex\/)/iu, 'presentation imports a provider or OCA SDK');
  assert.doesNotMatch(source, /from\s+['"][^'"]*(?:telegram|transport|adapter)[^'"]*['"]/iu, 'presentation imports Telegram, transport, or adapter code');
  assert.doesNotMatch(source, /process\s*\.\s*env/u, 'presentation reads process.env');
  assert.doesNotMatch(source, /from\s+['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads)['"]/u, 'presentation imports a runtime module');
  assert.doesNotMatch(source, /import\(\s*['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads)['"]\s*\)/u, 'presentation dynamically imports a runtime module');
});

test('W15F presentation source has no network, listener, webhook, polling, timer, or client construction behavior', () => {
  const source = readPresentationSource();
  assert.doesNotMatch(source, /\bfetch\s*\(/u, 'presentation calls fetch');
  assert.doesNotMatch(source, /\bWebSocket\b/u, 'presentation references WebSocket');
  assert.doesNotMatch(source, /\bEventSource\b/u, 'presentation references EventSource');
  assert.doesNotMatch(source, /\baddEventListener\s*\(/u, 'presentation registers a listener');
  assert.doesNotMatch(source, /\b(?:webhook|polling)\b/iu, 'presentation includes webhook or polling behavior');
  assert.doesNotMatch(source, /\bset(?:Timeout|Interval)\s*\(/u, 'presentation creates a timer');
  assert.doesNotMatch(source, /\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk)\b/u, 'presentation constructs a runtime client');
  assert.doesNotMatch(source, /\bcreateServer\s*\(/u, 'presentation creates a server');
  assert.doesNotMatch(source, /\.listen\s*\(/u, 'presentation starts a listener');
});

test('W15F presentation source does not implement operation execution or approval consume behavior', () => {
  const source = readPresentationSource();
  assert.doesNotMatch(source, /from\s+['"][^'"]*(?:session-store|fake-client|operation-handlers)[^'"]*['"]/iu, 'presentation imports sibling runtime phase files');
  assert.doesNotMatch(source, /\b(?:startSession|continueSession|sendInput|getStatus|getOutput|cancelSession|archiveSession)\s*\(/u, 'presentation implements session operation behavior');
  assert.doesNotMatch(source, /\b(?:executeOperation|executeAction|runOperation|invokeOperation)\s*\(/iu, 'presentation executes operations');
  assert.doesNotMatch(source, /\bconsume[A-Za-z0-9_]*Approval/u, 'presentation consumes approval state');
  assert.doesNotMatch(source, new RegExp('\\bconsume[A-Za-z0-9_]*' + join('To', 'ken'), 'u'), 'presentation consumes approval markers');
  assert.doesNotMatch(source, /\b(?:sessionStore|fakeClient|domainBinding|fixtureBinding)\b/u, 'presentation adds store, fake client, or domain binding behavior');
});

test('W15F presentation source exposes only safe descriptor refs and no unsafe public field names', () => {
  const source = readPresentationSource();
  const forbiddenPublicFieldNames = [
    join('raw', 'Log'),
    join('raw', 'Diff'),
    join('raw', 'Output'),
    join('raw', 'Path'),
    join('file', 'Path'),
    join('repo', 'Path'),
    join('workspace', 'Path'),
    join('provider', 'Payload'),
    join('runtime', 'Payload'),
    join('client', 'Handle'),
    join('sdk', 'Client'),
    join('process', 'Id'),
    join('to', 'ken'),
    join('sec', 'ret'),
    join('cred', 'ential'),
    join('sta', 'ck'),
    join('end', 'point'),
    join('command', 'Output'),
    'callbackData',
    'chatId',
    'threadId',
    'deliveryObject',
    'buttonPayload',
  ];

  for (const fieldName of forbiddenPublicFieldNames) {
    const publicFieldPattern = new RegExp(`\\breadonly\\s+${fieldName}\\b|\\b${fieldName}\\s*:`, 'u');
    assert.doesNotMatch(source, publicFieldPattern, `presentation.ts exposes unsafe public field ${fieldName}`);
  }

  assert.match(source, /readonly\s+sessionRef\b/u);
  assert.match(source, /readonly\s+outputRef\b/u);
  assert.match(source, /readonly\s+diffRef\b/u);
  assert.match(source, /readonly\s+artifactRefs\b/u);
  assert.match(source, /readonly\s+reviewRef\b/u);
  assert.match(source, /readonly\s+actionRef\b/u);
});

test('W15F unit tests import built presentation module only', () => {
  const testSource = readText('packages', 'oca-wrapper', 'tests', 'unit', 'presentation.test.mjs');
  assert.match(testSource, /from\s+['"]\.\.\/\.\.\/dist\/presentation\.js['"]/u);
  assert.doesNotMatch(testSource, /from\s+['"]\.\.\/\.\.\/src\/presentation/u);
});
