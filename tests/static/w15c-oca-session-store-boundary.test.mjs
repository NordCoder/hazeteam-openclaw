import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function fromCodes(codes) {
  return String.fromCharCode(...codes);
}

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

function readSessionStoreSource() {
  return readText('packages', 'oca-wrapper', 'src', 'session-store.ts');
}

test('W15C session store leaf exists', () => {
  assertFile('packages', 'oca-wrapper', 'src', 'session-store.ts');
  assertFile('packages', 'oca-wrapper', 'tests', 'unit', 'session-store.test.mjs');
});

test('W15C session store imports only the W15B local session model leaf', () => {
  const source = readSessionStoreSource();
  const importSpecifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/gu)].map((match) => match[1]);

  assert.deepEqual([...new Set(importSpecifiers)], ['./session-model.js']);
  assert.doesNotMatch(source, /from\s+['"]\.\.\//u, 'session store must not import sibling packages');
});

test('W15C session store has no provider SDK, private core, unsafe runtime, or network behavior', () => {
  const source = readSessionStoreSource();

  assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/src(?:\/|['"])/u, 'session store imports hazeteam-core/src');
  assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u, 'session store imports hazeteam-core/dist');
  assert.doesNotMatch(source, /from\s+['"](?:openai|@openai\/|@anthropic\/|@modelcontextprotocol\/|oca|@openclaw\/oca|codex|@codex\/)/iu, 'session store imports a provider SDK');
  assert.doesNotMatch(source, /process\s*\.\s*env/u, 'session store reads process.env');
  assert.doesNotMatch(source, /from\s+['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads)['"]/u, 'session store imports a runtime module');
  assert.doesNotMatch(source, /import\(\s*['"](?:node:)?(?:fs|path|child_process|net|http|https|http2|dgram|tls|worker_threads)['"]\s*\)/u, 'session store dynamically imports a runtime module');
  assert.doesNotMatch(source, /\bfetch\s*\(/u, 'session store calls fetch');
  assert.doesNotMatch(source, /\bWebSocket\b/u, 'session store references WebSocket');
  assert.doesNotMatch(source, /\bEventSource\b/u, 'session store references EventSource');
  assert.doesNotMatch(source, /\bset(?:Timeout|Interval)\s*\(/u, 'session store creates a timer');
  assert.doesNotMatch(source, /\baddEventListener\s*\(/u, 'session store registers a listener');
  assert.doesNotMatch(source, /\bcreateServer\s*\(/u, 'session store creates a server');
  assert.doesNotMatch(source, /\.listen\s*\(/u, 'session store starts a listener');
  assert.doesNotMatch(source, /\b(?:webhook|polling|listener)\b/iu, 'session store includes runtime intake wording');
  assert.doesNotMatch(source, /\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk)\b/u, 'session store constructs a runtime client');
  assert.doesNotMatch(source, /\bDate\s*\.\s*now\s*\(/u, 'session store generates timestamps');
});

test('W15C session store is not durable storage, fake OCA client, operation handler, approval execution, topic UI, or domain binding', () => {
  const source = readSessionStoreSource();

  assert.match(source, /createInMemoryOcaSessionStore/u, 'session store should expose the in-memory fake store factory');
  assert.match(source, /new Map</u, 'session store may keep instance-local Map state');
  assert.doesNotMatch(source, /\b(?:postgres|sqlite|mysql|redis|prisma|typeorm|drizzle|knex|mongodb|database)\b/iu, 'session store adds durable storage behavior');
  assert.doesNotMatch(source, /\b(?:startSession|continueSession|sendInput|getOutput|cancelSession)\s*\(/u, 'session store implements OCA operation behavior');
  assert.doesNotMatch(source, /\b(?:approve|consumeApproval|executeApproved)\b/u, 'session store implements approval execution');
  assert.doesNotMatch(source, /\b(?:topic|telegram|render|button|card)\b/iu, 'session store implements presentation or topic UI');
  assert.doesNotMatch(source, /\b(?:domain|agentBinding|fixture)\b/u, 'session store implements domain binding fixture');
});

test('W15C session store source exposes no unsafe public field names', () => {
  const source = readSessionStoreSource();
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
    fromCodes([116, 111, 107, 101, 110]),
    fromCodes([115, 101, 99, 114, 101, 116]),
    fromCodes([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]),
    'stack',
    'endpoint',
    'commandOutput',
  ];

  for (const fieldName of forbiddenPublicFieldNames) {
    const publicFieldPattern = new RegExp(`\\breadonly\\s+${fieldName}\\b|\\b${fieldName}\\s*:`, 'u');
    assert.doesNotMatch(source, publicFieldPattern, `session-store.ts exposes unsafe public field ${fieldName}`);
  }
});

test('W15C unit tests import built session store and do not import source directly', () => {
  const testSource = readText('packages', 'oca-wrapper', 'tests', 'unit', 'session-store.test.mjs');

  assert.match(testSource, /from\s+['"]\.\.\/\.\.\/dist\/session-store\.js['"]/u);
  assert.match(testSource, /from\s+['"]\.\.\/\.\.\/dist\/session-model\.js['"]/u);
  assert.doesNotMatch(testSource, /from\s+['"]\.\.\/\.\.\/src\/session-store/u);
});