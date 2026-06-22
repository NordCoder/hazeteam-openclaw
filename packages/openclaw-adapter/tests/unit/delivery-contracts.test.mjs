import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function readPackageFile(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function namedBlock(source, name) {
  const match = source.match(new RegExp(`(?:interface|type)\\s+${name}\\b[\\s\\S]*?(?=\\nexport\\s+(?:interface|type|function)|\\nfunction\\s+|$)`));
  assert.ok(match, `${name} must exist`);
  return match[0];
}

const forbiddenImportTerms = Object.freeze([
  "telegraf",
  "grammy",
  "node-telegram-bot-api",
  "telegram-bot-api",
  "@openclaw",
  "hazeteam-core/src",
  "dist/"
]);

const forbiddenLaterPhaseTerms = Object.freeze([
  "TopicBinding",
  "TopicBindingStore",
  "deliveryPump",
  "DeliveryPump",
  "drainOnce",
  "Renderer",
  "renderPresentation",
  "OpenClawTelegramAdapterReadiness",
  "Readiness",
  "IdempotencyStore",
  "PermissionPolicy",
  "consumeActionToken",
  "verifyActionToken"
]);

test("S02C delivery contracts are defined and exported through the contracts barrel", () => {
  const delivery = readPackageFile("src/contracts/delivery.ts");
  const contracts = readPackageFile("src/contracts/index.ts");

  assert.match(contracts, /export\s+\*\s+from\s+["']\.\/delivery\.js["'];/);

  for (const name of [
    "OpenClawTelegramDeliveryChannelRef",
    "TelegramDeliveryTarget",
    "TelegramDeliveryContent",
    "TelegramActionButton",
    "TelegramActionButtonGroup",
    "OpenClawTelegramDeliveryRequest",
    "ExternalTelegramMessageRef",
    "OpenClawTelegramDeliveryError",
    "OpenClawTelegramDeliveryResult"
  ]) {
    assert.equal(delivery.includes(name), true, `${name} is missing from delivery contracts`);
  }
});

test("delivery target explicitly requires messageThreadId for topic delivery", () => {
  const delivery = readPackageFile("src/contracts/delivery.ts");
  const target = namedBlock(delivery, "TelegramDeliveryTarget");
  const request = namedBlock(delivery, "OpenClawTelegramDeliveryRequest");

  assert.match(target, /readonly\s+chatId:\s+AdapterPublicId;/);
  assert.match(target, /readonly\s+messageThreadId:\s+AdapterPublicId;/);
  assert.doesNotMatch(target, /messageThreadId\?:/);
  assert.match(request, /readonly\s+telegram:\s+TelegramDeliveryTarget;/);
});

test("action buttons contain only opaque token payloads and no raw action body fields", () => {
  const delivery = readPackageFile("src/contracts/delivery.ts");
  const button = namedBlock(delivery, "TelegramActionButton");
  const group = namedBlock(delivery, "TelegramActionButtonGroup");

  assert.match(button, /readonly\s+label:\s+string;/);
  assert.match(button, /readonly\s+tokenPayload:\s+string;/);
  assert.match(button, /readonly\s+style\?:\s+"primary"\s+\|\s+"secondary"\s+\|\s+"danger";/);
  assert.match(group, /readonly\s+rows:\s+readonly\s+\(readonly\s+TelegramActionButton\[\]\)\[\];/);

  for (const forbidden of ["actionPayload", "rawActionPayload", "rawAction", "actionBody", "payloadJson"]) {
    assert.equal(button.includes(forbidden), false, `button contract must not expose ${forbidden}`);
  }
});

test("delivery result uses discriminated safe success and failure shapes", () => {
  const delivery = readPackageFile("src/contracts/delivery.ts");
  const error = namedBlock(delivery, "OpenClawTelegramDeliveryError");
  const success = namedBlock(delivery, "OpenClawTelegramDeliverySuccess");
  const failure = namedBlock(delivery, "OpenClawTelegramDeliveryFailure");
  const result = namedBlock(delivery, "OpenClawTelegramDeliveryResult");

  assert.match(error, /readonly\s+code:\s+string;/);
  assert.match(error, /readonly\s+safeMessage:\s+string;/);
  assert.match(error, /readonly\s+retryable:\s+boolean;/);
  assert.match(error, /readonly\s+detailsRef\?:\s+AdapterPublicId;/);
  assert.match(success, /readonly\s+ok:\s+true;/);
  assert.match(success, /readonly\s+externalMessageRef\?:\s+ExternalTelegramMessageRef;/);
  assert.match(failure, /readonly\s+ok:\s+false;/);
  assert.match(failure, /readonly\s+error:\s+OpenClawTelegramDeliveryError;/);
  assert.match(result, /OpenClawTelegramDeliverySuccess/);
  assert.match(result, /OpenClawTelegramDeliveryFailure/);

  for (const forbidden of ["rawProviderError", "providerError", "stack", "secret", "tokenSecret"]) {
    assert.equal(error.includes(forbidden), false, `delivery error must not expose ${forbidden}`);
  }
});

test("delivery contracts stay contract-only and avoid real platform imports or later-phase implementations", () => {
  const delivery = readPackageFile("src/contracts/delivery.ts");

  assert.match(delivery, /import\s+type\s+\{\s*AdapterPublicId\s*\}\s+from\s+["']\.\/refs\.js["'];/);

  for (const term of forbiddenImportTerms) {
    assert.equal(delivery.includes(term), false, `delivery contracts contain forbidden import/runtime term ${term}`);
  }

  for (const term of forbiddenLaterPhaseTerms) {
    assert.equal(delivery.includes(term), false, `delivery contracts introduced later-phase term ${term}`);
  }
});
