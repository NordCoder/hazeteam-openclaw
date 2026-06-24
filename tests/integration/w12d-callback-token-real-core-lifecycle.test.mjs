import assert from 'node:assert/strict';
import test from 'node:test';

import { ok } from 'hazeteam-core/foundation';
import {
  CORE_INTERACTION_CONTRACT_VERSION,
  assertInMemoryHostSessionBindingStore,
  createCoreInteractionHost,
} from 'hazeteam-core/host';
import {
  createInMemoryPresentationActionTokenStore,
  createInMemoryPresentationOutboxStore,
} from 'hazeteam-core/presentation';

import { parseOpenClawTelegramCallbackPayload } from '../../packages/openclaw-adapter/dist/index.js';

const FIXED_NOW = '2026-06-24T00:00:00.000Z';
const EXPIRES_AT = '2026-06-24T00:30:00.000Z';
const VERIFIED_AT = '2026-06-24T00:01:00.000Z';
const CONSUMED_AT = '2026-06-24T00:02:00.000Z';
const REPLAY_AT = '2026-06-24T00:03:00.000Z';

const REFS = Object.freeze({
  workspaceRef: Object.freeze({ id: 'workspace:w12d-callback-lifecycle' }),
  agentRef: Object.freeze({ id: 'agent:w12d-callback-lifecycle' }),
  actorRef: Object.freeze({ id: 'actor:w12d-callback-user' }),
  sessionRef: Object.freeze({ id: 'host-session:w12d-callback-lifecycle' }),
  outboxRef: Object.freeze({ id: 'outbox:w12d-action-card' }),
  approvalRef: Object.freeze({ id: 'approval:w12d-action' }),
  tokenRef: Object.freeze({ id: 'token:w12d-action-token' }),
});

const ACTION_ID = 'action:w12d-approve';

const FORBIDDEN_PUBLIC_LEAK_TERMS = Object.freeze([
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawTelegramCallback',
  'rawOpenClawEvent',
  'rawOpenClawCallback',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'rawApprovalPayload',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
  'filesystem',
  'storageRoot',
  'storagePath',
  'webhook',
  'polling',
  'network',
]);

function fixedNow() {
  return FIXED_NOW;
}

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertObjectLike(value, label) {
  assert.notEqual(value, null, `${label} must not be null`);
  assert.equal(typeof value, 'object', `${label} must be object-like`);
  assert.equal(Array.isArray(value), false, `${label} must not be an array`);
}

function assertJsonSerializable(value, label) {
  const serialized = JSON.stringify(value);
  assert.notEqual(serialized, undefined, `${label} must be JSON-serializable`);
  JSON.parse(serialized);
  return serialized;
}

function assertNoForbiddenPublicLeakTerms(value, label) {
  const serialized = assertJsonSerializable(value, label);
  const normalizedSerialized = normalizeForLeakScan(serialized);

  for (const forbiddenTerm of FORBIDDEN_PUBLIC_LEAK_TERMS) {
    assert.equal(
      normalizedSerialized.includes(normalizeForLeakScan(forbiddenTerm)),
      false,
      `${label} serialized output exposes forbidden term ${forbiddenTerm}`,
    );
  }

  const queue = [value];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      const normalizedKey = normalizeForLeakScan(key);
      for (const forbiddenTerm of FORBIDDEN_PUBLIC_LEAK_TERMS) {
        assert.notEqual(
          normalizedKey,
          normalizeForLeakScan(forbiddenTerm),
          `${label} exposes forbidden public field ${key}`,
        );
      }

      if (nestedValue !== null && typeof nestedValue === 'object') {
        queue.push(nestedValue);
      }
    }
  }
}

function assertNoForbiddenPublicLeakTermsForAll(samples) {
  for (const [label, value] of Object.entries(samples)) {
    assertNoForbiddenPublicLeakTerms(value, label);
  }
}

function assertCoreEnvelope(envelope, label) {
  assertObjectLike(envelope, label);
  assert.equal(envelope.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);
  assert.equal(typeof envelope.ok, 'boolean');
  assertJsonSerializable(envelope, label);
}

function createFakeAgentControlHost() {
  const surface = Object.freeze({
    contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
    agentRef: REFS.agentRef,
    workspaceRef: REFS.workspaceRef,
    displayName: 'W12D Core Callback Host',
    topicTitle: 'W12D Core Callback Host',
    helpText: 'Deterministic fake surface for W12D token lifecycle proof.',
    availability: 'active',
    commands: Object.freeze([]),
  });

  return Object.freeze({
    listAgentSurfaces() {
      return ok(Object.freeze([surface]));
    },
    getAgentSurface() {
      return ok(surface);
    },
    dispatch(action) {
      return Promise.resolve(ok(Object.freeze({
        contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
        agentRef: action.agentRef ?? surface.agentRef,
        workspaceRef: action.workspaceRef ?? surface.workspaceRef,
        ...(action.sessionRef === undefined ? {} : { sessionRef: action.sessionRef }),
        outboundItems: Object.freeze([]),
        updatedAt: FIXED_NOW,
        executionContext: Object.freeze({
          contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
          workspaceRef: action.workspaceRef ?? surface.workspaceRef,
          preparedAt: FIXED_NOW,
        }),
      })));
    },
  });
}

function createRealCoreHostWithFakePorts() {
  return createCoreInteractionHost({
    agentControlHost: createFakeAgentControlHost(),
    sessionBindingStore: assertInMemoryHostSessionBindingStore({ now: fixedNow }),
    presentationOutboxStore: createInMemoryPresentationOutboxStore({ now: fixedNow }),
    presentationActionTokenStore: createInMemoryPresentationActionTokenStore({
      now: fixedNow,
      createTokenId: () => REFS.tokenRef.id,
    }),
    now: fixedNow,
    correlationId: 'correlation:w12d-real-core-host',
  });
}

function createIssueActionTokenInput() {
  return Object.freeze({
    contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
    tokenRef: REFS.tokenRef,
    workspaceRef: REFS.workspaceRef,
    outboxRef: REFS.outboxRef,
    approvalRef: REFS.approvalRef,
    actionId: ACTION_ID,
    issuedAt: FIXED_NOW,
    expiresAt: EXPIRES_AT,
    correlationId: 'correlation:w12d-token-issue',
    metadata: Object.freeze({ fixture: 'w12d', mode: 'fake-edge' }),
  });
}

function createFakeExternalCallbackPayload(tokenRef) {
  return Object.freeze({
    adapterKind: 'openclaw-telegram',
    callbackData: `hz:${tokenRef.id}`,
    actor: Object.freeze({
      actorRef: REFS.actorRef.id,
      displayName: 'W12D User',
    }),
    topic: Object.freeze({
      bindingRef: 'binding:w12d-topic',
      channelRef: 'channel:w12d',
      chatRef: 'chat:w12d',
      threadRef: 'thread:w12d',
    }),
    receivedAt: VERIFIED_AT,
    correlationRef: 'correlation:w12d-callback',
    rawTelegramCallback: Object.freeze({
      botToken: 'must-not-cross-core-boundary',
      apiKey: 'must-not-cross-core-boundary',
      storagePath: '/tmp/must-not-cross-core-boundary',
    }),
    rawOpenClawCallback: Object.freeze({
      rawRuntimePayload: Object.freeze({ stack: 'must-not-cross-core-boundary' }),
      secret: 'must-not-cross-core-boundary',
    }),
  });
}

function mapFakeCallbackToSafeTokenInputs(fakeCallback) {
  const parsed = parseOpenClawTelegramCallbackPayload(fakeCallback.callbackData);
  assert.equal(parsed.ok, true, parsed.ok ? undefined : JSON.stringify(parsed.error));
  assert.equal(parsed.value.tokenRef, REFS.tokenRef.id);

  const expectedContext = Object.freeze({
    workspaceRef: REFS.workspaceRef.id,
    agentRef: REFS.agentRef.id,
    actorRef: fakeCallback.actor.actorRef,
    hostSessionRef: REFS.sessionRef.id,
    outboxRef: REFS.outboxRef.id,
    approvalRef: REFS.approvalRef.id,
    actionRef: ACTION_ID,
    bindingRef: fakeCallback.topic.bindingRef,
    correlationRef: fakeCallback.correlationRef,
    detailsRef: 'details:w12d-callback',
  });

  const tokenBoundary = Object.freeze({
    contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
    tokenRef: Object.freeze({ id: parsed.value.tokenRef }),
    workspaceRef: REFS.workspaceRef,
    outboxRef: REFS.outboxRef,
    approvalRef: REFS.approvalRef,
    actionId: ACTION_ID,
  });

  return Object.freeze({
    parsedCallbackPayload: parsed.value,
    expectedContext,
    permissionInput: Object.freeze({
      actorRef: fakeCallback.actor.actorRef,
      workspaceRef: REFS.workspaceRef.id,
      agentRef: REFS.agentRef.id,
      actionRef: ACTION_ID,
      bindingRef: fakeCallback.topic.bindingRef,
      phase: 'before-token-consume',
    }),
    verifyInput: Object.freeze({
      ...tokenBoundary,
      verifiedAt: VERIFIED_AT,
    }),
    consumeInput: Object.freeze({
      ...tokenBoundary,
      consumedAt: CONSUMED_AT,
    }),
    replayConsumeInput: Object.freeze({
      ...tokenBoundary,
      consumedAt: REPLAY_AT,
    }),
    replayVerifyInput: Object.freeze({
      ...tokenBoundary,
      verifiedAt: REPLAY_AT,
    }),
  });
}

function evaluateFakePermission(permissionInput, sequence) {
  sequence.push('permission');
  assert.equal(permissionInput.phase, 'before-token-consume');
  assert.equal(permissionInput.actorRef, REFS.actorRef.id);
  assert.equal(permissionInput.workspaceRef, REFS.workspaceRef.id);

  return Object.freeze({
    status: 'allowed',
    actorRef: permissionInput.actorRef,
    actionRef: permissionInput.actionRef,
    checkedAt: VERIFIED_AT,
  });
}

async function consumeOnlyAfterPermissionAndVerification(coreHost, input, permission, verification, sequence) {
  assert.equal(permission.status, 'allowed');
  assert.equal(verification.ok, true);
  assert.equal(verification.value.verified, true);
  assert.deepEqual(sequence, ['permission', 'verify']);

  sequence.push('consume');
  return coreHost.consumeActionToken(input);
}

test('W12D exercises fake callback action-token lifecycle through the real public core host facade', async () => {
  const coreHost = createRealCoreHostWithFakePorts();
  assertObjectLike(coreHost, 'real core host facade');
  assert.equal(typeof coreHost.issueActionToken, 'function');
  assert.equal(typeof coreHost.verifyActionToken, 'function');
  assert.equal(typeof coreHost.consumeActionToken, 'function');

  const issueInput = createIssueActionTokenInput();
  assertNoForbiddenPublicLeakTerms(issueInput, 'issue token input');

  const issued = await coreHost.issueActionToken(issueInput);
  assertCoreEnvelope(issued, 'issued token envelope');
  assert.equal(issued.ok, true, issued.ok ? undefined : JSON.stringify(issued.error));
  assert.equal(issued.value.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);
  assert.equal(issued.value.tokenRef.id, REFS.tokenRef.id);
  assert.equal(issued.value.status, 'issued');
  assert.equal(issued.value.metadata, undefined);

  const fakeCallback = createFakeExternalCallbackPayload(issued.value.tokenRef);
  assert.equal(JSON.stringify(fakeCallback).includes('must-not-cross-core-boundary'), true);

  const safeInputs = mapFakeCallbackToSafeTokenInputs(fakeCallback);
  assert.equal(JSON.stringify(safeInputs).includes('must-not-cross-core-boundary'), false);
  assertNoForbiddenPublicLeakTermsForAll({
    parsedCallbackPayload: safeInputs.parsedCallbackPayload,
    expectedContext: safeInputs.expectedContext,
    permissionInput: safeInputs.permissionInput,
    verifyInput: safeInputs.verifyInput,
    consumeInput: safeInputs.consumeInput,
  });

  const sequence = [];
  const permission = evaluateFakePermission(safeInputs.permissionInput, sequence);
  const verified = await coreHost.verifyActionToken(safeInputs.verifyInput);
  sequence.push('verify');

  assertCoreEnvelope(verified, 'verified token envelope');
  assert.equal(verified.ok, true, verified.ok ? undefined : JSON.stringify(verified.error));
  assert.equal(verified.value.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);
  assert.equal(verified.value.tokenRef.id, REFS.tokenRef.id);
  assert.equal(verified.value.verified, true);
  assert.equal(verified.value.reason, 'valid');
  assert.equal(verified.value.status, 'issued');
  assert.equal(verified.value.token.status, 'issued');

  const consumed = await consumeOnlyAfterPermissionAndVerification(
    coreHost,
    safeInputs.consumeInput,
    permission,
    verified,
    sequence,
  );

  assertCoreEnvelope(consumed, 'consumed token envelope');
  assert.equal(consumed.ok, true, consumed.ok ? undefined : JSON.stringify(consumed.error));
  assert.equal(consumed.value.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);
  assert.equal(consumed.value.tokenRef.id, REFS.tokenRef.id);
  assert.equal(consumed.value.consumed, true);
  assert.equal(consumed.value.reason, 'consumed');
  assert.equal(consumed.value.status, 'consumed');
  assert.equal(consumed.value.token.status, 'consumed');
  assert.deepEqual(sequence, ['permission', 'verify', 'consume']);

  const replayVerify = await coreHost.verifyActionToken(safeInputs.replayVerifyInput);
  assertCoreEnvelope(replayVerify, 'replay verify envelope');
  assert.equal(replayVerify.ok, true, replayVerify.ok ? undefined : JSON.stringify(replayVerify.error));
  assert.equal(replayVerify.value.verified, false);
  assert.equal(replayVerify.value.reason, 'consumed');
  assert.equal(replayVerify.value.status, 'consumed');

  const replayConsume = await coreHost.consumeActionToken(safeInputs.replayConsumeInput);
  assertCoreEnvelope(replayConsume, 'replay consume envelope');
  assert.equal(replayConsume.ok, true, replayConsume.ok ? undefined : JSON.stringify(replayConsume.error));
  assert.equal(replayConsume.value.consumed, false);
  assert.equal(replayConsume.value.reason, 'replay');
  assert.equal(replayConsume.value.status, 'consumed');

  assertNoForbiddenPublicLeakTermsForAll({
    issued,
    issuedValue: issued.value,
    verified,
    verifiedValue: verified.value,
    consumed,
    consumedValue: consumed.value,
    replayVerify,
    replayVerifyValue: replayVerify.value,
    replayConsume,
    replayConsumeValue: replayConsume.value,
    permission,
  });
});
