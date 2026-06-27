import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const W21B_SOURCE = Object.freeze([
  'packages',
  'openclaw-adapter',
  'src',
  'durable-state',
  'durable-state-contract-types.ts',
]);

const W21B_UNIT_GUARD = Object.freeze([
  'packages',
  'openclaw-adapter',
  'tests',
  'unit',
  'durable-state',
  'durable-state-contract-types.test.mjs',
]);

const INSPECTED_FILES = Object.freeze([W21B_SOURCE, W21B_UNIT_GUARD]);

const GUARDED_READINESS_CLASSIFIER = 'adapter-ready-for-real-system-integration-under-explicit-gates';

const FORBIDDEN_PUBLIC_FIELD_NAMES = Object.freeze([
  'token',
  'tokenValue',
  'rawToken',
  'callbackToken',
  'callbackTokenValue',
  'providerToken',
  'providerTokenValue',
  'secret',
  'secrets',
  'credential',
  'credentialValue',
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

const FORBIDDEN_PUBLIC_FIELD_PATTERNS = Object.freeze([
  /(?:^|[A-Z])(?:TokenValue|RawToken|CallbackTokenValue|ProviderTokenValue)$/u,
  /(?:^|[A-Z])(?:Secret|CredentialValue|Password|ApiKey|AuthHeader)$/u,
  /(?:^|[A-Z])(?:Endpoint|Url)$/u,
  /(?:^|[A-Z])(?:RawPayload|RawProviderPayload|RawCallbackPayload)$/u,
  /(?:^|[A-Z])(?:Stack|StackTrace|LocalPath|Stdout|Stderr)$/u,
  /(?:^|[A-Z])(?:Client|Sdk|Handle|ProcessEnv|RuntimeValue)$/u,
]);

const FORBIDDEN_RUNTIME_IMPORT_OR_SNIPPETS = Object.freeze([
  'process.env',
  "from 'node:fs'",
  'from "node:fs"',
  "from 'node:path'",
  'from "node:path"',
  "from 'node:process'",
  'from "node:process"',
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
  "require('fs')",
  'require("fs")',
  "require('path')",
  'require("path")',
  "require('http')",
  'require("http")',
  "require('https')",
  'require("https")',
  "require('net')",
  'require("net")',
  "require('tls')",
  'require("tls")',
  'fetch(',
  'new WebSocket',
  'WebSocket(',
  'EventSource',
]);

const FORBIDDEN_STORAGE_OR_QUEUE_SNIPPETS = Object.freeze([
  'database',
  'cache',
  'queue',
  'migration',
  'migrate(',
  'Prisma',
  'PrismaClient',
  'TypeORM',
  'Sequelize',
  'Redis',
  'Kafka',
  'RabbitMQ',
  'SQLite',
  'Postgres',
  'Mongo',
  'CREATE TABLE',
  'ALTER TABLE',
  'SELECT ',
  'INSERT ',
  'UPDATE ',
  'DELETE FROM',
]);

const FORBIDDEN_RUNTIME_BEHAVIOR_SNIPPETS = Object.freeze([
  'setTimeout(',
  'setInterval(',
  'scheduler',
  'cron',
  'daemon',
  'supervisor',
  'child_process',
  'createServer(',
  '.listen(',
  'webhook',
  'polling',
  'listener',
  'replay CLI',
  'backup',
  'restore',
  'recovery runtime',
  'credential loading',
  'loadCredential',
  'loadSecret',
  'OCA',
  'LifeOS',
  'sidecar',
]);

const FORBIDDEN_PROVIDER_SDK_SNIPPETS = Object.freeze([
  "from 'telegraf'",
  'from "telegraf"',
  "from 'grammy'",
  'from "grammy"',
  "from 'node-telegram-bot-api'",
  'from "node-telegram-bot-api"',
  "from '@openclaw/",
  'from "@openclaw/',
  'new Telegram',
  'new OpenClaw',
  'createTelegramClient',
  'createOpenClawClient',
]);

function repoPath(segments) {
  return path.join(repoRoot, ...segments);
}

function asRepoRelative(segments) {
  return segments.join('/');
}

function readUtf8(segments) {
  return readFileSync(repoPath(segments), 'utf8');
}

function assertIncludes(source, expected, label) {
  assert.equal(source.includes(expected), true, `${label} should include ${expected}`);
}

function assertDoesNotInclude(source, forbidden, label) {
  assert.equal(source.includes(forbidden), false, `${label} should not include ${forbidden}`);
}

function countOccurrences(source, needle) {
  let count = 0;
  let index = source.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = source.indexOf(needle, index + needle.length);
  }
  return count;
}

function sourceFieldNames(source) {
  return [...source.matchAll(/\breadonly\s+([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:/gu)].map((match) => match[1]);
}

test('W21E1 inspects only W21B durable-state contract source and W21B unit evidence', () => {
  assert.deepEqual(
    INSPECTED_FILES.map(asRepoRelative),
    [
      'packages/openclaw-adapter/src/durable-state/durable-state-contract-types.ts',
      'packages/openclaw-adapter/tests/unit/durable-state/durable-state-contract-types.test.mjs',
    ],
  );

  for (const file of INSPECTED_FILES) {
    assert.equal(asRepoRelative(file).includes('w21c'), false, `${asRepoRelative(file)} should not inspect W21C`);
  }
});

test('W21B contract source avoids protected public field names', () => {
  const source = readUtf8(W21B_SOURCE);
  const fields = new Set(sourceFieldNames(source));

  for (const fieldName of FORBIDDEN_PUBLIC_FIELD_NAMES) {
    assert.equal(fields.has(fieldName), false, `W21B contract source exposed forbidden field ${fieldName}`);
  }

  for (const fieldName of fields) {
    for (const pattern of FORBIDDEN_PUBLIC_FIELD_PATTERNS) {
      assert.equal(pattern.test(fieldName), false, `W21B contract source exposed forbidden field pattern ${fieldName}`);
    }
  }

  assert.equal(fields.has('tokenRef'), true, 'W21B should expose only opaque tokenRef vocabulary');
  assert.equal(fields.has('providerAcknowledged'), true, 'W21B should expose provider acknowledgement separately');
  assert.equal(fields.has('businessSuccess'), true, 'W21B should expose business success separately');
  assert.equal(fields.has('redactedSummary'), true, 'W21B should expose redacted summary vocabulary');
});

test('W21B contract source has no runtime, storage, provider SDK, or network snippets', () => {
  const source = readUtf8(W21B_SOURCE);
  const snippetGroups = [
    FORBIDDEN_RUNTIME_IMPORT_OR_SNIPPETS,
    FORBIDDEN_STORAGE_OR_QUEUE_SNIPPETS,
    FORBIDDEN_RUNTIME_BEHAVIOR_SNIPPETS,
    FORBIDDEN_PROVIDER_SDK_SNIPPETS,
  ];

  assert.doesNotMatch(source, /^\s*import\s/mu, 'W21B type-only contract source should not import modules');
  assert.doesNotMatch(source, /\brequire\s*\(/u, 'W21B type-only contract source should not require modules');
  assert.doesNotMatch(source, /\bclass\s+[A-Za-z0-9_$]*(?:Store|Backend|Repository|Storage|Database|Queue|Cache)\b/u);
  assert.doesNotMatch(source, /\bfunction\s+(?:create|open|connect|migrate|backup|restore|recover|schedule|listen|poll)[A-Za-z0-9_$]*\b/u);

  for (const snippets of snippetGroups) {
    for (const snippet of snippets) {
      assertDoesNotInclude(source, snippet, 'W21B contract source');
    }
  }
});

test('W21B keeps provider acknowledgement and business success separate', () => {
  const source = readUtf8(W21B_SOURCE);

  assert.match(source, /readonly\s+providerAcknowledged:\s+boolean;/u);
  assert.match(source, /readonly\s+businessSuccess:\s+boolean;/u);
  assertIncludes(source, 'readonly providerAcknowledgementImpliesBusinessSuccess: false;', 'W21B contract source');
  assertIncludes(source, 'readonly passRequiresProviderAcknowledgementAndBusinessSuccess: true;', 'W21B contract source');
  assert.doesNotMatch(source, /\bproviderSuccess\b/u, 'W21B should not collapse provider acknowledgement into success');
  assert.doesNotMatch(source, /\bbusinessAcknowledged\b/u, 'W21B should not collapse business success into acknowledgement');
});

test('W21B keeps ready-to-attempt and ready-to-run below pass', () => {
  const source = readUtf8(W21B_SOURCE);

  assertIncludes(source, "'ready-to-attempt'", 'W21B contract source');
  assertIncludes(source, "'ready-to-run'", 'W21B contract source');
  assertIncludes(source, "'ready-to-attempt-not-pass'", 'W21B contract source');
  assertIncludes(source, "'ready-to-run-not-pass'", 'W21B contract source');
  assertIncludes(source, 'readonly readyToAttemptIsPass: false;', 'W21B contract source');
  assertIncludes(source, 'readonly readyToRunIsPass: false;', 'W21B contract source');
  assertDoesNotInclude(source, 'readyToAttemptIsPass: true', 'W21B contract source');
  assertDoesNotInclude(source, 'readyToRunIsPass: true', 'W21B contract source');
});

test('W21B readiness classifier remains guarded and not production readiness', () => {
  const source = readUtf8(W21B_SOURCE);
  const classifierLines = source
    .split('\n')
    .filter((line) => line.includes(GUARDED_READINESS_CLASSIFIER));

  assert.equal(
    countOccurrences(source, GUARDED_READINESS_CLASSIFIER),
    2,
    'W21B source should confine the guarded classifier to type/status vocabulary',
  );
  assert.deepEqual(
    classifierLines.map((line) => line.trim()),
    [
      `'${GUARDED_READINESS_CLASSIFIER}';`,
      `| '${GUARDED_READINESS_CLASSIFIER}';`,
    ],
  );

  assertIncludes(source, "export type DurableAdapterProductionReadiness = 'not-production-ready';", 'W21B contract source');
  assertIncludes(source, 'readonly adapterReadiness: DurableAdapterReadinessClassification;', 'W21B contract source');
  assertIncludes(source, 'readonly productionReadiness: DurableAdapterProductionReadiness;', 'W21B contract source');
  assertDoesNotInclude(source, '`adapter-ready-for-real-system-integration-under-explicit-gates`', 'W21B contract source');
  assertDoesNotInclude(source, "'production-ready'", 'W21B contract source');
  assertDoesNotInclude(source, 'productionReady', 'W21B contract source');
});

test('W21B package-root non-export evidence remains in the local W21B unit guard', () => {
  const unitGuard = readUtf8(W21B_UNIT_GUARD);

  assertIncludes(unitGuard, 'PACKAGE_ROOT_SOURCE_URL', 'W21B unit guard');
  assertIncludes(unitGuard, 'W21B durable-state contracts are not exported from the package root', 'W21B unit guard');
  assertIncludes(unitGuard, "packageRoot.includes('durable-state')", 'W21B unit guard');
  assertIncludes(unitGuard, "packageRoot.includes('durable-state-contract-types')", 'W21B unit guard');
  assertIncludes(unitGuard, 'local durable barrel should not fan into package root', 'W21B unit guard');
});
