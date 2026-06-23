import assert from 'node:assert/strict';
import test from 'node:test';

import * as root from '../../dist/index.js';

const expectedRuntimeExports = [
  'OPENCLAW_TESTKIT_PACKAGE',
  'createFakeApprovalDecision',
  'createFakeApprovalRequest',
  'createFakeApprovalResolver',
  'createFakeApprovalSource',
  'createFakeOpenClawRuntime',
  'createFakeRuntimeFailure',
  'createFakeRuntimeSuccess',
  'createFakeTelegramDeliveryFailure',
  'createFakeTelegramDeliverySink',
  'createFakeTelegramDeliverySuccess',
  'createTestTelegramActorRef',
  'createTestTelegramCallbackEvent',
  'createTestTelegramCallbackId',
  'createTestTelegramChannelId',
  'createTestTelegramChannelRef',
  'createTestTelegramChatId',
  'createTestTelegramExternalMessageRef',
  'createTestTelegramForumTopicRef',
  'createTestTelegramMessageEvent',
  'createTestTelegramMessageId',
  'createTestTelegramMessageThreadId',
  'createTestTelegramSystemEvent',
];

const deliveryTarget = Object.freeze({
  channelId: 'telegram-channel:public-barrel',
  chatId: 'telegram-chat:public-barrel',
  messageThreadId: 'telegram-thread:public-barrel',
});

test('@hazeteam/openclaw-testkit root exports Wave 3 event factories and fakes', () => {
  for (const exportName of expectedRuntimeExports) {
    assert.equal(exportName in root, true, `missing testkit root export ${exportName}`);
  }

  assert.equal(root.OPENCLAW_TESTKIT_PACKAGE.status, 'skeleton');

  const messageEvent = root.createTestTelegramMessageEvent({ text: 'from public barrel' });
  const callbackEvent = root.createTestTelegramCallbackEvent({ callbackPayload: 'opaque-public-callback' });
  const systemEvent = root.createTestTelegramSystemEvent({ systemEventKind: 'topic-renamed' });

  assert.equal(messageEvent.eventKind, 'message');
  assert.equal(messageEvent.text, 'from public barrel');
  assert.equal(callbackEvent.callbackPayload, 'opaque-public-callback');
  assert.equal(systemEvent.systemEventKind, 'topic-renamed');
  assert.equal(root.createTestTelegramChannelId('channel-public'), 'channel-public');
  assert.equal(root.createTestTelegramChatId('chat-public'), 'chat-public');
  assert.equal(root.createTestTelegramMessageThreadId('thread-public'), 'thread-public');
  assert.equal(root.createTestTelegramMessageId('message-public'), 'message-public');
  assert.equal(root.createTestTelegramCallbackId('callback-public'), 'callback-public');
  assert.deepEqual(root.createTestTelegramChannelRef({ channelId: 'channel-public' }), {
    channelId: 'channel-public',
  });
  assert.deepEqual(root.createTestTelegramForumTopicRef({ topicName: 'Public topic' }).topicName, 'Public topic');
  assert.deepEqual(root.createTestTelegramExternalMessageRef({ messageId: 'message-public' }).messageId, 'message-public');
  assert.deepEqual(root.createTestTelegramActorRef({ actorRef: 'actor:public' }).actorRef, 'actor:public');
});

test('@hazeteam/openclaw-testkit root exports fake delivery, runtime, and approval primitives', () => {
  const deliverySink = root.createFakeTelegramDeliverySink();
  const deliveryRequest = Object.freeze({
    deliveryRef: 'delivery:public-barrel',
    target: deliveryTarget,
    content: Object.freeze({
      format: 'plain',
      text: 'from public barrel',
    }),
  });
  const deliverySuccess = root.createFakeTelegramDeliverySuccess({
    deliveryRef: 'delivery:manual-success',
    target: deliveryTarget,
    messageId: 'telegram-message:manual-success',
  });
  const deliveryFailure = root.createFakeTelegramDeliveryFailure({
    deliveryRef: 'delivery:manual-failure',
    code: 'timeout',
    message: 'fake timeout',
    retryable: true,
  });

  assert.equal(deliverySink.submit(deliveryRequest).ok, true);
  assert.equal(deliverySuccess.externalMessageRef.messageId, 'telegram-message:manual-success');
  assert.equal(deliveryFailure.error.code, 'timeout');

  const runtime = root.createFakeOpenClawRuntime();
  const dispatch = Object.freeze({
    dispatchRef: 'dispatch:public-barrel',
    intent: Object.freeze({
      kind: 'send-message',
      text: 'from public barrel',
    }),
  });
  const runtimeSuccess = root.createFakeRuntimeSuccess({
    dispatchRef: 'dispatch:manual-success',
    outputRef: 'runtime-output:manual-success',
  });
  const runtimeFailure = root.createFakeRuntimeFailure({
    dispatchRef: 'dispatch:manual-failure',
    code: 'runtime-rejected',
    message: 'fake rejection',
  });

  assert.equal(runtime.dispatch(dispatch).ok, true);
  assert.equal(runtimeSuccess.output.outputRef, 'runtime-output:manual-success');
  assert.equal(runtimeFailure.error.code, 'runtime-rejected');

  const approvalRequest = root.createFakeApprovalRequest({
    approvalRef: 'approval:public-barrel',
    title: 'Approve public barrel action',
    message: 'safe public barrel request',
  });
  const approvalDecision = root.createFakeApprovalDecision({
    approvalRef: 'approval:public-barrel',
    status: 'approved',
    reason: 'safe approval',
  });
  const approvalSource = root.createFakeApprovalSource();
  const approvalResolver = root.createFakeApprovalResolver();

  assert.deepEqual(approvalSource.submit(approvalRequest), approvalRequest);
  assert.deepEqual(approvalResolver.resolve(approvalDecision), approvalDecision);
});
