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

function fromCharCodes(codes) {
  return String.fromCharCode(...codes);
}

const w14fFiles = [
  repoPath('packages', 'openclaw-telegram-transport', 'src', 'real-smoke-gate.ts'),
  repoPath('packages', 'openclaw-telegram-transport', 'tests', 'unit', 'real-smoke-gate.test.mjs'),
  repoPath('tests', 'smoke', 'w14f-secret-gated-real-transport-smoke.test.mjs'),
];

function readFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

test('W14F smoke files exist without package root export fan-in', () => {
  assertFile('packages', 'openclaw-telegram-transport', 'src', 'real-smoke-gate.ts');
  assertFile('packages', 'openclaw-telegram-transport', 'tests', 'unit', 'real-smoke-gate.test.mjs');
  assertFile('tests', 'smoke', 'w14f-secret-gated-real-transport-smoke.test.mjs');

  const packageRoot = readUtf8('packages', 'openclaw-telegram-transport', 'src', 'index.ts');
  const packageJson = readJson('packages', 'openclaw-telegram-transport', 'package.json');

  assert.doesNotMatch(packageRoot, /real-smoke-gate/u, 'W14F must not add package root export fan-in');
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
  assert.doesNotMatch(rootPackage.scripts.check, /test:real-smoke/u, 'default check must not call opt-in smoke script');
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

test('only the explicit smoke test file reads process environment data', () => {
  const source = readUtf8('packages', 'openclaw-telegram-transport', 'src', 'real-smoke-gate.ts');
  const unit = readUtf8('packages', 'openclaw-telegram-transport', 'tests', 'unit', 'real-smoke-gate.test.mjs');
  const smoke = readUtf8('tests', 'smoke', 'w14f-secret-gated-real-transport-smoke.test.mjs');

  assert.doesNotMatch(source, /\bprocess\.env\b/u);
  assert.doesNotMatch(unit, /\bprocess\.env\b/u);
  assert.match(smoke, /createRealSmokeGateInputFromEnvironment\(process\.env\)/u);
  assert.doesNotMatch(smoke, /JSON\.stringify\(process\.env\)/u);
  assert.doesNotMatch(smoke, /console\.log\(process\.env\)/u);
});

test('W14F files do not contain protected assignments or private connection literals', () => {
  const protectedAssignmentTerms = [
    [84, 69, 76, 69, 71, 82, 65, 77, 95, 66, 79, 84, 95, 84, 79, 75, 69, 78, 61],
    [79, 80, 69, 78, 67, 76, 65, 87, 95, 65, 80, 73, 95, 75, 69, 89, 61],
    [66, 79, 84, 95, 84, 79, 75, 69, 78, 61],
    [65, 80, 73, 95, 75, 69, 89, 61],
    [83, 69, 67, 82, 69, 84, 61],
  ].map(fromCharCodes);
  const privateConnectionPatterns = [
    /https?:\/\//u,
    /postgres:\/\//u,
    /redis:\/\//u,
    /mongodb:\/\//u,
  ];

  for (const filePath of w14fFiles) {
    const source = readFile(filePath);
    for (const term of protectedAssignmentTerms) {
      assert.equal(source.includes(term), false, `${path.relative(repoRoot, filePath)} contains a protected assignment marker`);
    }
    for (const pattern of privateConnectionPatterns) {
      assert.doesNotMatch(source, pattern, `${path.relative(repoRoot, filePath)} contains a private connection literal`);
    }
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
});
