import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONTRACT_FILE = ['packages', 'openclaw-adapter', 'src', 'observability-correlation', 'observability-correlation-contract.ts'];

const REQUIRED_EXPORTED_VOCABULARY = Object.freeze([
  'ObservabilityCorrelationReferenceDescriptor',
  'ObservabilitySafeEventProjection',
  'ObservabilitySafeAuditProjection',
  'ObservabilityRedactedPublicSummary',
  'ObservabilityReferenceGraphLink',
  'ObservabilityCorrelationContractPosture',
]);

const REQUIRED_SAFE_BOUNDARY_VOCABULARY = Object.freeze([
  'ObservabilitySafePublicRef',
  'ObservabilityCorrelationRef',
  'ObservabilityRedactedPublicSummary',
  'ObservabilitySafeEventProjection',
  'ObservabilitySafeAuditProjection',
  'ObservabilityReferenceGraphLink',
  'providerAcknowledgement',
  'businessSuccess',
  'retryEligibility',
  'replayEligibility',
  'runtimeOnlyValuesSerializable: false',
  "'redacted-json-safe'",
]);

const REQUIRED_NON_PASS_AND_ACK_VOCABULARY = Object.freeze([
  "'skipped'",
  "'blocked'",
  "'ready-to-attempt'",
  "'ready-to-run'",
  "'acknowledgement-only'",
  "'business-success-missing'",
]);

const FORBIDDEN_BEHAVIOR_SNIPPETS = Object.freeze([
  'process.env',
  'fs/promises',
  'node:fs',
  'child_process',
  'node:child_process',
  'http',
  'https',
  'net',
  'tls',
  'fetch(',
  'axios',
  'undici',
  'OpenTelemetry',
  '@opentelemetry',
  'prom-client',
  'winston',
  'pino',
  'provider SDK',
  'dotenv',
  'secret manager',
  'createServer',
  'listen(',
]);

const FORBIDDEN_PUBLIC_LEAK_SNIPPETS = Object.freeze([
  'rawEvent',
  'rawAudit',
  'rawLog',
  'rawProviderPayload',
  'rawRuntimePayload',
  'rawToolOutput',
  'stackTrace',
  'stdout',
  'stderr',
  'endpointValue',
  'tokenValue',
  'SDK handle',
  'connector internals',
]);

const FORBIDDEN_PRODUCTION_CLAIMS = Object.freeze([
  'production ready',
  'ready for production',
  'telemetry backend ready',
  'real observability backend',
  'real-provider pass',
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

function exportedDeclarationPattern(name) {
  return new RegExp(`export\\s+(?:type\\s+|interface\\s+)?${name}\\b`, 'u');
}

test('W26D1 guard reads only the W26B observability correlation contract source', () => {
  assert.equal(CONTRACT_FILE.join('/'), 'packages/openclaw-adapter/src/observability-correlation/observability-correlation-contract.ts');
});

test('W26B contract preserves required exported observability correlation vocabulary', () => {
  const source = readUtf8(CONTRACT_FILE);

  for (const exportedName of REQUIRED_EXPORTED_VOCABULARY) {
    assert.match(source, exportedDeclarationPattern(exportedName), `${exportedName} should remain exported`);
  }
});

test('W26B contract preserves safe public projection vocabulary', () => {
  const source = readUtf8(CONTRACT_FILE);

  for (const expected of REQUIRED_SAFE_BOUNDARY_VOCABULARY) {
    assertIncludes(source, expected, 'observability correlation contract');
  }
});

test('provider acknowledgement remains distinct from business success', () => {
  const source = readUtf8(CONTRACT_FILE);

  assertIncludes(source, 'ObservabilityProviderAcknowledgementClassification', 'observability correlation contract');
  assertIncludes(source, 'ObservabilityBusinessSuccessClassification', 'observability correlation contract');
  assertIncludes(source, 'providerAcknowledgementImpliesBusinessSuccess: false', 'observability correlation contract');
  assert.match(
    source,
    /readonly providerAcknowledgement:\s*ObservabilityProviderAcknowledgementClassification;\s*\n\s*readonly businessSuccess:\s*ObservabilityBusinessSuccessClassification;/u,
    'provider acknowledgement and business success should remain separate adjacent public fields',
  );
});

test('W26B contract preserves explicit non-pass, acknowledgement-only, and missing-success vocabulary', () => {
  const source = readUtf8(CONTRACT_FILE);

  for (const expected of REQUIRED_NON_PASS_AND_ACK_VOCABULARY) {
    assertIncludes(source, expected, 'observability correlation contract');
  }
});

test('W26B contract does not import or instantiate telemetry, provider, network, runtime, or credential behavior', () => {
  const source = readUtf8(CONTRACT_FILE);

  assert.equal(/^\s*import\s/mu.test(source), false, 'contract source should not import runtime behavior');
  assert.equal(/\bnew\s+[A-Z][A-Za-z0-9_]*\s*\(/u.test(source), false, 'contract source should not instantiate classes');

  for (const forbidden of FORBIDDEN_BEHAVIOR_SNIPPETS) {
    assertDoesNotInclude(source, forbidden, 'observability correlation contract');
  }
});

test('W26B public projections do not expose raw provider, runtime, tool, diagnostic, or connector internals', () => {
  const source = readUtf8(CONTRACT_FILE);

  for (const forbidden of FORBIDDEN_PUBLIC_LEAK_SNIPPETS) {
    assertDoesNotInclude(source, forbidden, 'observability correlation contract');
  }
});

test('W26B contract avoids production readiness claims while allowing exact non-claim posture', () => {
  const source = readUtf8(CONTRACT_FILE);

  assertIncludes(source, "'not-production-ready'", 'observability correlation contract');
  assert.equal(/(?<!not-)production-ready/u.test(source), false, 'contract source should not claim production-ready');

  for (const forbidden of FORBIDDEN_PRODUCTION_CLAIMS) {
    assertDoesNotInclude(source, forbidden, 'observability correlation contract');
  }
});
