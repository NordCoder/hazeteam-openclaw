import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateRealSmokeGate,
  isSafeRealSmokeGateReportJson,
} from '../../packages/openclaw-telegram-transport/dist/real-smoke-gate.js';
import {
  callProviderDelivery,
  createInjectedProviderClientPort,
  createProviderClientPortReadiness,
  describeProviderClientPortBoundary,
  isSafeProviderClientPortJson,
} from '../../packages/openclaw-telegram-transport/dist/provider-client/provider-client-port.js';

function fromCharCodes(codes) {
  return String.fromCharCode(...codes);
}

const RAW_FIELD = fromCharCodes([114, 97, 119, 80, 97, 121, 108, 111, 97, 100]);
const ENDPOINT_FIELD = fromCharCodes([101, 110, 100, 112, 111, 105, 110, 116]);
const LOCAL_PATH_FIELD = fromCharCodes([108, 111, 99, 97, 108, 80, 97, 116, 104]);
const STACK_FIELD = fromCharCodes([115, 116, 97, 99, 107, 84, 114, 97, 99, 101]);
const PROVIDER_HANDLE_FIELD = fromCharCodes([112, 114, 111, 118, 105, 100, 101, 114, 72, 97, 110, 100, 108, 101]);
const SENSITIVE_HEADER = fromCharCodes([66, 101, 97, 114, 101, 114, 32, 112, 114, 105, 118, 97, 116, 101, 45, 118, 97, 108, 117, 101]);
const SENSITIVE_ENDPOINT = fromCharCodes([104, 116, 116, 112, 115, 58, 47, 47, 112, 114, 111, 118, 105, 100, 101, 114, 46, 101, 120, 97, 109, 112, 108, 101, 47, 115, 109, 111, 107, 101]);
const SENSITIVE_PATH = fromCharCodes([47, 111, 112, 101, 114, 97, 116, 111, 114, 47, 115, 109, 111, 107, 101]);

const READY_CONFIG = Object.freeze({
  profile: 'real-smoke',
  providers: Object.freeze({
    telegram: Object.freeze({
      mode: 'real',
      credentialRef: 'ref:telegram-smoke-harness',
      transportRef: 'tg-channel:w19c-smoke-topic',
      sourceClass: 'injected',
    }),
    openclaw: Object.freeze({
      mode: 'real',
      credentialRef: 'ref:openclaw-smoke-harness',
      transportRef: 'openclaw-profile:w19c-smoke',
      sourceClass: 'injected',
    }),
  }),
});

const OPEN_GATES = Object.freeze({
  enabled: '1',
  profile: 'real-smoke',
  allowNetwork: '1',
  operatorAcknowledged: '1',
  operationClass: 'ephemeral-write',
  cleanupPolicy: 'manual',
  correlationRef: 'corr:w19c-smoke-harness',
  config: READY_CONFIG,
});

const DELIVERY_REQUEST = Object.freeze({
  descriptorKind: 'provider-client-delivery-call-request',
  descriptorVersion: 'w18b',
  provider: 'telegram',
  deliveryRef: 'delivery:w19c-smoke-harness',
  correlationRef: 'corr:w19c-smoke-harness',
  idempotencyRef: 'idempotency:w19c-smoke-harness',
  deliveryAttemptRef: 'attempt:w19c-smoke-harness',
  targetRef: 'target:w19c-smoke-harness',
  content: Object.freeze({
    format: 'plain',
    text: 'w19c safe smoke harness marker',
  }),
  jsonSerializable: true,
});

const PUBLIC_REPORT_FORBIDDEN_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\b(?:token|api[_-]?key|password|secret|credential)\b/iu,
  /\b(?:stackTrace|stack|trace)\b/iu,
  /\braw(?:Payload|Provider|Callback|Delivery|Body|Result|Logs?|Output|Diff)?\b/u,
  /\b(?:providerClientObject|clientHandle|providerHandle|sdkHandle|providerPayload|callbackPayload)\b/u,
  /\b(?:endpoint|logOutput|diff|logs?)\b/iu,
]);

const NETWORK_MODULE_PATTERN = /\b(?:node:)?(?:http|https|net|tls)\b/iu;

function loadedNetworkModuleEntries() {
  return new Set(process.moduleLoadList.filter((entry) => NETWORK_MODULE_PATTERN.test(entry)));
}

async function withRuntimeTripwire(fn) {
  const calls = [];
  const originals = new Map();

  function replaceGlobal(name) {
    if (name === 'WebSocket' && !(name in globalThis)) {
      return;
    }

    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: () => {
        calls.push(name);
        throw new Error(`W19C forbidden runtime primitive invoked: ${name}`);
      },
    });
  }

  replaceGlobal('fetch');
  replaceGlobal('WebSocket');
  replaceGlobal('setInterval');

  const beforeModules = loadedNetworkModuleEntries();

  try {
    const result = await fn();
    const afterModules = loadedNetworkModuleEntries();
    const newlyLoadedNetworkModules = [...afterModules].filter((entry) => !beforeModules.has(entry));

    assert.deepEqual(calls, [], 'W19C harness must not invoke guarded runtime primitives');
    assert.deepEqual(newlyLoadedNetworkModules, [], 'W19C harness must not dynamically load core network modules');

    return result;
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(globalThis, name);
      } else {
        Object.defineProperty(globalThis, name, descriptor);
      }
    }
  }
}

function createFakeProviderPort(counter) {
  return createInjectedProviderClientPort({
    deliver: () => {
      counter.count += 1;
      return Object.freeze({
        ok: true,
        providerMessageRef: 'message:w19c-smoke-harness',
        idempotencyRef: 'idempotency:w19c-smoke-harness',
        deliveryAttemptRef: 'attempt:w19c-smoke-harness',
      });
    },
  });
}

function providerPortReadiness(port) {
  return createProviderClientPortReadiness({
    provider: 'telegram',
    port,
    credentialStatus: 'configured-redacted',
    enabled: true,
  });
}

function evaluateHarness(gateInput = Object.freeze({}), options = Object.freeze({})) {
  const readiness = providerPortReadiness(options.port);
  const gateReport = evaluateRealSmokeGate({
    ...gateInput,
    providerPortStatus: readiness.providerPortStatus,
  });

  assert.equal(isSafeProviderClientPortJson(readiness), true);
  assert.equal(isSafeRealSmokeGateReportJson(gateReport), true);

  const publicReport = Object.freeze({
    descriptorKind: 'w19c-opt-in-real-smoke-harness-report',
    descriptorVersion: 'w19c',
    status: gateReport.status,
    blockedReason: gateReport.blockedReason,
    providerAckResult: gateReport.providerAckResult,
    businessResult: gateReport.businessResult,
    providerPortStatus: gateReport.providerPortStatus,
    providerPortReadiness: readiness.status,
    attemptReport: gateReport.attemptReport,
    redactedFailure: gateReport.redactedFailure,
    noLeakResult: gateReport.noLeakResult,
    remoteAttempt: gateReport.remoteAttempt,
    willCallRemote: gateReport.willCallRemote,
    effects: gateReport.effects,
    jsonSerializable: gateReport.jsonSerializable,
    defaultRealProviderExecution: false,
    productionRuntimeClaimed: false,
  });

  assertSafePublicReport(publicReport);
  return publicReport;
}

function assertSafePublicReport(report) {
  const encoded = JSON.stringify(report);

  assert.equal(report.jsonSerializable, true);
  assert.equal(JSON.parse(encoded).descriptorKind, report.descriptorKind);
  assert.equal(report.willCallRemote, false);
  assert.equal(report.remoteAttempt, 'not-attempted');
  assert.equal(report.effects, 'none');
  assert.equal(report.defaultRealProviderExecution, false);
  assert.equal(report.productionRuntimeClaimed, false);

  for (const pattern of PUBLIC_REPORT_FORBIDDEN_PATTERNS) {
    assert.equal(pattern.test(encoded), false, `W19C public report leaked forbidden material matching ${pattern}`);
  }
}

function suppliedAttempt(providerAckResult, businessResult, extra = Object.freeze({})) {
  return Object.freeze({
    providerAckResult,
    ...(businessResult === undefined ? {} : { businessResult }),
    ...extra,
  });
}

test('W19C default harness posture is skipped, inert, and not production runtime', async () => {
  await withRuntimeTripwire(async () => {
    const boundary = describeProviderClientPortBoundary();
    assert.equal(boundary.providerClientConstructedByDefault, false);
    assert.equal(boundary.networkBehaviorByDefault, 'none');
    assert.equal(boundary.processEnvReads, false);
    assert.equal(boundary.requiresInjectedPort, true);
    assert.equal(boundary.providerAcknowledgementIsBusinessSuccess, false);

    const report = evaluateHarness();

    assert.equal(report.status, 'skipped');
    assert.equal(report.blockedReason, 'not-enabled');
    assert.notEqual(report.status, 'passed');
    assert.equal(report.providerPortStatus, 'missing');
    assert.equal(report.providerPortReadiness, 'blocked-missing-port');
  });
});

test('W19C gates open but missing provider port is safely blocked and not passed', async () => {
  await withRuntimeTripwire(async () => {
    const report = evaluateHarness(OPEN_GATES);

    assert.equal(report.status, 'blocked-missing-port');
    assert.equal(report.blockedReason, 'provider-port-not-injected');
    assert.equal(report.providerPortStatus, 'missing');
    assert.notEqual(report.status, 'passed');
  });
});

test('W19C injected fake port without supplied attempt is ready-to-run but not passed', async () => {
  await withRuntimeTripwire(async () => {
    const fakePortCalls = { count: 0 };
    const port = createFakeProviderPort(fakePortCalls);
    const report = evaluateHarness(OPEN_GATES, { port });

    assert.equal(report.status, 'ready-to-run');
    assert.equal(report.blockedReason, 'none');
    assert.equal(report.providerPortStatus, 'available');
    assert.equal(report.providerPortReadiness, 'ready');
    assert.equal(report.attemptReport, 'not-supplied');
    assert.notEqual(report.status, 'passed');
    assert.equal(fakePortCalls.count, 0, 'ready-to-run classification must not invoke the injected fake port');
  });
});

test('W19C provider acknowledgement alone remains failed-safe until business success is supplied', async () => {
  await withRuntimeTripwire(async () => {
    const fakePortCalls = { count: 0 };
    const port = createFakeProviderPort(fakePortCalls);
    const providerAck = await callProviderDelivery(
      { provider: 'telegram', port, credentialStatus: 'configured-redacted', enabled: true },
      DELIVERY_REQUEST,
    );

    assert.equal(fakePortCalls.count, 1);
    assert.equal(providerAck.ok, true);
    assert.equal(providerAck.providerAcknowledged, true);
    assert.equal(providerAck.providerAckStatus, 'provider-acknowledged');
    assert.equal(providerAck.businessSuccess, false);
    assert.equal(providerAck.businessStatus, 'not-marked-delivered');

    const report = evaluateHarness(
      {
        ...OPEN_GATES,
        attempt: suppliedAttempt(providerAck.providerAckStatus),
      },
      { port },
    );

    assert.equal(report.status, 'failed-safe');
    assert.equal(report.blockedReason, 'business-attempt-failed-safe');
    assert.equal(report.providerAckResult, 'provider-acknowledged');
    assert.equal(report.businessResult, 'not-attempted');
    assert.equal(report.attemptReport, 'supplied-redacted');
    assert.notEqual(report.status, 'passed');
  });
});

test('W19C pass requires supplied redacted provider acknowledgement plus business success', async () => {
  await withRuntimeTripwire(async () => {
    const fakePortCalls = { count: 0 };
    const port = createFakeProviderPort(fakePortCalls);
    const providerAck = await callProviderDelivery(
      { provider: 'telegram', port, credentialStatus: 'configured-redacted', enabled: true },
      DELIVERY_REQUEST,
    );

    const report = evaluateHarness(
      {
        ...OPEN_GATES,
        attempt: suppliedAttempt(providerAck.providerAckStatus, 'business-succeeded'),
      },
      { port },
    );

    assert.equal(fakePortCalls.count, 1);
    assert.equal(report.status, 'passed');
    assert.equal(report.blockedReason, 'none');
    assert.equal(report.providerAckResult, 'provider-acknowledged');
    assert.equal(report.businessResult, 'business-succeeded');
    assert.equal(report.attemptReport, 'supplied-redacted');
  });
});

test('W19C unsafe supplied attempt evidence is failed-safe and redacted', async () => {
  await withRuntimeTripwire(async () => {
    const fakePortCalls = { count: 0 };
    const port = createFakeProviderPort(fakePortCalls);
    const report = evaluateHarness(
      {
        ...OPEN_GATES,
        attempt: suppliedAttempt('provider-acknowledged', 'business-succeeded', {
          redactedFailureSummary: Object.freeze({
            [RAW_FIELD]: SENSITIVE_HEADER,
            [ENDPOINT_FIELD]: SENSITIVE_ENDPOINT,
            [LOCAL_PATH_FIELD]: SENSITIVE_PATH,
            [STACK_FIELD]: 'Error: redacted',
            [PROVIDER_HANDLE_FIELD]: 'object:redacted',
          }),
        }),
      },
      { port },
    );

    assert.equal(fakePortCalls.count, 0);
    assert.equal(report.status, 'failed-safe');
    assert.equal(report.blockedReason, 'unsafe-output-detected');
    assert.equal(report.redactedFailure, 'unsafe-output-redacted');
    assert.equal(report.noLeakResult, 'failed-safe');
    assert.notEqual(report.status, 'passed');
  });
});
