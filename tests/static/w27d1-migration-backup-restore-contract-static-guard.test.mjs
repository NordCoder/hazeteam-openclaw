import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const W27B_CONTRACT_SOURCE = Object.freeze([
  'packages',
  'openclaw-adapter',
  'src',
  'migration-backup-restore',
  'migration-backup-restore-contract.ts',
]);

const REQUIRED_DESCRIPTOR_LITERALS = Object.freeze([
  'schema-version-summary',
  'migration-descriptor',
  'backup-descriptor',
  'restore-descriptor',
  'recovery-descriptor',
  'replay-eligibility-descriptor',
  'external-reference-descriptor',
  'source-contract-descriptor-only',
  'redacted-json-safe',
  'adapter-ready-for-real-system-integration',
  'under-explicit-gates',
  'not-production-ready',
  'not-claimed',
]);

const REQUIRED_MIGRATION_VOCABULARY = Object.freeze([
  'not-configured',
  'up-to-date',
  'migration-required',
  'migration-in-progress',
  'migration-failed',
  'rollback-required',
  'unsupported-version',
  'core-facing-store',
  'adapter-owned-store',
  'runtime-capability-store',
  'deployment-orchestration',
  'idempotent',
  'operator-reviewed-non-idempotent',
]);

const REQUIRED_BACKUP_RESTORE_RECOVERY_VOCABULARY = Object.freeze([
  'core-facing-records',
  'adapter-topic-bindings',
  'adapter-idempotency-records',
  'provider-event-receipt-records',
  'callback-replay-records',
  'delivery-attempt-records',
  'external-message-reference-records',
  'runtime-capability-records',
  'migration-metadata',
  'safe-readiness-metadata',
  'not-created',
  'available',
  'verification-required',
  'operator-summary-only',
  'integrity-evidence-present',
  'not-attempted',
  'planned-inspect-only',
  'needs-reconcile',
  'inspect-only',
  'operator-review-required',
  'production-restore-safe',
  'production-restore-with-operator-approval',
]);

const REQUIRED_EXTERNAL_REFERENCE_AND_REPLAY_VOCABULARY = Object.freeze([
  'assumed-valid',
  'needs-reconcile',
  'stale',
  'invalid',
  'external-message-reference',
  'topic-reference',
  'runtime-operation-reference',
  'automation-job-reference',
  'not-replayable',
  'eligible-after-dry-run-reconciliation',
  'eligible-after-operator-approval',
  'not-authorized',
  'later-approval-required',
  'dry-run-reconciliation-required',
  'later-approval-and-dry-run-reconciliation-required',
  'replay-not-authorized',
  'external-effect-not-authorized',
]);

const REQUIRED_NO_LEAK_AND_NO_CLAIM_REASON_CODES = Object.freeze([
  'provider-acknowledgement-only',
  'business-success-missing',
  'ready-to-attempt-not-pass',
  'descriptor-only-not-readiness',
  'production-storage-not-claimed',
  'production-not-claimed',
  'unsafe-output-redacted',
  'blocked-by-explicit-gate',
  'failed-safe',
]);

const FORBIDDEN_RUNTIME_OR_BACKEND_PATTERNS = Object.freeze([
  ['SQL vocabulary', /\bsql\b/iu],
  ['DML statement', /\b(?:select|insert|update|delete|merge|upsert)\s+[\s\S]*?\b(?:from|into|set|where|values)\b/iu],
  ['DDL statement', /\b(?:create|alter|drop|truncate)\s+(?:table|index|schema|database)\b/iu],
  ['transaction command', /\b(?:begin|commit|rollback)\s+(?:transaction|work)\b/iu],
  ['migration command', /\b(?:db:)?migrate(?::|\s+)(?:latest|deploy|up|down|rollback|reset|run)\b/iu],
  ['package migration command', /\b(?:npm\s+run\s+migrate|yarn\s+migrate|pnpm\s+migrate)\b/iu],
  ['migration framework reference', /\b(?:prisma|knex|sequelize|typeorm|drizzle|flyway|liquibase)\b/iu],
  ['filesystem or path field', /readonly\s+\w*(?:FilePath|FilesystemPath|LocalPath|DirectoryPath|BackupPath|RestorePath|ArchivePath|Path)\w*\s*[?:]:/u],
  ['endpoint or connection field', /readonly\s+\w*(?:Endpoint|ConnectionString|DatabaseUrl|Dsn|JdbcUrl|Host|Port|Bucket|ObjectKey)\w*\s*[?:]:/u],
  ['process or environment read', /\b(?:process\.(?:env|cwd|argv)|import\.meta\.env|Deno\.env)\b/u],
  ['provider/client/sdk handle field', /readonly\s+\w*(?:ProviderClient|Client|Sdk|SDK|Handle|Connection|Pool|RuntimeHandle|RecoveryHandle)\w*\s*[?:]:/u],
  ['raw provider/callback/tool/runtime payload', /\b(?:raw(?:Provider|Callback|Tool|Runtime|Payload|Event|Input|Output)|providerPayload|callbackPayload|toolPayload|runtimePayload|rawPayload|payload)\b/u],
  ['secret or credential vocabulary', /\b(?:secret|credential|password|token|apiKey|accessKey|authHeader|authorization|bearer)\b/iu],
  ['runtime recovery implementation handle', /\b(?:recoveryRuntime|restoreRunner|backupRunner|migrationRunner|replayWorker|replayDaemon|runtimeClient|runtimeHandle|recoveryHandle|resumeHandle)\b/u],
]);

const FORBIDDEN_IMPORT_MODULE_PATTERNS = Object.freeze([
  ['filesystem/process module', /^(?:node:)?(?:fs|fs\/promises|path|child_process|worker_threads|cluster|process)$/u],
  ['network module', /^(?:node:)?(?:http|https|net|tls|dgram|dns)$/u],
  ['SQL/database/cache/queue/object-storage client', /^(?:pg|postgres|mysql2|sqlite3|better-sqlite3|mongodb|redis|ioredis|amqplib|kafkajs|minio|aws-sdk|@aws-sdk\/client-s3|@google-cloud\/storage|@prisma\/client|typeorm|knex|drizzle-orm|sequelize)(?:\/.*)?$/u],
  ['provider SDK or client module', /(?:telegram|openclaw|provider|sdk|client)/iu],
]);

const FORBIDDEN_PRODUCTION_READY_CLAIMS = Object.freeze([
  'production ready',
  'production-ready adapter',
  'production-storage-ready',
  'production storage ready',
  'production durable backend ready',
  'durable backend ready',
  'durable-backend-ready',
  'restore-runtime-ready',
  'restore runtime ready',
  'recovery-runtime-ready',
  'recovery runtime ready',
  'replay-runtime-ready',
  'replay runtime ready',
  'restore worker ready',
  'recovery worker ready',
  'replay worker ready',
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function assertIncludes(source, expected, label) {
  assert.equal(source.includes(expected), true, `${label} should include ${expected}`);
}

function assertDoesNotInclude(source, forbidden, label) {
  assert.equal(source.includes(forbidden), false, `${label} should not include ${forbidden}`);
}

function assertDoesNotMatch(source, pattern, label) {
  assert.equal(pattern.test(source), false, `${label} should not match ${pattern}`);
}

function extractInterfaceBody(source, interfaceName) {
  const pattern = new RegExp(
    String.raw`export\s+interface\s+${escapeRegExp(interfaceName)}(?:\s+extends\s+[^\{]+)?\s*\{([\s\S]*?)\n\}`,
    'u',
  );
  const match = source.match(pattern);

  assert.ok(match, `expected to find interface ${interfaceName}`);

  return match[1];
}

function importedModules(source) {
  const modules = new Set();

  for (const match of source.matchAll(/^\s*import(?:\s+type)?[\s\S]*?\s+from\s+['"]([^'"]+)['"];?\s*$/gmu)) {
    modules.add(match[1]);
  }

  for (const match of source.matchAll(/^\s*import\s+['"]([^'"]+)['"];?\s*$/gmu)) {
    modules.add(match[1]);
  }

  return [...modules].sort();
}

function assertRequiredVocabulary(source, vocabulary, label) {
  for (const expected of vocabulary) {
    assertIncludes(source, expected, label);
  }
}

test('W27D1 guard inspects only the accepted W27B migration backup restore contract source', () => {
  assert.equal(
    asRepoRelative(W27B_CONTRACT_SOURCE),
    'packages/openclaw-adapter/src/migration-backup-restore/migration-backup-restore-contract.ts',
  );
});

test('W27B contract preserves migration backup restore replay descriptor vocabulary', () => {
  const source = readUtf8(W27B_CONTRACT_SOURCE);

  assertRequiredVocabulary(source, REQUIRED_DESCRIPTOR_LITERALS, 'W27B descriptor vocabulary');
  assertRequiredVocabulary(source, REQUIRED_MIGRATION_VOCABULARY, 'W27B migration vocabulary');
  assertRequiredVocabulary(source, REQUIRED_BACKUP_RESTORE_RECOVERY_VOCABULARY, 'W27B backup restore recovery vocabulary');
  assertRequiredVocabulary(source, REQUIRED_EXTERNAL_REFERENCE_AND_REPLAY_VOCABULARY, 'W27B external reference and replay vocabulary');
  assertRequiredVocabulary(source, REQUIRED_NO_LEAK_AND_NO_CLAIM_REASON_CODES, 'W27B no-leak and non-claim vocabulary');
});

test('W27B contract remains backend neutral and rejects runtime implementation vocabulary', () => {
  const source = readUtf8(W27B_CONTRACT_SOURCE);

  for (const [label, pattern] of FORBIDDEN_RUNTIME_OR_BACKEND_PATTERNS) {
    assertDoesNotMatch(source, pattern, label);
  }

  for (const moduleName of importedModules(source)) {
    for (const [label, pattern] of FORBIDDEN_IMPORT_MODULE_PATTERNS) {
      assertDoesNotMatch(moduleName, pattern, `${label} import ${moduleName}`);
    }
  }
});

test('W27B contract keeps restore and replay vocabulary separate', () => {
  const source = readUtf8(W27B_CONTRACT_SOURCE);
  const restoreDescriptor = extractInterfaceBody(source, 'RestoreDescriptor');
  const replayDescriptor = extractInterfaceBody(source, 'ReplayEligibilityDescriptor');
  const safetyInvariants = extractInterfaceBody(source, 'SafetyInvariants');

  assert.match(restoreDescriptor, /readonly\s+descriptorKind:\s+'restore-descriptor'\s*;/u);
  assert.match(restoreDescriptor, /readonly\s+restoreStatus:\s+RestoreStatus\s*;/u);
  assert.match(restoreDescriptor, /readonly\s+replayEligibility:\s+ReplayEligibilityDescriptor\s*;/u);
  assert.match(restoreDescriptor, /readonly\s+restoreIsReplay:\s+false\s*;/u);
  assert.match(restoreDescriptor, /readonly\s+restoreAuthorizesExternalEffects:\s+false\s*;/u);

  assert.match(replayDescriptor, /readonly\s+descriptorKind:\s+'replay-eligibility-descriptor'\s*;/u);
  assert.match(replayDescriptor, /readonly\s+replayEligibility:\s+ReplayEligibilityClass\s*;/u);
  assert.match(replayDescriptor, /readonly\s+externalEffectReplayGate:\s+ExternalEffectReplayGate\s*;/u);
  assert.match(replayDescriptor, /readonly\s+replayAuthorizedByRestore:\s+false\s*;/u);

  assert.match(safetyInvariants, /readonly\s+restoreIsReplay:\s+false\s*;/u);
  assert.match(safetyInvariants, /readonly\s+restoreAuthorizesExternalEffects:\s+false\s*;/u);
  assert.match(safetyInvariants, /readonly\s+replayOfExternalEffectsRequiresLaterGate:\s+true\s*;/u);
});

test('W27B contract keeps provider acknowledgement distinct from business success', () => {
  const source = readUtf8(W27B_CONTRACT_SOURCE);
  const safetyInvariants = extractInterfaceBody(source, 'SafetyInvariants');
  const replayDescriptor = extractInterfaceBody(source, 'ReplayEligibilityDescriptor');

  assertIncludes(source, 'provider-acknowledgement-only', 'W27B provider acknowledgement classification');
  assertIncludes(source, 'business-success-missing', 'W27B business success classification');
  assert.match(safetyInvariants, /readonly\s+providerAcknowledgementImpliesBusinessSuccess:\s+false\s*;/u);
  assert.match(replayDescriptor, /readonly\s+providerAcknowledgementImpliesBusinessSuccess:\s+false\s*;/u);
});

test('W27B contract does not claim production storage restore recovery or replay runtime readiness', () => {
  const source = readUtf8(W27B_CONTRACT_SOURCE);
  const readinessNonClaims = extractInterfaceBody(source, 'ReadinessNonClaims');
  const descriptorBase = extractInterfaceBody(source, 'DescriptorBase');

  for (const forbidden of FORBIDDEN_PRODUCTION_READY_CLAIMS) {
    assertDoesNotInclude(source, forbidden, 'W27B production readiness claims');
  }

  assert.match(readinessNonClaims, /readonly\s+descriptorExistenceIsMigrationReadiness:\s+false\s*;/u);
  assert.match(readinessNonClaims, /readonly\s+descriptorExistenceIsBackupReadiness:\s+false\s*;/u);
  assert.match(readinessNonClaims, /readonly\s+descriptorExistenceIsRestoreReadiness:\s+false\s*;/u);
  assert.match(readinessNonClaims, /readonly\s+descriptorExistenceIsRecoveryReadiness:\s+false\s*;/u);
  assert.match(readinessNonClaims, /readonly\s+descriptorExistenceIsProductionStorageReadiness:\s+false\s*;/u);
  assert.match(readinessNonClaims, /readonly\s+descriptorExistenceIsProductionReadiness:\s+false\s*;/u);
  assert.match(readinessNonClaims, /readonly\s+productionStorageReadiness:\s+MigrationBackupRestoreReadinessClaim\s*;/u);
  assert.match(readinessNonClaims, /readonly\s+productionReadiness:\s+MigrationBackupRestoreReadinessClaim\s*;/u);
  assert.match(descriptorBase, /readonly\s+productionReadiness:\s+MigrationBackupRestoreProductionReadiness\s*;/u);

  assertDoesNotMatch(source, /descriptorExistenceIs(?:Migration|Backup|Restore|Recovery|ProductionStorage|Production)Readiness:\s*true/u, 'positive descriptor readiness claim');
  assertDoesNotMatch(source, /readonly\s+(?:migration|backup|restore|recovery|productionStorage|production)Readiness:\s*(?:true|'ready'|"ready"|'claimed'|"claimed")/u, 'positive readiness claim field');
});
