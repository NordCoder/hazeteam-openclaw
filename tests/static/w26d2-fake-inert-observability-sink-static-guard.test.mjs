import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const W26C_FAKE_INERT_SOURCE = Object.freeze([
  'packages',
  'openclaw-adapter',
  'src',
  'observability-correlation',
  'fake-inert-observability-sink.ts',
]);

const REQUIRED_FAKE_INERT_VOCABULARY = Object.freeze([
  'FakeInertObservabilitySink',
  'FakeInertObservabilityCorrelationPort',
  'createFakeInertObservabilitySink',
  'createFakeInertObservabilityCorrelationPort',
  'fake-inert-direct-call-only',
  'redacted-json-safe',
  'not-implemented',
  'not-production-ready',
  'runtimeOnlyValuesSerializable: false',
  'telemetryBehavior',
  'networkBehavior',
  'providerAcknowledgementImpliesBusinessSuccess: false',
  'provider-acknowledgement-only',
  'business-success-missing',
  'ready-to-attempt-not-pass',
  'ready-to-run-not-pass',
  'unsafe-public-output-blocked',
]);

const FORBIDDEN_IMPORT_MODULE_PATTERNS = Object.freeze([
  ['filesystem/process module', /^(?:node:)?(?:fs|fs\/promises|path|child_process|process)$/u],
  ['network module', /^(?:node:)?(?:http|https|net|tls|dgram|dns)$/u],
  ['fetch client module', /^(?:axios|undici)(?:\/.*)?$/u],
  ['OpenTelemetry module', /^@opentelemetry\//u],
  ['logging module', /^(?:pino|winston|bunyan|consola|log4js)(?:\/.*)?$/u],
  ['metrics or exporter module', /^(?:prom-client|dd-trace|@sentry\/node)(?:\/.*)?$/u],
  ['provider SDK or client module', /(?:provider|sdk|client|telegram|openclaw)/iu],
]);

const FORBIDDEN_RUNTIME_USE_PATTERNS = Object.freeze([
  ['filesystem access', /\b(?:readFile|writeFile|appendFile|mkdir|rm|unlink|readdir|stat|createReadStream|createWriteStream)\s*\(/u],
  ['filesystem namespace access', /\bfs\s*\./u],
  ['path namespace access', /\bpath\s*\./u],
  ['child process execution', /\b(?:exec|execFile|spawn|fork)\s*\(/u],
  ['network fetch', /\bfetch\s*\(/u],
  ['axios usage', /\baxios\s*\./u],
  ['undici usage', /\bundici\b/u],
  ['http server or request behavior', /\b(?:createServer|listen|request|get)\s*\(/u],
  ['socket construction', /\bnew\s+(?:Socket|Server|TLSSocket)\b/u],
  ['process env read', /\bprocess\s*(?:\.env|\[['"]env['"]\])/u],
  ['process cwd or argv read', /\bprocess\s*\.\s*(?:cwd|argv|pid|platform|versions)\b/u],
  ['console output', /\bconsole\s*\.\s*(?:debug|error|info|log|trace|warn)\s*\(/u],
  ['logger output', /\b(?:logger|log|metrics|meter|tracer)\s*\.\s*(?:debug|error|event|gauge|histogram|info|increment|log|record|span|trace|warn)\s*\(/iu],
  ['OpenTelemetry usage', /\b(?:opentelemetry|OpenTelemetry|trace\.getTracer|metrics\.getMeter|SpanStatusCode)\b/u],
  ['exporter construction', /\bnew\s+\w*(?:Exporter|MeterProvider|TracerProvider)\b/u],
  ['provider SDK or client construction', /\bnew\s+\w*(?:Provider|Client|SDK|Sdk)\b/u],
  ['provider SDK or client factory', /\b(?:create|make|build)\w*(?:Provider|Client|SDK|Sdk)\s*\(/u],
]);

const PUBLIC_FAKE_OUTPUT_INTERFACES = Object.freeze([
  'FakeInertObservabilitySinkRecordResult',
  'FakeInertObservabilitySinkSnapshot',
  'FakeInertObservabilitySink',
]);

const FORBIDDEN_PUBLIC_OUTPUT_FIELD_FRAGMENTS = Object.freeze([
  'raw',
  'payload',
  'rawPayload',
  'providerPayload',
  'runtimePayload',
  'toolPayload',
  'auditPayload',
  'logPayload',
  'rawLog',
  'auditLog',
  'stack',
  'stackTrace',
  'stdout',
  'stderr',
  'token',
  'secret',
  'endpoint',
  'path',
  'client',
  'sdk',
  'handle',
]);

const REQUIRED_REDACTION_BARRIER_PATTERNS = Object.freeze([
  ['bounded public-ref syntax', /\^\[a-z\]\[a-z0-9-\]\*:\[a-z0-9\._:-\]\+\$/u],
  ['bounded public-ref length check', /\.length\s*<=\s*[A-Z_]*REF[A-Z_]*\b/u],
  ['bounded summary length check', /\.slice\(\s*0,\s*[A-Z_]*SUMMARY[A-Z_]*\s*\)/u],
  ['endpoint-like safe-ref detection', /ht'\s*\+\s*'tps\?\|w'\s*\+\s*'ss\?/u],
  ['token-like safe-ref detection', /'tok'\s*\+\s*'en'/u],
  ['secret-like safe-ref detection', /'sec'\s*\+\s*'ret'/u],
  ['credential-like safe-ref detection', /'cred'\s*\+\s*'ential'/u],
  ['password-like safe-ref detection', /'pass'\s*\+\s*'word'/u],
  ['stack-like safe-ref detection', /'st'\s*\+\s*'ack'/u],
  ['raw-like safe-ref detection', /'ra'\s*\+\s*'w'/u],
  ['payload-like safe-ref detection', /'pay'\s*\+\s*'load'/u],
  ['stderr-like safe-ref detection', /'std'\s*\+\s*'err'/u],
  ['stdout-like safe-ref detection', /'std'\s*\+\s*'out'/u],
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

function source() {
  return readUtf8(W26C_FAKE_INERT_SOURCE);
}

function assertIncludes(value, expected, label) {
  assert.equal(value.includes(expected), true, `${label} should include ${expected}`);
}

function assertDoesNotMatch(value, pattern, label) {
  assert.equal(pattern.test(value), false, `${label} should not match ${pattern}`);
}

function importedModules(value) {
  const modules = new Set();

  for (const match of value.matchAll(/^\s*import(?:\s+type)?[\s\S]*?\s+from\s+['"]([^'"]+)['"];?\s*$/gmu)) {
    modules.add(match[1]);
  }

  for (const match of value.matchAll(/^\s*import\s+['"]([^'"]+)['"];?\s*$/gmu)) {
    modules.add(match[1]);
  }

  return [...modules].sort();
}

function extractInterfaceBody(value, interfaceName) {
  const match = new RegExp(`export\\s+interface\\s+${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\}`, 'u').exec(value);
  assert.notEqual(match, null, `${interfaceName} should remain present in accepted W26C source`);
  return match[1];
}

function publicFieldNames(interfaceBody) {
  return [...interfaceBody.matchAll(/readonly\s+([A-Za-z_$][\w$]*)\??\s*:/gu)].map((match) => match[1]);
}

test('W26D2 guard inspects the accepted W26C fake/inert observability sink source', () => {
  assert.equal(
    asRepoRelative(W26C_FAKE_INERT_SOURCE),
    'packages/openclaw-adapter/src/observability-correlation/fake-inert-observability-sink.ts',
  );
  assert.equal(source().length > 0, true, 'accepted W26C fake/inert source should be readable');
});

test('W26C fake/inert source imports no runtime provider telemetry filesystem process or network modules', () => {
  for (const moduleName of importedModules(source())) {
    for (const [label, pattern] of FORBIDDEN_IMPORT_MODULE_PATTERNS) {
      assertDoesNotMatch(moduleName, pattern, `${label} import ${moduleName}`);
    }
  }

  assertDoesNotMatch(source(), /\b(?:import|require)\s*\(\s*['"](?:node:)?(?:fs|path|child_process|http|https|net|tls)['"]\s*\)/u, 'dynamic unsafe import');
  assertDoesNotMatch(source(), /\brequire\s*\(\s*['"](?:axios|undici|@opentelemetry\/[^'"]+|pino|winston|bunyan|prom-client)['"]\s*\)/u, 'unsafe require');
});

test('W26C fake/inert source has no filesystem process network logging metrics exporter server or provider-client behavior', () => {
  const acceptedSource = source();

  for (const [label, pattern] of FORBIDDEN_RUNTIME_USE_PATTERNS) {
    assertDoesNotMatch(acceptedSource, pattern, label);
  }
});

test('W26C fake/inert source avoids package-root side-effect wiring and runtime singleton initialization', () => {
  const acceptedSource = source();

  assertDoesNotMatch(acceptedSource, /from\s+['"](?:\.\.\/)*index\.js['"]/u, 'package root import');
  assertDoesNotMatch(acceptedSource, /\b(?:export\s+const|const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*createFakeInertObservabilitySink\s*\(/u, 'top-level sink instance');
  assertDoesNotMatch(acceptedSource, /\b(?:export\s+const|const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*createFakeInertObservabilityCorrelationPort\s*\(/u, 'top-level correlation port instance');
});

test('W26C fake/inert posture remains explicit without requiring singleton or default export names', () => {
  const acceptedSource = source();

  for (const expected of REQUIRED_FAKE_INERT_VOCABULARY) {
    assertIncludes(acceptedSource, expected, 'W26C fake/inert source');
  }
});

test('W26C public fake sink records and snapshots expose only safe redacted summary-oriented fields', () => {
  const acceptedSource = source();

  for (const interfaceName of PUBLIC_FAKE_OUTPUT_INTERFACES) {
    const fields = publicFieldNames(extractInterfaceBody(acceptedSource, interfaceName));

    assert.equal(fields.length > 0, true, `${interfaceName} should expose explicit public fields`);
    for (const field of fields) {
      for (const fragment of FORBIDDEN_PUBLIC_OUTPUT_FIELD_FRAGMENTS) {
        assert.equal(
          field.toLowerCase().includes(fragment.toLowerCase()),
          false,
          `${interfaceName}.${field} should not expose ${fragment}`,
        );
      }
    }
  }

  assertIncludes(acceptedSource, 'redactedSummary', 'public record result');
  assertIncludes(acceptedSource, 'summaries: readonly ObservabilityRedactedPublicSummary[]', 'public snapshot');
  assertIncludes(acceptedSource, 'listRedactedSummaries', 'public sink API');
  assertIncludes(acceptedSource, 'safeSummary', 'redacted public summaries');
  assertIncludes(acceptedSource, 'jsonSafe: true', 'public output posture');
  assertIncludes(acceptedSource, 'runtimeOnlyValuesSerializable: false', 'public output posture');
});

test('W26C source keeps raw provider runtime tool audit and log payload vocabulary out of public fake outputs', () => {
  const acceptedSource = source();
  const publicSurface = PUBLIC_FAKE_OUTPUT_INTERFACES.map((interfaceName) =>
    extractInterfaceBody(acceptedSource, interfaceName),
  ).join('\n');

  for (const unsafeName of [
    'rawPayload',
    'providerPayload',
    'runtimePayload',
    'toolPayload',
    'auditPayload',
    'logPayload',
    'rawProviderPayload',
    'rawRuntimeOutput',
    'rawToolOutput',
    'auditLog',
    'eventLog',
    'persistedRaw',
    'rawRecord',
  ]) {
    assert.equal(publicSurface.includes(unsafeName), false, `public fake outputs should not expose ${unsafeName}`);
  }
});

test('W26C source keeps public safe-ref and summary redaction barriers active without private helper-name coupling', () => {
  const acceptedSource = source();

  assertIncludes(acceptedSource, 'traceDumpSerializable: false', 'trace dump barrier');
  assertIncludes(acceptedSource, "publicProjection: 'redacted-json-safe'", 'redacted public projection barrier');
  assertIncludes(acceptedSource, 'reason:unsafe-public-output-blocked', 'unsafe public output fallback barrier');

  for (const [label, pattern] of REQUIRED_REDACTION_BARRIER_PATTERNS) {
    assert.match(acceptedSource, pattern, `${label} should remain present in accepted W26C source`);
  }
});
