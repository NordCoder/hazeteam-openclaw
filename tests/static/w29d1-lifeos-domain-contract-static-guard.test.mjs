import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contractPath = ['packages', 'domain-lifeos', 'src', 'domain-boundary', 'lifeos-domain-contract.ts'];
const contractSource = readUtf8(...contractPath);
const contractCode = stripComments(contractSource);

const unsafePublicTerms = Object.freeze([
  'rawProvider',
  'providerPayload',
  'callbackData',
  'token',
  'secret',
  'endpoint',
  'path',
  'stack',
  'log',
  'stdout',
  'stderr',
  'rawOca',
  'diff',
  'commandOutput',
  'rawOutput',
  'rawPayload',
  'client',
  'sdkClient',
  'runtimeHandle',
  'runtimeHandles',
]);

const providerSdkSpecifierPatterns = Object.freeze([
  /^(?:@openai|openai|@anthropic|anthropic|@modelcontextprotocol|codex|@codex)(?:\/|$)/iu,
  /^(?:telegraf|grammy|node-telegram-bot-api|telegram|@mtproto|mtproto)(?:\/|$)/iu,
  /^(?:@openclaw|openclaw)(?:\/|$)/iu,
]);

const networkSpecifierPattern = /^(?:node:)?(?:http|https|http2|net|tls|dgram|dns)(?:\/|$)|^(?:ws|websocket|eventsource|undici|axios|got|node-fetch)(?:\/|$)/iu;
const filesystemOrProcessSpecifierPattern = /^(?:node:)?(?:fs|fs\/promises|child_process)(?:\/|$)/iu;
const ocaRuntimeOrClientSpecifierPattern = /(?:^|\/)(?:oca-wrapper|oca-sidecar|oca-runtime|oca-client|sidecar-runtime|runtime-client)(?:\/|$)/iu;

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readUtf8(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|[^:])\/\/.*$/gmu, '$1');
}

function extractImportSpecifiers(source) {
  const specifiers = [];
  const importPatterns = [
    /\bimport\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gu,
    /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/gu,
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

function assertIncludes(source, expected, label) {
  assert.equal(source.includes(expected), true, `${label} should include ${expected}`);
}

function extractInterfaceBlock(source, interfaceName) {
  const pattern = new RegExp(`\\bexport\\s+interface\\s+${escapeRegExp(interfaceName)}\\s*\\{[\\s\\S]*?\\n\\}`, 'u');
  const match = pattern.exec(source);
  assert.notEqual(match, null, `${interfaceName} should be declared as an exported interface`);
  return match[0];
}

function extractTypeDeclaration(source, typeName) {
  const pattern = new RegExp(`\\bexport\\s+type\\s+${escapeRegExp(typeName)}\\s*=[\\s\\S]*?;`, 'u');
  const match = pattern.exec(source);
  assert.notEqual(match, null, `${typeName} should be declared as an exported type`);
  return match[0];
}

function stringLiteralValues(typeDeclaration) {
  return [...typeDeclaration.matchAll(/'([^']+)'/gu)].map((match) => match[1]);
}

function readonlyFieldNames(interfaceBlock) {
  return [...interfaceBlock.matchAll(/\breadonly\s+([A-Za-z_$][\w$]*)\??\s*:/gu)].map((match) => match[1]);
}

function exactTermPattern(term) {
  return new RegExp(`(?<![A-Za-z0-9_$])${escapeRegExp(term)}(?![A-Za-z0-9_$])`, 'u');
}

function contextAroundLine(lines, index) {
  return [lines[index - 1] ?? '', lines[index], lines[index + 1] ?? ''].join('\n');
}

function isExplicitSafeNegativeContext(context, term) {
  const exactTerm = exactTermPattern(term);
  const safeNegative = /\b(?:no|not|never|without|redacted|redact|safe|non-leak|no-leak|bounded|must not|does not|do not|not expose|containment|quarantine|forbidden|blocked)\b/iu;
  return exactTerm.test(context) && safeNegative.test(context);
}

function assertNoUnsafePublicTermUsage(source) {
  const lines = source.split(/\r?\n/u);

  for (const term of unsafePublicTerms) {
    const termPattern = exactTermPattern(term);
    const unsafeLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => termPattern.test(line))
      .filter(({ index }) => !isExplicitSafeNegativeContext(contextAroundLine(lines, index), term));

    assert.deepEqual(
      unsafeLines,
      [],
      `LifeOS domain contract source must not expose unsafe public term ${term} unless the exact term appears only in an explicit safe negative/non-leak assertion`,
    );
  }
}

function assertNoUnsafeFieldNames(interfaceName, extraUnsafeNames = []) {
  const block = extractInterfaceBlock(contractCode, interfaceName);
  const unsafeFieldNames = new Set([...unsafePublicTerms, ...extraUnsafeNames]);
  const fields = readonlyFieldNames(block).filter((fieldName) => unsafeFieldNames.has(fieldName));
  assert.deepEqual(fields, [], `${interfaceName} must not expose unsafe public fields`);
}

function assertNoMethodLikeMembers(interfaceName) {
  const block = extractInterfaceBlock(contractCode, interfaceName);
  assert.doesNotMatch(block, /\breadonly\s+[A-Za-z_$][\w$]*\??\s*\([^)]*\)\s*:/u, `${interfaceName} must not expose methods`);
  assert.doesNotMatch(block, /=>|\bPromise\s*</u, `${interfaceName} must not expose executable function or async handler shapes`);
}

test('W29D1 LifeOS domain contract source has no runtime, provider, OCA client, network, process, filesystem, or package-root side effects', () => {
  const specifiers = extractImportSpecifiers(contractCode);
  assert.deepEqual(specifiers, [], 'W29B accepted contract source should remain import-free descriptor vocabulary');

  for (const specifier of specifiers) {
    assert.equal(
      providerSdkSpecifierPatterns.some((pattern) => pattern.test(specifier)),
      false,
      `LifeOS domain contract must not import provider SDK specifier ${specifier}`,
    );
    assert.equal(networkSpecifierPattern.test(specifier), false, `LifeOS domain contract must not import network specifier ${specifier}`);
    assert.equal(filesystemOrProcessSpecifierPattern.test(specifier), false, `LifeOS domain contract must not import filesystem/process specifier ${specifier}`);
    assert.equal(ocaRuntimeOrClientSpecifierPattern.test(specifier), false, `LifeOS domain contract must not import OCA runtime/client specifier ${specifier}`);
  }

  const forbiddenRuntimeUsePatterns = [
    /\bprocess\s*\.\s*env\b/u,
    /\bimport\s*\.\s*meta\s*\.\s*env\b/u,
    /\bfetch\s*\(/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\b/u,
    /\bEventSource\b/u,
    /\bcreateServer\s*\(/u,
    /\.listen\s*\(/u,
    /\b(?:http|https|net|tls|child_process)\b/u,
    /\b(?:exec|execFile|spawn|fork)\s*\(/u,
    /\b(?:readFile|readFileSync|writeFile|writeFileSync|readdir|stat)\s*\(/u,
    /\b(?:load|read|get|resolve)[A-Za-z0-9_$]*(?:Secret|Credential|Credentials|Config|Environment|Env)\b/u,
    /\bnew\s+[A-Za-z0-9_$]*(?:Client|Sdk|SDK|Runtime|Sidecar|Handler)\b/u,
    /\b(?:register|start|run|execute|invoke|handle|listen|serve)[A-Za-z0-9_$]*(?:Handler|Listener|Server|Worker|Runtime|Client)?\s*\(/u,
    /\b(?:const|let|var|function|class)\b/u,
  ];

  for (const pattern of forbiddenRuntimeUsePatterns) {
    assert.doesNotMatch(contractCode, pattern, `LifeOS domain contract must stay type-only and side-effect-free: ${pattern}`);
  }
});

test('W29D1 LifeOS domain public contract vocabulary remains JSON-safe and no-leak', () => {
  assertIncludes(contractSource, 'LifeosSafeInputShapeDescriptor', 'LifeOS contract');
  assertIncludes(contractSource, 'allowsFunctions: false', 'safe input shape');
  assertIncludes(contractSource, 'allowsClasses: false', 'safe input shape');
  assertIncludes(contractSource, 'allowsSymbols: false', 'safe input shape');
  assertIncludes(contractSource, 'allowsNonJsonValues: false', 'safe input shape');
  assertIncludes(contractSource, 'LifeosRedactedPublicDomainProjection', 'LifeOS contract');
  assertIncludes(contractSource, 'redacted-json-safe', 'redaction status vocabulary');
  assertIncludes(contractSource, 'safe-ref-only', 'redaction status vocabulary');
  assertIncludes(contractSource, 'bounded-summary-only', 'redaction status vocabulary');

  assertNoUnsafePublicTermUsage(contractSource);
  for (const interfaceName of [
    'LifeosSafeFieldDescriptor',
    'LifeosSafeInputShapeDescriptor',
    'LifeosIdempotencyStrategyDescriptor',
    'LifeosSafeAttachmentDescriptor',
    'LifeosDomainEventDescriptor',
    'LifeosPolicyRequirementDescriptor',
    'LifeosApprovalRequirement',
    'LifeosDomainToOcaDeclaration',
    'LifeosDomainCommandDescriptor',
    'LifeosDomainBoundaryInvariantDescriptor',
    'LifeosRedactedPublicDomainProjection',
  ]) {
    assertNoUnsafeFieldNames(interfaceName, ['rawRuntime', 'rawTool', 'runtimeValue', 'runtimeValues']);
  }
});

test('W29D1 LifeOS command descriptors remain descriptors and never handlers or product mutation behavior', () => {
  const commandBlock = extractInterfaceBlock(contractCode, 'LifeosDomainCommandDescriptor');
  assertIncludes(commandBlock, "readonly descriptorKind: 'lifeos-domain-command-descriptor';", 'domain command descriptor');
  assertIncludes(commandBlock, "readonly contractBoundary: 'descriptor-only-not-handler';", 'domain command descriptor');
  assertNoMethodLikeMembers('LifeosDomainCommandDescriptor');

  const commandFields = readonlyFieldNames(commandBlock);
  for (const fieldName of commandFields) {
    assert.doesNotMatch(
      fieldName,
      /(?:handler|executor|runner|callback|listener|server|client|sdk|mutate|mutation|write|delete|execute|invoke|perform)/iu,
      `domain command descriptor field ${fieldName} must remain declarative`,
    );
  }

  assert.doesNotMatch(commandBlock, /\b(?:handler|execute|invoke|perform|mutate|write|delete|persist|save|dispatch|emit)\b/iu, 'domain command descriptor must not contain handler or product mutation vocabulary');
});

test('W29D1 LifeOS domain-to-OCA contract remains declaration-only and not OCA execution permission', () => {
  const declarationBlock = extractInterfaceBlock(contractCode, 'LifeosDomainToOcaDeclaration');
  assertIncludes(declarationBlock, "readonly declarationKind: 'lifeos-domain-to-oca-declaration';", 'domain-to-OCA declaration');
  assertIncludes(declarationBlock, "readonly ocaBoundary: 'domain-to-oca-declaration-not-oca-execution';", 'domain-to-OCA declaration');
  assertNoMethodLikeMembers('LifeosDomainToOcaDeclaration');

  assert.doesNotMatch(
    declarationBlock,
    /\b(?:execute|executionPermission|runtimeAttempt|runtimeClient|ocaClient|sidecarClient|sdkClient|client|handler|invoke|run|dispatch|perform)\b/iu,
    'domain-to-OCA declarations must not become OCA execution permission or runtime attempts',
  );
});

test('W29D1 LifeOS production readiness, provider acknowledgement, business success, and attempt gates remain bounded', () => {
  const postureValues = stringLiteralValues(extractTypeDeclaration(contractCode, 'LifeosDomainContractPosture'));
  assert.ok(postureValues.includes('not-production-ready'), 'contract posture should include an explicit not-production-ready value');
  assert.equal(postureValues.includes('production-ready'), false, 'contract posture must not claim production readiness');

  const productionReadyFields = [...contractCode.matchAll(/\breadonly\s+productionReady\??\s*:\s*(true|false)\s*;/gu)].map((match) => match[1]);
  assert.ok(productionReadyFields.length >= 1, 'productionReady fields should be explicit when represented');
  assert.deepEqual(new Set(productionReadyFields), new Set(['false']), 'productionReady fields must remain false');
  assert.doesNotMatch(contractCode, /\bproductionReady\s*:\s*true\b/u, 'LifeOS domain contract must not claim productionReady true');
  assertIncludes(contractCode, "readonly fakeOrInertBoundaryPosture: 'below-production-readiness';", 'domain boundary invariant');

  const providerBoundaryValues = stringLiteralValues(extractTypeDeclaration(contractCode, 'LifeosProviderAcknowledgementBoundary'));
  assert.ok(providerBoundaryValues.includes('acknowledgement-only-not-business-success'), 'provider acknowledgement must remain separate from business success');
  assert.ok(providerBoundaryValues.includes('business-success-requires-separate-evidence'), 'business success must require separate evidence');
  assert.equal(providerBoundaryValues.includes('acknowledgement-is-business-success'), false, 'provider acknowledgement must not imply business success');

  const attemptGateValues = stringLiteralValues(extractTypeDeclaration(contractCode, 'LifeosAttemptGateState'));
  assert.ok(attemptGateValues.includes('ready-to-attempt-not-pass'), 'attempt readiness must remain not-pass');
  assert.ok(attemptGateValues.includes('ready-to-run-not-pass'), 'run readiness must remain not-pass');
  for (const gateValue of attemptGateValues) {
    assert.equal(/(?:^|-)pass$/u.test(gateValue) && !/-not-pass$/u.test(gateValue), false, `${gateValue} must not treat gate state as execution pass`);
  }
});
