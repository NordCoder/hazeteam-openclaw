import assert from 'node:assert/strict';
import test from 'node:test';

import * as contracts from '../../dist/contracts/index.js';
import * as root from '../../dist/index.js';

const rootExports = [
  'OPENCLAW_ADAPTER_PACKAGE',
  'createOpenClawAdapterRef',
  'createWorkspaceRef',
  'createAgentRef',
  'createActorRef',
  'createAdapterOperationRef',
  'createAdapterCorrelationRef',
  'createAdapterRawDebugRef',
  'createAdapterDetailsRef',
  'isOpenClawAdapterRef',
  'parseOpenClawAdapterRef',
  'createAdapterOperationContext',
  'adapterOk',
  'adapterErr',
  'isAdapterOk',
  'isAdapterErr',
  'createAdapterSafeError',
  'isOpenClawTelegramMessageEvent',
  'isOpenClawTelegramCallbackEvent',
  'isOpenClawTelegramSystemEvent',
  'createTelegramActionButtonPayload',
  'isTelegramActionButtonPayload',
  'createTelegramActionButton',
  'createTelegramExternalMessageRef',
  'createTelegramDeliverySafeError',
  'createAdapterReadinessCheck',
  'summarizeAdapterReadiness',
  'createAdapterIdempotencyKey',
  'createInboundMessageIdempotencyKey',
  'createCallbackIdempotencyKey',
  'createDeliveryAttemptIdempotencyKey',
  'isAdapterIdempotencyKey',
  'allowPermission',
  'denyPermission',
  'isPermissionAllowed',
  'isPermissionDenied',
];

const contractExports = rootExports.filter((name) => name !== 'OPENCLAW_ADAPTER_PACKAGE');

function assertExports(label, moduleExports, names) {
  for (const name of names) {
    assert.equal(name in moduleExports, true, `${label} missing ${name}`);
    assert.notEqual(moduleExports[name], undefined, `${label} ${name} should be defined`);
  }
}

test('root barrel exposes consolidated S01 and S02 runtime helpers', () => {
  assertExports('root', root, rootExports);

  const actionRef = ['token', 'approve'].join(':');
  const inboundInput = { channelId: 'ch', chatId: 'chat', messageId: 'msg' };

  assert.equal(root.createWorkspaceRef('acme'), 'workspace:acme');
  assert.equal(root.isOpenClawTelegramMessageEvent({ eventKind: 'message' }), true);
  assert.equal(root.createTelegramActionButtonPayload(actionRef), `hz:${actionRef}`);
  assert.equal(root.summarizeAdapterReadiness({ checks: [] }).status, 'unknown');
  assert.equal(root.createInboundMessageIdempotencyKey(inboundInput), root.createInboundMessageIdempotencyKey(inboundInput));
  assert.equal(root.isPermissionAllowed(root.allowPermission({ action: 'send-message', resourceKind: 'topic' })), true);
});

test('contracts barrel exposes consolidated S01 and S02 runtime helpers', () => {
  assertExports('contracts', contracts, contractExports);

  const actionRef = ['token', 'approve'].join(':');
  const inboundInput = { channelId: 'ch', chatId: 'chat', messageId: 'msg' };

  assert.equal(contracts.createWorkspaceRef('acme'), 'workspace:acme');
  assert.equal(contracts.isOpenClawTelegramMessageEvent({ eventKind: 'message' }), true);
  assert.equal(contracts.createTelegramActionButtonPayload(actionRef), `hz:${actionRef}`);
  assert.equal(contracts.summarizeAdapterReadiness({ checks: [] }).status, 'unknown');
  assert.equal(contracts.createInboundMessageIdempotencyKey(inboundInput), contracts.createInboundMessageIdempotencyKey(inboundInput));
  assert.equal(contracts.isPermissionAllowed(contracts.allowPermission({ action: 'send-message', resourceKind: 'topic' })), true);
});
