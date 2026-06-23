import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES,
  REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES,
  adapterOk,
  allowPermission,
  createAdapterCoreHostFactory,
  createApprovalBridgeDecision,
  createApprovalBridgePermissionRequirement,
  createApprovalBridgeRequest,
  createInMemoryTopicBindingStore,
  createOpenClawRuntimeBridge,
  createTelegramDeliveryPump,
  createTelegramRenderDeliveryRequest,
  createTopicBindingSnapshot,
  denyPermission,
  evaluateOpenClawTelegramPermission,
  mapOpenClawTelegramInboundEvent,
  parseOpenClawTelegramCallbackPayload,
  renderSafePresentationLike,
  resolveApprovalBridgeDecision,
  runOpenClawTelegramCallbackTokenFlow,
  submitApprovalBridgeRequest,
} from '../../packages/openclaw-adapter/dist/index.js';
import {
  createFakeApprovalResolver,
  createFakeApprovalSource,
  createFakeOpenClawRuntime,
  createFakeRuntimeSuccess,
  createFakeTelegramDeliverySink,
} from '../../packages/openclaw-testkit/dist/index.js';

const FORBIDDEN_PUBLIC_OUTPUT_TERMS = [
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'toolPayload',
  'approvalPayload',
  'rawApprovalPayload',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
];

const refs = Object.freeze({
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
  actorRef: 'actor:telegram-user-42',
  operationRef: 'operation:w6a-inbound-1',
  correlationRef: 'correlation:w6a-correlation-1',
  detailsRef: 'details:w6a-details-1',
});

const telegramTopic = Object.freeze({
  channelId: 'telegram-channel:workspace-alpha',
  chatId: 'telegram-chat:chat-alpha',
  messageThreadId: 'telegram-thread:topic-alpha',
  topicName: 'Fake E2E Topic',
});

const externalMessageRef = Object.freeze({
  channelId: telegramTopic.channelId,
  chatId: telegramTopic.chatId,
  messageThreadId: telegramTopic.messageThreadId,
  messageId: 'telegram-message:inbound-1',
});

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertNoPublicLeaks(sample, label) {
  const serialized = JSON.stringify(sample);
  assert.notEqual(serialized, undefined, `${label} must be JSON-serializable`);

  const normalizedSerialized = normalizeForLeakScan(serialized);
  for (const forbiddenTerm of FORBIDDEN_PUBLIC_OUTPUT_TERMS) {
    assert.equal(
      normalizedSerialized.includes(normalizeForLeakScan(forbiddenTerm)),
      false,
      `${label} serialized output exposes forbidden term ${forbiddenTerm}`,
    );
  }

  const queue = [sample];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      const normalizedKey = normalizeForLeakScan(key);
      for (const forbiddenTerm of FORBIDDEN_PUBLIC_OUTPUT_TERMS) {
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

function assertNoPublicLeaksForAll(samples) {
  for (const [label, sample] of Object.entries(samples)) {
    assertNoPublicLeaks(sample, label);
  }
}

function createBindingSnapshot() {
  return createTopicBindingSnapshot({
    key: {
      workspaceId: 'workspace-alpha',
      channelId: telegramTopic.channelId,
      topicId: telegramTopic.messageThreadId,
    },
    status: 'active',
    agentId: 'coder',
    sessionId: 'session-alpha',
    createdAtIso: '2026-06-23T00:00:00.000Z',
    updatedAtIso: '2026-06-23T00:05:00.000Z',
    metadata: Object.freeze({ fixture: 'w6a' }),
  });
}

function createInboundMessageEvent(overrides = {}) {
  return Object.freeze({
    operationRef: refs.operationRef,
    correlationRef: refs.correlationRef,
    channelRef: Object.freeze({ channelId: telegramTopic.channelId }),
    topicRef: telegramTopic,
    actor: Object.freeze({
      actorRef: refs.actorRef,
      displayName: 'Ada Lovelace',
      username: 'ada_l',
    }),
    occurredAt: '2026-06-23T01:00:00.000Z',
    receivedAt: '2026-06-23T01:00:01.000Z',
    detailsRef: refs.detailsRef,
    rawDebugRef: 'raw-debug:w6a-inbound-debug',
    rawTelegramUpdate: Object.freeze({ botToken: 'must-not-cross-mapper-boundary' }),
    eventKind: 'message',
    externalMessageRef,
    text: '  hello fake e2e matrix  ',
    attachments: Object.freeze([
      Object.freeze({ kind: 'document', fileName: 'summary.txt', mimeType: 'text/plain', sizeBytes: 42 }),
    ]),
    ...overrides,
  });
}

function mapWithBinding(event) {
  const bindingStore = createInMemoryTopicBindingStore();
  const binding = bindingStore.upsert(createBindingSnapshot());

  return mapOpenClawTelegramInboundEvent({
    event,
    binding: bindingStore.get(binding.key),
  });
}

function createTrustedActor() {
  return Object.freeze({
    actorRef: refs.actorRef,
    trust: 'trusted',
  });
}

function createPermissionContext(mappedInbound, callbackTokenPhase = 'before-token-consume') {
  return Object.freeze({
    workspaceRef: mappedInbound.routing.workspaceRef,
    agentRef: mappedInbound.routing.agentRef,
    topic: Object.freeze({
      trust: 'trusted-binding',
      status: 'active',
      workspaceRef: mappedInbound.routing.workspaceRef,
      agentRef: mappedInbound.routing.agentRef,
    }),
    callbackTokenPhase,
    detailsRef: refs.detailsRef,
    correlationRef: mappedInbound.correlationRef,
  });
}

function createGrantFor(requirement, mappedInbound) {
  return Object.freeze({
    requirement: Object.freeze({
      action: requirement.action,
      resourceKind: requirement.resourceKind,
      actorRef: refs.actorRef,
      workspaceRef: mappedInbound.routing.workspaceRef,
      agentRef: mappedInbound.routing.agentRef,
    }),
  });
}

function createFakeCoreBoundary(mappedInbound) {
  const runtimeRequest = Object.freeze({
    dispatchRef: 'operation:w6a-runtime-1',
    workspaceRef: mappedInbound.routing.workspaceRef,
    agentRef: mappedInbound.routing.agentRef,
    actorRef: refs.actorRef,
    correlationRef: mappedInbound.correlationRef,
    detailsRef: 'details:w6a-runtime-1',
    intent: Object.freeze({
      kind: 'compose-reply',
      text: `Reply to ${mappedInbound.dispatch.text}`,
      resourceRef: mappedInbound.routing.hostSessionRef,
    }),
  });
  const presentation = Object.freeze({
    intent: 'command-result',
    title: 'Fake core response',
    body: Object.freeze([
      Object.freeze({ text: `Mapped ${mappedInbound.eventKind} for ${mappedInbound.routing.agentRef}.` }),
      Object.freeze({ text: 'Runtime and delivery remain injected fakes.', tone: 'muted' }),
    ]),
    buttonGroups: Object.freeze([
      Object.freeze({
        buttons: Object.freeze([
          Object.freeze({ label: 'Approve', payload: 'hz:token-callback-e2e-approve', style: 'primary' }),
        ]),
      }),
    ]),
  });
  const coreResponse = Object.freeze({
    ok: true,
    inboundRef: mappedInbound.operationRef,
    runtimeRequest,
    presentation,
  });
  const facade = Object.freeze(
    Object.fromEntries(
      REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES.map((methodName) => [
        methodName,
        (input) => {
          if (methodName === 'submitHostAction') {
            assert.equal(input.operationRef, mappedInbound.operationRef);
            assert.equal(input.routing.hostSessionRef, 'host-session:session-alpha');
            assert.equal(input.dispatch.text, 'hello fake e2e matrix');
            return coreResponse;
          }

          return adapterOk(Object.freeze({ methodName, fixture: 'unused-fake-core-method' }));
        },
      ]),
    ),
  );
  const ports = Object.freeze(
    Object.fromEntries(
      REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES.map((portName) => [
        portName,
        Object.freeze({ kind: `fake-${portName}` }),
      ]),
    ),
  );

  return Object.freeze({ facade, ports, coreResponse });
}

function createDeliveryTarget(mappedInbound) {
  return Object.freeze({
    channelId: mappedInbound.routing.telegramTopic.channelId,
    chatId: mappedInbound.routing.telegramTopic.chatId,
    messageThreadId: mappedInbound.routing.telegramTopic.messageThreadId,
    workspaceRef: mappedInbound.routing.workspaceRef,
    agentRef: mappedInbound.routing.agentRef,
  });
}

function createCallbackExpectedTokenContext(mappedInbound) {
  return Object.freeze({
    workspaceRef: mappedInbound.routing.workspaceRef,
    agentRef: mappedInbound.routing.agentRef,
    actionRef: 'callback-action:w6a-approve',
    outboxRef: 'outbox:w6a-rendered-response',
    bindingRef: 'binding:w6a-topic-binding',
  });
}

test('fake E2E path connects mapper, core host shell, runtime bridge, renderer, delivery pump, and readiness safely', () => {
  const mapped = mapWithBinding(createInboundMessageEvent());

  assert.equal(mapped.ok, true);
  assert.equal(mapped.value.routing.workspaceRef, 'workspace:workspace-alpha');
  assert.equal(mapped.value.routing.agentRef, 'agent:coder');
  assert.equal(mapped.value.routing.hostSessionRef, 'host-session:session-alpha');
  assert.equal(mapped.value.dispatch.text, 'hello fake e2e matrix');
  assert.equal(JSON.stringify(mapped.value).includes('must-not-cross-mapper-boundary'), false);

  const inboundPermission = evaluateOpenClawTelegramPermission({
    requirement: mapped.value.permissionRequirement,
    actor: createTrustedActor(),
    context: createPermissionContext(mapped.value),
    grants: [createGrantFor(mapped.value.permissionRequirement, mapped.value)],
  });
  assert.equal(inboundPermission.status, 'allowed');

  const coreBoundary = createFakeCoreBoundary(mapped.value);
  const host = createAdapterCoreHostFactory({
    facade: coreBoundary.facade,
    ports: coreBoundary.ports,
    metadata: Object.freeze({ adapterId: 'openclaw-telegram', corePackageVersion: '0.0.0-fake' }),
  });
  assert.equal(host.ok, true);
  assert.equal(host.value.readiness.status, 'ready');

  const coreResponse = host.value.facade.submitHostAction(mapped.value);
  assert.equal(coreResponse.ok, true);

  const runtime = createFakeOpenClawRuntime({
    results: [
      createFakeRuntimeSuccess({
        dispatchRef: 'operation:w6a-runtime-template',
        outputRef: 'runtime-output:w6a-runtime-1',
        message: 'Fake runtime composed a safe Telegram reply.',
      }),
    ],
  });
  const runtimeBridge = createOpenClawRuntimeBridge({ runtime });
  const runtimeResult = runtimeBridge.dispatch(coreResponse.runtimeRequest, {
    operationRef: coreResponse.runtimeRequest.dispatchRef,
    correlationRef: mapped.value.correlationRef,
    workspaceRef: mapped.value.routing.workspaceRef,
    agentRef: mapped.value.routing.agentRef,
    actorRef: refs.actorRef,
    detailsRef: 'details:w6a-runtime-context',
  });
  assert.equal(runtimeResult.ok, true);
  assert.equal(runtimeResult.value.output.outputRef, 'runtime-output:w6a-runtime-1');
  assert.equal(runtime.getDispatches().length, 1);

  const renderedPresentation = Object.freeze({
    ...coreResponse.presentation,
    body: Object.freeze([
      ...coreResponse.presentation.body,
      Object.freeze({ text: runtimeResult.value.output.message }),
    ]),
  });
  const renderedFragment = renderSafePresentationLike(renderedPresentation);
  assert.equal(renderedFragment.kind, 'telegram-render-fragment');
  assert.equal(renderedFragment.content.buttonGroups[0].buttons[0].payload, 'hz:token-callback-e2e-approve');

  const deliveryRequest = createTelegramRenderDeliveryRequest({
    deliveryRef: 'operation:w6a-delivery-1',
    correlationRef: mapped.value.correlationRef,
    target: createDeliveryTarget(mapped.value),
    source: renderedPresentation,
    context: Object.freeze({
      operationRef: 'operation:w6a-delivery-1',
      correlationRef: mapped.value.correlationRef,
      workspaceRef: mapped.value.routing.workspaceRef,
      agentRef: mapped.value.routing.agentRef,
    }),
  });
  const deliverySink = createFakeTelegramDeliverySink();
  const delivery = createTelegramDeliveryPump({ sink: deliverySink }).deliver(deliveryRequest);

  assert.equal(delivery.ok, true);
  assert.equal(delivery.value.kind, 'delivered');
  assert.equal(delivery.value.externalMessageRef.messageId, 'telegram-message:fake-1');
  assert.equal(delivery.value.shouldMarkDelivered, true);
  assert.equal(deliverySink.getRequests().length, 1);
  assert.equal(deliverySink.getResults().length, 1);
  assert.equal(runtimeBridge.getReadiness().status, 'ready');

  assertNoPublicLeaksForAll({
    mappedInbound: mapped.value,
    inboundPermission,
    coreHostReadiness: host.value.readiness,
    coreResponse,
    runtimeDispatches: runtime.getDispatches(),
    runtimeResults: runtime.getResults(),
    runtimeBridgeResult: runtimeResult,
    runtimeReadiness: runtimeBridge.getReadiness(),
    renderedFragment,
    deliveryRequest,
    deliveryDecision: delivery.value,
    fakeDeliveryRequests: deliverySink.getRequests(),
    fakeDeliveryResults: deliverySink.getResults(),
  });
});

test('callback token lifecycle preserves permission-before-token-consume semantics with injected fakes', () => {
  const mapped = mapWithBinding(
    createInboundMessageEvent({
      eventKind: 'callback',
      callbackId: 'callback-w6a-1',
      callbackPayload: 'hz:callback-e2e-approve',
    }),
  );
  assert.equal(mapped.ok, true);
  assert.equal(mapped.value.dispatch.target, 'callback-token');
  assert.equal(mapped.value.dispatch.tokenRef, 'callback-e2e-approve');

  const flowPayload = 'hz:token:callback-e2e-approve';
  const parsed = parseOpenClawTelegramCallbackPayload(flowPayload);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.tokenRef, 'token:callback-e2e-approve');

  const expectedTokenContext = createCallbackExpectedTokenContext(mapped.value);
  const callbackGrant = createGrantFor(mapped.value.permissionRequirement, mapped.value);

  const deniedCalls = [];
  const denied = runOpenClawTelegramCallbackTokenFlow({
    payload: flowPayload,
    actor: Object.freeze({ actorRef: refs.actorRef, trust: 'unknown' }),
    permissionContext: createPermissionContext(mapped.value),
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator(input) {
      deniedCalls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
    verifyToken() {
      deniedCalls.push('verify');
      throw new Error('verify must not run after denied permission');
    },
    consumeToken() {
      deniedCalls.push('consume');
      throw new Error('consume must not run after denied permission');
    },
  });
  assert.deepEqual(deniedCalls, ['permission']);
  assert.equal(denied.ok, true);
  assert.equal(denied.value.status, 'permission-denied');
  assert.equal(denied.value.tokenConsumed, false);

  const allowedCalls = [];
  const allowed = runOpenClawTelegramCallbackTokenFlow({
    payload: flowPayload,
    actor: createTrustedActor(),
    permissionContext: createPermissionContext(mapped.value),
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator(input) {
      allowedCalls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
    verifyToken(request) {
      allowedCalls.push('verify');
      assert.deepEqual(allowedCalls, ['permission', 'verify']);
      assert.equal(request.tokenRef, 'token:callback-e2e-approve');
      assert.equal(request.expectedContext.bindingRef, 'binding:w6a-topic-binding');
      return adapterOk(
        Object.freeze({
          status: 'verified',
          tokenRef: request.tokenRef,
          verificationRef: 'verification:w6a-callback',
        }),
      );
    },
    consumeToken(request) {
      allowedCalls.push('consume');
      assert.deepEqual(allowedCalls, ['permission', 'verify', 'consume']);
      assert.equal(request.verification.verificationRef, 'verification:w6a-callback');
      return adapterOk(
        Object.freeze({
          status: 'consumed',
          tokenRef: request.tokenRef,
          consumptionRef: 'consumption:w6a-callback',
        }),
      );
    },
  });
  assert.deepEqual(allowedCalls, ['permission', 'verify', 'consume']);
  assert.equal(allowed.ok, true);
  assert.equal(allowed.value.status, 'token-consumed');
  assert.equal(allowed.value.tokenConsumed, true);
  assert.equal(allowed.value.permission.status, 'allowed');

  assertNoPublicLeaksForAll({
    mappedCallback: mapped.value,
    parsedCallback: parsed.value,
    deniedCallbackDecision: denied.value,
    allowedCallbackDecision: allowed.value,
  });
});

test('approval bridge lifecycle submits safe requests and resolves only after allowed permission', async () => {
  const approvalRequestInput = Object.freeze({
    approvalRef: 'approval:w6a-approval-1',
    title: 'Approve fake delivery?',
    message: 'Review the rendered fake delivery. api_key=must-not-leak',
    approveTokenRef: 'token:w6a-approval-approve',
    rejectTokenRef: 'hz:token:w6a-approval-reject',
    workspaceRef: refs.workspaceRef,
    agentRef: refs.agentRef,
    actorRef: refs.actorRef,
    subjectRef: 'approval-subject:w6a-delivery',
    detailsRef: refs.detailsRef,
    correlationRef: refs.correlationRef,
  });
  const approvalRequest = createApprovalBridgeRequest(approvalRequestInput);
  assert.equal(approvalRequest.kind, 'openclaw-approval-request');
  assert.equal(approvalRequest.message, 'Review the rendered fake delivery. [redacted]');
  assert.equal(approvalRequest.approvePayload, 'hz:token:w6a-approval-approve');

  const approvalSource = createFakeApprovalSource();
  const submitted = await submitApprovalBridgeRequest({
    source: approvalSource,
    request: approvalRequestInput,
    context: Object.freeze({
      operationRef: 'operation:w6a-approval-submit',
      correlationRef: refs.correlationRef,
      workspaceRef: refs.workspaceRef,
      agentRef: refs.agentRef,
      actorRef: refs.actorRef,
      detailsRef: refs.detailsRef,
    }),
  });
  assert.equal(submitted.ok, true);
  assert.equal(approvalSource.getRequests().length, 1);
  assert.equal(submitted.value.request.approvalRef, approvalRequest.approvalRef);

  const decisionInput = Object.freeze({
    approvalRef: approvalRequest.approvalRef,
    status: 'approved',
    actorRef: refs.actorRef,
    reason: 'Approved after fake review. bot_token=must-not-leak',
    detailsRef: refs.detailsRef,
    correlationRef: refs.correlationRef,
  });
  const decision = createApprovalBridgeDecision(decisionInput);
  assert.equal(decision.reason, 'Approved after fake review. [redacted]');

  const requirement = createApprovalBridgePermissionRequirement({
    approvalRef: decision.approvalRef,
    actorRef: refs.actorRef,
    workspaceRef: refs.workspaceRef,
    agentRef: refs.agentRef,
    detailsRef: refs.detailsRef,
    correlationRef: refs.correlationRef,
  });

  const deniedResolver = createFakeApprovalResolver();
  const denied = await resolveApprovalBridgeDecision({
    resolver: deniedResolver,
    decision: decisionInput,
    permissionDecision: denyPermission({
      requirement,
      reason: 'No matching fake approval grant.',
      detailsRef: refs.detailsRef,
      correlationRef: refs.correlationRef,
    }),
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.error.code, 'forbidden');
  assert.equal(deniedResolver.getDecisions().length, 0);

  const allowedResolver = createFakeApprovalResolver();
  const allowed = await resolveApprovalBridgeDecision({
    resolver: allowedResolver,
    decision: decisionInput,
    permissionDecision: allowPermission(requirement),
    context: Object.freeze({
      operationRef: 'operation:w6a-approval-resolve',
      correlationRef: refs.correlationRef,
      workspaceRef: refs.workspaceRef,
      agentRef: refs.agentRef,
      actorRef: refs.actorRef,
      detailsRef: refs.detailsRef,
    }),
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.value.decision.status, 'approved');
  assert.equal(allowedResolver.getDecisions().length, 1);

  assertNoPublicLeaksForAll({
    approvalRequest,
    submittedApproval: submitted,
    recordedApprovalRequests: approvalSource.getRequests(),
    approvalDecision: decision,
    deniedApprovalResult: denied,
    allowedApprovalResult: allowed,
    recordedApprovalDecisions: allowedResolver.getDecisions(),
  });
});
