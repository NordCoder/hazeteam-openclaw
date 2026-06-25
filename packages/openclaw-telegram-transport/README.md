# @hazeteam/openclaw-telegram-transport

## W14A status

This package currently implements only the W14A transport configuration and credential-reference boundary for future Telegram/OpenClaw transport ports.

It is not a real transport runtime. It does not import provider SDKs, construct provider clients, open listeners, register webhooks, poll Telegram or OpenClaw, deliver messages, acknowledge callbacks, route commands, execute callbacks, or run real smoke behavior.

## Public surfaces

The W14A public surface is intentionally small:

- `config` parses caller-provided unknown input into bounded, JSON-serializable, redacted transport configuration and readiness descriptors.
- `secrets` models safe credential descriptors and opaque runtime-only credential handles.

Production code in this package does not read deployment variables directly. A future deployment edge may read a secret store or process configuration and then pass only safe refs into this package.

## Config model

The parser accepts caller-provided input shaped around a profile and provider entries. The provider entries may describe Telegram and OpenClaw mode, a safe credential ref, source class, and a safe transport ref.

Supported profiles:

- `test`
- `dry-run`
- `real-smoke`
- `production`

Supported provider modes:

- `disabled`
- `dry-run`
- `real`

Real mode is still side-effect free in W14A. A real provider with a missing or invalid credential ref is projected as blocked by secret. A real provider with a configured credential ref is only configuration-ready; no SDK/client/network object is created.

## Safe credential descriptors

A safe credential descriptor may expose:

- provider kind, such as Telegram or OpenClaw;
- credential kind, such as `telegram-bot-token` or `openclaw-api-token`;
- safe `secretRef` value, such as `secret:telegram:production-bot`;
- source class, such as `secret-manager`, `injected`, `env`, `file`, or `unknown`;
- redacted status.

A safe credential descriptor must not expose the credential value, private endpoint, local path, raw deployment config, raw provider payload, provider client object, stack trace, or raw environment name.

## Opaque handles

`createOpaqueTransportSecretHandle` creates a runtime-only handle around a safe descriptor. The handle is not JSON serializable and is not a provider client. It exists so later W14 leaves can keep credential material behind a narrow boundary when real provider factories are explicitly scoped.

## Example

~~~js
import { parseTransportConfig } from '@hazeteam/openclaw-telegram-transport';

const result = parseTransportConfig({
  profile: 'real-smoke',
  providers: {
    telegram: {
      mode: 'real',
      credentialRef: 'secret:telegram:production-bot',
      sourceClass: 'secret-manager',
    },
    openclaw: {
      mode: 'real',
      credentialRef: 'secret:openclaw:production-api',
      sourceClass: 'secret-manager',
    },
  },
});

console.log(result.readiness);
~~~

The readiness output remains bounded and redacted. It reports `willCallRemote: false` in W14A.

## Later real smoke prerequisites

Later real-smoke work would need an explicit smoke profile plus redacted credential refs for:

- Telegram bot credential;
- OpenClaw API credential;
- any future webhook signing credential if callback smoke is in scope.

W14A only models these refs. It does not load the values and does not perform smoke execution.
