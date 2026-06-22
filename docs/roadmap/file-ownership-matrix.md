# File ownership matrix

This matrix is used by the Orchestrator before issuing parallel worker prompts.

## Shared files: fan-in only by default

| File | Owner | Ordinary slices |
| --- | --- | --- |
| `packages/openclaw-adapter/src/index.ts` | fan-in/export slices | forbidden |
| `packages/openclaw-adapter/src/contracts/index.ts` | contract fan-in slices | forbidden |
| `packages/openclaw-testkit/src/index.ts` | testkit fan-in slices | forbidden |
| `packages/openclaw-adapter/tests/unit/public-barrel-contracts.test.mjs` | fan-in/export snapshot slices | forbidden |
| `tests/static/repository-boundary.test.mjs` | static boundary fan-in slices | forbidden |

## Adapter implementation areas

| Area | Allowed owner slices | Notes |
| --- | --- | --- |
| `src/contracts/*.ts` | contract slices | shared `contracts/index.ts` only in fan-in |
| `src/binding/**` | topic binding slices | no mapper/delivery/runtime behavior |
| `src/commands/**` | UI/command descriptor slices | no command router unless scoped |
| `src/mapping/**` | inbound mapper slices | depends on binding/contracts |
| `src/rendering/**` | renderer slices | no delivery side effects |
| `src/host/**` | host factory slices | public `hazeteam-core` imports only |
| `src/permissions/**` | permission evaluator slices | no token consume side effects |
| `src/delivery/**` | delivery pump slices | no real provider wiring before real OpenClaw phase |
| `src/callbacks/**` | callback flow slices | permission-before-consume rule |
| `src/runtime/**` | runtime bridge slices | fake/runtime-safe until real phase |
| `src/approvals/**` | approval bridge slices | tokenized buttons, safe results |
| `src/storage/**` | durable store slices | no store outside scoped durable waves |
| `src/openclaw/**` | real OpenClaw wiring slices | blocked until fake E2E/no-leak is green |

## Testkit areas

| Area | Allowed owner slices | Notes |
| --- | --- | --- |
| `packages/openclaw-testkit/src/events/**` | fake event factory slices | deterministic factories only |
| `packages/openclaw-testkit/src/fakes/**` | fake runtime/delivery/approval slices | no network, no credentials |
| `packages/openclaw-testkit/src/harness/**` | integration harness slices | after needed fakes exist |
| `packages/openclaw-testkit/src/assertions/**` | assertion helper slices | no production imports from tests |

## Docs areas

Docs-only slices may edit `docs/**`, but they must not modify package/source/test files. If docs need to reflect source changes in the same wave, use a docs fan-in slice after implementation merges.

## Conflict decision table

| Situation | Decision |
| --- | --- |
| Two leaves edit different domain directories | run in parallel |
| Two leaves edit same barrel/export snapshot | move shared edit to fan-in |
| A leaf needs sibling branch source | not parallel-safe; wait for sibling merge |
| Static boundary must change for multiple leaves | fan-in owns the static boundary |
| CI fails due to missing export after leaf merge | expected if export is fan-in-owned; do not merge dependent slices until fan-in |
