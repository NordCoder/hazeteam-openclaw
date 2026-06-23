import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERMISSION_BEFORE_TOKEN_CONSUME_RULE,
  createStaticPermissionEvaluator,
  evaluateOpenClawTelegramPermission,
  evaluateOpenClawTelegramPermissions,
  permissionGrantMatchesRequirement,
} from '../../../dist/permissions/index.js';

const trustedActor = Object.freeze({
  actorRef: 'actor:user-1',
  trust: 'trusted',
});

const trustedContext = Object.freeze({
  workspaceRef: 'workspace:acme',
  agentRef: 'agent:coder',
  topic: Object.freeze({
    trust: 'trusted-binding',
    status: 'active',
  }),
  callbackTokenPhase: 'before-token-consume',
  detailsRef: 'details:permission-flow',
  correlationRef: 'correlation:permission-flow',
});

const callbackRequirement = Object.freeze({
  action: 'consume-callback',
  resourceKind: 'callback',
  resourceRef: 'callback:approval-1',
});

const callbackGrant = Object.freeze({
  requirement: Object.freeze({
    action: 'consume-callback',
    resourceKind: 'callback',
    actorRef: 'actor:user-1',
    workspaceRef: 'workspace:acme',
    agentRef: 'agent:coder',
  }),
});

const sendMessageRequirement = Object.freeze({
  action: 'send-message',
  resourceKind: 'topic',
  resourceRef: 'topic:coder',
});

const sendMessageGrant = Object.freeze({
  requirement: Object.freeze({
    action: 'send-message',
    resourceKind: 'topic',
    actorRef: 'actor:user-1',
    workspaceRef: 'workspace:acme',
    agentRef: 'agent:coder',
  }),
});

test('allows a trusted actor in an active trusted topic when a grant matches', () => {
  const decision = evaluateOpenClawTelegramPermission({
    requirement: callbackRequirement,
    actor: trustedActor,
    context: trustedContext,
    grants: [callbackGrant],
  });

  assert.equal(decision.status, 'allowed');
  assert.equal(decision.requirement.actorRef, 'actor:user-1');
  assert.equal(decision.requirement.workspaceRef, 'workspace:acme');
  assert.equal(decision.requirement.agentRef, 'agent:coder');
  assert.equal(decision.requirement.resourceRef, 'callback:approval-1');
  assert.equal(decision.requirement.detailsRef, 'details:permission-flow');
  assert.equal(decision.requirement.correlationRef, 'correlation:permission-flow');
});

test('denies safely when actor context is not trusted', () => {
  const decision = evaluateOpenClawTelegramPermission({
    requirement: callbackRequirement,
    actor: { ...trustedActor, trust: 'untrusted' },
    context: trustedContext,
    grants: [callbackGrant],
    detailsRef: 'details:denied-actor',
    correlationRef: 'correlation:denied-actor',
  });

  assert.equal(decision.status, 'denied');
  assert.equal(decision.reason, 'Actor context is not trusted.');
  assert.equal(decision.detailsRef, 'details:denied-actor');
  assert.equal(decision.correlationRef, 'correlation:denied-actor');
  assert.equal(decision.reason.includes('actor:user-1'), false);
  assert.equal('rawProviderPayload' in decision, false);
  assert.equal('tokenRecord' in decision, false);
});

test('denies safely when actor or topic context is missing', () => {
  const missingActorDecision = evaluateOpenClawTelegramPermission({
    requirement: callbackRequirement,
    context: trustedContext,
    grants: [callbackGrant],
  });
  const missingTopicDecision = evaluateOpenClawTelegramPermission({
    requirement: sendMessageRequirement,
    actor: trustedActor,
    context: {
      workspaceRef: 'workspace:acme',
      agentRef: 'agent:coder',
    },
    grants: [sendMessageGrant],
  });

  assert.equal(missingActorDecision.status, 'denied');
  assert.equal(missingActorDecision.reason, 'Actor context is not trusted.');
  assert.equal(missingTopicDecision.status, 'denied');
  assert.equal(missingTopicDecision.reason, 'Topic binding is not trusted.');
});

test('denies callback permission when evaluated after token consume', () => {
  const decision = evaluateOpenClawTelegramPermission({
    requirement: callbackRequirement,
    actor: trustedActor,
    context: {
      ...trustedContext,
      callbackTokenPhase: 'after-token-consume',
    },
    grants: [callbackGrant],
  });

  assert.equal(decision.status, 'denied');
  assert.equal(decision.reason, PERMISSION_BEFORE_TOKEN_CONSUME_RULE.denialReason);
  assert.equal(decision.reason.includes('tokenRef'), false);
});

test('denies when trusted topic binding is inactive before considering grants', () => {
  const decision = evaluateOpenClawTelegramPermission({
    requirement: sendMessageRequirement,
    actor: trustedActor,
    context: {
      ...trustedContext,
      topic: {
        trust: 'trusted-binding',
        status: 'paused',
      },
    },
    grants: [sendMessageGrant],
  });

  assert.equal(decision.status, 'denied');
  assert.equal(decision.reason, 'Topic binding is not active.');
});

test('denies when no adapter permission grant matches the effective requirement', () => {
  const decision = evaluateOpenClawTelegramPermission({
    requirement: callbackRequirement,
    actor: trustedActor,
    context: trustedContext,
    grants: [
      {
        requirement: {
          ...callbackGrant.requirement,
          actorRef: 'actor:other-user',
        },
      },
    ],
  });

  assert.equal(decision.status, 'denied');
  assert.equal(decision.reason, 'No matching adapter permission grant.');
});

test('keeps permission denial reasons bounded and free from raw provider fields', () => {
  const decisions = [
    evaluateOpenClawTelegramPermission({
      requirement: callbackRequirement,
      actor: { ...trustedActor, trust: 'unknown' },
      context: trustedContext,
      grants: [callbackGrant],
    }),
    evaluateOpenClawTelegramPermission({
      requirement: callbackRequirement,
      actor: trustedActor,
      context: trustedContext,
      grants: [],
    }),
  ];

  for (const decision of decisions) {
    assert.equal(decision.status, 'denied');
    assert.equal(decision.reason.length <= 160, true);
    assert.equal(decision.reason.includes('\n'), false);
    assert.equal(decision.reason.includes('rawProviderPayload'), false);
    assert.equal(decision.reason.includes('secret'), false);
    assert.equal(decision.reason.includes('stack'), false);
  }
});

test('rejects unsupported unsafe permission requirement values through existing contracts', () => {
  assert.throws(
    () =>
      evaluateOpenClawTelegramPermission({
        requirement: {
          ...callbackRequirement,
          action: 'delete-world',
        },
        actor: trustedActor,
        context: trustedContext,
        grants: [callbackGrant],
      }),
    TypeError,
  );
});

test('matches grants by action resource kind and optional scoped refs', () => {
  assert.equal(
    permissionGrantMatchesRequirement(callbackGrant, {
      ...callbackRequirement,
      actorRef: 'actor:user-1',
      workspaceRef: 'workspace:acme',
      agentRef: 'agent:coder',
    }),
    true,
  );

  assert.equal(
    permissionGrantMatchesRequirement(callbackGrant, {
      ...callbackRequirement,
      actorRef: 'actor:user-1',
      workspaceRef: 'workspace:other',
      agentRef: 'agent:coder',
    }),
    false,
  );
});

test('creates deterministic static permission evaluators without provider side effects', () => {
  const evaluator = createStaticPermissionEvaluator({ grants: [callbackGrant] });
  const first = evaluator({
    requirement: callbackRequirement,
    actor: trustedActor,
    context: trustedContext,
  });
  const second = evaluator({
    requirement: callbackRequirement,
    actor: trustedActor,
    context: trustedContext,
  });

  assert.deepEqual(first, second);
  assert.equal(first.status, 'allowed');
});

test('static permission evaluators ignore call-time grants', () => {
  const evaluator = createStaticPermissionEvaluator({ grants: [] });
  const decision = evaluator({
    requirement: callbackRequirement,
    actor: trustedActor,
    context: trustedContext,
    grants: [callbackGrant],
  });

  assert.equal(decision.status, 'denied');
  assert.equal(decision.reason, 'No matching adapter permission grant.');
});

test('evaluates batches as frozen allow or deny decisions', () => {
  const decisions = evaluateOpenClawTelegramPermissions({
    requirements: [
      callbackRequirement,
      {
        action: 'resolve-approval',
        resourceKind: 'approval',
        resourceRef: 'approval:request-1',
      },
    ],
    actor: trustedActor,
    context: trustedContext,
    grants: [callbackGrant],
  });

  assert.equal(Object.isFrozen(decisions), true);
  assert.equal(decisions[0].status, 'allowed');
  assert.equal(decisions[1].status, 'denied');
  assert.equal(decisions[1].reason, 'No matching adapter permission grant.');
});
