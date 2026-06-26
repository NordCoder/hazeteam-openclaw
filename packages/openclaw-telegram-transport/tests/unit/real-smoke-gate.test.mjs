import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRealSmokeGateInputFromEnvironment,
  evaluateRealSmokeGate,
  isSafeRealSmokeGateReportJson,
  REAL_SMOKE_ENVIRONMENT_KEYS,
} from '../../dist/real-smoke-gate.js';

function encoded(value) {
  return JSON.stringify(value);
}

function fromCharCodes(codes) {
  return String.fromCharCode(...codes);
}

function assertNoLeak(value, protectedTerms) {
  const output = encoded(value);
  assert.equal(typeof output, 'string');
  assert.equal(isSafeRealSmokeGateReportJson(value), true);

  for (const term of protectedTerms) {
    assert.equal(output.includes(term), false, `real smoke output leaked marker ${term.length}`);
  }
}

const SENSITIVE_REF = fromCharCodes([49, 50, 51, 52, 53, 54, 58, 65, 66, 67, 45, 112, 114, 105, 118, 97, 116, 101, 45, 118, 97, 108, 117, 101]);
const SENSITIVE_HEADER = fromCharCodes([66, 101, 97, 114, 101, 114, 32, 112, 114, 105, 118, 97, 116, 101, 45, 118, 97, 108, 117, 101]);
const PROVIDER_OBJECT_MARKER = fromCharCodes([112, 114, 111, 118, 105, 100, 101, 114, 67, 108, 105, 101, 110, 116, 79, 98, 106, 101, 99, 116]);
const PROCESS_ENV_MARKER = fromCharCodes([112, 114, 111, 99, 101, 115, 115, 46, 101, 110, 118]);
const SENSITIVE_ENDPOINT = fromCharCodes([104, 116, 116, 112, 115, 58, 47, 47, 112, 114, 111, 118, 105, 100, 101, 114, 46, 101, 120, 97, 109, 112, 108, 101, 47, 115, 109, 111, 107, 101]);
const SENSITIVE_PATH = fromCharCodes([47, 111, 112, 101, 114, 97, 116, 111, 114, 47, 115, 109, 111, 107, 101]);
const RAW_FIELD = fromCharCodes([114, 97, 119, 80, 97, 121, 108, 111, 97, 100]);
const ENDPOINT_FIELD = fromCharCodes([101, 110, 100, 112, 111, 105, 110, 116]);
const CHAT_FIELD = fromCharCodes([99, 104, 97, 116, 73, 100]);
const LOCAL_PATH_FIELD = fromCharCodes([108, 111, 99, 97, 108, 80, 97, 116, 104]);

const PROTECTED_TERMS = [
  SENSITIVE_REF,
  SENSITIVE_HEADER,
  PROVIDER_OBJECT_MARKER,
  PROCESS_ENV_MARKER,
  CHAT_FIELD,
  SENSITIVE_ENDPOINT,
  SENSITIVE_PATH,
  RAW_FIELD,
];

const READY_CONFIG = Object.freeze({
  profile: 'real-smoke',
  providers: {
    telegram: {
      mode: 'real',
      credentialRef: ['secret', 'telegram', 'smoke-bot'].join(':'),
      transportRef: 'tg-channel:smoke-topic',
      sourceClass: 'env',
    },
    openclaw: {
      mode: 'real',
      credentialRef: ['secret', 'openclaw', 'smoke-api'].join(':'),
      transportRef: 'openclaw-profile:smoke',
      sourceClass: 'env',
    },
  },
});

function enabledGate(overrides = {}) {
  return {
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    operatorAcknowledged: '1',
    operationClass: 'ephemeral-write',
    cleanupPolicy: 'manual',
    correlationRef: 'corr:w18c-smoke-0001',
    config: READY_CONFIG,
    ...overrides,
  };
}

test('default gate is skipped and side-effect free', () => {
  const report = evaluateRealSmokeGate();

  assert.equal(report.descriptorVersion, 'w18c');
  assert.equal(report.status, 'skipped');
  assert.equal(report.blockedReason, 'not-enabled');
  assert.equal(report.willCallRemote, false);
  assert.equal(report.remoteAttempt, 'not-attempted');
  assert.equal(report.providerAckResult, 'not-attempted');
  assert.equal(report.businessResult, 'not-attempted');
  assert.equal(report.attemptReport, 'not-supplied');
  assert.equal(report.noLeakResult, 'passed');
  assert.equal(report.effects, 'none');
  assertNoLeak(report, PROTECTED_TERMS);
});

test('gate reports precise blocked status for profile, network, and operator gates', () => {
  const wrongProfile = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'test',
    config: { profile: 'test' },
  });

  assert.equal(wrongProfile.status, 'blocked-missing-profile');
  assert.equal(wrongProfile.blockedReason, 'profile-not-real-smoke');
  assert.equal(wrongProfile.willCallRemote, false);

  const missingNetworkGate = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    config: READY_CONFIG,
  });

  assert.equal(missingNetworkGate.status, 'blocked-network-gate-closed');
  assert.equal(missingNetworkGate.blockedReason, 'network-gate-not-enabled');
  assert.equal(missingNetworkGate.willCallRemote, false);

  const missingOperatorAck = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    config: READY_CONFIG,
  });

  assert.equal(missingOperatorAck.status, 'blocked-operator-ack-missing');
  assert.equal(missingOperatorAck.blockedReason, 'operator-ack-missing');
  assert.equal(missingOperatorAck.willCallRemote, false);
  assertNoLeak(wrongProfile, PROTECTED_TERMS);
  assertNoLeak(missingNetworkGate, PROTECTED_TERMS);
  assertNoLeak(missingOperatorAck, PROTECTED_TERMS);
});

test('unsafe operation classes are blocked before any remote attempt', () => {
  const report = evaluateRealSmokeGate(enabledGate({ operationClass: 'destructive' }));

  assert.equal(report.status, 'blocked-unsafe-operation-class');
  assert.equal(report.blockedReason, 'unsafe-operation-class');
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});

test('missing safe test refs block before credential checks', () => {
  const report = evaluateRealSmokeGate(enabledGate({
    config: {
      profile: 'real-smoke',
      providers: {
        telegram: {
          mode: 'real',
          credentialRef: ['secret', 'telegram', 'smoke-bot'].join(':'),
        },
        openclaw: {
          mode: 'real',
          credentialRef: ['secret', 'openclaw', 'smoke-api'].join(':'),
        },
      },
    },
  }));

  assert.equal(report.status, 'blocked-missing-safe-test-ref');
  assert.equal(report.blockedReason, 'missing-safe-test-ref');
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});

test('missing or invalid real smoke credential refs block safely', () => {
  const missing = evaluateRealSmokeGate(enabledGate({
    config: {
      profile: 'real-smoke',
      providers: {
        telegram: {
          mode: 'real',
          transportRef: 'tg-channel:smoke-topic',
        },
        openclaw: {
          mode: 'real',
          credentialRef: ['secret', 'openclaw', 'smoke-api'].join(':'),
          transportRef: 'openclaw-profile:smoke',
        },
      },
    },
  }));

  assert.equal(missing.status, 'blocked-missing-secret');
  assert.equal(missing.blockedReason, 'missing-or-invalid-credential-ref');
  assert.equal(missing.willCallRemote, false);
  assert.deepEqual(
    missing.configuredDependencies.map((dependency) => dependency.credentialStatus),
    ['missing', 'configured-redacted'],
  );
  assertNoLeak(missing, PROTECTED_TERMS);

  const invalid = evaluateRealSmokeGate(enabledGate({
    config: {
      profile: 'real-smoke',
      providers: {
        telegram: {
          mode: 'real',
          credentialRef: SENSITIVE_REF,
          transportRef: 'tg-channel:smoke-topic',
        },
        openclaw: {
          mode: 'real',
          credentialRef: ['secret', 'openclaw', 'smoke-api'].join(':'),
          transportRef: 'openclaw-profile:smoke',
        },
      },
    },
  }));

  assert.equal(invalid.status, 'blocked-missing-secret');
  assert.equal(invalid.configuredDependencies[0].credentialRef, ['secret', 'telegram', 'telegram-bot-token', 'redacted'].join(':'));
  assertNoLeak(invalid, PROTECTED_TERMS);
});

test('configured gate reports missing injected provider/client port without attempting remote work', () => {
  const report = evaluateRealSmokeGate(enabledGate());

  assert.equal(report.status, 'blocked-missing-port');
  assert.equal(report.blockedReason, 'provider-port-not-injected');
  assert.equal(report.providerPortStatus, 'missing');
  assert.equal(report.transportPortStatus, 'missing');
  assert.equal(report.providerAckResult, 'not-attempted');
  assert.equal(report.businessResult, 'not-attempted');
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});

test('gate is ready-to-run only when all gates are open, a provider port is injected, and no attempt is supplied', () => {
  const report = evaluateRealSmokeGate(enabledGate({ providerPortStatus: 'available' }));

  assert.equal(report.status, 'ready-to-run');
  assert.equal(report.blockedReason, 'none');
  assert.equal(report.providerPortStatus, 'available');
  assert.equal(report.attemptReport, 'not-supplied');
  assert.equal(report.providerAckResult, 'not-attempted');
  assert.equal(report.businessResult, 'not-attempted');
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});

test('passed requires a supplied attempt with provider acknowledgement and business success', () => {
  const incompleteAttempt = evaluateRealSmokeGate(enabledGate({
    providerPortStatus: 'available',
    attempt: {},
  }));

  assert.equal(incompleteAttempt.status, 'failed-safe');
  assert.equal(incompleteAttempt.blockedReason, 'provider-acknowledgement-failed-safe');
  assert.equal(incompleteAttempt.attemptReport, 'supplied-redacted');

  const passed = evaluateRealSmokeGate(enabledGate({
    providerPortStatus: 'available',
    attempt: {
      providerAckResult: 'provider-acknowledged',
      businessResult: 'business-succeeded',
    },
  }));

  assert.equal(passed.status, 'passed');
  assert.equal(passed.blockedReason, 'none');
  assert.equal(passed.attemptReport, 'supplied-redacted');
  assert.equal(passed.providerAckResult, 'provider-acknowledged');
  assert.equal(passed.businessResult, 'business-succeeded');
  assert.equal(passed.redactedFailure, 'none');
  assert.equal(passed.willCallRemote, false);
  assertNoLeak(incompleteAttempt, PROTECTED_TERMS);
  assertNoLeak(passed, PROTECTED_TERMS);
});

test('provider acknowledgement failure and business failure are separate failed-safe states', () => {
  const failedProviderAck = evaluateRealSmokeGate(enabledGate({
    providerPortStatus: 'available',
    attempt: {
      providerAckResult: 'provider-rejected',
      businessResult: 'business-succeeded',
    },
  }));

  assert.equal(failedProviderAck.status, 'failed-safe');
  assert.equal(failedProviderAck.blockedReason, 'provider-acknowledgement-failed-safe');
  assert.equal(failedProviderAck.providerAckResult, 'provider-rejected');
  assert.equal(failedProviderAck.businessResult, 'business-succeeded');
  assert.equal(failedProviderAck.redactedFailure, 'provider-ack-failed-safe');

  const failedBusiness = evaluateRealSmokeGate(enabledGate({
    providerPortStatus: 'available',
    attempt: {
      providerAckResult: 'provider-acknowledged',
      businessResult: 'business-failed-safe',
    },
  }));

  assert.equal(failedBusiness.status, 'failed-safe');
  assert.equal(failedBusiness.blockedReason, 'business-attempt-failed-safe');
  assert.equal(failedBusiness.providerAckResult, 'provider-acknowledged');
  assert.equal(failedBusiness.businessResult, 'business-failed-safe');
  assert.equal(failedBusiness.redactedFailure, 'business-failed-safe');
  assertNoLeak(failedProviderAck, PROTECTED_TERMS);
  assertNoLeak(failedBusiness, PROTECTED_TERMS);
});

test('unsafe attempt output is converted to a redacted failed-safe report', () => {
  const report = evaluateRealSmokeGate(enabledGate({
    providerPortStatus: 'available',
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
  }));

  assert.equal(report.status, 'failed-safe');
  assert.equal(report.blockedReason, 'unsafe-output-detected');
  assert.equal(report.noLeakResult, 'failed-safe');
  assert.equal(report.redactedFailure, 'unsafe-output-redacted');
  assert.equal(report.providerAckResult, 'provider-acknowledged');
  assert.equal(report.businessResult, 'business-succeeded');
  assertNoLeak(report, PROTECTED_TERMS);
});

test('environment edge converts process input to a redacted gate input without injecting a provider port', () => {
  const envInput = createRealSmokeGateInputFromEnvironment({
    [REAL_SMOKE_ENVIRONMENT_KEYS.enabled]: '1',
    [REAL_SMOKE_ENVIRONMENT_KEYS.profile]: 'real-smoke',
    [REAL_SMOKE_ENVIRONMENT_KEYS.allowNetwork]: '1',
    [REAL_SMOKE_ENVIRONMENT_KEYS.operatorAcknowledged]: '1',
    [REAL_SMOKE_ENVIRONMENT_KEYS.telegramCredentialRef]: SENSITIVE_REF,
    [REAL_SMOKE_ENVIRONMENT_KEYS.telegramTransportRef]: 'tg-channel:smoke-topic',
    [REAL_SMOKE_ENVIRONMENT_KEYS.openClawCredentialRef]: ['secret', 'openclaw', 'smoke-api'].join(':'),
    [REAL_SMOKE_ENVIRONMENT_KEYS.openClawTransportRef]: 'openclaw-profile:smoke',
    [REAL_SMOKE_ENVIRONMENT_KEYS.correlationRef]: 'corr:w18c-env-smoke',
  });
  const report = evaluateRealSmokeGate(envInput);

  assert.equal(envInput.providerPortStatus, 'missing');
  assert.equal(report.status, 'blocked-missing-secret');
  assert.equal(report.configuredDependencies[0].credentialRef, ['secret', 'telegram', 'telegram-bot-token', 'redacted'].join(':'));
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});
