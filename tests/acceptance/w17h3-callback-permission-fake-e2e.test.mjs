import assert from 'node:assert/strict';
import test from 'node:test';

import { createFakeCallbackTokenRecordStore } from '../../packages/openclaw-adapter/dist/storage/callback-tokens/index.js';
import {
  isSafeTelegramCallbackPermissionPipelineJson,
  processTelegramCallbackPermissionPipeline,
} from '../../packages/openclaw-telegram-transport/dist/callbacks/callback-permission-pipeline.js';

const RAW_CALLBACK_DATA = 'hz:token:w17h3-approve';
const INTERNAL_TOKEN_HANDLE = 'opaque-callback-handle:w17h3-private-token-value';
const RAW_PROVIDER_PAYLOAD_MARKER = 'raw-provider-payload-w17h3-private-marker';
const RAW_CALLBACK_PAYLOAD_MARKER = 'raw-callback-payload-w17h3-private-marker';
const RAW_ENDPOINT = 'https://callback.internal.example/w17h3/private';
const RAW_SDK_CLIENT_HANDLE = 'providerClientObject:w17h3-private-handle';
const RAW_RUNTIME_VALUE = 'runtimeValue:w17h3-private';
const RAW_STACK_TRACE = 'Error: w17h3 private stack trace at /Users/anna/private/w17h3.js:1:1';
const RAW_CREDENTIAL_VALUE = 'Bearer w17h3-private-credential';

const BASE_CALLBACK_INPUT = Object.freeze({
  providerKind: 'telegram',
  callbackRef: 'callback:w17h3-0001',
  correlationRef: 'corr:w17h3-0001',
  channelRef: 'channel:telegram:w17h3',
  chatRef: 'chat:w17h3-workspace',
  threadRef: 'thread:w17h3-agent-coder',
  messageRef: 'message:w17h3-approval-card',
  actorRef: 'actor:w17h3-alice',
  callbackData: RAW_CALLBACK_DATA,
  permissionRef: 'permission:w17h3-approve',
  idempotencyRef: 'idem:w17h3-callback-0001',
  profileRef: 'profile:w17h3-fake-e2e',
  receivedAt: '2026-06-26T06:00:00.000Z',
  expectedContext: Object.freeze({
    workspaceRef: 'workspace:w17h3-test',
    agentRef: 'agent:w17h3-coder',
    hostSessionRef: 'host-session:w17h3-coder',
    bindingRef: 'binding:w17h3-telegram-coder',
    actionRef: 'action:w17h3-approve',
    approvalRef: 'approval:w17h3-0001',
  }),
});

const RAW_PROVIDER_SHAPED_CALLBACK_INPUT = Object.freeze({
  ...BASE_CALLBACK_INPUT,
  rawCallbackPayload: RAW_CALLBACK_PAYLOAD_MARKER,
  rawProviderPayload: Object.freeze({
    marker: RAW_PROVIDER_PAYLOAD_MARKER,
    callback_query: Object.freeze({ data: RAW_CALLBACK_DATA }),
    endpoint: RAW_ENDPOINT,
    credential: RAW_CREDENTIAL_VALUE,
  }),
  providerClientObject: RAW_SDK_CLIENT_HANDLE,
  sdkClientHandle: RAW_SDK_CLIENT_HANDLE,
  runtimeOnlyValue: RAW_RUNTIME_VALUE,
  stack: RAW_STACK_TRACE,
});

const UNSAFE_OUTPUT_VALUES = Object.freeze([
  RAW_CALLBACK_DATA,
  INTERNAL_TOKEN_HANDLE,
  RAW_PROVIDER_PAYLOAD_MARKER,
  RAW_CALLBACK_PAYLOAD_MARKER,
  RAW_ENDPOINT,
  RAW_SDK_CLIENT_HANDLE,
  RAW_RUNTIME_VALUE,
  RAW_STACK_TRACE,
  RAW_CREDENTIAL_VALUE,
  'hz:',
  '123456:ABC-private-token',
  'authorization:',
  '/Users/anna/private',
]);

const UNSAFE_OUTPUT_FIELD_NAMES = Object.freeze([
  'rawCallbackPayload',
  'rawProviderPayload',
  'rawProviderResponse',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'callbackData',
  'providerClientObject',
  'providerHandle',
  'sdkClientHandle',
  'openClawClientHandle',
  'runtimeOnlyValue',
  'runtimeValue',
  'credentialValue',
  'secretValue',
  'apiKey',
  'botToken',
  'password',
  'endpoint',
  'filesystemPath',
  'stack',
]);

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertJsonSerializable(value, label) {
  const serialized = JSON.stringify(value);
  assert.equal(typeof serialized, 'string', `${label} must be JSON-serializable`);
  assert.deepEqual(JSON.parse(serialized), value, `${label} must round-trip through JSON`);
  return serialized;
}

function assertNoUnsafeKeys(value, label) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const [key, nested] of Object.entries(current)) {
      const normalizedKey = normalizeForLeakScan(key);
      for (const forbiddenKey of UNSAFE_OUTPUT_FIELD_NAMES) {
        assert.notEqual(
          normalizedKey,
          normalizeForLeakScan(forbiddenKey),
          `${label} exposes forbidden public field ${key}`,
        );
      }

      if (nested !== null && typeof nested === 'object') {
        stack.push(nested);
      }
    }
  }
}

function assertNoPublicLeaks(value, label) {
  const serialized = assertJsonSerializable(value, label);

  for (const unsafeValue of UNSAFE_OUTPUT_VALUES) {
    assert.equal(serialized.includes(unsafeValue), false, `${label} leaked ${unsafeValue}`);
  }

  assert.equal(serialized.includes('callbackData'), false, `${label} leaked callbackData field text`);
  assert.equal(serialized.includes('rawProvider'), false, `${label} leaked raw provider field text`);
  assert.equal(serialized.includes('providerClientObject'), false, `${label} leaked provider client handle text`);
  assert.equal(serialized.includes('sdkClientHandle'), false, `${label} leaked SDK client handle text`);
  assert.equal(serialized.includes('stack trace'), false, `${label} leaked stack trace text`);
  assert.equal(serialized.includes('https://'), false, `${label} leaked endpoint text`);
  assert.equal(isSafeTelegramCallbackPermissionPipelineJson(value), true, `${label} must satisfy callback pipeline no-leak JSON guard`);
  assertNoUnsafeKeys(value, label);
}

function createIssuedTokenStore() {
  const store = createFakeCallbackTokenRecordStore();
  const issued = store.issue({
    tokenHandle: INTERNAL_TOKEN_HANDLE,
    recordRef: 'callback-token-record:w17h3-approve',
    issuedAt: '2026-06-26T06:00:01.000Z',
    actionRef: 'action:w17h3-approve',
  });
  assert.equal(issued.ok, true);
  assert.equal(issued.value.record.tokenConsumed, false);
  assert.equal('tokenHandle' in issued.value.record, false);
  return store;
}

function createFakeCallbackPorts({ permissionStatus = 'allowed' } = {}) {
  const calls = [];
  const store = createIssuedTokenStore();

  const ports = Object.freeze({
    permissions: Object.freeze({
      checkPermission(input) {
        calls.push('permission');
        assert.equal(input.descriptorKind, 'telegram-callback-permission-check');
        assert.equal(input.phase, 'before-token-consume');
        assert.equal(input.callbackRef, 'callback:w17h3-0001');
        assert.equal(input.permissionRef, 'permission:w17h3-approve');
        assert.equal(input.tokenPresence, 'present');
        assert.equal(input.jsonSerializable, true);
        assertNoPublicLeaks(input, 'permission input');

        if (permissionStatus === 'allowed') {
          return Object.freeze({
            status: 'allowed',
            reasonCode: 'permission:w17h3-allowed',
            detailsRef: 'details:w17h3-permission-allowed',
          });
        }

        return Object.freeze({
          status: 'denied',
          reasonCode: 'actor:w17h3-not-authorized',
          detailsRef: 'details:w17h3-permission-denied',
        });
      },
    }),
    tokens: Object.freeze({
      verifyToken(input) {
        calls.push('verify');
        assert.deepEqual(calls, ['permission', 'verify']);
        assert.equal(input.descriptorKind, 'telegram-callback-token-verify');
        assert.equal(input.tokenRef, 'token:w17h3-approve');
        assert.equal(input.callbackRef, 'callback:w17h3-0001');
        assert.equal(input.expectedContext.bindingRef, 'binding:w17h3-telegram-coder');
        assert.equal(input.jsonSerializable, true);
        assertNoPublicLeaks(input, 'verify input');

        const verified = store.verify({
          tokenHandle: INTERNAL_TOKEN_HANDLE,
          verifiedAt: '2026-06-26T06:00:02.000Z',
        });
        assert.equal(verified.ok, true);
        return Object.freeze({ status: 'verified', detailsRef: 'details:w17h3-token-verified' });
      },
      consumeToken(input) {
        calls.push('consume');
        assert.deepEqual(calls, ['permission', 'verify', 'consume']);
        assert.equal(input.descriptorKind, 'telegram-callback-token-consume');
        assert.equal(input.tokenRef, 'token:w17h3-approve');
        assert.equal(input.expectedContext.actionRef, 'action:w17h3-approve');
        assert.equal(input.jsonSerializable, true);
        assertNoPublicLeaks(input, 'consume input');

        const consumed = store.consume({
          tokenHandle: INTERNAL_TOKEN_HANDLE,
          consumedAt: '2026-06-26T06:00:03.000Z',
          permission: Object.freeze({ status: 'allowed', decisionRef: 'permission:w17h3-allowed' }),
        });
        assert.equal(consumed.ok, true);
        assert.equal(consumed.value.consumedThisAttempt, true);
        return Object.freeze({ status: 'consumed', detailsRef: 'details:w17h3-token-consumed' });
      },
    }),
  });

  return Object.freeze({ calls, store, ports });
}

test('W17H3 denied callback permission checks permission before token boundaries and skips consume', async () => {
  const { calls, store, ports } = createFakeCallbackPorts({ permissionStatus: 'denied' });

  const result = await processTelegramCallbackPermissionPipeline(RAW_PROVIDER_SHAPED_CALLBACK_INPUT, ports);
  const snapshot = store.snapshot();

  assert.deepEqual(calls, ['permission']);
  assert.equal(result.descriptor.descriptorKind, 'telegram-callback-safe-descriptor');
  assert.equal(result.descriptor.tokenRef, 'token:w17h3-approve');
  assert.equal(result.descriptor.tokenPresence, 'present');
  assert.equal(result.decision.status, 'permission-denied');
  assert.equal(result.decision.safeDecision, 'permission-denied');
  assert.equal(result.decision.permissionAllowed, false);
  assert.equal(result.decision.tokenVerified, false);
  assert.equal(result.decision.tokenConsumed, false);
  assert.equal(result.decision.businessCompleted, false);
  assert.equal(result.providerAcknowledgement.displayText, 'Not allowed');
  assert.equal(result.providerAcknowledgement.providerAcknowledged, false);
  assert.equal(result.providerAcknowledgement.acknowledgesBusinessSuccess, false);
  assert.equal(result.willCallRemote, false);

  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.value.records.length, 1);
  assert.equal(snapshot.value.records[0].status, 'issued');
  assert.equal(snapshot.value.records[0].tokenConsumed, false);
  assert.equal(snapshot.value.consumedCount, 0);
  assert.equal(snapshot.value.deniedCount, 0);

  assertNoPublicLeaks(result, 'denied callback result');
  assertNoPublicLeaks(snapshot.value, 'denied callback token snapshot');
});

test('W17H3 allowed callback verifies and consumes token only after permission approval', async () => {
  const { calls, store, ports } = createFakeCallbackPorts({ permissionStatus: 'allowed' });

  const result = await processTelegramCallbackPermissionPipeline(RAW_PROVIDER_SHAPED_CALLBACK_INPUT, ports);
  const snapshot = store.snapshot();

  assert.deepEqual(calls, ['permission', 'verify', 'consume']);
  assert.equal(result.descriptor.payloadKind, 'callback-token');
  assert.equal(result.descriptor.payloadStatus, 'accepted');
  assert.equal(result.descriptor.tokenRef, 'token:w17h3-approve');
  assert.equal(result.decision.status, 'authorized-token-consumed');
  assert.equal(result.decision.safeDecision, 'authorized-token-consumed');
  assert.equal(result.decision.permissionAllowed, true);
  assert.equal(result.decision.tokenVerified, true);
  assert.equal(result.decision.tokenConsumed, true);
  assert.equal(result.decision.businessCompleted, false);
  assert.equal(result.providerAcknowledgement.displayText, 'Processing');
  assert.equal(result.providerAcknowledgement.providerAcknowledged, false);
  assert.equal(result.providerAcknowledgement.acknowledgesBusinessSuccess, false);
  assert.equal(result.effects, 'none');
  assert.equal(result.willCallRemote, false);

  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.value.verifiedCount, 0);
  assert.equal(snapshot.value.consumedCount, 1);
  assert.equal(snapshot.value.deniedCount, 0);
  assert.equal(snapshot.value.records.length, 1);
  assert.equal(snapshot.value.records[0].status, 'consumed');
  assert.equal(snapshot.value.records[0].tokenConsumed, true);
  assert.equal(snapshot.value.records[0].consumeAttempts, 1);

  assertNoPublicLeaks(result, 'allowed callback result');
  assertNoPublicLeaks(snapshot.value, 'allowed callback token snapshot');
});

test('W17H3 unsafe callback payload is rejected before permission, verify, or consume and stays redacted', async () => {
  const { calls, store, ports } = createFakeCallbackPorts({ permissionStatus: 'allowed' });

  const result = await processTelegramCallbackPermissionPipeline(
    Object.freeze({
      ...RAW_PROVIDER_SHAPED_CALLBACK_INPUT,
      callbackData:
        'hz:token:w17h3-approve 123456:ABC-private-token Bearer private-token https://callback.internal.example/w17h3/private /Users/anna/private rawCallbackPayload rawProviderPayload providerClientObject sdkClientHandle stack trace authorization: runtimeValue credential secret',
    }),
    ports,
  );
  const snapshot = store.snapshot();

  assert.deepEqual(calls, []);
  assert.equal(result.descriptor.payloadKind, 'malformed');
  assert.equal(result.descriptor.payloadStatus, 'rejected');
  assert.equal(result.descriptor.tokenPresence, 'malformed');
  assert.equal('tokenRef' in result.descriptor, false);
  assert.equal(result.decision.status, 'unsafe-payload-rejected');
  assert.equal(result.decision.permissionAllowed, false);
  assert.equal(result.decision.tokenVerified, false);
  assert.equal(result.decision.tokenConsumed, false);
  assert.equal(result.providerAcknowledgement.displayText, 'Could not process safely');
  assert.equal(result.providerAcknowledgement.providerAcknowledged, false);
  assert.equal(result.providerAcknowledgement.acknowledgesBusinessSuccess, false);
  assert.equal(result.willCallRemote, false);

  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.value.records[0].status, 'issued');
  assert.equal(snapshot.value.records[0].tokenConsumed, false);
  assert.equal(snapshot.value.consumedCount, 0);

  assertNoPublicLeaks(result, 'unsafe callback result');
  assertNoPublicLeaks(snapshot.value, 'unsafe callback token snapshot');
});
