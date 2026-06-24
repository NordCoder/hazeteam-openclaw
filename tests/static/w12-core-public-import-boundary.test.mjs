import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function listFilesIfPresent(...segments) {
  const root = repoPath(...segments);
  if (!existsSync(root)) {
    return [];
  }

  const files = [];
  const skippedDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage']);

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

function isCodeFile(filePath) {
  return new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx']).has(path.extname(filePath));
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath);
}

function normalizeSpecifier(specifier) {
  return specifier.replaceAll('\\', '/');
}

function hasPathSegment(specifier, segment) {
  return normalizeSpecifier(specifier).split('/').includes(segment);
}

function extractImportSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gu,
    /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/gu,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function findForbiddenCoreImport(specifier) {
  const normalized = normalizeSpecifier(specifier);

  if (/^hazeteam-core\/(?:src|dist)(?:\/|$)/u.test(normalized)) {
    return 'imports hazeteam-core private src/dist implementation path';
  }

  if (/(?:^|\/)hazeteam-core\/(?:src|dist)(?:\/|$)/u.test(normalized)) {
    return 'imports checked-out hazeteam-core private src/dist implementation path';
  }

  if ((normalized.startsWith('./') || normalized.startsWith('../')) && hasPathSegment(normalized, 'hazeteam-core')) {
    return 'imports from a relative checked-out hazeteam-core repository path';
  }

  return null;
}

const scannedRoots = [
  ['packages', 'openclaw-adapter', 'src'],
  ['packages', 'openclaw-testkit', 'src'],
  ['tests', 'acceptance'],
  ['tests', 'static'],
  ['tests', 'integration'],
];

test('W12 core import boundary scans production and test code without private core imports', () => {
  const scannedFiles = scannedRoots.flatMap((segments) => listFilesIfPresent(...segments)).filter(isCodeFile);

  assert.ok(
    scannedFiles.some((filePath) => relativePath(filePath).startsWith(`tests${path.sep}static${path.sep}`)),
    'tests/static should be included in W12 private core import scan',
  );

  for (const filePath of scannedFiles) {
    const source = readFileSync(filePath, 'utf8');
    for (const specifier of extractImportSpecifiers(source)) {
      const violation = findForbiddenCoreImport(specifier);
      assert.equal(
        violation,
        null,
        `${relativePath(filePath)} ${violation}: ${specifier}`,
      );
    }
  }
});

test('W12 core integration policy document records pinned public-export strategy', () => {
  const docPath = repoPath('docs', 'development', 'core-integration.md');
  assert.equal(existsSync(docPath), true, 'docs/development/core-integration.md should exist');
  assert.equal(statSync(docPath).isFile(), true, 'docs/development/core-integration.md should be a file');

  const document = readFileSync(docPath, 'utf8');

  assert.match(document, /NordCoder\/hazeteam-core/u);
  assert.match(document, /8eb7a3b3675a0779763067a1022cce75e63d1226/u);
  assert.match(document, /public exports/iu);
  assert.match(document, /Private paths are forbidden/u);
  assert.match(document, /pack(?:ed|age)?\s+`?hazeteam-core`?.*tarball|tarball.*install/isu);
  assert.match(document, /pinned external package source/iu);
});