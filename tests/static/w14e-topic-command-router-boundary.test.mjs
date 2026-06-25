import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'topic-command-router-port.ts');
const packageRootPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'index.ts');
const unitTestPath = path.join(
  repoRoot,
  'packages',
  'openclaw-telegram-transport',
  'tests',
  'unit',
  'topic-command-router-port.test.mjs',
);

function readUtf8(filePath) {
  return readFileSync(filePath, 'utf8');
}

function exportedInterfaceBlock(source, interfaceName) {
  const match = new RegExp(`export\\s+interface\\s+${interfaceName}\\s+\\{[\\s\\S]*?\\n\\}`, 'u').exec(source);
  assert.ok(match, `missing exported interface ${interfaceName}`);
  return match[0];
}

test('W14E topic command router exists without package-root fan-in export', () => {
  assert.equal(existsSync(sourcePath), true, 'W14E source module should exist');
  assert.equal(existsSync(unitTestPath), true, 'W14E unit test should exist');

  const packageRootSource = readUtf8(packageRootPath);
  assert.doesNotMatch(
    packageRootSource,
    /topic-command-router-port/u,
    'W14E leaf must not export topic command router from package root before W14G fan-in',
  );
});

test('W14E source has no provider SDK imports, private core imports, network, env, listener, provider, delivery, callback, or smoke behavior', () => {
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
    /from\s+['"]\.\/delivery-port\.js['"]/u,
    /from\s+['"]\.\/callback-handler-port\.js['"]/u,
    /from\s+['"]\.\/real-smoke-gate\.js['"]/u,
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
    /\bdeliver\s*\(/u,
    /\backnowledge\s*\(/u,
    /\bexecute\s*\(/u,
    /\bsmoke\s*\(/iu,
  ];

  for (const pattern of forbiddenImportPatterns) {
    assert.doesNotMatch(source, pattern, 'W14E source imports a forbidden provider/private/runtime module');
  }

  for (const pattern of forbiddenRuntimePatterns) {
    assert.doesNotMatch(source, pattern, 'W14E source performs forbidden runtime/provider behavior');
  }
});

test('W14E public returned descriptors have no raw provider payload escape hatches', () => {
  const source = readUtf8(sourcePath);
  const publicOutputBlocks = [
    exportedInterfaceBlock(source, 'TopicCommandRoutingAuthority'),
    exportedInterfaceBlock(source, 'TopicCommandIntentDescriptor'),
    exportedInterfaceBlock(source, 'TopicCommandSafeHelpDescriptor'),
    exportedInterfaceBlock(source, 'TopicCommandRouterResult'),
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
      assert.doesNotMatch(block, pattern, 'W14E public output exposes an unsafe provider/runtime field');
    }
  }

  assert.doesNotMatch(source, /\.\.\.(?:channelEvent|input\.channelEvent)\b/u, 'W14E must not spread router input event into output');
});

test('W14E routing authority is channelRef plus chatRef plus threadRef and never topic title', () => {
  const source = readUtf8(sourcePath);

  assert.match(source, /'channelRef\+chatRef\+threadRef'/u, 'W14E should declare the routing authority tuple');
  assert.match(source, /key\.channelRef\s*===\s*authority\.channelRef/u, 'W14E must match channelRef');
  assert.match(source, /key\.chatRef\s*===\s*authority\.chatRef/u, 'W14E must match chatRef');
  assert.match(source, /key\.threadRef\s*===\s*authority\.threadRef/u, 'W14E must match threadRef');
  assert.doesNotMatch(source, /topicDisplay\.title/u, 'W14E must not route by topic display title');
  assert.doesNotMatch(source, /displayTitle\s*===/u, 'W14E must not route by display title');
  assert.doesNotMatch(source, /titleRoutingAuthority\s*:\s*true/u, 'W14E must not mark title as routing authority');
});

test('W14E unit test imports only the built leaf module', () => {
  const unitTestSource = readUtf8(unitTestPath);

  assert.match(
    unitTestSource,
    /from\s+['"]\.\.\/\.\.\/dist\/topic-command-router-port\.js['"]/u,
    'W14E unit test should import from ../../dist/topic-command-router-port.js',
  );
  assert.doesNotMatch(
    unitTestSource,
    /from\s+['"]\.\.\/\.\.\/dist\/index\.js['"]/u,
    'W14E unit test must not depend on package root fan-in export',
  );
});
