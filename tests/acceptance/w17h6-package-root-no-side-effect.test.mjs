import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import test from 'node:test';

const PACKAGE_ROOTS = Object.freeze([
  Object.freeze({
    name: '@hazeteam/openclaw-adapter',
    expectedExports: Object.freeze(['OPENCLAW_ADAPTER_PACKAGE']),
    metadataExport: 'OPENCLAW_ADAPTER_PACKAGE',
  }),
  Object.freeze({
    name: '@hazeteam/openclaw-plugin-runtime',
    expectedExports: Object.freeze([
      'OPENCLAW_PLUGIN_RUNTIME_PACKAGE',
      'OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR',
      'describeOpenClawPluginRuntime',
    ]),
    metadataExport: 'OPENCLAW_PLUGIN_RUNTIME_PACKAGE',
    descriptorExport: 'OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR',
    describeExport: 'describeOpenClawPluginRuntime',
  }),
  Object.freeze({
    name: '@hazeteam/openclaw-telegram-transport',
    expectedExports: Object.freeze([
      'OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE',
      'OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR',
      'describeOpenClawTelegramTransport',
    ]),
    metadataExport: 'OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE',
    descriptorExport: 'OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR',
    describeExport: 'describeOpenClawTelegramTransport',
  }),
  Object.freeze({
    name: '@hazeteam/openclaw-testkit',
    expectedExports: Object.freeze(['OPENCLAW_TESTKIT_PACKAGE']),
    metadataExport: 'OPENCLAW_TESTKIT_PACKAGE',
  }),
]);

const NODE_RUNTIME_ENV_READ_KEYS = Object.freeze([
  'WATCH_REPORT_DEPENDENCIES',
  'NODE_V8_COVERAGE',
]);

const UNSAFE_SERIALIZED_VALUE_PATTERNS = Object.freeze([
  new RegExp('bear' + 'er\\s+[a-z0-9._-]+', 'iu'),
  new RegExp('\\b[0-9]{6,}:[a-z0-9_-]{16,}\\b', 'iu'),
  new RegExp('-----BEGIN (?:RSA |OPENSSH |EC |DSA )?' + 'PRIVATE ' + 'KEY-----', 'u'),
  /https?:\/\//iu,
  /\b(?:clientHandle|sdkHandle|providerClient|runtimeClient|processId|pid)\b/iu,
  /\bError:\s.+\bat\s.+/su,
  new RegExp('\\b(?:api[_-]?' + 'key|pass' + 'word|oauth[_-]?' + 'sec' + 'ret)\\s*[:=]\\s*[^,}\\s]+', 'iu'),
  /(?:^|[\s"'])\/(?:Users|home|var|tmp|mnt|workspace|repo)\//u,
  /[A-Za-z]:\\[^\s"']+/u,
]);

function isNodeRuntimeEnvRead(property) {
  return NODE_RUNTIME_ENV_READ_KEYS.includes(property);
}

function installPackageRootSideEffectGuard() {
  const forbiddenCalls = [];
  const envReads = [];
  const restoreFns = [];

  function pushRestore(restore) {
    restoreFns.push(restore);
  }

  function forbidden(kind, target) {
    forbiddenCalls.push(Object.freeze({ kind, target }));
    throw new Error(`W17H6 package-root import attempted ${kind}: ${target}`);
  }

  function recordEnvRead(property) {
    if (typeof property === 'string' && !isNodeRuntimeEnvRead(property)) {
      envReads.push(property);
    }
  }

  function patchFunction(target, property, kind, targetLabel = property) {
    if (!target || typeof target[property] !== 'function') {
      return;
    }

    const original = target[property];
    try {
      target[property] = function guardedForbiddenSideEffect(..._args) {
        return forbidden(kind, targetLabel);
      };
      pushRestore(() => {
        target[property] = original;
      });
    } catch {
      // Non-writable built-in surfaces are left untouched; other guards still cover the import path.
    }
  }

  function patchGlobalFunction(property, kind, installWhenMissing = false) {
    const hadOwnProperty = Object.prototype.hasOwnProperty.call(globalThis, property);
    const original = globalThis[property];

    if (typeof original !== 'function' && !installWhenMissing) {
      return;
    }

    try {
      globalThis[property] = function guardedForbiddenGlobalSideEffect(..._args) {
        return forbidden(kind, `globalThis.${property}`);
      };
      pushRestore(() => {
        if (hadOwnProperty) {
          globalThis[property] = original;
        } else {
          delete globalThis[property];
        }
      });
    } catch {
      // Non-writable global surfaces are left untouched; other guards still cover the import path.
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
      pushRestore(() => {
        if (hadOwnProperty) {
          globalThis[property] = original;
        } else {
          delete globalThis[property];
        }
      });
    } catch {
      // Non-writable global surfaces are left untouched; other guards still cover the import path.
    }
  }

  function patchEnvReads() {
    const originalDescriptor = Object.getOwnPropertyDescriptor(process, 'env');
    const originalEnv = process.env;
    const guardedEnv = new Proxy(originalEnv, {
      get(target, property, receiver) {
        recordEnvRead(property);
        return Reflect.get(target, property, receiver);
      },
      getOwnPropertyDescriptor(target, property) {
        recordEnvRead(property);
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      has(target, property) {
        recordEnvRead(property);
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
      pushRestore(() => {
        if (originalDescriptor) {
          Object.defineProperty(process, 'env', originalDescriptor);
        } else {
          process.env = originalEnv;
        }
      });
    } catch {
      // Some runtimes may not allow replacing process.env; the side-effect guard remains otherwise active.
    }
  }

  patchGlobalFunction('fetch', 'network-call');
  patchGlobalFunction('setTimeout', 'timer-start');
  patchGlobalFunction('setInterval', 'timer-start');
  patchGlobalFunction('setImmediate', 'timer-start');
  patchGlobalConstructor('WebSocket', 'provider-client-construction');
  patchGlobalConstructor('EventSource', 'provider-client-construction');
  patchGlobalConstructor('TelegramBot', 'provider-client-construction');
  patchGlobalConstructor('Telegraf', 'provider-client-construction');
  patchGlobalConstructor('OpenClawClient', 'provider-client-construction');

  patchFunction(net, 'connect', 'network-call', 'node:net.connect');
  patchFunction(net, 'createConnection', 'network-call', 'node:net.createConnection');
  patchFunction(http, 'request', 'network-call', 'node:http.request');
  patchFunction(http, 'get', 'network-call', 'node:http.get');
  patchFunction(https, 'request', 'network-call', 'node:https.request');
  patchFunction(https, 'get', 'network-call', 'node:https.get');
  patchFunction(net.Server?.prototype, 'listen', 'listener-start', 'node:net.Server.listen');
  patchFunction(http.Server?.prototype, 'listen', 'listener-start', 'node:http.Server.listen');
  patchFunction(https.Server?.prototype, 'listen', 'listener-start', 'node:https.Server.listen');

  patchFunction(fs, 'writeFile', 'filesystem-write', 'node:fs.writeFile');
  patchFunction(fs, 'writeFileSync', 'filesystem-write', 'node:fs.writeFileSync');
  patchFunction(fs, 'appendFile', 'filesystem-write', 'node:fs.appendFile');
  patchFunction(fs, 'appendFileSync', 'filesystem-write', 'node:fs.appendFileSync');
  patchFunction(fs, 'mkdir', 'filesystem-write', 'node:fs.mkdir');
  patchFunction(fs, 'mkdirSync', 'filesystem-write', 'node:fs.mkdirSync');
  patchFunction(fs, 'rm', 'filesystem-write', 'node:fs.rm');
  patchFunction(fs, 'rmSync', 'filesystem-write', 'node:fs.rmSync');
  patchFunction(fs, 'unlink', 'filesystem-write', 'node:fs.unlink');
  patchFunction(fs, 'unlinkSync', 'filesystem-write', 'node:fs.unlinkSync');
  patchFunction(fs, 'createWriteStream', 'filesystem-write', 'node:fs.createWriteStream');
  patchFunction(fs.promises, 'writeFile', 'filesystem-write', 'node:fs.promises.writeFile');
  patchFunction(fs.promises, 'appendFile', 'filesystem-write', 'node:fs.promises.appendFile');
  patchFunction(fs.promises, 'mkdir', 'filesystem-write', 'node:fs.promises.mkdir');
  patchFunction(fs.promises, 'rm', 'filesystem-write', 'node:fs.promises.rm');
  patchFunction(fs.promises, 'unlink', 'filesystem-write', 'node:fs.promises.unlink');

  patchEnvReads();

  return Object.freeze({
    forbiddenCalls,
    envReads,
    restore() {
      for (const restore of restoreFns.toReversed()) {
        restore();
      }
    },
  });
}

function assertPackageRootExports(packageRoot, publicModule) {
  for (const exportName of packageRoot.expectedExports) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(publicModule, exportName),
      `${packageRoot.name} should expose ${exportName}`,
    );
  }
}

function collectPublicImportResults(packageRoot, publicModule) {
  const results = [];

  if (packageRoot.metadataExport) {
    const metadata = publicModule[packageRoot.metadataExport];
    assert.equal(metadata.name, packageRoot.name);
    results.push(Object.freeze({ label: `${packageRoot.name} metadata`, value: metadata }));
  }

  if (packageRoot.descriptorExport) {
    const descriptor = publicModule[packageRoot.descriptorExport];
    assert.equal(descriptor.effects, 'none');
    assert.equal(descriptor.productionReady, false);
    results.push(Object.freeze({ label: `${packageRoot.name} descriptor`, value: descriptor }));
  }

  if (packageRoot.describeExport) {
    const describe = publicModule[packageRoot.describeExport];
    assert.equal(typeof describe, 'function');
    results.push(Object.freeze({ label: `${packageRoot.name} description`, value: describe() }));
  }

  for (const [exportName, value] of Object.entries(publicModule)) {
    if (typeof value !== 'function') {
      results.push(Object.freeze({ label: `${packageRoot.name}.${exportName}`, value }));
    }
  }

  return results;
}

function assertJsonSerializableSafePublicValue(value, label) {
  assertNoRuntimeObject(value, label);

  const encoded = JSON.stringify(value);
  assert.notEqual(encoded, undefined, `${label} should be JSON serializable`);
  assert.deepEqual(JSON.parse(encoded), value, `${label} should round-trip through JSON`);

  for (const pattern of UNSAFE_SERIALIZED_VALUE_PATTERNS) {
    assert.doesNotMatch(encoded, pattern, `${label} should not expose forbidden runtime material`);
  }
}

function assertNoRuntimeObject(value, label, seen = new WeakSet()) {
  if (value === null) {
    return;
  }

  if (typeof value !== 'object') {
    assert.notEqual(typeof value, 'bigint', `${label} should not expose bigint runtime values`);
    assert.notEqual(typeof value, 'symbol', `${label} should not expose symbol runtime values`);
    return;
  }

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  assert.equal(value instanceof Promise, false, `${label} should not expose a Promise`);
  assert.equal(value instanceof EventEmitter, false, `${label} should not expose an EventEmitter`);

  const prototype = Object.getPrototypeOf(value);
  assert.ok(
    Array.isArray(value) || prototype === Object.prototype || prototype === null,
    `${label} should not expose class instances or provider/runtime handles`,
  );

  for (const [property, nestedValue] of Object.entries(value)) {
    assertNoRuntimeObject(nestedValue, `${label}.${property}`, seen);
  }
}

test('W17H6 public package roots import without runtime side effects', async () => {
  const guard = installPackageRootSideEffectGuard();
  const publicResults = [];

  try {
    for (const packageRoot of PACKAGE_ROOTS) {
      const publicModule = await import(packageRoot.name);
      assertPackageRootExports(packageRoot, publicModule);
      publicResults.push(...collectPublicImportResults(packageRoot, publicModule));
    }
  } finally {
    guard.restore();
  }

  assert.deepEqual(guard.forbiddenCalls, [], 'package-root imports should not perform runtime side effects');
  assert.deepEqual(guard.envReads, [], 'package-root imports should not read process.env');

  assert.ok(publicResults.length > 0, 'package-root imports should expose inspectable public results');
  for (const { label, value } of publicResults) {
    assertJsonSerializableSafePublicValue(value, label);
  }
});
