import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'channel-event-source.ts');
const packageRootPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'index.ts');
const unitTestPath = path.join(
  repoRoot,
  'packages',
  'openclaw-telegram-transport',
  'tests',
  'unit',
  'channel-event-source-port.test.mjs',
);

function readUtf8(filePath) {
  return readFileSync(filePath, 'utf8');
}

function exportedInterfaceBlock(source, interfaceName) {
  const match = new RegExp(`export\\s+interface\\s+${interfaceName}\\s+\\{[\\s\\S]*?\\n\\}`, 'u').exec(source);
  assert.ok(match, `missing exported interface ${interfaceName}`);
  return match[0];
}

test('W14B channel event source exists without package-root fan-in export', () => {
  assert.equal(existsSync(sourcePath), true, 'W14B source module should exist');
  assert.equal(existsSync(unitTestPath), true, 'W14B unit test should exist');

  const packageRootSource = readUtf8(packageRootPath);
  assert.doesNotMatch(
    packageRootSource,
    /channel-event-source/u,
    'W14B leaf must not export channel event source from package root before W14G fan-in',
  );
});

test('W14B source has no provider SDK imports, network calls, process env reads, or listeners', () => {
  const source = readUtf8(sourcePath);
  const forbiddenImportPatterns = [
    /from\s+['"]hazeteam-core\/src(?:\/|['"])/u,
    /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u,
    /import\(\s*['"]hazeteam-core\/src(?:\/|['"])/u,
    /import\(\s*['"]hazeteam-core\/dist(?:\/|['"])/u,
    /require\(\s*['"]hazeteam-core\/src(?:\/|['"])/u,
    /require\(\s*['"]hazeteam-core\/dist(?:\/|['"])/u,
    /from\s+['"]@openclaw\//u,
    /from\s+['"]openclaw(?:\/|['"])/u,
    /from\s+['"]telegraf(?:\/|['"])/u,
    /from\s+['"]grammy(?:\/|['"])/u,
    /from\s+['"]node:https?['"]/u,
    /from\s+['"]node:net['"]/u,
    /from\s+['"]node:tls['"]/u,
    /from\s+['"]ws['"]/u,
  ];
  const forbiddenRuntimePatterns = [
    /\bfetch\s*\(/u,
    /\bWebSocket\s*\(/u,
    /\bprocess\.env\b/u,
    /\bcreateServer\s*\(/u,
    /\.listen\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\bsetTimeout\s*\(/u,
    /\bstartPolling\b/u,
    /\bregisterWebhook\b/u,
    /\bwebhook\b/iu,
    /\bpolling\b/iu,
    /\blistener\b/iu,
    /\bdaemon\b/iu,
    /\bproviderClient\b/u,
  ];

  for (const pattern of forbiddenImportPatterns) {
    assert.doesNotMatch(source, pattern, 'W14B source imports a forbidden provider/private module');
  }

  for (const pattern of forbiddenRuntimePatterns) {
    assert.doesNotMatch(source, pattern, 'W14B source performs forbidden runtime/provider work');
  }
});

test('W14B public returned descriptors have no raw provider payload escape hatches', () => {
  const source = readUtf8(sourcePath);
  const publicOutputBlocks = [
    exportedInterfaceBlock(source, 'SafeChannelEventDto'),
    exportedInterfaceBlock(source, 'ChannelEventProviderAckDecision'),
    exportedInterfaceBlock(source, 'ChannelEventSourceNormalizeResult'),
    exportedInterfaceBlock(source, 'ChannelEventSourceTransportProjection'),
  ];
  const forbiddenPublicFieldPatterns = [
    /readonly\s+raw\b/iu,
    /readonly\s+raw[A-Z][A-Za-z0-9_]*\b/u,
    /readonly\s+providerPayload\b/u,
    /readonly\s+providerObject\b/u,
    /readonly\s+sdkObject\b/u,
    /readonly\s+stack\b/u,
    /readonly\s+requestBody\b/u,
    /readonly\s+responseBody\b/u,
    /readonly\s+fullLog\b/u,
    /readonly\s+internal\b/u,
  ];

  for (const block of publicOutputBlocks) {
    for (const pattern of forbiddenPublicFieldPatterns) {
      assert.doesNotMatch(block, pattern, 'W14B public output exposes an unsafe provider/runtime field');
    }
  }

  assert.doesNotMatch(source, /\.\.\.(?:eventRecord|input\.event|record)\b/u, 'W14B must not spread provider input into output');
});

test('W14B unit test imports only the built leaf module', () => {
  const unitTestSource = readUtf8(unitTestPath);

  assert.match(
    unitTestSource,
    /from\s+['"]\.\.\/\.\.\/dist\/channel-event-source\.js['"]/u,
    'W14B unit test should import from ../../dist/channel-event-source.js',
  );
  assert.doesNotMatch(
    unitTestSource,
    /from\s+['"]\.\.\/\.\.\/dist\/index\.js['"]/u,
    'W14B unit test must not depend on package root fan-in export',
  );
});
