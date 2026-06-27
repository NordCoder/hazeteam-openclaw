import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const DIST_MODULE_URL = new URL(
  '../../../dist/durable-state/fake-inert-replay-idempotency-state-boundary.js',
  import.meta.url,
);
const SOURCE_URL = new URL(
  '../../../src/durable-state/fake-inert-replay-idempotency-state-boundary.ts',
  import.meta.url,
);
const PACKAGE_ROOT_SOURCE_URL = new URL('../../../src/index.ts', import.meta.url);
const PACKAGE_ROOT_DIST_URL = new URL('../../../dist/index.js', import.meta.url);

const FORBIDDEN_PUBLIC_VOCABULARY = Object.freeze([
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

const FORBIDDEN_SOURCE_SNIPPETS = Object.freeze([
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
  'fetch(',
  'new WebSocket',
  'EventSource',
  'setInterval(',
  'setTimeout(',
  'createServer(',
  '.listen(',
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
  'loadCredential',
  'loadSecret',
  'new Telegram',
  'new OpenClaw',
  'createTelegramClient',
  'createOpenClawClient',
]);

function readSource(url) {
  return readFileSync(url, 'utf8');
}

async function importBoundaryModule() {
  return import(DIST_MODULE_URL.href);
}

function assertJsonSafe(value, label) {
  const encoded = JSON.stringify(value);
  assert.equal(typeof encoded, 'string', `${label} should serialize to JSON`);
  assert.deepEqual(JSON.parse(encoded), value, `${label} should round-trip through JSON`);
}

function collectFieldNames(value, output = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFieldNames(item, output);
    }

    return output;
  }

  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      output.add(key);
      collectFieldNames(entry, output);
    }
  }

  return output;
}

function collectStringValues(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, output);
    }

    return output;
  }

  if (value !== null && typeof value === 'object') {
    for (const entry of Object.values(value)) {
      collectStringValues(entry, output);
    }

    return output;
  }

  if (typeof value === 'string') {
    output.push(value);
  }

  return output;
}

function sourceFieldNames(source) {
  return [...source.matchAll(/\breadonly\s+([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:/gu)].map(
    (match) => match[1],
  );
}

test('first inbound reservation creates one first-seen effect signal', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await importBoundaryModule();
  const boundary = createFakeInertReplayIdempotencyStateBoundary();

  const first = boundary.reserveInboundIdempotency({
    idempotencyRef: 'idempotency:inbound-alpha',
    eventRef: 'event:inbound-alpha',
  });

  assert.equal(first.reserved, true);
  assert.equal(first.duplicateSuppressed, false);
  assert.equal(first.effectSignalCreated, true);
  assert.equal(first.duplicateDisposition, 'first-seen');
  assert.equal(first.outcome, 'first-seen');
  assert.equal(first.record.status, 'reserved');
  assert.equal(first.record.effectSuppressed, false);
  assert.equal(first.record.publicProjection, 'redacted-json-safe');
  assert.equal(first.record.representation, 'fake-inert-contract-only');
  assert.equal(first.record.runtimeOnlyValuesSerializable, false);
  assert.equal(first.record.productionDurableBackend, 'not-implemented');
  assertJsonSafe(first.summary, 'first reservation summary');
  assert.deepEqual(boundary.publicSnapshot().records, [first.record]);
});

test('repeated inbound reservation is duplicate-suppressed without a second effect signal', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await importBoundaryModule();
  const boundary = createFakeInertReplayIdempotencyStateBoundary();

  const first = boundary.reserveInboundIdempotency({
    idempotencyRef: 'idempotency:inbound-duplicate',
    eventRef: 'event:inbound-duplicate',
  });
  const duplicate = boundary.reserveInboundIdempotency({
    idempotencyRef: 'idempotency:inbound-duplicate',
    eventRef: 'event:inbound-duplicate',
  });

  assert.equal(first.effectSignalCreated, true);
  assert.equal(duplicate.reserved, false);
  assert.equal(duplicate.duplicateSuppressed, true);
  assert.equal(duplicate.effectSignalCreated, false);
  assert.equal(duplicate.duplicateDisposition, 'duplicate-suppressed');
  assert.equal(duplicate.outcome, 'duplicate-suppressed');
  assert.deepEqual(duplicate.record, first.record);
  assert.equal(boundary.publicSnapshot().recordCount, 1);
});

test('completion moves the fake/inert idempotency record into completed semantics', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await importBoundaryModule();
  const boundary = createFakeInertReplayIdempotencyStateBoundary();

  boundary.reserveInboundIdempotency({
    idempotencyRef: 'idempotency:complete-alpha',
    eventRef: 'event:complete-alpha',
  });

  const completed = boundary.completeInboundIdempotency({
    idempotencyRef: 'idempotency:complete-alpha',
  });
  const duplicateCompletion = boundary.completeInboundIdempotency({
    idempotencyRef: 'idempotency:complete-alpha',
  });

  assert.equal(completed.completed, true);
  assert.equal(completed.outcome, 'completed');
  assert.equal(completed.effectSignalCreated, false);
  assert.equal(completed.record.status, 'completed');
  assert.equal(completed.record.duplicateDisposition, 'first-seen');
  assert.equal(duplicateCompletion.completed, false);
  assert.equal(duplicateCompletion.duplicateSuppressed, true);
  assert.equal(duplicateCompletion.effectSignalCreated, false);
  assert.equal(duplicateCompletion.outcome, 'duplicate-suppressed');
  assert.deepEqual(duplicateCompletion.record, completed.record);
});

test('replay cursor advancement is deterministic JSON-safe and remains fake/inert', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await importBoundaryModule();
  const boundary = createFakeInertReplayIdempotencyStateBoundary();

  const auditOnly = boundary.advanceReplayCursor({
    replayRef: 'replay:cursor-alpha',
    cursorRef: 'cursor:position-1',
    replayMode: 'audit-only',
    boundedCount: 1,
  });
  const boundedPlan = boundary.advanceReplayCursor({
    replayRef: 'replay:cursor-alpha',
    cursorRef: 'cursor:position-2',
    replayMode: 'bounded-replay-plan',
    duplicateDisposition: 'safe-noop',
    boundedCount: 2,
  });
  const duplicateCheck = boundary.advanceReplayCursor({
    replayRef: 'replay:cursor-beta',
    cursorRef: 'cursor:position-1',
    replayMode: 'duplicate-check',
    duplicateDisposition: 'duplicate-suppressed',
    boundedCount: 1,
  });

  assert.equal(auditOnly.outcome, 'audit-only');
  assert.equal(auditOnly.record.status, 'safe-noop');
  assert.equal(boundedPlan.outcome, 'bounded-replay-plan');
  assert.equal(boundedPlan.record.boundedCount, 2);
  assert.equal(duplicateCheck.outcome, 'duplicate-check');
  assert.equal(duplicateCheck.record.duplicateDisposition, 'duplicate-suppressed');
  assertJsonSafe(boundary.publicSnapshot(), 'replay cursor snapshot');
  assert.equal(boundary.publicSnapshot().durableBackendPosture, 'not-implemented');
  assert.deepEqual(boundary.publicSnapshot().records.filter((record) => record.stateKind === 'replay-cursor-state'), [
    boundedPlan.record,
    duplicateCheck.record,
  ]);
});

test('delivery-attempt replay keeps provider acknowledgement and business success separate', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await importBoundaryModule();
  const boundary = createFakeInertReplayIdempotencyStateBoundary();

  const acknowledgementOnly = boundary.recordDeliveryAttemptReplayOutcome({
    deliveryAttemptRef: 'delivery-attempt:alpha',
    idempotencyRef: 'idempotency:delivery-alpha',
    messageRef: 'message:alpha',
    providerAcknowledged: true,
    businessSuccess: false,
  });
  const businessSucceeded = boundary.recordDeliveryAttemptReplayOutcome({
    deliveryAttemptRef: 'delivery-attempt:beta',
    idempotencyRef: 'idempotency:delivery-beta',
    messageRef: 'message:beta',
    providerAcknowledged: true,
    businessSuccess: true,
  });

  assert.equal(acknowledgementOnly.providerAcknowledged, true);
  assert.equal(acknowledgementOnly.businessSuccess, false);
  assert.equal(acknowledgementOnly.providerAcknowledgementImpliesBusinessSuccess, false);
  assert.equal(acknowledgementOnly.record.status, 'acknowledgement-only');
  assert.equal(acknowledgementOnly.record.issueCode, 'business-success-missing');
  assert.equal(acknowledgementOnly.outcome, 'acknowledgement-only');
  assert.equal(businessSucceeded.providerAcknowledged, true);
  assert.equal(businessSucceeded.businessSuccess, true);
  assert.equal(businessSucceeded.record.status, 'business-succeeded');
  assert.equal(businessSucceeded.record.issueCode, 'none');
});

test('acknowledgement-only is not business success and blocked replay remains safe', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await importBoundaryModule();
  const boundary = createFakeInertReplayIdempotencyStateBoundary();

  const acknowledgementOnly = boundary.recordDeliveryAttemptReplayOutcome({
    deliveryAttemptRef: 'delivery-attempt:ack-only',
    idempotencyRef: 'idempotency:ack-only',
    providerAcknowledged: true,
    businessSuccess: false,
  });
  const blockedDecision = boundary.decideCallbackConsumeReplay({
    decisionRef: 'decision:blocked-alpha',
    callbackRef: 'callback:blocked-alpha',
    permissionRef: 'permission:blocked-alpha',
    consumeRef: 'consume:blocked-alpha',
    permissionAllowed: false,
    tokenVerified: false,
  });

  assert.equal(acknowledgementOnly.record.providerAcknowledged, true);
  assert.equal(acknowledgementOnly.record.businessSuccess, false);
  assert.notEqual(acknowledgementOnly.record.status, 'business-succeeded');
  assert.equal(blockedDecision.outcome, 'blocked');
  assert.equal(blockedDecision.record.status, 'blocked');
  assert.equal(blockedDecision.record.issueCode, 'permission-denied');
  assert.equal(blockedDecision.record.permissionBeforeConsume, true);
  assert.equal(blockedDecision.record.tokenConsumed, false);
});

test('safe redacted replay summaries do not include forbidden public vocabulary', async () => {
  const { createFakeInertReplayIdempotencyStateBoundary } = await importBoundaryModule();
  const boundary = createFakeInertReplayIdempotencyStateBoundary();

  const summary = boundary.buildRedactedReplaySummary({
    status: 'blocked',
    issueCode: 'blocked-by-explicit-gate',
    detailCode: 'safe-blocked-replay',
    safeRefs: ['replay:redacted-alpha', 'idempotency:redacted-alpha'],
  });
  const fieldNames = collectFieldNames(summary);
  const stringValues = collectStringValues(summary).join(' ');

  assertJsonSafe(summary, 'redacted replay summary');
  assert.equal(summary.summaryKind, 'redacted-summary');
  assert.equal(summary.jsonSafe, true);

  for (const forbidden of FORBIDDEN_PUBLIC_VOCABULARY) {
    assert.equal(fieldNames.has(forbidden), false, `summary exposed forbidden field ${forbidden}`);
    assert.equal(stringValues.includes(forbidden), false, `summary exposed forbidden value ${forbidden}`);
  }
});

test('source implies no production backend, runtime edge, provider execution, or secret loading behavior', () => {
  const source = readSource(SOURCE_URL);
  const fields = new Set(sourceFieldNames(source));

  assert.match(source, /from '\.\/durable-state-contract-types\.js'/u);
  assert.match(source, /from '\.\/fake-inert-adapter-state-store-port\.js'/u);
  assert.match(source, /productionDurableBackend:\s+'not-implemented'/u);
  assert.match(source, /productionReadiness:\s+'not-production-ready'/u);
  assert.match(source, /readyToAttemptIsPass:\s+false/u);
  assert.match(source, /readyToRunIsPass:\s+false/u);
  assert.match(source, /providerAcknowledgementImpliesBusinessSuccess:\s+false/u);

  for (const forbidden of FORBIDDEN_SOURCE_SNIPPETS) {
    assert.equal(source.includes(forbidden), false, `source should not include forbidden snippet ${forbidden}`);
  }

  for (const forbidden of FORBIDDEN_PUBLIC_VOCABULARY) {
    assert.equal(fields.has(forbidden), false, `source exposed forbidden public field ${forbidden}`);
  }
});

test('W21D boundary is not exported from the package root', async () => {
  const packageRootSource = readSource(PACKAGE_ROOT_SOURCE_URL);
  const packageRootModule = await import(PACKAGE_ROOT_DIST_URL.href);

  assert.equal(packageRootSource.includes('fake-inert-replay-idempotency-state-boundary'), false);
  assert.equal(Object.hasOwn(packageRootModule, 'createFakeInertReplayIdempotencyStateBoundary'), false);
});
