import assert from 'node:assert/strict';
import test from 'node:test';

import * as contracts from '../../dist/contracts/index.js';
import * as root from '../../dist/index.js';

const expectedRuntimeExports = [
  'OPENCLAW_ADAPTER_PACKAGE',
  'adapterErr',
  'adapterOk',
  'allowPermission',
  'createActorRef',
  'createAdapterCorrelationRef',
  'createAdapterDetailsRef',
  'createAdapterIdempotencyKey',
  'createAdapterOperationContext',
  'createAdapterOperationRef',
  'createAdapterRawDebugRef',
  'createAdapterReadinessCheck',
  'createAdapterSafeError',
  'createAgentRef',
  'createCallbackIdempotencyKey',
  'createDeliveryAttemptIdempotencyKey',
  'createInboundMessageIdempotencyKey',
  'createOpenClawAdapterRef',
  'createTelegramActionButton',
  'createTelegramActionButtonPayload',
  'createTelegramDeliverySafeError',
  'createTelegramExternalMessageRef',
  'createWorkspaceRef',
  'denyPermission',
  'isAdapterErr',
  'isAdapterIdempotencyKey',
  'isAdapterOk',
  'isOpenClawAdapterRef',
  'isOpenClawTelegramCallbackEvent',
  'isOpenClawTelegramMessageEvent',
  'isOpenClawTelegramSystemEvent',
  'isPermissionAllowed',
  'isPermissionDenied',
  'isTelegramActionButtonPayload',
  'parseOpenClawAdapterRef',
  'summarizeAdapterReadiness',
];

test('root dist index exports shared, event, delivery, and support contract helpers', () => {
  for (const exportName of expectedRuntimeExports) {
    assert.equal(exportName in root, true, `missing root export ${exportName}`);
  }

  assert.equal(root.OPENCLAW_ADAPTER_PACKAGE.status, 'skeleton');
  assert.equal(root.createWorkspaceRef('acme'), 'workspace:acme');
  assert.equal(root.adapterOk('value').ok, true);
  assert.equal(root.isOpenClawTelegramMessageEvent({ eventKind: 'message' }), true);
  assert.equal(root.createTelegramActionButtonPayload('token:approve'), 'hz:token:approve');
  assert.equal(root.isTelegramActionButtonPayload('hz:token:approve'), true);
  assert.equal(root.summarizeAdapterReadiness({ checks: [] }).status, 'unknown');
  assert.equal(root.createAdapterIdempotencyKey('callback', ['safe']), 'callback:safe');
  assert.equal(root.isPermissionAllowed(root.allowPermission({ action: 'send-message', resourceKind: 'topic' })), true);
});

test('dist contracts barrel exports shared, event, delivery, and support contract helpers', () => {
  for (const exportName of expectedRuntimeExports.filter(
    (exportName) => exportName !== 'OPENCLAW_ADAPTER_PACKAGE',
  )) {
    assert.equal(exportName in contracts, true, `missing contracts export ${exportName}`);
  }

  assert.equal(contracts.createAdapterOperationRef('op-1'), 'operation:op-1');
  assert.equal(contracts.createAdapterSafeError({ code: 'not-found', message: 'missing' }).code, 'not-found');
  assert.equal(contracts.isOpenClawTelegramCallbackEvent({ eventKind: 'callback' }), true);
  assert.equal(
    contracts.createTelegramDeliverySafeError({ code: 'timeout', message: 'timed out' }).code,
    'timeout',
  );
  assert.equal(contracts.createInboundMessageIdempotencyKey({ channelId: 'ch', chatId: '1', messageId: '2' }), 'inbound-message:ch:1:thread-none:2');
  assert.equal(contracts.isPermissionDenied(contracts.denyPermission({ requirement: { action: 'consume-callback', resourceKind: 'callback' }, reason: 'no' })), true);
});
