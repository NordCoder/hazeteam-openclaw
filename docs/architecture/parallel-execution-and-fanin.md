# Parallel execution and fan-in policy

## Problem

Parallel slices can be semantically independent but still conflict when they edit shared files such as barrels, export snapshots, or global static boundary tests.

The project therefore separates implementation work from fan-in work.

## Two graphs before every wave

Before issuing worker prompts, the Orchestrator must build two graphs.

### Dependency graph

A slice can start only when all required contracts/behavior are already merged into `main`.

Example: a mapper can depend on channel event contracts and topic binding, but must not import a sibling mapper branch.

### File conflict graph

Two slices can run in parallel only when their allowed files are disjoint.

If two slices need the same file, one of these must happen:

1. move that shared file change into a later fan-in slice;
2. run the slices sequentially;
3. split the shared file into per-domain local barrels before parallel work begins.

## Default no-shared-files rule

Ordinary implementation slices must not edit:

```text
packages/openclaw-adapter/src/index.ts
packages/openclaw-adapter/src/contracts/index.ts
packages/openclaw-testkit/src/index.ts
packages/openclaw-adapter/tests/unit/public-barrel-contracts.test.mjs
tests/static/repository-boundary.test.mjs
```

Worker prompts must list these as forbidden unless the task is explicitly a fan-in/export/static boundary task.

## Fan-in slice responsibilities

A fan-in slice may:

- add or update public barrels;
- add public export snapshots;
- consolidate static boundary rules after multiple leaves are merged;
- add package index exports;
- update README status notes;
- ensure merged modules are visible through public entrypoints.

A fan-in slice must not:

- add new product behavior;
- silently change leaf implementation semantics;
- introduce real provider wiring;
- implement future phases.

## Merge workflow

For a parallel batch:

```text
1. Launch all leaf workers from the same current main.
2. Review each leaf branch independently.
3. Merge leaf branches in any order only if their changed files are disjoint.
4. If leaf branches are not disjoint, stop and create/update a fan-in plan before merging more.
5. Launch fan-in only after all leaves are merged.
6. Merge fan-in after CI and orchestrator review.
```

## Prompt requirements

Every implementation worker prompt must include:

- explicit allowed files;
- explicit forbidden shared files;
- sibling branch dependency ban;
- statement that public exports/static snapshots are handled by fan-in unless explicitly scoped.

Every fan-in prompt must include:

- list of already merged leaves;
- list of shared files it may update;
- expected public exports;
- static boundary invariants;
- non-goal that it must not implement new behavior.

## Acceptance rule

A wave is complete only when:

- all leaf branches are merged;
- fan-in branch is merged;
- public barrels expose intended modules;
- static boundary tests reflect all merged modules;
- no future-phase files/directories appeared accidentally;
- CI is green or tooling limitations are explicitly understood.
