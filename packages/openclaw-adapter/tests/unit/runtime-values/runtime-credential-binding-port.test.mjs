import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createRuntimeOnlyValue } from '../../../dist/runtime-values/index.js';
import {
  bindRuntimeCredentialWithPort,
  createRuntimeCredentialBindingDescriptor,
  isRuntimeCredentialBindingPublicProjectionJsonSafe,
  projectRuntimeCredentialBindingPublic,
} from '../../../dist/runtime-values/runtime-credential-binding-port.js';

const RAW = 'raw';
const PAYLOAD = 'pay' + 'load';
const TOKEN_WORD = 'to' + 'ken';
const SECRET_WORD = 'sec' + 'ret';
const CREDENTIAL_WORD = 'creden' + 'tial';
const ENDPOINT_WORD = 'end' + 'point';
const STACK_WORD = 'st' + 'ack';
const CLIENT_WORD = 'cli' + 'ent';
const SDK_CLIENT_WORD = 'sdk' + 'Client';
const RUNTIME_VALUE_WORD = 'runtime' + 'Only' + 'Value';

const SENTINELS = Object.freeze({
  runtimeOnlyMaterial: 'w19b-runtime-only-material',
  tokenValue: '123456:' + 'ABCDEF_w19b_provider_value',
  secretValue: 'sk_' + 'live_w19b_value',
  rawPayloadValue: 'w19b-raw-payload-value',
  endpointValue: 'https://' + 'internal.invalid/w19b',
  filesystemPathValue: '/' + 'tmp/hazeteam-openclaw/w19b/no-leak.txt',
  stackTraceValue: 'Error: w19b\n    at unsafe (/' + 'tmp/w19b.js:1:1)',
  providerHandleValue: 'w19b-provider-handle',
  sdkHandleValue: 'w19b-sdk-handle',
  clientHandleValue: 'w19b-client-handle',
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
  'providerHandle',
  'sdkHandle',
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

function unsafeText(status) {
  return [
    `${status} binding failed`,
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

const SAFE_REQUEST = Object.freeze({
  credentialRef: 'credential:telegram:w19b',
  secretHandleRef: 'secret-handle:telegram:w19b',
  requestedProviderKind: 'telegram-bot-token',
  bindingPurpose: 'real-smoke-delivery',
  correlationRef: 'correlation:w19b:binding',
  operatorGate: Object.freeze({
    operatorAcknowledged: true,
    bindingEnabled: true,
    contextRef: 'operator:w19b',
  }),
});

test('safe binding descriptor creation uses only redacted runtime credential vocabulary', () => {
  const descriptor = createRuntimeCredentialBindingDescriptor({
    ...SAFE_REQUEST,
    redactedLabel: unsafeText('descriptor'),
    safeDiagnostics: [SENTINELS.endpointValue, SENTINELS.filesystemPathValue],
  });

  assert.equal(descriptor.credentialRef, SAFE_REQUEST.credentialRef);
  assert.equal(descriptor.secretHandleRef, SAFE_REQUEST.secretHandleRef);
  assert.equal(descriptor.credentialStatus, 'configured');
  assert.equal(descriptor.kind, SAFE_REQUEST.requestedProviderKind);
  assert.equal(descriptor.sourceClass, 'injected-port');
  assertNoPublicLeak(descriptor, 'safe binding descriptor');
});

test('missing credential ref blocks before calling an injected port', async () => {
  let calls = 0;
  const result = await bindRuntimeCredentialWithPort({
    request: { requestedProviderKind: 'telegram-bot-token', bindingPurpose: 'real-smoke-delivery' },
    port: { bindRuntimeCredential: () => { calls += 1; throw new Error('must not be called'); } },
  });

  assert.equal(calls, 0);
  assert.equal(result.bindingStatus, 'blocked-missing-ref');
  assert.equal('credentialRef' in result, false);
  assert.equal('runtimeOnlyValue' in result, false);
  assertNoPublicLeak(projectRuntimeCredentialBindingPublic(result), 'missing credential ref projection');
});

test('unsafe credential ref blocks before calling an injected port', async () => {
  let calls = 0;
  const result = await bindRuntimeCredentialWithPort({
    request: { ...SAFE_REQUEST, credentialRef: 'credential:telegram unsafe/w19b' },
    port: { bindRuntimeCredential: () => { calls += 1; throw new Error('must not be called'); } },
  });

  assert.equal(calls, 0);
  assert.equal(result.bindingStatus, 'blocked-unsafe-ref');
  assert.equal('runtimeOnlyValue' in result, false);
  assertNoPublicLeak(projectRuntimeCredentialBindingPublic(result), 'unsafe credential ref projection');
});

test('missing injected port blocks with a redacted descriptor', async () => {
  const result = await bindRuntimeCredentialWithPort({ request: SAFE_REQUEST });

  assert.equal(result.bindingStatus, 'blocked-missing-port');
  assert.equal(result.bindingSourceClass, 'missing-port');
  assert.equal(result.redactedDescriptor.credentialRef, SAFE_REQUEST.credentialRef);
  assert.equal('runtimeOnlyValue' in result, false);
  assertNoPublicLeak(projectRuntimeCredentialBindingPublic(result), 'missing injected port projection');
});

test('disabled binding blocks before calling an injected port', async () => {
  let calls = 0;
  const result = await bindRuntimeCredentialWithPort({
    request: { ...SAFE_REQUEST, operatorGate: { ...SAFE_REQUEST.operatorGate, bindingEnabled: false } },
    port: { bindRuntimeCredential: () => { calls += 1; throw new Error('must not be called'); } },
  });

  assert.equal(calls, 0);
  assert.equal(result.bindingStatus, 'blocked-disabled');
  assert.equal('runtimeOnlyValue' in result, false);
  assertNoPublicLeak(projectRuntimeCredentialBindingPublic(result), 'disabled binding projection');
});

test('injected port may return runtime-only value internally and public projection redacts it', async () => {
  const runtimeOnlyValue = createRuntimeOnlyValue(SENTINELS.runtimeOnlyMaterial);
  const result = await bindRuntimeCredentialWithPort({
    request: { ...SAFE_REQUEST, safeDiagnostics: [unsafeText('bound')] },
    port: {
      bindRuntimeCredential: (request) => ({
        bindingStatus: 'bound-runtime-only',
        credentialRef: request.credentialRef,
        secretHandleRef: SAFE_REQUEST.secretHandleRef,
        runtimeOnlyValue,
        safeDiagnostics: [unsafeText('port')],
      }),
    },
  });

  assert.equal(result.bindingStatus, 'bound-runtime-only');
  assert.equal(result.runtimeOnlyValue, runtimeOnlyValue);
  assert.throws(() => JSON.stringify(result), /Runtime-only value cannot be serialized/u);

  const projection = projectRuntimeCredentialBindingPublic(result);
  assert.equal(projection.bindingStatus, 'bound-runtime-only');
  assert.equal('runtimeOnlyValue' in projection, false);
  assert.equal(isRuntimeCredentialBindingPublicProjectionJsonSafe(projection), true);
  assertNoPublicLeak(projection, 'bound runtime-only public projection');
});

test('redacted-only binding result stays JSON-serializable and no-leak', async () => {
  const result = await bindRuntimeCredentialWithPort({
    request: SAFE_REQUEST,
    port: {
      bindRuntimeCredential: () => ({
        bindingStatus: 'redacted-only',
        bindingIssue: {
          bindingIssue: 'redacted-only',
          severity: 'info',
          message: unsafeText('redacted-only'),
        },
      }),
    },
  });

  assert.equal(result.bindingStatus, 'redacted-only');
  assert.equal('runtimeOnlyValue' in result, false);
  assertNoPublicLeak(projectRuntimeCredentialBindingPublic(result), 'redacted-only public projection');
});

test('JSON.stringify on public projection does not leak secret or runtime-only material', async () => {
  const result = await bindRuntimeCredentialWithPort({
    request: { ...SAFE_REQUEST, redactedLabel: unsafeText('json'), safeDiagnostics: [unsafeText('diagnostic')] },
    port: {
      bindRuntimeCredential: () => ({
        bindingStatus: 'blocked-disabled',
        bindingIssue: {
          bindingIssue: 'blocked-disabled',
          severity: 'blocked',
          message: unsafeText('issue'),
        },
        safeDiagnostics: [unsafeText('port')],
      }),
    },
  });

  const projection = projectRuntimeCredentialBindingPublic(result);
  const encoded = JSON.stringify(projection);
  assert.equal(typeof encoded, 'string');
  assertNoForbiddenValues(encoded, 'public projection stringify');
});

test('malformed injected result fails safely without exposing raw material', async () => {
  const result = await bindRuntimeCredentialWithPort({
    request: SAFE_REQUEST,
    port: {
      bindRuntimeCredential: () => ({
        bindingStatus: 'bound-runtime-only',
        runtimeOnlyValue: SENTINELS.runtimeOnlyMaterial,
        rawSecret: SENTINELS.secretValue,
      }),
    },
  });

  assert.equal(result.bindingStatus, 'failed-safe');
  assert.equal(result.bindingIssue.bindingIssue, 'malformed-port-result');
  assert.equal('runtimeOnlyValue' in result, false);
  assertNoPublicLeak(projectRuntimeCredentialBindingPublic(result), 'malformed result projection');
});

test('runtime credential binding port import has no side effects or unsafe source access', () => {
  assert.equal(typeof bindRuntimeCredentialWithPort, 'function');
  assert.equal(typeof projectRuntimeCredentialBindingPublic, 'function');

  const source = readFileSync(new URL('../../../src/runtime-values/runtime-credential-binding-port.ts', import.meta.url), 'utf8');

  assert.equal(source.includes('process.env'), false);
  assert.doesNotMatch(source, /process\s*\.\s*env/u);
  assert.doesNotMatch(source, /from\s+['"]node:fs['"]/u);
  assert.doesNotMatch(source, /from\s+['"]node:net['"]/u);
  assert.doesNotMatch(source, /from\s+['"]node:http['"]/u);
  assert.doesNotMatch(source, /from\s+['"]node:https['"]/u);
  assert.doesNotMatch(source, /from\s+['"]node:tls['"]/u);
  assert.doesNotMatch(source, /fetch\s*\(/u);
  assert.doesNotMatch(source, /createServer\s*\(/u);
  assert.doesNotMatch(source, /listen\s*\(/u);
  assert.doesNotMatch(source, /setInterval\s*\(/u);
  assert.doesNotMatch(source, /WebSocket/u);
});
