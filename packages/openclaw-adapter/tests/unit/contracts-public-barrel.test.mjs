import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function readPackageFile(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("S02A package source barrel exposes shared contracts", () => {
  const entrypoint = readPackageFile("src/index.ts");
  const contracts = readPackageFile("src/contracts/index.ts");

  assert.match(entrypoint, /export\s+\*\s+from\s+["']\.\/contracts\/index\.js["'];/);
  assert.match(contracts, /from\s+["']\.\/refs\.js["'];/);
  assert.match(contracts, /from\s+["']\.\/result\.js["'];/);

  for (const name of [
    "WorkspaceRef",
    "AgentRef",
    "ActorRef",
    "CorrelationRef",
    "AdapterOperationRef",
    "AdapterSafeError",
    "AdapterOperationResult",
    "adapterOk",
    "adapterErr",
    "createAdapterSafeError"
  ]) {
    assert.equal(contracts.includes(name), true, `${name} is exported by the contracts barrel`);
  }
});
