import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const FILES = Object.freeze({
  rootPackage: ['package.json'],
  telegramPackage: ['packages', 'openclaw-telegram-transport', 'package.json'],
  telegramRoot: ['packages', 'openclaw-telegram-transport', 'src', 'index.ts'],
  telegramHarnessBarrel: ['packages', 'openclaw-telegram-transport', 'src', 'integration-harness', 'index.ts'],
  telegramHarnessContract: [
    'packages',
    'openclaw-telegram-transport',
    'src',
    'integration-harness',
    'real-integration-attempt-contract.ts',
  ],
  telegramHarnessUnitGuard: [
    'packages',
    'openclaw-telegram-transport',
    'tests',
    'unit',
    'integration-harness',
    'package-root-integration-harness-export.test.mjs',
  ],
  adapterPackage: ['packages', 'openclaw-adapter', 'package.json'],
  runtimeValuesBarrel: ['packages', 'openclaw-adapter', 'src', 'runtime-values', 'index.ts'],
  runtimeValueBoundary: ['packages', 'openclaw-adapter', 'src', 'runtime-values', 'runtime-value-boundary.ts'],
  runtimeCredentialBinding: [
    'packages',
    'openclaw-adapter',
    'src',
    'runtime-values',
    'runtime-credential-binding-port.ts',
  ],
  runtimeCredentialBindingUnitGuard: [
    'packages',
    'openclaw-adapter',
    'tests',
    'unit',
    'runtime-values',
    'runtime-credential-binding-public-export.test.mjs',
  ],
});

const RUNTIME_OVERREACH_SOURCE_FILES = Object.freeze([
  FILES.telegramRoot,
  FILES.telegramHarnessBarrel,
  FILES.telegramHarnessContract,
  FILES.runtimeValuesBarrel,
  FILES.runtimeCredentialBinding,
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
  'new Telegraf(',
  'new TelegramBot(',
  'new TelegramClient(',
  'new OpenClawClient(',
  'new OpenAI(',
  'new Anthropic(',
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
  'REAL_INTEGRATION_RUNTIME_CREDENTIAL_STATUSES',
  'createRealIntegrationAttemptPlanDescriptor',
  'isSafeRealIntegrationAttemptJson',
  'normalizeSuppliedRealIntegrationAttemptResult',
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

const W18A_RUNTIME_VALUE_EXPORTS = Object.freeze([
  'export class RuntimeOnlyValue',
  'export function createCredentialRef',
  'export function createSecretHandleRef',
  'export function createRuntimeOnlyValue',
  'export function unwrapRuntimeOnlyValue',
  'export function createRedactedRuntimeCredentialDescriptor',
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

test('W19F guards the W19D Telegram transport public root descriptor and exports', () => {
  const source = readUtf8(FILES.telegramRoot);
  const statusType = segmentBetween(
    source,
    'export type OpenClawTelegramTransportPackageStatus =',
    'export type OpenClawTelegramTransportEffect',
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

  assertIncludes(statusType, 'w19-integration-harness-public-export', 'transport package status');
  assertIncludes(publicSurfaceType, "'integration-harness'", 'transport public surface type');
  assertIncludes(publicSurfaceList, "'integration-harness'", 'transport public surface list');
  assertIncludes(source, 'productionReady: false', 'telegram transport source');
  assertIncludes(source, "descriptorVersion: 'w19d'", 'telegram transport descriptor');
  assertIncludes(
    source,
    "readiness: 'adapter-ready-for-real-system-integration-under-explicit-gates'",
    'telegram transport descriptor',
  );
  assertIncludes(source, "defaultNetworkBehavior: 'none'", 'telegram transport descriptor');
  assertIncludes(source, "realSmokeDefault: 'skipped-or-blocked'", 'telegram transport descriptor');
  assertIncludes(source, 'runtimeClientConstructedByDefault: false', 'telegram transport descriptor');
  assertIncludes(source, 'listenerWebhookPollingRuntime: false', 'telegram transport descriptor');

  assertExportsFrom(source, './integration-harness/index.js', W19A_RUNTIME_EXPORTS, 'telegram transport package root');
  assertExportsFrom(source, './real-smoke-gate.js', W18C_REAL_SMOKE_EXPORTS, 'telegram transport package root');
});

test('W19F guards the W19A real integration harness contract source', () => {
  const barrelSource = readUtf8(FILES.telegramHarnessBarrel);
  const contractSource = readUtf8(FILES.telegramHarnessContract);

  assertIncludes(
    barrelSource,
    "export * from './real-integration-attempt-contract.js';",
    'integration harness barrel',
  );
  assertIncludes(contractSource, "REAL_INTEGRATION_ATTEMPT_DESCRIPTOR_VERSION = 'w19a'", 'W19A contract');
  assertIncludes(contractSource, "runtimeClaim: 'not-production-runtime'", 'W19A contract');
  assertIncludes(contractSource, "readinessClaim: 'explicit-gate-only'", 'W19A contract');
  assertIncludes(contractSource, 'readyToAttemptIsPass: false', 'W19A contract');
  assertIncludes(contractSource, 'passRequiresProviderAckAndBusinessSuccess: true', 'W19A contract');
  assertIncludes(contractSource, 'noDefaultNetwork: true', 'W19A contract');
  assertIncludes(contractSource, 'noSecretLoading: true', 'W19A contract');
  assertIncludes(
    contractSource,
    'export function normalizeSuppliedRealIntegrationAttemptResult',
    'W19A contract',
  );
});

test('W19F guards the runtime-values barrel public export shape', () => {
  const source = readUtf8(FILES.runtimeValuesBarrel);
  const exportSpecifiers = [...source.matchAll(/\bexport\s+\*\s+from\s+['"]([^'"]+)['"];?/gu)].map(
    (match) => match[1],
  );

  assert.deepEqual(exportSpecifiers, ['./runtime-value-boundary.js', './runtime-credential-binding-port.js']);
  assert.doesNotMatch(source, /\bimport\b/u, 'runtime-values barrel should not import other modules');
  assertDoesNotInclude(source, 'process.env', 'runtime-values barrel');
});

test('W19F guards the W18A runtime-value boundary source exports', () => {
  const source = readUtf8(FILES.runtimeValueBoundary);

  for (const exportText of W18A_RUNTIME_VALUE_EXPORTS) {
    assertIncludes(source, exportText, 'W18A runtime-value boundary source');
  }
});

test('W19F guards the W19B runtime credential binding source and public projection', () => {
  const source = readUtf8(FILES.runtimeCredentialBinding);
  const statusType = segmentBetween(
    source,
    'export type RuntimeCredentialBindingStatus =',
    'export type RuntimeCredentialBindingIssueCode',
    'runtime credential binding status type',
  );
  const publicProjectionFunction = segmentBetween(
    source,
    'export function projectRuntimeCredentialBindingPublic',
    'export function isRuntimeCredentialBindingPublicProjectionJsonSafe',
    'runtime credential binding public projection function',
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
    assertIncludes(statusType, status, 'runtime credential binding status type');
  }

  assertIncludes(source, 'export async function bindRuntimeCredentialWithPort', 'runtime credential binding source');
  assertIncludes(source, 'export function projectRuntimeCredentialBindingPublic', 'runtime credential binding source');
  assertIncludes(
    source,
    'export function isRuntimeCredentialBindingPublicProjectionJsonSafe',
    'runtime credential binding source',
  );
  assertDoesNotInclude(
    publicProjectionFunction,
    'runtimeOnlyValue',
    'runtime credential binding public projection function',
  );
  assertDoesNotInclude(source, 'process.env', 'runtime credential binding source');
});

test('W19F guards default root scripts against accidental real-smoke execution', () => {
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

test('W19F guards package metadata inertness without requiring metadata edits', () => {
  const telegramPackage = readJson(FILES.telegramPackage);
  const adapterPackage = readJson(FILES.adapterPackage);

  assert.equal(telegramPackage.name, '@hazeteam/openclaw-telegram-transport');
  if (Object.hasOwn(telegramPackage, 'sideEffects')) {
    assert.equal(telegramPackage.sideEffects, false, 'telegram transport sideEffects metadata should stay false');
  }

  assert.equal(adapterPackage.name, '@hazeteam/openclaw-adapter');
});

test('W19F guards runtime overreach only in Wave 5 allowlisted source files', () => {
  for (const sourceFile of RUNTIME_OVERREACH_SOURCE_FILES) {
    const source = readUtf8(sourceFile);
    const label = asRepoRelative(sourceFile);

    for (const snippet of EXACT_RUNTIME_OVERREACH_SNIPPETS) {
      assertDoesNotInclude(source, snippet, label);
    }
  }
});

test('W19F verifies the existing W19D and W19E unit guards keep built public imports', () => {
  const w19dUnitGuard = readUtf8(FILES.telegramHarnessUnitGuard);
  const w19eUnitGuard = readUtf8(FILES.runtimeCredentialBindingUnitGuard);

  assertIncludes(w19dUnitGuard, "const PACKAGE_ROOT_IMPORT = '../../../dist/index.js';", 'W19D unit guard');
  assertIncludes(w19dUnitGuard, 'await import(PACKAGE_ROOT_IMPORT)', 'W19D unit guard');
  assertIncludes(
    w19eUnitGuard,
    "const BARREL_URL = new URL('../../../dist/runtime-values/index.js', import.meta.url);",
    'W19E unit guard',
  );
  assertIncludes(w19eUnitGuard, 'await import(BARREL_URL.href)', 'W19E unit guard');
});
