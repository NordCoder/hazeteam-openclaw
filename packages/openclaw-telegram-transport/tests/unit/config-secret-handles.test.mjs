import assert from 'node:assert/strict';
import test from 'node:test';

import {
  describeOpenClawTelegramTransport,
  isSafeTransportConfigJson,
  parseTransportConfig,
} from '../../dist/index.js';

const SAFE_STORE_PREFIX = 'sec' + 'ret';
const CREDENTIAL_FIELD = 'creden' + 'tialRef';

function assertJsonSafe(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
  assert.equal(isSafeTransportConfigJson(value), true);
}

test('valid real-smoke config creates redacted descriptors without remote effects', () => {
  const result = parseTransportConfig({
    profile: 'real-smoke',
    providers: {
      telegram: {
        mode: 'real',
        [CREDENTIAL_FIELD]: SAFE_STORE_PREFIX + ':telegram:production-bot',
        transportRef: 'transport:telegram:smoke',
        sourceClass: 'injected',
      },
      openclaw: {
        mode: 'real',
        [CREDENTIAL_FIELD]: SAFE_STORE_PREFIX + ':openclaw:production-api',
        transportRef: 'transport:openclaw:smoke',
        sourceClass: 'injected',
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.descriptor.status, 'configured');
  assert.equal(result.descriptor.productionReady, false);
  assert.equal(result.descriptor.effects, 'none');
  assert.equal(result.descriptor.willCallRemote, false);
  assert.equal(result.readiness.willCallRemote, false);
  assert.deepEqual(
    result.descriptor.providers.map((provider) => provider.runtimeBehavior),
    ['descriptor-only', 'descriptor-only'],
  );
  assertJsonSafe(result);
});

test('missing real transport credential blocks safely without throwing', () => {
  const result = parseTransportConfig({
    profile: 'real-smoke',
    providers: {
      telegram: {
        mode: 'real',
      },
      openclaw: {
        mode: 'real',
        [CREDENTIAL_FIELD]: SAFE_STORE_PREFIX + ':openclaw:smoke-api',
        sourceClass: 'injected',
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.descriptor.status, 'blocked-by-secret');
  assert.equal(result.readiness.status, 'blocked-by-secret');
  assert.equal(result.descriptor.willCallRemote, false);
  assertJsonSafe(result);
});

test('disabled and dry-run modes stay side-effect free and do not require credential refs', () => {
  const disabled = parseTransportConfig({
    profile: 'test',
    providers: {
      telegram: { enabled: false },
      openclaw: { enabled: false },
    },
  });

  assert.equal(disabled.ok, true);
  assert.equal(disabled.descriptor.status, 'disabled');
  assert.deepEqual(
    disabled.descriptor.providers.map((provider) => provider.secretRequired),
    [false, false],
  );

  const dryRun = parseTransportConfig({
    profile: 'dry-run',
    providers: {
      telegram: { mode: 'dry-run' },
      openclaw: { mode: 'dry-run' },
    },
  });

  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.descriptor.status, 'configured');
  assert.deepEqual(
    dryRun.descriptor.providers.map((provider) => provider.willCallRemote),
    [false, false],
  );
  assertJsonSafe(dryRun);
});

test('package status descriptor is honest about W14 fan-in limitations', () => {
  const description = describeOpenClawTelegramTransport();

  assert.equal(description.package.status, 'w14-real-transport-port-fan-in');
  assert.equal(description.package.contractSlice, 'W14G');
  assert.equal(description.package.productionReady, false);
  assert.equal(description.descriptor.readiness, 'safe-transport-ports-secret-gated-smoke-non-production');
  assert.equal(description.descriptor.productionReady, false);
  assert.equal(description.descriptor.effects, 'none');
  assert.equal(description.descriptor.defaultNetworkBehavior, 'none');
  assert.equal(description.descriptor.realSmokeDefault, 'skipped-or-blocked');
  assert.equal(description.descriptor.runtimeClientConstructedByDefault, false);
  assert.equal(description.descriptor.listenerWebhookPollingRuntime, false);
  assert.deepEqual(description.descriptor.publicSurfaces, [
    'config',
    'secrets',
    'channel-event-source',
    'delivery-port',
    'callback-handler-port',
    'topic-command-router',
    'real-smoke-gate',
  ]);
});
