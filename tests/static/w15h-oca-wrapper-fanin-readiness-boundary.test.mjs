import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const leafModules = Object.freeze([
  'capability-descriptor',
  'session-model',
  'session-store',
  'fake-client',
  'operation-handlers',
  'approval-runtime',
  'presentation',
]);

const priorW15BoundaryTests = Object.freeze([
  'w15a-oca-capability-descriptor-boundary.test.mjs',
  'w15b-oca-session-model-boundary.test.mjs',
  'w15c-oca-session-store-boundary.test.mjs',
  'w15d-oca-fake-client-operation-handlers-boundary.test.mjs',
  'w15e-oca-approval-runtime-tool-integration-boundary.test.mjs',
  'w15f-oca-presentation-topic-ui-boundary.test.mjs',
  'w15g-oca-domain-binding-fixture-boundary.test.mjs',
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function chars(codes) {
  return String.fromCharCode(...codes);
}

test('W15H package root index exists and only re-exports W15 leaf modules', () => {
  assertFile('packages', 'oca-wrapper', 'src', 'index.ts');

  const source = readText('packages', 'oca-wrapper', 'src', 'index.ts');
  const meaningfulLines = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  assert.equal(meaningfulLines.length, leafModules.length);
  for (const leafModule of leafModules) {
    assert.match(source, new RegExp(`export\\s+\\*\\s+from\\s+['"]\\./${escapeRegExp(leafModule)}\\.js['"];`, 'u'));
  }

  const exportedModules = [...source.matchAll(/export\s+\*\s+from\s+['"]\.\/([^'"]+)\.js['"];?/gu)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(exportedModules, [...leafModules].sort());

  for (const line of meaningfulLines) {
    assert.match(line, /^export\s+\*\s+from\s+['"]\.\/[a-z0-9-]+\.js['"];$/u);
  }
});

test('W15H package root index has no runtime side effects or forbidden imports', () => {
  const source = readText('packages', 'oca-wrapper', 'src', 'index.ts');

  const forbiddenPatterns = Object.freeze([
    /\bimport\b/u,
    /\brequire\s*\(/u,
    /\b(?:const|let|var|class|function)\b/u,
    /\bprocess\s*\.\s*env\b/u,
    /from\s+['"](?:node:)?(?:fs|fs\/promises|path|child_process|net|http|https|http2|dgram|tls|dns|worker_threads|cluster|process|timers|events)['"]/u,
    /from\s+['"][^'"]*(?:hazeteam-core\/(?:src|dist)|openclaw-sdk|oca-sdk|codex|opencode|telegram|telegraf|grammy|provider)[^'"]*['"]/iu,
    /\b(?:fetch|setTimeout|setInterval|setImmediate|queueMicrotask|addEventListener|createServer|consume|loadCredentials)\s*\(/u,
    /\b(?:WebSocket|EventSource)\b/u,
    /\.listen\s*\(/u,
    /\bDate\.now\s*\(/u,
    /\bMath\.random\s*\(/u,
    /\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk|SDK|Server)\b/u,
    /\bcreateInMemoryOcaSessionStore\s*\(/u,
    /\bcreateFakeOcaClient\s*\(/u,
    /\bhandleOcaOperation\s*\(/u,
    /\bcreateOcaApprovalRuntimeToolIntegration\s*\(/u,
    /\bhandleOcaApprovalRuntimeToolRequest\s*\(/u,
    /\b(?:sidecar|deployment|realRuntime|realClient|credential|secret)\b/iu,
  ]);

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern);
  }
});

test('W15H fan-in readiness test imports package root dist only', () => {
  assertFile('packages', 'oca-wrapper', 'tests', 'unit', 'fanin-readiness.test.mjs');

  const source = readText('packages', 'oca-wrapper', 'tests', 'unit', 'fanin-readiness.test.mjs');
  assert.match(source, /from\s+['"]\.\.\/\.\.\/dist\/index\.js['"]/u);
  assert.doesNotMatch(source, /from\s+['"]\.\.\/\.\.\/src(?:\/|['"])/u);
  assert.doesNotMatch(source, /from\s+['"]\.\.\/\.\.\/dist\/(?!index\.js['"])[^'"]+['"]/u);
  assert.doesNotMatch(source, /import\(\s*['"]\.\.\/\.\.\/src(?:\/|['"])/u);
});

test('W15H keeps earlier W15 boundary tests executable', () => {
  for (const filename of priorW15BoundaryTests) {
    assertFile('tests', 'static', filename);
    const source = readText('tests', 'static', filename);
    assert.doesNotMatch(source, /\btest\.(?:skip|only)\b/u, `${filename} should not disable or isolate tests`);
    assert.doesNotMatch(source, /\bskip\s*:\s*true\b/u, `${filename} should not mark tests as skipped`);
  }
});

test('W15H static test avoids unrelated topology locks', () => {
  const source = readText('tests', 'static', 'w15h-oca-wrapper-fanin-readiness-boundary.test.mjs');
  const unrelatedTopologyTerms = Object.freeze([
    chars([119, 111, 114, 107, 115, 112, 97, 99, 101, 115]),
    chars([112, 97, 99, 107, 97, 103, 101, 45, 108, 111, 99, 107]),
    chars([46, 103, 105, 116, 104, 117, 98]),
    chars([119, 111, 114, 107, 102, 108, 111, 119, 115]),
    chars([99, 105, 46, 121, 109, 108]),
  ]);

  for (const term of unrelatedTopologyTerms) {
    assert.equal(source.includes(term), false, `W15H static test should not freeze ${term}`);
  }
});
