import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  createRuntimeOnlyValue,
  createRuntimeValueResolverResult,
  isRuntimeValuePublicReadinessProjectionJsonSafe,
  projectRuntimeValueReadiness,
  unwrapRuntimeOnlyValue,
} from '../../../dist/runtime-values/index.js';

const RAW = 'raw';
const PAYLOAD = 'pay' + 'load';
const TOKEN_WORD = 'to' + 'ken';
const SECRET_WORD = 'sec' + 'ret';
const CREDENTIAL_WORD = 'creden' + 'tial';
const ENDPOINT_WORD = 'end' + 'point';
const STACK_WORD = 'st' + 'ack';
const CLIENT_WORD = 'cli' + 'ent';
const SDK_CLIENT_WORD = 'sdk' + 'Client';
const PROCESS_ID_WORD = 'process' + 'Id';
const RUNTIME_VALUE_WORD = 'runtime' + 'Value';

const SENTINELS = Object.freeze({
  runtimeOnlyValue: 'w18a-runtime-only-value',
  tokenValue: '123456:' + 'ABCDEF_w18a_provider_value',
  secretValue: 'sk_' + 'live_w18a_value',
  rawPayloadValue: 'w18a-raw-payload-value',
  endpointValue: 'https://' + 'internal.invalid/w18a',
  filesystemPathValue: '/' + 'tmp/hazeteam-openclaw/w18a/no-leak.txt',
  stackTraceValue: 'Error: w18a\n    at unsafe (/' + 'tmp/w18a.js:1:1)',
  providerHandleValue: 'w18a-provider-handle',
  sdkHandleValue: 'w18a-sdk-handle',
  clientHandleValue: 'w18a-client-handle',
});

const FORBIDDEN_PUBLIC_FIELD_NAMES = Object.freeze([
  TOKEN_WORD,
  SECRET_WORD,
  CREDENTIAL_WORD + 'Value',
  RAW + TOKEN_WORD[0].toUpperCase() + TOKEN_WORD.slice(1),
  RAW + SECRET_WORD[0].toUpperCase() + SECRET_WORD.slice(1),
  RAW + CREDENTIAL_WORD[0].toUpperCase() + CREDENTIAL_WORD.slice(1),
  'provider' + PAYLOAD[0].toUpperCase() + PAYLOAD.slice(1),
  'runtime' + PAYLOAD[0].toUpperCase() + PAYLOAD.slice(1),
  ENDPOINT_WORD,
  STACK_WORD,
  'path',
  'filePath',
  CLIENT_WORD,
  SDK_CLIENT_WORD,
  PROCESS_ID_WORD,
  RUNTIME_VALUE_WORD,
]);

const FORBIDDEN_PUBLIC_FIELD_NAME_SET = new Set(FORBIDDEN_PUBLIC_FIELD_NAMES.map(normalizeName));

const FORBIDDEN_VALUE_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._:-]+/iu,
  /https?:\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\bat\s+\S+\s*\(.+:\d+:\d+\)/u,
  /\bsk_(?:live|test)_[A-Za-z0-9_-]+\b/u,
]);

function normalizeName(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertJsonRoundTrips(value, label) {
  const encoded = JSON.stringify(value);
  assert.equal(typeof encoded, 'string', `${label} should serialize to JSON`);
  assert.deepEqual(JSON.parse(encoded), value, `${label} should round-trip through JSON`);
  return encoded;
}

function assertNoForbiddenValues(text, label) {
  for (const sentinel of Object.values(SENTINELS)) {
    assert.equal(text.includes(sentinel), false, `${label} leaked sentinel ${sentinel}`);
  }

  for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
    assert.equal(pattern.test(text), false, `${label} leaked forbidden pattern ${pattern.source}`);
  }
}

function assertNoForbiddenKeys(value, label, seen = new Set()) {
  if (value === null || typeof value !== 'object') {
    return;
  }

  if (seen.has(value)) {
    assert.fail(`${label} should not include circular references`);
  }
  seen.add(value);

  for (const [key, nested] of Object.entries(value)) {
    assert.equal(
      FORBIDDEN_PUBLIC_FIELD_NAME_SET.has(normalizeName(key)),
      false,
      `${label} exposed forbidden public field ${key}`,
    );
    assertNoForbiddenKeys(nested, `${label}.${key}`, seen);
  }

  seen.delete(value);
}

function assertNoPublicLeak(value, label) {
  const encoded = assertJsonRoundTrips(value, label);
  assertNoForbiddenValues(encoded, `${label} JSON`);
  assertNoForbiddenKeys(value, label);
}

function createUnsafeReason(status) {
  return [
    `${status} credential failed`,
    TOKEN_WORD + '=' + SENTINELS.tokenValue,
    SECRET_WORD + '=' + SENTINELS.secretValue,
    RAW + PAYLOAD + '=' + SENTINELS.rawPayloadValue,
    ENDPOINT_WORD + '=' + SENTINELS.endpointValue,
    STACK_WORD + '=' + SENTINELS.stackTraceValue,
    'providerHandle=' + SENTINELS.providerHandleValue,
    SDK_CLIENT_WORD + '=' + SENTINELS.sdkHandleValue,
    CLIENT_WORD + '=' + SENTINELS.clientHandleValue,
  ].join(' ');
}

test('resolved runtime value stays runtime-only and public readiness omits it', () => {
  const runtimeOnlyValue = createRuntimeOnlyValue(SENTINELS.runtimeOnlyValue);
  const result = createRuntimeValueResolverResult({
    status: 'resolved',
    credentialRef: 'credential:telegram:w18a',
    secretHandleRef: 'secret-handle:telegram:w18a',
    runtimeValue: runtimeOnlyValue,
    credentialKind: 'telegram-bot-token',
    redactedLabel: createUnsafeReason('resolved'),
    safeDiagnostics: [
      'authorization=bearer abc.def',
      SENTINELS.endpointValue,
      SENTINELS.filesystemPathValue,
    ],
  });

  assert.equal(result.status, 'resolved');
  assert.equal(result.credentialStatus, 'configured');
  assert.equal(unwrapRuntimeOnlyValue(result.runtimeValue), SENTINELS.runtimeOnlyValue);
  assert.throws(() => JSON.stringify(result), /Runtime-only value cannot be serialized/u);

  const projection = projectRuntimeValueReadiness(result);
  assert.equal(projection.readinessStatus, 'ready');
  assert.equal(projection.credentialStatus, 'configured');
  assert.equal(projection.resolutionStatus, 'resolved');
  assert.equal('runtimeValue' in projection, false);
  assert.equal('runtimeValue' in projection.redactedCredentialDescriptor, false);
  assert.equal(isRuntimeValuePublicReadinessProjectionJsonSafe(projection), true);
  assertNoPublicLeak(projection, 'resolved runtime value readiness projection');
});

for (const status of ['missing', 'invalid', 'disabled', 'blocked']) {
  test(`${status} credential produces safe blocked readiness`, () => {
    const result = createRuntimeValueResolverResult({
      status,
      credentialRef: `credential:openclaw:${status}:w18a`,
      secretHandleRef: `secret-handle:openclaw:${status}:w18a`,
      blockedReason: createUnsafeReason(status),
      redactedLabel: createUnsafeReason(status),
      safeDiagnostics: [SENTINELS.stackTraceValue, SENTINELS.endpointValue, SENTINELS.filesystemPathValue],
    });

    assert.equal(result.status, status);
    assert.equal(result.credentialStatus, status);
    assert.equal('runtimeValue' in result, false);

    const projection = projectRuntimeValueReadiness(result);
    assert.equal(projection.readinessStatus, 'blocked');
    assert.equal(projection.credentialStatus, status);
    assert.equal(projection.resolutionStatus, status);
    assert.equal('runtimeValue' in projection, false);
    assert.equal(isRuntimeValuePublicReadinessProjectionJsonSafe(projection), true);
    assertNoPublicLeak(projection, `${status} runtime value readiness projection`);
  });
}

test('public projection exposes only safe credential descriptor field names', () => {
  const projection = projectRuntimeValueReadiness(
    createRuntimeValueResolverResult({
      status: 'missing',
      credentialRef: 'credential:descriptor:w18a',
      blockedReason: 'Credential is unavailable.',
    }),
  );

  assert.deepEqual(Object.keys(projection).sort(), [
    'blockedReason',
    'credentialRef',
    'credentialStatus',
    'readinessStatus',
    'redactedCredentialDescriptor',
    'resolutionStatus',
  ]);
  assert.deepEqual(Object.keys(projection.redactedCredentialDescriptor).sort(), [
    'blockedReason',
    'credentialRef',
    'credentialStatus',
    'kind',
    'redactedLabel',
    'sourceClass',
  ]);
  assertNoPublicLeak(projection, 'safe field name projection');
});

test('runtime value boundary source does not read environment or import runtime side-effect modules', () => {
  const source = readFileSync(new URL('../../../src/runtime-values/runtime-value-boundary.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /process\s*\.\s*env/u);
  assert.doesNotMatch(source, /from\s+['"]node:fs['"]/u);
  assert.doesNotMatch(source, /from\s+['"]node:net['"]/u);
  assert.doesNotMatch(source, /from\s+['"]node:http['"]/u);
  assert.doesNotMatch(source, /from\s+['"]node:https['"]/u);
  assert.doesNotMatch(source, /from\s+['"]node:child_process['"]/u);
  assert.doesNotMatch(source, /from\s+['"]node:worker_threads['"]/u);
});
