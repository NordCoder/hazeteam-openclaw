import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const BARREL_URL = new URL('../../../dist/runtime-values/index.js', import.meta.url);

const SAFE_REQUEST = Object.freeze({
  credentialRef: 'credential:telegram:w19e',
  secretHandleRef: 'secret-handle:telegram:w19e',
  requestedProviderKind: 'telegram-bot-token',
  bindingPurpose: 'real-smoke-delivery',
  correlationRef: 'correlation:w19e:binding',
  operatorGate: Object.freeze({
    operatorAcknowledged: true,
    bindingEnabled: true,
    contextRef: 'operator:w19e',
  }),
});

const TOKEN_WORD = 'to' + 'ken';
const SECRET_WORD = 'sec' + 'ret';
const RAW_WORD = 'raw';
const PAYLOAD_WORD = 'pay' + 'load';
const ENDPOINT_WORD = 'end' + 'point';
const STACK_WORD = 'st' + 'ack';
const RUNTIME_ONLY_FIELD = 'runtime' + 'Only' + 'Value';

const SENTINELS = Object.freeze({
  runtimeOnlyMaterial: 'w19e-runtime-only-material',
  tokenValue: '123456:' + 'ABCDEF_w19e_provider_value',
  secretValue: 'sk_' + 'live_w19e_value',
  rawPayloadValue: 'w19e-raw-payload-value',
  endpointValue: 'https://' + 'internal.invalid/w19e',
  filesystemPathValue: '/' + 'tmp/hazeteam-openclaw/w19e/no-leak.txt',
  stackTraceValue: 'Error: w19e\n    at unsafe (/' + 'tmp/w19e.js:1:1)',
  providerHandleValue: 'w19e-provider-handle',
  sdkHandleValue: 'w19e-sdk-handle',
});

const FORBIDDEN_VALUE_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._:-]+/iu,
  /https?:\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\bat\s+\S+\s*\(.+:\d+:\d+\)/u,
  /\bsk_(?:live|test)_[A-Za-z0-9_-]+\b/u,
]);

const W18A_RUNTIME_EXPORTS = Object.freeze([
  'createCredentialRef',
  'createSecretHandleRef',
  'createRuntimeOnlyValue',
  'unwrapRuntimeOnlyValue',
  'createRedactedRuntimeCredentialDescriptor',
  'createRuntimeValueResolverResult',
  'projectRuntimeValueReadiness',
  'isRuntimeValuePublicReadinessProjectionJsonSafe',
]);

const W19B_RUNTIME_EXPORTS = Object.freeze([
  'createRuntimeCredentialBindingDescriptor',
  'bindRuntimeCredentialWithPort',
  'normalizeRuntimeCredentialBindingResult',
  'projectRuntimeCredentialBindingPublic',
  'isRuntimeCredentialBindingPublicProjectionJsonSafe',
]);

let barrelPromise;

async function loadRuntimeValuesBarrel() {
  if (barrelPromise === undefined) {
    barrelPromise = importRuntimeValuesBarrelUnderGuard();
  }

  return barrelPromise;
}

async function importRuntimeValuesBarrelUnderGuard() {
  const guard = installRuntimeImportGuard();

  try {
    const barrel = await import(BARREL_URL.href);

    assert.deepEqual(guard.forbiddenCalls, [], 'runtime-values barrel import should not start runtime behavior');
    assert.deepEqual(guard.envReads, [], 'runtime-values barrel import should not read process.env');

    return barrel;
  } finally {
    guard.restore();
  }
}

function installRuntimeImportGuard() {
  const forbiddenCalls = [];
  const envReads = [];
  const restoreFns = [];

  function forbidden(kind, target) {
    forbiddenCalls.push(Object.freeze({ kind, target }));
    throw new Error(`W19E runtime-values barrel import attempted ${kind}: ${target}`);
  }

  function patchGlobalFunction(property, kind) {
    const hadOwnProperty = Object.prototype.hasOwnProperty.call(globalThis, property);
    const original = globalThis[property];

    if (typeof original !== 'function') {
      return;
    }

    try {
      globalThis[property] = function guardedForbiddenRuntimeCall(..._args) {
        return forbidden(kind, `globalThis.${property}`);
      };
      restoreFns.push(() => {
        if (hadOwnProperty) {
          globalThis[property] = original;
        } else {
          delete globalThis[property];
        }
      });
    } catch {
      // Non-writable globals are left untouched; source assertions below still guard the barrel.
    }
  }

  function patchGlobalConstructor(property, kind) {
    const hadOwnProperty = Object.prototype.hasOwnProperty.call(globalThis, property);
    const original = globalThis[property];

    try {
      globalThis[property] = class GuardedForbiddenRuntimeConstructor {
        constructor() {
          forbidden(kind, `globalThis.${property}`);
        }
      };
      restoreFns.push(() => {
        if (hadOwnProperty) {
          globalThis[property] = original;
        } else {
          delete globalThis[property];
        }
      });
    } catch {
      // Non-writable globals are left untouched; source assertions below still guard the barrel.
    }
  }

  function patchEnvReads() {
    const originalDescriptor = Object.getOwnPropertyDescriptor(process, 'env');
    const originalEnv = process.env;
    const guardedEnv = new Proxy(originalEnv, {
      get(target, property, receiver) {
        if (typeof property === 'string' && !isNodeRuntimeAllowedEnvRead(property)) {
          envReads.push(property);
        }
        return Reflect.get(target, property, receiver);
      },
      getOwnPropertyDescriptor(target, property) {
        if (typeof property === 'string' && !isNodeRuntimeAllowedEnvRead(property)) {
          envReads.push(property);
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      has(target, property) {
        if (typeof property === 'string' && !isNodeRuntimeAllowedEnvRead(property)) {
          envReads.push(property);
        }
        return Reflect.has(target, property);
      },
      ownKeys(target) {
        envReads.push('*');
        return Reflect.ownKeys(target);
      },
    });

    try {
      Object.defineProperty(process, 'env', {
        configurable: true,
        enumerable: true,
        value: guardedEnv,
        writable: true,
      });
      restoreFns.push(() => {
        if (originalDescriptor) {
          Object.defineProperty(process, 'env', originalDescriptor);
        } else {
          process.env = originalEnv;
        }
      });
    } catch {
      // Some runtimes may not allow replacing process.env; source assertions below remain in force.
    }
  }

  patchGlobalFunction('fetch', 'network-call');
  patchGlobalFunction('setInterval', 'timer-start');
  patchGlobalFunction('setTimeout', 'timer-start');
  patchGlobalFunction('setImmediate', 'timer-start');
  patchGlobalConstructor('WebSocket', 'provider-client-construction');
  patchGlobalConstructor('EventSource', 'provider-client-construction');
  patchEnvReads();

  return Object.freeze({
    forbiddenCalls,
    envReads,
    restore() {
      for (let index = restoreFns.length - 1; index >= 0; index -= 1) {
        restoreFns[index]();
      }
    },
  });
}

function isNodeRuntimeAllowedEnvRead(property) {
  return property === 'WATCH_REPORT_DEPENDENCIES' || property === 'NODE_V8_COVERAGE';
}

function unsafeText(status) {
  return [
    `${status} binding material`,
    TOKEN_WORD + '=' + SENTINELS.tokenValue,
    SECRET_WORD + '=' + SENTINELS.secretValue,
    RAW_WORD + PAYLOAD_WORD + '=' + SENTINELS.rawPayloadValue,
    ENDPOINT_WORD + '=' + SENTINELS.endpointValue,
    STACK_WORD + '=' + SENTINELS.stackTraceValue,
    'providerHandle=' + SENTINELS.providerHandleValue,
    'sdkHandle=' + SENTINELS.sdkHandleValue,
  ].join(' ');
}

function assertNoSentinelLeak(value, label) {
  const encoded = JSON.stringify(value);
  assert.equal(typeof encoded, 'string', `${label} should serialize to JSON`);
  assert.deepEqual(JSON.parse(encoded), value, `${label} should round-trip through JSON`);

  for (const sentinel of Object.values(SENTINELS)) {
    assert.equal(encoded.includes(sentinel), false, `${label} leaked sentinel ${sentinel}`);
  }

  for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
    assert.doesNotMatch(encoded, pattern, `${label} leaked forbidden runtime material`);
  }
}

test('runtime-values barrel preserves W18A exports and adds W19B credential-binding exports', async () => {
  const barrel = await loadRuntimeValuesBarrel();

  for (const exportName of W18A_RUNTIME_EXPORTS) {
    assert.equal(typeof barrel[exportName], 'function', `W18A export ${exportName} should remain available`);
  }

  assert.equal(typeof barrel.RuntimeOnlyValue, 'function', 'W18A RuntimeOnlyValue class should remain available');

  for (const exportName of W19B_RUNTIME_EXPORTS) {
    assert.equal(typeof barrel[exportName], 'function', `W19B export ${exportName} should be available from the barrel`);
  }

  const barrelSource = readFileSync(new URL('../../../src/runtime-values/index.ts', import.meta.url), 'utf8');
  assert.match(barrelSource, /runtime-value-boundary\.js/u);
  assert.match(barrelSource, /runtime-credential-binding-port\.js/u);
});

test('credential binding descriptor can be created through the runtime-values barrel', async () => {
  const barrel = await loadRuntimeValuesBarrel();

  const descriptor = barrel.createRuntimeCredentialBindingDescriptor({
    ...SAFE_REQUEST,
    redactedLabel: unsafeText('descriptor'),
    safeDiagnostics: [SENTINELS.endpointValue, SENTINELS.filesystemPathValue],
  });

  assert.equal(descriptor.credentialRef, SAFE_REQUEST.credentialRef);
  assert.equal(descriptor.secretHandleRef, SAFE_REQUEST.secretHandleRef);
  assert.equal(descriptor.credentialStatus, 'configured');
  assert.equal(descriptor.kind, SAFE_REQUEST.requestedProviderKind);
  assert.equal(descriptor.sourceClass, 'injected-port');
  assertNoSentinelLeak(descriptor, 'barrel-created binding descriptor');
});

test('bindRuntimeCredentialWithPort binds with an injected test port and public projection omits runtime-only value', async () => {
  const barrel = await loadRuntimeValuesBarrel();
  const runtimeOnlyValue = barrel.createRuntimeOnlyValue(SENTINELS.runtimeOnlyMaterial);
  let calls = 0;

  const result = await barrel.bindRuntimeCredentialWithPort({
    request: { ...SAFE_REQUEST, safeDiagnostics: [unsafeText('request')] },
    port: {
      bindRuntimeCredential: (request) => {
        calls += 1;
        assert.equal(request.credentialRef, SAFE_REQUEST.credentialRef);
        assert.equal(request.secretHandle.secretHandleRef, SAFE_REQUEST.secretHandleRef);

        return {
          bindingStatus: 'bound-runtime-only',
          credentialRef: request.credentialRef,
          secretHandleRef: request.secretHandle.secretHandleRef,
          runtimeOnlyValue,
          safeDiagnostics: [unsafeText('port')],
        };
      },
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.bindingStatus, 'bound-runtime-only');
  assert.equal(result.runtimeOnlyValue, runtimeOnlyValue);
  assert.throws(() => JSON.stringify(result), /Runtime-only value cannot be serialized/u);

  const projection = barrel.projectRuntimeCredentialBindingPublic(result);
  assert.equal(projection.bindingStatus, 'bound-runtime-only');
  assert.equal(RUNTIME_ONLY_FIELD in projection, false);
  assert.equal(barrel.isRuntimeCredentialBindingPublicProjectionJsonSafe(projection), true);
  assertNoSentinelLeak(projection, 'bound runtime credential binding public projection');
});

test('public projection JSON does not leak runtime-only or secret sentinel material', async () => {
  const barrel = await loadRuntimeValuesBarrel();
  const runtimeOnlyValue = barrel.createRuntimeOnlyValue(SENTINELS.runtimeOnlyMaterial);

  const result = await barrel.bindRuntimeCredentialWithPort({
    request: {
      ...SAFE_REQUEST,
      redactedLabel: unsafeText('json'),
      safeDiagnostics: [unsafeText('diagnostic')],
    },
    port: {
      bindRuntimeCredential: () => ({
        bindingStatus: 'bound-runtime-only',
        runtimeOnlyValue,
        safeDiagnostics: [unsafeText('port')],
      }),
    },
  });

  const projection = barrel.projectRuntimeCredentialBindingPublic(result);
  const encoded = JSON.stringify(projection);

  assert.equal(typeof encoded, 'string');
  assert.equal(encoded.includes(SENTINELS.runtimeOnlyMaterial), false);
  assert.equal(encoded.includes(SENTINELS.secretValue), false);
  assert.equal(encoded.includes(SENTINELS.tokenValue), false);
  assert.equal(encoded.includes(SENTINELS.rawPayloadValue), false);
  assert.equal(encoded.includes(RUNTIME_ONLY_FIELD), false);
  assertNoSentinelLeak(projection, 'runtime credential binding projection JSON');
});

test('malformed injected result fails safely through the runtime-values barrel', async () => {
  const barrel = await loadRuntimeValuesBarrel();

  const result = await barrel.bindRuntimeCredentialWithPort({
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
  assert.equal(RUNTIME_ONLY_FIELD in result, false);
  assertNoSentinelLeak(barrel.projectRuntimeCredentialBindingPublic(result), 'malformed binding public projection');
});

test('missing credential binding port blocks safely through the runtime-values barrel', async () => {
  const barrel = await loadRuntimeValuesBarrel();

  const result = await barrel.bindRuntimeCredentialWithPort({ request: SAFE_REQUEST });

  assert.equal(result.bindingStatus, 'blocked-missing-port');
  assert.equal(result.bindingSourceClass, 'missing-port');
  assert.equal(RUNTIME_ONLY_FIELD in result, false);

  const projection = barrel.projectRuntimeCredentialBindingPublic(result);
  assert.equal(projection.bindingStatus, 'blocked-missing-port');
  assert.equal(RUNTIME_ONLY_FIELD in projection, false);
  assert.equal(barrel.isRuntimeCredentialBindingPublicProjectionJsonSafe(projection), true);
  assertNoSentinelLeak(projection, 'missing port public projection');
});

test('runtime-values barrel export source remains inert and does not add credential loading behavior', () => {
  const barrelSource = readFileSync(new URL('../../../src/runtime-values/index.ts', import.meta.url), 'utf8');
  const bindingSource = readFileSync(
    new URL('../../../src/runtime-values/runtime-credential-binding-port.ts', import.meta.url),
    'utf8',
  );
  const combinedSource = `${barrelSource}\n${bindingSource}`;

  assert.doesNotMatch(combinedSource, /process\s*\.\s*env/u);
  assert.doesNotMatch(combinedSource, /from\s+['"]node:fs['"]/u);
  assert.doesNotMatch(combinedSource, /from\s+['"]node:net['"]/u);
  assert.doesNotMatch(combinedSource, /from\s+['"]node:http['"]/u);
  assert.doesNotMatch(combinedSource, /from\s+['"]node:https['"]/u);
  assert.doesNotMatch(combinedSource, /from\s+['"]node:tls['"]/u);
  assert.doesNotMatch(combinedSource, /fetch\s*\(/u);
  assert.doesNotMatch(combinedSource, /createServer\s*\(/u);
  assert.doesNotMatch(combinedSource, /listen\s*\(/u);
  assert.doesNotMatch(combinedSource, /setInterval\s*\(/u);
  assert.doesNotMatch(combinedSource, /WebSocket/u);
  assert.doesNotMatch(combinedSource, /secretManager|vault|credentialLoader|loadCredentials/iu);
});
