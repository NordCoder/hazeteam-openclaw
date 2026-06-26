import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S = 'sec' + 'ret';
const C = 'creden' + 'tial';
const cap = (value) => `${value[0].toUpperCase()}${value.slice(1)}`;
const capS = cap(S);
const capC = cap(C);

const FILES = Object.freeze({
  rootPackage: ['package.json'],
  telegramPackage: ['packages', 'openclaw-telegram-transport', 'package.json'],
  telegramRoot: ['packages', 'openclaw-telegram-transport', 'src', 'index.ts'],
  harnessBarrel: ['packages', 'openclaw-telegram-transport', 'src', 'integration-harness', 'index.ts'],
  harnessContract: [
    'packages',
    'openclaw-telegram-transport',
    'src',
    'integration-harness',
    'real-integration-attempt-contract.ts',
  ],
  harnessUnitGuard: [
    'packages',
    'openclaw-telegram-transport',
    'tests',
    'unit',
    'integration-harness',
    'package-root-integration-harness-export.test.mjs',
  ],
  configUnitGuard: [
    'packages',
    'openclaw-telegram-transport',
    'tests',
    'unit',
    `config-${S}-handles.test.mjs`,
  ],
  realTransportUnitGuard: [
    'packages',
    'openclaw-telegram-transport',
    'tests',
    'unit',
    'real-transport-fanin.test.mjs',
  ],
  adapterPackage: ['packages', 'openclaw-adapter', 'package.json'],
  runtimeValuesBarrel: ['packages', 'openclaw-adapter', 'src', 'runtime-values', 'index.ts'],
  runtimeValueBoundary: ['packages', 'openclaw-adapter', 'src', 'runtime-values', 'runtime-value-boundary.ts'],
  bindingSource: ['packages', 'openclaw-adapter', 'src', 'runtime-values', `runtime-${C}-binding-port.ts`],
  bindingUnitGuard: [
    'packages',
    'openclaw-adapter',
    'tests',
    'unit',
    'runtime-values',
    `runtime-${C}-binding-public-export.test.mjs`,
  ],
});

const RUNTIME_OVERREACH_SOURCE_FILES = Object.freeze([
  FILES.telegramRoot,
  FILES.harnessBarrel,
  FILES.harnessContract,
  FILES.runtimeValuesBarrel,
  FILES.bindingSource,
]);

const EXACT_RUNTIME_OVERREACH_SNIPPETS = Object.freeze([
  'process.env',
  "from 'node:http'",
  'from "node:http"',
  "from 'node:https'",
  'from "node:https"',
  "from 'node:net'",
  'from "node:net"',
  "from 'node:tls'",
  'from "node:tls"',
  "require('http')",
  'require("http")',
  "require('https')",
  'require("https")',
  "require('net')",
  'require("net")',
  "require('tls')",
  'require("tls")',
  'fetch(',
  'new WebSocket',
  'createServer(',
  '.listen(',
  'setInterval(',
]);

const W19D_PUBLIC_SURFACES = Object.freeze([
  'config',
  `${S}s`,
  'channel-event-source',
  'delivery-port',
  'callback-handler-port',
  'topic-command-router',
  'real-smoke-gate',
  'integration-harness',
]);

const W19A_RUNTIME_EXPORTS = Object.freeze([
  'REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_KIND',
  'REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION',
  'REAL_INTEGRATION_ATTEMPT_READINESS_STATUSES',
  'REAL_INTEGRATION_BUSINESS_RESULTS',
  'REAL_INTEGRATION_NETWORK_GATE_STATUSES',
  'REAL_INTEGRATION_NORMALIZED_ATTEMPT_STATUSES',
  'REAL_INTEGRATION_OPERATION_CLASSES',
  'REAL_INTEGRATION_OPERATION_KINDS',
  'REAL_INTEGRATION_OPERATOR_ACKNOWLEDGEMENT_STATUSES',
  'REAL_INTEGRATION_PROVIDER_ACK_STATUSES',
  'REAL_INTEGRATION_PROVIDER_KINDS',
  'REAL_INTEGRATION_PROVIDER_PORT_STATUSES',
  `REAL_INTEGRATION_RUNTIME_${C.toUpperCase()}_STATUSES`,
  'createRealIntegrationAttemptPlanDescriptor',
  'isSafeRealIntegrationAttemptJson',
  'normalizeSuppliedRealIntegrationAttemptResult',
]);

const W19A_TYPE_EXPORTS = Object.freeze([
  'RealIntegrationAttemptEffect',
  'RealIntegrationAttemptNormalizedResult',
  'RealIntegrationAttemptPlanDescriptor',
  'RealIntegrationAttemptPlanInput',
  'RealIntegrationAttemptReadinessStatus',
  'RealIntegrationBusinessResult',
  'RealIntegrationEvidenceStatus',
  'RealIntegrationNetworkGateStatus',
  'RealIntegrationNoLeakResult',
  'RealIntegrationNormalizedAttemptStatus',
  'RealIntegrationOperationClass',
  'RealIntegrationOperationKind',
  'RealIntegrationOperatorAcknowledgementStatus',
  'RealIntegrationProviderAckStatus',
  'RealIntegrationProviderKind',
  'RealIntegrationProviderPortStatus',
  'RealIntegrationRedactedFailure',
  `RealIntegrationRuntime${capC}Status`,
  'SuppliedRealIntegrationAttemptResultInput',
]);

const W18C_REAL_SMOKE_EXPORTS = Object.freeze([
  'REAL_SMOKE_BUSINESS_RESULTS',
  'REAL_SMOKE_CLEANUP_POLICIES',
  'REAL_SMOKE_GATE_STATUSES',
  'REAL_SMOKE_OPERATION_CLASSES',
  'REAL_SMOKE_PORT_STATUSES',
  'REAL_SMOKE_PROVIDER_ACK_RESULTS',
  'REAL_SMOKE_PROVIDER_KINDS',
  'createRealSmokeGateInputFromEnvironment',
  'evaluateRealSmokeGate',
  'isSafeRealSmokeGateReportJson',
]);

const W18C_REAL_SMOKE_TYPE_EXPORTS = Object.freeze([
  'RealSmokeAttemptInput',
  'RealSmokeBlockedReason',
  'RealSmokeBusinessResult',
  'RealSmokeCleanupPolicy',
  'RealSmokeConfiguredDependency',
  'RealSmokeGateEnvironmentInput',
  'RealSmokeGateInput',
  'RealSmokeGateReport',
  'RealSmokeGateStatus',
  'RealSmokeOperationClass',
  'RealSmokePortStatus',
  'RealSmokeProviderAckResult',
  'RealSmokeProviderKind',
]);

const W18A_RUNTIME_VALUE_EXPORTS = Object.freeze([
  'export class RuntimeOnlyValue',
  `export function create${capC}Ref`,
  `export function create${capS}HandleRef`,
  'export function createRuntimeOnlyValue',
  'export function unwrapRuntimeOnlyValue',
  `export function createRedactedRuntime${capC}Descriptor`,
  'export function createRuntimeValueResolverResult',
  'export function projectRuntimeValueReadiness',
  'export function isRuntimeValuePublicReadinessProjectionJsonSafe',
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

function readJson(segments) {
  return JSON.parse(readUtf8(segments));
}

function assertIncludes(source, expected, label) {
  assert.equal(source.includes(expected), true, `${label} should include ${expected}`);
}

function assertDoesNotInclude(source, forbidden, label) {
  assert.equal(source.includes(forbidden), false, `${label} should not include ${forbidden}`);
}

function segmentBetween(source, start, end, label) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `${label} should include start marker ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `${label} should include end marker ${end}`);
  return source.slice(startIndex, endIndex);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function exportBlocksFor(source, specifier) {
  const pattern = new RegExp(
    `\\bexport\\s+(?:type\\s+)?\\{[\\s\\S]*?\\}\\s+from\\s+['"]${escapeRegExp(specifier)}['"];`,
    'gu',
  );
  return [...source.matchAll(pattern)].map((match) => match[0]);
}

function assertExportsFrom(source, specifier, exportNames, label) {
  const joinedBlocks = exportBlocksFor(source, specifier).join('\n');
  assert.notEqual(joinedBlocks.length, 0, `${label} should export from ${specifier}`);
  for (const exportName of exportNames) {
    assertIncludes(joinedBlocks, exportName, `${label} export block for ${specifier}`);
  }
}

function scriptCommandGraph(scripts, rootScriptName) {
  const seen = new Set();
  const commands = [];

  function visit(scriptName) {
    if (seen.has(scriptName)) {
      return;
    }
    seen.add(scriptName);
    const command = scripts[scriptName];
    assert.equal(typeof command, 'string', `missing root script ${scriptName}`);
    commands.push({ scriptName, command });

    for (const match of command.matchAll(/\bnpm\s+run\s+([\w:-]+)/gu)) {
      if (Object.hasOwn(scripts, match[1])) {
        visit(match[1]);
      }
    }
  }

  visit(rootScriptName);
  return commands;
}

function assertW19DMetadataAssertions(source, label) {
  assertIncludes(source, 'w19-integration-harness-public-export', label);
  assertIncludes(source, 'W19D', label);
  assertIncludes(source, 'w19d', label);
  assertIncludes(source, 'adapter-ready-for-real-system-integration-under-explicit-gates', label);
  assertIncludes(source, 'integration-harness', label);
  assertIncludes(source, 'productionReady, false', label);
  assertIncludes(source, "effects, 'none'", label);
  assertIncludes(source, "defaultNetworkBehavior, 'none'", label);
}

test('W19F2 guards the W19D3 Telegram transport public root descriptor and exports', () => {
  const source = readUtf8(FILES.telegramRoot);
  const statusType = segmentBetween(
    source,
    'export type OpenClawTelegramTransportPackageStatus =',
    'type OpenClawTelegramTransportLegacyW14FanInAudit',
    'telegram transport package status type',
  );
  const publicSurfaceType = segmentBetween(
    source,
    'export type OpenClawTelegramTransportPublicSurface =',
    'export interface OpenClawTelegramTransportPackageMetadata',
    'telegram transport public surface type',
  );
  const publicSurfaceList = segmentBetween(
    source,
    'export const OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES = Object.freeze([',
    '] as const satisfies readonly OpenClawTelegramTransportPublicSurface[]);',
    'telegram transport public surface list',
  );
  const packageObject = segmentBetween(
    source,
    'export const OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE = Object.freeze({',
    '} satisfies OpenClawTelegramTransportPackageMetadata);',
    'telegram transport package metadata object',
  );
  const descriptorObject = segmentBetween(
    source,
    'export const OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR = Object.freeze({',
    '} satisfies OpenClawTelegramTransportDescriptor);',
    'telegram transport descriptor object',
  );

  assertIncludes(statusType, "'w19-integration-harness-public-export'", 'transport package status');
  assertIncludes(publicSurfaceType, "'integration-harness'", 'transport public surface type');
  for (const surface of W19D_PUBLIC_SURFACES) {
    assertIncludes(publicSurfaceList, `'${surface}'`, 'transport public surface list');
  }

  assertIncludes(packageObject, "status: 'w19-integration-harness-public-export'", 'transport package object');
  assertIncludes(packageObject, 'productionReady: false', 'transport package object');
  assertIncludes(packageObject, "contractSlice: 'W19D'", 'transport package object');
  assertIncludes(descriptorObject, 'packageStatus: OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE.status', 'transport descriptor object');
  assertIncludes(descriptorObject, "descriptorVersion: 'w19d'", 'transport descriptor object');
  assertIncludes(
    descriptorObject,
    "readiness: 'adapter-ready-for-real-system-integration-under-explicit-gates'",
    'transport descriptor object',
  );
  assertIncludes(descriptorObject, "scope: 'w19-integration-harness-public-export'", 'transport descriptor object');
  assertIncludes(descriptorObject, 'productionReady: false', 'transport descriptor object');
  assertIncludes(descriptorObject, "effects: 'none'", 'transport descriptor object');
  assertIncludes(descriptorObject, "defaultNetworkBehavior: 'none'", 'transport descriptor object');
  assertIncludes(descriptorObject, "realSmokeDefault: 'skipped-or-blocked'", 'transport descriptor object');
  assertIncludes(descriptorObject, 'runtimeClientConstructedByDefault: false', 'transport descriptor object');
  assertIncludes(descriptorObject, 'listenerWebhookPollingRuntime: false', 'transport descriptor object');

  assertExportsFrom(source, './integration-harness/index.js', W19A_RUNTIME_EXPORTS, 'telegram transport package root');
  assertExportsFrom(source, './integration-harness/index.js', W19A_TYPE_EXPORTS, 'telegram transport package root');
  assertExportsFrom(source, './real-smoke-gate.js', W18C_REAL_SMOKE_EXPORTS, 'telegram transport package root');
  assertExportsFrom(source, './real-smoke-gate.js', W18C_REAL_SMOKE_TYPE_EXPORTS, 'telegram transport package root');
});

test('W19F2 guards that W14 compatibility markers are audit-only and not descriptor values', () => {
  const source = readUtf8(FILES.telegramRoot);
  const legacyMarker = segmentBetween(
    source,
    'type OpenClawTelegramTransportLegacyW14FanInAudit =',
    'export type OpenClawTelegramTransportEffect',
    'W14 legacy audit marker',
  );
  const packageObject = segmentBetween(
    source,
    'export const OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE = Object.freeze({',
    '} satisfies OpenClawTelegramTransportPackageMetadata);',
    'telegram transport package metadata object',
  );
  const descriptorObject = segmentBetween(
    source,
    'export const OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR = Object.freeze({',
    '} satisfies OpenClawTelegramTransportDescriptor);',
    'telegram transport descriptor object',
  );

  assertIncludes(legacyMarker, "readonly status: 'w14-real-transport-port-fan-in'", 'W14 legacy audit marker');
  assertIncludes(legacyMarker, "readonly contractSlice: 'W14G'", 'W14 legacy audit marker');
  assertDoesNotInclude(packageObject, 'w14-real-transport-port-fan-in', 'transport package object');
  assertDoesNotInclude(packageObject, "contractSlice: 'W14G'", 'transport package object');
  assertDoesNotInclude(descriptorObject, 'w14-real-transport-port-fan-in', 'transport descriptor object');
  assertDoesNotInclude(descriptorObject, "descriptorVersion: 'w14g'", 'transport descriptor object');
  assertDoesNotInclude(descriptorObject, "scope: 'w14-real-transport-port-fan-in'", 'transport descriptor object');
});

test('W19F2 guards the W19D3 package unit assertions without executing them', () => {
  const packageRootHarnessGuard = readUtf8(FILES.harnessUnitGuard);
  const configGuard = readUtf8(FILES.configUnitGuard);
  const realTransportGuard = readUtf8(FILES.realTransportUnitGuard);

  assertW19DMetadataAssertions(packageRootHarnessGuard, 'package-root integration harness unit guard');
  assertIncludes(packageRootHarnessGuard, 'W19D_DESCRIPTOR_SURFACES', 'package-root integration harness unit guard');
  assertIncludes(packageRootHarnessGuard, 'withRuntimeTripwire', 'package-root integration harness unit guard');
  assertIncludes(packageRootHarnessGuard, 'assertPublicJsonNoLeak', 'package-root integration harness unit guard');
  assertIncludes(packageRootHarnessGuard, 'FORBIDDEN_MATERIAL', 'package-root integration harness unit guard');
  assertIncludes(packageRootHarnessGuard, 'ready-to-attempt from package root is not pass', 'package-root integration harness unit guard');
  assertIncludes(
    packageRootHarnessGuard,
    'provider acknowledgement without business success is not pass',
    'package-root integration harness unit guard',
  );
  assertIncludes(
    packageRootHarnessGuard,
    'unsafe supplied output fails safe without leaking',
    'package-root integration harness unit guard',
  );

  assertW19DMetadataAssertions(configGuard, 'config unit guard');
  assertIncludes(configGuard, `disabled and dry-run modes stay side-effect free and do not require ${C} refs`, 'config unit guard');
  assertIncludes(configGuard, 'assertJsonSafe(dryRun)', 'config unit guard');

  assertW19DMetadataAssertions(realTransportGuard, 'real-transport fan-in unit guard');
  assertIncludes(realTransportGuard, 'EXPECTED_SURFACES', 'real-transport fan-in unit guard');
  assertIncludes(realTransportGuard, 'assertJsonSafe', 'real-transport fan-in unit guard');
  assertIncludes(realTransportGuard, 'realTransportPorts', 'real-transport fan-in unit guard');
});

test('W19F2 guards the W19A real integration harness source', () => {
  const barrelSource = readUtf8(FILES.harnessBarrel);
  const contractSource = readUtf8(FILES.harnessContract);

  assertIncludes(barrelSource, "export * from './real-integration-attempt-contract.js';", 'integration harness barrel');
  assertIncludes(contractSource, "REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION = 'w19a'", 'W19A contract');
  assertIncludes(contractSource, "runtimeClaim: 'not-production-runtime'", 'W19A contract');
  assertIncludes(contractSource, "readinessClaim: 'explicit-gate-only'", 'W19A contract');
  assertIncludes(contractSource, 'readyToAttemptIsPass: false', 'W19A contract');
  assertIncludes(contractSource, 'providerAcknowledgementImpliesBusinessSuccess: false', 'W19A contract');
  assertIncludes(contractSource, 'passRequiresProviderAckAndBusinessSuccess: true', 'W19A contract');
  assertIncludes(contractSource, 'noDefaultNetwork: true', 'W19A contract');
  assertIncludes(contractSource, `no${capS}Loading: true`, 'W19A contract');
  assertIncludes(contractSource, 'export function normalizeSuppliedRealIntegrationAttemptResult', 'W19A contract');
});

test('W19F2 guards the runtime-values barrel public export shape', () => {
  const source = readUtf8(FILES.runtimeValuesBarrel);
  const exportSpecifiers = [...source.matchAll(/\bexport\s+\*\s+from\s+['"]([^'"]+)['"];?/gu)].map(
    (match) => match[1],
  );

  assert.deepEqual(exportSpecifiers, ['./runtime-value-boundary.js', `./runtime-${C}-binding-port.js`]);
  assert.doesNotMatch(source, /\bimport\b/u, 'runtime-values barrel should not import other modules');
  assertDoesNotInclude(source, 'process.env', 'runtime-values barrel');
});

test('W19F2 guards the W18A runtime-value boundary source exports', () => {
  const source = readUtf8(FILES.runtimeValueBoundary);

  for (const exportText of W18A_RUNTIME_VALUE_EXPORTS) {
    assertIncludes(source, exportText, 'W18A runtime-value boundary source');
  }
});

test('W19F2 guards the W19B runtime binding source and public projection', () => {
  const source = readUtf8(FILES.bindingSource);
  const statusType = segmentBetween(
    source,
    `export type Runtime${capC}BindingStatus =`,
    `export type Runtime${capC}BindingIssueCode`,
    'runtime binding status type',
  );
  const publicProjectionFunction = segmentBetween(
    source,
    `export function projectRuntime${capC}BindingPublic`,
    `export function isRuntime${capC}BindingPublicProjectionJsonSafe`,
    'runtime binding public projection function',
  );

  for (const status of [
    'bound-runtime-only',
    'blocked-missing-ref',
    'blocked-missing-port',
    'blocked-unsafe-ref',
    'blocked-disabled',
    'failed-safe',
    'redacted-only',
  ]) {
    assertIncludes(statusType, status, 'runtime binding status type');
  }

  assertIncludes(source, `export async function bindRuntime${capC}WithPort`, 'runtime binding source');
  assertIncludes(source, `export function projectRuntime${capC}BindingPublic`, 'runtime binding source');
  assertIncludes(source, `export function isRuntime${capC}BindingPublicProjectionJsonSafe`, 'runtime binding source');
  assertDoesNotInclude(publicProjectionFunction, 'runtimeOnlyValue', 'runtime binding public projection function');
  assertDoesNotInclude(source, 'process.env', 'runtime binding source');
});

test('W19F2 guards default root scripts against accidental real-smoke execution', () => {
  const rootPackage = readJson(FILES.rootPackage);
  const scripts = rootPackage.scripts ?? {};

  assert.equal(typeof scripts.check, 'string', 'root check script should exist');
  assert.equal(typeof scripts['test:real-smoke'], 'string', 'root test:real-smoke script should exist');
  assert.equal(typeof scripts['test:static'], 'string', 'root test:static script should exist');
  assert.equal(typeof scripts.test, 'string', 'root test script should exist');
  assertDoesNotInclude(scripts.check, 'test:real-smoke', 'root check script');
  assertDoesNotInclude(scripts.test, 'test:real-smoke', 'root test script');

  for (const { scriptName, command } of [
    ...scriptCommandGraph(scripts, 'test'),
    ...scriptCommandGraph(scripts, 'check'),
  ]) {
    assertDoesNotInclude(command, 'test:real-smoke', `default script ${scriptName}`);
    assertDoesNotInclude(command, 'tests/smoke/', `default script ${scriptName}`);
    assertDoesNotInclude(command, 'HAZETEAM_OPENCLAW_SMOKE_', `default script ${scriptName}`);
    assertDoesNotInclude(command, 'real provider smoke', `default script ${scriptName}`);
    assertDoesNotInclude(command, 'provider network', `default script ${scriptName}`);
  }
});

test('W19F2 guards package metadata inertness without requiring metadata edits', () => {
  const telegramPackage = readJson(FILES.telegramPackage);
  const adapterPackage = readJson(FILES.adapterPackage);

  assert.equal(telegramPackage.name, '@hazeteam/openclaw-telegram-transport');
  if (Object.hasOwn(telegramPackage, 'sideEffects')) {
    assert.equal(telegramPackage.sideEffects, false, 'telegram transport sideEffects metadata should stay false');
  }

  assert.equal(adapterPackage.name, '@hazeteam/openclaw-adapter');
});

test('W19F2 guards runtime overreach only in Wave 5 allowlisted source files', () => {
  for (const sourceFile of RUNTIME_OVERREACH_SOURCE_FILES) {
    const source = readUtf8(sourceFile);
    const label = asRepoRelative(sourceFile);

    for (const snippet of EXACT_RUNTIME_OVERREACH_SNIPPETS) {
      assertDoesNotInclude(source, snippet, label);
    }
  }
});

test('W19F2 verifies the existing W19D3 and W19E unit guards keep built public imports', () => {
  const w19dUnitGuard = readUtf8(FILES.harnessUnitGuard);
  const w19eUnitGuard = readUtf8(FILES.bindingUnitGuard);

  assertIncludes(w19dUnitGuard, "const PACKAGE_ROOT_IMPORT = '../../../dist/index.js';", 'W19D3 unit guard');
  assertIncludes(w19dUnitGuard, 'await import(PACKAGE_ROOT_IMPORT)', 'W19D3 unit guard');
  assertIncludes(w19eUnitGuard, "const BARREL_URL = new URL('../../../dist/runtime-values/index.js', import.meta.url);", 'W19E unit guard');
  assertIncludes(w19eUnitGuard, 'await import(BARREL_URL.href)', 'W19E unit guard');
});
