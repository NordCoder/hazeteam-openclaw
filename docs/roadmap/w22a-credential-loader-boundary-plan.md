# W22A Credential Loader Boundary Plan

## Status

W22A is a planning-only roadmap slice for future credential and configuration loading work. It adds no source behavior, tests, package exports, CI, scripts, credential access, secret access, runtime provider configuration, deployment behavior, or production readiness.

The repository remains adapter-ready-for-real-system-integration under explicit gates and not production-ready. This plan does not upgrade the repository posture, does not make real-system integration automatic, and does not claim production credential loading readiness.

## Planning authority and limits

This document is an ownership and fan-in plan for later W22 work. Future implementation must continue to obey the contract-pack boundaries for secrets, config, no-leak public output, raw payload containment, runtime-only values, real-smoke gating, release-gate honesty, and max-parallel shared-file reservations.

W22A itself does not define an executable credential loader API. It defines the vocabulary and boundaries that later explicitly scoped Workers may use when implementing isolated leaves.

## Future credential-loader ownership boundaries

### Allowed future contract vocabulary

Future W22 implementation slices may introduce bounded public contract vocabulary for credential/config loading only when scoped by their prompts. Allowed vocabulary is limited to safe descriptors, references, readiness classifications, and port names that cannot carry secret values.

Allowed future terms include:

| Vocabulary area | Allowed meaning | Public safety rule |
|---|---|---|
| credential reference | A bounded identifier for a required credential or config dependency | Must not contain a secret value, raw environment value, raw file path, raw endpoint, or reversible credential material |
| credential descriptor | A redacted public description of a credential dependency | Must be JSON-safe and limited to safe kind, source class, status, and redacted reason fields |
| secret handle | An opaque runtime-only value used only behind an explicitly scoped secret-gated edge | Must never be JSON-safe, logged, persisted, exposed to domain packages, or returned in public DTOs |
| credential readiness | A safe readiness projection for missing, unavailable, invalid, redacted, dry-run, or explicitly ready states | Must not imply a real-provider pass or production readiness |
| credential loader port | A narrow injected boundary for future credential resolution | Must not read from default process state unless a later prompt explicitly scopes a secret-gated real edge |
| fake/inert credential source | A deterministic no-secret source for tests, fakes, or documentation-safe surfaces | Must be explicit, inert, redacted, no-network, and not production-like |
| secret-gated real edge | A future deployment/plugin edge that may resolve real secret handles only after explicit gates | Must be opt-in, secret-gated, no-leak, and outside default check/test paths |

Future naming should keep provider acknowledgement, business success, credential readiness, runtime readiness, deployment readiness, and production readiness as separate concepts.

### Allowed fake/inert credential source boundary

A future fake/inert credential source or loader port may be implemented only as an explicit, deterministic, no-secret boundary. It may model dependency presence, missing state, unavailable state, invalid state, configured-redacted state, and dry-run readiness. It must not perform real secret loading, provider SDK/client construction, network access, runtime startup, deployment detection, or production environment probing.

The fake/inert boundary may expose only redacted, JSON-safe public descriptors and status records. It must not expose raw token values, authorization headers, raw provider config, raw environment dumps, raw local paths, raw endpoints, stack traces, provider client handles, SDK objects, or raw runtime values.

The fake/inert boundary must be created or injected explicitly by future implementation. It must not become default credential loading behavior and must not be used as evidence of real-provider success.

### Allowed secret-gated real edge only when explicitly scoped

A real credential edge may exist only in a future slice that explicitly scopes secret-gated real behavior. That edge must live at the plugin/deployment/runtime boundary, not inside default adapter code, not inside hazeteam-core, not inside domain packages, and not inside package-root side effects.

Any future real edge must require explicit operator gating, explicit network/secret enablement where relevant, safe operation classification, injected provider/runtime ports, and redacted attempt evidence before a pass can be claimed. It must keep runtime-only secret handles internal and expose only safe public readiness/failure projections.

Default code paths must remain no-network and no-secret. Missing credentials, closed gates, unavailable ports, skipped states, blocked states, ready-to-attempt states, and ready-to-run states must not be counted as a real-provider pass.

### Explicit fan-in ownership

W22 leaves must avoid shared integration surfaces. W22E is the only W22 slice that may fan in completed W22 outputs through package roots, local barrels, package metadata, broad static guards, README updates, or current-development-state updates.

W22B, W22C, W22D1, and W22D2 must not pre-wire package exports, package metadata, global status docs, broad static guards, release classifiers, or README links unless a later Orchestrator prompt explicitly changes the ownership model.

## Non-goals

W22A and the planned W22 leaves do not claim or implement:

- no production credential loader;
- no default secret loading;
- no process.env reads in default code;
- no provider SDK/client construction;
- no default provider network behavior;
- no default runtime startup;
- no deployment/runtime readiness claim;
- no production runtime readiness claim;
- no production provider runtime readiness claim;
- no production credential loading readiness claim;
- no real-provider success claim;
- no OCA readiness claim;
- no LifeOS readiness claim;
- no sidecar readiness claim;
- no OCA/LifeOS/sidecar readiness claim;
- no production readiness claim.

## Static guard needs for future slices

Future static guard work should protect real architectural invariants, not orchestration bookkeeping. Static guards should verify that public credential/config surfaces stay redacted and JSON-safe, that runtime-only values do not become public DTO fields, and that fake/inert sources do not imply production or real-provider success.

Targeted future guards may check that W22B contract vocabulary does not expose unsafe public field names or raw secret/config shapes, and that W22C fake/inert boundaries do not add default secret loading, network access, provider SDK/client construction, runtime startup, or package-root side effects.

Broad static guards, release-status guards, package-root guards, and cross-leaf public-surface guards are reserved for W22E fan-in only.

## Max-parallel follow-up matrix

| Future slice | Ownership | Allowed output | Forbidden in that slice | Fan-in rule |
|---|---|---|---|---|
| W22B | Credential/config contract types | Safe type-only or contract-only vocabulary for refs, descriptors, readiness, and redacted public projections | Fake loader behavior, real secret access, provider clients, package-root exports, broad guards, runtime/deployment readiness claims | Wait for W22E for shared exports or current-state docs |
| W22C | Fake/inert credential source or loader port | Explicit fake/inert no-secret boundary or injected loader port with redacted JSON-safe projections | Real secret loading, process.env reads in default code, network access, provider SDK/client construction, runtime startup, package-root exports | Wait for W22E for shared exports or cross-leaf integration |
| W22D1 | Static guard for W22B | Targeted no-leak/static checks for W22B public contract vocabulary | Guarding W22C behavior, broad release classifiers, package-root fan-in, source behavior changes | Must remain leaf-local unless W22E owns broad consolidation |
| W22D2 | Static guard for W22C | Targeted no-leak/static checks for W22C fake/inert source or loader port | Guarding W22B beyond its dependency surface, broad release classifiers, package-root fan-in, source behavior changes outside guard scope | Must remain leaf-local unless W22E owns broad consolidation |
| W22E | W22 fan-in | Fan-in after all W22 leaves are merged, including shared exports, metadata, current-state docs, README links, and broad static guards if scoped | Starting before all W22 leaves are merged, adding unrelated runtime/provider/deployment behavior, claiming production readiness | Sole W22 owner for shared integration surfaces |

## Shared file reservations for W22E only

The following shared files and surfaces are explicitly reserved for W22E only:

- package root;
- local barrels;
- package metadata;
- docs/roadmap/current-development-state.md;
- README;
- broad static guards.

Parallel W22 leaves must not modify these surfaces. If a leaf discovers it needs one of these surfaces, it should leave the shared integration for W22E rather than expanding scope.

## Public example policy

This plan includes no public credential examples and no executable credential-loading snippets. Any future public examples must be redacted, bounded, JSON-safe, and unable to resemble real secrets, real endpoints, private paths, raw provider payloads, raw environment dumps, or provider SDK/client handles.

## W22A closure

W22A is complete when this isolated roadmap document exists and no other repository file has changed. Completion of W22A is not evidence of credential-loader implementation, credential-loader readiness, deployment readiness, runtime readiness, real-provider success, OCA readiness, LifeOS readiness, sidecar readiness, or production readiness.
