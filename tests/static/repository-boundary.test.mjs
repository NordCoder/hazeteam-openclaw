import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readJson(...segments) {
  return JSON.parse(readFileSync(repoPath(...segments), 'utf8'));
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

function assertDir(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isDirectory(), true, `${segments.join('/')} should be a directory`);
}

function walkFiles(startDir, skipNames = new Set(['.git', 'node_modules', 'dist'])) {
  const files = [];

  function visit(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      if (skipNames.has(entry.name)) {
        continue;
      }

      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }

      if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }

  visit(startDir);
  return files;
}

function readUtf8IfLikelyText(filePath) {
  const textExtensions = new Set([
    '.json',
    '.md',
    '.mjs',
    '.ts',
    '.yml',
    '.yaml',
    '.gitignore',
  ]);
  const extension = path.extname(filePath);
  const basename = path.basename(filePath);

  if (!textExtensions.has(extension) && basename !== '.gitignore') {
    return null;
  }

  return readFileSync(filePath, 'utf8');
}

test('root workspace package and verification scripts are present', () => {
  assertFile('package.json');
  const rootPackage = readJson('package.json');

  assert.equal(rootPackage.private, true);
  assert.deepEqual(rootPackage.workspaces, [
    'packages/openclaw-adapter',
    'packages/openclaw-testkit',
  ]);

  for (const scriptName of ['clean', 'build', 'typecheck', 'test:static', 'test:unit', 'test', 'check']) {
    assert.equal(typeof rootPackage.scripts?.[scriptName], 'string', `missing root script ${scriptName}`);
  }

  assert.match(rootPackage.scripts.build, /--workspaces/);
  assert.match(rootPackage.scripts['test:unit'], /--workspaces/);
  assert.match(rootPackage.scripts.test, /test:unit/);
  assert.match(rootPackage.scripts.check, /test/);
});

test('ci workflow and active package skeleton files are present', () => {
  assertFile('.github', 'workflows', 'ci.yml');

  for (const packageDir of ['packages/openclaw-adapter', 'packages/openclaw-testkit']) {
    assertDir(packageDir);
    assertFile(packageDir, 'package.json');
    assertFile(packageDir, 'tsconfig.json');
    assertFile(packageDir, 'README.md');
    assertFile(packageDir, 'src', 'index.ts');
    assertFile(packageDir, 'tests', 'unit', 'package-smoke.test.mjs');
  }
});

test('production source does not import private hazeteam-core implementation paths', () => {
  const sourceFiles = [
    ...walkFiles(repoPath('packages', 'openclaw-adapter', 'src')),
    ...walkFiles(repoPath('packages', 'openclaw-testkit', 'src')),
  ];

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(repoRoot, sourceFile);
    const source = readFileSync(sourceFile, 'utf8');

    assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/src(?:\/|['"])/, `${relativePath} imports hazeteam-core/src`);
    assert.doesNotMatch(source, /from\s+['"]hazeteam-core\/dist(?:\/|['"])/, `${relativePath} imports hazeteam-core/dist`);
    assert.doesNotMatch(source, /import\(\s*['"]hazeteam-core\/src(?:\/|['"])/, `${relativePath} dynamically imports hazeteam-core/src`);
    assert.doesNotMatch(source, /import\(\s*['"]hazeteam-core\/dist(?:\/|['"])/, `${relativePath} dynamically imports hazeteam-core/dist`);
    assert.doesNotMatch(source, /require\(\s*['"]hazeteam-core\/src(?:\/|['"])/, `${relativePath} requires hazeteam-core/src`);
    assert.doesNotMatch(source, /require\(\s*['"]hazeteam-core\/dist(?:\/|['"])/, `${relativePath} requires hazeteam-core/dist`);
  }
});

test('obvious secret assignment terms are not committed', () => {
  const secretAssignmentTerms = [
    ['TELEGRAM_BOT_TOKEN', '='].join(''),
    ['OPENCLAW_API_KEY', '='].join(''),
    ['BOT_TOKEN', '='].join(''),
  ];

  for (const filePath of walkFiles(repoRoot)) {
    const content = readUtf8IfLikelyText(filePath);
    if (content === null) {
      continue;
    }

    const relativePath = path.relative(repoRoot, filePath);
    for (const secretTerm of secretAssignmentTerms) {
      assert.equal(content.includes(secretTerm), false, `${relativePath} contains ${secretTerm}`);
    }
  }
});

test('placeholder package directories remain README-only', () => {
  for (const packageDir of ['packages/domain-lifeos', 'packages/oca-wrapper']) {
    assertDir(packageDir);
    const files = walkFiles(repoPath(packageDir)).map((filePath) => path.relative(repoPath(packageDir), filePath)).sort();
    assert.deepEqual(files, ['README.md'], `${packageDir} should stay README-only in S00A`);
  }
});
