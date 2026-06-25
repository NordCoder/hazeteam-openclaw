# CD11.2 implementation waves — max-parallel adapter readiness

## Purpose

This roadmap is the repository-facing W16-W18 execution plan for CD11.2. It replaces the older historical S00/W3-W10 planning view for current Worker launch purposes.

The active objective is to make the generic OpenClaw/Telegram adapter ready for real-system integration. This is not a production-readiness claim and does not unlock OCA, LifeOS, sidecar, deployment runtime, production provider runtime, or product-domain behavior.

## Operating rules

Run slices in parallel only when all of these are true:

- changed files are disjoint or explicitly section-reserved;
- the Worker does not depend on unmerged sibling branch code;
- package-root edits are explicitly reserved;
- global docs and release classifier files are explicitly reserved;
- default checks remain no-network and no-secret;
- OCA and LifeOS remain parked downstream overlays.

Fan-in is optional. Use fan-in only for actual shared-file conflicts, release classification, root script/workflow changes, broad static topology changes, or package-root export conflicts that were not reserved up front.

## Reservation policy summary

- Package roots such as `packages/*/src/index.ts` default to no edit.
- Local barrels under owned directories are preferred for Wave 2 implementation lanes.
- Root scripts, `package.json`, `package-lock.json`, and `.github/workflows/**` are serialized surfaces.
- Package READMEs are per-package shared docs and require explicit reservation.
- Global release classifier files are serialized; only release-closure Workers may make final readiness claims.
- Acceptance Workers must each own one unique acceptance file.
- Static tests protect durable invariants, not temporary topology.

See `docs/roadmap/file-ownership-matrix.md` and `docs/roadmap/cd11.2-worker-ownership-matrix.md` for the detailed ownership matrix.

## Wave 0 — audit baseline

Status: complete through W16A6 consolidation.

| Slice | Shape | Owned area | Output |
|---|---|---|---|
| W16A1 | audit | `packages/openclaw-adapter/**` | inventory report |
| W16A2 | audit | `packages/openclaw-plugin-runtime/**` | inventory report |
| W16A3 | audit | `packages/openclaw-telegram-transport/**` | inventory report |
| W16A4 | audit | `tests/**`, `.github/**`, root scripts | inventory report |
| W16A5 | audit | `docs/**`, package READMEs | inventory report |
| W16A6 | coordination | `docs/roadmap/w16a6-audit-consolidation.md` | consolidated audit artifact |

Wave 0 produced evidence and gap mapping only. It did not implement runtime behavior.

## Wave 1 — contract and status reset

Status: current parallel docs wave.

| Slice | Shape | Primary owned area | Shared-file posture | Blocks |
|---|---|---|---|---|
| W16B — Project Status Reset Docs | contract | adapter-first status/current-state docs | reserved docs only | W17 prompts that rely on status docs |
| W16C — Runtime Topology Alignment | contract | topology/runtime architecture docs | reserved architecture docs only | W17A/W17B/W17C-W17F topology prompts |
| W16D — Readiness Ladder Integration | contract | readiness ladder and release vocabulary docs | release vocabulary reservation only | W17F/W18E readiness prompts |
| W16E — Worker Ownership Matrix | contract/coordination | ownership/shared-file docs | ownership docs only | all W17/W18 file reservations |
| W16F — Static Boundary Cleanup Plan | contract/coordination | static-boundary planning docs | no test edits unless assigned | W17H/W18E static prompts |

Wave 1 may update docs but must not add runtime behavior, source behavior, package metadata, tests, CI, package roots, provider wiring, deployment runtime, or product overlays unless an individual prompt explicitly reserves that surface.

## Wave 2 — maximum parallel implementation lanes

Goal: fake-complete, no-leak, no-default-network adapter foundation. Wave 2 does not implement production runtime.

### Runtime lane

| Slice | Shape | Primary package | Primary ownership | Package-root policy |
|---|---|---|---|---|
| W17A — Plugin Runtime Composition | vertical-integration | `@hazeteam/openclaw-plugin-runtime` | `packages/openclaw-plugin-runtime/**` | may edit `packages/openclaw-plugin-runtime/src/index.ts` only if the prompt reserves the root/export slot |

W17A must not import provider SDKs, read runtime secrets, execute network calls, implement Telegram behavior, or implement OCA/LifeOS behavior.

### Adapter foundation lane

| Slice | Shape | Primary package | Primary ownership | Package-root policy |
|---|---|---|---|---|
| W17B1 — Adapter Inbound Composition | vertical-integration | `@hazeteam/openclaw-adapter` | mapping/command files assigned by prompt | no adapter root edit unless explicitly reserved |
| W17B2 — Adapter Host/Command Facade | vertical-integration | `@hazeteam/openclaw-adapter` | host/runtime files assigned by prompt | no adapter root edit unless explicitly reserved |
| W17B3 — Adapter Rendering/Delivery Composition | vertical-integration | `@hazeteam/openclaw-adapter` | rendering/delivery files assigned by prompt | no adapter root edit unless explicitly reserved |
| W17B4 — Adapter Callback/Approval Composition | vertical-integration | `@hazeteam/openclaw-adapter` | callbacks/permissions/approvals files assigned by prompt | no adapter root edit unless explicitly reserved |

W17B lanes may run in parallel only if their files are isolated. They should prefer local barrels under owned directories. If more than one W17B lane needs `packages/openclaw-adapter/src/index.ts`, serialize the export slot or create a narrow package-root fan-in after safe leaves land.

### Telegram transport lane

| Slice | Shape | Primary package | Primary ownership | Package-root policy |
|---|---|---|---|---|
| W17C — Telegram Inbound Pipeline | vertical-integration | `@hazeteam/openclaw-telegram-transport` | channel event and topic routing files assigned by prompt | no telegram root edit unless explicitly reserved |
| W17D — Telegram Outbound Delivery Pipeline | vertical-integration | `@hazeteam/openclaw-telegram-transport` | delivery port/render boundary files assigned by prompt | no telegram root edit unless explicitly reserved |
| W17E — Telegram Callback Permission Pipeline | vertical-integration | `@hazeteam/openclaw-telegram-transport` | callback handler/permission files assigned by prompt | no telegram root edit unless explicitly reserved |
| W17F1 — Telegram Config/Readiness Projection | vertical-integration | `@hazeteam/openclaw-telegram-transport` | config/readiness projection files assigned by prompt | no telegram root edit unless explicitly reserved |

W17C-W17F1 must keep raw provider payloads quarantined, keep provider acknowledgement separate from business success, preserve permission-before-token-consume, and avoid `process.env` reads in library code.

### Storage and testkit lane

| Slice | Shape | Primary packages | Primary ownership | Package-root policy |
|---|---|---|---|---|
| W17G1 — Topic Binding Store Contract | vertical-integration | adapter/testkit | topic binding storage/fakes assigned by prompt | no broad root edit unless explicitly reserved |
| W17G2 — Callback Token Store Contract | vertical-integration | adapter/testkit | callback token storage/fakes assigned by prompt | no broad root edit unless explicitly reserved |
| W17G3 — Delivery Attempt Store Contract | vertical-integration | adapter/testkit | delivery attempt storage/fakes assigned by prompt | no broad root edit unless explicitly reserved |
| W17G4 — Inbound Idempotency Store Contract | vertical-integration | adapter/testkit | inbound idempotency storage/fakes assigned by prompt | no broad root edit unless explicitly reserved |

W17G lanes must not add production durable backends. They may define deterministic fakes and safe records only when assigned.

## Wave 2.5 — parallel acceptance matrix

Goal: prove the Wave 2 implementation lanes together through one acceptance concern per Worker. Acceptance Workers must not become broad fan-in Workers.

| Slice | Shape | Unique owned file | Implementation writes |
|---|---|---|---|
| W17H1 — Inbound Acceptance E2E | acceptance | `tests/acceptance/w17h1-inbound-fake-e2e.test.mjs` | no unless explicitly assigned |
| W17H2 — Outbound Acceptance E2E | acceptance | `tests/acceptance/w17h2-outbound-fake-e2e.test.mjs` | no unless explicitly assigned |
| W17H3 — Callback Acceptance E2E | acceptance | `tests/acceptance/w17h3-callback-permission-fake-e2e.test.mjs` | no unless explicitly assigned |
| W17H4 — Durable Replay Acceptance E2E | acceptance | `tests/acceptance/w17h4-durable-replay-fake-e2e.test.mjs` | no unless explicitly assigned |
| W17H5 — No-Leak Acceptance Matrix | acceptance | `tests/acceptance/w17h5-no-leak-matrix.test.mjs` | no unless explicitly assigned |
| W17H6 — Package Root No-Side-Effect Matrix | acceptance/static | `tests/acceptance/w17h6-package-root-no-side-effect.test.mjs` | no unless explicitly assigned |

Acceptance Workers must not append to one shared acceptance file in parallel. OCA/domain roots may be checked only to prove they are not adapter readiness evidence.

## Wave 3 — real-edge preparation

Goal: prepare explicit runtime-value, provider-client, listener, webhook, and polling boundaries without turning default code paths into production runtime.

| Slice | Shape | Primary ownership | Package/root policy | Notes |
|---|---|---|---|---|
| W18A — Runtime Value Boundary | vertical-integration | credential resolver/runtime-value interfaces assigned by prompt | no root edit unless reserved | no secret values in public outputs |
| W18B — Provider Client Port Boundary | vertical-integration | provider client port interfaces assigned by prompt | no root edit unless reserved | no SDK/client construction in safe roots |
| W18D — Listener/Webhook/Polling Interface Design | contract/interface | listener/webhook/polling interfaces or docs assigned by prompt | no daemon unless assigned | no production runtime |
| W18F1 — Runtime Edge Docs Update | docs | runtime edge docs assigned by prompt | docs reservation only | no release claim |

W18A, W18B, W18D, and W18F1 may run in parallel only when vocabulary and files are isolated. If W18B needs concrete W18A types, serialize W18B after W18A or assign a type-compatible local adapter explicitly.

## Wave 4 — secret-gated smoke and release closure

Goal: classify the adapter honestly after Wave 2, Wave 2.5, and Wave 3 evidence. Wave 4 still does not imply production readiness.

| Slice | Shape | Primary ownership | Serialization |
|---|---|---|---|
| W18C — Secret-Gated Real Smoke Refinement | vertical-integration | smoke-local files/tests | after W18A/W18B; may run with W18E1 only if files are isolated |
| W18E1 — Release Gate Static/CI Closure | release-closure | release gate static/CI/root script evidence | serialize root scripts, workflows, package metadata, and broad static edits |
| W18E2 — Release Docs Closure | release-closure | final docs/current-state/limitations/package README updates | after evidence is known; serialize release classifier docs |
| W18E3 — Final Adapter Readiness Report | release-closure | final evidence report or PR/report body | last; only slice allowed to make final adapter-ready-for-real-system-integration claim |

W18C skipped or blocked smoke is not a real-provider pass. W18E2 may classify only the evidence actually proven. W18E3 is the final classifier.

## Parked overlays

Until the adapter reaches the adapter-ready-for-real-system-integration gate, no W16-W18 slice may implement or advance:

- OCA runtime behavior;
- real OCA client execution;
- OCA credential loading;
- LifeOS/domain-product behavior;
- product-specific agent catalogs;
- sidecar runtime;
- production deployment runtime.

Existing `packages/oca-wrapper/**` and `packages/domain-lifeos/**` files may receive compile/test/no-leak fixes or parked-status docs only when explicitly assigned. They must not be used as proof of adapter readiness.

## Fan-in triggers

Create a fan-in or serialization slice only when one of these happens:

- multiple Workers need the same package root or export slot;
- multiple Workers need the same package README or global doc section;
- release classifier docs require final evidence consolidation;
- root `package.json`, `package-lock.json`, scripts, or workflows must change;
- broad static topology tests need one coordinated cleanup;
- acceptance evidence must be summarized after W17H1-W17H6 land.

No fan-in is required merely because many Workers ran in parallel.