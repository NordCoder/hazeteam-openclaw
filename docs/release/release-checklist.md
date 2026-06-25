# Release Checklist

## Release scope

This checklist covers the current OpenClaw adapter foundation plus W14G transport fan-in. It is not a production OpenClaw/Telegram runtime certification.

The foundation includes safe adapter contracts, fake-edge composition, W12 public-core integration proof, W13 plugin runtime shell descriptors, and W14 package-root transport fan-in.

W14G adds public visibility for safe transport ports and injected boundaries. It does not add new runtime behavior.

## Required local checks

Run the repository checks before a release candidate is merged or tagged:

~~~sh
npm run test:static
npm run test
npm run check
~~~

For W12 public-core integration proof, also run the pinned core integration gate when the environment supports it.

Do not add or rename package scripts as part of release hardening unless a separate tooling or fan-in slice explicitly owns that change.

## W14 transport release gate

A W14 transport fan-in release candidate must keep these facts true:

- package root exports W14A-F safe public surfaces;
- `productionReady` remains false;
- default test/check requires no real credentials;
- default test/check performs no real network calls;
- real smoke remains opt-in and secret-gated;
- a skipped or blocked real-smoke report is not treated as a pass;
- no provider SDK client is constructed by default;
- no production listener, webhook, polling loop, or daemon is added;
- provider acknowledgement remains distinct from business success;
- callback permission-before-token-consume is preserved;
- topic routing authority is `channelRef+chatRef+threadRef`, not topic title.

## Security and no-leak release gate

Release output, logs, errors, docs examples, smoke summaries, and public descriptors must not expose raw provider payloads, runtime objects, stack traces, bot tokens, API keys, credentials, passwords, connection strings, filesystem paths, or storage paths.

Use safe refs, bounded descriptors, redacted messages, and explicit readiness summaries. Do not serialize raw external payloads or internal runtime objects as public adapter output.

## Merge and release gate

A release candidate is eligible for merge only when all of the following are true:

1. The branch diff is clean and limited to the assigned slice or justified fan-in scope expansion.
2. CI and local checks are green, or connector-only workers explicitly report command execution as unavailable.
3. No product-layer concern leaks into `hazeteam-core` or generic adapter foundation surfaces.
4. No real network, SDK, credential-loading, or process-supervision behavior is added unless a separate approved implementation slice explicitly owns it.
5. Package manifests, CI, production source, tests, roadmap files, deployment docs, operations docs, docs index, and README are changed only when explicitly allowed or justified.
6. Known limitations are preserved unless current source and tests prove the capability exists.

## Post-release smoke posture

After W14G, real smoke remains safe by default:

- smoke execution is skipped unless explicitly gated on;
- missing real-smoke profile, network gate, operator acknowledgement, credentials, or injected ports blocks the report safely;
- `willCallRemote` remains false in the W14 gate output;
- real network execution remains future work.

W14G does not implement W15, OCA wrapper mechanics, domain packages, sidecar behavior, deployment runtime, or production provider runtime.
