# Public API and Import Rules

## Purpose

This document defines the import contract for external adapter and extension packages that use `hazeteam-core`.

Adapters must rely only on the public package entrypoints declared by `hazeteam-core`. Repository layout, `src/**` files, generated `dist/**` files, and test fixtures are not adapter-facing API unless explicitly exported and documented.

## Public API rule

Allowed imports are limited to:

- the root package entrypoint, for namespaced access;
- declared package subpaths in `package.json`;
- documented public symbols exported from those entrypoints.

Allowed examples:

```ts
import { host, presentation, foundation } from "hazeteam-core";
import { createCoreInteractionHost } from "hazeteam-core/host";
import { createInMemoryPresentationOutboxStore } from "hazeteam-core/presentation";
import { successEnvelope, serializeResultEnvelope } from "hazeteam-core/foundation";
```

Forbidden examples:

```ts
import { createCoreInteractionHost } from "hazeteam-core/src/host/core-interaction-host.js";
import { createCoreInteractionHost } from "hazeteam-core/dist/host/core-interaction-host.js";
import { createGenericExternalAdapterSimulator } from "../hazeteam-core/tests/support/generic-external-adapter-simulator.mjs";
```

If an adapter needs a symbol that is not publicly exported, treat that as a core API gap. Do not import private files as a workaround.

## Why private imports are forbidden

Private imports break adapter compatibility.

Private `src/**` and implementation `dist/**` files may change during internal refactors without adapter migration guarantees. They may also expose internal state, storage handles, runtime backing objects, filesystem paths, or unsafe serialization shapes that are intentionally not part of the public adapter-facing contract.

Adapters must only use surfaces that core deliberately exposes as stable external contracts.

## Root entrypoint model

The root package entrypoint is useful when an integration wants explicit namespaces.

Example:

```ts
import { host, presentation, foundation } from "hazeteam-core";

const facade = host.createCoreInteractionHost({
  agentControlHost,
  sessionBindingStore,
  presentationOutboxStore,
  presentationActionTokenStore
});
```

The root entrypoint should not be treated as a flattened all-symbol namespace. Prefer subpath imports when a package only needs one public surface.

## Subpath entrypoint model

Subpath imports are preferred for focused adapter code.

Common adapter-facing subpaths:

| Need | Public subpath | Typical usage |
| --- | --- | --- |
| Composed facade and host/session contracts | `hazeteam-core/host` | Create facade, submit inbound actions, resolve session binding, inspect port readiness |
| Presentation outbox and action tokens | `hazeteam-core/presentation` | List/claim/mark presentations, issue/verify/consume action tokens, parse/validate user intents |
| Public envelopes and safe result serialization | `hazeteam-core/foundation` | Wrap adapter-facing results, serialize safe errors, validate ids |
| Generic adapter reference contracts | `hazeteam-core/adapters` | Use adapter boundary helpers and public delivery result envelopes where appropriate |
| Diagnostics and health models | `hazeteam-core/diagnostics` | Render safe health/status/trace output |
| Lifecycle/readiness models | `hazeteam-core/lifecycle` | Expose declarative compatibility and migration readiness state |
| Testing references | `hazeteam-core/testing` or repository docs/tests as documented | Use deterministic references, not production implementation shortcuts |

Use only subpaths that are declared by the package and documented as public.

## Test fixture rule

Repository tests and simulator fixtures can be excellent references, but they are not production package API unless exported through a public package entrypoint.

Adapters may:

- read acceptance tests to understand expected behavior;
- copy reference patterns into adapter-owned tests;
- build their own fake/testkit package around public contracts.

Adapters must not:

- import repository test files as production runtime code;
- depend on test-only relative paths;
- ship code that imports from `tests/**` in `hazeteam-core`.

## Public symbol gap process

When an adapter needs a symbol that is not public:

1. Confirm the desired behavior is truly core-owned rather than adapter-owned.
2. Check the public API map and adapter handoff docs.
3. If the symbol should be public, add a small core API-gap slice.
4. Export the symbol through the owning public subpath.
5. Add public API snapshot or boundary tests.
6. Update adapter authoring docs.
7. Only then use the symbol from the adapter package.

Never solve an API gap by importing a private source file.

## Safe import checklist

Before merging adapter code, verify:

- no import contains `hazeteam-core/src/`;
- no import contains `hazeteam-core/dist/` except package-managed public runtime resolution after build;
- no relative import reaches into a checked-out `hazeteam-core` repository;
- no production code imports from `hazeteam-core/tests/**`;
- no adapter package imports private workspace paths such as `../../src/**`;
- all core imports use root or public subpaths;
- all values leaving core are safe public envelopes or safe serialized DTOs.

## Static boundary test recommendation

Every adapter repository should add static tests that fail on private imports.

Recommended checks:

- scan adapter `src/**` and `tests/**` for `hazeteam-core/src`;
- scan for `hazeteam-core/dist/` implementation paths;
- scan for relative imports into a core checkout;
- scan for raw provider payload field names that must not become public contracts;
- scan for token/secret terms;
- verify package-local tests are included in root CI.

This is especially important for adapter packages that start as staging directories inside a larger repository. Package source must not sit outside the CI build graph.

## Public outputs and serialization

Import rules are only one part of the boundary. Adapters must also serialize safely.

When a facade method returns a public envelope, the adapter may treat that envelope as adapter-facing output after applying any adapter-side transport rendering rules.

When a public helper returns a raw `Result<T>`, the adapter should wrap it with `serializeResultEnvelope(result, safeSerializer)` or another documented public serializer before logging or returning it outside the trusted process boundary.

Do not log raw internal values, raw provider payloads, thrown stack traces, storage roots, or mutable store objects.

## Versioning and compatibility

Adapters should treat public package subpaths as compatibility boundaries. A breaking change to a public subpath requires migration planning. A change to private implementation files does not imply adapter compatibility.

Adapter packages should record the compatible `hazeteam-core` version or commit range and should run their integration test suite when upgrading core.
