# Parallel execution and fan-in policy

## Purpose

Parallel slices can be semantically independent but still conflict when they edit shared files such as package roots, package READMEs, package manifests, export snapshots, global static tests, release classifier docs, status docs, CI, or aggregate indexes.

CD11.2 prefers maximum-safe parallelism, but parallelism does not relax architecture boundaries.

## Slice classes

| Slice class | May do | Must not do unless explicitly assigned |
| --- | --- | --- |
| audit-slice | Read source/docs/tests and write a bounded inventory report | Implement runtime behavior |
| contract-slice | Update topology/status/readiness/ownership docs in assigned files | Add source behavior, tests, package roots, CI, release claims outside reservation |
| vertical-integration-slice | Implement one bounded package path with local tests and local barrels when owned | Touch package roots or sibling files without reservation |
| package-integration-slice | Update a reserved package root export slot or local package integration surface | Add unrelated feature behavior |
| acceptance-slice | Add one uniquely owned acceptance test file | Edit shared acceptance matrix files or release classifiers |
| release-closure-slice | Classify final evidence, docs, CI, release gates when assigned | Claim readiness before evidence exists |

## Leaf and vertical slice responsibilities

A parallel leaf or vertical slice should:

- change only owned package files and local tests/docs assigned by its prompt;
- use already-merged base-branch files only;
- avoid sibling branch dependencies;
- avoid package-root edits unless `package_root_policy` reserves the exact root and export slot;
- avoid global static tests unless the prompt reserves the exact file;
- avoid release classifier/status docs unless explicitly assigned;
- preserve no-network, no-secret, no-client-construction default behavior;
- preserve OCA and LifeOS as parked downstream overlays.

A leaf may integrate locally when it owns the complete local surface. For example, a Worker may create a local barrel under an owned directory if the prompt allows that directory. It should not edit `packages/*/src/index.ts` unless that shared root is reserved.

## Fan-in slice responsibilities

A fan-in slice may add package-root exports, public export tests, shared static-boundary consolidation, README/status notes, release classifier updates, or docs indexes that make already-merged modules visible through public entrypoints.

A fan-in slice must not:

- add new product behavior;
- change leaf semantics;
- introduce provider SDK/client wiring in safe foundations;
- add default network behavior;
- implement OCA, LifeOS, sidecar, deployment runtime, or production provider runtime;
- claim adapter-ready-for-real-system-integration or production readiness unless it is the assigned release-closure slice and all evidence exists.

## Package-root policy

Package roots such as `packages/*/src/index.ts` are shared integration surfaces.

Allowed patterns:

~~~text
Pattern A: local barrel first
Worker creates or updates a local barrel under its owned directory. Package root export is deferred.

Pattern B: reserved package root slot
Worker owns one package root export slot and updates only that slot plus assigned tests/docs.

Pattern C: no package root change
Worker adds implementation and tests against owned leaf imports. Later integration exposes the public root.
~~~

If a Worker with `package_root_policy: none` discovers a missing root export, it should report the gap instead of editing the package root.

## W14G fan-in result

W14G was the fan-in after W14A-F. It exposed already implemented transport leaves through `packages/openclaw-telegram-transport/src/index.ts` and updated documentation to describe the W14 state.

The W14 fan-in state is:

- W14A config and redacted reference descriptors remain exported;
- W14B channel-event normalization is exported;
- W14C injected delivery boundary is exported;
- W14D callback handler boundary is exported;
- W14E topic command routing is exported;
- W14F real-smoke gate is exported;
- package metadata remains non-production-ready;
- default behavior remains no-network and no-effect.

The W14G fan-in checks protect package-root visibility while preserving no provider SDK import, no private core import, no network call, no production listener, and safe public output constraints.

W14G does not prove adapter-ready-for-real-system-integration by itself. It is transport package visibility and safety evidence only.

## W16-W18 topology implications

W16 contract/status reset slices may edit only their reserved docs. They must not add runtime behavior.

W17 implementation lanes should avoid shared roots by default:

- W17A owns plugin-runtime composition/profile/tool-capability implementation files reserved by its prompt;
- W17B lanes own adapter composition lanes and should prefer local barrels unless a root slot is reserved;
- W17C-W17F lanes own Telegram transport pipeline/config/readiness lanes and should prefer local barrels unless a root slot is reserved;
- W17G lanes own adapter/testkit store contracts and fakes without production durable backend claims;
- W17H lanes each own one acceptance file;
- W18A/W18B own runtime-value and provider-client boundary files without release-classifier overclaim;
- W18 release closure owns final evidence classification when assigned.

## Shared file stop rule

Stop and report a reservation/fan-in need if the slice requires any of these without explicit assignment:

- `packages/*/src/index.ts`;
- package README files;
- `package.json` or lockfile;
- `.github/**`;
- `scripts/**`;
- broad `tests/static/**` files;
- shared `tests/acceptance/**` matrix files;
- root README, docs index, current-state docs, or release classifier docs;
- OCA, LifeOS, sidecar, deployment, or production provider runtime files.

## Merge workflow

For a parallel batch:

~~~text
1. Launch leaves from the same verified base when possible.
2. Review each branch independently.
3. Verify changed files, forbidden files, and package-root policy.
4. Merge clean leaves only after CI and Orchestrator review.
5. Launch fan-in only when shared visibility or final classification is truly required.
6. Merge fan-in after CI and Orchestrator review.
~~~

A fan-in is not mandatory after every parallel batch. It is needed only when shared files, aggregate public roots, global static checks, or final readiness claims require serialization.

## Current non-goals

This policy does not implement OCA wrapper mechanics, domain packages, sidecar behavior, deployment runtime, production provider runtime, listener/webhook/polling runtime, production credential loading, or production reference-value loading.

It also does not authorize provider SDK/client construction in safe foundation package roots. Provider clients belong behind explicit injected real-edge or deployment boundaries in later scoped phases.
