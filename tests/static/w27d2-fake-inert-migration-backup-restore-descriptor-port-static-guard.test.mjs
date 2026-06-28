import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DESCRIPTOR_PORT_FILE = [
  'packages',
  'openclaw-adapter',
  'src',
  'migration-backup-restore',
  'fake-inert-mbr-descriptor-port.ts',
];

const REQUIRED_DESCRIPTOR_POSTURE_SNIPPETS = Object.freeze([
  'FakeInertMigrationBackupRestoreDescriptorPort',
  'describeSchemaVersion',
  'describeMigration',
  'describeBackup',
  'describeExternalReference',
  'describeReplayEligibility',
  'describeRestore',
  'describeRecovery',
  'describePublicDescriptors',
  "descriptorOnly: true",
  "publicProjection: 'redacted-json-safe'",
  "representation: 'source-contract-descriptor-only'",
  "'descriptor-only-not-readiness'",
  "'production-storage-not-claimed'",
  "'production-not-claimed'",
  'redacted: true',
  'jsonSafe: true',
]);

const REQUIRED_CONSERVATIVE_RESTORE_REPLAY_SNIPPETS = Object.freeze([
  'restoreIsReplay: false',
  'restoreAuthorizesExternalEffects: false',
  'replayOfExternalEffectsRequiresLaterGate: true',
  'replayAuthorizedByRestore: false',
  'providerAcknowledgementImpliesBusinessSuccess: false',
  'readyToAttemptIsPass: false',
  "'external-effect-not-authorized'",
  "'replay-not-authorized'",
  "'operator-review-required'",
  "'dry-run-reconciliation-required'",
]);

const FORBIDDEN_RUNTIME_SNIPPETS = Object.freeze([
  'process.env',
  'Deno.env',
  'import.meta.env',
  'process.argv',
  'fs/promises',
  'node:fs',
  'node:path',
  'node:child_process',
  'child_process',
  'spawn(',
  'execFile(',
  'execSync(',
  'fetch(',
  'XMLHttpRequest',
  'WebSocket',
  'createServer(',
  'listen(',
  'setInterval(',
  'worker_threads',
  'node:cluster',
  'dotenv',
  'commander',
  'yargs',
]);

const FORBIDDEN_IMPORT_MODULE_PATTERNS = Object.freeze([
  ['filesystem import', /^(?:node:)?fs(?:\/promises)?$/u],
  ['path import', /^(?:node:)?path$/u],
  ['child process import', /^(?:node:)?child_process$/u],
  ['network import', /^(?:node:)?(?:http|https|net|tls|dgram|dns)$/u],
  ['SQL or migration framework import', /^(?:knex|prisma|@prisma\/client|drizzle-orm|typeorm|sequelize|umzug|node-pg-migrate|liquibase|flyway)$/u],
  ['database client import', /^(?:pg|postgres|mysql2?|mariadb|better-sqlite3|sqlite3|mongodb)$/u],
  ['cache or queue client import', /^(?:redis|ioredis|bullmq|amqplib|kafkajs)$/u],
  ['object storage client import', /^(?:aws-sdk|@aws-sdk\/client-s3|minio|@google-cloud\/storage|@azure\/storage-blob)$/u],
  ['provider SDK import', /^(?:grammy|telegraf|node-telegram-bot-api|openai|@openai\/openai|@anthropic-ai\/sdk)$/u],
]);

const FORBIDDEN_SQL_OR_BACKEND_PATTERNS = Object.freeze([
  ['SQL DDL/DML statement', /\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE|BEGIN|COMMIT|ROLLBACK)\b/iu],
  ['migration file or runner vocabulary', /\b(?:migrations?\s+directory|migration\s+runner|runMigrations?|applyMigrations?|rollbackMigration|schema\s+diff)\b/iu],
  ['database client construction', /\bnew\s+[A-Za-z0-9_]*(?:Client|Pool|Connection|Database)\s*\(/u],
  ['cache or queue construction', /\bnew\s+[A-Za-z0-9_]*(?:Redis|Queue|Producer|Consumer|Kafka)\s*\(/u],
  ['object storage construction', /\bnew\s+[A-Za-z0-9_]*(?:S3|Bucket|Storage|Blob)\s*\(/u],
  ['generic client factory construction', /\bcreate(?:Db|Database|Pool|Redis|Queue|Kafka|S3|Storage|Provider|Sdk|Client)\s*\(/u],
]);

const FORBIDDEN_ARCHIVE_OR_RESTORE_IMPLEMENTATION_PATTERNS = Object.freeze([
  ['backup archive implementation', /\b(?:tar|zip|archive|snapshotFile|backupFile|createReadStream|createWriteStream)\b/iu],
  ['checksum implementation', /\b(?:checksum|createHash|sha256|digest\s*\()\b/iu],
  ['compression implementation', /\b(?:gzip|gunzip|brotli|deflate|inflate|compress(?:ion)?|decompress)\b/iu],
  ['encryption implementation', /\b(?:encrypt|decrypt|createCipheriv|createDecipheriv|ciphertext|plaintext)\b/iu],
  ['restore mutation implementation', /\b(?:executeRestore|applyRestore|mutateRestore|writeRestore|persistRestore|commitRestore|restoreMutation|deleteRestored|upsertRestored)\b/u],
  ['replay runtime implementation', /\b(?:replayCli|runReplay|executeReplay|startReplayWorker|replayWorker|workerLoop|daemonLoop|runtimeDaemon)\b/u],
]);

const FORBIDDEN_PUBLIC_LEAK_PATTERNS = Object.freeze([
  ['raw payload field', /\b(?:raw|rawPayload|rawUpdate|rawEvent|rawError|rawResponse|providerPayload|runtimePayload|toolPayload)\b/u],
  ['raw provider or SDK handle field', /\b(?:providerObject|sdkObject|clientHandle|runtimeHandle|connectorInternals|toolInternals)\b/u],
  ['unsafe diagnostic output field', /\b(?:stack|stackTrace|stdout|stderr|fullLog|rawLog|rawDiff|rawOutput|debugDump|requestBody|responseBody)\b/u],
  ['unsafe secret or config field', /\b(?:secret|rawToken|rawSecret|rawCredential|password|apiKey|connectionString|endpointValue)\b/u],
  ['unsafe filesystem path field', /\b(?:path|filePath|repoPath|workspacePath|absolutePath|storagePath)\b/u],
]);

const FORBIDDEN_PRODUCTION_CLAIM_SNIPPETS = Object.freeze([
  'production ready',
  'ready for production',
  'production-storage-ready',
  'production storage ready',
  'durable backend ready',
  'operational backup ready',
  'operational restore ready',
  'recovery runtime ready',
  'real-provider pass',
  'real provider pass',
]);

function readUtf8(segments) {
  return readFileSync(path.join(repoRoot, ...segments), 'utf8');
}

function assertIncludes(source, expected, label) {
  assert.equal(source.includes(expected), true, `${label} should include ${expected}`);
}

function assertDoesNotInclude(source, forbidden, label) {
  assert.equal(source.includes(forbidden), false, `${label} should not include ${forbidden}`);
}

function importModuleSpecifiers(source) {
  const specifiers = [];
  const staticImportPattern = /\bfrom\s+['"]([^'"]+)['"]/gu;
  const dynamicImportPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;
  const requirePattern = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;

  for (const pattern of [staticImportPattern, dynamicImportPattern, requirePattern]) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

test('W27D2 guard reads only the accepted W27C fake inert descriptor port source', () => {
  assert.equal(
    DESCRIPTOR_PORT_FILE.join('/'),
    'packages/openclaw-adapter/src/migration-backup-restore/fake-inert-mbr-descriptor-port.ts',
  );
});

test('W27C descriptor port imports only the accepted W27B contract surface', () => {
  const source = readUtf8(DESCRIPTOR_PORT_FILE);

  assert.deepEqual(importModuleSpecifiers(source), ['./migration-backup-restore-contract.js']);

  for (const specifier of importModuleSpecifiers(source)) {
    for (const [label, pattern] of FORBIDDEN_IMPORT_MODULE_PATTERNS) {
      assert.equal(pattern.test(specifier), false, `descriptor port should not include ${label}: ${specifier}`);
    }
  }
});

test('W27C descriptor port remains descriptor oriented and not executor oriented', () => {
  const source = readUtf8(DESCRIPTOR_PORT_FILE);

  for (const expected of REQUIRED_DESCRIPTOR_POSTURE_SNIPPETS) {
    assertIncludes(source, expected, 'fake inert migration backup restore descriptor port');
  }

  assert.equal(
    /\bexport\s+(?:async\s+)?function\s+(?:execute|run|apply|mutate|persist|dispatch|start|stop|resume)[A-Za-z0-9_]*/u.test(source),
    false,
    'descriptor port should not export executor/runtime functions',
  );
  assert.equal(/\bclass\s+[A-Za-z0-9_]+/u.test(source), false, 'descriptor port should not add runtime classes');
});

test('W27C descriptor port has no filesystem, network, process, CLI, worker, or provider runtime behavior', () => {
  const source = readUtf8(DESCRIPTOR_PORT_FILE);

  for (const forbidden of FORBIDDEN_RUNTIME_SNIPPETS) {
    assertDoesNotInclude(source, forbidden, 'fake inert migration backup restore descriptor port');
  }

  assert.equal(/\b(?:http|https|net|tls)\.request\s*\(/u.test(source), false, 'descriptor port should not perform network requests');
  assert.equal(/\bnew\s+[A-Za-z0-9_]*(?:Provider|Sdk|SDK|Client)\s*\(/u.test(source), false, 'descriptor port should not construct provider SDK clients');
});

test('W27C descriptor port has no SQL, migration runner, DB, cache, queue, or object storage behavior', () => {
  const source = readUtf8(DESCRIPTOR_PORT_FILE);

  for (const [label, pattern] of FORBIDDEN_SQL_OR_BACKEND_PATTERNS) {
    assert.equal(pattern.test(source), false, `descriptor port should not include ${label}`);
  }
});

test('W27C descriptor port has no backup archive, checksum, compression, encryption, restore mutation, or replay runtime implementation', () => {
  const source = readUtf8(DESCRIPTOR_PORT_FILE);

  for (const [label, pattern] of FORBIDDEN_ARCHIVE_OR_RESTORE_IMPLEMENTATION_PATTERNS) {
    assert.equal(pattern.test(source), false, `descriptor port should not include ${label}`);
  }
});

test('W27C public descriptor output vocabulary does not expose raw payloads or unsafe operational internals', () => {
  const source = readUtf8(DESCRIPTOR_PORT_FILE);

  for (const [label, pattern] of FORBIDDEN_PUBLIC_LEAK_PATTERNS) {
    assert.equal(pattern.test(source), false, `descriptor port should not expose ${label}`);
  }
});

test('W27C restore and replay posture remains conservative, descriptive, and non-mutating', () => {
  const source = readUtf8(DESCRIPTOR_PORT_FILE);

  for (const expected of REQUIRED_CONSERVATIVE_RESTORE_REPLAY_SNIPPETS) {
    assertIncludes(source, expected, 'fake inert migration backup restore descriptor port');
  }

  assert.equal(
    /\brestore\s+(?:completed|executed|applied|committed|mutated|dispatched)\b/iu.test(source),
    false,
    'restore output should not claim mutation or execution',
  );
  assert.equal(
    /\breplay\s+(?:completed|executed|dispatched|authorized by restore|started)\b/iu.test(source),
    false,
    'replay output should not claim runtime execution or restore authorization',
  );
});

test('W27C descriptor port avoids production durable backend, backup, restore, recovery, or real-provider readiness claims', () => {
  const source = readUtf8(DESCRIPTOR_PORT_FILE);

  assertIncludes(source, "'not-production-ready'", 'fake inert migration backup restore descriptor port');
  assert.equal(/(?<!not-)production-ready/u.test(source), false, 'descriptor port should not claim production-ready');

  for (const forbidden of FORBIDDEN_PRODUCTION_CLAIM_SNIPPETS) {
    assertDoesNotInclude(source, forbidden, 'fake inert migration backup restore descriptor port');
  }
});
