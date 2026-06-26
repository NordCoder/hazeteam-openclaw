import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const codeExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx']);
const skippedDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const packageSourceRoots = Object.freeze([
  ['packages', 'domain-lifeos', 'src'],
  ['packages', 'oca-wrapper', 'src'],
  ['packages', 'openclaw-adapter', 'src'],
  ['packages', 'openclaw-plugin-runtime', 'src'],
  ['packages', 'openclaw-telegram-transport', 'src'],
  ['packages', 'openclaw-testkit', 'src'],
]);
const releaseDocs = Object.freeze([
  ['docs', 'adapter-readiness.md'],
  ['docs', 'architecture', 'runtime-edge-boundaries.md'],
  ['docs', 'release', 'release-checklist.md'],
  ['docs', 'release', 'known-limitations.md'],
]);

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readUtf8(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function readJson(...segments) {
  return JSON.parse(readUtf8(...segments));
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

function listFilesIfPresent(...segments) {
  const root = repoPath(...segments);
  if (!existsSync(root)) {
    return [];
  }

  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && skippedDirectories.has(entry.name)) {
        continue;
      }

      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  visit(root);
  return files;
}

function listPackageSourceFiles() {
  return packageSourceRoots
    .flatMap((segments) => listFilesIfPresent(...segments))
    .filter((filePath) => codeExtensions.has(path.extname(filePath)));
}

function packageRootFiles() {
  return packageSourceRoots.map((segments) => repoPath(...segments, 'index.ts')).filter(existsSync);
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

function isProviderSdkSpecifier(specifier) {
  return /^(?:@openclaw\/|openclaw(?:\/|$)|telegraf(?:\/|$)|grammy(?:\/|$)|node-telegram-bot-api(?:\/|$)|telegram(?:\/|$)|@mtproto\/|mtproto(?:\/|$)|@openai\/|openai(?:\/|$)|@anthropic\/|anthropic(?:\/|$)|@modelcontextprotocol\/|codex(?:\/|$)|@codex\/)/iu.test(specifier);
}

function isNetworkModuleSpecifier(specifier) {
  return /^(?:node:)?(?:http|https|http2|net|tls|dgram|dns)(?:\/|$)/iu.test(specifier)
    || /^(?:ws|websocket|eventsource|undici|axios|got|node-fetch)(?:\/|$)/iu.test(specifier);
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
      if (Object.prototype.hasOwnProperty.call(scripts, match[1])) {
        visit(match[1]);
      }
    }
  }

  visit(rootScriptName);
  return commands;
}

function assertNoDefaultGateTerms(commandEntries) {
  const forbiddenTerms = [
    /test:real-smoke/iu,
    /tests\/smoke\//iu,
    /HAZETEAM_OPENCLAW_SMOKE_/u,
    /secrets\./iu,
    /provider\s+credentials?/iu,
    /provider\s+network/iu,
    /production\s+infrastructure/iu,
  ];

  for (const { scriptName, command } of commandEntries) {
    for (const forbiddenTerm of forbiddenTerms) {
      assert.doesNotMatch(
        command,
        forbiddenTerm,
        `default script ${scriptName} must not require real smoke, provider network, credentials, deployment secrets, or production infrastructure`,
      );
    }
  }
}

function linesMakingUnguardedReadinessClaim(document, claimPattern) {
  const explicitClaimPatterns = [
    /\b(?:current repository|this repository|repository)\s+(?:is|are|has status|is classified as|are classified as|claims?|may claim|must claim)\b/iu,
    /\b(?:current adapter|this adapter|adapter)\s+(?:is|are|has status|is classified as|are classified as|claims?|may claim|must claim)\b/iu,
    /\brelease candidate\s+(?:is|are|has status|is classified as|are classified as|claims?|may claim|must claim)\b/iu,
    /\bclassified as\s+`?\w/iu,
    /\bstatus:\s*`?\w/iu,
  ];
  const guardWords = /\b(?:not|must not|does not|do not|not yet|below|future|until|unless|only when|only after|later|before|required|requires|may use|eligible|target|goal|should remain|cannot|never|missing|when|after)\b/iu;

  return document
    .split(/\r?\n/u)
    .filter((line) => claimPattern.test(line))
    .filter((line) => explicitClaimPatterns.some((pattern) => pattern.test(line)))
    .filter((line) => !guardWords.test(line));
}

test('W18E1 root real-smoke script is explicit opt-in and excluded from default test and check', () => {
  const rootPackage = readJson('package.json');
  const scripts = rootPackage.scripts ?? {};

  assert.equal(
    scripts['test:real-smoke'],
    'npm run build && node --test tests/smoke/w14f-secret-gated-real-transport-smoke.test.mjs',
    'root test:real-smoke should remain an explicit opt-in smoke script under tests/smoke',
  );

  assert.doesNotMatch(scripts.test, /real-smoke|tests\/smoke\//iu, 'root npm run test must not include real smoke');
  assert.doesNotMatch(scripts.check, /real-smoke|tests\/smoke\//iu, 'root npm run check must not include real smoke');

  const testGraph = scriptCommandGraph(scripts, 'test');
  const checkGraph = scriptCommandGraph(scripts, 'check');
  assertNoDefaultGateTerms(testGraph);
  assertNoDefaultGateTerms(checkGraph);
});

test('W18E1 default CI runs only the safe check path without real smoke or secrets', () => {
  assertFile('.github', 'workflows', 'ci.yml');
  const defaultCi = readUtf8('.github', 'workflows', 'ci.yml');

  assert.match(defaultCi, /run:\s+npm run check/u, 'default CI should run npm run check');
  assert.doesNotMatch(defaultCi, /test:real-smoke|tests\/smoke\//iu, 'default CI must not run real smoke');
  assert.doesNotMatch(defaultCi, /secrets\.|HAZETEAM_OPENCLAW_SMOKE_|provider\s+credentials?/iu, 'default CI must not require credentials or deployment secrets');
  assert.doesNotMatch(defaultCi, /curl\b|wget\b|nc\b|ssh\b|docker\s+run|kubectl\b|terraform\b|provider\s+network/iu, 'default CI must not require provider network access or production infrastructure');
});

test('W18E1 smoke tests stay opt-in under tests/smoke and out of default acceptance/static/unit script paths', () => {
  const rootPackage = readJson('package.json');
  const scripts = rootPackage.scripts ?? {};
  const smokeFiles = listFilesIfPresent('tests', 'smoke').filter((filePath) => filePath.endsWith('.test.mjs'));

  assert.ok(smokeFiles.length >= 1, 'tests/smoke should contain explicit opt-in smoke tests');
  for (const filePath of smokeFiles) {
    assert.match(relativePath(filePath), /^tests\/smoke\/.+\.test\.mjs$/u);
  }

  assert.match(scripts['test:real-smoke'], /node --test tests\/smoke\//u, 'real smoke script should target tests/smoke only');
  for (const scriptName of ['test:static', 'test:unit', 'test:acceptance', 'test']) {
    assert.doesNotMatch(scripts[scriptName], /tests\/smoke\//u, `${scriptName} must not run tests/smoke`);
  }

  const workspacePackages = rootPackage.workspaces ?? [];
  for (const workspace of workspacePackages) {
    const packageJsonPath = repoPath(workspace, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const workspacePackage = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    for (const [scriptName, command] of Object.entries(workspacePackage.scripts ?? {})) {
      if (!/^test(?::|$)/u.test(scriptName)) {
        continue;
      }
      assert.doesNotMatch(command, /tests\/smoke\//u, `${workspace} ${scriptName} must not run real smoke`);
      assert.doesNotMatch(command, /test:real-smoke/u, `${workspace} ${scriptName} must not delegate to real smoke`);
    }
  }
});

test('W18E1 package source safe roots do not import provider SDKs or default network primitives', () => {
  const sourceFiles = listPackageSourceFiles();
  assert.ok(sourceFiles.length > 0, 'package source files should be scanned');

  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, 'utf8');
    const rel = relativePath(filePath);
    for (const specifier of extractImportSpecifiers(source)) {
      assert.equal(isProviderSdkSpecifier(specifier), false, `${rel} imports provider SDK ${specifier}`);
      assert.equal(isNetworkModuleSpecifier(specifier), false, `${rel} imports default network primitive ${specifier}`);
    }

    assert.doesNotMatch(source, /\bfetch\s*\(/u, `${rel} calls fetch by default`);
    assert.doesNotMatch(source, /\bnew\s+WebSocket\b|\bWebSocket\s*\(/u, `${rel} creates WebSocket by default`);
    assert.doesNotMatch(source, /\bnew\s+EventSource\b|\bEventSource\s*\(/u, `${rel} creates EventSource by default`);
    assert.doesNotMatch(source, /\bprocess\s*\.\s*env\b/u, `${rel} reads process.env in library source`);
  }
});

test('W18E1 package roots remain import-side-effect free and do not start runtime edges', () => {
  const rootFiles = packageRootFiles();
  assert.ok(rootFiles.length > 0, 'package root index files should be scanned');

  const forbiddenRootEffects = [
    /\bcreateServer\s*\(/u,
    /\.listen\s*\(/u,
    /\bset(?:Timeout|Interval)\s*\(/u,
    /\bqueueMicrotask\s*\(/u,
    /\bfetch\s*\(/u,
    /\bnew\s+WebSocket\b|\bWebSocket\s*\(/u,
    /\bnew\s+EventSource\b|\bEventSource\s*\(/u,
    /\bprocess\s*\.\s*env\b/u,
    /\bspawn\s*\(|\bexec\s*\(|\bfork\s*\(/u,
    /\bconnect\s*\(/u,
    /\bnew\s+[A-Za-z0-9_]*(?:Client|Sdk|Store|Supervisor)\b/u,
  ];

  for (const filePath of rootFiles) {
    const source = readFileSync(filePath, 'utf8');
    const rel = relativePath(filePath);
    for (const specifier of extractImportSpecifiers(source)) {
      assert.equal(isProviderSdkSpecifier(specifier), false, `${rel} imports provider SDK ${specifier}`);
      assert.equal(isNetworkModuleSpecifier(specifier), false, `${rel} imports default network primitive ${specifier}`);
    }

    for (const pattern of forbiddenRootEffects) {
      assert.doesNotMatch(source, pattern, `${rel} starts a listener, webhook server, polling loop, provider client, durable store, process supervisor, or network edge by import`);
    }
  }
});

test('W18E1 release docs guard adapter-ready and production-ready claims while preserving parked overlays', () => {
  const productionReadyClaim = /\bproduction-ready\b/iu;
  const adapterReadyClaim = /\b(?:adapter-ready-for-real-system-integration|adapter-real-integration-ready)\b/iu;

  for (const segments of releaseDocs) {
    assertFile(...segments);
    const document = readUtf8(...segments);
    const rel = segments.join('/');

    assert.deepEqual(
      linesMakingUnguardedReadinessClaim(document, productionReadyClaim),
      [],
      `${rel} appears to claim production-ready`,
    );
    assert.deepEqual(
      linesMakingUnguardedReadinessClaim(document, adapterReadyClaim),
      [],
      `${rel} appears to claim adapter-ready-for-real-system-integration before W18E3`,
    );
    assert.match(document, /production-ready|production readiness|production runtime/iu, `${rel} should mention production readiness boundaries`);
    assert.match(document, /not|must not|does not|below|future|parked/iu, `${rel} should guard readiness claims`);
    assert.match(document, /\bOCA\b/iu, `${rel} should preserve OCA parked-overlay status`);
    assert.match(document, /LifeOS/iu, `${rel} should preserve LifeOS parked-overlay status`);
    assert.match(document, /parked|not readiness evidence|not adapter-readiness evidence|not evidence/iu, `${rel} should not use parked overlays as adapter readiness proof`);
  }
});
