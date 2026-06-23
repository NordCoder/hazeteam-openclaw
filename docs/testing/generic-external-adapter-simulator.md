# Generic External Adapter Simulator

## Purpose

The generic external adapter simulator is a test fixture for adapter-facing acceptance coverage. It models an external channel, conversation, message, and callback using only neutral refs and JSON-safe values.

The simulator is not production source and it is not exported by the package public API. It exists so tests can exercise external-facing core contracts without a real external adapter, listener, endpoint, delivery service, callback handler, or deployment process.

## S62B acceptance suite

S62B adds an executable acceptance suite at `tests/acceptance/generic-external-adapter-flow.test.mjs`.

The suite uses:

- the S62A generic external adapter simulator;
- the S60E `createCoreInteractionHost` facade;
- in-memory host session binding storage;
- in-memory presentation outbox storage;
- in-memory presentation action-token storage;
- deterministic clocks and ids supplied by the test fixture.

The suite is a deterministic contract harness. It is not a production adapter and it does not introduce real transport, network, callback endpoints, provider bindings, durable storage, worker daemons, or schedulers.

External adapter packages can use the S62B scenarios as a contract reference for how to map inbound messages, deliver presentations, verify and consume action tokens, deny mismatches and replays, deny direct execution requests, and read safe runtime/status/health envelopes through the public facade.

Production adapter delivery, callback routing, webhook/listener endpoints, external retries, and deployment-specific scheduling remain outside core.

## Transport-neutral boundary

The fixture has no network connection, listener, endpoint, queue, daemon, or scheduler. It records fake deliveries and submitted callbacks in arrays that tests can inspect.

The only external identifiers represented by the simulator are generic refs:

- `externalChannelRef`
- `externalConversationRef`
- `externalMessageRef`
- `callbackTokenRef`

The simulator does not carry host-specific payloads, vendor payloads, product-specific commands, secrets, storage handles, or deployment configuration.

## Fixture concepts

`createGenericExternalAdapterSimulator(options)` creates:

- a `FakeExternalChannel`;
- a default `FakeExternalConversation`;
- a `deliveredMessages` array;
- a `submittedCallbacks` array;
- helper methods that delegate to the standalone mapping helpers.

`FakeExternalChannel` creates fake conversations and shares the delivery/callback recording arrays.

`FakeExternalConversation` can create inbound messages, record delivered fake messages, and record submitted fake callbacks.

`FakeExternalMessage` stores neutral external refs, text, JSON-safe payload, action descriptors, and metadata.

`FakeExternalCallback` stores neutral external refs plus a `callbackTokenRef` and action ref.

## Mapping helpers

`mapInboundMessageToHostAction(message, options)` maps a fake inbound message to a safe host-action-shaped object. It is intentionally just shape preparation; it does not dispatch by itself. For pure shape tests, its defaults preserve the generic S62A contract. For executable S62B facade tests, callers may provide valid core-facing `actorKind`, `intentKind`, and `intentPayload` mapping options while keeping the simulator transport-neutral.

`mapPresentationToExternalMessage(presentation, options)` maps a generic presentation payload and action descriptors into a fake external message shape. Action descriptors carry only labels, action refs, and callback token refs.

`mapCallbackToUserIntentInput(callback, options)` maps a fake callback into a generic user-intent-input-shaped object. It carries the callback token ref and neutral external refs so acceptance flows can verify and consume the token before user intent submission.

## Executed S62B scenarios

The S62B acceptance suite covers:

- inbound dispatch happy path through `submitHostAction`;
- presentation listing, claiming, fake external delivery mapping, and delivered marking;
- action-token issue, verify, consume, and replay denial;
- workspace/action mismatch denial;
- direct execution denial through the adapter-facing user-intent surface;
- runtime drain, workflow status, and health envelopes when runtime readers are not configured.

Every scenario asserts `contractVersion: "core.v1"`, `CoreApiEnvelope` success/failure shape, JSON serialization safety, no storage/path leakage, no provider/transport payload leakage, and no raw error stack leakage.

## Limitations

- No real network.
- No real callback endpoint.
- No vendor payloads.
- No production adapter SDK.
- No durable store implementation.
- No product-specific adapter behavior.
- No changes to runtime, presentation, session, or token semantics.
