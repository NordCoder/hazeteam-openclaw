import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adapterErr,
  adapterOk,
  createAdapterCorrelationRef,
  createAdapterDetailsRef,
  createAdapterOperationContext,
  createAdapterOperationRef,
  createAdapterSafeError,
  isAdapterErr,
  isAdapterOk,
} from '../../dist/contracts/index.js';

function createTestContext() {
  return createAdapterOperationContext({
    operationRef: createAdapterOperationRef('op-result-1'),
    correlationRef: createAdapterCorrelationRef('corr-result-1'),
  });
}

test('adapterOk creates a stable success discriminant with value and context', () => {
  const context = createTestContext();
  const result = adapterOk({ delivered: false }, context);

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { delivered: false });
  assert.equal(result.context, context);
  assert.equal(isAdapterOk(result), true);
  assert.equal(isAdapterErr(result), false);
});

test('adapterErr creates a stable failure discriminant with safe error and context', () => {
  const context = createTestContext();
  const detailsRef = createAdapterDetailsRef('details-result-1');
  const correlationRef = createAdapterCorrelationRef('corr-result-2');
  const error = createAdapterSafeError({
    code: 'dependency-failed',
    message: 'OpenClaw dependency failed',
    retryable: true,
    detailsRef,
    correlationRef,
  });

  const result = adapterErr(error, context);

  assert.equal(result.ok, false);
  assert.deepEqual(result.error, {
    code: 'dependency-failed',
    message: 'OpenClaw dependency failed',
    retryable: true,
    detailsRef,
    correlationRef,
  });
  assert.equal(result.context, context);
  assert.equal(isAdapterOk(result), false);
  assert.equal(isAdapterErr(result), true);
});

test('createAdapterSafeError sanitizes control characters and obvious credential assignments', () => {
  const error = createAdapterSafeError({
    code: 'invalid-input',
    message: 'bad\ninput\tbotToken=12345 secret=top-secret',
  });

  assert.equal(error.message.includes('\n'), false);
  assert.equal(error.message.includes('\t'), false);
  assert.equal(error.message.includes('12345'), false);
  assert.equal(error.message.includes('top-secret'), false);
  assert.equal(error.message, 'bad input [redacted] [redacted]');
});

test('createAdapterSafeError falls back for empty safe messages and rejects unsupported codes', () => {
  assert.equal(
    createAdapterSafeError({ code: 'internal', message: '\n\t' }).message,
    'Adapter operation failed',
  );

  assert.throws(
    () => createAdapterSafeError({ code: 'provider-exception', message: 'failed' }),
    /Unsupported adapter safe error code/,
  );
});

test('adapterErr strips unsafe extra error fields from public failure result', () => {
  const unsafeError = {
    code: 'internal',
    message: 'failed',
    stack: 'Error: failed\n    at provider',
    rawError: { provider: true },
    cause: { provider: true },
    rawPayload: { update: true },
    token: 'bearer-like-token',
    secret: 'not-public',
  };

  const result = adapterErr(unsafeError);
  const errorKeys = Object.keys(result.error).sort();

  assert.deepEqual(errorKeys, ['code', 'message']);
  for (const unsafeField of ['stack', 'rawError', 'cause', 'rawPayload', 'token', 'secret']) {
    assert.equal(Object.hasOwn(result.error, unsafeField), false, `${unsafeField} should not exist`);
  }
});
