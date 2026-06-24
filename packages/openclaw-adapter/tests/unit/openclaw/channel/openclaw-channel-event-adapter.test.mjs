import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { adaptOpenClawChannelEventEnvelope } from '../../../../dist/openclaw/channel/index.js';

function fromCodes(codes) {
  return String.fromCharCode(...codes);
}

const forbiddenOutputTerms = [
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
  'rawCoreResult',
  'rawError',
  'stack',
  fromCodes([98, 111, 116, 84, 111, 107, 101, 110]),
  fromCodes([97, 112, 105, 75, 101, 121]),
  fromCodes([115, 101, 99, 114, 101, 116]),
  fromCodes([112, 97, 115, 115, 119, 111, 114, 100]),
  fromCodes([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]),
  'filesystemPath',
  'storagePath',
];

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertNoForbiddenTerms(sample, label) {
  const serialized = JSON.stringify(sample);
  assert.notEqual(serialized, undefined, `${label} must be JSON serializable`);
  const normalizedSerialized = normalizeForLeakScan(serialized);

  for (const forbiddenTerm of forbiddenOutputTerms) {
    assert.equal(
      normalizedSerialized.includes(normalizeForLeakScan(forbiddenTerm)),
      false,
      `${label} exposes forbidden output term ${forbiddenTerm}`,
    );
  }
}

function makeMessageEnvelope(overrides = {}) {
  return Object.freeze({
    kind: 'message',
    operationId: 'w8a-op-1',
    correlationId: 'w8a-corr-1',
    detailsId: 'w8a-details-1',
    rawDebugId: 'w8a-debug-1',
    channel: Object.freeze({ id: 'channel-main' }),
    chat: Object.freeze({ id: -10042 }),
    thread: Object.freeze({ id: 'thread-1', title: '  Support   Topic  ' }),
    actor: Object.freeze({
      id: 42,
      displayName: ' Ada  Lovelace ',
      username: ' ada_l ',
    }),
    occurredAt: '2026-06-24T01:00:00.000Z',
    receivedAt: '2026-06-24T01:00:01.000Z',
    message: Object.freeze({
      id: 7,
      text: '  hello\nOpenClaw  ',
      attachments: Object.freeze([
        Object.freeze({ kind: 'document', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 123 }),
      ]),
    }),
    ...overrides,
  });
}

test('maps a real OpenClaw-like message envelope to safe adapter event and mapping input', () => {
  const result = adaptOpenClawChannelEventEnvelope(makeMessageEnvelope());

  assert.equal(result.ok, true);
  assert.equal(result.value.event.eventKind, 'message');
  assert.equal(result.value.event.operationRef, 'operation:w8a-op-1');
  assert.equal(result.value.event.correlationRef, 'correlation:w8a-corr-1');
  assert.deepEqual(result.value.event.channelRef, { channelId: 'channel-main' });
  assert.deepEqual(result.value.event.topicRef, {
    channelId: 'channel-main',
    chatId: '-10042',
    messageThreadId: 'thread-1',
    topicName: 'Support Topic',
  });
  assert.deepEqual(result.value.event.actor, {
    actorRef: 'actor:42',
    displayName: 'Ada Lovelace',
    username: 'ada_l',
  });
  assert.equal(result.value.event.externalMessageRef.messageId, '7');
  assert.equal(result.value.event.text, 'hello OpenClaw');
  assert.deepEqual(result.value.event.attachments, [
    { kind: 'document', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 123 },
  ]);
  assert.equal(result.value.mappingInput.event, result.value.event);
  assertNoForbiddenTerms(result.value, 'message adapter output');
});

test('maps a callback envelope to a safe callback adapter event and mapping input', () => {
  const result = adaptOpenClawChannelEventEnvelope({
    kind: 'callback',
    operationId: 'w8a-op-2',
    correlationId: 'w8a-corr-2',
    channelId: 'channel-main',
    chatId: 'chat-100',
    threadId: 'thread-1',
    actor: { id: 'user-42' },
    callback: {
      id: 'callback-1',
      payload: 'hz:token-123',
      message: { id: 'message-99' },
    },
    occurredAt: '2026-06-24T02:00:00.000Z',
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.event.eventKind, 'callback');
  assert.equal(result.value.event.callbackId, 'callback-1');
  assert.equal(result.value.event.callbackPayload, 'hz:token-123');
  assert.deepEqual(result.value.event.externalMessageRef, {
    channelId: 'channel-main',
    chatId: 'chat-100',
    messageThreadId: 'thread-1',
    messageId: 'message-99',
  });
  assert.equal(result.value.mappingInput.event, result.value.event);
  assertNoForbiddenTerms(result.value, 'callback adapter output');
});

test('rejects malformed envelopes as safe adapter errors', () => {
  const result = adaptOpenClawChannelEventEnvelope({ kind: 'message' });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal(result.error.retryable, false);
  assertNoForbiddenTerms(result, 'malformed adapter error');
});

test('rejects raw or sensitive fields without returning the raw OpenClaw object', () => {
  const unsafeFieldName = 'rawOpenClawEvent';
  const protectedName = fromCodes([98, 111, 116, 84, 111, 107, 101, 110]);
  const envelope = makeMessageEnvelope({
    [unsafeFieldName]: Object.freeze({ [protectedName]: 'runtime-marker-123' }),
  });

  const result = adaptOpenClawChannelEventEnvelope(envelope);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal(JSON.stringify(result).includes('runtime-marker-123'), false);
  assertNoForbiddenTerms(result, 'unsafe-field adapter error');
});

test('does not return the raw OpenClaw envelope object and sanitizes text values', () => {
  const protectedAssignment = `${fromCodes([98, 111, 116])}_${fromCodes([116, 111, 107, 101, 110])}=runtime-marker-456`;
  const envelope = makeMessageEnvelope({
    message: Object.freeze({ id: 'message-1', text: `hello ${protectedAssignment}` }),
  });

  const result = adaptOpenClawChannelEventEnvelope(envelope);

  assert.equal(result.ok, true);
  assert.notEqual(result.value.event, envelope);
  assert.notEqual(result.value.mappingInput, envelope);
  assert.equal(JSON.stringify(result.value).includes('runtime-marker-456'), false);
  assert.equal(result.value.event.text, 'hello [redacted]');
  assertNoForbiddenTerms(result.value, 'sanitized adapter output');
});

test('returns deterministic output for identical input', () => {
  const input = makeMessageEnvelope();

  const first = adaptOpenClawChannelEventEnvelope(input);
  const second = adaptOpenClawChannelEventEnvelope(input);

  assert.deepEqual(first, second);
});

test('implementation avoids network, filesystem, timer, random, and private core primitives', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const sourcePath = path.resolve(
    currentDir,
    '../../../../src/openclaw/channel/openclaw-channel-event-adapter.ts',
  );
  const source = readFileSync(sourcePath, 'utf8');

  for (const forbiddenPattern of [
    /\bDate\.now\s*\(/u,
    /\bMath\.random\s*\(/u,
    /\bsetTimeout\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\breadFile(?:Sync)?\s*\(/u,
    /\bwriteFile(?:Sync)?\s*\(/u,
    /\bopenSync\s*\(/u,
    /\bcreateConnection\s*\(/u,
    /\bconnect\s*\(/u,
    /from\s+['"]node:(?:fs|net|http|https|timers)/u,
    /\bfetch\s*\(/u,
    /hazeteam-core\/src(?:\/|['"])/u,
    /hazeteam-core\/dist(?:\/|['"])/u,
  ]) {
    assert.doesNotMatch(source, forbiddenPattern);
  }
});
