import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const repoRoot = new URL("../../", import.meta.url);
const adapterRoot = new URL("../../packages/openclaw-adapter/", import.meta.url);

function repoPath(...segments) {
  return new URL(segments.join("/"), repoRoot);
}

function readRepoFile(...segments) {
  return readFileSync(repoPath(...segments), "utf8");
}

function collectFiles(rootPath, predicate = () => true) {
  const files = [];

  for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, predicate));
      continue;
    }

    if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function packageRelative(pathname) {
  return pathname.replace(adapterRoot.pathname, "");
}

function collectSpecifiers(text) {
  const specifiers = [];
  const pattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;

  for (const match of text.matchAll(pattern)) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

test("workspace foundation files and references exist", () => {
  assert.equal(existsSync(repoPath("packages/openclaw-adapter")), true);
  assert.equal(existsSync(repoPath("packages/openclaw-adapter/src/contracts/index.ts")), true);

  const rootPackage = JSON.parse(readRepoFile("package.json"));
  const rootTsconfig = JSON.parse(readRepoFile("tsconfig.json"));
  const adapterTsconfig = JSON.parse(readRepoFile("packages/openclaw-adapter/tsconfig.json"));

  assert.deepEqual(rootPackage.workspaces, ["packages/*"]);
  assert.equal(rootPackage.scripts["test:unit"].includes("packages"), true);
  assert.deepEqual(rootTsconfig.references, [{ path: "./packages/openclaw-adapter" }]);
  assert.deepEqual(adapterTsconfig.include, ["src/**/*.ts"]);
});

test("placeholder packages remain README-only", () => {
  for (const packageDir of ["packages/domain-lifeos", "packages/oca-wrapper"]) {
    const files = collectFiles(new URL(`../../${packageDir}/`, import.meta.url).pathname);
    const relativeFiles = files.map((filePath) => filePath.split(`${packageDir}/`)[1]);

    assert.deepEqual(relativeFiles, ["README.md"], `${packageDir} must remain README-only`);
  }
});

test("adapter source stays within package boundaries", () => {
  const sourceFiles = collectFiles(new URL("../../packages/openclaw-adapter/src/", import.meta.url).pathname, (filePath) =>
    filePath.endsWith(".ts")
  );
  const combined = sourceFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n");
  const specifiers = sourceFiles.flatMap((filePath) => collectSpecifiers(readFileSync(filePath, "utf8")));
  const packageJson = readRepoFile("packages/openclaw-adapter/package.json");

  for (const forbiddenImport of ["hazeteam-core/src", "/dist/", "../dist/"]) {
    assert.equal(
      specifiers.some((specifier) => specifier.includes(forbiddenImport)),
      false,
      `forbidden import path present: ${forbiddenImport}`
    );
  }

  for (const forbiddenSdk of ["node-telegram-bot-api", "telegraf", "grammy", "telegram-bot-api"]) {
    assert.equal(combined.includes(forbiddenSdk), false, `forbidden dependency marker present in source: ${forbiddenSdk}`);
    assert.equal(packageJson.includes(forbiddenSdk), false, `forbidden dependency marker present in package.json: ${forbiddenSdk}`);
  }

  for (const forbiddenToken of ["BOT_TOKEN", "TELEGRAM_BOT_TOKEN", "bot_token"]) {
    assert.equal(combined.includes(forbiddenToken), false, `forbidden token/config marker present: ${forbiddenToken}`);
  }

  for (const forbiddenField of ["rawUpdate", "telegramUpdate", "rawTelegramUpdate"]) {
    assert.equal(combined.includes(forbiddenField), false, `forbidden raw update field present: ${forbiddenField}`);
  }

  assert.equal(combined.includes("rawDebugRef"), true, "rawDebugRef should remain available");
});

test("contracts barrel exports required groups and guards against the broken merge shape", () => {
  const contracts = readRepoFile("packages/openclaw-adapter/src/contracts/index.ts");

  assert.match(contracts, /export type \{[\s\S]*AdapterIsoTimestamp[\s\S]*WorkspaceRef[\s\S]*\} from "\.\/refs\.js";/);
  assert.match(contracts, /export \{[\s\S]*createActorRef[\s\S]*createWorkspaceRef[\s\S]*\} from "\.\/refs\.js";/);
  assert.match(contracts, /export type \{[\s\S]*AdapterOperationFailure[\s\S]*AdapterSafeErrorInput[\s\S]*\} from "\.\/result\.js";/);
  assert.match(contracts, /export \{[\s\S]*adapterErr[\s\S]*isAdapterOk[\s\S]*\} from "\.\/result\.js";/);
  assert.match(
    contracts,
    /export type \{[\s\S]*OpenClawTelegramActorRef[\s\S]*TelegramForumTopicRef[\s\S]*\} from "\.\/channel-events\.js";/
  );
  assert.match(contracts, /export \* from "\.\/delivery\.js";/);
  assert.match(
    contracts,
    /export type \{[\s\S]*AdapterCheckResult[\s\S]*OpenClawTelegramAdapterReadiness[\s\S]*\} from "\.\/readiness\.js";/
  );
  assert.match(
    contracts,
    /export type \{[\s\S]*DeliveryAttemptIdempotencyKeyInput[\s\S]*TelegramMessageIdempotencyKeyInput[\s\S]*\} from "\.\/idempotency\.js";/
  );
  assert.match(
    contracts,
    /export type \{[\s\S]*PermissionAllowedDecision[\s\S]*PermissionRequirementKind[\s\S]*\} from "\.\/permissions\.js";/
  );
  assert.match(contracts, /export \{ adapterCheckStatuses, adapterReadinessStatuses \} from "\.\/readiness\.js";/);
  assert.match(
    contracts,
    /export \{[\s\S]*createDeliveryAttemptIdempotencyKey[\s\S]*inboundIdempotencyStatuses[\s\S]*\} from "\.\/idempotency\.js";/
  );
  assert.match(contracts, /export \{ allowPermission, denyPermission \} from "\.\/permissions\.js";/);
  assert.doesNotMatch(
    contracts,
    /allowPermission,\s*denyPermission\s*\}\s*from "\.\/permissions\.js";\s*OpenClawTelegramActorRef/s
  );
});

test("adapter source files use package-local relative imports only", () => {
  const sourceFiles = collectFiles(new URL("../../packages/openclaw-adapter/src/", import.meta.url).pathname, (filePath) =>
    filePath.endsWith(".ts")
  );
  const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;

  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, "utf8");
    const relativeFilePath = packageRelative(filePath);

    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];

      if (specifier.startsWith("node:")) {
        continue;
      }

      assert.equal(specifier.startsWith("./") || specifier.startsWith("../"), true, `${relativeFilePath} imports ${specifier}`);
      assert.equal(specifier.includes("/src/"), false, `${relativeFilePath} imports private src path ${specifier}`);
      assert.equal(specifier.includes("/dist/"), false, `${relativeFilePath} imports dist path ${specifier}`);
    }
  }
});
