import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageRootPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'index.ts');

function source() {
  return readFileSync(packageRootPath, 'utf8');
}

function explicitExportNames(text) {
  const names = [];
  const exportBlocks = text.matchAll(/\bexport(?:\s+type)?\s*\{([\s\S]*?)\}\s*from\s+['"][^'"]+['"]/gu);

  for (const block of exportBlocks) {
    for (const rawName of block[1].split(',')) {
      const name = rawName.trim().replace(/\s+as\s+.*$/u, '');
      if (name.length > 0) {
        names.push(name);
      }
    }
  }

  return names;
}

test('W14G package root exposes W14 transport fan-in modules and stays inert', () => {
  const text = source();

  for (const expected of [
    "from './config.js'",
    "from './secrets.js'",
    "from './channel-event-source.js'",
    "from './delivery-port.js'",
    "from './callback-handler-port.js'",
    "from './topic-command-router-port.js'",
    "from './real-smoke-gate.js'",
    'w14-real-transport-port-fan-in',
    'W14G',
    'productionReady: false',
    'defaultNetworkBehavior',
    'skipped-or-blocked',
    'parseTransportConfig',
    'normalizeChannelEventSourceInput',
    'createInjectedDeliveryPort',
    'processCallbackBoundary',
    'routeTopicCommand',
    'evaluateRealSmokeGate',
  ]) {
    assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  }

  for (const forbidden of [
    'export *',
    'fetch(',
    'WebSocket(',
    '.listen(',
    'setInterval(',
    'setTimeout(',
    'new Telegram',
    'new OpenClaw',
    'productionReady: true',
    'willCallRemote: true',
  ]) {
    assert.doesNotMatch(text, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  }
});

test('W14G package root has explicit W14B-F safe type fan-in', () => {
  const names = explicitExportNames(source());

  for (const expected of [
    'SafeChannelEventDto',
    'ChannelEventSourceNormalizeResult',
    'RenderedDeliveryRequest',
    'DeliveryPortResult',
    'SafeCallbackDescriptor',
    'CallbackBoundaryResult',
    'TopicCommandRouterResult',
    'RealSmokeGateReport',
  ]) {
    assert.ok(names.includes(expected), `package root should type-export ${expected}`);
  }
});

test('W14G package root fan-in exposes no unsafe public export names', () => {
  const names = explicitExportNames(source());
  const joinedNames = names.join('\n');
  const forbiddenNamePatterns = [
    /\bRaw(?:Payload|Provider|Delivery|Callback|Transport|Update|Request|Response|Body|Result|Object)\b/u,
    /\b(?:Provider|Runtime|Sdk|Telegram|OpenClaw)(?:Client|Bot|Api|Sdk|Object)\b/u,
    /\b(?:Secret|Credential|Token)(?:Value|Material|Body|Payload|Object)\b/u,
    /\b(?:Stack|Endpoint|WebhookUrl|ChatId|ThreadId)\b/u,
    /\b(?:ProcessEnv|EnvironmentDump|FilePath|RawPath)\b/u,
  ];

  for (const pattern of forbiddenNamePatterns) {
    assert.doesNotMatch(joinedNames, pattern, `package root exposes unsafe public export name ${pattern}`);
  }
});

test('W14G package root source has no provider, secret, config, path, stack, or runtime leaks', () => {
  const text = source();
  const forbiddenSourcePatterns = [
    /from\s+['"](?:telegraf|grammy|telegram|node:https?|node:net|node:tls|ws)(?:\/|['"])/u,
    /from\s+['"]@openclaw\//u,
    /from\s+['"]openclaw(?:\/|['"])/u,
    /hazeteam-core\/(?:src|dist)/u,
    /\bfetch\s*\(/u,
    /\bWebSocket\s*\(/u,
    /\bprocess\.env\b/u,
    /\bcreateServer\s*\(/u,
    /\.listen\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\bsetTimeout\s*\(/u,
    /registerWebhook/u,
    /startPolling/u,
    /\bnew\s+[A-Z][A-Za-z0-9]*(?:Client|Bot|Api|Sdk)\b/u,
    /\b(?:sendMessage|deliverMessage|processCallback|executeCommand)\s*\(/u,
    /\b(?:rawProviderResponse|rawDeliveryResponse|rawPayload|providerPayload|providerResponse|requestBody|responseBody)\b/u,
    /\b(?:stack|endpoint|chatId|threadId|tokenValue|secretValue|credentialValue)\b/u,
    /\b(?:providerClientObject|runtimeClientObject|sdkObject)\b/u,
  ];

  for (const pattern of forbiddenSourcePatterns) {
    assert.doesNotMatch(text, pattern, `package root source contains unsafe fan-in surface ${pattern}`);
  }
});
