# Public Result and Error Envelopes

S59 adds a stable, JSON-friendly envelope layer for adapter-facing core results. Core internals continue to return `Result<T>` and `CoreErrorData`; external adapters should wrap those values before logging, returning, or exposing them outside the core boundary.

## Why envelopes exist

Core modules often use `Result<T>` because it is convenient for internal composition. External adapters need a narrower public shape that is stable across host, scenario, adapter delivery, and future facade surfaces. The envelope helpers provide that shape without changing internal return types.

## Success shape

```json
{
  "contractVersion": "core.v1",
  "ok": true,
  "value": {}
}
```

Use `successEnvelope(value)` when the value is already a safe public DTO.

## Failure shape

```json
{
  "contractVersion": "core.v1",
  "ok": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid input",
    "correlationId": "corr.example",
    "workspaceRef": "workspace.alpha",
    "retryable": false,
    "reason": "invalid_input",
    "details": {
      "field": "workspaceRef"
    }
  }
}
```

`retryable`, `workspaceRef`, `reason`, and `details` are optional. `retryable` is preserved only when it is provided by `CoreErrorData`, a `CoreError`, or envelope options.

## Helpers

The foundation entrypoint exports:

- `successEnvelope(value)`
- `failureEnvelope(error, options?)`
- `serializeCoreError(error, options?)`
- `serializeResultEnvelope(result, serializer?)`

`serializeCoreError` accepts a `CoreError`, `CoreErrorData`, or unknown thrown value. Unknown values are normalized into an internal safe error body and do not expose raw thrown objects.

`serializeResultEnvelope` maps `Result<T>` into `CoreApiEnvelope<U>`. When the result is successful and a serializer is provided, the serializer maps the internal value into a public DTO. If the serializer throws, the helper returns a safe failure envelope with `reason: "serializer_exception"` and does not serialize the thrown object.

## Relation to host public serializers

S54 introduced safe host-facing serializers such as `serializeHostDispatchResult` and `serializeRunDocumentUpdateScenarioResult`. S59 layers envelopes over those serializers:

```ts
import { serializeResultEnvelope } from "hazeteam-core/foundation";
import { serializeHostDispatchResult } from "hazeteam-core/host";

const envelope = serializeResultEnvelope(dispatchResult, serializeHostDispatchResult);
```

The host entrypoint also exports convenience helpers:

- `serializeHostDispatchResultEnvelope(result)`
- `serializeRunDocumentUpdateScenarioResultEnvelope(result)`

The adapter entrypoint exports:

- `serializeAdapterDeliveryResultEnvelope(result)`

These helpers are additive. They do not change host dispatch, scenario execution, adapter delivery, runtime retry, approval, policy, presentation outbox, or session binding semantics.

## Safe error serialization

Public error bodies preserve stable routing fields:

- `code`
- `message`
- `correlationId`
- `workspaceRef`
- `retryable`
- `reason`
- redacted `details`

Public error bodies must not expose stack traces, raw `Error` objects, host filesystem paths, raw storage objects, raw provider payloads, raw transport payloads, document contents, secrets, tokens, passwords, or credentials.

Details are redacted by key and by obvious host-path-looking string value. Blocked detail keys are replaced with `[redacted]`. Normal refs such as `workspaceRef.id`, `agentRef.id`, and `approvalRef.id` are preserved.

## Limitations

The envelope layer does not decide transport status codes, retry scheduling, delivery lifecycle, approval policy, callback token verification, or facade orchestration. Those remain owned by their respective core modules or future adapter-facing slices.

Success values are only as safe as the serializer supplied by the caller. External adapters should prefer public DTO serializers instead of wrapping internal objects directly.
