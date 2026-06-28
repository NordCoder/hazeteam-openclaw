import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readText(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function readFakeInertCredentialLoaderSource() {
  return readText('packages', 'openclaw-adapter', 'src', 'credential-loader', 'fake-inert-credential-loader-port.ts');
}

function readCredentialLoaderContractSource() {
  return readText('packages', 'openclaw-adapter', 'src', 'credential-loader', 'credential-loader-contract.ts');
}

function assertSourceIncludesAll(source, values, context) {
  for (const value of values) {
    assert.equal(source.includes(value), true, `${context} should include ${value}`);
  }
}

function assertSourceDoesNotIncludeAny(source, values, context) {
  for (const value of values) {
    assert.equal(source.includes(value), false, `${context} should not include ${value}`);
  }
}

function removeAllowedNonProductionClaimText(source) {
  return source.replaceAll('not-production-ready', '');
}

const expectedFakeInertCredentialLoaderExports = Object.freeze([
  'createFakeInertCredentialLoaderPort',
  'fakeInertCredentialLoaderPort',
  'FakeInertCredentialLoaderPort',
  'describeFakeInertCredentialReadiness',
  'resolveFakeInertCredentialResolution',
]);

const expectedFakeInertStates = Object.freeze([
  'configured-redacted',
  'missing',
  'invalid',
  'unavailable',
  'blocked',
  'disabled',
  'redacted-only',
  'dry-run-ready',
  'not-attempted',
]);

const expectedDescriptorOnlyPostureTerms = Object.freeze([
  'not-production-ready',
  'redacted',
  'descriptor',
  'jsonSafe',
]);

const forbiddenImportAndRuntimePatterns = Object.freeze([
  [/process\s*\.\s*env/u, 'process.env'],
  [/from\s+['"]node:fs['"]/u, 'node:fs import'],
  [/from\s+['"]fs\/promises['"]/u, 'fs/promises import'],
  [/from\s+['"]child_process['"]/u, 'child_process import'],
  [/from\s+['"]node:child_process['"]/u, 'node:child_process import'],
  [/from\s+['"](?:node:)?http['"]/u, 'http import'],
  [/from\s+['"](?:node:)?https['"]/u, 'https import'],
  [/from\s+['"](?:node:)?net['"]/u, 'net import'],
  [/from\s+['"](?:node:)?tls['"]/u, 'tls import'],
  [/\bfetch\s*\(/u, 'fetch call'],
  [/\baxios\b/iu, 'axios'],
  [/\bundici\b/iu, 'undici'],
  [/\bdotenv\b/iu, 'dotenv'],
  [/secret\s+manager/iu, 'secret manager'],
  [/\bTelegram\b/u, 'Telegram'],
  [/OpenClaw\s+client/iu, 'OpenClaw client'],
  [/provider\s+SDK/iu, 'provider SDK'],
  [/\bsetTimeout\s*\(/u, 'setTimeout'],
  [/\bsetInterval\s*\(/u, 'setInterval'],
  [/\bWorker\b/u, 'Worker'],
]);

const forbiddenPublicRuntimeMaterialTerms = Object.freeze([
  'rawSecret',
  'secretValue',
  'credentialValue',
  'tokenValue',
  'apiKey',
  'endpointValue',
  'filePath',
  'envValue',
  'stackTrace',
  'stdout',
  'stderr',
]);

const forbiddenProductionClaimTerms = Object.freeze([
  'production-ready',
  'production ready',
  'ready for production',
  'real-provider pass',
  'real secret loaded',
  'live credential loaded',
]);

test('W22D2 fake/inert credential loader exports the expected narrow port surface', () => {
  const source = readFakeInertCredentialLoaderSource();

  assertSourceIncludesAll(source, expectedFakeInertCredentialLoaderExports, 'fake inert credential loader source');
  assert.match(source, /export\s+function\s+createFakeInertCredentialLoaderPort\s*\(/u);
  assert.match(source, /export\s+const\s+fakeInertCredentialLoaderPort\s*:/u);
  assert.match(source, /export\s+interface\s+FakeInertCredentialLoaderPort\b/u);
  assert.match(source, /export\s+function\s+describeFakeInertCredentialReadiness\s*\(/u);
  assert.match(source, /export\s+function\s+resolveFakeInertCredentialResolution\s*\(/u);
});

test('W22D2 fake/inert credential loader preserves explicit fake states and descriptor-only posture', () => {
  const source = readFakeInertCredentialLoaderSource();

  assertSourceIncludesAll(source, expectedFakeInertStates, 'fake inert credential loader source');
  assertSourceIncludesAll(source, expectedDescriptorOnlyPostureTerms, 'fake inert credential loader source');
  assert.match(source, /\bjsonSafe\b/u, 'fake inert credential loader should expose JSON-safe posture');
});

test('W22D2 fake/inert credential loader imports only credential loader contract types', () => {
  const source = readFakeInertCredentialLoaderSource();
  const contractSource = readCredentialLoaderContractSource();

  assert.match(contractSource, /export\s+interface\s+CredentialLoaderReadinessResult\b/u);
  assert.match(source, /^import\s+type\s+\{[\s\S]+?\}\s+from\s+['"]\.\/credential-loader-contract\.js['"];$/mu);
  assert.doesNotMatch(source, /^import\s+(?!type\b)/mu, 'fake inert credential loader should not import runtime values');
  assert.doesNotMatch(source, /^import\s+type\s+\{[\s\S]+?\}\s+from\s+(?!['"]\.\/credential-loader-contract\.js['"])/mu, 'fake inert credential loader should import types only from the credential loader contract');
  assert.equal([...source.matchAll(/^import\s/mgu)].length, 1, 'fake inert credential loader should have exactly one import declaration');
});

test('W22D2 fake/inert credential loader has no secret, provider, runtime, network, filesystem, process, or timer behavior', () => {
  const source = readFakeInertCredentialLoaderSource();

  for (const [pattern, label] of forbiddenImportAndRuntimePatterns) {
    assert.doesNotMatch(source, pattern, `fake inert credential loader should not contain ${label}`);
  }
});

test('W22D2 fake/inert credential loader does not expose raw sensitive or runtime material terms', () => {
  const source = readFakeInertCredentialLoaderSource();

  assertSourceDoesNotIncludeAny(source, forbiddenPublicRuntimeMaterialTerms, 'fake inert credential loader source');
});

test('W22D2 fake/inert credential loader avoids production and real-secret readiness claims', () => {
  const sourceWithoutAllowedNonProductionClaim = removeAllowedNonProductionClaimText(readFakeInertCredentialLoaderSource());

  assertSourceDoesNotIncludeAny(
    sourceWithoutAllowedNonProductionClaim,
    forbiddenProductionClaimTerms,
    'fake inert credential loader source after removing allowed not-production-ready posture',
  );
});
