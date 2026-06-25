import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'callback-handler-port.ts');
const unitTestPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'tests', 'unit', 'callback-handler-port.test.mjs');
const packageRootPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'index.ts');

function readUtf8(...segments) {
  return readFileSync(path.join(repoRoot, ...segments), 'utf8');
}

test('W14D callback handler port remains a safe leaf and is exported by W14G fan-in', () => {
  assert.equal(existsSync(sourcePath), true, 'W14D source module should exist');
  assert.equal(existsSync(unitTestPath), true, 'W14D unit test should exist');

  const packageRoot = readFileSync(packageRootPath, 'utf8');
  assert.match(packageRoot, /from '\.\/callback-handler-port\.js'/u);
  assert.match(packageRoot, /processCallbackBoundary/u);
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

test('W14D tests cover permission-before-consume and no-leak behavior', () => {
  const source = readFileSync(sourcePath, 'utf8');
  const unitTest = readFileSync(unitTestPath, 'utf8');
  const checkIndex = source.indexOf('checkPermission');
  const consumeIndex = source.indexOf('consumeToken');

  assert.notEqual(checkIndex, -1, 'permission port should be present');
  assert.notEqual(consumeIndex, -1, 'consume port should be present');
  assert.ok(checkIndex < consumeIndex, 'permission check must appear before consume in the API shape');
  assert.match(unitTest, /permission-denied/u);
  assert.match(unitTest, /duplicate-safe/u);
  assert.match(unitTest, /acknowledgesBusinessSuccess, false/u);
  assert.match(unitTest, /assertNoLeak/u);
});
