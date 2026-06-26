import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateRealSmokeGate,
  isSafeRealSmokeGateReportJson,
} from '../../packages/openclaw-telegram-transport/dist/real-smoke-gate.js';

function fromCharCodes(codes) {
  return String.fromCharCode(...codes);
}

const SENSITIVE_REF = fromCharCodes([49, 50, 51, 52, 53, 54, 58, 65, 66, 67, 45, 112, 114, 105, 118, 97, 116, 101, 45, 118, 97, 108, 117, 101]);
const SENSITIVE_HEADER = fromCharCodes([66, 101, 97, 114, 101, 114, 32, 112, 114, 105, 118, 97, 116, 101, 45, 118, 97, 108, 117, 101]);
const SENSITIVE_ENDPOINT = fromCharCodes([104, 116, 116, 112, 115, 58, 47, 47, 112, 114, 111, 118, 105, 100, 101, 114, 46, 101, 120, 97, 109, 112, 108, 101, 47, 115, 109, 111, 107, 101]);
const SENSITIVE_PATH = fromCharCodes([47, 111, 112, 101, 114, 97, 116, 111, 114, 47, 115, 109, 111, 107, 101]);
const CHAT_FIELD = fromCharCodes([99, 104, 97, 116, 73, 100]);
const RAW_FIELD = fromCharCodes([114, 97, 119, 80, 97, 121, 108, 111, 97, 100]);
const ENDPOINT_FIELD = fromCharCodes([101, 110, 100, 112, 111, 105, 110, 116]);
const LOCAL_PATH_FIELD = fromCharCodes([108, 111, 99, 97, 108, 80, 97, 116, 104]);
const PROVIDER_OBJECT_MARKER = fromCharCodes([112, 114, 111, 118, 105, 100, 101, 114, 67, 108, 105, 101, 110, 116, 79, 98, 106, 101, 99, 116]);

const READY_CONFIG = Object.freeze({
  profile: 'real-smoke',
  providers: {
    telegram: {
      mode: 'real',
      credentialRef: ['secret', 'telegram', 'smoke-bot'].join(':'),
      transportRef: 'tg-channel:smoke-topic',
      sourceClass: 'injected',
    },
    openclaw: {
      mode: 'real',
      credentialRef: ['secret', 'openclaw', 'smoke-api'].join(':'),
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
  assert.equal(output.includes(SENSITIVE_REF), false);
  assert.equal(output.includes(SENSITIVE_HEADER), false);
  assert.equal(output.includes(SENSITIVE_ENDPOINT), false);
  assert.equal(output.includes(SENSITIVE_PATH), false);
  assert.equal(output.includes(CHAT_FIELD), false);
  assert.equal(output.includes(RAW_FIELD), false);
  assert.equal(output.includes(PROVIDER_OBJECT_MARKER), false);
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
            telegram: { mode: 'real', credentialRef: ['secret', 'telegram', 'smoke-bot'].join(':') },
            openclaw: { mode: 'real', credentialRef: ['secret', 'openclaw', 'smoke-api'].join(':') },
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
              credentialRef: ['secret', 'openclaw', 'smoke-api'].join(':'),
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
      blockedReason: 'business-attempt-failed-safe',
    },
    {
      name: 'failed-safe when unsafe output is detected',
      input: gate({
        attempt: {
          providerAckResult: 'provider-acknowledged',
          businessResult: 'business-succeeded',
          redactedFailureSummary: {
            [RAW_FIELD]: SENSITIVE_HEADER,
            [ENDPOINT_FIELD]: SENSITIVE_ENDPOINT,
            [CHAT_FIELD]: '1234567890',
            [LOCAL_PATH_FIELD]: SENSITIVE_PATH,
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
