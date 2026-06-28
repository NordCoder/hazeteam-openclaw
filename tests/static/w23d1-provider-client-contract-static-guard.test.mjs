import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contractPath = repoPath('packages', 'openclaw-adapter', 'src', 'provider-client', 'provider-client-contract.ts');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readContractSource() {
  assert.equal(existsSync(contractPath), true, 'W23B provider client contract file should exist');
  return readFileSync(contractPath, 'utf8');
}

function assertIncludesAll(source, values, label) {
  for (const value of values) {
    assert.match(source, new RegExp(escapeRegExp(value), 'u'), label + ' should include ' + value);
  }
}

function assertDoesNotIncludeAny(source, values, label) {
  for (const value of values) {
    assert.doesNotMatch(source, new RegExp(escapeRegExp(value), 'iu'), label + ' should not include ' + value);
  }
}

function assertDoesNotMatchAny(source, forbiddenPatterns, label) {
  for (const { description, pattern } of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern, label + ' should not match ' + description);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('W23D1 provider client contract keeps required exported vocabulary', () => {
  const source = readContractSource();

  assertIncludesAll(
    source,
    [
      'ProviderRequestDescriptor',
      'ProviderClientBoundaryDescriptor',
      'ProviderReadinessBoundaryDescriptor',
      'RedactedProviderResultProjection',
      'RedactedProviderErrorProjection',
    ],
    'provider client contract export vocabulary',
  );

  assert.match(source, /export\s+interface\s+ProviderRequestDescriptor\b/u);
  assert.match(source, /export\s+interface\s+ProviderClientBoundaryDescriptor\b/u);
  assert.match(source, /export\s+interface\s+ProviderReadinessBoundaryDescriptor\b/u);
  assert.match(source, /export\s+interface\s+RedactedProviderResultProjection\b/u);
  assert.match(source, /export\s+interface\s+RedactedProviderErrorProjection\b/u);
});

test('W23D1 provider client contract preserves redacted descriptor and projection vocabulary', () => {
  const source = readContractSource();

  assertIncludesAll(
    source,
    [
      'requestDescriptor',
      'boundaryKind',
      'provider-client-contract',
      'readinessStatus',
      'RedactedProviderResultProjection',
      'RedactedProviderErrorProjection',
      'acknowledgementClass',
      'businessLifecycleClass',
      'evidenceClass',
      'retryable',
      'reasonCode',
      'safeMessage',
      'redactedExternalRef',
      'redactedMetadata',
      'unsafeOutputDetected',
    ],
    'provider client public projection vocabulary',
  );
});

test('W23D1 provider acknowledgement remains separate from business lifecycle and success', () => {
  const source = readContractSource();

  assertIncludesAll(
    source,
    [
      'PROVIDER_ACKNOWLEDGEMENT_CLASSES',
      'ProviderAcknowledgementClass',
      'accepted',
      'delivered',
      'rejected',
      'throttled',
      'unavailable',
      'timed-out',
      'PROVIDER_BUSINESS_LIFECYCLE_CLASSES',
      'ProviderBusinessLifecycleClass',
      'not-started',
      'pending',
      'completed',
      'failed',
      'duplicate-suppressed',
      'permission-denied',
      'not-applicable',
      'Provider acknowledgement is not business success',
      'Acknowledgement-only evidence is not real-provider success',
    ],
    'provider acknowledgement and business lifecycle vocabulary',
  );

  assert.match(
    source,
    /readonly\s+acknowledgementClass:\s+ProviderAcknowledgementClass;[\s\S]*readonly\s+businessLifecycleClass:\s+ProviderBusinessLifecycleClass;/u,
    'redacted public projections should expose acknowledgement and business lifecycle as separate fields',
  );
});

test('W23D1 provider client readiness vocabulary stays below production and real-provider pass', () => {
  const source = readContractSource();

  assertIncludesAll(
    source,
    [
      'ready-to-attempt',
      'ready-to-run',
      'acknowledgement-only',
      'skipped',
      'blocked',
      'failed-safe',
      'unsafeOutputDetected',
      'defaultNetworkBehavior',
      'none',
      'defaultRuntimeStartup',
      'defaultSensitiveValueLoading',
      'providerPackageImportState',
      'not-imported',
      'injected-boundary-required',
      'future-runtime-only',
      'not-production-ready',
    ],
    'provider readiness and closed boundary vocabulary',
  );

  assert.match(source, /PROVIDER_READINESS_BELOW_PASS_STATUSES[\s\S]*'ready-to-attempt'[\s\S]*'ready-to-run'[\s\S]*'acknowledgement-only'/u);
  assert.match(source, /readonly\s+unsafeOutputDetected:\s+boolean;/u, 'unsafe-output is represented by unsafe output detection');
  assert.match(source, /readonly\s+defaultNetworkBehavior:\s+'none';/u, 'closed-network-gate is represented by no default network behavior');
  assert.match(source, /readonly\s+defaultRuntimeStartup:\s+'none';/u, 'runtime startup remains absent by default');
  assert.match(source, /readonly\s+defaultSensitiveValueLoading:\s+'none';/u, 'missing-credential is represented by no default sensitive value loading');
  assert.match(source, /readonly\s+providerPackageImportState:\s+'not-imported';/u, 'missing-provider-port is represented by no provider package import');
});

test('W23D1 provider client contract does not import or instantiate runtime provider network credential behavior', () => {
  const source = readContractSource();

  assert.doesNotMatch(source, /^\s*import\s/mu, 'contract should remain import-free');
  assert.doesNotMatch(source, /\bnew\s+[A-Z][A-Za-z0-9_]*(?:Client|Sdk|SDK)\b/u, 'contract should not instantiate clients or SDKs');
  assert.doesNotMatch(source, /\b(?:createServer|listen|setTimeout|setInterval|addEventListener)\s*\(/u, 'contract should not start runtime behavior');

  assertDoesNotMatchAny(
    source,
    [
      { description: 'process.env', pattern: /\bprocess\s*\.\s*env\b/u },
      { description: 'fs/promises import', pattern: /(?:from\s+|import\(\s*)['"](?:node:)?fs\/promises['"]/u },
      { description: 'node:fs import', pattern: /(?:from\s+|import\(\s*)['"]node:fs['"]/u },
      { description: 'child_process import', pattern: /(?:from\s+|import\(\s*)['"](?:node:)?child_process['"]/u },
      { description: 'http import or call', pattern: /(?:from\s+|import\(\s*)['"](?:node:)?http['"]|\bhttp\.\w+\s*\(/u },
      { description: 'https import or call', pattern: /(?:from\s+|import\(\s*)['"](?:node:)?https['"]|\bhttps\.\w+\s*\(/u },
      { description: 'net import or call', pattern: /(?:from\s+|import\(\s*)['"](?:node:)?net['"]|\bnet\.\w+\s*\(/u },
      { description: 'tls import or call', pattern: /(?:from\s+|import\(\s*)['"](?:node:)?tls['"]|\btls\.\w+\s*\(/u },
      { description: 'fetch call', pattern: /\bfetch\s*\(/u },
      { description: 'axios reference', pattern: /\baxios\b/iu },
      { description: 'undici reference', pattern: /\bundici\b/iu },
      { description: 'Telegraf reference', pattern: /\bTelegraf\b/u },
      { description: 'TelegramBot reference', pattern: /\bTelegramBot\b/u },
      { description: 'OpenClaw client reference', pattern: /\bOpenClaw\s+client\b/iu },
      { description: 'provider SDK reference', pattern: /\bprovider\s+SDK\b/iu },
      { description: 'dotenv reference', pattern: /\bdotenv\b/iu },
      { description: 'secret manager reference', pattern: /\bsecret\s+manager\b/iu },
    ],
    'provider client contract runtime forbidden vocabulary',
  );
});

test('W23D1 provider client public projections do not expose raw provider callback or credential fields', () => {
  const source = readContractSource();

  assertDoesNotIncludeAny(
    source,
    [
      'rawProviderPayload',
      'rawCallbackPayload',
      'rawTelegramPayload',
      'tokenValue',
      'endpointValue',
      'stackTrace',
      'stdout',
      'stderr',
    ],
    'provider client contract public projection leak vocabulary',
  );
});

test('W23D1 provider client contract avoids production readiness claims while allowing explicit non-claim posture', () => {
  const source = readContractSource();

  assert.match(source, /'not-production-ready'/u, 'contract may keep exact non-claim not-production-ready posture');
  assert.doesNotMatch(source, /\bproduction-ready\b(?!')/iu, 'contract should not claim production-ready outside the exact non-claim posture');
  assert.doesNotMatch(source, /\bproduction ready\b/iu, 'contract should not claim production ready');
  assert.doesNotMatch(source, /\bready for production\b/iu, 'contract should not claim ready for production');
  assert.doesNotMatch(source, /\breal-provider pass\b/iu, 'contract should not claim real-provider pass');
  assert.doesNotMatch(source, /\breal provider success\b/iu, 'contract should not claim real provider success');
});
