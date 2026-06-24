import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

function readSource(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function listFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else if (stats.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

const w9AcceptanceFile = repoPath('tests', 'acceptance', 'w9-secret-gated-real-smoke-suite.test.mjs');
const w9SmokeHelperFile = repoPath('tests', 'smoke', 'secret-gated-real-smoke-suite.mjs');
const w9StaticBoundaryFile = repoPath('tests', 'static', 'w9-real-smoke-boundary.test.mjs');
const w8AcceptanceFile = repoPath('tests', 'acceptance', 'w8-openclaw-secret-gated-smoke.test.mjs');
const w8StaticBoundaryFile = repoPath('tests', 'static', 'w8-openclaw-fanin-boundary.test.mjs');

const w9SmokeFiles = [w9AcceptanceFile, w9SmokeHelperFile];
const w9OwnedFiles = [...w9SmokeFiles, w9StaticBoundaryFile];
const adapterProductionRoot = repoPath('packages', 'openclaw-adapter', 'src');

function relativePath(filePath) {
  return path.relative(repoRoot, filePath);
}

test('W9 smoke harness files exist and stay test-only', () => {
  assertFile('tests', 'acceptance', 'w9-secret-gated-real-smoke-suite.test.mjs');
  assertFile('tests', 'smoke', 'secret-gated-real-smoke-suite.mjs');
  assertFile('tests', 'static', 'w9-real-smoke-boundary.test.mjs');

  for (const filePath of w9OwnedFiles) {
    assert.equal(relativePath(filePath).startsWith(`tests${path.sep}`), true, `${relativePath(filePath)} must be test-only`);
    assert.equal(relativePath(filePath).startsWith(`packages${path.sep}`), false, `${relativePath(filePath)} must not be production source`);
  }
});

test('W9 smoke suite leaves workspace and adapter package manifest surfaces unchanged', () => {
  const rootPackage = JSON.parse(readSource('package.json'));
  const adapterPackage = JSON.parse(readSource('packages', 'openclaw-adapter', 'package.json'));

  assert.deepEqual(rootPackage.workspaces, [
    'packages/openclaw-adapter',
    'packages/openclaw-testkit',
  ]);
  assert.deepEqual(Object.keys(adapterPackage.scripts).sort(), [
    'build',
    'clean',
    'test',
    'test:unit',
    'typecheck',
  ]);
});

test('adapter production source does not read W9 smoke settings or import W9 smoke helpers', () => {
  const forbiddenProductionPatterns = [
    /OPENCLAW_REAL_SMOKE_ENABLED/u,
    /OPENCLAW_REAL_SMOKE_ALLOW_NETWORK/u,
    /OPENCLAW_BOT_TOKEN/u,
    /OPENCLAW_CHANNEL_ID/u,
    /OPENCLAW_WORKSPACE_REF/u,
    /OPENCLAW_AGENT_REF/u,
    /tests\/smoke/u,
    /secret-gated-real-smoke-suite\.mjs/u,
  ];

  for (const filePath of listFiles(adapterProductionRoot)) {
    if (!filePath.endsWith('.ts')) {
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenProductionPatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath(filePath)} must not depend on W9 smoke harness settings/helpers`);
    }
  }
});

test('adapter production source does not import real network or SDK packages', () => {
  const forbiddenProductionImports = [
    /from\s+['"]node:(?:http|https|net|dgram|tls)['"]/u,
    /import\s*\(\s*['"]node:(?:http|https|net|dgram|tls)['"]\s*\)/u,
    /from\s+['"][^'"]*(?:openclaw-sdk|telegram-bot-api|telegraf|grammy)[^'"]*['"]/iu,
    /import\s*\(\s*['"][^'"]*(?:openclaw-sdk|telegram-bot-api|telegraf|grammy)[^'"]*['"]\s*\)/iu,
  ];

  for (const filePath of listFiles(adapterProductionRoot)) {
    if (!filePath.endsWith('.ts')) {
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenProductionImports) {
      assert.doesNotMatch(source, pattern, `${relativePath(filePath)} must not import real network or SDK packages`);
    }
  }
});

test('W9 smoke harness does not log settings, call network APIs, or import private core paths', () => {
  const forbiddenSmokePatterns = [
    /\bconsole\s*\./u,
    /\bprocess\.stdout\b/u,
    /\bprocess\.stderr\b/u,
    /\bfetch\s*\(/u,
    /from\s+['"]node:(?:http|https|net|dgram|tls)['"]/u,
    /import\s*\(\s*['"]node:(?:http|https|net|dgram|tls)['"]\s*\)/u,
    /\bcreateConnection\s*\(/u,
    /\bconnect\s*\(/u,
    /\bnew\s+WebSocket\b/u,
    /\bXMLHttpRequest\b/u,
    /from\s+['"][^'"]*(?:openclaw-sdk|telegram-bot-api|telegraf|grammy)[^'"]*['"]/iu,
    /import\s*\(\s*['"][^'"]*(?:openclaw-sdk|telegram-bot-api|telegraf|grammy)[^'"]*['"]\s*\)/iu,
    /hazeteam-core\/src/u,
    /hazeteam-core\/dist/u,
  ];

  for (const filePath of w9SmokeFiles) {
    const source = readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenSmokePatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath(filePath)} violates W9 smoke safety boundary`);
    }
  }
});

test('W9 smoke harness remains separate from W8 placeholder smoke test', () => {
  const w9AcceptanceSource = readFileSync(w9AcceptanceFile, 'utf8');
  const w9HelperSource = readFileSync(w9SmokeHelperFile, 'utf8');
  const w8AcceptanceSource = readFileSync(w8AcceptanceFile, 'utf8');

  assert.doesNotMatch(w9AcceptanceSource, /w8-openclaw-secret-gated-smoke\.test\.mjs/u);
  assert.doesNotMatch(w9HelperSource, /w8-openclaw-secret-gated-smoke\.test\.mjs/u);
  assert.doesNotMatch(w8AcceptanceSource, /w9-secret-gated-real-smoke-suite\.test\.mjs/u);
});

test('W8 smoke filename guard allows only the official W8 placeholder and W9A acceptance file', () => {
  const w8BoundarySource = readFileSync(w8StaticBoundaryFile, 'utf8');
  const allowedSetMatch = w8BoundarySource.match(
    /const allowedRealSmokeFiles = new Set\(\[\n(?<body>[\s\S]*?)\n\s*\]\);/u,
  );

  assert.notEqual(allowedSetMatch, null, 'W8 boundary should use a narrow allowedRealSmokeFiles Set');
  assert.match(w8BoundarySource, /suspiciousRealSmokePattern/u);
  assert.match(w8BoundarySource, /allowedRealSmokeFiles\.has\(filePath\)/u);

  const allowedFileNames = [...allowedSetMatch.groups.body.matchAll(
    /repoPath\('tests', 'acceptance', '([^']+)'\)/gu,
  )].map((match) => match[1]).sort();

  assert.deepEqual(allowedFileNames, [
    'w8-openclaw-secret-gated-smoke.test.mjs',
    'w9-secret-gated-real-smoke-suite.test.mjs',
  ].sort());
  assert.doesNotMatch(w8BoundarySource, /path\.basename\(filePath\)\s*\.includes/u);
  assert.doesNotMatch(w8BoundarySource, /filePath\.includes\(['"]w9/u);
});
