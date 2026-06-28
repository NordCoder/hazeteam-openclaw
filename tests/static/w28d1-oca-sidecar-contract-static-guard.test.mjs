import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OCA_SIDECAR_CONTRACT = Object.freeze([
  'packages',
  'oca-wrapper',
  'src',
  'oca-sidecar',
  'oca-sidecar-contract.ts',
]);

const REQUIRED_EXPORTS = Object.freeze([
  'OcaDescriptorKind',
  'OcaCapabilityRef',
  'OcaOperationRef',
  'SidecarDescriptorRef',
  'OcaPolicyRef',
  'OcaCorrelationRef',
  'OcaOperationKind',
  'SidecarDescriptorKind',
  'SidecarLifecycleKind',
  'OcaSidecarReadinessStatus',
  'ApprovalRequirementClass',
  'RuntimeValueContainmentClass',
  'OcaOutputContainmentClass',
  'ProviderAcknowledgementStatus',
  'BusinessOutcomeStatus',
  'OcaSidecarPublicRedactionStatus',
  'OcaSidecarRuntimeClaim',
  'OcaDescriptorContract',
  'OcaOperationDescriptorContract',
  'SidecarLifecycleDescriptorContract',
  'OcaSidecarProviderOutcomeSeparation',
  'RedactedOcaSidecarPublicSummary',
  'OcaSidecarContractSurface',
]);

const REQUIRED_DESCRIPTOR_ONLY_VOCABULARY = Object.freeze([
  'descriptor-only-not-runtime-ready',
  'fake-inert-not-sidecar-runtime',
  'missing-client-not-execution-pass',
  'closed-gate-not-execution-pass',
  'missing-credential-not-execution-pass',
  'blocked-policy-not-execution-pass',
  'missing-store-not-execution-pass',
  'ready-to-attempt-not-execution-pass',
  'ready-to-run-not-execution-pass',
  'no-runtime-value-present',
  'runtime-value-contained-by-explicit-boundary',
  'runtime-value-blocked-from-public-projection',
  'raw-output-contained-private',
  'normalized-before-public-projection',
  'redacted-summary-only',
  'blocked-from-public-projection',
  'no-oca-runtime-readiness-claim',
  'no-sidecar-readiness-claim',
  'no-provider-runtime-readiness-claim',
  'no-deployment-readiness-claim',
  'no-production-readiness-claim',
]);

const FORBIDDEN_IMPORT_SPECIFIER_PATTERNS = Object.freeze([
  /^(?:node:)?(?:fs|fs\/promises|path|child_process|http|https|net|tls)$/iu,
  /^(?:axios|undici|got|node-fetch|cross-fetch|ws|dotenv)$/iu,
  /(?:^|[\/@_-])(?:oca|open-codex|opencode|codex)(?:[\/@_-]|$)/iu,
  /(?:^|[\/@_-])(?:sdk|client|provider-client|credential-loader|secret-loader)(?:[\/@_-]|$)/iu,
  /(?:^|[\/@_-])(?:sidecar-runtime|sidecar-process|daemon|supervisor)(?:[\/@_-]|$)/iu,
]);

const FORBIDDEN_RUNTIME_USAGE_PATTERNS = Object.freeze([
  ['process.env read', /\bprocess\s*\.\s*env\b/u],
  ['process argv read', /\bprocess\s*\.\s*argv\b/u],
  ['process cwd read', /\bprocess\s*\.\s*cwd\s*\(/u],
  ['network fetch call', /\bfetch\s*\(/u],
  ['WebSocket construction', /\bnew\s+WebSocket\b/u],
  ['HTTP server construction', /\bcreateServer\s*\(/u],
  ['child process spawn', /\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\s*\(/u],
  ['filesystem read/write', /\b(?:readFile|readFileSync|writeFile|writeFileSync|appendFile|appendFileSync|readdir|readdirSync|stat|statSync|open|openSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync)\s*\(/u],
  ['path resolution', /\b(?:resolve|join|dirname|basename|relative|normalize)\s*\(/u],
  ['credential loader', /\b(?:loadCredential|loadCredentials|CredentialLoader|credentialLoader|loadSecret|loadSecrets|SecretLoader|secretLoader|secretManager)\b/u],
  ['dotenv config', /\bdotenv\s*\.\s*config\s*\(/u],
  ['OCA SDK/client construction', /\b(?:new\s+\w*(?:Oca|OCA)\w*(?:Client|Sdk)|create\w*(?:Oca|OCA)\w*(?:Client|Sdk)|(?:Oca|OCA)\w*(?:Client|Sdk)\s*\()/u],
  ['provider client construction', /\b(?:new\s+\w*ProviderClient|create\w*ProviderClient|providerClient\s*\()\b/u],
  ['sidecar runtime construction', /\b(?:startSidecar|runSidecar|launchSidecar|spawnSidecar|SidecarRuntime|SidecarProcess|SidecarSupervisor)\b/u],
]);

const FORBIDDEN_RUNTIME_DECLARATION_PATTERNS = Object.freeze([
  ['runtime value export', /\bexport\s+(?:const|let|var|function|class)\b/u],
  ['class declaration', /\bclass\s+[A-Z_a-z]/u],
  ['function declaration', /\bfunction\s+[A-Z_a-z]/u],
  ['runtime construction', /\bnew\s+[A-Z_a-z]/u],
  ['async or awaited runtime behavior', /\b(?:async|await)\b/u],
]);

const FORBIDDEN_PUBLIC_FIELD_TERMS = Object.freeze([
  'token',
  'secret',
  'endpoint',
  'path',
  'stack',
  'log',
  'stdout',
  'stderr',
  'diff',
  'commandOutput',
  'rawOutput',
  'rawPayload',
  'processId',
  'client',
  'sdkClient',
]);

const SAFE_NEGATIVE_CONTEXT_MARKERS = Object.freeze([
  'no-',
  'no ',
  'not-',
  'not ',
  'never ',
  'without ',
  'redacted',
  'contained',
  'blocked',
  'missing-',
  'not-exposed',
  'normalized',
  'separate',
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
  return value.replace(/[\\^$.*+?()[\]{}|]/gu, '\\$&');
}

function normalizePublicVocabulary(value) {
  return value.replace(/[^A-Z0-9]/giu, '').toLowerCase();
}

function assertIncludes(source, expected, label) {
  assert.equal(source.includes(expected), true, `${label} should include ${expected}`);
}

function assertExportedDeclaration(source, exportedName) {
  assert.match(
    source,
    new RegExp(`\\bexport\\s+(?:type|interface)\\s+${escapeRegExp(exportedName)}\\b`, 'u'),
    `OCA sidecar contract should export ${exportedName}`,
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

function extractReadonlyFieldNames(source) {
  return [...source.matchAll(/\breadonly\s+([A-Z_a-z][$\w]*)\??\s*:/gu)].map((match) => match[1]);
}

function extractReadonlyLiteralTypes(source, fieldName) {
  const pattern = new RegExp(`\\breadonly\\s+${escapeRegExp(fieldName)}\\??\\s*:\\s*([^;]+);`, 'gu');

  return [...source.matchAll(pattern)].map((match) => match[1].trim());
}

function extractNamedBlock(source, kind, name) {
  const pattern = new RegExp(
    `\\bexport\\s+${kind}\\s+${escapeRegExp(name)}\\b[\\s\\S]*?(?=\\nexport\\s+(?:type|interface)\\s+|$)`,
    'u',
  );
  const match = source.match(pattern);

  assert.ok(match, `OCA sidecar contract should include exported ${kind} ${name}`);

  return match[0];
}

function extractStringLiterals(source) {
  return [...source.matchAll(/'([^']+)'/gu)].map((match) => match[1]);
}

function assertNoForbiddenImports(source) {
  const importSpecifiers = extractImportSpecifiers(source);

  assert.deepEqual(importSpecifiers, [], 'OCA sidecar contract should stay import-free and side-effect-free');

  for (const specifier of importSpecifiers) {
    for (const pattern of FORBIDDEN_IMPORT_SPECIFIER_PATTERNS) {
      assert.doesNotMatch(specifier, pattern, `OCA sidecar contract should not import ${specifier}`);
    }
  }
}

function assertNoRuntimeUsage(source) {
  for (const [label, pattern] of FORBIDDEN_RUNTIME_USAGE_PATTERNS) {
    assert.doesNotMatch(source, pattern, `OCA sidecar contract should not contain ${label}`);
  }

  for (const [label, pattern] of FORBIDDEN_RUNTIME_DECLARATION_PATTERNS) {
    assert.doesNotMatch(source, pattern, `OCA sidecar contract should not contain ${label}`);
  }
}

function assertNoUnsafePublicFieldVocabulary(source) {
  const readonlyFieldNames = extractReadonlyFieldNames(source);
  const normalizedForbiddenTerms = FORBIDDEN_PUBLIC_FIELD_TERMS.map((term) => [
    term,
    normalizePublicVocabulary(term),
  ]);

  for (const fieldName of readonlyFieldNames) {
    const normalizedFieldName = normalizePublicVocabulary(fieldName);

    for (const [term, normalizedTerm] of normalizedForbiddenTerms) {
      assert.equal(
        normalizedFieldName.includes(normalizedTerm),
        false,
        `OCA sidecar contract public field ${fieldName} should not expose unsafe vocabulary ${term}`,
      );
    }
  }
}

function assertExactUnsafeTermsAreOnlySafeNegativeAssertions(source) {
  for (const term of FORBIDDEN_PUBLIC_FIELD_TERMS) {
    const pattern = new RegExp(`(^|[^A-Z0-9_])(${escapeRegExp(term)})(?=$|[^A-Z0-9_])`, 'giu');

    for (const match of source.matchAll(pattern)) {
      const start = Math.max(0, match.index - 120);
      const end = Math.min(source.length, match.index + match[0].length + 120);
      const context = source.slice(start, end).toLowerCase();
      const hasSafeNegativeContext = SAFE_NEGATIVE_CONTEXT_MARKERS.some((marker) => context.includes(marker));

      assert.equal(
        hasSafeNegativeContext,
        true,
        `OCA sidecar contract should not mention unsafe term ${term} without safe negative or no-leak context`,
      );
    }
  }
}

function assertReadonlyLiteral(source, fieldName, expectedLiteral) {
  const literalTypes = extractReadonlyLiteralTypes(source, fieldName);

  assert.notEqual(literalTypes.length, 0, `OCA sidecar contract should declare ${fieldName}`);

  for (const literalType of literalTypes) {
    assert.equal(
      literalType,
      expectedLiteral,
      `OCA sidecar contract ${fieldName} should remain ${expectedLiteral}`,
    );
  }
}

test('W28D1 static guard is scoped to the accepted W28B OCA sidecar contract file', () => {
  assert.equal(
    asRepoRelative(OCA_SIDECAR_CONTRACT),
    'packages/oca-wrapper/src/oca-sidecar/oca-sidecar-contract.ts',
  );
});

test('OCA sidecar contract preserves required W28B exported vocabulary surfaces', () => {
  const source = readUtf8(OCA_SIDECAR_CONTRACT);

  for (const exportedName of REQUIRED_EXPORTS) {
    assertExportedDeclaration(source, exportedName);
  }

  for (const vocabulary of REQUIRED_DESCRIPTOR_ONLY_VOCABULARY) {
    assertIncludes(source, vocabulary, 'OCA sidecar descriptor-only vocabulary');
  }
});

test('OCA sidecar contract remains descriptor-only and not runtime or production ready', () => {
  const source = readUtf8(OCA_SIDECAR_CONTRACT);

  assertReadonlyLiteral(source, 'descriptorOnly', 'true');
  assertReadonlyLiteral(source, 'executionPass', 'false');
  assertReadonlyLiteral(source, 'productionReady', 'false');
  assertReadonlyLiteral(source, 'sidecarRuntimeImplemented', 'false');
  assertReadonlyLiteral(source, 'fakeOrInertDescriptorOnly', 'true');
});

test('OCA sidecar readiness statuses are not execution pass states', () => {
  const source = readUtf8(OCA_SIDECAR_CONTRACT);
  const readinessBlock = extractNamedBlock(source, 'type', 'OcaSidecarReadinessStatus');
  const readinessStatuses = extractStringLiterals(readinessBlock);

  assert.notEqual(readinessStatuses.length, 0, 'OCA sidecar readiness statuses should be explicit string literals');

  for (const status of readinessStatuses) {
    assert.equal(
      status.includes('execution-pass') && !status.includes('not-execution-pass'),
      false,
      `OCA sidecar readiness status ${status} should not be an execution pass`,
    );

    if (status.includes('ready-to-attempt') || status.includes('ready-to-run')) {
      assert.equal(
        status.endsWith('not-execution-pass'),
        true,
        `OCA sidecar readiness status ${status} should remain not execution pass`,
      );
    }
  }

  assertIncludes(readinessBlock, 'missing-client-not-execution-pass', 'OCA sidecar readiness vocabulary');
  assertIncludes(readinessBlock, 'ready-to-attempt-not-execution-pass', 'OCA sidecar readiness vocabulary');
  assertIncludes(readinessBlock, 'ready-to-run-not-execution-pass', 'OCA sidecar readiness vocabulary');
});

test('OCA sidecar contract keeps provider acknowledgement separate from business outcome', () => {
  const source = readUtf8(OCA_SIDECAR_CONTRACT);
  const separationBlock = extractNamedBlock(source, 'interface', 'OcaSidecarProviderOutcomeSeparation');
  const publicSummaryBlock = extractNamedBlock(source, 'interface', 'RedactedOcaSidecarPublicSummary');

  assert.match(
    separationBlock,
    /\breadonly\s+providerAcknowledgementStatus\s*:\s*ProviderAcknowledgementStatus;/u,
    'OCA sidecar provider acknowledgement status should remain separate',
  );
  assert.match(
    separationBlock,
    /\breadonly\s+businessOutcomeStatus\s*:\s*BusinessOutcomeStatus;/u,
    'OCA sidecar business outcome status should remain separate',
  );
  assert.match(
    separationBlock,
    /\breadonly\s+providerAcknowledgementIsBusinessOutcome\s*:\s*false;/u,
    'OCA sidecar provider acknowledgement should not be business outcome',
  );
  assert.match(
    publicSummaryBlock,
    /extends\s+OcaSidecarProviderOutcomeSeparation\b/u,
    'OCA sidecar public summary should inherit provider/business outcome separation',
  );
  assertIncludes(source, 'acknowledged-without-business-outcome', 'OCA sidecar provider acknowledgement vocabulary');
  assertIncludes(source, 'reported-separately', 'OCA sidecar business outcome vocabulary');
});

test('OCA sidecar contract does not import or use OCA SDK, sidecar runtime, provider, network, filesystem, process, or credential behavior', () => {
  const source = readUtf8(OCA_SIDECAR_CONTRACT);

  assertNoForbiddenImports(source);
  assertNoRuntimeUsage(source);
});

test('OCA sidecar public contract does not expose unsafe raw, runtime, process, provider, client, stream, or path vocabulary', () => {
  const source = readUtf8(OCA_SIDECAR_CONTRACT);

  assertNoUnsafePublicFieldVocabulary(source);
  assertExactUnsafeTermsAreOnlySafeNegativeAssertions(source);
  assertIncludes(source, 'redacted-json-safe', 'OCA sidecar public redaction vocabulary');
  assertIncludes(source, 'public-projection-blocked', 'OCA sidecar public redaction vocabulary');
});
