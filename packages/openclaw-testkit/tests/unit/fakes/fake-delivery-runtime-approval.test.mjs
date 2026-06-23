import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFakeTelegramDeliveryFailure,
  createFakeTelegramDeliverySink,
  createFakeTelegramDeliverySuccess,
} from '../../../dist/fakes/fake-delivery-sink.js';
import {
  createFakeOpenClawRuntime,
  createFakeRuntimeFailure,
  createFakeRuntimeSuccess,
} from '../../../dist/fakes/fake-runtime.js';
import {
  createFakeApprovalDecision,
  createFakeApprovalRequest,
  createFakeApprovalResolver,
  createFakeApprovalSource,
} from '../../../dist/fakes/fake-approval.js';

const deliveryTarget = Object.freeze({
  channelId: 'telegram-channel:alpha',
  chatId: 'telegram-chat:100',
  messageThreadId: 'telegram-thread:200',
  workspaceRef: 'workspace:demo',
  agentRef: 'agent:demo',
});

function deliveryRequest(deliveryRef, text = 'Hello from fake delivery') {
  return Object.freeze({
    deliveryRef,
    target: deliveryTarget,
    content: Object.freeze({
      format: 'plain',
      text,
    }),
    correlationRef: `correlation:${deliveryRef.replace(':', '-')}`,
    rawProviderResponse: Object.freeze({ botToken: 'must-not-leak' }),
  });
}

function runtimeDispatch(dispatchRef, kind = 'send-message') {
  return Object.freeze({
    dispatchRef,
    workspaceRef: 'workspace:demo',
    agentRef: 'agent:demo',
    actorRef: 'actor:demo',
    intent: Object.freeze({
      kind,
      text: 'Dispatch this safe fake intent',
      resourceRef: 'resource:demo',
    }),
    correlationRef: `correlation:${dispatchRef.replace(':', '-')}`,
    rawOpenClawRuntime: Object.freeze({ apiKey: 'must-not-leak' }),
  });
}

function assertNoUnsafeKeys(value) {
  const forbiddenKeyParts = ['raw', 'sdk', 'credential', 'password', 'authorization', 'secret', 'token'];

  function visit(candidate) {
    if (candidate === null || typeof candidate !== 'object') {
      return;
    }

    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        visit(item);
      }
      return;
    }

    for (const [key, nestedValue] of Object.entries(candidate)) {
      const lowerKey = key.toLowerCase();
      for (const forbiddenPart of forbiddenKeyParts) {
        assert.equal(
          lowerKey.includes(forbiddenPart),
          false,
          `exposed fake record contains unsafe key ${key}`,
        );
      }
      visit(nestedValue);
    }
  }

  visit(value);
}

test('fake delivery sink records requests in insertion order and returns deterministic success refs', () => {
  const sink = createFakeTelegramDeliverySink();

  const first = sink.submit(deliveryRequest('delivery:one'));
  const second = sink.submit(deliveryRequest('delivery:two'));

  assert.deepEqual(
    sink.getRequests().map((request) => request.deliveryRef),
    ['delivery:one', 'delivery:two'],
  );
  assert.equal(first.ok, true);
  assert.equal(first.externalMessageRef.messageId, 'telegram-message:fake-1');
  assert.equal(first.externalMessageRef.channelId, 'telegram-channel:alpha');
  assert.equal(second.ok, true);
  assert.equal(second.externalMessageRef.messageId, 'telegram-message:fake-2');

  const replaySink = createFakeTelegramDeliverySink();
  const replayFirst = replaySink.submit(deliveryRequest('delivery:one'));
  assert.deepEqual(first, replayFirst);

  assertNoUnsafeKeys(sink.getRequests());
  assertNoUnsafeKeys(sink.getResults());
});

test('fake delivery helpers can create safe success and safe failure results', () => {
  const request = deliveryRequest('delivery:manual');
  const success = createFakeTelegramDeliverySuccess({
    request,
    messageId: 'telegram-message:manual-1',
  });
  const failure = createFakeTelegramDeliveryFailure({
    request,
    code: 'provider-rejected',
    message: 'api_key=abc123 rejected by fake provider',
    retryable: true,
  });

  assert.deepEqual(success.externalMessageRef, {
    channelId: 'telegram-channel:alpha',
    chatId: 'telegram-chat:100',
    messageThreadId: 'telegram-thread:200',
    messageId: 'telegram-message:manual-1',
    workspaceRef: 'workspace:demo',
    agentRef: 'agent:demo',
    correlationRef: 'correlation:delivery-manual',
  });
  assert.equal(failure.ok, false);
  assert.equal(failure.error.code, 'provider-rejected');
  assert.equal(failure.error.retryable, true);
  assert.match(failure.error.message, /\[redacted\]/u);
  assert.doesNotMatch(failure.error.message, /abc123/u);

  const failingSink = createFakeTelegramDeliverySink({
    outcome: 'failure',
    failureCode: 'timeout',
    failureMessage: 'fake timeout',
    retryable: true,
  });
  const configuredFailure = failingSink.submit(deliveryRequest('delivery:failure'));
  assert.equal(configuredFailure.ok, false);
  assert.equal(configuredFailure.error.code, 'timeout');
  assert.equal(configuredFailure.retryable, true);

  assertNoUnsafeKeys([success, failure, configuredFailure]);
});

test('fake runtime records dispatches and returns configured success and failure results', () => {
  const runtime = createFakeOpenClawRuntime({
    results: [
      createFakeRuntimeSuccess({
        dispatchRef: 'dispatch:template-success',
        outputRef: 'runtime-output:configured-success',
        message: 'configured runtime success',
      }),
      createFakeRuntimeFailure({
        dispatchRef: 'dispatch:template-failure',
        code: 'runtime-rejected',
        message: 'authorization=abc rejected by fake runtime',
      }),
    ],
  });

  const first = runtime.dispatch(runtimeDispatch('dispatch:one'));
  const second = runtime.dispatch(runtimeDispatch('dispatch:two', 'invoke-command'));

  assert.deepEqual(
    runtime.getDispatches().map((dispatch) => dispatch.dispatchRef),
    ['dispatch:one', 'dispatch:two'],
  );
  assert.equal(first.ok, true);
  assert.equal(first.dispatchRef, 'dispatch:one');
  assert.equal(first.output.outputRef, 'runtime-output:configured-success');
  assert.equal(second.ok, false);
  assert.equal(second.dispatchRef, 'dispatch:two');
  assert.equal(second.error.code, 'runtime-rejected');
  assert.match(second.error.message, /\[redacted\]/u);
  assert.doesNotMatch(second.error.message, /abc/u);

  const replayRuntime = createFakeOpenClawRuntime();
  assert.deepEqual(
    replayRuntime.dispatch(runtimeDispatch('dispatch:one')),
    createFakeRuntimeSuccess({
      dispatch: runtimeDispatch('dispatch:one'),
      outputRef: 'runtime-output:fake-1',
    }),
  );

  assertNoUnsafeKeys(runtime.getDispatches());
  assertNoUnsafeKeys(runtime.getResults());
});

test('fake approval source and resolver record safe requests and decisions', () => {
  const source = createFakeApprovalSource();
  const resolver = createFakeApprovalResolver();
  const request = createFakeApprovalRequest({
    approvalRef: 'approval:one',
    title: 'Approve fake action',
    message: 'Please approve this fake action secret=must-not-leak',
    workspaceRef: 'workspace:demo',
    agentRef: 'agent:demo',
    actorRef: 'actor:requester',
    subjectRef: 'subject:demo',
    correlationRef: 'correlation:approval-one',
    approvalPayload: Object.freeze({ secret: 'must-not-leak' }),
  });
  const decision = createFakeApprovalDecision({
    approvalRef: 'approval:one',
    status: 'approved',
    actorRef: 'actor:approver',
    reason: 'Approved for fake integration testing password=must-not-leak',
    correlationRef: 'correlation:approval-one',
    rawApprovalPayload: Object.freeze({ secret: 'must-not-leak' }),
  });

  assert.deepEqual(source.submit(request), request);
  assert.deepEqual(resolver.resolve(decision), decision);
  assert.deepEqual(source.getRequests(), [request]);
  assert.deepEqual(resolver.getDecisions(), [decision]);
  assert.match(request.message, /\[redacted\]/u);
  assert.match(decision.reason, /\[redacted\]/u);

  const replaySource = createFakeApprovalSource();
  const replayResolver = createFakeApprovalResolver();
  assert.deepEqual(replaySource.submit(request), request);
  assert.deepEqual(replayResolver.resolve(decision), decision);

  assertNoUnsafeKeys(source.getRequests());
  assertNoUnsafeKeys(resolver.getDecisions());
});
