import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_FILE = Object.freeze([
  'packages',
  'oca-wrapper',
  'src',
  'oca-sidecar',
  'fake-inert-oca-sidecar-descriptor-boundary.ts',
]);

const REQUIRED_FAKE_INERT_DESCRIPTOR_VOCABULARY = Object.freeze([
  'fake-inert-oca-sidecar-descriptor-boundary',
  'descriptor-only-not-runtime-ready',
  'fake-inert-not-sidecar-runtime',
  'fake-inert-descriptor-only',
  'redacted-json-safe',
  'redacted-summary-only',
  'descriptorOnly: true',
  'fakeOrInertDescriptorOnly: true',
  'sidecarRuntimeImplemented: false',
  'executionPass: false',
  'productionReady: false',
  'no-oca-runtime-readiness-claim',
  'no-sidecar-readiness-claim',
  'no-provider-runtime-readiness-claim',
  'no-deployment-readiness-claim',
  'no-production-readiness-claim',
]);

const REQUIRED_BLOCKED_EXECUTION_VOCABULARY = Object.freeze([
  'missing-client-not-execution-pass',
  'closed-gate-not-execution-pass',
  'missing-credential-not-execution-pass',
  'blocked-policy-not-execution-pass',
  'missing-store-not-execution-pass',
  'ready-to-attempt-not-execution-pass',
  'ready-to-run-not-execution-pass',
  'approval-required-before-runtime-attempt',
  'providerAcknowledgementIsBusinessOutcome: false',
]);

const REQUIRED_SAFE_PUBLIC_SUMMARY_VOCABULARY = Object.freeze([
  'redacted-oca-sidecar-public-summary',
  'safeCorrelationRef',
  'safeLabels',
  'safeSummaryText',
  'safeDetails',
  'redacted descriptor detail',
  'providerAcknowledgementStatus',
  'businessOutcomeStatus',
]);

const FORBIDDEN_IMPORT_PATTERNS = Object.freeze([
  ['child_process import or require', /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:node:)?child_process['"]/u],
  ['http import or require', /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:node:)?http['"]/u],
  ['https import or require', /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:node:)?https['"]/u],
  ['net import or require', /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:node:)?net['"]/u],
  ['tls import or require', /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:node:)?tls['"]/u],
  ['filesystem import or require', /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:node:)?fs(?:\/promises)?['"]/u],
  ['path import or require', /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:node:)?path['"]/u],
  ['daemon or supervisor package import', /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:execa|cross-spawn|node-pty|pm2|forever|supervisor|daemonize-process|zx)['"]/u],
  ['package root fan-in import', /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:\.\.\/)+index\.js['"]/u],
]);

const FORBIDDEN_RUNTIME_BEHAVIOR_PATTERNS = Object.freeze([
  ['process spawning call', /\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\s*\(/u],
  ['network fetch call', /\bfetch\s*\(/u],
  ['websocket or event-source construction', /\bnew\s+(?:WebSocket|EventSource|XMLHttpRequest)\s*\(/u],
  ['server or listener behavior', /\b(?:createServer|listen|connect|request)\s*\(/u],
  ['filesystem read or write call', /\b(?:readFile|readFileSync|writeFile|writeFileSync|appendFile|mkdir|rm|unlink|readdir|stat|open|createReadStream|createWriteStream)\s*\(/u],
  ['path traversal or path resolver call', /\b(?:join|resolve|dirname|basename|relative|parse)\s*\(/u],
  ['process or environment read', /\bprocess\.(?:env|argv|cwd|pid|platform)\b/u],
  ['import.meta environment read', /\bimport\.meta\.env\b/u],
  ['Deno environment read', /\bDeno\.env\b/u],
  ['dotenv or config loader', /\b(?:dotenv|loadConfig|readConfig|secretManager|getSecret|resolveSecret)\b/u],
  ['OCA client construction', /\b(?:createOcaClient|buildOcaClient|OcaClient|OpenClawClient|CodexClient)\b/u],
  ['provider SDK or client construction', /\b(?:ProviderClient|providerClient|sdkClient|clientHandle|createClient|buildClient)\b/u],
  ['sidecar startup or process behavior', /\b(?:startSidecar|launchSidecar|spawnSidecar|runSidecar|sidecarProcess)\b/u],
  ['sidecar runtime marked implemented', /\bsidecarRuntimeImplemented\s*:\s*true\b/u],
  ['runtime attempt marked true', /\bruntimeAttempt(?:ed)?\s*:\s*true\b/u],
  ['package root fan-in re-export', /\bexport\s+(?:\*|\{[\s\S]*?\})\s+from\s+['"][^'"]+['"]/u],
]);

const FORBIDDEN_PUBLIC_FIELD_PATTERNS = Object.freeze([
  [
    'raw provider/runtime/tool payload public field',
    /\b(?:readonly\s+)?(?:raw[A-Z][A-Za-z0-9_]*|rawPayload|rawOutput|rawLog|rawDiff|providerPayload|runtimePayload|commandOutput|debugDump|requestBody|responseBody|fullLog)\??\s*:/u,
  ],
  [
    'unsafe diagnostic or runtime handle public field',
    /\b(?:readonly\s+)?(?:token|secret|credentialValue|rawToken|rawSecret|rawCredential|endpoint|path|filePath|repoPath|workspacePath|client|clientHandle|sdkClient|processId|stack|stackTrace|stdout|stderr|internal)\??\s*:/u,
  ],
]);

const FORBIDDEN_DIRECT_LEAK_FRAGMENTS = Object.freeze([
  'raw OCA output',
  'raw output',
  'rawOcaOutput',
  'rawOutput',
  'rawPayload',
  'rawProviderPayload',
  'providerPayload',
  'rawRuntimePayload',
  'runtimePayload',
  'rawToolPayload',
  'rawLog',
  'rawDiff',
  'commandOutput',
  'stdout',
  'stderr',
  'stackTrace',
  'stack trace',
  'tokenValue',
  'rawToken',
  'secretValue',
  'rawSecret',
  'credentialValue',
  'rawCredential',
  'endpointValue',
  'endpoint',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'privateKey',
  'clientHandle',
  'sdkClient',
  'providerObject',
  'sdkObject',
  'debugDump',
  'requestBody',
  'responseBody',
  'fullLog',
  'processId',
  'Authorization',
  'Bearer ',
  'http://',
  'https://',
  'localhost',
  '/home/',
  '/Users/',
  'C:\\',
]);

function readUtf8(segments) {
  return readFileSync(path.join(repoRoot, ...segments), 'utf8');
}

function assertIncludes(source, expected, label) {
  assert.equal(source.includes(expected), true, label + ' should include ' + expected);
}

function assertDoesNotInclude(source, forbidden, label) {
  assert.equal(source.includes(forbidden), false, label + ' should not include ' + forbidden);
}

function assertNoMatch(source, pattern, label) {
  assert.equal(pattern.test(source), false, label);
}

test('W28D2 guard reads only the W28C fake inert descriptor boundary source', () => {
  assert.equal(
    SOURCE_FILE.join('/'),
    'packages/oca-wrapper/src/oca-sidecar/fake-inert-oca-sidecar-descriptor-boundary.ts',
  );
});

test('W28C boundary keeps fake inert descriptor-only posture explicit', () => {
  const source = readUtf8(SOURCE_FILE);

  for (const expected of REQUIRED_FAKE_INERT_DESCRIPTOR_VOCABULARY) {
    assertIncludes(source, expected, 'fake inert OCA sidecar descriptor boundary');
  }

  assert.match(source, /\bboundaryKind\s*:\s*'fake-inert-oca-sidecar-descriptor-boundary'/u);
});

test('W28C boundary keeps runtime attempt and execution pass blocked or false when represented', () => {
  const source = readUtf8(SOURCE_FILE);

  for (const expected of REQUIRED_BLOCKED_EXECUTION_VOCABULARY) {
    assertIncludes(source, expected, 'fake inert OCA sidecar descriptor boundary');
  }

  assert.match(source, /\bdescriptorOnly\s*:\s*true\b/u);
  assert.match(source, /\bexecutionPass\s*:\s*false\b/u);
  assert.match(source, /\bproductionReady\s*:\s*false\b/u);
  assert.equal((source.match(/\bexecutionPass\s*:\s*false\b/gu) ?? []).length >= 4, true);
  assert.equal((source.match(/\bdescriptorOnly\s*:\s*true\b/gu) ?? []).length >= 4, true);
  assertNoMatch(source, /\bexecutionPass\s*:\s*true\b/u, 'execution pass must never be marked true');
  assertNoMatch(source, /\bdescriptorOnly\s*:\s*false\b/u, 'descriptor-only must never be marked false');
  assertNoMatch(source, /\bproductionReady\s*:\s*true\b/u, 'production readiness must never be marked true');
  assertNoMatch(source, /['"]ready-to-(?:attempt|run)['"]/u, 'ready-to-attempt/run must remain not-execution-pass labels');
});

test('W28C boundary does not import or use runtime, sidecar, filesystem, network, client, or package-root fan-in behavior', () => {
  const source = readUtf8(SOURCE_FILE);

  for (const [label, pattern] of FORBIDDEN_IMPORT_PATTERNS) {
    assertNoMatch(source, pattern, 'fake inert OCA sidecar descriptor boundary should not include ' + label);
  }

  for (const [label, pattern] of FORBIDDEN_RUNTIME_BEHAVIOR_PATTERNS) {
    assertNoMatch(source, pattern, 'fake inert OCA sidecar descriptor boundary should not include ' + label);
  }
});

test('W28C public summaries stay safe, redacted, and acknowledgement-separated', () => {
  const source = readUtf8(SOURCE_FILE);

  for (const expected of REQUIRED_SAFE_PUBLIC_SUMMARY_VOCABULARY) {
    assertIncludes(source, expected, 'fake inert OCA sidecar descriptor boundary');
  }

  assert.match(
    source,
    /providerAcknowledgementStatus:\s*\n\s*input\.providerAcknowledgementStatus/u,
    'provider acknowledgement should remain explicit and separate from business outcome normalization',
  );
  assert.match(
    source,
    /businessOutcomeStatus:\s*normalizeBusinessOutcomeStatus\(/u,
    'business outcome should remain normalized separately from provider acknowledgement',
  );
});

test('W28C boundary does not expose raw OCA, runtime, tool, diagnostic, token, endpoint, path, client, or SDK leak fields', () => {
  const source = readUtf8(SOURCE_FILE);

  for (const [label, pattern] of FORBIDDEN_PUBLIC_FIELD_PATTERNS) {
    assertNoMatch(source, pattern, 'fake inert OCA sidecar descriptor boundary should not expose ' + label);
  }

  for (const forbidden of FORBIDDEN_DIRECT_LEAK_FRAGMENTS) {
    assertDoesNotInclude(source, forbidden, 'fake inert OCA sidecar descriptor boundary');
  }
});
