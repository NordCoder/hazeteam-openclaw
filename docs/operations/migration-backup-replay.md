# Migration, backup, restore, and replay operations

## Purpose and scope

This document describes the current operator-facing expectations for migration, backup, restore, replay, and operational recovery after W9A.

It is a release-hardening document for the adapter foundation. It is not a database migration framework, a backup command reference, or a replay runtime design. The current adapter code owns safe durable record shapes and validation at the adapter boundary; the concrete durable storage engine remains an injected deployment concern.

The guidance below applies to the existing adapter durable-store shells and W9 smoke/replay safety assumptions. It intentionally avoids product-specific infrastructure, vendor-specific storage engines, and real credentials.

## Durable storage boundaries

The adapter currently exposes durable storage through injected boundaries. Operators should treat these boundaries as stable adapter-facing contracts, not as proof that any particular external storage backend is bundled with the package.

### Topic binding records

Topic binding persistence is represented by safe topic binding records. A topic binding record captures the binding key, workspace, channel, topic, status, agent, session, created timestamp, updated timestamp, and optional safe metadata.

Operational expectations:

- preserve `recordKey` values exactly;
- preserve `workspaceId`, `channelId`, `topicId`, `agentId`, and `sessionId` as safe adapter identifiers;
- preserve `createdAtIso` and `updatedAtIso` timestamps;
- preserve binding `status` without coercing unknown deployment states into active records;
- preserve only safe metadata accepted by the adapter normalizer;
- do not restore raw provider events, raw Telegram updates, raw runtime payloads, stack traces, or credential-like fields into topic binding records.

### Idempotency records

Idempotency persistence is represented by safe records keyed by adapter idempotency keys. Current durable idempotency records support pending, completed, and failed states. The key scope is derived from the key and is expected to match the record scope.

Operational expectations:

- preserve idempotency keys exactly, including their scope segment;
- preserve terminal records so completed work is not replayed as new work;
- preserve failed records where they are needed for safe retry or diagnostics;
- preserve safe operation, correlation, details, result, and failure refs;
- preserve `firstSeenAt`, `lastSeenAt`, `completedAt`, and `failedAt` timestamps when present;
- preserve safe errors only after adapter normalization;
- do not restore raw provider payloads, raw runtime payloads, raw tool payloads, raw errors, stacks, or credential-like fields into idempotency records.

### Callback token records

Callback token persistence is represented by safe lifecycle records keyed by callback token refs. Current lifecycle states are verified, consumed, denied, and failed. A consumed record must reflect verified token state, allowed permission, token consumption, and `tokenConsumed: true`.

Operational expectations:

- preserve `tokenRef` values exactly;
- preserve `idempotencyKey` linkage when present;
- preserve verified, consumed, denied, and failed timestamps;
- preserve safe verification and consumption refs;
- preserve permission decisions only in the adapter-safe shape;
- preserve `tokenConsumed` as the authoritative replay guard;
- do not restore a consumed token as verified, denied, failed, or unconsumed;
- do not re-enable denied or failed tokens unless a future explicit migration defines that behavior;
- do not restore raw callback payloads, raw approval payloads, raw Telegram updates, stacks, or credentials.

### Delivery records

Delivery persistence is represented by safe delivery records behind a read/write/list boundary. Current records include delivery attempts, delivery success or failure results, external message refs, and delivery idempotency indexes. Delivery records use adapter-safe delivery refs, idempotency keys, targets, content, timestamps, and safe result/error structures.

Operational expectations:

- preserve delivery attempt records and their idempotency index records together;
- preserve delivery result records for delivered or failed attempts;
- preserve external message refs for delivered attempts so recovery does not resend blindly;
- preserve `createdAtIso`, `updatedAtIso`, and `recordedAtIso` timestamps;
- preserve attempt status as created, delivered, or failed;
- preserve success records as non-retryable delivered results;
- preserve failure records with their retryability flags;
- do not restore raw delivery responses, raw provider payloads, raw Telegram updates, raw errors, stacks, or credentials.

### Core store adapters

Core-facing durable store adapters wrap injected record stores for:

- `sessionBindingStore`;
- `presentationOutboxStore`;
- `presentationActionTokenStore`.

These adapters normalize safe core records before returning them to core-facing host ports. They also summarize readiness by reporting which core durable boundaries are configured and which are missing.

Operational expectations:

- preserve session binding records and their active/superseded/expired/revoked status;
- preserve presentation outbox records and their pending/claimed/delivered/failed/cancelled status;
- preserve action token records and their issued/verified/consumed/expired/revoked status;
- preserve safe record keys, refs, safe messages, and serialized payload descriptors;
- do not restore raw core results, raw payloads, filesystem paths, storage paths, stacks, or credential-like values into core records.

## Migration assumptions

Current migrations are deployment-layer responsibilities. The adapter package defines safe shapes and normalization rules, but it does not create schemas, tables, indexes, buckets, files, queues, or caches.

Safe migration principles:

1. The adapter owns safe record shapes. Migration output must be accepted by the corresponding adapter normalizer before the migrated data is considered valid.
2. The external storage implementation is injected. Schema evolution, physical indexes, retention, transactional guarantees, and data export/import procedures belong to the external implementation or deployment layer unless a later adapter slice explicitly adds migration tooling.
3. Record kind, schema version, key, status, and timestamp fields are compatibility-critical. Do not rename, reinterpret, or drop them without a migration plan and restart/replay validation.
4. Backward compatibility should be validated through restart/replay tests before changing deployed storage shape.
5. Read compatibility is safer than write-only migration. A rollout should either keep older records readable or migrate all relevant records before the new adapter version begins processing traffic.
6. Migration should remain no-leak. Reject or redact raw provider payloads, raw runtime/tool/core payloads, stack traces, filesystem/storage paths, and credential-like fields before they reach adapter records.
7. Rollback must consider data written by the newer adapter version. If rollback readers cannot normalize newer records, rollback is not safe without a downgrade migration or a restore point.

## Backup and restore assumptions

Backups should capture a consistent set of records across all durable boundaries needed by one adapter deployment. A partial backup can be worse than no backup when it separates idempotency, callback lifecycle, delivery, and topic binding state.

Backup concerns:

- preserve topic binding records for active and inactive bindings that still affect routing or recovery;
- preserve idempotency keys and their statuses so replay cannot reprocess completed operations as first-time operations;
- preserve callback token lifecycle state where the token is still operationally valid, especially consumed and denied states;
- preserve delivery attempt, result, external message ref, and idempotency index records together;
- preserve core session binding, presentation outbox, and action token records together;
- preserve safe refs and timestamps because they are used for correlation, audit, ordering, and recovery decisions;
- protect backups with the same access controls as production state, because safe refs and timestamps can still be operationally sensitive;
- exclude raw provider payloads, real credentials, environment files, secret material, raw request/response captures, stack traces, and filesystem/storage paths from adapter durable backups.

Restore concerns:

- restore all mutually dependent record families from the same logical point in time when possible;
- validate restored records by running adapter normalizers or equivalent replay-read checks before opening traffic;
- treat missing idempotency records as a duplicate side-effect risk;
- treat missing callback consumed records as a token re-consumption risk;
- treat missing delivery result or external message records as a duplicate delivery risk;
- treat missing topic binding records as a routing/session continuity risk;
- treat missing core outbox or action token records as a host recovery risk;
- never restore rejected raw payloads or secrets just to make legacy records parse.

## Replay model

Current replay expectations are conservative. Replay means reconstructing adapter state or decisions from safe DTOs and durable records, not rehydrating raw provider updates.

Replay and recovery rules:

- replay must use adapter-safe DTOs and durable records;
- replay must preserve idempotency semantics and continue treating existing records as duplicate guards;
- replay must not reconsume callback tokens unsafely;
- replay must not convert consumed, denied, failed, expired, or revoked lifecycle state into an allowed fresh action;
- replay must avoid duplicating delivery side effects by checking delivery idempotency indexes, result records, and external message refs before sending again;
- replay should prefer dry-run validation before any operation that could create external side effects;
- replay output must pass no-leak checks for raw payload terms, stacks, filesystem/storage path terms, and credential-like values;
- W9 real smoke cleanup remains planned-only: current smoke coverage composes safe dry-run behavior and cleanup plans, but does not implement real remote cleanup or a real replay runtime.

## Recovery checklist

Use this checklist before and after migration, backup restore, or replay recovery.

### Before migration or restore

- [ ] Confirm the adapter version and target commit being operated.
- [ ] Confirm the external storage implementation and deployment layer that own physical migration or restore mechanics.
- [ ] Take a pre-migration snapshot covering topic binding, idempotency, callback token, delivery, and core store records.
- [ ] Confirm the snapshot excludes raw provider payloads, raw runtime/tool/core payloads, stack traces, real credentials, secret files, filesystem paths, and storage paths.
- [ ] Confirm rollback input is available and readable by the currently deployed adapter.
- [ ] Freeze or drain traffic if the external storage implementation cannot provide a consistent point-in-time snapshot.

### After migration or restore

- [ ] Validate migrated/restored records through adapter normalizers or an equivalent safe-read harness.
- [ ] Validate topic binding records list and read by their record keys.
- [ ] Validate idempotency records preserve duplicate behavior for completed operations.
- [ ] Validate callback token records preserve consumed/denied/failed semantics.
- [ ] Validate delivery attempts, delivery results, external message refs, and idempotency indexes remain consistent.
- [ ] Validate core store adapter readiness reports expected configured and missing stores.
- [ ] Run restart matrix validation before enabling normal processing.
- [ ] Run replay dry-run validation before any replay with possible external side effects.
- [ ] Run secret/no-leak validation against logs, reports, smoke output, backup manifests, and replay output.
- [ ] Keep rollback available until post-migration traffic has passed operational acceptance.

## Failure modes

| Failure mode | Operational risk | Recovery posture |
| --- | --- | --- |
| Stale topic binding | Messages route to an old session, workspace, channel, topic, or agent. | Validate binding timestamps and status before reopening traffic; prefer explicit inactive statuses over dropping old records silently. |
| Lost idempotency records | Completed operations can replay as new operations. | Restore idempotency records from the same snapshot as delivery/callback/core state; run duplicate-behavior checks. |
| Callback token replay | A consumed or denied token can be processed again. | Preserve callback lifecycle records and `tokenConsumed`; reject restores that downgrade consumed records. |
| Duplicate delivery | A message can be sent twice after restart or restore. | Preserve delivery attempts, result records, external message refs, and idempotency indexes together; dry-run replay before sending. |
| Partial restore | Cross-store references point at missing records. | Restore all durable store families from one logical snapshot; verify cross-record refs before enabling processing. |
| Unsafe raw payload restoration | Backups or migrations reintroduce raw provider data, raw runtime/tool/core payloads, stack traces, paths, or credentials. | Reject records that fail safe normalization and repeat migration from sanitized source data. |
| Incompatible record shape | New adapter cannot normalize old records or old adapter cannot read new records during rollback. | Validate read compatibility before rollout; keep a rollback snapshot and, where necessary, provide deployment-layer migration/downgrade steps. |
| Missing list support | Restart/replay validation cannot enumerate records for dry-run checks. | Treat list support as an operational capability requirement for recovery workflows, even when point reads are enough for normal traffic. |
| Cleanup assumption mismatch | Operators expect W9 smoke cleanup to delete real remote resources. | Treat W9 cleanup as planned-only until a future slice implements real cleanup support. |

## Non-goals and limitations

This document does not implement or imply:

- migration tooling;
- a backup command;
- a restore command;
- a replay runtime;
- a concrete database, cache, filesystem, queue, bucket, or SDK integration;
- an external DB-specific migration or restore procedure;
- real smoke cleanup beyond the current planned-only cleanup model;
- W10D documentation index fan-in.

The current adapter foundation supports safe injected durable boundaries and restart/replay validation assumptions. Operators remain responsible for choosing and operating the external storage implementation, including physical migrations, backup cadence, restore mechanics, access control, retention, and disaster recovery policy.
