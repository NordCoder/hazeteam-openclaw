import assert from 'node:assert/strict';

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

const REQUIRED_SETTING_COUNT = 4;
const ENABLED_VALUE = '1';

export const OPENCLAW_REAL_SMOKE_OPT_IN_ENV_NAME = 'OPENCLAW_REAL_SMOKE_ENABLED';
export const OPENCLAW_REAL_SMOKE_NETWORK_ENV_NAME = 'OPENCLAW_REAL_SMOKE_ALLOW_NETWORK';
export const OPENCLAW_REAL_SMOKE_REQUIRED_ENV_NAMES = Object.freeze([
  'OPENCLAW_BOT_TOKEN',
  'OPENCLAW_CHANNEL_ID',
  'OPENCLAW_WORKSPACE_REF',
  'OPENCLAW_AGENT_REF',
]);

function marker(...codes) {
  return String.fromCharCode(...codes);
}

const blockedProducedOutputTerms = Object.freeze([
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
]);

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function hasNonEmptySetting(settings, name) {
  return typeof settings[name] === 'string' && settings[name].trim().length > 0;
}

function countPresentRequiredSettings(settings) {
  return OPENCLAW_REAL_SMOKE_REQUIRED_ENV_NAMES.filter((name) => hasNonEmptySetting(settings, name)).length;
}

export function getOpenClawRealSmokeReadiness(settings) {
  const presentCount = countPresentRequiredSettings(settings);
  const missingCount = REQUIRED_SETTING_COUNT - presentCount;

  if (settings[OPENCLAW_REAL_SMOKE_OPT_IN_ENV_NAME] !== ENABLED_VALUE) {
    return Object.freeze({
      status: 'skipped',
      reason: 'real-smoke-disabled',
      requiredCount: REQUIRED_SETTING_COUNT,
      presentCount,
      missingCount,
      networkGate: 'closed',
      realClientConfigured: false,
      willCallRemote: false,
    });
  }

  if (missingCount > 0) {
    return Object.freeze({
      status: 'not-ready',
      reason: 'missing-required-settings',
      requiredCount: REQUIRED_SETTING_COUNT,
      presentCount,
      missingCount,
      networkGate: 'closed',
      realClientConfigured: false,
      willCallRemote: false,
    });
  }

  if (settings[OPENCLAW_REAL_SMOKE_NETWORK_ENV_NAME] !== ENABLED_VALUE) {
    return Object.freeze({
      status: 'dry-run-ready',
      reason: 'all-settings-present-network-gate-closed',
      requiredCount: REQUIRED_SETTING_COUNT,
      presentCount,
      missingCount: 0,
      networkGate: 'closed',
      realClientConfigured: false,
      willCallRemote: false,
    });
  }

  return Object.freeze({
    status: 'real-run-blocked-by-design',
    reason: 'real-client-not-configured',
    requiredCount: REQUIRED_SETTING_COUNT,
    presentCount,
    missingCount: 0,
    networkGate: 'requested',
    realClientConfigured: false,
    willCallRemote: false,
  });
}

export function buildOpenClawRealSmokeCleanupPlan() {
  return Object.freeze({
    status: 'planned-only',
    reason: 'dry-run-cleanup-plan-only',
    cleanupSupported: false,
    willRunCleanup: false,
    resources: Object.freeze({
      messages: Object.freeze(['telegram-message:w9-real-smoke-delivery']),
      approvalRequests: Object.freeze(['approval:w9-real-smoke']),
      runtimeDispatches: Object.freeze(['operation:w9-real-smoke-runtime']),
    }),
  });
}

export async function composeOpenClawRealSmokeDryRunScenario() {
  const invocationCounts = {
    deliveryPortSends: 0,
    runtimePortDispatches: 0,
    runtimeReadinessChecks: 0,
    approvalSubmissions: 0,
    approvalResolutions: 0,
    approvalReadinessChecks: 0,
  };

  const channelResult = adaptOpenClawChannelEventEnvelope(Object.freeze({
    kind: 'message',
    operationId: 'w9-real-smoke-channel',
    correlationId: 'w9-real-smoke-channel',
    channelId: 'channel-w9-real-smoke',
    chatId: 'chat-w9-real-smoke',
    threadId: 'thread-w9-real-smoke',
    messageId: 'message-w9-real-smoke',
    text: 'Wave 9 dry-run channel event.',
  }));

  const deliveryRequest = createTelegramDeliveryPumpRequest({
    deliveryRef: 'operation:w9-real-smoke-delivery',
    target: Object.freeze({
      channelId: 'telegram-channel:w9-real-smoke',
      chatId: 'telegram-chat:w9-real-smoke',
      messageThreadId: 'telegram-thread:w9-real-smoke',
    }),
    content: Object.freeze({ format: 'plain', text: 'Wave 9 dry-run delivery.' }),
    correlationRef: 'correlation:w9-real-smoke-delivery',
  });
  const deliveryAdapter = createOpenClawDeliveryAdapter({
    port: Object.freeze({
      sendMessage(request) {
        invocationCounts.deliveryPortSends += 1;
        return Object.freeze({
          ok: true,
          messageId: 'telegram-message:w9-real-smoke-delivery',
          correlationRef: request.correlationRef,
        });
      },
    }),
  });
  const deliveryResult = await deliveryAdapter.send(deliveryRequest);

  const runtimeBridge = createOpenClawRuntimePortBridge({
    runtimePort: Object.freeze({
      dispatch(request) {
        invocationCounts.runtimePortDispatches += 1;
        return Object.freeze({
          ok: true,
          dispatchRef: request.dispatchRef,
          output: Object.freeze({
            outputRef: 'runtime-output:w9-real-smoke-runtime',
            message: 'Wave 9 dry-run runtime output.',
          }),
          correlationRef: request.correlationRef,
        });
      },
      getReadiness() {
        invocationCounts.runtimeReadinessChecks += 1;
        return Object.freeze({ status: 'ready', message: 'Wave 9 dry-run runtime ready.' });
      },
    }),
  });
  const runtimeReadiness = runtimeBridge.getReadiness();
  const runtimeResult = runtimeBridge.dispatch(Object.freeze({
    dispatchRef: 'operation:w9-real-smoke-runtime',
    intent: Object.freeze({ kind: 'dry-run-smoke', text: 'Wave 9 dry-run runtime dispatch.' }),
    correlationRef: 'correlation:w9-real-smoke-runtime',
  }));

  const approvalBridge = createOpenClawApprovalBridge({
    approvalPort: Object.freeze({
      submitApproval(request) {
        invocationCounts.approvalSubmissions += 1;
        return Object.freeze({ ok: true, approvalRef: request.approvalRef, status: 'submitted' });
      },
      resolveApproval(decision) {
        invocationCounts.approvalResolutions += 1;
        return Object.freeze({ ok: true, approvalRef: decision.approvalRef, status: decision.status });
      },
      getReadiness() {
        invocationCounts.approvalReadinessChecks += 1;
        return Object.freeze({ status: 'ready', message: 'Wave 9 dry-run approval ready.' });
      },
    }),
  });
  const approvalReadiness = approvalBridge.getReadiness();
  const approvalSubmit = approvalBridge.submit(Object.freeze({
    approvalRef: 'approval:w9-real-smoke',
    title: 'Wave 9 dry-run approval',
    message: 'Safe dry-run approval request.',
    approveTokenRef: 'token:w9-real-smoke-approve',
    rejectTokenRef: 'token:w9-real-smoke-reject',
  }));
  const approvalResolve = approvalBridge.resolve(
    Object.freeze({
      approvalRef: 'approval:w9-real-smoke',
      status: 'approved',
      reason: 'Approved by fake dry-run port.',
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
    invocationCounts: Object.freeze({ ...invocationCounts }),
  });
}

export function assertNoOpenClawRealSmokeOutputLeaks(value) {
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
