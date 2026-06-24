import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function assertFile(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
}

function readSource(...segments) {
  return readFileSync(repoPath(...segments), 'utf8');
}

const w7LeafSourceFiles = [
  ['packages', 'openclaw-adapter', 'src', 'storage', 'topic-binding', 'durable-topic-binding-store.ts'],
  ['packages', 'openclaw-adapter', 'src', 'storage', 'idempotency', 'durable-idempotency-store.ts'],
  ['packages', 'openclaw-adapter', 'src', 'storage', 'callbacks', 'durable-callback-token-store.ts'],
  ['packages', 'openclaw-adapter', 'src', 'storage', 'delivery', 'durable-delivery-store.ts'],
  ['packages', 'openclaw-adapter', 'src', 'storage', 'core', 'durable-core-store-adapters.ts'],
];

const w7StorageBarrels = [
  ['packages', 'openclaw-adapter', 'src', 'storage', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'storage', 'topic-binding', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'storage', 'idempotency', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'storage', 'callbacks', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'storage', 'delivery', 'index.ts'],
  ['packages', 'openclaw-adapter', 'src', 'storage', 'core', 'index.ts'],
];

test('Wave 7 durable storage leaf files and barrels exist', () => {
  for (const filePath of [...w7LeafSourceFiles, ...w7StorageBarrels]) {
    assertFile(...filePath);
  }
});

test('Wave 7 storage and root barrels expose durable storage fan-in paths', () => {
  const rootSource = readSource('packages', 'openclaw-adapter', 'src', 'index.ts');
  const storageSource = readSource('packages', 'openclaw-adapter', 'src', 'storage', 'index.ts');

  assert.match(rootSource, /export \* from '\.\/storage\/index\.js';/u);
  assert.match(storageSource, /\.\/topic-binding\/index\.js/u);
  assert.match(storageSource, /\.\/idempotency\/index\.js/u);
  assert.match(storageSource, /\.\/callbacks\/index\.js/u);
  assert.match(storageSource, /\.\/delivery\/index\.js/u);
  assert.match(storageSource, /\.\/core\/index\.js/u);
});

test('Wave 7 durable storage source avoids private core implementation paths and real calls', () => {
  const forbiddenPatterns = [
    /hazeteam-core\/src/u,
    /hazeteam-core\/dist/u,
    /\bfetch\s*\(/u,
    /\bsetTimeout\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\breadFile\s*\(/u,
    /\bwriteFile\s*\(/u,
    /\bopenSync\s*\(/u,
    /\bcreateConnection\s*\(/u,
    /\bconnect\s*\(/u,
  ];

  for (const filePath of [...w7LeafSourceFiles, ...w7StorageBarrels]) {
    const source = readSource(...filePath);
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(source, pattern, `${filePath.join('/')} violates storage fan-in boundary`);
    }
  }
});
