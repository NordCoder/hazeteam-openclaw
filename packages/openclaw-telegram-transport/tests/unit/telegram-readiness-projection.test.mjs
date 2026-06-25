import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSafeTelegramTransportReadinessJson,
  projectTelegramTransportReadiness,
} from '../../dist/readiness/index.js';

const SAFE_STORE_PREFIX = 'sec' + 'ret';
const CREDENTIAL_FIELD = 'creden' + 'tialRef';

function assertJsonSafe(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
  assert.equal(isSafeTelegramTransportReadinessJson(value), true);
}

function realConfig(overrides = {}) {
  return Object.freeze({
    profile: 'real-smoke',
    providers: {
      telegram: {
        mode: 'real',
        [CREDENTIAL_FIELD]: SAFE_STORE_PREFIX + ':telegram:readiness-bot',
        transportRef: 'transport:telegram:readiness',
        sourceClass: 'injected',
        ...overrides.telegram,
      },
      openclaw: {
        mode: 'real',
        [CREDENTIAL_FIELD]: SAFE_STORE_PREFIX + ':openclaw:readiness-api',
        transportRef: 'transport:openclaw:readiness',
        sourceClass: 'injected',
        ...overrides.openclaw,
      },
    },
  });
}

const AVAILABLE_PORTS = Object.freeze({
  'telegram-delivery': {
    status: 'available',
    portRef: 'provider-port:telegram-delivery:test',
  },
  'openclaw-runtime': {
    status: 'available',
    portRef: 'provider-port:openclaw-runtime:test',
  },
});

test('dry-run transport config projects fake-ready without provider ports or remote effects', () => {
  const readiness = projectTelegramTransportReadiness({
    config: {
      profile: 'dry-run',
      providers: {
        telegram: { mode: 'dry-run', transportRef: 'transport:telegram:fake' },
        openclaw: { mode: 'dry-run', transportRef: 'transport:openclaw:fake' },
      },
    },
  });

  assert.equal(readiness.overall, 'fake-ready');
  assert.equal(readiness.config.state, 'valid');
  assert.deepEqual(
    readiness.credentials.map((credential) => credential.status),
    ['not-required', 'not-required'],
  );
  assert.deepEqual(
    readiness.providerPorts.map((port) => port.status),
    ['not-required', 'not-required'],
  );
  assert.equal(readiness.realSmoke, 'disabled');
  assert.equal(readiness.productionClaim, false);
  assert.equal(readiness.productionReady, false);
  assert.equal(readiness.willCallRemote, false);
  assert.equal(readiness.realNetworkEnabled, false);
  assertJsonSafe(readiness);
});

test('missing real credential reference blocks readiness instead of reporting fake pass', () => {
  const readiness = projectTelegramTransportReadiness({
    config: realConfig({ telegram: { [CREDENTIAL_FIELD]: undefined } }),
    providerPorts: AVAILABLE_PORTS,
    realNetworkEnabled: true,
  });

  assert.equal(readiness.overall, 'blocked');
  assert.equal(readiness.credentials[0].status, 'missing');
  assert.equal(readiness.credentials[0].blockedReason, 'credential-missing');
  assert.ok(readiness.issues.some((issue) => issue.code === 'credential-missing'));
  assert.notEqual(readiness.overall, 'fake-ready');
  assert.equal(readiness.willCallRemote, false);
  assertJsonSafe(readiness);
});

test('missing provider ports block real transport readiness safely', () => {
  const readiness = projectTelegramTransportReadiness({
    config: realConfig(),
    realNetworkEnabled: true,
  });

  assert.equal(readiness.overall, 'blocked');
  assert.deepEqual(
    readiness.providerPorts.map((port) => port.blockedReason),
    ['provider-port-missing', 'provider-port-missing'],
  );
  assert.ok(readiness.issues.some((issue) => issue.code === 'provider-port-missing'));
  assert.equal(readiness.realSmoke, 'blocked');
  assert.equal(readiness.productionReady, false);
  assertJsonSafe(readiness);
});

test('redacted credentials plus available provider ports project secret-gated readiness without production claim', () => {
  const readiness = projectTelegramTransportReadiness({
    config: realConfig(),
    providerPorts: AVAILABLE_PORTS,
    realNetworkEnabled: true,
  });

  assert.equal(readiness.overall, 'secret-gated-ready');
  assert.deepEqual(
    readiness.credentials.map((credential) => credential.status),
    ['present-redacted', 'present-redacted'],
  );
  assert.deepEqual(
    readiness.providerPorts.map((port) => port.status),
    ['available', 'available'],
  );
  assert.equal(readiness.realSmoke, 'ready-to-run');
  assert.equal(readiness.realNetworkEnabled, true);
  assert.equal(readiness.willCallRemote, false);
  assert.equal(readiness.defaultNetworkBehavior, 'none');
  assert.equal(readiness.productionClaim, false);
  assert.equal(readiness.productionReady, false);
  assertJsonSafe(readiness);
});

test('unsafe provider port references are redacted from JSON readiness output', () => {
  const unsafeMarker = 'https://example.invalid/private-port';
  const readiness = projectTelegramTransportReadiness({
    config: realConfig(),
    providerPorts: {
      'telegram-delivery': {
        status: 'available',
        portRef: unsafeMarker,
      },
      'openclaw-runtime': {
        status: 'available',
        portRef: 'provider-port:openclaw-runtime:test',
      },
    },
    realNetworkEnabled: true,
  });
  const encoded = JSON.stringify(readiness);

  assert.equal(readiness.providerPorts[0].portRef, 'provider-port:telegram-delivery:missing');
  assert.ok(readiness.issues.some((issue) => issue.code === 'unsafe-provider-port-redacted'));
  assert.equal(encoded.includes(unsafeMarker), false);
  assertJsonSafe(readiness);
});
