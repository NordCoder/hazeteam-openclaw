import assert from 'node:assert/strict';
import test from 'node:test';

import * as binding from '../../dist/binding/index.js';
import * as commands from '../../dist/commands/index.js';
import * as contracts from '../../dist/contracts/index.js';
import * as root from '../../dist/index.js';

const expectedContractRuntimeExports = [
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

const expectedBindingRuntimeExports = [
  'cloneTopicBindingSnapshot',
  'createInMemoryTopicBindingStore',
  'createTopicBindingKey',
  'createTopicBindingSnapshot',
  'isTopicBindingStatus',
  'serializeTopicBindingKey',
];

const expectedCommandRuntimeExports = [
  'createCommandDescriptor',
  'createCommandDescriptorSet',
  'createTelegramActionButtonDescriptor',
  'createTelegramButtonGroupDescriptor',
  'createTelegramCardDescriptor',
  'createTelegramTextBlock',
  'findCommandDescriptor',
  'isCommandDescriptor',
  'isTelegramCardDescriptor',
];

const expectedRootRuntimeExports = [
  'OPENCLAW_ADAPTER_PACKAGE',
  ...expectedContractRuntimeExports,
  ...expectedBindingRuntimeExports,
  ...expectedCommandRuntimeExports,
];

test('root dist index exports shared, event, delivery, support, binding, and descriptor helpers', () => {
  for (const exportName of expectedRootRuntimeExports) {
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
  assert.equal(
    root.isPermissionAllowed(root.allowPermission({ action: 'send-message', resourceKind: 'topic' })),
    true,
  );
});

test('dist contracts barrel exports shared, event, delivery, and support contract helpers', () => {
  for (const exportName of expectedContractRuntimeExports) {
    assert.equal(exportName in contracts, true, `missing contracts export ${exportName}`);
  }

  assert.equal(contracts.createAdapterOperationRef('op-1'), 'operation:op-1');
  assert.equal(contracts.createAdapterSafeError({ code: 'not-found', message: 'missing' }).code, 'not-found');
  assert.equal(contracts.isOpenClawTelegramCallbackEvent({ eventKind: 'callback' }), true);
  assert.equal(
    contracts.createTelegramDeliverySafeError({ code: 'timeout', message: 'timed out' }).code,
    'timeout',
  );
  assert.equal(
    contracts.createInboundMessageIdempotencyKey({ channelId: 'ch', chatId: '1', messageId: '2' }),
    'inbound-message:ch:1:thread-none:2',
  );
  assert.equal(
    contracts.isPermissionDenied(
      contracts.denyPermission({
        requirement: { action: 'consume-callback', resourceKind: 'callback' },
        reason: 'no',
      }),
    ),
    true,
  );
});

test('dist binding barrel and root export topic binding helpers', () => {
  for (const exportName of expectedBindingRuntimeExports) {
    assert.equal(exportName in binding, true, `missing binding export ${exportName}`);
    assert.equal(exportName in root, true, `missing root binding export ${exportName}`);
  }

  const snapshot = root.createTopicBindingSnapshot({
    key: {
      workspaceId: 'workspace-alpha',
      channelId: 'channel-alpha',
      topicId: 'topic-alpha',
    },
    status: 'active',
    agentId: 'agent-alpha',
    sessionId: 'session-alpha',
    createdAtIso: '2026-01-01T00:00:00.000Z',
    updatedAtIso: '2026-01-01T00:00:00.000Z',
  });

  const store = binding.createInMemoryTopicBindingStore();
  store.upsert(snapshot);

  assert.equal(root.isTopicBindingStatus(snapshot.status), true);
  assert.equal(
    root.serializeTopicBindingKey(snapshot.key),
    'topic-binding:workspace=workspace-alpha:channel=channel-alpha:topic=topic-alpha',
  );
  assert.deepEqual(store.get(root.createTopicBindingKey(snapshot.key)), snapshot);
});

test('dist commands barrel and root export command and Telegram UI descriptor helpers', () => {
  for (const exportName of expectedCommandRuntimeExports) {
    assert.equal(exportName in commands, true, `missing commands export ${exportName}`);
    assert.equal(exportName in root, true, `missing root command export ${exportName}`);
  }

  const command = root.createCommandDescriptor({
    name: '/Start',
    title: 'Start session',
    aliases: ['begin'],
  });
  const commandSet = commands.createCommandDescriptorSet({
    commands: [command],
    defaultCommandName: 'start',
  });
  const textBlock = root.createTelegramTextBlock({ text: 'Ready', tone: 'strong' });
  const button = commands.createTelegramActionButtonDescriptor({
    label: 'Approve',
    payload: 'token:approve',
    style: 'primary',
  });
  const card = root.createTelegramCardDescriptor({
    title: 'Action required',
    intent: 'action-request',
    body: [textBlock],
    buttonGroups: [commands.createTelegramButtonGroupDescriptor({ buttons: [button] })],
  });
  const foundCommand = root.findCommandDescriptor(commandSet, '/begin');

  assert.equal(command.name, 'start');
  assert.equal(root.isCommandDescriptor(command), true);
  assert.equal(foundCommand?.name, command.name);
  assert.equal(button.payload, 'hz:token:approve');
  assert.equal(root.isTelegramCardDescriptor(card), true);
});
