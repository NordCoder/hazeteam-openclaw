import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contractsDir = repoPath('packages', 'openclaw-adapter', 'src', 'contracts');
const adapterSourceDir = repoPath('packages', 'openclaw-adapter', 'src');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

function walkFiles(startDir, skipNames = new Set(['dist', 'node_modules'])) {
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

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function fromCodePoints(...codePoints) {
  return String.fromCharCode(...codePoints);
}

const requiredContractFiles = [
  'refs.ts',
  'context.ts',
  'result.ts',
  'channel-events.ts',
  'delivery.ts',
  'readiness.ts',
  'idempotency.ts',
  'permissions.ts',
  'index.ts',
];

const requiredContractExports = [
  './refs.js',
  './context.js',
  './result.js',
  './channel-events.js',
  './delivery.js',
  './readiness.js',
  './idempotency.js',
  './permissions.js',
];

const s02SiblingContractFiles = [
  'channel-events.ts',
  'delivery.ts',
  'readiness.ts',
  'idempotency.ts',
  'permissions.ts',
];

test('required S01 and S02 contract files exist after fan-in', () => {
  for (const fileName of requiredContractFiles) {
    assertFile('packages', 'openclaw-adapter', 'src', 'contracts', fileName);
  }
});

test('contracts barrel exports every required contract module exactly once', () => {
  const barrelSource = readFileSync(path.join(contractsDir, 'index.ts'), 'utf8');
  const expectedLines = requiredContractExports.map((modulePath) => `export * from '${modulePath}';`);

  assert.deepEqual(barrelSource.trim().split(/\r?\n/u).filter(Boolean), expectedLines);

  for (const modulePath of requiredContractExports) {
    const pattern = new RegExp(`export\\s+\\*\\s+from\\s+['"]${escapeRegExp(modulePath)}['"];`, 'gu');
    const matches = barrelSource.match(pattern) ?? [];
    assert.equal(matches.length, 1, `contracts/index.ts must export ${modulePath} exactly once`);
  }
});

test('production adapter source does not import private hazeteam-core paths', () => {
  const privateCorePathPatterns = [
    /from\s+['"]hazeteam-core\/src(?:\/|['"])/u,
    /from\s+['"]hazeteam-core\/dist(?:\/|['"])/u,
    /import\(\s*['"]hazeteam-core\/src(?:\/|['"])/u,
    /import\(\s*['"]hazeteam-core\/dist(?:\/|['"])/u,
    /require\(\s*['"]hazeteam-core\/src(?:\/|['"])/u,
    /require\(\s*['"]hazeteam-core\/dist(?:\/|['"])/u,
  ];

  for (const sourceFile of walkFiles(adapterSourceDir)) {
    const relativePath = path.relative(repoRoot, sourceFile);
    const source = readFileSync(sourceFile, 'utf8');

    for (const pattern of privateCorePathPatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath} imports a private hazeteam-core path`);
    }
  }
});

test('S02 contract source files do not directly import sibling S02 modules', () => {
  for (const fileName of s02SiblingContractFiles) {
    const source = readFileSync(path.join(contractsDir, fileName), 'utf8');
    const forbiddenSiblings = s02SiblingContractFiles.filter((siblingFileName) => siblingFileName !== fileName);

    for (const siblingFileName of forbiddenSiblings) {
      const siblingModule = siblingFileName.replace(/\.ts$/u, '');
      const pattern = new RegExp(
        `(?:from\\s+['"]\\./${escapeRegExp(siblingModule)}\\.js['"]|import\\(\\s*['"]\\./${escapeRegExp(siblingModule)}\\.js['"]|require\\(\\s*['"]\\./${escapeRegExp(siblingModule)}\\.js['"])`,
        'u',
      );
      assert.doesNotMatch(source, pattern, `${fileName} must not import sibling ${siblingFileName}`);
    }
  }
});

test('public contract source does not expose unsafe public field names', () => {
  const forbiddenFieldNames = [
    fromCodePoints(114, 97, 119, 85, 112, 100, 97, 116, 101),
    fromCodePoints(116, 101, 108, 101, 103, 114, 97, 109, 85, 112, 100, 97, 116, 101),
    fromCodePoints(114, 97, 119, 84, 101, 108, 101, 103, 114, 97, 109, 85, 112, 100, 97, 116, 101),
    fromCodePoints(114, 97, 119, 79, 112, 101, 110, 67, 108, 97, 119, 69, 118, 101, 110, 116),
    fromCodePoints(114, 97, 119, 80, 114, 111, 118, 105, 100, 101, 114, 82, 101, 115, 112, 111, 110, 115, 101),
    fromCodePoints(114, 97, 119, 68, 101, 108, 105, 118, 101, 114, 121, 82, 101, 115, 112, 111, 110, 115, 101),
    fromCodePoints(114, 97, 119, 77, 101, 115, 115, 97, 103, 101),
    fromCodePoints(114, 97, 119, 67, 97, 108, 108, 98, 97, 99, 107),
    fromCodePoints(112, 97, 121, 108, 111, 97, 100, 66, 111, 100, 121),
    fromCodePoints(114, 97, 119, 69, 114, 114, 111, 114),
    fromCodePoints(115, 116, 97, 99, 107),
    fromCodePoints(98, 111, 116, 84, 111, 107, 101, 110),
    fromCodePoints(97, 112, 105, 75, 101, 121),
    fromCodePoints(115, 101, 99, 114, 101, 116),
    fromCodePoints(116, 111, 111, 108, 80, 97, 121, 108, 111, 97, 100),
    fromCodePoints(97, 112, 112, 114, 111, 118, 97, 108, 80, 97, 121, 108, 111, 97, 100),
  ];

  for (const sourceFile of walkFiles(contractsDir)) {
    const relativePath = path.relative(repoRoot, sourceFile);
    const source = readFileSync(sourceFile, 'utf8');

    for (const fieldName of forbiddenFieldNames) {
      assert.doesNotMatch(source, new RegExp(`\\b${escapeRegExp(fieldName)}\\b`, 'u'), `${relativePath} exposes unsafe public field ${fieldName}`);
    }
  }
});
