import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'topic-command-router-port.ts');
const packageRootPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'index.ts');
const unitTestPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'tests', 'unit', 'topic-command-router-port.test.mjs');

function readUtf8(filePath) {
  return readFileSync(filePath, 'utf8');
}

test('W14E topic command router exists and is exported by W14G fan-in', () => {
  assert.equal(existsSync(sourcePath), true, 'W14E source module should exist');
  assert.equal(existsSync(unitTestPath), true, 'W14E unit test should exist');

  const packageRootSource = readUtf8(packageRootPath);
  assert.match(packageRootSource, /from '\.\/topic-command-router-port\.js'/u);
  assert.match(packageRootSource, /routeTopicCommand/u);
});

test('W14E source has no provider SDK imports, private core imports, network, env, listener, provider, delivery, callback, or smoke behavior', () => {
  const source = readUtf8(sourcePath);
  const forbiddenImportPatterns = [
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

  assert.match(unitTestSource, /from\s+['"]\.\.\/\.\.\/dist\/topic-command-router-port\.js['"]/u);
  assert.doesNotMatch(unitTestSource, /from\s+['"]\.\.\/\.\.\/dist\/index\.js['"]/u);
});
