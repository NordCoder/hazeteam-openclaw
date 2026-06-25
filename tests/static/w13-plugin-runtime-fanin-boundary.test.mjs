import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pluginRuntimeRoot = path.join(repoRoot, 'packages', 'openclaw-plugin-runtime');
const pluginRuntimeSourceRoot = path.join(pluginRuntimeRoot, 'src');

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

test('openclaw plugin runtime package root remains the intentional public entrypoint', () => {
  const packageJson = readJson('packages', 'openclaw-plugin-runtime', 'package.json');
  const source = readUtf8('packages', 'openclaw-plugin-runtime', 'src', 'index.ts');

  assert.deepEqual(packageJson.exports, {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    },
  });

  assert.match(source, /OPENCLAW_PLUGIN_RUNTIME_PUBLIC_SURFACES/u);
  assert.match(source, /from '\.\/lifecycle\.js'/u);
  assert.match(source, /from '\.\/tool-registry\.js'/u);
  assert.match(source, /from '\.\/capability-registry\.js'/u);
  assert.match(source, /from '\.\/readiness\.js'/u);
  assert.doesNotMatch(source, /export\s+\*/u, 'package root should use explicit public exports');
});

test('openclaw plugin runtime source has no private core imports or provider imports', () => {
  const sourceFiles = walkFiles(pluginRuntimeSourceRoot, (filePath) => filePath.endsWith('.ts'));
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
    /from\s+['"]ws['"]/u,
  ];
  const forbiddenRuntimeCallPatterns = [
    /\bfetch\s*\(/u,
    /\bWebSocket\s*\(/u,
    /\bprocess\.env\b/u,
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
