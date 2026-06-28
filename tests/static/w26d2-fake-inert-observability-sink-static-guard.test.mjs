import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const REQUIRED_W26C_SOURCE = Object.freeze([
  ['packages', 'openclaw-adapter', 'src', 'observability-correlation', 'fake-inert-observability-sink.ts'],
]);

const OPTIONAL_W26C_SOURCE = Object.freeze([
  ['packages', 'openclaw-adapter', 'src', 'observability-correlation', 'correlation-port.ts'],
]);

const FORBIDDEN_IMPORT_MODULE_PATTERNS = Object.freeze([
  ['filesystem module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"](?:node:)?fs(?:\/promises)?['"]/u],
  ['path module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"](?:node:)?path['"]/u],
  ['child process module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"](?:node:)?child_process['"]/u],
  ['http module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"](?:node:)?http['"]/u],
  ['https module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"](?:node:)?https['"]/u],
  ['net module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"](?:node:)?net['"]/u],
  ['tls module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"](?:node:)?tls['"]/u],
  ['axios module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"]axios(?:\/[^'"]*)?['"]/u],
  ['undici module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"]undici(?:\/[^'"]*)?['"]/u],
  ['OpenTelemetry module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"]@opentelemetry\//u],
  ['logging module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"](?:pino|winston|bunyan|consola|log4js)(?:\/[^'"]*)?['"]/u],
  ['metrics or exporter module', /(?:^|\n)\s*import\s+(?:[^'";]+\s+from\s+)?['"](?:prom-client|dd-trace|@sentry\/node)(?:\/[^'"]*)?['"]/u],
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

function repoPath(segments) {
  return path.join(repoRoot, ...segments);
}

function asRepoRelative(segments) {
  return segments.join('/');
}

function readUtf8(segments) {
  return readFileSync(repoPath(segments), 'utf8');
}

function sourceFiles() {
  const optionalSources = OPTIONAL_W26C_SOURCE.filter((segments) => existsSync(repoPath(segments)));
  return Object.freeze([...REQUIRED_W26C_SOURCE, ...optionalSources]);
}

function combinedSource() {
  return sourceFiles()
    .map((segments) => readUtf8(segments))
    .join('\n');
}

function assertIncludes(source, expected, label) {
  assert.equal(source.includes(expected), true, `${label} should include ${expected}`);
}

function assertDoesNotMatch(source, pattern, label) {
  assert.equal(pattern.test(source), false, `${label} should not match ${pattern}`);
}

function extractInterfaceBody(source, interfaceName) {
  const match = new RegExp(`export\\s+interface\\s+${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\}`, 'u').exec(source);
  assert.notEqual(match, null, `${interfaceName} should remain present in accepted W26C source`);
  return match[1];
}

function publicFieldNames(interfaceBody) {
  return [...interfaceBody.matchAll(/readonly\s+([A-Za-z_$][\w$]*)\??\s*:/gu)].map((match) => match[1]);
}

test('W26D2 guard inspects accepted W26C fake/inert source surfaces', () => {
  assert.deepEqual(
    REQUIRED_W26C_SOURCE.map(asRepoRelative),
    ['packages/openclaw-adapter/src/observability-correlation/fake-inert-observability-sink.ts'],
  );
  assert.equal(sourceFiles().length >= 1, true, 'at least the accepted fake/inert source should be inspected');
});

test('W26C fake/inert source imports no runtime, provider, telemetry, filesystem, process, or network modules', () => {
  for (const file of sourceFiles()) {
    const relative = asRepoRelative(file);
    const source = readUtf8(file);

    for (const [label, pattern] of FORBIDDEN_IMPORT_MODULE_PATTERNS) {
      assertDoesNotMatch(source, pattern, `${relative} ${label}`);
    }

    assertDoesNotMatch(source, /(?:^|\n)\s*import\s+['"][^'"]+['"];?/u, `${relative} side-effect import`);
    assertDoesNotMatch(source, /\b(?:import|require)\s*\(\s*['"](?:node:)?(?:fs|path|child_process|http|https|net|tls)['"]\s*\)/u, `${relative} dynamic unsafe import`);
    assertDoesNotMatch(source, /\brequire\s*\(\s*['"](?:axios|undici|@opentelemetry\/[^'"]+|pino|winston|bunyan|prom-client)['"]\s*\)/u, `${relative} unsafe require`);
  }
});

test('W26C fake/inert source has no filesystem, process, network, logging, metrics, exporter, server, or provider-client behavior', () => {
  for (const file of sourceFiles()) {
    const relative = asRepoRelative(file);
    const source = readUtf8(file);

    for (const [label, pattern] of FORBIDDEN_RUNTIME_USE_PATTERNS) {
      assertDoesNotMatch(source, pattern, `${relative} ${label}`);
    }
  }
});

test('W26C source avoids package-root side-effect wiring and runtime singleton initialization', () => {
  for (const file of sourceFiles()) {
    const relative = asRepoRelative(file);
    const source = readUtf8(file);

    assertDoesNotMatch(source, /from\s+['"](?:\.\.\/)*index\.js['"]/u, `${relative} package root import`);
    assertDoesNotMatch(source, /\b(?:export\s+const|const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*createFakeInertObservabilitySink\s*\(/u, `${relative} top-level sink instance`);
    assertDoesNotMatch(source, /\b(?:export\s+const|const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*createFakeInertObservabilityCorrelationPort\s*\(/u, `${relative} top-level correlation port instance`);
  }
});

test('W26C fake/inert posture remains explicit without requiring a singleton export name', () => {
  const source = combinedSource();

  for (const expected of REQUIRED_FAKE_INERT_VOCABULARY) {
    assertIncludes(source, expected, 'W26C fake/inert source');
  }
});

test('W26C public fake sink records and snapshots expose only safe redacted summary-oriented fields', () => {
  const source = combinedSource();

  for (const interfaceName of PUBLIC_FAKE_OUTPUT_INTERFACES) {
    const fields = publicFieldNames(extractInterfaceBody(source, interfaceName));

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

  assertIncludes(source, 'redactedSummary', 'public record result');
  assertIncludes(source, 'summaries: readonly ObservabilityRedactedPublicSummary[]', 'public snapshot');
  assertIncludes(source, 'listRedactedSummaries', 'public sink API');
  assertIncludes(source, 'safeSummary', 'redacted public summaries');
  assertIncludes(source, 'jsonSafe: true', 'public output posture');
  assertIncludes(source, 'runtimeOnlyValuesSerializable: false', 'public output posture');
});

test('W26C source keeps raw/provider/runtime/tool/audit/log payload vocabulary out of public fake outputs', () => {
  const source = combinedSource();
  const publicSurface = PUBLIC_FAKE_OUTPUT_INTERFACES.map((interfaceName) =>
    extractInterfaceBody(source, interfaceName),
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

test('W26C source keeps public safe-ref and summary redaction barriers active', () => {
  const source = combinedSource();

  for (const expected of [
    'looksUnsafeSafePublicRef',
    'normalizeSafeRef',
    'normalizeEventRef',
    'normalizeAuditRef',
    'normalizeCorrelationRef',
    'boundedSummaryText',
    'traceDumpSerializable: false',
    'publicProjection: \'redacted-json-safe\'',
    'raw-payload-contained',
    'runtime-value-contained',
  ]) {
    assertIncludes(source, expected, 'W26C redaction barrier');
  }
}
);
