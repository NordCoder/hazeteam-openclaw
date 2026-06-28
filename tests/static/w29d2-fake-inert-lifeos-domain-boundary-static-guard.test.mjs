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

function readFakeInertLifeosDomainBoundarySource() {
  return readText('packages', 'domain-lifeos', 'src', 'domain-boundary', 'fake-inert-lifeos-domain-adapter-boundary.ts');
}

function readLifeosDomainContractSource() {
  return readText('packages', 'domain-lifeos', 'src', 'domain-boundary', 'lifeos-domain-contract.ts');
}

function assertSourceIncludesAll(source, values, context) {
  for (const value of values) {
    assert.equal(source.includes(value), true, `${context} should include ${value}`);
  }
}

function assertSourceDoesNotMatchAny(source, patterns, context) {
  for (const [pattern, label] of patterns) {
    assert.doesNotMatch(source, pattern, `${context} should not contain ${label}`);
  }
}

function assertSourceDoesNotIncludeAny(source, values, context) {
  for (const value of values) {
    assert.equal(source.includes(value), false, `${context} should not include ${value}`);
  }
}

function importDeclarations(source) {
  return [...source.matchAll(/^import[\s\S]*?;$/gmu)].map((match) => match[0]);
}

const expectedDescriptorPostureTerms = Object.freeze([
  'FakeInertLifeosDomainAdapterBoundary',
  'lifeos-domain-event-descriptor',
  'lifeos-domain-command-descriptor',
  'lifeos-redacted-public-domain-projection',
  'fake-or-inert-below-production',
  'below-production-readiness',
  'descriptor-only-not-handler',
  'declarative-requirement-only',
  'redacted-json-safe',
  'safe-ref-only',
  'boundedSummary',
  'Object.freeze',
]);

const expectedDescriptorBoundaryTerms = Object.freeze([
  'domainDescriptorsAreProductBehavior: false',
  'domainCommandDescriptorsAreHandlers: false',
  'domainToOcaDeclarationsAreOcaExecution: false',
  'providerAcknowledgementBoundary: input.providerAcknowledgementBoundary ?? \'not-attempted\'',
  'attemptGateState: input.attemptGateState ?? \'not-configured\'',
  'productionReady: false',
  'duplicateExternalEffectAllowed: false',
  'allowsFunctions: false',
  'allowsClasses: false',
  'allowsSymbols: false',
  'allowsNonJsonValues: false',
]);

const expectedDomainToOcaDeclarationTerms = Object.freeze([
  'lifeos-domain-to-oca-declaration',
  'domain-to-oca-declaration-not-oca-execution',
  'declareDomainToOca',
  'capabilityActionRef',
  'approvalRequirement',
]);

const expectedUnsafeTextQuarantineTerms = Object.freeze([
  'containsUnsafeFragment',
  'UNSAFE_TEXT_FRAGMENTS',
  'fromCharCodes',
  'redacted',
]);

const forbiddenProviderAndRuntimeImports = Object.freeze([
  [/from\s+['"][^'"]*(?:telegram|telegraf|grammy|openclaw-sdk|openclaw-client|provider-sdk|provider-client)[^'"]*['"]/iu, 'provider SDK import'],
  [/import\(\s*['"][^'"]*(?:telegram|telegraf|grammy|openclaw-sdk|openclaw-client|provider-sdk|provider-client)[^'"]*['"]\s*\)/iu, 'dynamic provider SDK import'],
  [/require\(\s*['"][^'"]*(?:telegram|telegraf|grammy|openclaw-sdk|openclaw-client|provider-sdk|provider-client)[^'"]*['"]\s*\)/iu, 'provider SDK require'],
  [/from\s+['"][^'"]*(?:@hazeteam\/oca-wrapper|packages\/oca-wrapper|oca-wrapper|oca-sdk|oca-client|codex|opencode|sidecar|session-store|operation-handler|runtime-client)[^'"]*['"]/iu, 'OCA runtime or client import'],
  [/import\(\s*['"][^'"]*(?:@hazeteam\/oca-wrapper|packages\/oca-wrapper|oca-wrapper|oca-sdk|oca-client|codex|opencode|sidecar|session-store|operation-handler|runtime-client)[^'"]*['"]\s*\)/iu, 'dynamic OCA runtime or client import'],
  [/require\(\s*['"][^'"]*(?:@hazeteam\/oca-wrapper|packages\/oca-wrapper|oca-wrapper|oca-sdk|oca-client|codex|opencode|sidecar|session-store|operation-handler|runtime-client)[^'"]*['"]\s*\)/iu, 'OCA runtime or client require'],
  [/from\s+['"](?:node:)?(?:fs|fs\/promises|child_process|process|http|https|net|tls|dgram|dns|worker_threads|cluster|timers|events)['"]/u, 'runtime module import'],
  [/import\(\s*['"](?:node:)?(?:fs|fs\/promises|child_process|process|http|https|net|tls|dgram|dns|worker_threads|cluster|timers|events)['"]\s*\)/u, 'dynamic runtime module import'],
  [/require\(\s*['"](?:node:)?(?:fs|fs\/promises|child_process|process|http|https|net|tls|dgram|dns|worker_threads|cluster|timers|events)['"]\s*\)/u, 'runtime module require'],
]);

const forbiddenRuntimeBehaviorPatterns = Object.freeze([
  [/\bprocess\s*\.\s*env\b/u, 'process.env read'],
  [/\bfetch\s*\(/u, 'fetch call'],
  [/\b(?:axios|undici|got|request)\b/iu, 'network client dependency'],
  [/\b(?:WebSocket|EventSource)\b/u, 'network event source'],
  [/\b(?:createServer|createConnection|connect)\s*\(/u, 'server or socket construction'],
  [/\.listen\s*\(/u, 'listener startup'],
  [/\b(?:addEventListener|onmessage|onerror|onopen)\s*=/u, 'listener callback assignment'],
  [/\b(?:setTimeout|setInterval|setImmediate|queueMicrotask)\s*\(/u, 'timer or async worker scheduling'],
  [/\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk|SDK)\b/u, 'runtime client construction'],
  [/\b(?:spawn|exec|execFile|fork)\s*\(/u, 'child process execution'],
  [/\b(?:readFile|readFileSync|writeFile|writeFileSync|appendFile|appendFileSync|mkdir|rm|unlink|rename)\s*\(/u, 'filesystem operation'],
  [/\b(?:dotenv|secretManager|loadSecret|resolveSecret|credentialLoader|loadConfig|readConfig)\b/iu, 'credential, secret, or config loading'],
]);

const forbiddenDomainMutationPatterns = Object.freeze([
  [/\b(?:Command|Event|Domain|Lifeos|Oca|Capability)(?:Handler|Executor)\b/u, 'handler or executor class/type'],
  [/\b(?:handle|execute|run|dispatch)(?:Domain|Lifeos|Command|Event|Oca|Capability)\b/u, 'domain or capability execution function'],
  [/\b(?:mutate|persist|commit|save|write|delete|apply)(?:Domain|Lifeos|Product|State|Projection|Event|Command|Mutation)\b/u, 'domain product mutation function'],
  [/\b(?:insert|update|delete|upsert)\s+into\b/iu, 'database mutation statement'],
  [/\b(?:stateStore|productStore|domainStore|database|transaction|repository)\b/u, 'stateful product storage dependency'],
]);

const forbiddenFanInPatterns = Object.freeze([
  [/from\s+['"](?:\.\.\/)+(?:index|dist\/index)\.js['"]/u, 'package-root fan-in import'],
  [/from\s+['"]@hazeteam\/domain-lifeos(?:\/|['"])/u, 'self package-root import'],
  [/from\s+['"][^'"]*packages\/domain-lifeos\/src\/index(?:\.ts|\.js)?['"]/u, 'domain-lifeos package root source import'],
]);

const forbiddenRawPassthroughPatterns = Object.freeze([
  [/\braw(?:Provider|Callback|Oca|OCA|Tool|Runtime|Payload|Output|Log|Diff|Secret|Token|Credential)\b/u, 'raw runtime/provider field'],
  [/\b(?:providerPayload|runtimePayload|toolPayload|ocaPayload|callbackData|callbackPayload)\b/u, 'raw payload passthrough field'],
  [/\b(?:providerObject|providerRequest|providerResponse|runtimeObject|toolResult|toolCall|ocaResult|ocaOutput)\b/u, 'raw provider/runtime object passthrough'],
  [/\b(?:stdout|stderr|stackTrace|rawOutput|commandOutput|rawLog|rawDiff)\b/u, 'raw output, stack, or stream leak'],
  [/\b(?:token|secret|credentialValue|secretValue|tokenValue|apiKey|endpoint|filePath|repoPath|workspacePath|clientHandle|sdkClient|processId)\b/u, 'secret/config/path/client diagnostic field'],
]);

const forbiddenExecutionPermissionPatterns = Object.freeze([
  [/\b(?:executionPermission|permissionToExecute|authorizedToExecute|canExecute|mayExecute|executeAllowed|executionAllowed)\b/u, 'execution permission claim'],
  [/\b(?:execute|run|start|resume|continue|cancel|submit)(?:Oca|OCA|Runtime|Capability|Tool|Session|Sidecar)\b/u, 'OCA or runtime execution function'],
  [/\b(?:approvedForExecution|approvalBypassed|preApprovedExecution|permissionGrantedForExecution)\b/u, 'approval-as-execution shortcut'],
]);

test('W29D2 fake/inert LifeOS boundary imports only W29B contract types', () => {
  const source = readFakeInertLifeosDomainBoundarySource();
  const contractSource = readLifeosDomainContractSource();

  assertSourceIncludesAll(
    contractSource,
    [
      'export interface LifeosDomainEventDescriptor',
      'export interface LifeosDomainCommandDescriptor',
      'export interface LifeosDomainToOcaDeclaration',
      'export interface LifeosRedactedPublicDomainProjection',
      'export interface LifeosDomainBoundaryInvariantDescriptor',
    ],
    'LifeOS domain contract source',
  );

  assert.equal(importDeclarations(source).length, 1, 'fake inert LifeOS domain boundary should keep a single import declaration');
  assert.match(source, /^import\s+type\s+\{[\s\S]+?\}\s+from\s+['"]\.\/lifeos-domain-contract\.js['"];$/mu);
  assert.doesNotMatch(source, /^import\s+(?!type\b)/mu, 'fake inert LifeOS domain boundary should not import runtime values');
});

test('W29D2 fake/inert LifeOS boundary has no provider, OCA runtime, network, process, filesystem, secret, or listener behavior', () => {
  const source = readFakeInertLifeosDomainBoundarySource();

  assertSourceDoesNotMatchAny(source, forbiddenProviderAndRuntimeImports, 'fake inert LifeOS domain boundary source');
  assertSourceDoesNotMatchAny(source, forbiddenRuntimeBehaviorPatterns, 'fake inert LifeOS domain boundary source');
  assertSourceDoesNotMatchAny(source, forbiddenFanInPatterns, 'fake inert LifeOS domain boundary source');
});

test('W29D2 fake/inert LifeOS boundary stays descriptor-only and explicitly below production readiness', () => {
  const source = readFakeInertLifeosDomainBoundarySource();

  assertSourceIncludesAll(source, expectedDescriptorPostureTerms, 'fake inert LifeOS domain boundary source');
  assertSourceIncludesAll(source, expectedDescriptorBoundaryTerms, 'fake inert LifeOS domain boundary source');
  assert.doesNotMatch(source.replaceAll('productionReady: false', ''), /\bproductionReady\s*:\s*true\b/u, 'fake inert LifeOS domain boundary must not claim production readiness');
});

test('W29D2 fake/inert LifeOS commands and events remain descriptors, projections, and declarations rather than handlers or mutations', () => {
  const source = readFakeInertLifeosDomainBoundarySource();

  assertSourceIncludesAll(
    source,
    [
      'describeDomainEvent',
      'describeDomainCommand',
      'describePolicyRequirement',
      'describeApprovalRequirement',
      'describeBoundaryInvariant',
      'describeSafeAttachment',
      'projectPublicly',
    ],
    'fake inert LifeOS domain boundary descriptor vocabulary',
  );
  assertSourceDoesNotMatchAny(source, forbiddenDomainMutationPatterns, 'fake inert LifeOS domain boundary source');
});

test('W29D2 fake/inert LifeOS domain-to-OCA declarations are not execution permission', () => {
  const source = readFakeInertLifeosDomainBoundarySource();

  assertSourceIncludesAll(source, expectedDomainToOcaDeclarationTerms, 'fake inert LifeOS domain-to-OCA declaration vocabulary');
  assertSourceDoesNotMatchAny(source, forbiddenExecutionPermissionPatterns, 'fake inert LifeOS domain boundary source');
});

test('W29D2 fake/inert LifeOS public projection rejects unsafe raw payload, output, secret, path, client, and diagnostic material', () => {
  const source = readFakeInertLifeosDomainBoundarySource();

  assertSourceIncludesAll(source, expectedUnsafeTextQuarantineTerms, 'fake inert LifeOS no-leak quarantine vocabulary');
  assertSourceDoesNotMatchAny(source, forbiddenRawPassthroughPatterns, 'fake inert LifeOS domain boundary source');
  assertSourceDoesNotIncludeAny(
    source,
    [
      'safeDiagnostics',
      'diagnostics',
      'debugInfo',
      'providerDiagnostics',
      'runtimeDiagnostics',
      'rawExample',
      'rawFixture',
      'rawSample',
    ],
    'fake inert LifeOS domain boundary source',
  );
});
