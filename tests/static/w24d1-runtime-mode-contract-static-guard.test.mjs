import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUNTIME_MODE_CONTRACT = Object.freeze([
  'packages',
  'openclaw-adapter',
  'src',
  'runtime-mode',
  'runtime-mode-contract.ts',
]);

const REQUIRED_EXPORTS = Object.freeze([
  'RuntimeModeKind',
  'RuntimeModeGateDescriptor',
  'RuntimeModeStartEligibility',
  'RuntimeModeReadinessDescriptor',
  'RuntimeModeOutcomeSeparation',
  'RuntimeModePublicSafetyDescriptor',
  'RedactedRuntimeModeDescriptor',
  'RuntimeModeSafeDiagnostic',
]);

const REQUIRED_VOCABULARY = Object.freeze([
  'listener',
  'webhook',
  'polling',
  'daemon',
  'supervision',
  'explicit-startup',
  'operator-gate',
  'runtime-mode-gate',
  'real-edge-gate',
  'open-not-pass',
  'ready-to-attempt-not-pass',
  'ready-to-run-not-pass',
  'failed-safe',
]);

const FORBIDDEN_RUNTIME_BEHAVIOR_SNIPPETS = Object.freeze([
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
  'Telegraf',
  'TelegramBot',
  'OpenClaw client',
  'provider SDK',
  'dotenv',
  'secret manager',
  'createServer',
  'listen(',
  'setTimeout',
  'setInterval',
  'Worker',
]);

const FORBIDDEN_PUBLIC_PROJECTION_TERMS = Object.freeze([
  'rawRuntimePayload',
  'rawProviderPayload',
  'rawCallbackPayload',
  'endpointValue',
  'tokenValue',
  'stackTrace',
  'stdout',
  'stderr',
  'processId',
  'runtimeHandle',
  'sdkClient',
]);

const FORBIDDEN_PRODUCTION_CLAIMS = Object.freeze([
  'production-ready',
  'production ready',
  'ready for production',
  'runtime ready',
  'live runtime started',
  'real-provider pass',
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

function assertExportedDeclaration(source, exportedName) {
  assert.match(
    source,
    new RegExp(`\\bexport\\s+(?:type|interface)\\s+${exportedName}\\b`, 'u'),
    `runtime-mode contract should export ${exportedName}`,
  );
}

function extractImportSpecifiers(source) {
  const specifiers = [];
  const importPatterns = [
    /\bimport\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gu,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
  ];

  for (const pattern of importPatterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

test('W24D1 static guard is scoped to the W24B runtime-mode contract file', () => {
  assert.equal(
    asRepoRelative(RUNTIME_MODE_CONTRACT),
    'packages/openclaw-adapter/src/runtime-mode/runtime-mode-contract.ts',
  );
});

test('runtime-mode contract preserves required exported vocabulary surfaces', () => {
  const source = readUtf8(RUNTIME_MODE_CONTRACT);

  for (const exportedName of REQUIRED_EXPORTS) {
    assertExportedDeclaration(source, exportedName);
  }

  for (const vocabulary of REQUIRED_VOCABULARY) {
    assertIncludes(source, vocabulary, 'runtime-mode contract vocabulary');
  }
});

test('runtime-mode descriptor, readiness, and start eligibility remain separate concepts', () => {
  const source = readUtf8(RUNTIME_MODE_CONTRACT);

  assert.match(source, /export interface RuntimeModeStartEligibility \{[\s\S]*?readonly status: RuntimeModeStartEligibilityStatus;/u);
  assert.match(source, /export interface RuntimeModeReadinessDescriptor \{[\s\S]*?readonly readinessState: RuntimeModeReadinessState;/u);
  assert.match(source, /export interface RuntimeModeReadinessDescriptor \{[\s\S]*?readonly descriptorReadinessState: RuntimeModeDescriptorReadinessState;/u);
  assert.match(source, /export interface RuntimeModeReadinessDescriptor \{[\s\S]*?readonly startEligibility: RuntimeModeStartEligibility;/u);
  assert.match(source, /export interface RedactedRuntimeModeDescriptor \{[\s\S]*?readonly readiness: RuntimeModeReadinessDescriptor;/u);
  assert.match(source, /export interface RedactedRuntimeModeDescriptor \{[\s\S]*?readonly runtimeBehaviorImplemented: false;/u);
});

test('runtime-mode contract keeps provider acknowledgement separate from business success', () => {
  const source = readUtf8(RUNTIME_MODE_CONTRACT);

  assert.match(
    source,
    /export interface RuntimeModeOutcomeSeparation \{[\s\S]*?readonly providerAcknowledgementStatus: RuntimeModeProviderAcknowledgementStatus;/u,
  );
  assert.match(
    source,
    /export interface RuntimeModeOutcomeSeparation \{[\s\S]*?readonly businessOutcomeStatus: RuntimeModeBusinessOutcomeStatus;/u,
  );
  assert.match(
    source,
    /export interface RuntimeModeOutcomeSeparation \{[\s\S]*?readonly providerAcknowledgementIsBusinessSuccess: false;/u,
  );
  assertIncludes(source, 'acknowledged-not-business-success', 'runtime-mode outcome vocabulary');
});

test('runtime-mode contract does not import or instantiate runtime, provider, network, or credential behavior', () => {
  const source = readUtf8(RUNTIME_MODE_CONTRACT);
  const importSpecifiers = extractImportSpecifiers(source);

  assert.deepEqual(importSpecifiers, []);

  for (const forbidden of FORBIDDEN_RUNTIME_BEHAVIOR_SNIPPETS) {
    assertDoesNotInclude(source, forbidden, 'runtime-mode contract');
  }
});

test('runtime-mode public projections do not expose raw runtime, provider, process, SDK, or stream fields', () => {
  const source = readUtf8(RUNTIME_MODE_CONTRACT);

  for (const forbidden of FORBIDDEN_PUBLIC_PROJECTION_TERMS) {
    assertDoesNotInclude(source, forbidden, 'runtime-mode contract public projection');
  }

  assertIncludes(source, "readonly publicShape: 'json-safe-plain-object';", 'runtime-mode public safety descriptor');
  assertIncludes(source, "readonly providerDataBoundary: 'normalized-or-redacted-only';", 'runtime-mode public safety descriptor');
  assertIncludes(source, "readonly runtimeHandleBoundary: 'not-exposed';", 'runtime-mode public safety descriptor');
  assertIncludes(source, "readonly sensitiveValueBoundary: 'not-exposed';", 'runtime-mode public safety descriptor');
});

test('runtime-mode contract avoids production readiness and real-runtime pass claims', () => {
  const source = readUtf8(RUNTIME_MODE_CONTRACT).replaceAll('not-production-ready', '');

  for (const forbidden of FORBIDDEN_PRODUCTION_CLAIMS) {
    assertDoesNotInclude(source, forbidden, 'runtime-mode contract production claims');
  }

  assertIncludes(source, 'readonly productionReady: false;', 'runtime-mode contract production posture');
  assertIncludes(source, 'ready-to-attempt-not-pass', 'runtime-mode contract non-pass readiness');
  assertIncludes(source, 'ready-to-run-not-pass', 'runtime-mode contract non-pass readiness');
}
);
