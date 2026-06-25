import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const transportRoot = path.join(repoRoot, 'packages', 'openclaw-telegram-transport');
const transportSourceRoot = path.join(transportRoot, 'src');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readUtf8(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function readJson(...segments) {
  return JSON.parse(readUtf8(...segments));
}

function walkFiles(startDir, predicate = () => true) {
  const files = [];

  function visit(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absolute = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }

      if (entry.isFile() && predicate(absolute)) {
        files.push(absolute);
      }
    }
  }

  visit(startDir);
  return files;
}

function readFile(filePath) {
  assert.equal(statSync(filePath).isFile(), true, `${filePath} should be a file`);
  return readFileSync(filePath, 'utf8');
}

test('openclaw telegram transport package root exposes only W14A config and secrets', () => {
  const packageJson = readJson('packages', 'openclaw-telegram-transport', 'package.json');
  const source = readUtf8('packages', 'openclaw-telegram-transport', 'src', 'index.ts');

  assert.equal(packageJson.name, '@hazeteam/openclaw-telegram-transport');
  assert.deepEqual(packageJson.exports, {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    },
  });

  assert.match(source, /OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES/u);
  assert.match(source, /from '\.\/config\.js'/u);
  assert.match(source, /from '\.\/secrets\.js'/u);
  assert.doesNotMatch(source, /export\s+\*/u, 'package root should use explicit public exports');
  assert.doesNotMatch(source, /delivery|callback|router|listener|webhook|polling/u, 'W14A package root must not expose future transport behavior');
});

test('openclaw telegram transport source has no provider imports, network calls, or production env reads', () => {
  const sourceFiles = walkFiles(transportSourceRoot, (filePath) => filePath.endsWith('.ts'));
  const forbiddenImportPatterns = [
    /from\s+['"]hazeteam-core\/src(?:\/|['"])/u,
    /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u,
    /import\(\s*['"]hazeteam-core\/src(?:\/|['"])/u,
    /import\(\s*['"]hazeteam-core\/dist(?:\/|['"])/u,
    /require\(\s*['"]hazeteam-core\/src(?:\/|['"])/u,
    /require\(\s*['"]hazeteam-core\/dist(?:\/|['"])/u,
    /from\s+['"]@openclaw\//u,
    /from\s+['"]openclaw(?:\/|['"])/u,
    /from\s+['"]telegraf(?:\/|['"])/u,
    /from\s+['"]grammy(?:\/|['"])/u,
    /from\s+['"]node:https?['"]/u,
    /from\s+['"]node:net['"]/u,
    /from\s+['"]node:tls['"]/u,
    /from\s+['"]ws['"]/u,
  ];
  const forbiddenRuntimeCallPatterns = [
    /\bfetch\s*\(/u,
    /\bWebSocket\s*\(/u,
    /\bprocess\.env\b/u,
    /\bcreateServer\s*\(/u,
    /\.listen\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\bsetTimeout\s*\(/u,
  ];

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(repoRoot, sourceFile);
    const source = readFile(sourceFile);

    for (const pattern of forbiddenImportPatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath} imports a forbidden private/provider module`);
    }

    for (const pattern of forbiddenRuntimeCallPatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath} performs forbidden runtime work`);
    }
  }
});

test('openclaw telegram transport source does not define runtime transport execution surfaces', () => {
  const sourceFiles = walkFiles(transportSourceRoot, (filePath) => filePath.endsWith('.ts'));
  const forbiddenSurfacePatterns = [
    /sendMessage/u,
    /deliverMessage/u,
    /ackCallback/u,
    /handleCallback/u,
    /commandRouter/u,
    /startPolling/u,
    /registerWebhook/u,
    /providerClientObject/u,
  ];

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(repoRoot, sourceFile);
    const source = readFile(sourceFile);

    for (const pattern of forbiddenSurfacePatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath} exposes future W14 behavior`);
    }
  }
});
