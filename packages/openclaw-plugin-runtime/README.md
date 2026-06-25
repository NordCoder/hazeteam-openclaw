# @hazeteam/openclaw-plugin-runtime

## Status

`@hazeteam/openclaw-plugin-runtime` is the W13 OpenClaw plugin runtime shell package.

After W13F fan-in, the package root intentionally exports the safe public surfaces introduced by W13B, W13C, W13D, and W13E:

- plugin lifecycle state-machine helpers;
- OpenClaw tool registry descriptors and validators;
- runtime capability registry descriptors and readiness projection helpers;
- plugin readiness aggregation and summary helpers.

The package remains fake/dry-run capable only. Its package descriptor reports `productionReady: false`, `effects: "none"`, `status: "runtime-shell"`, and `readiness: "fake-dry-run-capable"`.

## Public entrypoint

Use the package root as the public W13 entrypoint:

~~~ts
import {
  aggregatePluginReadiness,
  createInitialPluginLifecycleSnapshot,
  createOpenClawToolRegistry,
  createRuntimeCapabilityRegistry,
  describeOpenClawPluginRuntime,
} from '@hazeteam/openclaw-plugin-runtime';
~~~

The package root is a barrel over safe contract-level W13 surfaces. It must not instantiate clients, call the network, load credentials, read environment secrets, mutate global process state, or require real providers.

## Current limitations

This package is not a production OpenClaw, Telegram, OCA, or sidecar runtime.

The repository still has no:

- real OpenClaw SDK/client import or wiring;
- Telegram listener, webhook, polling loop, callback HTTP endpoint, or network delivery;
- OCA runtime/session implementation;
- production credential loader or secret manager;
- production durable backend, queue, scheduler, process supervisor, sidecar support, or deployment runtime;
- production HTTP readiness endpoint.

Those capabilities require explicit future implementation slices and release gates.

## Safety posture

Public outputs are expected to stay JSON-serializable and no-leak safe. They should expose bounded descriptors, refs, states, summaries, and readiness projections only, not raw provider objects, SDK/client handles, runtime internals, secret/config material, stack traces, filesystem paths, network endpoints, or raw tool/provider payloads.
