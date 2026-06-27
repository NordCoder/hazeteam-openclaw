import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const DIST_MODULE_URL = new URL('../../../dist/durable-state/durable-state-contract-types.js', import.meta.url);
const SOURCE_URL = new URL('../../../src/durable-state/durable-state-contract-types.ts', import.meta.url);
const PACKAGE_ROOT_SOURCE_URL = new URL('../../../src/index.ts', import.meta.url);
const PACKAGE_ROOT_DIST_URL = new URL('../../../dist/index.js', import.meta.url);
const LOCAL_DURABLE_BARREL_URL = new URL('../../../src/durable-state/index.ts', import.meta.url);

const UNSAFE_PUBLIC_FIELD_NAMES = Object.freeze([
  'token',
  'secret',
  'credential',
  'password',
  'apiKey',
  'authHeader',
  'endpoint',
  'url',
  'rawPayload',
  'rawProviderPayload',
  'rawCallbackPayload',
  'stack',
  'stackTrace',
  'localPath',
  'stdout',
  'stderr',
  'client',
  'sdk',
  'handle',
  'processEnv',
  'runtimeValue',
]);

const FORBIDDEN_RUNTIME_SNIPPETS = Object.freeze([
  'process.env',
  "from 'node:fs'",
  'from "node:fs"',
  "from 'node:path'",
  'from "node:path"',
  "from 'node:http'",
  'from "node:http"',
  "from 'node:https'",
  'from "node:https"',
  "from 'node:net'",
  'from "node:net"',
  "from 'node:tls'",
  'from "node:tls"',
  "from 'node:dns'",
  'from "node:dns"',
  'fetch(',
  'new WebSocket',
  'EventSource',
  'setInterval(',
  'setTimeout(',
  'createServer(',
  '.listen(',
]);

const FORBIDDEN_BEHAVIOR_SNIPPETS = Object.freeze([
  'createStore',
  'openStore',
  'connectStore',
  'database',
  'cache',
  'queue',
  'migration',
  'backup',
  'restore',
  'replay CLI',
  'recovery runtime',
  'SQL',
  'ORM',
  'Prisma',
  'TypeORM',
  'Redis',
  'Kafka',
  'RabbitMQ',
  'SQLite',
  'Postgres',
]);

function readSource(url) {
  return readFileSync(url, 'utf8');
}

function assertJsonSafe(value, label) {
  const encoded = JSON.stringify(value);
  assert.equal(typeof encoded, 'string', `${label} should serialize to JSON`);
  assert.deepEqual(JSON.parse(encoded), value, `${label} should round-trip through JSON`);
}

function sourceFieldNames(source) {
  return [...source.matchAll(/\breadonly\s+([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:/gu)].map((match) => match[1]);
}

test('durable-state contract leaf imports from built output without runtime exports', async () => {
  const module = await import(DIST_MODULE_URL.href);

  assert.deepEqual(Object.keys(module), [], 'type-only durable-state contract leaf should have no runtime exports');
});

test('runtime descriptor exports stay JSON-safe when present', async () => {
  const module = await import(DIST_MODULE_URL.href);

  for (const [name, value] of Object.entries(module)) {
    if (name.toLowerCase().includes('descriptor')) {
      assertJsonSafe(value, name);
    }
  }
});

test('source contract avoids unsafe public field names', () => {
  const source = readSource(SOURCE_URL);
  const fields = new Set(sourceFieldNames(source));

  for (const unsafeFieldName of UNSAFE_PUBLIC_FIELD_NAMES) {
    assert.equal(fields.has(unsafeFieldName), false, `source exposed unsafe public field ${unsafeFieldName}`);
  }

  assert.equal(fields.has('tokenRef'), true, 'source should expose safe tokenRef vocabulary');
  assert.equal(fields.has('providerAcknowledged'), true, 'source should expose provider acknowledgement separately');
  assert.equal(fields.has('businessSuccess'), true, 'source should expose business success separately');
  assert.equal(fields.has('redactedSummary'), true, 'source should expose redacted summary vocabulary');
});

test('source contract has no runtime, storage, provider, or network imports', () => {
  const source = readSource(SOURCE_URL);

  assert.doesNotMatch(source, /^\s*import\s/mu, 'type-only contract source should not import runtime modules');
  assert.doesNotMatch(source, /\brequire\s*\(/u, 'type-only contract source should not require runtime modules');

  for (const snippet of FORBIDDEN_RUNTIME_SNIPPETS) {
    assert.equal(source.includes(snippet), false, `source should not include runtime snippet ${snippet}`);
  }
});

test('source contract does not add production durable behavior', () => {
  const source = readSource(SOURCE_URL);

  for (const snippet of FORBIDDEN_BEHAVIOR_SNIPPETS) {
    assert.equal(source.includes(snippet), false, `source should not include production behavior snippet ${snippet}`);
  }

  assert.doesNotMatch(source, /\bclass\s+[A-Za-z0-9_$]*(Store|Backend|Repository)\b/u);
  assert.doesNotMatch(source, /\bfunction\s+(connect|migrate|recover|schedule|listen|poll)[A-Za-z0-9_$]*\b/u);
});

test('provider acknowledgement and business success vocabulary remain distinct', () => {
  const source = readSource(SOURCE_URL);

  assert.match(source, /readonly\s+providerAcknowledged:\s+boolean;/u);
  assert.match(source, /readonly\s+businessSuccess:\s+boolean;/u);
  assert.match(source, /readonly\s+providerAcknowledgementImpliesBusinessSuccess:\s+false;/u);
  assert.match(source, /readonly\s+passRequiresProviderAcknowledgementAndBusinessSuccess:\s+true;/u);
  assert.doesNotMatch(source, /providerSuccess/u);
});

test('W21B durable-state contracts fan into package root only through W21F durable-state barrel', async () => {
  const packageRoot = readSource(PACKAGE_ROOT_SOURCE_URL);
  const localBarrel = readSource(LOCAL_DURABLE_BARREL_URL);
  const packageRootModule = await import(PACKAGE_ROOT_DIST_URL.href);

  assert.equal(packageRoot.includes("export * from './durable-state/index.js';"), true);
  assert.equal(packageRoot.includes('durable-state-contract-types'), false);
  assert.equal(localBarrel.includes("export type * from './durable-state-contract-types.js';"), true);
  assert.equal(localBarrel.includes('../../index'), false, 'local durable barrel should not fan into package root');

  for (const typeOnlyName of [
    'DurableAdapterStateContract',
    'DurableAdapterPublicStateProjection',
    'DurableAdapterReadinessClassification',
  ]) {
    assert.equal(Object.hasOwn(packageRootModule, typeOnlyName), false, `${typeOnlyName} should remain type-only`);
  }
});
