import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createActorRef,
  createAdapterCorrelationRef,
  createAdapterDetailsRef,
  createAdapterOperationRef,
  createAdapterRawDebugRef,
  createAgentRef,
  createOpenClawAdapterRef,
  createWorkspaceRef,
  isOpenClawAdapterRef,
  parseOpenClawAdapterRef,
} from '../../dist/contracts/index.js';

test('shared ref helpers create deterministic kind-prefixed refs', () => {
  assert.equal(createWorkspaceRef('acme'), 'workspace:acme');
  assert.equal(createAgentRef('coder'), 'agent:coder');
  assert.equal(createActorRef('telegram-user-42'), 'actor:telegram-user-42');
  assert.equal(createAdapterOperationRef('op-1'), 'operation:op-1');
  assert.equal(createAdapterCorrelationRef('corr-1'), 'correlation:corr-1');
  assert.equal(createAdapterRawDebugRef('debug-1'), 'raw-debug:debug-1');
  assert.equal(createAdapterDetailsRef('details-1'), 'details:details-1');
  assert.equal(createOpenClawAdapterRef('workspace', ' trimmed '), 'workspace:trimmed');
});

test('parseOpenClawAdapterRef parses valid refs without changing their value', () => {
  assert.deepEqual(parseOpenClawAdapterRef('workspace:acme'), {
    kind: 'workspace',
    value: 'acme',
    ref: 'workspace:acme',
  });

  assert.deepEqual(parseOpenClawAdapterRef('raw-debug:debug-1'), {
    kind: 'raw-debug',
    value: 'debug-1',
    ref: 'raw-debug:debug-1',
  });
});

test('invalid empty, whitespace, separator, and unsupported refs fail safely', () => {
  for (const invalidRef of [
    '',
    'workspace:',
    'workspace:two words',
    'workspace:with/slash',
    'workspace:with:separator',
    'workspace:{"payload":true}',
    'unsupported:value',
  ]) {
    assert.equal(parseOpenClawAdapterRef(invalidRef), null, `${invalidRef} should not parse`);
    assert.equal(isOpenClawAdapterRef(invalidRef), false, `${invalidRef} should not be accepted`);
  }
});

test('isOpenClawAdapterRef distinguishes safe ref strings from arbitrary values', () => {
  assert.equal(isOpenClawAdapterRef('agent:planner'), true);
  assert.equal(isOpenClawAdapterRef(null), false);
  assert.equal(isOpenClawAdapterRef({ ref: 'agent:planner' }), false);
});

test('raw-debug and details helpers keep opaque refs instead of raw payload containers', () => {
  assert.equal(createAdapterRawDebugRef('debug-opaque-1'), 'raw-debug:debug-opaque-1');
  assert.equal(createAdapterDetailsRef('details-opaque-1'), 'details:details-opaque-1');
  assert.throws(() => createAdapterRawDebugRef('{"update_id":1}'), /safe value/);
  assert.throws(() => createAdapterDetailsRef('provider:error:body'), /safe value/);
});
