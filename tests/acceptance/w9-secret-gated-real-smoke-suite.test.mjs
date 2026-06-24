import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertNoOpenClawRealSmokeOutputLeaks,
  buildOpenClawRealSmokeCleanupPlan,
  composeOpenClawRealSmokeDryRunScenario,
  getOpenClawRealSmokeReadiness,
} from '../smoke/secret-gated-real-smoke-suite.mjs';

test('W9 real smoke readiness is inert, redacted, and gate-driven', () => {
  assert.deepEqual(getOpenClawRealSmokeReadiness(Object.freeze({})), Object.freeze({
    status: 'skipped',
    reason: 'real-smoke-disabled',
    requiredCount: 4,
    presentCount: 0,
    missingCount: 4,
    networkGate: 'closed',
    realClientConfigured: false,
    willCallRemote: false,
  }));

  assert.deepEqual(getOpenClawRealSmokeReadiness(Object.freeze({
    OPENCLAW_REAL_SMOKE_ENABLED: '0',
  })), Object.freeze({
    status: 'skipped',
    reason: 'real-smoke-disabled',
    requiredCount: 4,
    presentCount: 0,
    missingCount: 4,
    networkGate: 'closed',
    realClientConfigured: false,
    willCallRemote: false,
  }));

  assert.deepEqual(getOpenClawRealSmokeReadiness(Object.freeze({
    OPENCLAW_REAL_SMOKE_ENABLED: '1',
    OPENCLAW_CHANNEL_ID: 'placeholder-channel-id',
  })), Object.freeze({
    status: 'not-ready',
    reason: 'missing-required-settings',
    requiredCount: 4,
    presentCount: 1,
    missingCount: 3,
    networkGate: 'closed',
    realClientConfigured: false,
    willCallRemote: false,
  }));

  assert.deepEqual(getOpenClawRealSmokeReadiness(Object.freeze({
    OPENCLAW_REAL_SMOKE_ENABLED: '1',
    OPENCLAW_BOT_TOKEN: 'placeholder-token-value',
    OPENCLAW_CHANNEL_ID: 'placeholder-channel-id',
    OPENCLAW_WORKSPACE_REF: 'workspace:w9-real-smoke',
    OPENCLAW_AGENT_REF: 'agent:w9-real-smoke',
  })), Object.freeze({
    status: 'dry-run-ready',
    reason: 'all-settings-present-network-gate-closed',
    requiredCount: 4,
    presentCount: 4,
    missingCount: 0,
    networkGate: 'closed',
    realClientConfigured: false,
    willCallRemote: false,
  }));

  assert.deepEqual(getOpenClawRealSmokeReadiness(Object.freeze({
    OPENCLAW_REAL_SMOKE_ENABLED: '1',
    OPENCLAW_REAL_SMOKE_ALLOW_NETWORK: '1',
    OPENCLAW_BOT_TOKEN: 'placeholder-token-value',
    OPENCLAW_CHANNEL_ID: 'placeholder-channel-id',
    OPENCLAW_WORKSPACE_REF: 'workspace:w9-real-smoke',
    OPENCLAW_AGENT_REF: 'agent:w9-real-smoke',
  })), Object.freeze({
    status: 'real-run-blocked-by-design',
    reason: 'real-client-not-configured',
    requiredCount: 4,
    presentCount: 4,
    missingCount: 0,
    networkGate: 'requested',
    realClientConfigured: false,
    willCallRemote: false,
  }));

  const currentEnvironmentReadiness = getOpenClawRealSmokeReadiness(process.env);
  assert.equal([
    'skipped',
    'not-ready',
    'dry-run-ready',
    'real-run-blocked-by-design',
  ].includes(currentEnvironmentReadiness.status), true);
  assert.equal(currentEnvironmentReadiness.willCallRemote, false);
  assertNoOpenClawRealSmokeOutputLeaks(currentEnvironmentReadiness);
});

test('W9 real smoke suite composes W8 OpenClaw shells with fake ports and cleanup planning only', async () => {
  const readiness = getOpenClawRealSmokeReadiness(Object.freeze({
    OPENCLAW_REAL_SMOKE_ENABLED: '1',
    OPENCLAW_BOT_TOKEN: 'placeholder-token-value',
    OPENCLAW_CHANNEL_ID: 'placeholder-channel-id',
    OPENCLAW_WORKSPACE_REF: 'workspace:w9-real-smoke',
    OPENCLAW_AGENT_REF: 'agent:w9-real-smoke',
  }));
  const realRunReadiness = getOpenClawRealSmokeReadiness(Object.freeze({
    OPENCLAW_REAL_SMOKE_ENABLED: '1',
    OPENCLAW_REAL_SMOKE_ALLOW_NETWORK: '1',
    OPENCLAW_BOT_TOKEN: 'placeholder-token-value',
    OPENCLAW_CHANNEL_ID: 'placeholder-channel-id',
    OPENCLAW_WORKSPACE_REF: 'workspace:w9-real-smoke',
    OPENCLAW_AGENT_REF: 'agent:w9-real-smoke',
  }));
  const composition = await composeOpenClawRealSmokeDryRunScenario();
  const cleanupPlan = buildOpenClawRealSmokeCleanupPlan();

  assert.equal(readiness.status, 'dry-run-ready');
  assert.equal(readiness.willCallRemote, false);
  assert.equal(realRunReadiness.status, 'real-run-blocked-by-design');
  assert.equal(realRunReadiness.willCallRemote, false);

  assert.equal(composition.channelResult.ok, true);
  assert.equal(composition.channelResult.value.event.eventKind, 'message');
  assert.equal(composition.deliveryResult.ok, true);
  assert.equal(composition.deliveryResult.value.ok, true);
  assert.equal(composition.runtimeReadiness.status, 'ready');
  assert.equal(composition.runtimeResult.ok, true);
  assert.equal(composition.runtimeResult.value.output.outputRef, 'runtime-output:w9-real-smoke-runtime');
  assert.equal(composition.approvalReadiness.status, 'ready');
  assert.equal(composition.approvalSubmit.ok, true);
  assert.equal(composition.approvalSubmit.value.state.status, 'submitted');
  assert.equal(composition.approvalResolve.ok, true);
  assert.equal(composition.approvalResolve.value.state.status, 'approved');

  assert.deepEqual(composition.invocationCounts, Object.freeze({
    deliveryPortSends: 1,
    runtimePortDispatches: 1,
    runtimeReadinessChecks: 1,
    approvalSubmissions: 1,
    approvalResolutions: 1,
    approvalReadinessChecks: 1,
  }));

  assert.equal(cleanupPlan.status, 'planned-only');
  assert.equal(cleanupPlan.cleanupSupported, false);
  assert.equal(cleanupPlan.willRunCleanup, false);
  assert.deepEqual(cleanupPlan.resources.messages, Object.freeze(['telegram-message:w9-real-smoke-delivery']));
  assert.deepEqual(cleanupPlan.resources.approvalRequests, Object.freeze(['approval:w9-real-smoke']));
  assert.deepEqual(cleanupPlan.resources.runtimeDispatches, Object.freeze(['operation:w9-real-smoke-runtime']));

  for (const sample of [readiness, realRunReadiness, composition, cleanupPlan]) {
    assertNoOpenClawRealSmokeOutputLeaks(sample);
  }
});
