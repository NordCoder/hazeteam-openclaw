import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLUGIN_LIFECYCLE_STATES,
  PLUGIN_LIFECYCLE_TRANSITIONS,
  applyPluginLifecycleTransition,
  createInitialPluginLifecycleSnapshot,
  createPluginLifecycleFailureReason,
  createSafePluginLifecycleReason,
  describePluginLifecycleSnapshot,
} from '../../dist/lifecycle.js';

const forbiddenSerializedTerms = [
  'token',
  'secret',
  'password',
  'credential',
  'apikey',
  'api key',
  'bearer',
  'stack',
  'rawerror',
  'rawpayload',
  'rawproviderresponse',
  'rawruntimepayload',
  'rawtoolpayload',
  'filesystem',
  'storagepath',
  'network',
  'webhook',
  'polling',
  'telegram',
  'openclaw client handle',
  'sdk',
];

function assertNoLeaks(value) {
  const encoded = JSON.stringify(value);
  const lower = encoded.toLowerCase();

  assert.doesNotThrow(() => JSON.parse(encoded));

  for (const term of forbiddenSerializedTerms) {
    assert.equal(lower.includes(term), false, `serialized output must not include ${term}`);
  }
}

function expectAccepted(result) {
  assert.equal(result.kind, 'plugin-lifecycle-transition-result');
  assert.equal(result.ok, true);
  return result.snapshot;
}

function expectRejected(result) {
  assert.equal(result.kind, 'plugin-lifecycle-transition-result');
  assert.equal(result.ok, false);
  return result;
}

function applyAccepted(snapshot, transition) {
  return expectAccepted(applyPluginLifecycleTransition(snapshot, transition));
}

test('plugin lifecycle declares explicit states and transitions without effects', () => {
  assert.deepEqual(PLUGIN_LIFECYCLE_STATES, [
    'declared',
    'configured',
    'initialized',
    'started',
    'ready',
    'degraded',
    'stopping',
    'stopped',
    'failed',
  ]);
  assert.deepEqual(PLUGIN_LIFECYCLE_TRANSITIONS, [
    'configure',
    'initialize',
    'start',
    'mark-ready',
    'degrade',
    'begin-stop',
    'stop',
    'fail',
  ]);

  const initial = createInitialPluginLifecycleSnapshot();

  assert.deepEqual(initial, {
    kind: 'plugin-lifecycle-snapshot',
    state: 'declared',
    revision: 0,
    effects: 'none',
    history: [],
  });
  assertNoLeaks(initial);
});

test('plugin lifecycle follows declared to stopped happy path', () => {
  let snapshot = createInitialPluginLifecycleSnapshot();

  snapshot = applyAccepted(snapshot, { type: 'configure' });
  assert.equal(snapshot.state, 'configured');
  assert.equal(snapshot.revision, 1);

  snapshot = applyAccepted(snapshot, { type: 'initialize' });
  assert.equal(snapshot.state, 'initialized');
  assert.equal(snapshot.revision, 2);

  snapshot = applyAccepted(snapshot, { type: 'start' });
  assert.equal(snapshot.state, 'started');
  assert.equal(snapshot.revision, 3);

  snapshot = applyAccepted(snapshot, { type: 'mark-ready' });
  assert.equal(snapshot.state, 'ready');
  assert.equal(snapshot.revision, 4);

  snapshot = applyAccepted(snapshot, { type: 'begin-stop' });
  assert.equal(snapshot.state, 'stopping');
  assert.equal(snapshot.revision, 5);

  snapshot = applyAccepted(snapshot, { type: 'stop' });
  assert.equal(snapshot.state, 'stopped');
  assert.equal(snapshot.revision, 6);
  assert.equal(snapshot.effects, 'none');
  assert.deepEqual(
    snapshot.history.map((entry) => `${entry.from}:${entry.event}:${entry.to}`),
    [
      'declared:configure:configured',
      'configured:initialize:initialized',
      'initialized:start:started',
      'started:mark-ready:ready',
      'ready:begin-stop:stopping',
      'stopping:stop:stopped',
    ],
  );
  assertNoLeaks(snapshot);
});

test('plugin lifecycle can degrade from started or ready with safe reason data', () => {
  const initialized = applyAccepted(
    applyAccepted(createInitialPluginLifecycleSnapshot(), { type: 'configure' }),
    { type: 'initialize' },
  );
  const started = applyAccepted(initialized, { type: 'start' });

  const degradedFromStarted = applyPluginLifecycleTransition(started, {
    type: 'degrade',
    reason: {
      code: 'optional.component.unavailable',
      summary: 'optional component unavailable',
      category: 'dependency',
    },
  });

  assert.equal(degradedFromStarted.ok, true);
  assert.equal(degradedFromStarted.snapshot.state, 'degraded');
  assert.equal(degradedFromStarted.snapshot.lastDegradation.code, 'optional.component.unavailable');
  assert.equal(degradedFromStarted.snapshot.lastDegradation.summary, 'optional component unavailable');

  const ready = applyAccepted(started, { type: 'mark-ready' });
  const degradedFromReady = applyPluginLifecycleTransition(ready, {
    type: 'degrade',
    reason: {
      code: 'optional.component.delayed',
      summary: 'optional component delayed',
      category: 'dependency',
    },
  });

  assert.equal(degradedFromReady.ok, true);
  assert.equal(degradedFromReady.snapshot.state, 'degraded');
  assert.equal(degradedFromReady.snapshot.lastDegradation.code, 'optional.component.delayed');
  assertNoLeaks([degradedFromStarted, degradedFromReady]);
});

test('plugin lifecycle reaches failed from configure initialize start and ready paths with safe reason data', () => {
  const declared = createInitialPluginLifecycleSnapshot();
  const configured = applyAccepted(declared, { type: 'configure' });
  const initialized = applyAccepted(configured, { type: 'initialize' });
  const started = applyAccepted(initialized, { type: 'start' });
  const ready = applyAccepted(started, { type: 'mark-ready' });

  const cases = [
    ['configure', declared],
    ['initialize', configured],
    ['start', initialized],
    ['ready', ready],
  ];

  for (const [pathName, snapshot] of cases) {
    const result = applyPluginLifecycleTransition(snapshot, {
      type: 'fail',
      reason: {
        code: `lifecycle.${pathName}.failed`,
        summary: `${pathName} path failed safely`,
        category: 'lifecycle',
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.snapshot.state, 'failed');
    assert.equal(result.snapshot.lastFailure.code, `lifecycle.${pathName}.failed`);
    assert.equal(result.snapshot.lastFailure.summary, `${pathName} path failed safely`);
    assertNoLeaks(result);
  }
});

test('plugin lifecycle rejects invalid transitions with safe structured results', () => {
  const declared = createInitialPluginLifecycleSnapshot();
  const result = expectRejected(applyPluginLifecycleTransition(declared, { type: 'start' }));

  assert.equal(result.snapshot, declared);
  assert.deepEqual(result.issue, {
    code: 'lifecycle.invalid_transition',
    summary: 'event is not allowed for current state',
    category: 'transition',
  });
  assertNoLeaks(result);
});

test('plugin lifecycle repeated calls are deterministic or explicitly rejected', () => {
  const declared = createInitialPluginLifecycleSnapshot();
  const configured = applyAccepted(declared, { type: 'configure' });

  const firstRejected = applyPluginLifecycleTransition(configured, { type: 'configure' });
  const secondRejected = applyPluginLifecycleTransition(configured, { type: 'configure' });

  assert.equal(firstRejected.ok, false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(firstRejected)),
    JSON.parse(JSON.stringify(secondRejected)),
  );

  const ready = applyAccepted(
    applyAccepted(
      applyAccepted(configured, { type: 'initialize' }),
      { type: 'start' },
    ),
    { type: 'mark-ready' },
  );
  const stopping = applyPluginLifecycleTransition(ready, { type: 'begin-stop' });
  assert.equal(stopping.ok, true);

  const stoppingAgain = applyPluginLifecycleTransition(stopping.snapshot, { type: 'begin-stop' });
  assert.equal(stoppingAgain.ok, true);
  assert.equal(stoppingAgain.transition.changed, false);
  assert.equal(stoppingAgain.snapshot.revision, stopping.snapshot.revision);

  const stopped = applyPluginLifecycleTransition(stopping.snapshot, { type: 'stop' });
  assert.equal(stopped.ok, true);
  assert.equal(stopped.snapshot.state, 'stopped');

  const stoppedAgain = applyPluginLifecycleTransition(stopped.snapshot, { type: 'stop' });
  assert.equal(stoppedAgain.ok, true);
  assert.equal(stoppedAgain.transition.changed, false);
  assert.equal(stoppedAgain.snapshot.revision, stopped.snapshot.revision);
  assert.deepEqual(
    JSON.parse(JSON.stringify(stoppedAgain)),
    JSON.parse(JSON.stringify(applyPluginLifecycleTransition(stopped.snapshot, { type: 'stop' }))),
  );
  assertNoLeaks([firstRejected, stoppingAgain, stoppedAgain]);
});

test('plugin lifecycle does not mutate input snapshots', () => {
  const started = applyAccepted(
    applyAccepted(
      applyAccepted(createInitialPluginLifecycleSnapshot(), { type: 'configure' }),
      { type: 'initialize' },
    ),
    { type: 'start' },
  );
  const before = JSON.stringify(started);

  const degraded = applyPluginLifecycleTransition(started, {
    type: 'degrade',
    reason: {
      code: 'optional.component.unavailable',
      summary: 'optional component unavailable',
      category: 'dependency',
    },
  });

  assert.equal(degraded.ok, true);
  assert.notEqual(degraded.snapshot, started);
  assert.equal(JSON.stringify(started), before);
  assert.equal(started.state, 'started');
  assertNoLeaks([started, degraded]);
});

test('plugin lifecycle reason helpers redact unsafe inputs from serialized outputs', () => {
  const unsafeReason = {
    code: 'token.secret.rawError.rawPayload.apiKey',
    summary:
      'Bearer token secret password credential apiKey rawError rawPayload rawProviderResponse rawRuntimePayload rawToolPayload stack filesystem storagePath network webhook polling telegram openclaw client handle sdk /tmp/private',
    category: 'network',
  };

  const safeReason = createSafePluginLifecycleReason(unsafeReason);
  const failureReason = createPluginLifecycleFailureReason(unsafeReason);

  assert.deepEqual(safeReason, {
    code: 'lifecycle.safe_reason',
    summary: 'safe summary omitted',
    category: 'unknown',
  });
  assert.deepEqual(failureReason, safeReason);

  const started = applyAccepted(
    applyAccepted(
      applyAccepted(createInitialPluginLifecycleSnapshot(), { type: 'configure' }),
      { type: 'initialize' },
    ),
    { type: 'start' },
  );
  const degraded = applyPluginLifecycleTransition(started, {
    type: 'degrade',
    reason: unsafeReason,
  });
  const failed = applyPluginLifecycleTransition(started, {
    type: 'fail',
    reason: unsafeReason,
  });
  const invalid = applyPluginLifecycleTransition(createInitialPluginLifecycleSnapshot(), { type: 'start' });

  assert.equal(degraded.ok, true);
  assert.equal(failed.ok, true);
  assert.equal(invalid.ok, false);
  assertNoLeaks([safeReason, failureReason, degraded, failed, invalid]);
});

test('plugin lifecycle description is JSON serializable and no-leak safe', () => {
  const ready = applyAccepted(
    applyAccepted(
      applyAccepted(
        applyAccepted(createInitialPluginLifecycleSnapshot(), { type: 'configure' }),
        { type: 'initialize' },
      ),
      { type: 'start' },
    ),
    { type: 'mark-ready' },
  );

  const readyDescription = describePluginLifecycleSnapshot(ready);
  assert.deepEqual(readyDescription, {
    kind: 'plugin-lifecycle-description',
    state: 'ready',
    revision: 4,
    terminal: false,
    acceptsWork: true,
    canConfigure: false,
    canInitialize: false,
    canStart: false,
    canBecomeReady: false,
    canDegrade: true,
    canBeginStop: true,
    canStop: false,
    effects: 'none',
  });

  const stopped = applyAccepted(applyAccepted(ready, { type: 'begin-stop' }), { type: 'stop' });
  const stoppedDescription = describePluginLifecycleSnapshot(stopped);

  assert.equal(stoppedDescription.terminal, true);
  assert.equal(stoppedDescription.acceptsWork, false);
  assert.equal(stoppedDescription.canStop, true);
  assertNoLeaks([readyDescription, stoppedDescription]);
});
