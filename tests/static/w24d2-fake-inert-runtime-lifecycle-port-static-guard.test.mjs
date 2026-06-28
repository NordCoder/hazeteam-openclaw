import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const W24C_RUNTIME_LIFECYCLE_PORT = Object.freeze([
  'packages',
  'openclaw-adapter',
  'src',
  'runtime-mode',
  'fake-inert-runtime-lifecycle-port.ts',
]);
const W24B_RUNTIME_MODE_CONTRACT = Object.freeze([
  'packages',
  'openclaw-adapter',
  'src',
  'runtime-mode',
  'runtime-mode-contract.ts',
]);

const EXPECTED_EXPORTED_SURFACE = Object.freeze([
  'createFakeInertRuntimeLifecyclePort',
  'fakeInertRuntimeLifecyclePort',
  'FakeInertRuntimeLifecyclePort',
]);

const EXPECTED_PORT_METHOD_SURFACE = Object.freeze([
  'describeMode',
  'evaluateStartEligibility',
  'classifyTransition',
  'requestFakeLifecycleTransition',
]);

const EXPECTED_FAKE_INERT_VOCABULARY = Object.freeze([
  'descriptor-only',
  'fake-inert',
  'open-not-pass',
  'blocked-by-operator-gate',
  'blocked-by-runtime-gate',
  'blocked-by-real-edge-gate',
  'eligible-to-attempt-not-pass',
  'eligible-to-request-run-not-pass',
  'ready-to-attempt-not-pass',
  'ready-to-run-not-pass',
  'failed-safe',
]);

const EXPECTED_NON_PRODUCTION_POSTURE = Object.freeze([
  ['not-production-ready', 'productionReady: false'],
  ['redacted', 'redacted-runtime-mode-descriptor'],
  ['jsonSafe', 'assertAndCloneJsonSafe'],
  ['descriptor', 'descriptor-only-not-runtime-readiness'],
  ['not-implemented', 'runtimeBehaviorImplemented: false'],
]);

const FORBIDDEN_IMPORT_OR_EFFECT_PATTERNS = Object.freeze([
  ['process.env', /\bprocess\.env\b/u],
  ['node:fs', /from\s+['"]node:fs['"]/u],
  ['fs/promises', /from\s+['"](?:node:)?fs\/promises['"]/u],
  ['child_process', /from\s+['"]child_process['"]/u],
  ['node:child_process', /from\s+['"]node:child_process['"]/u],
  ['http module import', /from\s+['"](?:node:)?http['"]/u],
  ['https module import', /from\s+['"](?:node:)?https['"]/u],
  ['net module import', /from\s+['"](?:node:)?net['"]/u],
  ['tls module import', /from\s+['"](?:node:)?tls['"]/u],
  ['fetch call', /\bfetch\s*\(/u],
  ['axios', /\baxios\b/u],
  ['undici', /\bundici\b/u],
  ['Telegraf', /\bTelegraf\b/u],
  ['TelegramBot', /\bTelegramBot\b/u],
  ['OpenClaw client', /\bOpenClaw\s+client\b/u],
  ['provider SDK', /\bprovider\s+SDK\b/u],
  ['dotenv', /\bdotenv\b/u],
  ['secret manager', /\bsecret\s+manager\b/u],
  ['createServer', /\bcreateServer\s*\(/u],
  ['listen call', /\.listen\s*\(/u],
  ['setTimeout', /\bsetTimeout\s*\(/u],
  ['setInterval', /\bsetInterval\s*\(/u],
  ['setImmediate', /\bsetImmediate\s*\(/u],
  ['Worker construction', /\bnew\s+Worker\s*\(/u],
  ['webhook receiver startup', /\bwebhook receiver\b(?! started: false)/iu],
  ['polling loop startup', /\bpolling loop\b(?! started: false)/iu],
  ['daemon startup', /\bdaemon\b\s+started\b/iu],
]);

const FORBIDDEN_RUNTIME_IMPORT_FRAGMENTS = Object.freeze([
  '/provider',
  'provider-client',
  'runtime-values',
  'integration-harness',
  'telegram-transport',
  'openclaw-plugin-runtime',
  'oca-wrapper',
  'domain-lifeos',
  'sidecar',
  'webhook',
  'listener',
  'polling',
]);

const FORBIDDEN_PUBLIC_MATERIAL_TERMS = Object.freeze([
  'rawRuntimePayload',
  'rawProviderPayload',
  'rawCallbackPayload',
  'rawTelegramPayload',
  'tokenValue',
  'apiKey',
  'endpointValue',
  'filePath',
  'envValue',
  'stackTrace',
  'stdout',
  'stderr',
  'sdkClient',
  'providerClient:',
  'providerClient =',
  'runtimeHandle:',
  'runtimeHandle =',
  'processId',
]);

const FORBIDDEN_PRODUCTION_CLAIMS = Object.freeze([
  'production ready',
  'ready for production',
  'real-provider pass',
  'real provider success',
  'live runtime started',
  'listener started',
  'webhook started',
  'polling started',
  'daemon started',
]);

function repoPath(segments) {
  return path.join(repoRoot, ...segments);
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

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

function importStatementsFrom(source) {
  return [...source.matchAll(/^\s*import\s+[\s\S]*?;$/gmu)].map((match) => match[0]);
}

test('W24C exposes the expected fake/inert lifecycle port surface without package-root fan-in', () => {
  const source = readUtf8(W24C_RUNTIME_LIFECYCLE_PORT);

  for (const expected of EXPECTED_EXPORTED_SURFACE) {
    assert.match(source, new RegExp(`export\\s+(?:interface|function|const|type)\\s+${expected}\\b`, 'u'));
  }

  for (const expected of EXPECTED_PORT_METHOD_SURFACE) {
    assertIncludes(source, expected, 'W24C port method surface');
  }

  assert.match(source, /createFakeInertRuntimeLifecyclePort\s*\(\)\s*:\s*FakeInertRuntimeLifecyclePort/u);
  assert.match(source, /return\s*\{[\s\S]*describeMode:[\s\S]*evaluateStartEligibility:[\s\S]*classifyTransition:[\s\S]*requestFakeLifecycleTransition:[\s\S]*\}/u);
});

test('W24C preserves explicit fake/inert lifecycle and below-pass gate vocabulary', () => {
  const source = readUtf8(W24C_RUNTIME_LIFECYCLE_PORT);

  for (const expected of EXPECTED_FAKE_INERT_VOCABULARY) {
    assertIncludes(source, expected, 'W24C fake/inert lifecycle vocabulary');
  }
});

test('W24C preserves non-production, redacted, JSON-safe, descriptor-only posture', () => {
  const source = readUtf8(W24C_RUNTIME_LIFECYCLE_PORT);

  for (const [posture, evidence] of EXPECTED_NON_PRODUCTION_POSTURE) {
    assertIncludes(source, evidence, `W24C ${posture} posture`);
  }
});

test('W24C imports only W24B contract types and no runtime/provider/client/network modules', () => {
  const source = readUtf8(W24C_RUNTIME_LIFECYCLE_PORT);
  const imports = importStatementsFrom(source);

  assert.equal(imports.length, 1, 'W24C should have exactly one import statement');
  assert.match(imports[0], /^import\s+type\s+\{[\s\S]*\}\s+from\s+['"]\.\/runtime-mode-contract\.js['"];$/u);

  const contractSource = readUtf8(W24B_RUNTIME_MODE_CONTRACT);
  assertIncludes(contractSource, 'export type RuntimeModeKind', 'W24B runtime-mode contract');
  assertIncludes(contractSource, 'export interface RedactedRuntimeModeDescriptor', 'W24B runtime-mode contract');

  for (const forbidden of FORBIDDEN_RUNTIME_IMPORT_FRAGMENTS) {
    assertDoesNotInclude(imports.join('\n'), forbidden, 'W24C import boundary');
  }
});

test('W24C does not introduce listener, webhook, polling, daemon, timer, network, provider SDK, credential, or server behavior', () => {
  const executableSource = stripComments(readUtf8(W24C_RUNTIME_LIFECYCLE_PORT));

  for (const [label, pattern] of FORBIDDEN_IMPORT_OR_EFFECT_PATTERNS) {
    assert.equal(pattern.test(executableSource), false, `W24C should not include ${label}`);
  }
});

test('W24C public construction avoids raw provider, runtime, callback, credential, path, stack, process, SDK, and client material', () => {
  const source = readUtf8(W24C_RUNTIME_LIFECYCLE_PORT);

  for (const forbidden of FORBIDDEN_PUBLIC_MATERIAL_TERMS) {
    assertDoesNotInclude(source, forbidden, 'W24C public output construction');
  }

  assertIncludes(source, 'providerClientConstructed: false', 'W24C provider client inertness indicator');
  assertIncludes(source, 'networkBehaviorStarted: false', 'W24C network inertness indicator');
  assertIncludes(source, 'credentialLoaded: false', 'W24C credential inertness indicator');
});

test('W24C avoids production-readiness and real runtime success claims while allowing exact non-claim terms', () => {
  const source = readUtf8(W24C_RUNTIME_LIFECYCLE_PORT).replaceAll('not-production-ready', '');
  const normalized = source.toLowerCase();

  assertDoesNotInclude(normalized, 'production-ready', 'W24C production non-claim');

  for (const forbidden of FORBIDDEN_PRODUCTION_CLAIMS) {
    assertDoesNotInclude(normalized, forbidden, 'W24C production and runtime startup non-claims');
  }
});
