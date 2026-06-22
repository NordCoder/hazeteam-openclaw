import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function readPackageFile(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function importSpecifiers(text) {
  const specs = [];
  const staticImportPattern = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gs;
  const dynamicImportPattern = /import\(\s*["']([^"']+)["']\s*\)/gs;
  const requirePattern = /require\(\s*["']([^"']+)["']\s*\)/gs;

  for (const match of text.matchAll(staticImportPattern)) specs.push(match[1]);
  for (const match of text.matchAll(dynamicImportPattern)) specs.push(match[1]);
  for (const match of text.matchAll(requirePattern)) specs.push(match[1]);

  return specs;
}

const contractFiles = Object.freeze([
  "src/contracts/readiness.ts",
  "src/contracts/idempotency.ts",
  "src/contracts/permissions.ts"
]);

const sources = Object.fromEntries(contractFiles.map((path) => [path, readPackageFile(path)]));
const allSource = Object.values(sources).join("\n");

const forbiddenImportTerms = Object.freeze([
  ["hazeteam-core", "src"].join("/"),
  ["hazeteam-core", "dist"].join("/"),
  ["dist", ""].join("/"),
  ["node", "tele", "gram", "bot", "api"].join("-"),
  [["tele", "gram"].join(""), "bot", "api"].join("-"),
  ["tele", "graf"].join(""),
  ["gram", "my"].join(""),
  ["@", "open", "claw"].join("")
]);

const forbiddenImplementationTerms = Object.freeze([
  ["Topic", "Binding", "Store"].join(""),
  ["Inbound", "Idempotency", "Store"].join(""),
  ["Permission", "Binding", "Store"].join(""),
  ["Permission", "Engine"].join(""),
  ["Permission", "Policy", "Engine"].join(""),
  ["Readiness", "Aggregator"].join(""),
  ["aggregate", "Adapter", "Readiness"].join(""),
  ["Delivery", "Pump"].join(""),
  ["Callback", "Consume"].join(""),
  ["Open", "Claw", "Runtime", "Bridge"].join(""),
  ["Tele", "gram", "Bot"].join("")
]);

test("S02D contract modules and public barrel export required names", () => {
  const barrel = readPackageFile("src/contracts/index.ts");

  for (const modulePath of ["./readiness.js", "./idempotency.js", "./permissions.js"]) {
    assert.equal(barrel.includes(modulePath), true, `${modulePath} is exported by the contracts barrel`);
  }

  for (const name of [
    "AdapterReadinessStatus",
    "AdapterCheckStatus",
    "AdapterCheckResult",
    "OpenClawTelegramAdapterReadiness",
    "InboundIdempotencyStatus",
    "InboundIdempotencyRecord",
    "createTelegramMessageIdempotencyKey",
    "createTelegramCallbackIdempotencyKey",
    "createDeliveryAttemptIdempotencyKey",
    "PermissionDecision",
    "PermissionRequirement",
    "PermissionDeniedReason",
    "allowPermission",
    "denyPermission"
  ]) {
    assert.equal(allSource.includes(name) || barrel.includes(name), true, `${name} must be present in S02D contracts`);
  }
});

test("S02D readiness and check statuses are public-safe literals", () => {
  const readiness = sources["src/contracts/readiness.ts"];

  for (const status of ["ready", "degraded", "not_configured", "failed"]) {
    assert.equal(readiness.includes(`"${status}"`), true, `readiness status ${status} is missing`);
  }

  for (const status of ["ready", "missing", "degraded", "failed"]) {
    assert.equal(readiness.includes(`"${status}"`), true, `check status ${status} is missing`);
  }

  for (const checkName of [
    "topicBindingStore",
    "channelRegistry",
    "deliveryCapability",
    "domainRegistry",
    "runtimeBridge",
    "storeBindings",
    "permissionPolicy"
  ]) {
    assert.equal(readiness.includes(`"${checkName}"`), true, `readiness check ${checkName} is missing`);
  }

  assert.equal(readiness.includes(["raw", "Provider"].join("")), false, "readiness contract must not expose raw provider errors");
  assert.equal(readiness.includes(["sec", "ret"].join("")), false, "readiness contract must not expose private config material");
});

test("S02D idempotency key helpers are deterministic and match expected shapes", () => {
  const idempotency = sources["src/contracts/idempotency.ts"];

  for (const nondeterministicTerm of ["Date.now", "new Date", "Math.random", "randomUUID", ["cry", "pto"].join("")]) {
    assert.equal(idempotency.includes(nondeterministicTerm), false, `idempotency helpers must not use ${nondeterministicTerm}`);
  }

  assert.equal(
    idempotency.includes("`telegram-message:${input.channelId}:${input.chatId}:${input.messageThreadId}:${input.messageId}`"),
    true,
    "message idempotency key shape changed"
  );
  assert.equal(
    idempotency.includes("`telegram-callback:${input.channelId}:${input.chatId}:${input.messageThreadId}:${input.callbackQueryId}`"),
    true,
    "callback idempotency key shape changed"
  );
  assert.equal(
    idempotency.includes("`delivery:${input.outboxRef}:${input.claimRef}:${input.attemptNumber}`"),
    true,
    "delivery attempt idempotency key shape changed"
  );
});

test("S02D permission decision represents allow and deny safely", () => {
  const permissions = sources["src/contracts/permissions.ts"];

  assert.match(permissions, /readonly allowed:\s*true;/);
  assert.match(permissions, /readonly allowed:\s*false;/);
  assert.equal(permissions.includes("readonly reason: PermissionDeniedReason;"), true);
  assert.equal(permissions.includes("readonly code: string;"), true);
  assert.equal(permissions.includes("readonly safeMessage: string;"), true);
  assert.equal(permissions.includes("consume_action_token"), true, "permission requirements must support pre-consume checks");
});

test("S02D contract files avoid real platform imports and implementation names", () => {
  for (const [path, text] of Object.entries(sources)) {
    for (const spec of importSpecifiers(text)) {
      assert.equal(spec.startsWith("./"), true, `${path} imports non-local dependency ${spec}`);

      for (const term of forbiddenImportTerms) {
        assert.equal(spec.includes(term), false, `${path} imports forbidden platform/core dependency ${spec}`);
      }
    }
  }

  for (const term of forbiddenImplementationTerms) {
    assert.equal(allSource.includes(term), false, `S02D must not introduce implementation name ${term}`);
  }
});
