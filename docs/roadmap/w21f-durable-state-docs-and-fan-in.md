# W21F Durable State Docs and Fan-In

## Status

W21F is the durable-state fan-in after the already merged W21B, W21C, W21D, W21E1, and W21E2 leaves.

W21F exposes only fake/inert durable-state boundaries through explicitly scoped public surfaces. It does not add production durable backend behavior, production storage readiness, runtime/provider/network/secret/deployment behavior, or a real-provider success claim.

The repository posture remains adapter-ready-for-real-system-integration under explicit gates and not production-ready.

## Public surfaces touched

W21F touches these public surfaces only:

- `packages/openclaw-adapter/src/durable-state/index.ts` — local durable-state barrel for already merged W21B/W21C/W21D fake/inert boundaries.
- `packages/openclaw-adapter/src/index.ts` — package-root export of the local durable-state barrel only.

The fan-in barrel exposes:

- W21B durable-state contract types as type-only public vocabulary;
- W21C fake/inert adapter state store port and explicit fake store constructor;
- W21D fake/inert replay and idempotency state boundary and posture constant.

## Preserved boundaries

W21F does not add:

- production durable backend behavior;
- production storage readiness;
- database, cache, queue, migration, backup, or restore behavior;
- replay CLI behavior;
- recovery runtime behavior;
- listener, webhook, polling, daemon, or runtime startup behavior;
- default runtime behavior;
- default network behavior;
- default secret loading;
- provider SDK/client construction;
- deployment behavior;
- OCA readiness;
- LifeOS readiness;
- sidecar readiness;
- real-provider success claim;
- production readiness claim.

Provider acknowledgement remains separate from business success. Ready-to-attempt and ready-to-run remain below pass. Public durable-state projections remain redacted, JSON-safe, fake/inert, and not backed by production storage.

## Future non-goals still unimplemented

Future explicitly scoped work is still required for:

- a production durable backend;
- production storage readiness;
- migrations;
- backup and restore;
- replay CLI;
- recovery runtime;
- listener, webhook, polling, or daemon runtime;
- provider runtime;
- default network behavior;
- default secret loading;
- deployment runtime;
- OCA behavior;
- LifeOS/domain behavior;
- sidecar behavior;
- real-provider success evidence.

Until those future slices exist, this repository continues to have no production durable backend, no production storage readiness, no deployment/runtime/provider/OCA/LifeOS/sidecar readiness, and no real-provider success claim.
