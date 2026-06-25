import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdapterCommandFacade,
  submitAdapterCommandIntent,
  summarizeAdapterCommandFacadeReadiness,
} from '../../dist/commands/index.js';
import {
  createAdapterHostCommandFacade,
  describeAdapterHostCommandFacade,
} from '../../dist/host/index.js';

const completePorts = Object.freeze({
  agentControlHost: Object.freeze({}),
  sessionBindingStore: Object.freeze({}),
  presentationOutboxStore: Object.freeze({}),
  presentationActionTokenStore: Object.freeze({}),
});

function createIntent(overrides = {}) {
  return Object.freeze({
    intentRef: 'operation:cmd-1',
    target: 'user-intent',
    commandName: '/Start',
    commandKind: 'telegram.command',
    text: '  hello   command ',
    argumentRefs: ['arg:one'],
    resourceRef: 'resource:topic-1',
    workspaceRef: 'workspace:alpha',
    agentRef: 'agent:alpha',
    actorRef: 'actor:alice',
    correlationRef: 'correlation:cmd-1',
    detailsRef: 'details:cmd-1',
    data: Object.freeze({ safe: 'value' }),
    ...overrides,
  });
}

test('adapter command facade invokes only the selected injected public core method', async () => {
  const calls = [];
  const facade = Object.freeze({
    submitUserIntent(input, context) {
      calls.push({ input, context });
      return Object.freeze({
        ok: true,
        value: Object.freeze({
          status: 'completed',
          resultRef: 'core-result:cmd-1',
          message: 'completed',
          correlationRef: input.correlationRef,
          detailsRef: input.detailsRef,
        }),
      });
    },
    submitHostAction() {
      throw new Error('wrong method');
    },
  });
  const commandFacade = createAdapterCommandFacade({ facade });
  const result = await commandFacade.submit(createIntent());

  assert.equal(result.ok, true);
  assert.equal(result.value.kind, 'adapter-command-result');
  assert.equal(result.value.status, 'completed');
  assert.equal(result.value.commandName, 'start');
  assert.equal(result.value.correlationRef, 'correlation:cmd-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.kind, 'adapter-command-intent');
  assert.equal(calls[0].input.text, 'hello command');
  assert.equal(calls[0].input.commandName, 'start');
});

test('adapter command facade fails safely when core output is malformed or unsafe', async () => {
  const facade = Object.freeze({
    submitUserIntent() {
      return Object.freeze({
        ok: true,
        value: Object.freeze({
          status: 'completed',
          stack: 'internal-stack-frame',
          message: 'unsafe dependency detail',
        }),
      });
    },
  });
  const result = await submitAdapterCommandIntent({ facade, intent: createIntent() });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.equal(result.error.message, 'Core command facade returned an unsafe or invalid result.');
  assert.equal('stack' in result.error, false);
});

test('adapter command facade rejects unsafe command intent fields before core dispatch', async () => {
  let called = false;
  const facade = Object.freeze({
    submitUserIntent() {
      called = true;
      return Object.freeze({ ok: true, value: Object.freeze({ status: 'accepted' }) });
    },
  });
  const result = await submitAdapterCommandIntent({
    facade,
    intent: createIntent({ data: Object.freeze({ rawProviderResponse: 'do-not-cross' }) }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal(called, false);
});

test('host command facade composes host readiness with command dispatch', async () => {
  const facade = Object.freeze({
    submitHostAction(input) {
      return Object.freeze({
        ok: true,
        value: Object.freeze({
          status: 'accepted',
          resultRef: 'host-action:cmd-2',
          correlationRef: input.correlationRef,
        }),
      });
    },
    submitUserIntent(input) {
      return Object.freeze({
        ok: true,
        value: Object.freeze({
          status: 'completed',
          resultRef: 'user-intent:cmd-2',
          correlationRef: input.correlationRef,
        }),
      });
    },
    listPendingPresentations() {
      return Object.freeze({ ok: true, value: Object.freeze({ status: 'completed' }) });
    },
    claimPresentation() {
      return Object.freeze({ ok: true, value: Object.freeze({ status: 'completed' }) });
    },
    markPresentationDelivered() {
      return Object.freeze({ ok: true, value: Object.freeze({ status: 'completed' }) });
    },
    markPresentationFailed() {
      return Object.freeze({ ok: true, value: Object.freeze({ status: 'completed' }) });
    },
    issueActionToken() {
      return Object.freeze({ ok: true, value: Object.freeze({ status: 'completed' }) });
    },
    verifyActionToken() {
      return Object.freeze({ ok: true, value: Object.freeze({ status: 'completed' }) });
    },
    consumeActionToken() {
      return Object.freeze({ ok: true, value: Object.freeze({ status: 'completed' }) });
    },
    getPortReadiness() {
      return Object.freeze({ ok: true, value: Object.freeze({ status: 'completed' }) });
    },
  });
  const hostFacadeResult = createAdapterHostCommandFacade({ facade, ports: completePorts });

  assert.equal(hostFacadeResult.ok, true);
  assert.equal(hostFacadeResult.value.getReadiness().status, 'ready');

  const descriptorResult = describeAdapterHostCommandFacade({ facade, ports: completePorts });
  assert.equal(descriptorResult.ok, true);
  assert.equal(descriptorResult.value.kind, 'adapter-host-command-facade');
  assert.deepEqual(descriptorResult.value.missingCommandMethods, []);

  const dispatchResult = await hostFacadeResult.value.submitCommand(
    createIntent({
      target: 'host-action',
      intentRef: 'operation:cmd-2',
      correlationRef: 'correlation:cmd-2',
    }),
  );
  assert.equal(dispatchResult.ok, true);
  assert.equal(dispatchResult.value.status, 'accepted');
  assert.equal(dispatchResult.value.resultRef, 'host-action:cmd-2');
});

test('command readiness reports missing methods without claiming adapter readiness', () => {
  const readiness = summarizeAdapterCommandFacadeReadiness({
    facade: Object.freeze({
      submitUserIntent() {},
    }),
  });

  assert.equal(readiness.status, 'not-ready');
  assert.equal(readiness.checks.some((check) => check.status === 'fail'), true);
});
