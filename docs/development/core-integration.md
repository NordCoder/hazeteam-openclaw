# W12 Core Integration Development Contract

## Status

W12 is an integration-proof baseline only when `hazeteam-openclaw` installs a locally packed `hazeteam-core` tarball built from the pinned core ref and the W12 integration command passes.

W12A establishes the pinned core ref and public import policy. W12B, W12C, and W12D add executable real-core proof targets. W12E wires the root package script and cross-repo GitHub Actions strategy that run those targets against the locally packed pinned core package.

This W12 posture does not implement or certify real OpenClaw SDK wiring, real Telegram transport, callback endpoints, durable infrastructure, sidecar support, credential loading, or production runtime behavior.

## Pinned core repository

- Repository: `NordCoder/hazeteam-core`
- Pinned SHA: `8eb7a3b3675a0779763067a1022cce75e63d1226`

## Pinned core ref rationale

The W12A pinned ref matches the prompt-provided core candidate and was inspected read-only before documenting this policy.

At this ref, `hazeteam-core` package metadata declares package exports for the root package and public subpaths. Core adapter-authoring docs also define the public API rule: downstream adapters must import only the root package, declared package subpaths, and documented public symbols; missing symbols are API gaps rather than permission to import private implementation files.

No alternate SHA was selected because the inspected candidate contains the required adapter-facing package exports, public API map, adapter-authoring guidance, core interaction facade docs, and adapter handoff docs needed for W12 setup.

## Read-only public export inventory

The following public package entrypoints were inspected from `NordCoder/hazeteam-core` at the pinned SHA. These are package export boundaries, not permission to depend on private files behind them.

- `hazeteam-core` — root namespaced access to public barrels.
- `hazeteam-core/foundation` — public refs, result/error envelopes, serialization, validation, hashes, and redaction helpers.
- `hazeteam-core/workspace` — workspace descriptors, registries, layout refs, and execution context helpers.
- `hazeteam-core/identity` — agent descriptors, principal and identity helpers, and relation validation.
- `hazeteam-core/storage` — document/state public store contracts and safe state refs.
- `hazeteam-core/events` — event taxonomy, envelopes, in-memory event store helpers, and safe event serialization.
- `hazeteam-core/policy` — policy decisions, grants, action classification, and capability evaluation.
- `hazeteam-core/approval` — approval request state, transitions, refs, decisions, and serialization.
- `hazeteam-core/presentation` — presentation outbox, rendering contracts, user intent parsing, and action-token lifecycle.
- `hazeteam-core/adapters` — generic adapter boundary helpers, fake approval driver, and adapter delivery result envelopes.
- `hazeteam-core/workflow` — workflow/action bundle state and approval coordination helpers.
- `hazeteam-core/runtime` — runtime queue, idempotency, worker-loop, retry, cancellation, and dead-letter models.
- `hazeteam-core/execution` — execution preflight, document-update execution, result store, and audit helpers.
- `hazeteam-core/diagnostics` — health, safe logs, metrics, redaction, and trace correlation helpers.
- `hazeteam-core/testing` — fixture discovery, scenario harness, golden fixture format, and serialized test harness helpers.
- `hazeteam-core/lifecycle` — compatibility, readiness, migration, backup/export/restore plan models.
- `hazeteam-core/composition` — deterministic vertical MVP composition reference surface.
- `hazeteam-core/host` — adapter-facing `createCoreInteractionHost`, session binding, host inbound action, port inventory/readiness, and facade contracts.

W12B, W12C, and W12D focus on the adapter-facing subset: `hazeteam-core/host`, `hazeteam-core/presentation`, `hazeteam-core/foundation`, `hazeteam-core/adapters`, and `hazeteam-core/testing` when test utilities are intentionally exported and appropriate for test-only proof.

## Public import policy

Allowed imports are limited to the root package and declared public package subpaths from the pinned core package metadata.

Allowed examples:

```ts
import { host, presentation, foundation } from "hazeteam-core";
import { createCoreInteractionHost } from "hazeteam-core/host";
import { createInMemoryPresentationOutboxStore } from "hazeteam-core/presentation";
import { submitAdapterIntent } from "hazeteam-core/adapters";
import { createTestHarnessRunner } from "hazeteam-core/testing";
```

`hazeteam-core/testing` is allowed only for test-only code and only because the pinned core package declares it as a public export. Core repository test files and unexported fixture paths remain private.

## Forbidden private import categories

Private paths are forbidden. Forbidden examples include:

```ts
import { createCoreInteractionHost } from "hazeteam-core/src/host/core-interaction-host.js";
import { createCoreInteractionHost } from "hazeteam-core/dist/host/core-interaction-host.js";
import { createGenericExternalAdapterSimulator } from "../hazeteam-core/tests/support/generic-external-adapter-simulator.mjs";
```

Forbidden categories:

- `hazeteam-core/src/...` imports.
- `hazeteam-core/dist/...` imports, except package-managed runtime resolution behind declared package exports.
- Relative imports into a checked-out `hazeteam-core` repository.
- Core repository `tests/**` or fixture paths unless intentionally exported as public testing utilities.
- Copied `hazeteam-core` source files in this repository.
- Any workaround that treats repository layout as adapter-facing API.

If a W12 or later phase needs a symbol not reachable from a declared public export, it must report a core API gap or use a public alternative. It must not import private implementation files.

## Local and CI proof strategy

The W12 local and CI strategy is:

1. Check out `hazeteam-openclaw`.
2. Check out `hazeteam-core` at `8eb7a3b3675a0779763067a1022cce75e63d1226`.
3. Install and build `hazeteam-core`.
4. Pack `hazeteam-core` locally with npm packing.
5. Install the generated tarball into the `hazeteam-openclaw` test environment without publishing to npm.
6. Build `hazeteam-openclaw`.
7. Run static boundary tests and the W12 integration tests against public exports only.

This strategy treats core as a pinned external package source. Local path or link use may be useful for exploratory debugging, but it must not become the release-gate proof.

W12E wires this strategy through:

- root script `npm run test:core-integration`;
- GitHub Actions workflow `.github/workflows/w12-core-integration.yml`.

The package script assumes the pinned core package has already been installed into the test environment as a local packed tarball. The workflow performs that checkout, build, pack, install, static test, and integration test sequence.

Because `NordCoder/hazeteam-core` is private, the W12 GitHub Actions checkout of the pinned core ref requires the repository or organization secret `HAZETEAM_CORE_READ_TOKEN`. The token should be a fine-grained PAT or GitHub App token with read-only contents access to `NordCoder/hazeteam-core`. The workflow uses the token only to check out the pinned core ref; it still builds and packs core locally and installs the generated tarball into `hazeteam-openclaw` without publishing.

## Packed core tarball staging

The W12 workflow packs `hazeteam-core` from a temporary staged package directory outside the source checkout. After building the pinned core ref, the workflow copies the pinned `package.json` and built `dist` directory into the staged package, verifies the public export targets required by W12 are present, and runs `npm pack` from that staged directory.

This staging step is required because the pinned `hazeteam-core` repository ignores `dist` in source-control ignore rules. The W12 release gate requires the locally packed tarball installed into `hazeteam-openclaw` to contain the built files targeted by public package exports, including `dist/foundation/index.js`, `dist/host/index.js`, and `dist/presentation/index.js`.

This is a CI packaging requirement for the integration-proof gate only. It does not imply production runtime readiness, npm registry publication, npm link usage, private core import permission, or copied core source in `hazeteam-openclaw`.

## W12 proof targets

### W12A public import policy and static boundary

W12A provides:

- this pinned core ref and public import policy document;
- a static no-private-core-import guard for current and future OpenClaw production and test code;
- conservative README/current-state pointers so later W12 workers can find this policy.

W12A does not prove real core host composition or adapter-to-core behavior by itself.

### W12B real core host composition

W12B adds `tests/integration/w12b-real-core-host-composition.test.mjs` as the first executable real-core host composition proof target.

The test constructs the real public `createCoreInteractionHost` facade through `hazeteam-core/host`, injects fake or in-memory required ports through public core contracts, asserts the documented facade method inventory, and checks `getPortReadiness` output for JSON-serializable no-leak readiness diagnostics.

### W12C fake Telegram/OpenClaw inbound flow through real core

W12C adds `tests/integration/w12c-adapter-real-core-fake-telegram-e2e.test.mjs` as a fake Telegram/OpenClaw edge proof through the real public core host facade.

The test maps a deterministic fake Telegram/OpenClaw inbound message through the existing adapter mapper into safe core-facing refs, submits a bounded host action through `submitHostAction`, verifies the public core envelope is JSON-serializable and no-leak safe, then optionally renders and delivers the safe response through existing fake adapter rendering and delivery shells.

This W12C target remains fake-edge only. It does not add real Telegram/OpenClaw SDK or network behavior and does not add a callback endpoint.

### W12D callback token lifecycle through real core

W12D adds `tests/integration/w12d-callback-token-real-core-lifecycle.test.mjs` as a fake OpenClaw/Telegram callback proof through the real public core host facade.

The test constructs the real public `createCoreInteractionHost` facade through `hazeteam-core/host`, issues an action token through `issueActionToken`, maps a fake external callback carrying only an opaque `hz:<tokenRef>` payload into safe verification and consume inputs, checks permission-before-consume ordering at the test boundary, verifies and consumes the token through real core methods, and asserts replay verification/reconsume terminal behavior plus JSON-serializable no-leak public outputs.

This W12D target remains fake-edge only. It does not add real Telegram/OpenClaw SDK or network behavior, callback HTTP endpoint, polling/webhook/runtime behavior, production durable storage, or release-gate wiring.

### W12E fan-in script and cross-repo CI strategy

W12E wires the W12B, W12C, and W12D targets into the root script and cross-repo CI strategy without changing their behavior.

W12E does not add product/runtime behavior. It does not add a normal npm registry dependency on `hazeteam-core`, does not publish `hazeteam-core`, does not use private core paths, and does not copy core code.

## W12 release-gate status

W12 can be described only as an integration-proof baseline against pinned `hazeteam-core` public APIs with fake adapter edges when all of the following are true:

- `hazeteam-core` is checked out at `8eb7a3b3675a0779763067a1022cce75e63d1226`.
- The pinned core package is installed into `hazeteam-openclaw` from a locally generated npm tarball.
- `npm run test:static` passes.
- `npm run test:core-integration` passes.
- The W12 core integration workflow passes when available.
- No private core imports or copied core source are present.

W12 does not certify production runtime.

## No production runtime claim

This W12 policy does not certify or implement:

- real OpenClaw SDK/client wiring;
- real Telegram listener, webhook, callback HTTP endpoint, polling loop, or network delivery;
- OCA, Codex, LifeOS, or product runtime behavior;
- production credential loading;
- production durable backend, database, cache, queue, scheduler, process supervisor, migration CLI, backup CLI, restore command, or replay runtime;
- remote sidecar support.

Any future production or sidecar claim requires explicit implementation scope, executable tests, no-leak assertions, documented limitations, and release-gate review.
