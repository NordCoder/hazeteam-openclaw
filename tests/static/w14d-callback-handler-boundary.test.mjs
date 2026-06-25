import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'callback-handler-port.ts');
const unitTestPath = path.join(
  repoRoot,
  'packages',
  'openclaw-telegram-transport',
  'tests',
  'unit',
  'callback-handler-port.test.mjs',
);

function readUtf8(...segments) {
  return readFileSync(path.join(repoRoot, ...segments), 'utf8');
}

function readJson(...segments) {
  return JSON.parse(readUtf8(...segments));
}

test('W14D callback handler port remains a leaf module and package root is untouched', () => {
  assert.equal(existsSync(sourcePath), true, 'W14D source module should exist');
  assert.equal(existsSync(unitTestPath), true, 'W14D unit test should exist');

  const packageJson = readJson('packages', 'openclaw-telegram-transport', 'package.json');
  const packageRoot = readUtf8('packages', 'openclaw-telegram-transport', 'src', 'index.ts');

  assert.deepEqual(packageJson.exports, {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    },
  });
  assert.doesNotMatch(packageRoot, /callback-handler-port/u, 'W14D must not fan into the package root');
});

test('W14D production source has no provider SDK, network, env, or listener behavior', () => {
  const source = readFileSync(sourcePath, 'utf8');
  const forbiddenPatterns = [
    /from\s+['"]hazeteam-core\/src(?:\/|['"])/u,
    /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u,
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
    /\bprocess\.env\b/u,
    /\bcreateServer\s*\(/u,
    /\.listen\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\bsetTimeout\s*\(/u,
    /registerWebhook/u,
    /startPolling/u,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern, `callback port source matched forbidden pattern ${pattern}`);
  }
});

test('W14D public source avoids raw callback public fields and provider object escape hatches', () => {
  const source = readFileSync(sourcePath, 'utf8');
  const forbiddenPublicFields = [
    'rawPayload',
    'rawCallbackPayload',
    'rawCallback',
    'callbackPayload',
    'providerObject',
    'sdkObject',
    'requestBody',
    'responseBody',
    'stack',
    'providerClientObject',
  ];

  for (const field of forbiddenPublicFields) {
    assert.doesNotMatch(source, new RegExp(`\\b${field}\\b`, 'u'), `forbidden public field ${field} appeared`);
  }
});

test('W14D tests cover permission-before-token-consume and no-leak behavior', () => {
  const source = readFileSync(sourcePath, 'utf8');
  const unitTest = readFileSync(unitTestPath, 'utf8');
  const checkIndex = source.indexOf('checkPermission');
  const consumeIndex = source.indexOf('consumeToken');

  assert.notEqual(checkIndex, -1, 'permission port should be present');
  assert.notEqual(consumeIndex, -1, 'token consume port should be present');
  assert.ok(checkIndex < consumeIndex, 'permission check must appear before token consume in the API shape');
  assert.match(unitTest, /token consume is skipped when permission is denied/u);
  assert.match(unitTest, /permission-denied/u);
  assert.match(unitTest, /duplicate-safe/u);
  assert.match(unitTest, /acknowledgesBusinessSuccess, false/u);
  assert.match(unitTest, /assertNoLeak/u);
});
