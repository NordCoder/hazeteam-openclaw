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

const channelEventsPath = "src/contracts/channel-events.ts";

const expectedContractNames = Object.freeze([
  "OpenClawTelegramChannelRef",
  "TelegramForumTopicRef",
  "OpenClawTelegramAttachmentRef",
  "OpenClawTelegramActorRef",
  "OpenClawTelegramMessageEvent",
  "OpenClawTelegramCallbackEvent",
  "OpenClawTelegramSystemEvent",
  "OpenClawTelegramSystemEventType",
  "OpenClawTelegramChannelEvent"
]);

const expectedDiscriminants = Object.freeze([
  "telegram.message",
  "telegram.callback",
  "telegram.topic.created",
  "telegram.topic.renamed",
  "telegram.topic.closed",
  "telegram.chat.permissions_changed"
]);

const forbiddenRawPayloadNames = Object.freeze([
  ["raw", "Update"].join(""),
  [["tele", "gram"].join(""), "Update"].join(""),
  ["raw", ["Tele", "gram"].join(""), "Update"].join("")
]);

const forbiddenRuntimeImports = Object.freeze([
  ["@", "open", "claw"].join(""),
  ["node", "-", "tele", "gram", "-", ["bo", "t"].join(""), "-api"].join(""),
  ["tele", "graf"].join(""),
  ["gram", "my"].join(""),
  ["hazeteam-core", "src"].join("/"),
  "dist/"
]);

const forbiddenLaterPhaseNames = Object.freeze([
  ["Open", "Claw", "Tele", "gram", "Delivery", "Request"].join(""),
  ["Open", "Claw", "Tele", "gram", "Delivery", "Result"].join(""),
  ["Open", "Claw", "Tele", "gram", "Adapter", "Readiness"].join(""),
  ["Topic", "Binding"].join(""),
  ["Topic", "Binding", "Store"].join(""),
  ["Idempotency", "Store"].join(""),
  ["Permission", "Policy"].join("")
]);

test("S02B channel event contract names and discriminants are present", () => {
  const source = readPackageFile(channelEventsPath);
  const barrel = readPackageFile("src/contracts/index.ts");

  assert.match(barrel, /from\s+["']\.\/channel-events\.js["'];/);

  for (const name of expectedContractNames) {
    assert.equal(source.includes(name), true, `${name} is missing from channel event contracts`);
    assert.equal(barrel.includes(name), true, `${name} is missing from the contracts barrel`);
  }

  for (const discriminant of expectedDiscriminants) {
    assert.equal(source.includes(discriminant), true, `${discriminant} discriminant is missing`);
  }

  assert.equal(source.includes("rawDebugRef"), true, "rawDebugRef must remain available as an opaque debug reference");
});

test("S02B channel event contracts stay normalized and contract-only", () => {
  const source = readPackageFile(channelEventsPath);

  for (const specifier of importSpecifiers(source)) {
    assert.equal(specifier.startsWith("./"), true, `${channelEventsPath} imports non-local dependency ${specifier}`);
  }

  for (const term of forbiddenRawPayloadNames) {
    assert.equal(source.includes(term), false, `${channelEventsPath} exposes forbidden raw payload field ${term}`);
  }

  for (const term of forbiddenRuntimeImports) {
    assert.equal(source.includes(term), false, `${channelEventsPath} contains runtime/SDK/private import term ${term}`);
  }

  for (const term of forbiddenLaterPhaseNames) {
    assert.equal(source.includes(term), false, `${channelEventsPath} defines out-of-scope later-phase contract ${term}`);
  }
});
