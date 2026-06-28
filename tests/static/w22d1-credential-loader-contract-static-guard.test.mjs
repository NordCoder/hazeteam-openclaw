import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contractPath = path.join(
  repoRoot,
  'packages',
  'openclaw-adapter',
  'src',
  'credential-loader',
  'credential-loader-contract.ts',
);

function readCredentialLoaderContract() {
  return readFileSync(contractPath, 'utf8');
}

function assertExportedInterface(source, name) {
  assert.match(source, new RegExp(`export\\s+interface\\s+${name}\\b`, 'u'), `${name} must remain an exported interface`);
}

function assertExportedType(source, name) {
  assert.match(source, new RegExp(`export\\s+type\\s+${name}\\b`, 'u'), `${name} must remain an exported type`);
}

test('W22D1 credential loader contract keeps required exported vocabulary', () => {
  const source = readCredentialLoaderContract();

  for (const name of [
    'CredentialLoaderRequirement',
    'RedactedCredentialDescriptor',
    'CredentialLoaderRequirementDescriptor',
    'CredentialLoaderReadinessResult',
    'CredentialLoaderResolutionResult',
    'CredentialLoaderDiagnostic',
    'CredentialLoaderIssueSummary',
  ]) {
    assertExportedInterface(source, name);
  }

  for (const name of [
    'CredentialLoaderCredentialKind',
    'CredentialLoaderSourceClass',
    'CredentialLoaderReadinessStatus',
    'CredentialLoaderResolutionStatus',
    'CredentialLoaderRedactionState',
    'CredentialLoaderIssueSeverity',
    'CredentialLoaderIssueCode',
    'CredentialLoaderPublicOutputClass',
    'CredentialLoaderReadinessClaim',
    'CredentialLoaderCredentialRef',
    'CredentialLoaderRequirementRef',
    'CredentialLoaderConfigurationRef',
    'CredentialLoaderProfileRef',
  ]) {
    assertExportedType(source, name);
  }
});

test('W22D1 credential loader contract preserves descriptor, readiness, resolution, diagnostic, and issue summary shapes', () => {
  const source = readCredentialLoaderContract();

  assert.match(source, /readonly\s+required:\s+boolean;/u, 'requirements must preserve required/optional classification');
  assert.match(source, /readonly\s+redactedLabel\?:\s+CredentialLoaderSafeText;/u, 'requirements must preserve optional safe redacted labels');
  assert.match(source, /readonly\s+safePurpose\?:\s+CredentialLoaderSafeText;/u, 'requirements must preserve optional safe purpose text');
  assert.match(source, /readonly\s+descriptorKind:\s+'redacted-credential-descriptor';/u, 'redacted descriptor kind must remain explicit');
  assert.match(source, /readonly\s+descriptorKind:\s+'credential-requirement-descriptor';/u, 'requirement descriptor kind must remain explicit');
  assert.match(source, /readonly\s+resultKind:\s+'credential-loader-readiness';/u, 'readiness result kind must remain explicit');
  assert.match(source, /readonly\s+resultKind:\s+'credential-loader-resolution';/u, 'resolution result kind must remain explicit');
  assert.match(source, /readonly\s+readinessStatus:\s+CredentialLoaderReadinessStatus;/u, 'readiness status must remain part of public readiness vocabulary');
  assert.match(source, /readonly\s+resolutionStatus:\s+CredentialLoaderResolutionStatus;/u, 'resolution status must remain part of public resolution vocabulary');
  assert.match(source, /readonly\s+safeDiagnostics\?:\s+readonly\s+CredentialLoaderDiagnostic\[\];/u, 'redacted descriptors must preserve bounded safe diagnostics');
  assert.match(source, /readonly\s+issues:\s+readonly\s+CredentialLoaderDiagnostic\[\];/u, 'readiness and resolution outputs must preserve diagnostic lists');
  assert.match(source, /readonly\s+issueSummary:\s+CredentialLoaderIssueSummary;/u, 'readiness and resolution outputs must preserve issue summaries');

  for (const status of [
    'configured-redacted',
    'missing',
    'invalid',
    'unavailable',
    'blocked',
    'disabled',
    'redacted-only',
    'dry-run-ready',
    'not-attempted',
  ]) {
    assert.equal(source.includes(`'${status}'`), true, `credential loader vocabulary must include ${status}`);
  }

  for (const issueCode of [
    'missing-credential-ref',
    'missing-requirement',
    'invalid-descriptor',
    'loader-unavailable',
    'blocked-by-policy',
    'redacted-only',
    'not-implemented',
  ]) {
    assert.equal(source.includes(`'${issueCode}'`), true, `credential loader issue vocabulary must include ${issueCode}`);
  }
});

test('W22D1 credential loader contract remains text-only and does not import runtime, secret, provider, network, or filesystem behavior', () => {
  const source = readCredentialLoaderContract();

  const forbiddenPatterns = [
    [/^\s*import\s/mu, 'credential loader contract must not import modules'],
    [/\bprocess\s*\.\s*env\b/u, 'credential loader contract must not read process.env'],
    [/\bfs\/promises\b/u, 'credential loader contract must not reference fs/promises'],
    [/\bnode:fs\b/u, 'credential loader contract must not reference node:fs'],
    [/\bchild_process\b/u, 'credential loader contract must not reference child_process'],
    [/\bnode:child_process\b/u, 'credential loader contract must not reference node:child_process'],
    [/import\(\s*['"](?:node:)?(?:fs|fs\/promises|child_process|http|https)['"]\s*\)/u, 'credential loader contract must not dynamically import runtime modules'],
    [/from\s+['"](?:node:)?https?['"]/u, 'credential loader contract must not import http or https'],
    [/\bhttp\b/u, 'credential loader contract must not reference http'],
    [/\bhttps\b/u, 'credential loader contract must not reference https'],
    [/\bfetch\s*\(/u, 'credential loader contract must not call fetch'],
    [/\baxios\b/iu, 'credential loader contract must not reference axios'],
    [/\bundici\b/iu, 'credential loader contract must not reference undici'],
    [/\bTelegram\b/u, 'credential loader contract must not reference Telegram behavior'],
    [/\bOpenClaw\s+client\b/iu, 'credential loader contract must not reference an OpenClaw client'],
    [/\bprovider\s+SDK\b/iu, 'credential loader contract must not reference provider SDK behavior'],
    [/\bdotenv\b/iu, 'credential loader contract must not reference dotenv'],
    [/\bsecret\s+manager\b/iu, 'credential loader contract must not reference a secret manager'],
    [/\bcredential\s+loader\s+implementation\b/iu, 'credential loader contract must not reference a credential loader implementation'],
    [/\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk)\b/u, 'credential loader contract must not instantiate clients or SDKs'],
    [/\b(?:readFile|writeFile|readdir|stat|open|createReadStream|createWriteStream)\s*\(/u, 'credential loader contract must not perform filesystem reads or writes'],
  ];

  for (const [pattern, message] of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern, message);
  }
});

test('W22D1 credential loader contract preserves production-readiness non-claim discipline', () => {
  const source = readCredentialLoaderContract();
  const sourceWithoutAllowedNonClaim = source.replaceAll('not-production-ready', '');

  for (const [pattern, message] of [
    [/\bproduction-ready\b/iu, 'credential loader contract must not claim production-ready'],
    [/\bproduction\s+ready\b/iu, 'credential loader contract must not claim production ready'],
    [/\bready\s+for\s+production\b/iu, 'credential loader contract must not claim ready for production'],
    [/\breal-provider\s+pass\b/iu, 'credential loader contract must not claim a real-provider pass'],
    [/\breal\s+secret\s+loaded\b/iu, 'credential loader contract must not claim a real secret loaded'],
  ]) {
    assert.doesNotMatch(sourceWithoutAllowedNonClaim, pattern, message);
  }

  assert.equal(
    source.includes("'credential-loader-not-production-ready'"),
    true,
    'the exact non-claim credential-loader-not-production-ready literal must remain allowed',
  );
});
