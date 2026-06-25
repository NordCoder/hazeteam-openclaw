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
