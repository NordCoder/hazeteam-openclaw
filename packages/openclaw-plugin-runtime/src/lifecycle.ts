export type PluginLifecycleState =
  | 'declared'
  | 'configured'
  | 'initialized'
  | 'started'
  | 'ready'
  | 'degraded'
  | 'stopping'
  | 'stopped'
  | 'failed';

export type PluginLifecycleTransitionType =
  | 'configure'
  | 'initialize'
  | 'start'
  | 'mark-ready'
  | 'degrade'
  | 'begin-stop'
  | 'stop'
  | 'fail';

export type PluginLifecycleReasonCategory =
  | 'lifecycle'
  | 'transition'
  | 'dependency'
  | 'shutdown'
  | 'unknown';

export interface PluginLifecycleReasonInput {
  readonly code?: string;
  readonly summary?: string;
  readonly category?: string;
}

export interface SafePluginLifecycleReason {
  readonly code: string;
  readonly summary: string;
  readonly category: PluginLifecycleReasonCategory;
}

export type PluginLifecycleTransition =
  | { readonly type: 'configure' }
  | { readonly type: 'initialize' }
  | { readonly type: 'start' }
  | { readonly type: 'mark-ready' }
  | { readonly type: 'degrade'; readonly reason?: PluginLifecycleReasonInput }
  | { readonly type: 'begin-stop' }
  | { readonly type: 'stop' }
  | { readonly type: 'fail'; readonly reason?: PluginLifecycleReasonInput };

export interface PluginLifecycleHistoryEntry {
  readonly from: PluginLifecycleState;
  readonly to: PluginLifecycleState;
  readonly event: PluginLifecycleTransitionType;
  readonly changed: boolean;
  readonly reason?: SafePluginLifecycleReason;
}

export interface PluginLifecycleSnapshot {
  readonly kind: 'plugin-lifecycle-snapshot';
  readonly state: PluginLifecycleState;
  readonly revision: number;
  readonly effects: 'none';
  readonly history: readonly PluginLifecycleHistoryEntry[];
  readonly lastDegradation?: SafePluginLifecycleReason;
  readonly lastFailure?: SafePluginLifecycleReason;
}

export interface PluginLifecycleAcceptedTransition {
  readonly kind: 'plugin-lifecycle-transition-result';
  readonly ok: true;
  readonly snapshot: PluginLifecycleSnapshot;
  readonly transition: {
    readonly from: PluginLifecycleState;
    readonly to: PluginLifecycleState;
    readonly event: PluginLifecycleTransitionType;
    readonly changed: boolean;
  };
}

export interface PluginLifecycleRejectedTransition {
  readonly kind: 'plugin-lifecycle-transition-result';
  readonly ok: false;
  readonly snapshot: PluginLifecycleSnapshot;
  readonly issue: SafePluginLifecycleReason;
}

export type PluginLifecycleTransitionResult =
  | PluginLifecycleAcceptedTransition
  | PluginLifecycleRejectedTransition;

export interface PluginLifecycleSnapshotDescription {
  readonly kind: 'plugin-lifecycle-description';
  readonly state: PluginLifecycleState;
  readonly revision: number;
  readonly terminal: boolean;
  readonly acceptsWork: boolean;
  readonly canConfigure: boolean;
  readonly canInitialize: boolean;
  readonly canStart: boolean;
  readonly canBecomeReady: boolean;
  readonly canDegrade: boolean;
  readonly canBeginStop: boolean;
  readonly canStop: boolean;
  readonly effects: 'none';
}

export const PLUGIN_LIFECYCLE_STATES = Object.freeze([
  'declared',
  'configured',
  'initialized',
  'started',
  'ready',
  'degraded',
  'stopping',
  'stopped',
  'failed',
] as const satisfies readonly PluginLifecycleState[]);

export const PLUGIN_LIFECYCLE_TRANSITIONS = Object.freeze([
  'configure',
  'initialize',
  'start',
  'mark-ready',
  'degrade',
  'begin-stop',
  'stop',
  'fail',
] as const satisfies readonly PluginLifecycleTransitionType[]);

const SAFE_REASON_FALLBACK = Object.freeze({
  code: 'lifecycle.safe_reason',
  summary: 'safe lifecycle reason',
  category: 'unknown',
} satisfies SafePluginLifecycleReason);

const SAFE_SUMMARY_OMITTED = 'safe summary omitted';
const MAX_REASON_CODE_LENGTH = 72;
const MAX_REASON_SUMMARY_LENGTH = 160;
const SAFE_REASON_CODE_PATTERN = /^[a-z][a-z0-9_.-]{0,71}$/u;

const UNSAFE_TEXT_PATTERNS = Object.freeze([
  /token/iu,
  /secret/iu,
  /password/iu,
  /credential/iu,
  /api\s*key/iu,
  /apikey/iu,
  /bearer/iu,
  /stack/iu,
  /raw\s*error/iu,
  /rawerror/iu,
  /raw\s*payload/iu,
  /rawpayload/iu,
  /raw\s*provider\s*response/iu,
  /rawproviderresponse/iu,
  /raw\s*runtime\s*payload/iu,
  /rawruntimepayload/iu,
  /raw\s*tool\s*payload/iu,
  /rawtoolpayload/iu,
  /filesystem/iu,
  /storage\s*path/iu,
  /storagepath/iu,
  /network/iu,
  /webhook/iu,
  /polling/iu,
  /telegram/iu,
  /client\s+handle/iu,
  /clienthandle/iu,
  /openclaw\s+client\s+handle/iu,
  /sdk/iu,
  /(^|\s|["'([{])\/[a-z0-9_.-]+/iu,
  /[a-z]:\\/iu,
]);

const REASON_CATEGORIES = Object.freeze([
  'lifecycle',
  'transition',
  'dependency',
  'shutdown',
  'unknown',
] as const satisfies readonly PluginLifecycleReasonCategory[]);

export function createInitialPluginLifecycleSnapshot(): PluginLifecycleSnapshot {
  return Object.freeze({
    kind: 'plugin-lifecycle-snapshot',
    state: 'declared',
    revision: 0,
    effects: 'none',
    history: Object.freeze([]),
  } satisfies PluginLifecycleSnapshot);
}

export function createSafePluginLifecycleReason(
  input: PluginLifecycleReasonInput = {},
): SafePluginLifecycleReason {
  const reason = {
    code: normalizeReasonCode(input.code),
    summary: normalizeReasonSummary(input.summary),
    category: normalizeReasonCategory(input.category),
  } satisfies SafePluginLifecycleReason;

  return Object.freeze(reason);
}

export function createPluginLifecycleFailureReason(
  input: PluginLifecycleReasonInput = {},
): SafePluginLifecycleReason {
  return createSafePluginLifecycleReason({
    code: 'lifecycle.failed',
    summary: 'lifecycle failed safely',
    category: 'lifecycle',
    ...input,
  });
}

export function applyPluginLifecycleTransition(
  snapshot: PluginLifecycleSnapshot,
  transition: PluginLifecycleTransition,
): PluginLifecycleTransitionResult {
  if (!isPluginLifecycleState(snapshot.state)) {
    return rejectTransition(snapshot, 'lifecycle.invalid_snapshot', 'snapshot state is not recognized');
  }

  switch (transition.type) {
    case 'configure':
      return transitionTo(snapshot, transition, snapshot.state === 'declared' ? 'configured' : undefined);
    case 'initialize':
      return transitionTo(snapshot, transition, snapshot.state === 'configured' ? 'initialized' : undefined);
    case 'start':
      return transitionTo(snapshot, transition, snapshot.state === 'initialized' ? 'started' : undefined);
    case 'mark-ready':
      return transitionTo(
        snapshot,
        transition,
        snapshot.state === 'started' || snapshot.state === 'degraded' ? 'ready' : undefined,
      );
    case 'degrade':
      return transitionTo(
        snapshot,
        transition,
        snapshot.state === 'started' || snapshot.state === 'ready' ? 'degraded' : undefined,
        createSafePluginLifecycleReason({
          code: 'lifecycle.degraded',
          summary: 'optional component is degraded',
          category: 'dependency',
          ...transition.reason,
        }),
      );
    case 'begin-stop':
      return beginStop(snapshot, transition);
    case 'stop':
      return stop(snapshot, transition);
    case 'fail':
      return fail(snapshot, transition);
    default:
      return rejectTransition(snapshot, 'lifecycle.unknown_event', 'event is not recognized');
  }
}

export function describePluginLifecycleSnapshot(
  snapshot: PluginLifecycleSnapshot,
): PluginLifecycleSnapshotDescription {
  return Object.freeze({
    kind: 'plugin-lifecycle-description',
    state: snapshot.state,
    revision: snapshot.revision,
    terminal: snapshot.state === 'stopped' || snapshot.state === 'failed',
    acceptsWork: snapshot.state === 'ready' || snapshot.state === 'degraded',
    canConfigure: snapshot.state === 'declared',
    canInitialize: snapshot.state === 'configured',
    canStart: snapshot.state === 'initialized',
    canBecomeReady: snapshot.state === 'started' || snapshot.state === 'degraded',
    canDegrade: snapshot.state === 'started' || snapshot.state === 'ready',
    canBeginStop: snapshot.state !== 'stopping' && snapshot.state !== 'stopped',
    canStop: snapshot.state === 'stopping' || snapshot.state === 'stopped',
    effects: 'none',
  } satisfies PluginLifecycleSnapshotDescription);
}

function beginStop(
  snapshot: PluginLifecycleSnapshot,
  transition: { readonly type: 'begin-stop' },
): PluginLifecycleTransitionResult {
  if (snapshot.state === 'stopped') {
    return acceptUnchanged(snapshot, transition.type);
  }

  if (snapshot.state === 'stopping') {
    return acceptUnchanged(snapshot, transition.type);
  }

  return transitionTo(snapshot, transition, 'stopping');
}

function stop(
  snapshot: PluginLifecycleSnapshot,
  transition: { readonly type: 'stop' },
): PluginLifecycleTransitionResult {
  if (snapshot.state === 'stopped') {
    return acceptUnchanged(snapshot, transition.type);
  }

  return transitionTo(snapshot, transition, snapshot.state === 'stopping' ? 'stopped' : undefined);
}

function fail(
  snapshot: PluginLifecycleSnapshot,
  transition: { readonly type: 'fail'; readonly reason?: PluginLifecycleReasonInput },
): PluginLifecycleTransitionResult {
  if (snapshot.state === 'failed') {
    return rejectTransition(snapshot, 'lifecycle.already_failed', 'lifecycle is already failed');
  }

  if (snapshot.state === 'stopped') {
    return rejectTransition(snapshot, 'lifecycle.already_stopped', 'lifecycle is already stopped');
  }

  return transitionTo(
    snapshot,
    transition,
    'failed',
    createPluginLifecycleFailureReason(transition.reason),
  );
}

function transitionTo(
  snapshot: PluginLifecycleSnapshot,
  transition: PluginLifecycleTransition,
  target: PluginLifecycleState | undefined,
  reason?: SafePluginLifecycleReason,
): PluginLifecycleTransitionResult {
  if (target === undefined) {
    return rejectTransition(snapshot, 'lifecycle.invalid_transition', 'event is not allowed for current state');
  }

  if (target === snapshot.state) {
    return acceptUnchanged(snapshot, transition.type);
  }

  const historyEntry = Object.freeze({
    from: snapshot.state,
    to: target,
    event: transition.type,
    changed: true,
    ...(reason === undefined ? {} : { reason }),
  } satisfies PluginLifecycleHistoryEntry);

  const nextSnapshot: {
    kind: 'plugin-lifecycle-snapshot';
    state: PluginLifecycleState;
    revision: number;
    effects: 'none';
    history: readonly PluginLifecycleHistoryEntry[];
    lastDegradation?: SafePluginLifecycleReason;
    lastFailure?: SafePluginLifecycleReason;
  } = {
    kind: 'plugin-lifecycle-snapshot',
    state: target,
    revision: snapshot.revision + 1,
    effects: 'none',
    history: Object.freeze([...snapshot.history, historyEntry]),
  };

  if (transition.type === 'degrade' && reason !== undefined) {
    nextSnapshot.lastDegradation = reason;
  } else if (transition.type !== 'mark-ready' && snapshot.lastDegradation !== undefined) {
    nextSnapshot.lastDegradation = snapshot.lastDegradation;
  }

  if (transition.type === 'fail' && reason !== undefined) {
    nextSnapshot.lastFailure = reason;
  } else if (snapshot.lastFailure !== undefined) {
    nextSnapshot.lastFailure = snapshot.lastFailure;
  }

  return acceptTransition(snapshot.state, target, transition.type, Object.freeze(nextSnapshot));
}

function acceptUnchanged(
  snapshot: PluginLifecycleSnapshot,
  event: PluginLifecycleTransitionType,
): PluginLifecycleTransitionResult {
  return acceptTransition(snapshot.state, snapshot.state, event, snapshot, false);
}

function acceptTransition(
  from: PluginLifecycleState,
  to: PluginLifecycleState,
  event: PluginLifecycleTransitionType,
  snapshot: PluginLifecycleSnapshot,
  changed = true,
): PluginLifecycleAcceptedTransition {
  return Object.freeze({
    kind: 'plugin-lifecycle-transition-result',
    ok: true,
    snapshot,
    transition: Object.freeze({
      from,
      to,
      event,
      changed,
    }),
  } satisfies PluginLifecycleAcceptedTransition);
}

function rejectTransition(
  snapshot: PluginLifecycleSnapshot,
  code: string,
  summary: string,
): PluginLifecycleRejectedTransition {
  return Object.freeze({
    kind: 'plugin-lifecycle-transition-result',
    ok: false,
    snapshot,
    issue: createSafePluginLifecycleReason({
      code,
      summary,
      category: 'transition',
    }),
  } satisfies PluginLifecycleRejectedTransition);
}

function isPluginLifecycleState(value: string): value is PluginLifecycleState {
  return PLUGIN_LIFECYCLE_STATES.includes(value as PluginLifecycleState);
}

function normalizeReasonCode(value: string | undefined): string {
  if (value === undefined) {
    return SAFE_REASON_FALLBACK.code;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, '_')
    .replace(/[^a-z0-9_.-]/gu, '_')
    .slice(0, MAX_REASON_CODE_LENGTH);

  if (!SAFE_REASON_CODE_PATTERN.test(normalized) || containsUnsafeText(normalized)) {
    return SAFE_REASON_FALLBACK.code;
  }

  return normalized;
}

function normalizeReasonSummary(value: string | undefined): string {
  if (value === undefined) {
    return SAFE_REASON_FALLBACK.summary;
  }

  const normalized = value.trim().replace(/\s+/gu, ' ').slice(0, MAX_REASON_SUMMARY_LENGTH);

  if (normalized.length === 0) {
    return SAFE_REASON_FALLBACK.summary;
  }

  if (containsUnsafeText(normalized)) {
    return SAFE_SUMMARY_OMITTED;
  }

  return normalized;
}

function normalizeReasonCategory(value: string | undefined): PluginLifecycleReasonCategory {
  if (value === undefined) {
    return SAFE_REASON_FALLBACK.category;
  }

  if (REASON_CATEGORIES.includes(value as PluginLifecycleReasonCategory)) {
    return value as PluginLifecycleReasonCategory;
  }

  return SAFE_REASON_FALLBACK.category;
}

function containsUnsafeText(value: string): boolean {
  return UNSAFE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}
