# Release Checklist

## Release scope

This checklist covers the OpenClaw adapter foundation as it exists after W12 core integration fan-in over the W10/W11 release-hardened adapter foundation. It is a release-readiness document for a fake-edge, real-core-public-API integration-proof baseline, not a claim that a complete production OpenClaw/Telegram product is available.

The foundation includes:

- adapter-owned safe contracts and DTO boundaries for OpenClaw/Telegram-facing data;
- public adapter barrels for the completed foundation surfaces, including the aggregate OpenClaw exports;
- fake E2E/no-leak coverage for mapper, core host shell, runtime bridge, renderer, delivery pump, callback token flow, approval bridge, and readiness composition;
- durable store interfaces and adapter-owned durable store shells for topic bindings, idempotency, callback token lifecycle, delivery attempts, external message references, and core-facing store boundaries;
- OpenClaw adapter-owned integration shells for channel events, delivery, runtime, and approval;
- W9 secret-gated smoke harness behavior that is dry-run or blocked by design and does not call remote services by default;
- W11 release-gate consistency updates that keep acceptance tests inside the normal repository test/check flow and package status aligned with foundation semantics;
- W12 integration-proof targets for pinned `hazeteam-core` public APIs with fake adapter edges.

The foundation and W12 integration proof do not by themselves ship real SDK wiring, a Telegram listener, a callback HTTP endpoint, a production credential loader, deployment automation, production durable infrastructure, sidecar support, or product-layer behavior.

## Required local checks

Run the repository checks before a release candidate is merged or tagged:

```sh
npm run test:static
npm run test
npm run check
```

For a W12 integration-proof release gate, also run the W12 core integration proof after installing `hazeteam-core` from a locally packed tarball built from the pinned ref recorded in `docs/development/core-integration.md`:

```sh
npm run test:core-integration
```

Do not add or rename package scripts as part of release hardening unless a separate tooling or fan-in slice explicitly owns that change.

## W12 core integration release gate

A W12 integration-proof release candidate must keep the following W12 gates green or explicitly report connector-only command execution as unavailable:

- `npm run test:static`.
- `npm run test`.
- `npm run check`.
- `npm run test:core-integration` after local packed-core install.
- GitHub Actions W12 core integration workflow passes when available.
- No private `hazeteam-core` imports are present.
- No copied `hazeteam-core` source is present.
- No raw provider, runtime, tool, secret, path, or stack leakage is introduced in public outputs, docs examples, tests, or readiness summaries.
- No real Telegram/OpenClaw production runtime claim is made.

The W12 GitHub Actions workflow requires `HAZETEAM_CORE_READ_TOKEN` to be configured before CI can pass, because it checks out the private `NordCoder/hazeteam-core` repository at the pinned ref. A missing token is a CI configuration failure, not an implementation failure. Do not bypass this gate with private core paths, copied core source, npm publish, npm link, or unsafe Node version overrides.

The W12 gate proves integration with pinned `hazeteam-core` public APIs and fake adapter edges only. It is not a production runtime, real transport, sidecar, durable backend, or credential-runtime certification.

## Static and acceptance gates

A release candidate must keep the current static and acceptance gate categories green:

- repository boundary checks for package structure, public import boundaries, protected assignment markers, and placeholder package documentation;
- public barrel contract checks for root, contract, storage, and OpenClaw exports;
- fake E2E/no-leak matrix coverage for safe end-to-end composition with injected fakes only;
- durable store restart matrix coverage for restart-like replay of safe persisted records;
- W8 OpenClaw fan-in boundary checks for exported OpenClaw shells, no private core paths, no direct real infrastructure calls, and no production env/secret reads;
- W9 real-smoke boundary checks for test-only smoke harness ownership, no production dependency on smoke helpers, and no real network or SDK imports;
- W12 private-core-import boundary checks over production and test code;
- secret-gated smoke behavior checks that verify skipped, not-ready, dry-run-ready, and blocked-by-design states without leaking protected data;
- acceptance-test gating through the normal root test and check scripts.

Do not weaken these gates to make a release branch pass. If a gate fails, either fix the release branch inside its assigned scope or stop and report the failure.

## Security and no-leak release gate

Release output, logs, errors, docs examples, smoke summaries, and durable record projections must not expose:

- raw provider, runtime, tool, or approval payloads;
- stack traces;
- bot tokens;
- API keys;
- secrets;
- passwords;
- credentials;
- filesystem paths;
- storage paths.

Use safe refs, bounded descriptors, redacted messages, and explicit readiness summaries. Do not serialize raw external payloads or internal runtime objects as public adapter output.

## Merge and release gate

A release candidate is eligible for merge only when all of the following are true:

1. The branch diff is clean and limited to the assigned slice.
2. Documentation-only slices touch only their allowed documentation files.
3. CI and local checks are green, or connector-only workers explicitly report that command execution was unavailable.
4. No product-layer concern leaks into `hazeteam-core` or into generic adapter foundation surfaces.
5. No real network, SDK, credential-loading, or process-supervision behavior is added unless a separate approved implementation slice explicitly owns it.
6. Package manifests, CI, production source, tests, roadmap files, deployment docs, operations docs, docs index, and README are changed only when explicitly allowed by the assigned slice.
7. Known limitations are preserved as limitations unless the current source and tests prove that the capability exists.
8. W12 integration-proof claims are supported by local packed-core install and W12 integration test execution, not by private paths, copied core files, npm publish, or local links.

For documentation-only release hardening, a passing review is a documentation merge gate, not a production-readiness certification.

## Post-release smoke posture

After release hardening, the W9 smoke posture remains safe by default:

- smoke execution is skipped unless explicitly gated on by environment;
- with required settings but without a configured real client, the harness is dry-run-ready only;
- when real network execution is requested, the current harness remains blocked by design because no production real client is configured;
- `willCallRemote` must remain false until a later approved implementation slice adds and tests real network execution.

Future real smoke work must preserve redaction, cleanup planning, deterministic readiness summaries, and explicit opt-in network gating. It must not be introduced through documentation-only release slices.
