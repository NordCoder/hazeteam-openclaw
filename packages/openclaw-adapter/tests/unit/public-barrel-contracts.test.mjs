import assert from 'node:assert/strict';
import test from 'node:test';

import * as contracts from '../../dist/contracts/index.js';
import * as root from '../../dist/index.js';

const expectedRuntimeExports = [
  'OPENCLAW_ADAPTER_PACKAGE',
  'adapterErr',
  'adapterOk',
  'createActorRef',
  'createAdapterCorrelationRef',
  'createAdapterDetailsRef',
  'createAdapterOperationContext',
  'createAdapterOperationRef',
  'createAdapterRawDebugRef',
  'createAdapterSafeError',
  'createAgentRef',
  'createOpenClawAdapterRef',
  'createTelegramActionButton',
  'createTelegramActionButtonPayload',
  'createTelegramDeliverySafeError',
  'createTelegramExternalMessageRef',
  'createWorkspaceRef',
  'isAdapterErr',
  'isAdapterOk',
  'isOpenClawAdapterRef',
  'isTelegramActionButtonPayload',
  'parseOpenClawAdapterRef',
];

test('root dist index exports shared and delivery contract helpers', () => {
  for (const exportName of expectedRuntimeExports) {
    assert.equal(exportName in root, true, `missing root export ${exportName}`);
  }

  assert.equal(root.OPENCLAW_ADAPTER_PACKAGE.status, 'skeleton');
  assert.equal(root.createWorkspaceRef('acme'), 'workspace:acme');
  assert.equal(root.adapterOk('value').ok, true);
  assert.equal(root.createTelegramActionButtonPayload('token:approve'), 'hz:token:approve');
  assert.equal(root.isTelegramActionButtonPayload('hz:token:approve'), true);
});

test('dist contracts barrel exports shared and delivery contract helpers', () => {
  for (const exportName of expectedRuntimeExports.filter(
    (exportName) => exportName !== 'OPENCLAW_ADAPTER_PACKAGE',
  )) {
    assert.equal(exportName in contracts, true, `missing contracts export ${exportName}`);
  }

  assert.equal(contracts.createAdapterOperationRef('op-1'), 'operation:op-1');
  assert.equal(contracts.createAdapterSafeError({ code: 'not-found', message: 'missing' }).code, 'not-found');
  assert.equal(
    contracts.createTelegramDeliverySafeError({ code: 'timeout', message: 'timed out' }).code,
    'timeout',
  );
});
