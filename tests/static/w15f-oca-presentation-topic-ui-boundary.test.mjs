import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readText(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

function readPresentationSource() {
  return readText('packages', 'oca-wrapper', 'src', 'presentation.ts');
}

test('W15F presentation leaf exists', () => {
  assertFile('packages', 'oca-wrapper', 'src', 'presentation.ts');
  assertFile('packages', 'oca-wrapper', 'tests', 'unit', 'presentation.test.mjs');
});

test('W15F unit tests import built dist files only', () => {
  const testSource = readText('packages', 'oca-wrapper', 'tests', 'unit', 'presentation.test.mjs');

  assert.match(testSource, /from\s+['"]\.\.\/\.\.\/dist\/presentation\.js['"]/u);
  assert.match(testSource, /from\s+['"]\.\.\/\.\.\/dist\/session-model\.js['"]/u);
  assert.doesNotMatch(testSource, /from\s+['"]\.\.\/\.\.\/src\//u);
});

test('W15F presentation imports only the local W15B session model leaf', () => {
  const source = readPresentationSource();
  const importSpecifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/gu)].map((match) => match[1]);

  assert.deepEqual([...new Set(importSpecifiers)], ['./session-model.js']);
  assert.doesNotMatch(source, /from\s+['"]\.\.\//u, 'presentation must not import sibling packages');
});

test('W15F presentation keeps noop boundary clean', () => {
  assert.equal(existsSync(repoPath('__noop__')), false);
});