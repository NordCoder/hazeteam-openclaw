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

function fromCharCodes(codes) {
  return String.fromCharCode(...codes);
}

test('root workspace package and verification scripts are present', () => {
  assertFile('package.json');
  const rootPackage = readJson('package.json');

  assert.equal(rootPackage.private, true);
  assert.deepEqual(rootPackage.workspaces, [
    'packages/domain-lifeos',
    'packages/openclaw-adapter',
    'packages/openclaw-plugin-runtime',
    'packages/openclaw-telegram-transport',
    'packages/openclaw-testkit',
    'packages/oca-wrapper',
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

  assertDir('packages', 'openclaw-telegram-transport');
  assertFile('packages', 'openclaw-telegram-transport', 'package.json');
  assertFile('packages', 'openclaw-telegram-transport', 'tsconfig.json');
  assertFile('packages', 'openclaw-telegram-transport', 'README.md');
  assertFile('packages', 'openclaw-telegram-transport', 'src', 'index.ts');
  assertFile('packages', 'openclaw-telegram-transport', 'src', 'config.ts');
  assertFile('packages', 'openclaw-telegram-transport', 'src', 'secrets.ts');
  assertFile('packages', 'openclaw-telegram-transport', 'tests', 'unit', 'config-secret-handles.test.mjs');

  assertDir('packages', 'oca-wrapper');
  assertFile('packages', 'oca-wrapper', 'package.json');
  assertFile('packages', 'oca-wrapper', 'tsconfig.json');
  assertFile('packages', 'oca-wrapper', 'README.md');
  assertFile('packages', 'oca-wrapper', 'src', 'index.ts');
  assertFile('packages', 'oca-wrapper', 'src', 'capability-descriptor.ts');
  assertFile('packages', 'oca-wrapper', 'tests', 'unit', 'capability-descriptor.test.mjs');

  assertDir('packages', 'domain-lifeos');
  assertFile('packages', 'domain-lifeos', 'package.json');
  assertFile('packages', 'domain-lifeos', 'tsconfig.json');
  assertFile('packages', 'domain-lifeos', 'README.md');
  assertFile('packages', 'domain-lifeos', 'src', 'index.ts');
  assertFile('packages', 'domain-lifeos', 'src', 'oca-agent-fixture.ts');
  assertFile('packages', 'domain-lifeos', 'tests', 'unit', 'oca-agent-fixture.test.mjs');
});

test('production source does not import private hazeteam-core implementation paths', () => {
  const sourceFiles = [
    ...walkFiles(repoPath('packages', 'domain-lifeos', 'src')),
    ...walkFiles(repoPath('packages', 'openclaw-adapter', 'src')),
    ...walkFiles(repoPath('packages', 'openclaw-plugin-runtime', 'src')),
    ...walkFiles(repoPath('packages', 'openclaw-telegram-transport', 'src')),
    ...walkFiles(repoPath('packages', 'openclaw-testkit', 'src')),
    ...walkFiles(repoPath('packages', 'oca-wrapper', 'src')),
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

test('public contracts avoid unsafe public fields and sibling contract imports', () => {
  const contractsDir = repoPath('packages', 'openclaw-adapter', 'src', 'contracts');
  assertDir('packages', 'openclaw-adapter', 'src', 'contracts');

  const forbiddenPublicFieldNames = [
    'rawUpdate',
    'telegramUpdate',
    'rawTelegramUpdate',
    'rawOpenClawEvent',
    'rawProviderResponse',
    'rawDeliveryResponse',
    'rawMessage',
    'rawCallback',
    'payloadBody',
    'rawError',
    'stack',
    'toolPayload',
    'approvalPayload',
    [98, 111, 116, 84, 111, 107, 101, 110],
    [97, 112, 105, 75, 101, 121],
    [115, 101, 99, 114, 101, 116],
  ].map((fieldName) => (Array.isArray(fieldName) ? fromCharCodes(fieldName) : fieldName));

  for (const sourceFile of walkFiles(contractsDir)) {
    const relativePath = path.relative(repoRoot, sourceFile);
    const source = readFileSync(sourceFile, 'utf8');

    for (const fieldName of forbiddenPublicFieldNames) {
      assert.doesNotMatch(
        source,
        new RegExp(`\\b${fieldName}\\b`, 'u'),
        `${relativePath} exposes forbidden public field ${fieldName}`,
      );
    }
  }

  assert.equal(
    existsSync(path.join(contractsDir, 'topic-binding.ts')),
    false,
    'S02 contracts must not create topic-binding.ts before the topic binding phase',
  );

  const siblingImportChecks = [
    {
      fileName: 'channel-events.ts',
      forbiddenSiblings: ['delivery', 'readiness', 'idempotency', 'permissions'],
    },
    {
      fileName: 'delivery.ts',
      forbiddenSiblings: ['channel-events', 'readiness', 'idempotency', 'permissions'],
    },
    {
      fileName: 'readiness.ts',
      forbiddenSiblings: ['channel-events', 'delivery', 'idempotency', 'permissions'],
    },
    {
      fileName: 'idempotency.ts',
      forbiddenSiblings: ['channel-events', 'delivery', 'readiness', 'permissions'],
    },
    {
      fileName: 'permissions.ts',
      forbiddenSiblings: ['channel-events', 'delivery', 'readiness', 'idempotency'],
    },
  ];

  for (const { fileName, forbiddenSiblings } of siblingImportChecks) {
    const sourcePath = path.join(contractsDir, fileName);
    if (!existsSync(sourcePath)) {
      continue;
    }

    const source = readFileSync(sourcePath, 'utf8');
    for (const siblingContractName of forbiddenSiblings) {
      assert.doesNotMatch(
        source,
        new RegExp(`from\\s+['"]\\./${siblingContractName}\\.js['"]`, 'u'),
        `${fileName} must not import sibling contract ${siblingContractName}.ts`,
      );
    }
  }
});

test('obvious protected assignment markers are not committed', () => {
  const protectedAssignmentTerms = [
    [84, 69, 76, 69, 71, 82, 65, 77, 95, 66, 79, 84, 95, 84, 79, 75, 69, 78, 61],
    [79, 80, 69, 78, 67, 76, 65, 87, 95, 65, 80, 73, 95, 75, 69, 89, 61],
    [66, 79, 84, 95, 84, 79, 75, 69, 78, 61],
  ].map(fromCharCodes);

  for (const filePath of walkFiles(repoRoot)) {
    const content = readUtf8IfLikelyText(filePath);
    if (content === null) {
      continue;
    }

    const relativePath = path.relative(repoRoot, filePath);
    for (const protectedTerm of protectedAssignmentTerms) {
      assert.equal(content.includes(protectedTerm), false, `${relativePath} contains a protected assignment marker`);
    }
  }
});

test('package directories include README documentation', () => {
  for (const packageDir of [
    'packages/domain-lifeos',
    'packages/oca-wrapper',
    'packages/openclaw-adapter',
    'packages/openclaw-plugin-runtime',
    'packages/openclaw-telegram-transport',
    'packages/openclaw-testkit',
  ]) {
    assertDir(packageDir);
    assertFile(packageDir, 'README.md');
  }
});
