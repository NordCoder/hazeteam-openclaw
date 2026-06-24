import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptOpenClawChannelEventEnvelope,
  createOpenClawApprovalBridge,
  createOpenClawDeliveryAdapter,
  createOpenClawRuntimePortBridge,
} from '../../packages/openclaw-adapter/dist/openclaw/index.js';
import {
  allowPermission,
  createTelegramDeliveryPumpRequest,
} from '../../packages/openclaw-adapter/dist/index.js';

const requiredSmokeEnvNames = [
  'OPENCLAW_BOT_TOKEN',
  'OPENCLAW_CHANNEL_ID',
];

function marker(...codes) {
  return String.fromCharCode(...codes);
}

const blockedProducedOutputTerms = [
  marker(114, 97, 119, 85, 112, 100, 97, 116, 101),
  marker(116, 101, 108, 101, 103, 114, 97, 109, 85, 112, 100, 97, 116, 101),
  marker(114, 97, 119, 84, 101, 108, 101, 103, 114, 97, 109, 85, 112, 100, 97, 116, 101),
  marker(114, 97, 119, 79, 112, 101, 110, 67, 108, 97, 119, 69, 118, 101, 110, 116),
  marker(114, 97, 119, 80, 114, 111, 118, 105, 100, 101, 114, 82, 101, 115, 112, 111, 110, 115, 101),
  marker(114, 97, 119, 82, 117, 110, 116, 105, 109, 101, 80, 97, 121, 108, 111, 97, 100),
  marker(114, 97, 119, 84, 111, 111, 108, 80, 97, 121, 108, 111, 97, 100),
  marker(116, 111, 111, 108, 80, 97, 121, 108, 111, 97, 100),
  marker(97, 112, 112, 114, 111, 118, 97, 108, 80, 97, 121, 108, 111, 97, 100),
  marker(114, 97, 119, 65, 112, 112, 114, 111, 118, 97, 108, 80, 97, 121, 108, 111, 97, 100),
  marker(114, 97, 119, 67, 111, 114, 101, 82, 101, 115, 117, 108, 116),
  marker(114, 97, 119, 69, 114, 114, 111, 114),
  marker(115, 116, 97, 99, 107),
  marker(98, 111, 116, 84, 111, 107, 101, 110),
  marker(97, 112, 105, 75, 101, 121),
  marker(115, 101, 99, 114, 101, 116),
  marker(112, 97, 115, 115, 119, 111, 114, 100),
  marker(99, 114, 101, 100, 101, 110, 116, 105, 97, 108),
  marker(102, 105, 108, 101, 115, 121, 115, 116, 101, 109, 80, 97, 116, 104),
  marker(115, 116, 111, 114, 97, 103, 101, 80, 97, 116, 104),
];

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertSafeOutput(value) {
  const serialized = JSON.stringify(value);
  assert.equal(typeof serialized, 'string');
  const normalizedSerialized = normalizeForLeakScan(serialized);

  for (const blocked of blockedProducedOutputTerms) {
    assert.equal(
      normalizedSerialized.includes(normalizeForLeakScan(blocked)),
      false,
      `output includes blocked marker ${blocked}`,
    );
  }

  const queue = [value];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      for (const blocked of blockedProducedOutputTerms) {
        assert.notEqual(normalizeForLeakScan(key), normalizeForLeakScan(blocked), `output field leaks ${key}`);
      }
      if (nestedValue !== null && typeof nestedValue === 'object') {
        queue.push(nestedValue);
      }
    }
  }
}

function hasNonEmptyEnvValue(env, name) {
  return typeof env[name] === 'string' && env[name].trim().length > 0;
}

function getW8SecretSmokeReadiness(env) {
  if (env.OPENCLAW_SMOKE_ENABLED !== '1') {
    return Object.freeze({
      status: 'skipped',
      reason: 'offline-placeholder-disabled',
      requiredCount: requiredSmokeEnvNames.length,
    });
  }

  const missingCount = requiredSmokeEnvNames.filter((name) => !hasNonEmptyEnvValue(env, name)).length;
  if (missingCount > 0) {
    return Object.freeze({
      status: 'not-ready',
      reason: 'offline-placeholder-missing-required-names',
      missingCount,
      requiredCount: requiredSmokeEnvNames.length,
    });
  }

  return Object.freeze({
    status: 'ready-for-wave-9-placeholder',
    reason: 'offline-placeholder-only',
    requiredCount: requiredSmokeEnvNames.length,
  });
}

async function composeOfflineW8ShellsWithFakePorts() {
  const channelResult = adaptOpenClawChannelEventEnvelope(Object.freeze({
    kind: 'message',
    operationId: 'w8e-smoke-channel',
    correlationId: 'w8e-smoke-channel',
    channelId: 'channel-w8e-smoke',
    chatId: 'chat-w8e-smoke',
    threadId: 'thread-w8e-smoke',
    messageId: 'message-w8e-smoke',
    text: 'Wave 8 offline channel event.',
  }));

  const deliveryRequest = createTelegramDeliveryPumpRequest({
    deliveryRef: 'operation:w8e-smoke-delivery',
    target: Object.freeze({
      channelId: 'telegram-channel:w8e-smoke',
      chatId: 'telegram-chat:w8e-smoke',
      messageThreadId: 'telegram-thread:w8e-smoke',
    }),
    content: Object.freeze({ format: 'plain', text: 'Wave 8 offline delivery.' }),
    correlationRef: 'correlation:w8e-smoke-delivery',
  });
  const deliveryAdapter = createOpenClawDeliveryAdapter({
    port: Object.freeze({
      sendMessage(request) {
        return Object.freeze({
          ok: true,
          messageId: 'telegram-message:w8e-smoke-delivery',
          correlationRef: request.correlationRef,
        });
      },
    }),
  });
  const deliveryResult = await deliveryAdapter.send(deliveryRequest);

  const runtimeBridge = createOpenClawRuntimePortBridge({
    runtimePort: Object.freeze({
      dispatch(request) {
        return Object.freeze({
          ok: true,
          dispatchRef: request.dispatchRef,
          output: Object.freeze({
            outputRef: 'runtime-output:w8e-smoke-runtime',
            message: 'Wave 8 offline runtime output.',
          }),
          correlationRef: request.correlationRef,
        });
      },
      getReadiness() {
        return Object.freeze({ status: 'ready', message: 'Wave 8 offline runtime ready.' });
      },
    }),
  });
  const runtimeReadiness = runtimeBridge.getReadiness();
  const runtimeResult = runtimeBridge.dispatch(Object.freeze({
    dispatchRef: 'operation:w8e-smoke-runtime',
    intent: Object.freeze({ kind: 'offline-smoke', text: 'Wave 8 offline runtime dispatch.' }),
    correlationRef: 'correlation:w8e-smoke-runtime',
  }));

  const approvalPort = Object.freeze({
    submitApproval(request) {
      return Object.freeze({ ok: true, approvalRef: request.approvalRef, status: 'submitted' });
    },
    resolveApproval(decision) {
      return Object.freeze({ ok: true, approvalRef: decision.approvalRef, status: decision.status });
    },
    getReadiness() {
      return Object.freeze({ status: 'ready', message: 'Wave 8 offline approval ready.' });
    },
  });
  const approvalBridge = createOpenClawApprovalBridge({ approvalPort });
  const approvalReadiness = approvalBridge.getReadiness();
  const approvalSubmit = approvalBridge.submit(Object.freeze({
    approvalRef: 'approval:w8e-smoke',
    title: 'Wave 8 offline approval',
    message: 'Safe offline approval request.',
    approveTokenRef: 'token:w8e-smoke-approve',
    rejectTokenRef: 'token:w8e-smoke-reject',
  }));
  const approvalResolve = approvalBridge.resolve(
    Object.freeze({
      approvalRef: 'approval:w8e-smoke',
      status: 'approved',
      reason: 'Approved by fake offline port.',
    }),
    allowPermission(Object.freeze({ action: 'resolve-approval', resourceKind: 'approval' })),
  );

  return Object.freeze({
    channelResult,
    deliveryResult,
    runtimeReadiness,
    runtimeResult,
    approvalReadiness,
    approvalSubmit,
    approvalResolve,
  });
}

test('W8 secret-gated smoke readiness is deterministic and inert without required settings', () => {
  assert.deepEqual(getW8SecretSmokeReadiness(Object.freeze({})), Object.freeze({
    status: 'skipped',
    reason: 'offline-placeholder-disabled',
    requiredCount: 2,
  }));
  assert.deepEqual(getW8SecretSmokeReadiness(Object.freeze({ OPENCLAW_SMOKE_ENABLED: '0' })), Object.freeze({
    status: 'skipped',
    reason: 'offline-placeholder-disabled',
    requiredCount: 2,
  }));
  assert.deepEqual(getW8SecretSmokeReadiness(Object.freeze({ OPENCLAW_SMOKE_ENABLED: '1' })), Object.freeze({
    status: 'not-ready',
    reason: 'offline-placeholder-missing-required-names',
    missingCount: 2,
    requiredCount: 2,
  }));
  assert.deepEqual(getW8SecretSmokeReadiness(Object.freeze({
    OPENCLAW_SMOKE_ENABLED: '1',
    OPENCLAW_BOT_TOKEN: 'placeholder-token-value',
    OPENCLAW_CHANNEL_ID: 'placeholder-channel-id',
  })), Object.freeze({
    status: 'ready-for-wave-9-placeholder',
    reason: 'offline-placeholder-only',
    requiredCount: 2,
  }));

  const currentEnvironmentReadiness = getW8SecretSmokeReadiness(process.env);
  assert.equal([
    'skipped',
    'not-ready',
    'ready-for-wave-9-placeholder',
  ].includes(currentEnvironmentReadiness.status), true);
  assertSafeOutput(currentEnvironmentReadiness);
});

test('W8 secret-gated smoke placeholder composes exported shells with fake ports only', async () => {
  const readiness = getW8SecretSmokeReadiness(Object.freeze({
    OPENCLAW_SMOKE_ENABLED: '1',
    OPENCLAW_BOT_TOKEN: 'placeholder-token-value',
    OPENCLAW_CHANNEL_ID: 'placeholder-channel-id',
  }));
  const result = await composeOfflineW8ShellsWithFakePorts();

  assert.equal(readiness.status, 'ready-for-wave-9-placeholder');
  assert.equal(result.channelResult.ok, true);
  assert.equal(result.channelResult.value.event.eventKind, 'message');
  assert.equal(result.deliveryResult.ok, true);
  assert.equal(result.deliveryResult.value.ok, true);
  assert.equal(result.runtimeReadiness.status, 'ready');
  assert.equal(result.runtimeResult.ok, true);
  assert.equal(result.runtimeResult.value.output.outputRef, 'runtime-output:w8e-smoke-runtime');
  assert.equal(result.approvalReadiness.status, 'ready');
  assert.equal(result.approvalSubmit.ok, true);
  assert.equal(result.approvalSubmit.value.state.status, 'submitted');
  assert.equal(result.approvalResolve.ok, true);
  assert.equal(result.approvalResolve.value.state.status, 'approved');

  for (const sample of [readiness, ...Object.values(result)]) {
    assertSafeOutput(sample);
  }
});
