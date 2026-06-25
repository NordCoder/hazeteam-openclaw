# W16F — Static Boundary Cleanup Plan

## Scope

This document is the W16F docs-only cleanup plan for stale static boundary tests under the CD11.2 adapter-first reset.

It inventories current static tests, separates real invariants from temporary topology locks, and defines safe sequencing for later W17/W18 cleanup work. It does not modify tests, source, package roots, package metadata, CI, release docs, status docs, or existing roadmap docs.

OCA and LifeOS are parked downstream overlays. Existing OCA and LifeOS static tests may remain as safety checks that prevent accidental expansion, leaks, provider SDK wiring, network behavior, or package-root side effects. They must not be used as adapter-readiness evidence.

## Cleanup principles

1. Static tests should protect repository architecture and runtime/security invariants, not historical phase boundaries.
2. Static tests should not freeze exact file lists, exact root scripts, package-lock shape, README/doc presence, or W7/W8/W14/W15 phase labels unless those facts are themselves active CD11.2 invariants.
3. Static tests should prefer invariant-oriented scans over exact topology assertions when later W17/W18 work is expected to add modules, exports, or acceptance evidence.
4. Static tests that touch package roots, broad source trees, root scripts, CI, release classifier docs, or all package workspaces are shared surfaces and must be updated only by explicitly reserved cleanup or release-gate Workers.
5. No static test should treat fake/inert OCA or descriptor-only LifeOS/domain surfaces as adapter-ready-for-real-system-integration evidence.
6. Skipped or blocked real-smoke posture is a safe gate state, not a pass.
7. Default `npm run check` must remain no-network and no-secret unless a later explicitly scoped release-gate slice changes gate semantics without adding default network or credentials.
8. Source-level static checks must preserve no private hazeteam-core imports, no provider SDK imports in safe roots, no default network, no process.env reads in libraries, no raw public DTO payload leaks, permission-before-token-consume, provider acknowledgement not equal to business success, and package-root no side effects.

## Classification vocabulary

| Classification | Meaning | Later action |
|---|---|---|
| keep | The test protects an active CD11.2 invariant and can continue blocking work. | Preserve; only update vocabulary or covered paths when a later Worker owns the relevant surface. |
| narrow | The test contains useful invariants but also freezes obsolete or overly broad topology. | Split or rewrite to keep invariant checks while removing exact phase/file/script locks. |
| replace | The test encodes a historical temporary topology and should be superseded by a CD11.2 readiness, no-leak, or package-root matrix. | Add replacement first, then remove or shrink old assertions in a reserved static cleanup slice. |
| defer | The test covers an area that should not be changed until later evidence or release-gate ownership exists. | Do not edit in W17 leaf work; revisit in W18E1 or a dedicated static cleanup Worker. |
| parked-overlay-only | The test covers OCA or LifeOS/domain overlay safety. | Keep only as guardrails against expansion/leaks; never count as active adapter-readiness evidence. |

## Static test inventory

| File | Primary classification | Real CD11.2 invariant coverage | Temporary or stale topology locks | Planned cleanup rule |
|---|---|---|---|---|
| `tests/static/repository-boundary.test.mjs` | narrow | private hazeteam-core import ban; unsafe public contract field ban; protected assignment marker scan; package README presence | exact workspace list; exact active package skeleton files; S02 pre-topic-binding absence; broad package/doc existence checks | Keep repository-wide no-private-core, no-leak, and no-secret-marker scans. Move exact workspace/package skeleton assertions into release-gate evidence or replace with package-root no-side-effect matrix. Remove historical pre-phase absence checks when W17 adds legitimate surfaces. |
| `tests/static/s02-contract-fanin-boundary.test.mjs` | narrow | adapter contracts avoid private core imports and unsafe public fields; sibling contract imports remain isolated | exact S01/S02 contract filename list; exact barrel line ordering | Keep no-private-core and no unsafe public field scans. Replace exact barrel ordering with allowed public-contract module policy once W17 adapter composition adds contract surfaces. |
| `tests/static/w7-durable-storage-fanin-boundary.test.mjs` | narrow | adapter durable storage leaves avoid private core paths and real calls | exact W7 durable storage leaf/barrel list and root export shape | Keep no private core and no real network/filesystem/timer calls for adapter-owned storage code. Replace exact W7 file list with a durable-state readiness/static matrix after W17G/W17H4 evidence exists. |
| `tests/static/w8-openclaw-fanin-boundary.test.mjs` | replace | OpenClaw bridge leaves avoid private core, real infra calls, env/secret reads | exact W8 leaf/barrel list; root fan-in path; W8/W9 inert real-smoke filename allowlist | Replace W8 topology assertions with CD11.2 adapter composition checks owned after W17B. Keep no-network/no-env/no-private-core scans. Replace inert smoke allowlist with a release-gate rule that real smoke remains opt-in and not default readiness evidence. |
| `tests/static/w12-core-public-import-boundary.test.mjs` | keep/narrow | no private hazeteam-core imports across production and tests; public-export strategy exists | pinned external core source SHA/doc wording assertion | Keep the private core import scanner. Narrow doc-specific pinned SHA wording to a public-core-only policy check if the core pin or packaging strategy changes. |
| `tests/static/w13-plugin-runtime-fanin-boundary.test.mjs` | replace | plugin runtime source has no private core imports, provider imports, network calls, or process.env reads; package root stays explicit | W13 public surface names and package-root expectations | Replace W13 fake/dry-run topology assertions with W17A runtime composition/profile/readiness invariants. Keep no provider SDK, no network, no env reads, and package-root explicit/no-side-effect rules. |
| `tests/static/w14-transport-config-secret-boundary.test.mjs` | narrow | Telegram transport has no provider SDK imports, network calls, production env reads, or production runtime surfaces | exact W14 package-root fan-in surfaces; `productionReady: false` and W14 config wording as fixed root strings | Keep no-provider-SDK/no-network/no-env/no-production-runtime scans. Narrow exact export strings once W17C-W17F introduce CD11.2 inbound/outbound/callback/readiness surfaces. |
| `tests/static/w14b-channel-event-source-boundary.test.mjs` | narrow | channel event source has no provider SDK, network, env, listener, private core, or source-test imports | exact W14G package-root export of W14B leaf | Keep leaf safety and built-dist test import rule. Narrow package-root export assertion to a package-root reservation check owned by the later Telegram fan-in/release-gate slice. |
| `tests/static/w14c-delivery-port-boundary.test.mjs` | keep/narrow | delivery port has no provider SDK imports, network/env/listener behavior, raw provider output fields, direct SDK construction, or business-success conflation; provider call only through injected client boundary | exact package-root export names | Keep injected-client-only, no unsafe output, and provider ack not equal business success checks. Narrow exact package-root export checks when W17D owns delivery pipeline integration. |
| `tests/static/w14d-callback-handler-boundary.test.mjs` | keep/narrow | callback handler has no provider SDK/network/env/listener behavior; permission check precedes token consume; no-leak and duplicate-safe behavior are expected | exact W14G package-root export names; source-order heuristic for permission before consume | Keep permission-before-token-consume and no-leak coverage. Replace source-order heuristic with semantic/static or acceptance evidence after W17E/W17H3. Revisit callback public naming so opaque tokens are not confused with raw payloads. |
| `tests/static/w14e-topic-command-router-boundary.test.mjs` | keep/narrow | topic routing authority is channelRef plus chatRef plus threadRef, never display title; source has no provider/runtime/network/env imports | exact W14G package-root export; leaf forbidden imports that may be too broad for future composition modules but still valid for the leaf | Keep routing-authority invariants. Narrow package-root export checks and keep leaf isolation scoped to `topic-command-router-port.ts` only. |
| `tests/static/w14f-real-smoke-boundary.test.mjs` | keep/narrow | real smoke is opt-in; absent from default test/check; source has no env edge, provider imports, clients, or network calls; missing-port and ack/business vocabulary preserved | W14F filename and W14G export shape | Keep opt-in/no-default-network/no-secret-gate rule. Narrow W14F naming and exact package-root export checks after W18C/W18E1. Keep skipped/blocked real-smoke not pass. |
| `tests/static/w14g-real-transport-fanin-boundary.test.mjs` | narrow | package root remains inert, explicit, provider-free, leak-free, and no unsafe export names | exact W14B-W14F fan-in list and W14G labels | Keep package-root no-side-effect/no-provider/no-leak scans. Narrow exact W14G surface list after W17F1 introduces CD11.2 readiness projection. |
| `tests/static/w15a-oca-capability-descriptor-boundary.test.mjs` | parked-overlay-only/narrow | OCA wrapper source is descriptor-only; no provider SDK, no process.env, no runtime modules, no network/listeners/timers/clients, no unsafe public fields | exact root scripts, workspace list, lockfile shape, package skeleton details | Keep as parked-overlay expansion guard. Narrow root script, package-lock, and skeleton assertions out of active adapter static gating. Do not treat descriptor safety as adapter readiness evidence. |
| `tests/static/w15b-oca-session-model-boundary.test.mjs` | parked-overlay-only/narrow | session model has no imports, no provider/private core/runtime/network/env behavior, no unsafe public fields, dist-only unit import | exact oca-wrapper package metadata; root scripts/lockfile/docs/workflow topology assertions | Keep local no-provider/no-network/no-env/no-leak checks. Remove broad root/doc/workflow/script locks from OCA overlay tests in a reserved cleanup. |
| `tests/static/w15c-oca-session-store-boundary.test.mjs` | parked-overlay-only | session store has local-only imports, no provider/private core/runtime/network/env/timer behavior, no durable storage, no future OCA/client/approval/topic/domain behavior, no unsafe public fields | W15C-specific non-goal list | Keep as parked-overlay safety because it prevents OCA expansion. Do not use its in-memory store as adapter readiness evidence. |
| `tests/static/w15d-oca-fake-client-operation-handlers-boundary.test.mjs` | parked-overlay-only | fake OCA source has no provider/private core/runtime/network/env/filesystem behavior; avoids approval execution/topic/domain imports; no unsafe public fields | W15D-specific non-goal list | Keep as parked-overlay safety. If future OCA is unlocked after adapter-ready, replace with active OCA runtime contracts rather than weakening now. |
| `tests/static/w15e-oca-approval-runtime-tool-integration-boundary.test.mjs` | parked-overlay-only | approval runtime avoids provider/OCA SDK, package/runtime imports, process/network/listener/timer/server/client construction, token consumption, real runtime, credentials, sidecar/deployment, and unsafe fields | W15E local leaf import list | Keep as parked-overlay safety. It should remain a non-expansion guard until OCA is explicitly unlocked. |
| `tests/static/w15f-oca-presentation-topic-ui-boundary.test.mjs` | parked-overlay-only/defer | presentation imports only local session model and dist tests only | trivial `__noop__` boundary; little security coverage | Defer. Keep if harmless, but later static cleanup may replace it with a stronger parked-overlay package-root no-side-effect check or remove if redundant. |
| `tests/static/w15g-oca-domain-binding-fixture-boundary.test.mjs` | parked-overlay-only/narrow | LifeOS/domain source has no provider/OCA SDK, private core, wrapper internals, env/filesystem/network/runtime/listener/timer/client behavior; declares false ownership of OCA mechanics | exact root scripts, lockfile, workspace list, package skeleton | Keep overlay safety and false-ownership checks. Narrow root script/lockfile/workspace checks. Do not count domain fixture evidence toward adapter readiness. |
| `tests/static/w15h-oca-wrapper-fanin-readiness-boundary.test.mjs` | parked-overlay-only/narrow | OCA package root has no runtime side effects, forbidden imports, env reads, timers, clients, credentials, sidecar/deployment, or disabled prior tests | exact package-root export list and meaningful line count | Keep package-root no-side-effect and no-expansion checks. Narrow exact OCA leaf export list only if a later post-adapter-ready OCA unlock changes public overlay surfaces. |

## Stale assumptions that should not block CD11.2 work by default

The following assumptions are stale unless they directly protect a listed invariant:

- Wave-number topology labels such as W7, W8, W13, W14G, W15A-H as permanent architecture names.
- Exact root `package.json` script object equality inside OCA/domain static tests.
- Exact `package-lock.json` workspace-entry equality inside overlay tests.
- Exact package skeleton lists where later W17/W18 work is expected to add modules or tests.
- Exact package-root export line counts or export ordering for roots that later Workers explicitly reserve.
- Acceptance-file allowlists tied to W8/W9 inert real-smoke names instead of CD11.2 real-smoke gate semantics.
- Assertions that a pre-W17 contract, topic binding, readiness, or callback surface must be absent after a later contract-owned Worker adds it.
- Treating package-root exports alone as readiness evidence.
- Treating skipped/blocked real-smoke posture as a pass.
- Treating OCA wrapper or LifeOS/domain fixtures as generic adapter readiness evidence.

## Invariants that must continue to block work

| Invariant | Current partial coverage | Future target coverage |
|---|---|---|
| No private hazeteam-core imports | `repository-boundary`, `s02-contract-fanin-boundary`, `w12-core-public-import-boundary`, W13/W14/W15 files | One repository-wide scanner plus package-local leaf scanners for newly owned W17/W18 modules. |
| No provider SDK imports in safe roots | W13 plugin runtime; W14 Telegram transport; W15 OCA/domain parked-overlay tests | A package-root/source-tree provider SDK matrix covering adapter, runtime, Telegram transport, testkit, and parked overlays. |
| No default network behavior | W8/W13/W14/W15 static tests; W14F opt-in smoke check | W17/W18 static and acceptance tests must prove default package imports and default `npm run check` do not perform network calls. |
| No `process.env` reads in libraries | W8/W13/W14/W15 source scans | W18A may introduce runtime value boundary interfaces, but library code must still receive values by injection and not read env directly. |
| No raw payload or unsafe public DTO leaks | `repository-boundary`, `s02-contract-fanin-boundary`, W14C/W14G, W15 overlay scans, existing fake E2E no-leak acceptance | W17H5 no-leak matrix should become the primary acceptance evidence, with static tests guarding public names and DTO fields. |
| Permission-before-token-consume | W14D static test and callback acceptance/unit coverage | W17E/W17H3 should provide semantic callback pipeline evidence for permission granted, permission denied, and consume skipped on denial. |
| Provider acknowledgement is not business success | W14C delivery boundary, W14D unit expectation, W14F ack/business vocabulary | W17D/W17H2 should assert provider ack/business split across outbound delivery results and provider failure redaction. |
| Package-root no side effects | W13, W14G, W15H partial package-root checks | W17H6 should cover all public package roots, including parked overlays as non-evidence safety roots. |
| OCA/LifeOS parked-overlay safety | W15A-H and W15G tests | Keep as non-expansion guardrails until an explicit downstream unlock after adapter-ready gate. |

## Replacement targets for W17 and W18

### W17 leaf and integration Workers

W17 Workers should not edit existing broad static tests unless their prompt explicitly reserves the file. Preferred behavior:

- Add or update package-local unit tests for owned modules.
- Add local static tests only when the static file is uniquely owned and does not scan unrelated sibling surfaces.
- Avoid root `package.json`, package-lock, CI, release docs, and broad `tests/static/**` cleanup.
- Preserve no-provider-SDK, no-network, no-env, no-private-core, and no-leak scans for any new source module.
- Use public package-root exports only when the prompt reserves the package root. Otherwise import owned modules through existing public surfaces or wait for fan-in/release-gate work.
- For callback work, treat opaque callback tokens as safe handles, not raw callback payload DTOs.

### W17H acceptance Workers

The Wave 2.5 acceptance files should become the main evidence layer for adapter fake E2E readiness:

| Worker | Owned evidence | Static cleanup impact |
|---|---|---|
| W17H1 | inbound provider-shaped update to safe event to topic route to command intent | Enables W14B/W14E exact topology assertions to be narrowed to no-leak and routing-authority invariants. |
| W17H2 | outbound render to delivery request to provider ack/business split | Enables W14C/W14F delivery/ack assertions to move from source-string checks to behavior evidence. |
| W17H3 | callback permission to token verify/consume to safe response | Enables W14D source-order heuristic to be replaced by semantic permission-before-consume evidence. |
| W17H4 | durable replay and idempotency matrix | Enables W7 topology assertions to be replaced with durable-state readiness evidence. |
| W17H5 | no-leak acceptance matrix | Becomes primary public-output no-leak evidence; static tests remain name/import guardrails. |
| W17H6 | package-root no-side-effect matrix | Becomes primary package-root inertness evidence across active packages and parked overlays. |

### W18 Workers

W18 should close static cleanup only after W17 evidence exists:

1. W18A and W18B may add runtime value and provider client port interfaces, but must not add SDK/client construction, real credential loading, or default network behavior to safe roots.
2. W18C may refine opt-in secret-gated real smoke, but real smoke must remain outside default `npm run check` and must classify skipped/blocked as not pass.
3. W18E1 should own broad static/CI release-gate cleanup and may replace W7/W8/W13/W14/W15 topology locks with CD11.2 invariant matrices.
4. W18E2 may update docs after evidence is known.
5. W18E3 is the only slice that may issue the final adapter-ready-for-real-system-integration claim.

## Safe cleanup sequencing

1. Do not delete or weaken an old static test until a replacement invariant or acceptance evidence exists.
2. When a test mixes invariant and topology assertions, split the invariant first, then remove the topology assertion in the same reserved cleanup slice or a later fan-in cleanup.
3. When a test scans broad repository state, make it report invariant violations only; avoid enforcing exact phase-era file counts, exact root scripts, or package-lock contents.
4. When adding static coverage for W17/W18, use one new test file per owned concern where possible.
5. If a Worker discovers it needs to edit a broad static test, package root, `package.json`, CI workflow, or release classifier doc without explicit reservation, it must stop that part and report the need for a reserved cleanup/fan-in slice.
6. Preserve skipped/blocked real-smoke classification. Do not convert opt-in smoke posture into default gate evidence.
7. Preserve parked-overlay wording: OCA and LifeOS tests may prevent unsafe expansion, but they never satisfy adapter readiness requirements.

## Recommended future cleanup buckets

| Bucket | Candidate files | Owner timing | Outcome |
|---|---|---|---|
| Repository invariant scanner | `repository-boundary.test.mjs`, `s02-contract-fanin-boundary.test.mjs`, `w12-core-public-import-boundary.test.mjs` | W18E1 or dedicated static cleanup | One stable scanner for private core imports, protected assignment markers, unsafe public field names, and raw payload field names. |
| Adapter composition cleanup | `w7-*`, `w8-*`, `s02-*` | After W17B/W17G/W17H4 | Replace historical leaf/barrel lists with adapter composition and durable readiness invariants. |
| Plugin runtime cleanup | `w13-plugin-runtime-fanin-boundary.test.mjs` | After W17A | Replace W13 public surface assertions with runtime composition/profile/readiness invariants. |
| Telegram transport cleanup | `w14-*` | After W17C-W17F and W17H1-W17H3 | Preserve no-provider/no-network/no-env/no-leak/ack/permission/routing invariants; remove exact W14 fan-in topology. |
| Real-smoke gate cleanup | `w14f-*`, W8/W9 acceptance allowlist assertions | W18C/W18E1 | Express real smoke as opt-in, secret-gated, redacted, and non-default; skipped/blocked is not pass. |
| Parked overlay cleanup | `w15a-*` through `w15h-*`, W15G domain test | W18E1 or later post-adapter-ready unlock | Keep no-expansion guardrails; remove root script/lockfile topology locks; never count overlay tests as adapter readiness evidence. |
| Package-root no-side-effect matrix | W13/W14G/W15H plus new W17H6 | W17H6 then W18E1 | W17H6 becomes acceptance evidence; static tests become guardrails against side effects and unsafe exports. |
| No-leak matrix | repository/static no-leak scans plus W17H5 | W17H5 then W18E1 | W17H5 becomes behavior evidence; static tests enforce unsafe public names and raw DTO field bans. |

## Non-goals for W16F

- No source changes.
- No test edits.
- No CI changes.
- No package-root edits.
- No package metadata changes.
- No release readiness claim.
- No OCA runtime expansion.
- No LifeOS/domain behavior expansion.
- No sidecar, deployment runtime, production provider runtime, or real-system integration implementation.
