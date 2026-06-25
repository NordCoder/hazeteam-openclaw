import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readUtf8(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function readJson(...segments) {
  return JSON.parse(readUtf8(...segments));
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

const w14fFiles = [
  repoPath('packages', 'openclaw-telegram-transport', 'src', 'real-smoke-gate.ts'),
  repoPath('packages', 'openclaw-telegram-transport', 'tests', 'unit', 'real-smoke-gate.test.mjs'),
  repoPath('tests', 'smoke', 'w14f-secret-gated-real-transport-smoke.test.mjs'),
];

function readFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

test('W14F smoke files exist and are exported by W14G fan-in', () => {
  assertFile('packages', 'openclaw-telegram-transport', 'src', 'real-smoke-gate.ts');
  assertFile('packages', 'openclaw-telegram-transport', 'tests', 'unit', 'real-smoke-gate.test.mjs');
  assertFile('tests', 'smoke', 'w14f-secret-gated-real-transport-smoke.test.mjs');

  const packageRoot = readUtf8('packages', 'openclaw-telegram-transport', 'src', 'index.ts');
  const packageJson = readJson('packages', 'openclaw-telegram-transport', 'package.json');

  assert.match(packageRoot, /from '\.\/real-smoke-gate\.js'/u);
  assert.match(packageRoot, /evaluateRealSmokeGate/u);
  assert.deepEqual(packageJson.exports, {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    },
  });
});

test('W14F real smoke script is opt-in and absent from default gates', () => {
  const rootPackage = readJson('package.json');
  const smokeScript = rootPackage.scripts?.['test:real-smoke'];

  assert.equal(typeof smokeScript, 'string', 'missing opt-in real smoke script');
  assert.match(smokeScript, /w14f-secret-gated-real-transport-smoke\.test\.mjs/u);
  assert.match(smokeScript, /npm run build/u);
  assert.doesNotMatch(rootPackage.scripts.test, /real-smoke/u, 'default npm run test must not run real smoke');
  assert.doesNotMatch(rootPackage.scripts.check, /real-smoke/u, 'default npm run check must not run real smoke');
});

test('W14F production source has no environment edge, provider imports, clients, or network calls', () => {
  const source = readUtf8('packages', 'openclaw-telegram-transport', 'src', 'real-smoke-gate.ts');
  const forbiddenPatterns = [
    /from\s+['"]@openclaw\//u,
    /from\s+['"]openclaw(?:\/|['"])/u,
    /from\s+['"]telegraf(?:\/|['"])/u,
    /from\s+['"]grammy(?:\/|['"])/u,
    /from\s+['"]node:https?['"]/u,
    /from\s+['"]node:net['"]/u,
    /from\s+['"]node:tls['"]/u,
    /from\s+['"]ws['"]/u,
    /\bfetch\s*\(/u,
    /\bWebSocket\s*\(/u,
    /\bcreateServer\s*\(/u,
    /\.listen\s*\(/u,
    /\bprocess\.env\b/u,
    /new\s+[A-Za-z0-9_]*Client\b/u,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern, 'W14F source must stay side-effect free and provider-free');
  }
});

test('W14F source preserves missing-port and acknowledgement vocabulary', () => {
  const source = readUtf8('packages', 'openclaw-telegram-transport', 'src', 'real-smoke-gate.ts');

  for (const expected of [
    'blocked-by-missing-port',
    'ready-to-run',
    'provider-acknowledged',
    'business-succeeded',
    'business-failed-safe',
    'willCallRemote: false',
  ]) {
    assert.match(source, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  }

  for (const filePath of w14fFiles) {
    assert.equal(readFile(filePath).length > 0, true, `${path.relative(repoRoot, filePath)} should be non-empty`);
  }
});
