import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const implementationPath = repoPath('packages', 'openclaw-adapter', 'src', 'provider-client', 'fake-inert-provider-client-port.ts');
const contractPath = repoPath('packages', 'openclaw-adapter', 'src', 'provider-client', 'provider-client-contract.ts');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

const implementationSource = readFileSync(implementationPath, 'utf8');
const contractSource = readFileSync(contractPath, 'utf8');

function assertIncludesAll(source, expected, label) {
  for (const value of expected) {
    assert.equal(source.includes(value), true, `${label} should include ${value}`);
  }
}

function assertNoMatch(source, pattern, label) {
  assert.doesNotMatch(source, pattern, label);
}

function joinTerm(...parts) {
  return parts.join('');
}

function sourceWithoutAllowedNonClaims(source) {
  return source
    .replaceAll('not-production-ready', '')
    .replaceAll('productionReady: false', '')
    .replaceAll('Production readiness', '')
    .replaceAll('production readiness', '');
}

function assertNoRuntimeImportOrCall(source, forbidden) {
  for (const [label, pattern] of forbidden) {
    assertNoMatch(source, pattern, `W23C must not include ${label}`);
  }
}

function functionBody(source, functionName) {
  const startPattern = new RegExp(`function\\s+${functionName}\\s*\\(`, 'u');
  const startMatch = startPattern.exec(source);
  assert.notEqual(startMatch, null, `${functionName} should exist`);

  const bodyStart = source.indexOf('{', startMatch.index);
  assert.notEqual(bodyStart, -1, `${functionName} should have a body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart, index + 1);
      }
    }
  }

  assert.fail(`${functionName} body should be balanced`);
}

function publicConstructionSources(source) {
  return [
    functionBody(source, 'describeBoundary'),
    functionBody(source, 'evaluateReadiness'),
    functionBody(source, 'attemptFake'),
    functionBody(source, 'projectError'),
    functionBody(source, 'stateMetadata'),
  ].join('\n');
}

test('W23D2 fake/inert provider client port exposes the local fake boundary surface only', () => {
  assertIncludesAll(
    implementationSource,
    [
      'export function createFakeInertProviderClientPort',
      'export interface FakeInertProviderClientPort',
      'describeBoundary:',
      'evaluateReadiness:',
      'attemptFake:',
      'projectFakeError:',
      'describeFakeInertProviderClientBoundary',
      'evaluateFakeInertProviderReadiness',
      'attemptFakeInertProviderRequest',
      'projectFakeInertProviderError',
    ],
    'W23C fake/inert provider client port',
  );
});

test('W23D2 fake/inert provider client port preserves explicit fake states and below-pass posture', () => {
  assertIncludesAll(
    implementationSource,
    [
      'absent',
      'fake-or-inert',
      'blocked',
      'skipped',
      'ready-to-attempt',
      'ready-to-run',
      'acknowledged',
      'acknowledgement-only',
      'failed-safe',
      'unsafe-output',
      'missing-credential',
      'closed-network-gate',
      'missing-provider-port',
      'not-production-ready',
      'redacted',
      'isFakeInertProviderProjectionJsonSafe',
      "state === 'ready-to-attempt' || state === 'ready-to-run'",
      "'fake-inert-provider-' + state + '-not-pass'",
    ],
    'W23C fake/inert state vocabulary',
  );
});

test('W23D2 fake/inert provider client port keeps provider acknowledgement separate from business lifecycle', () => {
  assertIncludesAll(
    contractSource,
    [
      'Provider acknowledgement is not business success',
      'Acknowledgement-only evidence is not real-provider success',
      'ProviderAcknowledgementClass',
      'ProviderBusinessLifecycleClass',
    ],
    'W23B provider client contract',
  );

  assertIncludesAll(
    implementationSource,
    [
      'acknowledgementClass: acknowledgementForReadiness(state)',
      'businessLifecycleClass: businessForReadiness(state)',
      'acknowledgementClass: acknowledgementForProjection(state)',
      'businessLifecycleClass: businessForProjection(state)',
      'Provider acknowledgement-only evidence remains below pass and is not business success.',
      'Fake/inert provider acknowledgement remains separate from business lifecycle.',
      'fake-inert-provider-acknowledged-not-business-success',
      'fake-inert-provider-acknowledgement-only-not-pass',
    ],
    'W23C acknowledgement/business separation',
  );

  assertNoMatch(
    implementationSource,
    /providerAcknowledgementImpliesBusinessSuccess\s*:\s*true/u,
    'W23C must not claim provider acknowledgement implies business success',
  );
});

test('W23D2 fake/inert provider client port uses type-only contract imports and no runtime/provider imports', () => {
  assert.match(
    implementationSource,
    /^import\s+type\s+\{[\s\S]*?\}\s+from\s+['"]\.\/provider-client-contract\.js['"];\n/u,
    'W23C should import provider client contract symbols with a type-only import',
  );

  const importStatements = implementationSource.match(/^import\s[\s\S]*?;$/gmu) ?? [];
  assert.deepEqual(importStatements, [implementationSource.match(/^import\s+type\s+\{[\s\S]*?\}\s+from\s+['"]\.\/provider-client-contract\.js['"];$/mu)?.[0]]);

  assertNoRuntimeImportOrCall(implementationSource, [
    ['environment reads', new RegExp('process\\s*\\.\\s*' + 'env', 'u')],
    ['local file module imports', /from\s+['"]node:fs['"]|from\s+['"]fs\/promises['"]|import\(\s*['"](?:node:fs|fs\/promises)['"]\s*\)/u],
    ['child process imports', /from\s+['"](?:node:)?child_process['"]|import\(\s*['"](?:node:)?child_process['"]\s*\)/u],
    ['network module imports', /from\s+['"](?:node:)?(?:http|https|net|tls)['"]|import\(\s*['"](?:node:)?(?:http|https|net|tls)['"]\s*\)/u],
    ['fetch calls', /\bfetch\s*\(/u],
    ['axios imports or usage', new RegExp('from\\s+[\'\"]ax' + 'ios[\'\"]|\\bax' + 'ios\\s*\\(', 'u')],
    ['undici imports', new RegExp('from\\s+[\'\"]un' + 'dici[\'\"]', 'u')],
    ['Telegram SDK imports', /from\s+['"](?:telegraf|node-telegram-bot-api|grammy)['"]|\b(?:Telegraf|TelegramBot)\b/u],
    ['OpenClaw client imports', /from\s+['"][^'"]*openclaw[^'"]*(?:client|sdk)[^'"]*['"]|\bOpenClaw\w*Client\b/u],
    ['provider SDK imports', /from\s+['"](?:@openclaw\/|openai|@openai\/|@anthropic\/|@modelcontextprotocol\/|grammy|telegraf|node-telegram-bot-api)['"]/iu],
    ['dotenv imports', new RegExp('from\\s+[\'\"]dot' + 'env[\'\"]|\\bdot' + 'env\\b', 'u')],
    ['managed secret imports', new RegExp('sec' + 'ret[-_ ]?manager|Sec' + 'retManager', 'u')],
    ['timers', /\bset(?:Timeout|Interval)\s*\(/u],
    ['worker construction', /\bnew\s+Worker\s*\(|from\s+['"](?:node:)?worker_threads['"]/u],
    ['webhook runtime behavior', /\b(?:createWebhook|startWebhook|webhookServer|webhookHandler)\b|\.webhook\s*\(/iu],
    ['polling loop runtime behavior', /\b(?:startPolling|pollingLoop|pollForever)\b|while\s*\(\s*true\s*\)/iu],
  ]);
});

test('W23D2 fake/inert provider client port public constructions avoid raw sensitive output fields', () => {
  const publicSource = publicConstructionSources(implementationSource);
  const unsafePublicOutputFields = [
    ['raw', 'Provider', 'Payload'],
    ['raw', 'Callback', 'Payload'],
    ['raw', 'Telegram', 'Payload'],
    ['raw', 'Runtime', 'Payload'],
    ['token', 'Value'],
    ['api', 'Key'],
    ['endpoint', 'Value'],
    ['file', 'Path'],
    ['env', 'Value'],
    ['stack', 'Trace'],
    ['std', 'out'],
    ['std', 'err'],
    ['sdk', 'Client'],
    ['provider', 'Client'],
  ].map((parts) => joinTerm(...parts));

  for (const unsafeField of unsafePublicOutputFields) {
    assertNoMatch(
      publicSource,
      new RegExp(`\\b${unsafeField}\\b`, 'u'),
      `W23C public output construction must not expose ${unsafeField}`,
    );
  }

  assertIncludesAll(
    publicSource,
    ['redactedMetadata', 'unsafeOutputDetected', 'safeMessage', 'safeSummary'],
    'W23C safe public output construction',
  );
});

test('W23D2 fake/inert provider client port avoids real-provider and production readiness claims', () => {
  const claimSource = sourceWithoutAllowedNonClaims(implementationSource);

  for (const forbiddenClaim of [
    /\bproduction-ready\b/iu,
    /\bproduction ready\b/iu,
    /\bready for production\b/iu,
    /\breal-provider pass\b/iu,
    /\breal provider success\b/iu,
    /\blive provider connected\b/iu,
  ]) {
    assertNoMatch(claimSource, forbiddenClaim, 'W23C must not claim production or real-provider readiness');
  }
});
