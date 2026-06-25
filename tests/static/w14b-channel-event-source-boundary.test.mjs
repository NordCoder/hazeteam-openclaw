import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'channel-event-source.ts');
const packageRootPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'index.ts');
const unitTestPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'tests', 'unit', 'channel-event-source-port.test.mjs');

function readUtf8(filePath) {
  return readFileSync(filePath, 'utf8');
}

test('W14B channel event source exists and is exported by W14G fan-in', () => {
  assert.equal(existsSync(sourcePath), true, 'W14B source module should exist');
  assert.equal(existsSync(unitTestPath), true, 'W14B unit test should exist');

  const packageRootSource = readUtf8(packageRootPath);
  assert.match(packageRootSource, /from '\.\/channel-event-source\.js'/u);
  assert.match(packageRootSource, /normalizeChannelEventSourceInput/u);
});

test('W14B source has no provider SDK imports, network calls, process env reads, or listeners', () => {
  const source = readUtf8(sourcePath);
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
    /\bstartPolling\b/u,
    /\bregisterWebhook\b/u,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern, 'W14B source performs forbidden provider/runtime work');
  }
});

test('W14B unit test imports only the built leaf module', () => {
  const unitTestSource = readUtf8(unitTestPath);

  assert.match(unitTestSource, /from\s+['"]\.\.\/\.\.\/dist\/channel-event-source\.js['"]/u);
  assert.doesNotMatch(unitTestSource, /from\s+['"]\.\.\/\.\.\/dist\/index\.js['"]/u);
});
