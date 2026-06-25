# File ownership matrix — CD11.2

## Purpose

This matrix defines default file ownership for W17/W18 Worker prompts. It is a planning and reservation document, not an implementation report and not a readiness claim.

The default rule is strict:

```text
No Worker may edit package roots, package READMEs, global docs, static topology files, root scripts, workflows, package metadata, release classifier docs, or shared acceptance files unless the prompt explicitly reserves that surface.
```

## Reservation levels

| Level | Name | Meaning | Parallel safety |
|---|---|---|---|
| 0 | no shared files | Worker edits only owned source/docs/test leaves | parallel-safe when owned paths are disjoint |
| 1 | local barrel | Worker may create or update a barrel inside its owned directory | parallel-safe if no sibling owns the same directory |
| 2 | package-root export slot | Worker may edit one package root and one named export group | serialized per package root/export slot |
| 3 | global docs reservation | Worker may edit assigned global docs or named sections | serialized per path/section |
| 4 | release classifier reservation | Worker may update current-state, release checklist, limitations, final readiness classification, or release-gate summary | one active Worker at a time |

If a prompt does not name a reservation level, treat the slice as Level 0.

## Package-root rules

Package roots include, at minimum:

| Package root | Default policy | Allowed owner |
|---|---|---|
| `packages/openclaw-plugin-runtime/src/index.ts` | no edit unless reserved | W17A or a later explicit package-root fan-in |
| `packages/openclaw-adapter/src/index.ts` | no edit unless reserved | one reserved W17B/W17G slot or a later explicit package-root fan-in |
| `packages/openclaw-telegram-transport/src/index.ts` | no edit unless reserved | one reserved W17C/W17D/W17E/W17F1 slot or a later explicit package-root fan-in |
| `packages/openclaw-testkit/src/index.ts` | no edit unless reserved | one reserved W17G slot or a later explicit package-root fan-in |
| `packages/oca-wrapper/src/index.ts` | parked overlay; no adapter-readiness implementation | only explicit compile/no-leak/parked-status fix slices |
| `packages/domain-lifeos/src/index.ts` | parked overlay; no adapter-readiness implementation | only explicit compile/no-leak/parked-status fix slices |

Allowed prompt values:

```text
package_root_policy: none
package_root_policy: local-barrel-only
package_root_policy: reserved
package_root_policy: deferred
package_root_policy: serialized
```

`package_root_policy: reserved` must also state:

```text
reserved_package_root:
reserved_export_slot:
```

A Worker that discovers it needs an unreserved package root must stop that part of the work, finish only safe owned work if possible, and report the needed shared file.

## Wave 2 package ownership

### Runtime lane

| Slice | Owned package/directories | Package root | Shared files forbidden by default |
|---|---|---|---|
| W17A | `packages/openclaw-plugin-runtime/**` | reserved only if prompt grants `packages/openclaw-plugin-runtime/src/index.ts` | root `package.json`, package README, workflows, release docs |

### Adapter foundation lane

| Slice | Owned area | Preferred local-barrel pattern | Package root |
|---|---|---|---|
| W17B1 | adapter mapping and command files assigned by prompt | local barrels under owned mapping/command directories | deferred unless reserved |
| W17B2 | adapter host/runtime files assigned by prompt | local barrels under owned host/runtime directories | deferred unless reserved |
| W17B3 | adapter rendering/delivery files assigned by prompt | local barrels under owned rendering/delivery directories | deferred unless reserved |
| W17B4 | adapter callbacks/permissions/approvals files assigned by prompt | local barrels under owned callback/permission/approval directories | deferred unless reserved |

Only one W17B lane may own `packages/openclaw-adapter/src/index.ts` at a time. If several W17B lanes need root exports, use local barrels first and schedule a narrow root-export fan-in.

### Telegram transport lane

| Slice | Owned area | Preferred local-barrel pattern | Package root |
|---|---|---|---|
| W17C | channel-event/topic-routing files assigned by prompt | local inbound/topic barrels | deferred unless reserved |
| W17D | outbound delivery files assigned by prompt | local delivery barrels | deferred unless reserved |
| W17E | callback permission files assigned by prompt | local callback barrels | deferred unless reserved |
| W17F1 | config/readiness files assigned by prompt | local readiness barrels | deferred unless reserved |

Only one Telegram transport lane may own `packages/openclaw-telegram-transport/src/index.ts` at a time.

### Storage and testkit lane

| Slice | Owned area | Package roots |
|---|---|---|
| W17G1 | topic binding storage/fakes assigned by prompt | adapter/testkit roots deferred unless reserved |
| W17G2 | callback token storage/fakes assigned by prompt | adapter/testkit roots deferred unless reserved |
| W17G3 | delivery attempt storage/fakes assigned by prompt | adapter/testkit roots deferred unless reserved |
| W17G4 | inbound idempotency storage/fakes assigned by prompt | adapter/testkit roots deferred unless reserved |

W17G slices must not introduce production durable backends, network behavior, or credential loading.

## Wave 2.5 acceptance ownership

Each acceptance Worker owns exactly one file and must not append to a shared matrix file.

| Slice | Unique file | Concern |
|---|---|---|
| W17H1 | `tests/acceptance/w17h1-inbound-fake-e2e.test.mjs` | inbound provider-shaped update to safe command intent |
| W17H2 | `tests/acceptance/w17h2-outbound-fake-e2e.test.mjs` | render to delivery request to provider ack/business split |
| W17H3 | `tests/acceptance/w17h3-callback-permission-fake-e2e.test.mjs` | callback permission before token consume |
| W17H4 | `tests/acceptance/w17h4-durable-replay-fake-e2e.test.mjs` | durable replay and idempotency safety |
| W17H5 | `tests/acceptance/w17h5-no-leak-matrix.test.mjs` | public output no-leak and JSON serialization |
| W17H6 | `tests/acceptance/w17h6-package-root-no-side-effect.test.mjs` | package-root import no effects, no network, no secrets |

Acceptance prompts may read implementation files but must not change implementation behavior unless explicitly assigned. W17H6 may check OCA/domain package roots only to assert they are not adapter readiness evidence.

## Wave 3 ownership

| Slice | Owned area | Shared-file policy |
|---|---|---|
| W18A | runtime-value and credential resolver interfaces assigned by prompt | no package root, root script, workflow, or release classifier edit unless reserved |
| W18B | provider client port interfaces assigned by prompt | no SDK/client construction in safe roots; no package root unless reserved |
| W18D | listener/webhook/polling interfaces or docs assigned by prompt | no daemon, no default network, no package root unless reserved |
| W18F1 | runtime edge docs assigned by prompt | docs reservation only; no release classifier claim |

W18A/W18B vocabulary conflicts should be solved by serialization or a coordination doc, not by importing unmerged sibling code.

## Wave 4 ownership

| Slice | Owned area | Serialized surfaces |
|---|---|---|
| W18C | smoke-local files/tests assigned by prompt | real-smoke files only; no default CI network; no release classifier unless assigned |
| W18E1 | release gate static/CI closure | root scripts, `package.json`, `package-lock.json`, workflows, broad static tests |
| W18E2 | release docs closure | current-state docs, release checklist, known limitations, package READMEs if reserved |
| W18E3 | final adapter readiness report | final evidence report or PR/report body; final classifier |

Only W18E3 may make the final `adapter-ready-for-real-system-integration` claim. No Wave 4 slice may claim production readiness unless a separate production-candidate scope explicitly implements and tests production runtime/deployment behavior.

## Package README reservation rules

Package READMEs are shared documentation surfaces. They are not package-local free-for-all files in parallel waves.

| README | Default policy | Possible reserved owner |
|---|---|---|
| `packages/openclaw-plugin-runtime/README.md` | no edit unless reserved | W17A for package-local truth, W18E2 for final docs closure |
| `packages/openclaw-adapter/README.md` | no edit unless reserved | a serialized adapter docs slice, W18E2, or one explicitly named W17B/W17G Worker |
| `packages/openclaw-telegram-transport/README.md` | no edit unless reserved | one explicitly named W17C/W17D/W17E/W17F1 Worker, W18F1, or W18E2 |
| `packages/openclaw-testkit/README.md` | no edit unless reserved | one explicitly named W17G/W17H Worker or W18E2 |
| `packages/oca-wrapper/README.md` | parked overlay docs only | W16B/W18E2 or explicit parked-status docs slice |
| `packages/domain-lifeos/README.md` | parked overlay docs only | W16B/W18E2 or explicit parked-status docs slice |

A package README prompt must state either exact sections or exclusive file ownership. A Worker must not update package README release claims from local evidence alone.

## Global docs reservation rules

Global docs include:

- `README.md`
- `docs/README.md`
- `docs/index.md`
- `docs/roadmap/current-development-state.md`
- `docs/roadmap/implementation-waves.md`
- `docs/roadmap/file-ownership-matrix.md`
- `docs/roadmap/cd11.2-worker-ownership-matrix.md`
- `docs/architecture/**`
- `docs/release/**`

Global docs require either exact-path reservation or named-section reservation.

Release classifier docs are stricter than ordinary docs. `docs/roadmap/current-development-state.md`, `docs/release/release-checklist.md`, `docs/release/known-limitations.md`, and any final readiness report must be serialized under W18E ownership when used for final classification.

## Static test ownership

Static tests must protect durable invariants:

- no private `hazeteam-core` imports;
- no copied core source;
- no raw provider/callback payload leaks in public DTOs;
- no token, secret, credential, path, stack, SDK/client, or provider object leaks;
- no package-root side effects;
- no default network or secret requirement;
- permission-before-token-consume;
- provider acknowledgement distinct from business success;
- OCA/LifeOS parked overlays not used as adapter readiness evidence.

Static tests must not freeze temporary topology, temporary worker branch layout, or orchestration bookkeeping. Broad global static edits must serialize, normally under W16F planning follow-up or W18E1 release-gate closure.

## Root scripts, lockfile, workflow, and release classifier serialization

The following surfaces are single-owner during any parallel batch:

| Surface | Rule | Likely owner |
|---|---|---|
| root `package.json` scripts | serialize; no default network/secrets | W18E1 or explicit tooling slice |
| `package-lock.json` | serialize with package metadata changes | same Worker that owns package metadata |
| `scripts/**` | serialize root script behavior | W18E1 or explicit tooling slice |
| `.github/workflows/**` | serialize workflow changes | W18E1 or explicit CI slice |
| release checklist/current-state/known-limitations | serialize classifier changes | W18E2/W18E3 |

No implementation leaf may silently change default `npm run check` behavior.

## Parked overlays

OCA and LifeOS are parked downstream overlays before the adapter-ready gate. Default policy:

- no active OCA implementation slices in W17/W18;
- no active LifeOS/domain behavior slices in W17/W18;
- no OCA credential loading, real OCA client execution, or production OCA runtime;
- no LifeOS product agents, product command catalogs, or product workflows;
- no use of parked overlay tests, fixtures, package roots, or docs as proof of adapter readiness.

Allowed only when explicitly assigned:

- compile/test fixes that keep main green;
- no-leak/security fixes;
- docs that clarify parked downstream status;
- static checks that prevent accidental overlay expansion.

## Fan-in triggers

A follow-up fan-in or serialization slice is likely if:

- several Wave 2 slices need one package root export;
- several package README updates must be reconciled;
- acceptance evidence needs one release-facing summary;
- broad static topology tests need cleanup after implementation lanes;
- root scripts, `package-lock.json`, workflows, or default `check` must change;
- W18 docs need final readiness classification after real-smoke evidence.

No fan-in is required for isolated local barrels, unique acceptance files, or docs-only reservation updates that do not overlap.