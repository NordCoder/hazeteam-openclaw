# W12 Core Integration Development Contract

## Status

W12A establishes a planning and static-boundary foundation for later W12 core-integration proof work. It does not implement real core execution tests, real OpenClaw SDK wiring, real Telegram transport, callback endpoints, durable infrastructure, or production runtime behavior.

Later W12 phases must use this document together with the contract pack and the pinned `hazeteam-core` ref before adding executable core integration proof.

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

W12B, W12C, and W12D should normally focus on the adapter-facing subset: `hazeteam-core/host`, `hazeteam-core/presentation`, `hazeteam-core/foundation`, `hazeteam-core/adapters`, and `hazeteam-core/testing` when test utilities are intentionally exported and appropriate for test-only proof.

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

If a later W12 phase needs a symbol not reachable from a declared public export, it must report a core API gap or use a public alternative. It must not import private implementation files.

## Local and CI proof strategy

The preferred W12 local and CI strategy is:

1. Check out `hazeteam-openclaw`.
2. Check out `hazeteam-core` at `8eb7a3b3675a0779763067a1022cce75e63d1226`.
3. Install and build `hazeteam-core`.
4. Pack `hazeteam-core` locally with npm packing.
5. Install the generated tarball into the `hazeteam-openclaw` test environment without publishing to npm.
6. Run integration tests against public exports only.

This strategy treats core as a pinned external package source. Local path or link use may be useful for exploratory debugging, but it must not become the release-gate proof. W12A does not add package dependencies, lockfiles, CI workflows, or executable cross-repo tests.

## Current W12A status

W12A provides only:

- this pinned core ref and public import policy document;
- a static no-private-core-import guard for current and future OpenClaw production and test code;
- conservative README/current-state pointers so later W12 workers can find this policy.

W12A does not prove real core host composition or adapter-to-core behavior. It is not an integration-proof release state by itself.

## Future W12 test expectations

- W12B should create a real core host fake-port composition test through public `hazeteam-core` exports.
- W12C should prove a fake Telegram/OpenClaw adapter flow through real core semantics and fake delivery/presentation surfaces.
- W12D should prove callback token issue, verify, consume, and replay behavior through real core public semantics.
- W12E should fan in cross-repo CI/release status only after the execution proof exists and must keep release claims honest.

## No production runtime claim

This policy does not certify or implement:

- real OpenClaw SDK/client wiring;
- real Telegram listener, webhook, callback HTTP endpoint, polling loop, or network delivery;
- OCA, Codex, LifeOS, or product runtime behavior;
- production credential loading;
- production durable backend, database, cache, queue, scheduler, process supervisor, migration CLI, backup CLI, restore command, or replay runtime;
- remote sidecar support.

Any future production or sidecar claim requires explicit implementation scope, executable tests, no-leak assertions, documented limitations, and release-gate review.