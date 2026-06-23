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

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function assertExportsExactlyOnce(source, modulePath, label) {
  const pattern = new RegExp(`export\\s+\\*\\s+from\\s+['"]${escapeRegExp(modulePath)}['"];`, 'gu');
  const matches = source.match(pattern) ?? [];
  assert.equal(matches.length, 1, `${label} must export ${modulePath} exactly once`);
}

const adapterRootExports = [
  './contracts/index.js',
  './binding/index.js',
  './commands/index.js',
];

const bindingBarrelExports = [
  './topic-binding.js',
  './in-memory-topic-binding-store.js',
];

const commandBarrelExports = [
  './command-descriptors.js',
  './ui-descriptors.js',
];

const testkitRootExports = [
  './events/telegram-event-factories.js',
  './fakes/fake-delivery-sink.js',
  './fakes/fake-runtime.js',
  './fakes/fake-approval.js',
];

test('Wave 3 leaf files and fan-in test files exist', () => {
  for (const filePath of [
    ['packages', 'openclaw-adapter', 'src', 'binding', 'topic-binding.ts'],
    ['packages', 'openclaw-adapter', 'src', 'binding', 'in-memory-topic-binding-store.ts'],
    ['packages', 'openclaw-adapter', 'src', 'binding', 'index.ts'],
    ['packages', 'openclaw-adapter', 'src', 'commands', 'command-descriptors.ts'],
    ['packages', 'openclaw-adapter', 'src', 'commands', 'ui-descriptors.ts'],
    ['packages', 'openclaw-adapter', 'src', 'commands', 'index.ts'],
    ['packages', 'openclaw-testkit', 'src', 'events', 'telegram-event-factories.ts'],
    ['packages', 'openclaw-testkit', 'src', 'fakes', 'fake-delivery-sink.ts'],
    ['packages', 'openclaw-testkit', 'src', 'fakes', 'fake-runtime.ts'],
    ['packages', 'openclaw-testkit', 'src', 'fakes', 'fake-approval.ts'],
    ['packages', 'openclaw-adapter', 'tests', 'unit', 'public-barrel-contracts.test.mjs'],
    ['packages', 'openclaw-testkit', 'tests', 'unit', 'public-barrel.test.mjs'],
    ['tests', 'static', 'w3-fanin-boundary.test.mjs'],
  ]) {
    assertFile(...filePath);
  }
});

test('Wave 3 adapter barrels expose contracts, binding, and command descriptor subpaths', () => {
  const adapterRootSource = readSource('packages', 'openclaw-adapter', 'src', 'index.ts');
  for (const modulePath of adapterRootExports) {
    assertExportsExactlyOnce(adapterRootSource, modulePath, 'openclaw-adapter root barrel');
  }

  assert.deepEqual(
    readSource('packages', 'openclaw-adapter', 'src', 'binding', 'index.ts').trim().split(/\r?\n/u),
    bindingBarrelExports.map((modulePath) => `export * from '${modulePath}';`),
  );
  assert.deepEqual(
    readSource('packages', 'openclaw-adapter', 'src', 'commands', 'index.ts').trim().split(/\r?\n/u),
    commandBarrelExports.map((modulePath) => `export * from '${modulePath}';`),
  );
});

test('Wave 3 testkit root barrel exposes event factories and fake primitives', () => {
  const testkitRootSource = readSource('packages', 'openclaw-testkit', 'src', 'index.ts');
  for (const modulePath of testkitRootExports) {
    assertExportsExactlyOnce(testkitRootSource, modulePath, 'openclaw-testkit root barrel');
  }
});
