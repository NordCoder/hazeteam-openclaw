import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOpaqueTransportSecretHandle,
  createTransportSecretDescriptor,
  describeOpenClawTelegramTransport,
  describeTransportSecretHandle,
  isSafeTransportConfigJson,
  parseTransportConfig,
} from '../../dist/index.js';

function encoded(value) {
  return JSON.stringify(value);
}

function assertNoLeak(value, protectedTerms) {
  const output = encoded(value);
  assert.equal(typeof output, 'string');

  for (const term of protectedTerms) {
    assert.equal(output.includes(term), false, `public output leaked ${term}`);
  }
}

const PROTECTED_TERMS = [
  '123456:ABC-private-token',
  'Bearer private-token',
  'https://internal.service.local',
  '/Users/anna/private',
  'botToken',
  'apiKey',
  'rawConfig',
  'endpoint',
  'providerClientObject',
];

test('valid real config creates redacted descriptors without remote effects', () => {
  const result = parseTransportConfig({
    profile: 'real-smoke',
    providers: {
      telegram: {
        mode: 'real',
        credentialRef: 'secret:telegram:production-bot',
        sourceClass: 'secret-manager',
      },
      openclaw: {
        mode: 'real',
        credentialRef: 'secret:openclaw:production-api',
        sourceClass: 'secret-manager',
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
    result.descriptor.providers.map((provider) => provider.classification),
    ['real-configured', 'real-configured'],
  );
  assert.deepEqual(
    result.descriptor.providers.map((provider) => provider.secretDescriptor.status),
    ['configured-redacted', 'configured-redacted'],
  );
  assert.equal(isSafeTransportConfigJson(result.descriptor), true);
  assertNoLeak(result, PROTECTED_TERMS);
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
        credentialRef: 'secret:openclaw:smoke-api',
        sourceClass: 'injected',
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.descriptor.status, 'blocked-by-secret');
  assert.equal(result.readiness.status, 'blocked-by-secret');
  assert.equal(result.descriptor.willCallRemote, false);

  const telegram = result.descriptor.providers.find((provider) => provider.provider === 'telegram');
  assert.ok(telegram);
  assert.equal(telegram.mode, 'real');
  assert.equal(telegram.secretRequired, true);
  assert.equal(telegram.classification, 'missing-secret');
  assert.equal(telegram.readiness, 'blocked-by-secret');
  assert.equal(telegram.secretDescriptor.status, 'missing');
  assert.equal(telegram.providerClient, 'not-constructed');
  assertNoLeak(result, PROTECTED_TERMS);
});

test('disabled and dry-run modes stay side-effect free and do not require credentials', () => {
  const disabled = parseTransportConfig({
    profile: 'test',
    providers: {
      telegram: {
        enabled: false,
      },
      openclaw: {
        enabled: false,
      },
    },
  });

  assert.equal(disabled.ok, true);
  assert.equal(disabled.descriptor.status, 'disabled');
  assert.deepEqual(
    disabled.descriptor.providers.map((provider) => provider.readiness),
    ['disabled', 'disabled'],
  );
  assert.deepEqual(
    disabled.descriptor.providers.map((provider) => provider.secretRequired),
    [false, false],
  );

  const dryRun = parseTransportConfig({
    profile: 'dry-run',
    providers: {
      telegram: {
        mode: 'dry-run',
      },
      openclaw: {
        mode: 'dry-run',
      },
    },
  });

  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.descriptor.status, 'configured');
  assert.deepEqual(
    dryRun.descriptor.providers.map((provider) => provider.classification),
    ['dry-run', 'dry-run'],
  );
  assert.deepEqual(
    dryRun.descriptor.providers.map((provider) => provider.willCallRemote),
    [false, false],
  );
  assertNoLeak(dryRun, PROTECTED_TERMS);
});

test('unsafe caller input is redacted or rejected from public config output', () => {
  const result = parseTransportConfig({
    profile: 'dry-run',
    providers: {
      telegram: {
        mode: 'dry-run',
        credentialRef: '123456:ABC-private-token',
        transportRef: '/Users/anna/private/project',
        botToken: '123456:ABC-private-token',
        endpoint: 'https://internal.service.local',
        rawConfig: {
          providerClientObject: true,
        },
      },
      openclaw: {
        mode: 'dry-run',
        credentialRef: 'secret:openclaw:test-api',
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.descriptor.status, 'degraded');
  assert.ok(result.descriptor.issues.length >= 1);
  assert.equal(result.descriptor.providers[0].transportRef, 'transport:telegram:redacted');
  assert.equal(result.descriptor.providers[0].secretDescriptor.status, 'invalid');
  assert.equal(isSafeTransportConfigJson(result), true);
  assertNoLeak(result, PROTECTED_TERMS);
});

test('public descriptors are JSON serializable but opaque handles are not', () => {
  const secretResult = createTransportSecretDescriptor({
    provider: 'telegram',
    kind: 'telegram-bot-token',
    credentialRef: 'secret:telegram:unit-test-bot',
    sourceClass: 'injected',
  });
  const handle = createOpaqueTransportSecretHandle(secretResult.descriptor);

  assert.deepEqual(JSON.parse(JSON.stringify(secretResult.descriptor)), secretResult.descriptor);
  assert.throws(() => JSON.stringify(handle), /not JSON serializable/u);
  assert.equal(String(handle), '[opaque transport secret handle]');
  assert.deepEqual(describeTransportSecretHandle(handle), secretResult.descriptor);
});

test('package status descriptor is honest about W14A limitations', () => {
  const description = describeOpenClawTelegramTransport();

  assert.equal(description.package.status, 'config-secret-boundary');
  assert.equal(description.package.productionReady, false);
  assert.equal(description.descriptor.readiness, 'config-secret-boundary-only');
  assert.equal(description.descriptor.effects, 'none');
  assert.deepEqual(description.descriptor.publicSurfaces, ['config', 'secrets']);
  assertNoLeak(description, PROTECTED_TERMS);
});
