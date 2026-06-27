import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const W21C_SOURCE = Object.freeze([
  'packages',
  'openclaw-adapter',
  'src',
  'durable-state',
  'fake-inert-adapter-state-store-port.ts',
]);

const W21C_UNIT_EVIDENCE = Object.freeze([
  'packages',
  'openclaw-adapter',
  'tests',
  'unit',
  'durable-state',
  'fake-inert-adapter-state-store-port.test.mjs',
]);

const PACKAGE_ROOT_SOURCE = Object.freeze(['packages', 'openclaw-adapter', 'src', 'index.ts']);

const INSPECTED_FILES = Object.freeze([W21C_SOURCE, W21C_UNIT_EVIDENCE, PACKAGE_ROOT_SOURCE]);

const GUARDED_READINESS_CLASSIFIER = 'adapter-ready-for-real-system-integration-under-explicit-gates';

const ALLOWED_W21C_PUBLIC_FIELD_NAMES = Object.freeze([
  'appendOrUpsertDeliveryAttempt',
  'categoryCounts',
  'completed',
  'count',
  'correlationRef',
  'duplicateDisposition',
  'duplicateSuppressed',
  'durableBackendPosture',
  'effectSignalCreated',
  'eventRef',
  'idempotencyRef',
  'jsonSafe',
  'listRecordsByCategory',
  'markInboundIdempotencyRefCompleted',
  'publicProjection',
  'publicSnapshot',
  'putRecord',
  'readRecord',
  'record',
  'recordCount',
  'records',
  'redactedSummary',
  'representation',
  'reservationRef',
  'reserveInboundIdempotencyRef',
  'reserved',
  'stateKind',
  'stateRef',
  'updateReplayCursorState',
]);

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
  /(?:^|[A-Z])(?:TokenValue|RawToken|CallbackToken|CallbackTokenValue|ProviderToken|ProviderTokenValue)$/u,
  /(?:^|[A-Z])(?:Secret|Secrets|Credential|CredentialValue|Password|ApiKey|AuthHeader)$/u,
  /(?:^|[A-Z])(?:Endpoint|Url)$/u,
  /(?:^|[A-Z])(?:RawPayload|RawProviderPayload|RawCallbackPayload)$/u,
  /(?:^|[A-Z])(?:Stack|StackTrace|LocalPath|Stdout|Stderr)$/u,
  /(?:^|[A-Z])(?:Client|Sdk|Handle|ProcessEnv|RuntimeValue)$/u,
]);

const FORBIDDEN_SOURCE_VOCABULARY_PATTERNS = Object.freeze([
  /\btokenValue\b/u,
  /\brawToken\b/u,
  /\bcallbackToken\b/u,
  /\bcallbackTokenValue\b/u,
  /\bproviderToken\b/u,
  /\bproviderTokenValue\b/u,
  /\bsecrets?\b/u,
  /\bcredentials?\b/u,
  /\bpassword\b/u,
  /\bapiKey\b/u,
  /\bauthHeader\b/u,
  /\bendpoint\b/u,
  /\burl\b/u,
  /\brawPayload\b/u,
  /\brawProviderPayload\b/u,
  /\brawCallbackPayload\b/u,
  /\bstack(?:Trace)?\b/u,
  /\blocalPath\b/u,
  /\bstdout\b/u,
  /\bstderr\b/u,
  /\bclient\b/u,
  /\bsdk\b/u,
  /\bhandle\b/u,
  /\bprocessEnv\b/u,
  /\bruntimeValue\b/u,
]);

const FORBIDDEN_RUNTIME_IMPORT_OR_SNIPPETS = Object.freeze([
  'process.env',
  'node:fs',
  'node:path',
  'node:process',
  'node:http',
  'node:https',
  'node:net',
  'node:tls',
  'node:dns',
  'fetch(',
  'fetch ',
  'new WebSocket',
  'WebSocket(',
  'EventSource',
]);

const FORBIDDEN_STORAGE_OR_QUEUE_SNIPPETS = Object.freeze([
  'database',
  'cache',
  'queue',
  'migration',
  'migrate',
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
  'setTimeout',
  'setInterval',
  'scheduler',
  'cron',
  'daemon',
  'supervisor',
  'child_process',
  'createServer',
  '.listen',
  'listener',
  'webhook',
  'polling',
]);

const FORBIDDEN_PROVIDER_OR_OVERLAY_SNIPPETS = Object.freeze([
  'replay CLI',
  'backup',
  'restore',
  'recovery runtime',
  'credential loading',
  'loadCredential',
  'loadSecret',
  'provider SDK',
  'provider client',
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
  'OCA',
  'LifeOS',
  'sidecar',
]);

const FORBIDDEN_PRODUCTION_READINESS_CLAIMS = Object.freeze([
  'production-ready',
  'productionReady',
  'durable-backend-ready',
  'durable backend ready',
  'durable backend readiness',
  'production storage ready',
  'production storage readiness',
  'production durable backend ready',
  'production durable backend readiness',
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
  assert.equal(source.includes(expected), true, label + ' should include ' + expected);
}

function assertDoesNotInclude(source, forbidden, label) {
  assert.equal(source.includes(forbidden), false, label + ' should not include ' + forbidden);
}

function sourceFieldNames(source) {
  return [...source.matchAll(/\breadonly\s+([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:/gu)].map((match) => match[1]);
}

test('W21E2 inspects only W21C source, W21C unit evidence, and package-root non-export evidence', () => {
  assert.deepEqual(
    INSPECTED_FILES.map(asRepoRelative),
    [
      'packages/openclaw-adapter/src/durable-state/fake-inert-adapter-state-store-port.ts',
      'packages/openclaw-adapter/tests/unit/durable-state/fake-inert-adapter-state-store-port.test.mjs',
      'packages/openclaw-adapter/src/index.ts',
    ],
  );

  for (const file of INSPECTED_FILES) {
    const relative = asRepoRelative(file);
    assert.equal(relative.includes('w21d'), false, relative + ' should not inspect W21D');
    assert.equal(relative.includes('replay-idempotency-state-boundary'), false);
  }
});

test('W21C source uses only type imports from the W21B durable-state contract vocabulary', () => {
  const source = readUtf8(W21C_SOURCE);

  assert.match(source, /^import type \{/u);
  assert.doesNotMatch(source, /^\s*import\s+(?!type\b)/mu, 'W21C source should import types only');
  assert.match(source, /from '\.\/durable-state-contract-types\.js';/u);
  assert.doesNotMatch(source, /from '\.\/.*replay.*\.js'/u);
  assert.doesNotMatch(source, /from '\.\/.*idempotency.*\.js'/u);
});

test('W21C source avoids unsafe public field names and unsafe public concepts', () => {
  const source = readUtf8(W21C_SOURCE);
  const fields = new Set(sourceFieldNames(source));
  const allowedFields = new Set(ALLOWED_W21C_PUBLIC_FIELD_NAMES);

  for (const fieldName of fields) {
    assert.equal(allowedFields.has(fieldName), true, 'W21C exposed unexpected public field ' + fieldName);
  }

  for (const fieldName of FORBIDDEN_PUBLIC_FIELD_NAMES) {
    assert.equal(fields.has(fieldName), false, 'W21C source exposed forbidden public field ' + fieldName);
  }

  for (const fieldName of fields) {
    for (const pattern of FORBIDDEN_PUBLIC_FIELD_PATTERNS) {
      assert.equal(pattern.test(fieldName), false, 'W21C source exposed forbidden public field pattern ' + fieldName);
    }
  }

  for (const pattern of FORBIDDEN_SOURCE_VOCABULARY_PATTERNS) {
    assert.equal(pattern.test(source), false, 'W21C source exposed forbidden concept pattern ' + pattern.source);
  }

  assertIncludes(source, 'tokenRef', 'W21C source');
  assertIncludes(source, 'providerAcknowledged', 'W21C source');
  assertIncludes(source, 'businessSuccess', 'W21C source');
  assertIncludes(source, 'redactedSummary', 'W21C source');
});

test('W21C source has no runtime import, default network, or command-execution snippets', () => {
  const source = readUtf8(W21C_SOURCE);

  assert.doesNotMatch(source, /\brequire\b/u, 'W21C source should not use require vocabulary');

  for (const snippet of FORBIDDEN_RUNTIME_IMPORT_OR_SNIPPETS) {
    assertDoesNotInclude(source, snippet, 'W21C source');
  }
});

test('W21C source has no production storage, queue, migration, or SQL snippets', () => {
  const source = readUtf8(W21C_SOURCE);

  assert.doesNotMatch(source, /\bclass\s+[A-Za-z0-9_$]*(?:Backend|Repository|Storage|Database|Queue|Cache)\b/u);
  assert.doesNotMatch(source, /\bfunction\s+(?:open|connect|migrate)[A-Za-z0-9_$]*\b/u);

  for (const snippet of FORBIDDEN_STORAGE_OR_QUEUE_SNIPPETS) {
    assertDoesNotInclude(source, snippet, 'W21C source');
  }
});

test('W21C source has no production runtime, provider SDK, overlay, backup, restore, or recovery snippets', () => {
  const source = readUtf8(W21C_SOURCE);

  assert.doesNotMatch(source, /\bfunction\s+(?:recover|schedule|listen|poll)[A-Za-z0-9_$]*\b/u);
  assert.doesNotMatch(source, /\blisten\b/u, 'W21C source should not use listener startup vocabulary');

  for (const snippet of [...FORBIDDEN_RUNTIME_BEHAVIOR_SNIPPETS, ...FORBIDDEN_PROVIDER_OR_OVERLAY_SNIPPETS]) {
    assertDoesNotInclude(source, snippet, 'W21C source');
  }
});

test('W21C source remains fake/inert, redacted JSON-safe, and not implemented as a durable backend', () => {
  const source = readUtf8(W21C_SOURCE);

  assertIncludes(source, 'fake-inert-contract-only', 'W21C source');
  assertIncludes(source, 'redacted-json-safe', 'W21C source');
  assertIncludes(source, 'not-implemented', 'W21C source');
  assertIncludes(source, 'runtimeOnlyValuesSerializable: false', 'W21C source');
  assertIncludes(source, 'productionDurableBackend: \'not-implemented\'', 'W21C source');
  assertIncludes(source, 'durableBackendPosture: \'not-implemented\'', 'W21C source');

  for (const claim of FORBIDDEN_PRODUCTION_READINESS_CLAIMS) {
    assertDoesNotInclude(source, claim, 'W21C source');
  }

  assert.equal(source.includes(GUARDED_READINESS_CLASSIFIER), false, 'W21C should not use the guarded classifier as a production-readiness claim');
});

test('W21C source preserves provider acknowledgement and business success as separate concepts', () => {
  const source = readUtf8(W21C_SOURCE);

  assertIncludes(source, 'providerAcknowledged', 'W21C source');
  assertIncludes(source, 'businessSuccess', 'W21C source');
  assert.doesNotMatch(source, /providerAcknowledged\s*&&\s*businessSuccess\s*\?\s*true/u);
  assert.doesNotMatch(source, /providerSuccess/u);
  assert.doesNotMatch(source, /businessAcknowledged/u);
});

test('W21C source preserves duplicate suppression and idempotency reservation/completion vocabulary', () => {
  const source = readUtf8(W21C_SOURCE);
  const unitEvidence = readUtf8(W21C_UNIT_EVIDENCE);

  for (const expected of [
    'reserveInboundIdempotencyRef',
    'markInboundIdempotencyRefCompleted',
    'duplicateSuppressed',
    'duplicateDisposition',
    'duplicate-suppressed',
    'first-seen',
    'reserved',
    'completed',
    'effectSignalCreated',
  ]) {
    assertIncludes(source, expected, 'W21C source');
  }

  assertIncludes(unitEvidence, 'inbound idempotency reservation suppresses duplicate reservations', 'W21C unit evidence');
  assertIncludes(unitEvidence, 'completed idempotency state remains stable under duplicate completion', 'W21C unit evidence');
});

test('W21C source preserves replay cursor update vocabulary without replay CLI or recovery runtime', () => {
  const source = readUtf8(W21C_SOURCE);
  const unitEvidence = readUtf8(W21C_UNIT_EVIDENCE);

  for (const expected of ['updateReplayCursorState', 'replayRef', 'cursorRef', 'replayMode', 'boundedCount']) {
    assertIncludes(source, expected, 'W21C source');
  }

  assertIncludes(unitEvidence, 'replay cursor update is fake/inert and does not imply recovery runtime', 'W21C unit evidence');
  assertIncludes(unitEvidence, 'providerFetchReplayStarted', 'W21C unit evidence');
});

test('W21C source preserves redactedSummary JSON-safe public output boundary', () => {
  const source = readUtf8(W21C_SOURCE);
  const unitEvidence = readUtf8(W21C_UNIT_EVIDENCE);

  for (const expected of [
    'redactedSummary',
    'createRedactedSummary',
    'assertRedactedSummary',
    'assertJsonSafeValue',
    'summaryKind: \'redacted-summary\'',
    'jsonSafe: true',
    'publicSnapshot',
    'cloneProjection',
    'JSON.parse(JSON.stringify(record))',
  ]) {
    assertIncludes(source, expected, 'W21C source');
  }

  assertIncludes(unitEvidence, 'public snapshot is JSON-safe and does not expose forbidden field', 'W21C unit evidence');
});

test('package root does not export W21C durable-state store port', () => {
  const packageRootSource = readUtf8(PACKAGE_ROOT_SOURCE);

  assert.doesNotMatch(packageRootSource, /^\s*export\s+.*durable-state/mu);
  assertDoesNotInclude(packageRootSource, 'durable-state', 'openclaw-adapter package root');
  assertDoesNotInclude(packageRootSource, 'fake-inert-adapter-state-store-port', 'openclaw-adapter package root');
  assertDoesNotInclude(packageRootSource, 'createFakeInertAdapterStateStore', 'openclaw-adapter package root');
});
