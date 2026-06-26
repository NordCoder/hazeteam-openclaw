import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateRealSmokeGate,
  isSafeRealSmokeGateReportJson,
} from '../../packages/openclaw-telegram-transport/dist/real-smoke-gate.js';

const READY_CONFIG = Object.freeze({
  profile: 'real-smoke',
  providers: {
    telegram: {
      mode: 'real',
      credentialRef: 'secret:telegram:smoke-bot',
      transportRef: 'tg-channel:smoke-topic',
      sourceClass: 'injected',
    },
    openclaw: {
      mode: 'real',
      credentialRef: 'secret:openclaw:smoke-api',
      transportRef: 'openclaw-profile:smoke',
      sourceClass: 'injected',
    },
  },
});

const BASE_GATE = Object.freeze({
  enabled: '1',
  profile: 'real-smoke',
  allowNetwork: '1',
  operatorAcknowledged: '1',
  operationClass: 'ephemeral-write',
  cleanupPolicy: 'manual',
  correlationRef: 'corr:w18c-smoke-matrix',
  providerPortStatus: 'available',
  config: READY_CONFIG,
});

function gate(overrides = {}) {
  return {
    ...BASE_GATE,
    ...overrides,
  };
}

function assertSafeReport(report) {
  const output = JSON.stringify(report);

  assert.equal(isSafeRealSmokeGateReportJson(report), true);
  assert.equal(report.willCallRemote, false);
  assert.equal(report.remoteAttempt, 'not-attempted');
  assert.equal(report.effects, 'none');
  assert.equal(output.includes('123456:ABC-private-token'), false);
  assert.equal(output.includes('Bearer private-token'), false);
  assert.equal(output.includes('https://provider.example/private'), false);
  assert.equal(output.includes('/private/operator/path'), false);
  assert.equal(output.includes('chatId'), false);
  assert.equal(output.includes('rawPayload'), false);
  assert.equal(output.includes('providerClientObject'), false);
}

test('W18C secret-gated smoke status matrix remains precise and no-leak safe', () => {
  const cases = [
    {
      name: 'skipped because not enabled',
      input: {},
      status: 'skipped',
      blockedReason: 'not-enabled',
    },
    {
      name: 'blocked by profile',
      input: { enabled: '1', profile: 'test', config: { profile: 'test' } },
      status: 'blocked-missing-profile',
      blockedReason: 'profile-not-real-smoke',
    },
    {
      name: 'blocked by closed network gate',
      input: gate({ allowNetwork: '0' }),
      status: 'blocked-network-gate-closed',
      blockedReason: 'network-gate-not-enabled',
    },
    {
      name: 'blocked by missing operator acknowledgement',
      input: gate({ operatorAcknowledged: '0' }),
      status: 'blocked-operator-ack-missing',
      blockedReason: 'operator-ack-missing',
    },
    {
      name: 'blocked by unsafe operation class',
      input: gate({ operationClass: 'sensitive-output' }),
      status: 'blocked-unsafe-operation-class',
      blockedReason: 'unsafe-operation-class',
    },
    {
      name: 'blocked by missing safe test refs',
      input: gate({
        config: {
          profile: 'real-smoke',
          providers: {
            telegram: { mode: 'real', credentialRef: 'secret:telegram:smoke-bot' },
            openclaw: { mode: 'real', credentialRef: 'secret:openclaw:smoke-api' },
          },
        },
      }),
      status: 'blocked-missing-safe-test-ref',
      blockedReason: 'missing-safe-test-ref',
    },
    {
      name: 'blocked by missing credential refs',
      input: gate({
        config: {
          profile: 'real-smoke',
          providers: {
            telegram: { mode: 'real', transportRef: 'tg-channel:smoke-topic' },
            openclaw: {
              mode: 'real',
              credentialRef: 'secret:openclaw:smoke-api',
              transportRef: 'openclaw-profile:smoke',
            },
          },
        },
      }),
      status: 'blocked-missing-secret',
      blockedReason: 'missing-or-invalid-credential-ref',
    },
    {
      name: 'blocked by missing injected provider port',
      input: gate({ providerPortStatus: 'missing' }),
      status: 'blocked-missing-port',
      blockedReason: 'provider-port-not-injected',
    },
    {
      name: 'ready-to-run with all gates open but no attempt',
      input: gate(),
      status: 'ready-to-run',
      blockedReason: 'none',
    },
    {
      name: 'passed only with provider ack and business success attempt',
      input: gate({
        attempt: {
          providerAckResult: 'provider-acknowledged',
          businessResult: 'business-succeeded',
        },
      }),
      status: 'passed',
      blockedReason: 'none',
    },
    {
      name: 'failed-safe when provider acknowledgement fails',
      input: gate({
        attempt: {
          providerAckResult: 'provider-rejected',
          businessResult: 'business-succeeded',
        },
      }),
      status: 'failed-safe',
      blockedReason: 'provider-acknowledgement-failed-safe',
    },
    {
      name: 'failed-safe when business success fails',
      input: gate({
        attempt: {
          providerAckResult: 'provider-acknowledged',
          businessResult: 'business-failed-safe',
        },
      }),
      status: 'failed-safe',
      blockedReason: 'business-success-failed-safe',
    },
    {
      name: 'failed-safe when unsafe output is detected',
      input: gate({
        attempt: {
          providerAckResult: 'provider-acknowledged',
          businessResult: 'business-succeeded',
          redactedFailureSummary: {
            rawPayload: 'Bearer private-token',
            endpoint: 'https://provider.example/private',
            chatId: '1234567890',
            localPath: '/private/operator/path',
          },
        },
      }),
      status: 'failed-safe',
      blockedReason: 'unsafe-output-detected',
    },
  ];

  for (const entry of cases) {
    const report = evaluateRealSmokeGate(entry.input);
    assert.equal(report.status, entry.status, entry.name);
    assert.equal(report.blockedReason, entry.blockedReason, entry.name);
    assertSafeReport(report);
  }
});

test('W18C ready-to-run is not pass and pass requires a supplied redacted attempt', () => {
  const ready = evaluateRealSmokeGate(gate());
  const passed = evaluateRealSmokeGate(gate({
    attempt: {
      providerAckResult: 'provider-acknowledged',
      businessResult: 'business-succeeded',
    },
  }));

  assert.equal(ready.status, 'ready-to-run');
  assert.equal(ready.attemptReport, 'not-supplied');
  assert.notEqual(ready.status, 'passed');

  assert.equal(passed.status, 'passed');
  assert.equal(passed.attemptReport, 'supplied-redacted');
  assert.equal(passed.providerAckResult, 'provider-acknowledged');
  assert.equal(passed.businessResult, 'business-succeeded');
  assertSafeReport(ready);
  assertSafeReport(passed);
});
