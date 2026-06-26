# Known Limitations

## Current limitations

The current repository is a safe OpenClaw/Telegram adapter foundation with merged fake/inert, boundary, release-gate, real integration harness, public export, static guard, and documentation-closure evidence.

After W19G Wave 5 documentation closure, adapter-ready-for-real-system-integration is the release classification under explicit gates. This does not remove production limitations and the repository is not production-ready.

Current production limitations:

- No production OpenClaw SDK or provider runtime is shipped.
- No production Telegram/OpenClaw network integration is shipped.
- No Telegram listener, webhook server, callback HTTP endpoint, polling loop, or daemon is shipped.
- No production runtime-value loader or credential loader is shipped; foundation libraries must not read sensitive runtime values directly.
- No default provider/client runtime is constructed from package roots.
- No default provider network calls are made by package roots.
- No default secret loading is performed by package roots.
- No production HTTP health endpoint is shipped by the current source.
- No packaged migration, backup, restore, replay, or recovery CLI is shipped.
- No production database, cache, queue, scheduler, process supervisor, or deployment worker is shipped.
- No production durable backend is shipped.
- No remote sidecar support is shipped.
- No real OCA client execution, OCA credential loading, Codex product runtime, LifeOS behavior, or domain-product implementation is shipped as part of adapter readiness.

These limitations must remain visible in release documentation until current source, tests, and an explicit implementation slice prove otherwise.

## Merged evidence that does not remove production limitations

The following merged evidence supports the adapter-ready-for-real-system-integration classification under explicit gates without converting it into production support:

- W17H1-W17H6 fake/inert acceptance evidence is merged for inbound fake E2E, outbound fake E2E, callback permission fake E2E, durable replay fake E2E, no-leak matrix, and package-root no-side-effect matrix. This is not a real-provider pass.
- W18A runtime value boundary is merged for secret handles, credential refs, resolved runtime-only values, public redacted descriptors, and no public secret values. This is not a production credential loader.
- W18B provider client port boundary is merged for injected provider ports, no default provider SDK/client construction, and provider acknowledgement separate from business success. This is not default provider network execution.
- W18C secret-gated smoke refinement is merged. It is opt-in only, keeps no default CI network, requires no default secrets, reports redacted/status-precise output, and treats skipped/blocked/ready-to-run states as not passes. A passed smoke requires a supplied redacted attempt with provider acknowledgement and business success for the narrow executed edge.
- W18D listener/webhook/polling boundary is merged as interface/descriptors only. It does not ship a daemon, server, listener startup, webhook server, polling loop, or production runtime.
- W18F1 runtime-edge documentation is merged and remains documentation evidence only.
- W18E1 release-gate static/CI closure is merged. Default test/check remains no-network and secret-free, real smoke remains opt-in, and release docs are guarded against premature production-ready and adapter-ready claims.
- W18E2 release docs closure is merged. It documents evidence and limitations without claiming production readiness.
- W18E3 final adapter readiness report supplies the final evidence table, checks table, real-smoke table, no-leak table, parked overlays, downstream unlock decision, and final classifier.
- W19A real integration attempt contract is merged. It defines explicit gate and result vocabulary for real-system attempts, but it does not run a real provider or create a production runtime.
- W19B runtime credential binding port is merged. It requires an injected port and keeps runtime credential values runtime-only; public projections are redacted/json-safe.
- W19C opt-in real smoke harness runner evidence is merged as a smoke test using fakes. It does not make real smoke part of default checks and does not prove default provider execution.
- W19D/W19D3 Telegram integration harness public export and metadata fan-in are merged. They expose the integration-harness public surface while preserving non-production metadata and inert defaults.
- W19E runtime credential binding public export is merged through the runtime-values barrel. It does not add default secret loading or production credential resolution.
- W19F2 static public-surface regression guard is merged. It is a static public-surface regression guard, not a substitute for real-system validation.
- W19G Wave 5 documentation closure records the merged Wave 5 state in release-facing docs only.

## Readiness ladder limitations

A missing, skipped, blocked, ready-to-run, or ready-to-attempt evidence item is not a pass. A release candidate may report safe blockage honestly, but it may not convert blockage into production readiness or a successful provider pass.

Real integration attempts remain gated and require explicit operator acknowledgement. Required runtime/provider gates include an open network gate, injected provider/runtime ports where applicable, safe operation class, safe refs, redacted credential posture, and supplied redacted attempt evidence before a pass can be claimed.

Provider acknowledgement is not business success. External provider success is not equivalent to business success unless explicit business-success evidence is supplied for the narrow executed edge.

OCA, Codex, LifeOS, domain/product overlays, sidecar, deployment runtime, production provider runtime, production credential loading, and production durable backend remain parked or future work unless explicitly implemented and tested by later approved slices.

## Default check and CI limitations

The default check path must remain no-network and secret-free. It must not require real Telegram/OpenClaw credentials, real provider network access, deployment secrets, production infrastructure, or a running sidecar.

Default checks can prove deterministic contract, unit, static, fake, acceptance, no-leak, and package-root inertness behavior. They cannot prove real provider reachability unless an explicitly gated smoke command is run and reported separately.

W19F2 protects Wave 5 public-surface invariants statically and is included by the root test:static pattern when default static checks are executed. That static guard is not a production runtime claim and is not a real-system validation substitute.

## Real smoke limitations

Real smoke is opt-in and secret-gated. A skipped, blocked, ready-to-run, or ready-to-attempt real-smoke or real-integration report is safe posture, not a successful real-provider pass.

A passed real smoke proves only the specific narrow edge that was executed. It does not prove production runtime behavior, durable backend correctness, listener/webhook/polling availability, sidecar support, OCA execution, LifeOS behavior, or overall production readiness.

A passed smoke requires supplied redacted execution evidence with provider acknowledgement and business success for the narrow executed edge.

Smoke summaries, blocked reasons, and failures must stay redacted. They must not reveal tokens, credentials, endpoints, raw provider payloads, raw callback payloads, provider clients, SDK handles, provider handles, client handles, stack traces, filesystem paths, raw logs, raw diffs, command output, or runtime-only values.

## Runtime credential limitations

Runtime credential values are not exported as public values. Runtime credential binding can produce runtime-only values internally only behind injected runtime ports.

Public credential and binding projections must remain redacted/json-safe. Public outputs may include safe refs, redacted descriptors, blocked statuses, and safe diagnostics only.

Current source does not implement a production credential loader, secret manager integration, deployment-owned runtime-value loader, credential rotation, or default provider credential resolution.

## Parked overlays

OCA, Codex, LifeOS, and domain/product overlays are parked downstream overlays. After the adapter-ready-for-real-system-integration gate, future work on these overlays may begin only under explicit future scopes; their current files are still not production support.

Existing fake/inert OCA surfaces and descriptor-only LifeOS/domain surfaces are not evidence for:

- plugin runtime composition readiness;
- Telegram/OpenClaw fake E2E readiness;
- adapter-wide readiness aggregation;
- durable adapter-state readiness;
- opt-in real smoke readiness;
- production readiness.

Future work on parked overlays must not start merely because those files exist. The unlock condition is the adapter-ready-for-real-system-integration gate plus an explicit future prompt, not the presence of fake wrappers or descriptors.

## Boundary limitations

The current boundary discipline remains mandatory:

- raw provider payloads stay outside public DTOs;
- raw callback payloads stay outside public DTOs;
- resolved secrets and runtime-only values stay outside public output;
- core receives safe refs and envelopes only;
- package-root imports must not perform network calls, read environment secrets, construct provider clients, start listeners, or connect stores;
- provider acknowledgement remains distinct from business success;
- callback handling must preserve permission-before-token-consume;
- topic routing authority is channelRef + chatRef + threadRef, not topic title;
- real integration attempts must preserve explicit operator acknowledgement and required runtime/provider gates;
- W19F2 remains a static public-surface regression guard only.

## Future work

The following work is future work, not current release support:

- production OpenClaw SDK/client wiring behind explicit adapter-owned ports;
- real Telegram/OpenClaw listener, delivery, callback, runtime, and approval network execution;
- real gated smoke execution that actually calls a provider after explicit gates and reports a redacted passed attempt;
- production runtime-value loading and rotation strategy;
- production credential loader or secret manager integration;
- production HTTP health/readiness endpoint, if a deployment layer requires one;
- production durable backend implementation;
- packaged migration, backup, restore, replay, and recovery tooling;
- sidecar support, if explicitly implemented later;
- deployment runtime and process supervision;
- OCA, Codex, LifeOS, or other product-layer branches after explicit future scopes are issued.

Future work must preserve the current boundary discipline and must be introduced only by explicitly approved slices.
