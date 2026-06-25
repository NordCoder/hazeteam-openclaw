export type OcaRefKind =
  | 'session'
  | 'task'
  | 'repo'
  | 'worktree'
  | 'branch'
  | 'output'
  | 'log'
  | 'diff'
  | 'artifact'
  | 'review';

export type OcaSessionRef = SafeOcaRef<'session'>;
export type OcaTaskRef = SafeOcaRef<'task'>;
export type OcaRepoRef = SafeOcaRef<'repo'>;
export type OcaWorktreeRef = SafeOcaRef<'worktree'>;
export type OcaBranchRef = SafeOcaRef<'branch'>;
export type OcaOutputRef = SafeOcaRef<'output'>;
export type OcaLogRef = SafeOcaRef<'log'>;
export type OcaDiffRef = SafeOcaRef<'diff'>;
export type OcaArtifactRef = SafeOcaRef<'artifact'>;
export type OcaReviewRef = SafeOcaRef<'review'>;

export type OcaSessionLifecycleState = (typeof OCA_SESSION_LIFECYCLE_STATES)[number];
export type OcaSessionDerivedStatus = (typeof OCA_SESSION_DERIVED_STATUSES)[number];
export type OcaSessionTerminalState = (typeof OCA_SESSION_TERMINAL_STATES)[number];

export type OcaSessionModelReasonCode =
  | 'not-object'
  | 'not-string'
  | 'not-array'
  | 'empty'
  | 'too-long'
  | 'invalid-prefix'
  | 'invalid-format'
  | 'unsafe-marker'
  | 'invalid-state'
  | 'invalid-status'
  | 'status-mismatch'
  | 'invalid-transition'
  | 'missing-field'
  | 'invalid-field'
  | 'invalid-item'
  | 'unsafe-json';

export interface OcaSessionModelValidationIssue {
  readonly code: OcaSessionModelReasonCode;
  readonly field: string;
  readonly refKind?: OcaRefKind | OcaSafeAuxiliaryRefKind;
}

export type OcaRefValidationResult<TRef extends string> =
  | {
      readonly ok: true;
      readonly value: TRef;
    }
  | {
      readonly ok: false;
      readonly issues: readonly OcaSessionModelValidationIssue[];
    };

export type OcaSessionModelValidationResult =
  | {
      readonly ok: true;
      readonly value: OcaSessionModel;
    }
  | {
      readonly ok: false;
      readonly issues: readonly OcaSessionModelValidationIssue[];
    };

export interface OcaSessionStatusFlags {
  readonly degraded?: boolean;
  readonly stale?: boolean;
  readonly blocked?: boolean;
}

export interface OcaSessionPublicIssue {
  readonly code: string;
  readonly summary: string;
  readonly ref?: SafePublicRef;
}

export interface OcaSessionModel {
  readonly sessionRef: OcaSessionRef;
  readonly taskRef: OcaTaskRef;
  readonly lifecycleState: OcaSessionLifecycleState;
  readonly derivedStatus: OcaSessionDerivedStatus;
  readonly outputRefs: readonly OcaOutputRef[];
  readonly logRefs: readonly OcaLogRef[];
  readonly diffRefs: readonly OcaDiffRef[];
  readonly artifactRefs: readonly OcaArtifactRef[];
  readonly reviewRefs: readonly OcaReviewRef[];
  readonly workspaceRef?: SafePublicRef;
  readonly agentRef?: SafePublicRef;
  readonly actorRef?: SafePublicRef;
  readonly profileRef?: SafePublicRef;
  readonly repoRef?: OcaRepoRef;
  readonly worktreeRef?: OcaWorktreeRef;
  readonly branchRef?: OcaBranchRef;
  readonly correlationRef?: SafePublicRef;
  readonly idempotencyRef?: SafePublicRef;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly summary?: string;
  readonly issues: readonly OcaSessionPublicIssue[];
}

export const OCA_SAFE_REF_PREFIXES = Object.freeze({
  session: 'oca-session:',
  task: 'oca-task:',
  repo: 'oca-repo:',
  worktree: 'oca-worktree:',
  branch: 'oca-branch:',
  output: 'oca-output:',
  log: 'oca-log:',
  diff: 'oca-diff:',
  artifact: 'oca-artifact:',
  review: 'oca-review:',
} as const satisfies Record<OcaRefKind, string>);

export const OCA_SESSION_LIFECYCLE_STATES = Object.freeze([
  'planned',
  'requested',
  'approval-required',
  'starting',
  'active',
  'waiting-for-input',
  'waiting-for-approval',
  'producing-output',
  'completed',
  'failed',
  'cancelled',
  'expired',
  'archived',
] as const);

export const OCA_SESSION_DERIVED_STATUSES = Object.freeze([
  'healthy',
  'degraded',
  'blocked',
  'stale',
  'terminal',
] as const);

export const OCA_SESSION_TERMINAL_STATES = Object.freeze([
  'completed',
  'failed',
  'cancelled',
  'expired',
  'archived',
] as const satisfies readonly OcaSessionLifecycleState[]);

export function validateOcaSessionRef(value: unknown): OcaRefValidationResult<OcaSessionRef> {
  return validateOcaRef('session', value) as OcaRefValidationResult<OcaSessionRef>;
}

export function validateOcaTaskRef(value: unknown): OcaRefValidationResult<OcaTaskRef> {
  return validateOcaRef('task', value) as OcaRefValidationResult<OcaTaskRef>;
}

export function validateOcaRepoRef(value: unknown): OcaRefValidationResult<OcaRepoRef> {
  return validateOcaRef('repo', value) as OcaRefValidationResult<OcaRepoRef>;
}

export function validateOcaWorktreeRef(value: unknown): OcaRefValidationResult<OcaWorktreeRef> {
  return validateOcaRef('worktree', value) as OcaRefValidationResult<OcaWorktreeRef>;
}

export function validateOcaBranchRef(value: unknown): OcaRefValidationResult<OcaBranchRef> {
  return validateOcaRef('branch', value) as OcaRefValidationResult<OcaBranchRef>;
}

export function validateOcaOutputRef(value: unknown): OcaRefValidationResult<OcaOutputRef> {
  return validateOcaRef('output', value) as OcaRefValidationResult<OcaOutputRef>;
}

export function validateOcaLogRef(value: unknown): OcaRefValidationResult<OcaLogRef> {
  return validateOcaRef('log', value) as OcaRefValidationResult<OcaLogRef>;
}

export function validateOcaDiffRef(value: unknown): OcaRefValidationResult<OcaDiffRef> {
  return validateOcaRef('diff', value) as OcaRefValidationResult<OcaDiffRef>;
}

export function validateOcaArtifactRef(value: unknown): OcaRefValidationResult<OcaArtifactRef> {
  return validateOcaRef('artifact', value) as OcaRefValidationResult<OcaArtifactRef>;
}

export function validateOcaReviewRef(value: unknown): OcaRefValidationResult<OcaReviewRef> {
  return validateOcaRef('review', value) as OcaRefValidationResult<OcaReviewRef>;
}

export function isOcaSessionRef(value: unknown): value is OcaSessionRef {
  return validateOcaSessionRef(value).ok;
}

export function isOcaTaskRef(value: unknown): value is OcaTaskRef {
  return validateOcaTaskRef(value).ok;
}

export function isOcaRepoRef(value: unknown): value is OcaRepoRef {
  return validateOcaRepoRef(value).ok;
}

export function isOcaWorktreeRef(value: unknown): value is OcaWorktreeRef {
  return validateOcaWorktreeRef(value).ok;
}

export function isOcaBranchRef(value: unknown): value is OcaBranchRef {
  return validateOcaBranchRef(value).ok;
}

export function isOcaOutputRef(value: unknown): value is OcaOutputRef {
  return validateOcaOutputRef(value).ok;
}

export function isOcaLogRef(value: unknown): value is OcaLogRef {
  return validateOcaLogRef(value).ok;
}

export function isOcaDiffRef(value: unknown): value is OcaDiffRef {
  return validateOcaDiffRef(value).ok;
}

export function isOcaArtifactRef(value: unknown): value is OcaArtifactRef {
  return validateOcaArtifactRef(value).ok;
}

export function isOcaReviewRef(value: unknown): value is OcaReviewRef {
  return validateOcaReviewRef(value).ok;
}

export function validateOcaRef(kind: OcaRefKind, value: unknown): OcaRefValidationResult<SafeOcaRef<OcaRefKind>> {
  return validatePrefixedRef(kind, OCA_SAFE_REF_PREFIXES[kind], value, kind) as OcaRefValidationResult<SafeOcaRef<OcaRefKind>>;
}

export function deriveOcaSessionStatus(
  lifecycleState: OcaSessionLifecycleState,
  flags: OcaSessionStatusFlags = {},
): OcaSessionDerivedStatus {
  if (isOcaTerminalLifecycleState(lifecycleState)) {
    return 'terminal';
  }

  if (lifecycleState === 'approval-required' || lifecycleState === 'waiting-for-approval' || flags.blocked === true) {
    return 'blocked';
  }

  if (flags.stale === true) {
    return 'stale';
  }

  if (flags.degraded === true) {
    return 'degraded';
  }

  if (lifecycleState === 'waiting-for-input') {
    return 'blocked';
  }

  return 'healthy';
}

export function isOcaSessionLifecycleState(value: unknown): value is OcaSessionLifecycleState {
  return typeof value === 'string' && LIFECYCLE_STATE_SET.has(value as OcaSessionLifecycleState);
}

export function isOcaSessionDerivedStatus(value: unknown): value is OcaSessionDerivedStatus {
  return typeof value === 'string' && DERIVED_STATUS_SET.has(value as OcaSessionDerivedStatus);
}

export function isOcaTerminalLifecycleState(value: OcaSessionLifecycleState): value is OcaSessionTerminalState {
  return TERMINAL_STATE_SET.has(value as OcaSessionTerminalState);
}

export function canTransitionOcaSessionLifecycle(
  from: OcaSessionLifecycleState,
  to: OcaSessionLifecycleState,
): boolean {
  if (from === to) {
    return false;
  }

  if (to === 'archived') {
    return isOcaTerminalLifecycleState(from) && from !== 'archived';
  }

  if (isOcaTerminalLifecycleState(from)) {
    return false;
  }

  return TRANSITIONS[from].has(to);
}

export function validateOcaSessionLifecycleTransition(
  from: unknown,
  to: unknown,
):
  | {
      readonly ok: true;
      readonly from: OcaSessionLifecycleState;
      readonly to: OcaSessionLifecycleState;
    }
  | {
      readonly ok: false;
      readonly issues: readonly OcaSessionModelValidationIssue[];
    } {
  const issues: OcaSessionModelValidationIssue[] = [];

  if (!isOcaSessionLifecycleState(from)) {
    issues.push(issue('invalid-state', 'from'));
  }

  if (!isOcaSessionLifecycleState(to)) {
    issues.push(issue('invalid-state', 'to'));
  }

  if (issues.length > 0) {
    return invalid(issues);
  }

  const fromState = from as OcaSessionLifecycleState;
  const toState = to as OcaSessionLifecycleState;

  if (!canTransitionOcaSessionLifecycle(fromState, toState)) {
    return invalid([issue('invalid-transition', 'lifecycleState')]);
  }

  return Object.freeze({ ok: true, from: fromState, to: toState });
}

export function normalizeOcaSessionModel(input: unknown): OcaSessionModelValidationResult {
  if (!isRecord(input)) {
    return invalid([issue('not-object', 'session')]);
  }

  const issues: OcaSessionModelValidationIssue[] = [];
  const sessionRef = readRequiredRef(input, 'sessionRef', validateOcaSessionRef, issues);
  const taskRef = readRequiredRef(input, 'taskRef', validateOcaTaskRef, issues);
  const lifecycleState = readLifecycleState(input, issues);
  const derivedStatus = readDerivedStatus(input, lifecycleState, issues);
  const outputRefs = readRefArray(input, 'outputRefs', validateOcaOutputRef, issues);
  const logRefs = readRefArray(input, 'logRefs', validateOcaLogRef, issues);
  const diffRefs = readRefArray(input, 'diffRefs', validateOcaDiffRef, issues);
  const artifactRefs = readRefArray(input, 'artifactRefs', validateOcaArtifactRef, issues);
  const reviewRefs = readRefArray(input, 'reviewRefs', validateOcaReviewRef, issues);
  const repoRef = readOptionalRef(input, 'repoRef', validateOcaRepoRef, issues);
  const worktreeRef = readOptionalRef(input, 'worktreeRef', validateOcaWorktreeRef, issues);
  const branchRef = readOptionalRef(input, 'branchRef', validateOcaBranchRef, issues);
  const workspaceRef = readOptionalAuxiliaryRef(input, 'workspaceRef', 'workspace', issues);
  const agentRef = readOptionalAuxiliaryRef(input, 'agentRef', 'agent', issues);
  const actorRef = readOptionalAuxiliaryRef(input, 'actorRef', 'actor', issues);
  const profileRef = readOptionalAuxiliaryRef(input, 'profileRef', 'profile', issues);
  const correlationRef = readOptionalAuxiliaryRef(input, 'correlationRef', 'correlation', issues);
  const idempotencyRef = readOptionalAuxiliaryRef(input, 'idempotencyRef', 'idempotency', issues);
  const createdAt = readOptionalTimestamp(input, 'createdAt', issues);
  const updatedAt = readOptionalTimestamp(input, 'updatedAt', issues);
  const summary = readOptionalSummary(input, 'summary', issues);
  const modelIssues = readPublicIssues(input, issues);

  if (issues.length > 0) {
    return invalid(issues);
  }

  if (sessionRef === undefined || taskRef === undefined || lifecycleState === undefined || derivedStatus === undefined) {
    return invalid([issue('invalid-field', 'session')]);
  }

  const optionalFields: OcaSessionModelOptionalFields = {};
  assignOptional(optionalFields, 'workspaceRef', workspaceRef);
  assignOptional(optionalFields, 'agentRef', agentRef);
  assignOptional(optionalFields, 'actorRef', actorRef);
  assignOptional(optionalFields, 'profileRef', profileRef);
  assignOptional(optionalFields, 'repoRef', repoRef);
  assignOptional(optionalFields, 'worktreeRef', worktreeRef);
  assignOptional(optionalFields, 'branchRef', branchRef);
  assignOptional(optionalFields, 'correlationRef', correlationRef);
  assignOptional(optionalFields, 'idempotencyRef', idempotencyRef);
  assignOptional(optionalFields, 'createdAt', createdAt);
  assignOptional(optionalFields, 'updatedAt', updatedAt);
  assignOptional(optionalFields, 'summary', summary);

  const value = Object.freeze({
    sessionRef,
    taskRef,
    lifecycleState,
    derivedStatus,
    outputRefs: Object.freeze([...outputRefs]),
    logRefs: Object.freeze([...logRefs]),
    diffRefs: Object.freeze([...diffRefs]),
    artifactRefs: Object.freeze([...artifactRefs]),
    reviewRefs: Object.freeze([...reviewRefs]),
    ...optionalFields,
    issues: Object.freeze(modelIssues.map(clonePublicIssue)),
  } satisfies OcaSessionModel);

  if (!isSafeOcaSessionModelJson(value)) {
    return invalid([issue('unsafe-json', 'session')]);
  }

  return Object.freeze({ ok: true, value });
}

export function isSafeOcaSessionModelJson(value: unknown): boolean {
  return isSafeSerializableValue(value);
}

export function cloneOcaSessionModel(model: OcaSessionModel): OcaSessionModel {
  const optionalFields: OcaSessionModelOptionalFields = {};
  assignOptional(optionalFields, 'workspaceRef', model.workspaceRef);
  assignOptional(optionalFields, 'agentRef', model.agentRef);
  assignOptional(optionalFields, 'actorRef', model.actorRef);
  assignOptional(optionalFields, 'profileRef', model.profileRef);
  assignOptional(optionalFields, 'repoRef', model.repoRef);
  assignOptional(optionalFields, 'worktreeRef', model.worktreeRef);
  assignOptional(optionalFields, 'branchRef', model.branchRef);
  assignOptional(optionalFields, 'correlationRef', model.correlationRef);
  assignOptional(optionalFields, 'idempotencyRef', model.idempotencyRef);
  assignOptional(optionalFields, 'createdAt', model.createdAt);
  assignOptional(optionalFields, 'updatedAt', model.updatedAt);
  assignOptional(optionalFields, 'summary', model.summary);

  return Object.freeze({
    sessionRef: model.sessionRef,
    taskRef: model.taskRef,
    lifecycleState: model.lifecycleState,
    derivedStatus: model.derivedStatus,
    outputRefs: Object.freeze([...model.outputRefs]),
    logRefs: Object.freeze([...model.logRefs]),
    diffRefs: Object.freeze([...model.diffRefs]),
    artifactRefs: Object.freeze([...model.artifactRefs]),
    reviewRefs: Object.freeze([...model.reviewRefs]),
    ...optionalFields,
    issues: Object.freeze(model.issues.map(clonePublicIssue)),
  } satisfies OcaSessionModel);
}

type SafeOcaRef<TKind extends OcaRefKind> = string & {
  readonly __ocaRefKind: TKind;
};

type SafePublicRef = string & {
  readonly __safePublicRef: true;
};

type OcaSafeAuxiliaryRefKind = 'workspace' | 'agent' | 'actor' | 'profile' | 'correlation' | 'idempotency';

type Mutable<T> = {
  -readonly [TKey in keyof T]: T[TKey];
};

type OcaSessionModelOptionalFields = Partial<
  Mutable<
    Pick<
      OcaSessionModel,
      | 'workspaceRef'
      | 'agentRef'
      | 'actorRef'
      | 'profileRef'
      | 'repoRef'
      | 'worktreeRef'
      | 'branchRef'
      | 'correlationRef'
      | 'idempotencyRef'
      | 'createdAt'
      | 'updatedAt'
      | 'summary'
    >
  >
>;

const MAX_REF_LENGTH = 96;
const MAX_REF_BODY_LENGTH = 64;
const MAX_REF_LIST_LENGTH = 24;
const MAX_PUBLIC_STRING_LENGTH = 512;
const MAX_SUMMARY_LENGTH = 240;
const MAX_PUBLIC_ISSUES = 16;
const MAX_ISSUE_CODE_LENGTH = 64;
const SAFE_REF_BODY_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/u;
const SAFE_ISSUE_CODE_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/u;
const SAFE_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const URL_LIKE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//iu;
const RAW_REMOTE_PATTERN = /^(?:git@|ssh:)|(?:^|[.@-])github[.]|[.]git$/iu;
const DRIVE_LIKE_PATTERN = /^[a-z]:/iu;
const NUMERIC_PATTERN = /^\d+$/u;

const AUXILIARY_REF_PREFIXES = Object.freeze({
  workspace: 'workspace:',
  agent: 'agent:',
  actor: 'actor:',
  profile: 'profile:',
  correlation: 'correlation:',
  idempotency: 'idempotency:',
} as const satisfies Record<OcaSafeAuxiliaryRefKind, string>);

const LIFECYCLE_STATE_SET = new Set<OcaSessionLifecycleState>(OCA_SESSION_LIFECYCLE_STATES);
const DERIVED_STATUS_SET = new Set<OcaSessionDerivedStatus>(OCA_SESSION_DERIVED_STATUSES);
const TERMINAL_STATE_SET = new Set<OcaSessionTerminalState>(OCA_SESSION_TERMINAL_STATES);

const TRANSITIONS: Readonly<Record<OcaSessionLifecycleState, ReadonlySet<OcaSessionLifecycleState>>> = Object.freeze({
  planned: frozenStateSet(['requested', 'cancelled', 'expired']),
  requested: frozenStateSet(['approval-required', 'starting', 'cancelled', 'expired']),
  'approval-required': frozenStateSet(['starting', 'waiting-for-approval', 'cancelled', 'expired']),
  starting: frozenStateSet(['active', 'failed', 'cancelled', 'expired']),
  active: frozenStateSet([
    'waiting-for-input',
    'waiting-for-approval',
    'producing-output',
    'completed',
    'failed',
    'cancelled',
    'expired',
  ]),
  'waiting-for-input': frozenStateSet(['active', 'waiting-for-approval', 'producing-output', 'failed', 'cancelled', 'expired']),
  'waiting-for-approval': frozenStateSet(['active', 'producing-output', 'failed', 'cancelled', 'expired']),
  'producing-output': frozenStateSet(['active', 'waiting-for-input', 'completed', 'failed', 'cancelled', 'expired']),
  completed: frozenStateSet(['archived']),
  failed: frozenStateSet(['archived']),
  cancelled: frozenStateSet(['archived']),
  expired: frozenStateSet(['archived']),
  archived: frozenStateSet([]),
});

function validatePrefixedRef<TRef extends string>(
  kind: OcaRefKind | OcaSafeAuxiliaryRefKind,
  prefix: string,
  value: unknown,
  refKind: OcaRefKind | OcaSafeAuxiliaryRefKind,
): OcaRefValidationResult<TRef> {
  const field = String(kind) + 'Ref';

  if (typeof value !== 'string') {
    return invalid([issue('not-string', field, refKind)]);
  }

  if (value.length === 0) {
    return invalid([issue('empty', field, refKind)]);
  }

  if (value.length > MAX_REF_LENGTH) {
    return invalid([issue('too-long', field, refKind)]);
  }

  if (!value.startsWith(prefix)) {
    return invalid([issue('invalid-prefix', field, refKind)]);
  }

  if (hasUnsafeRefEnvelope(value)) {
    return invalid([issue('unsafe-marker', field, refKind)]);
  }

  const body = value.slice(prefix.length);

  if (body.length === 0) {
    return invalid([issue('empty', field, refKind)]);
  }

  if (body.length > MAX_REF_BODY_LENGTH) {
    return invalid([issue('too-long', field, refKind)]);
  }

  if (hasUnsafeRefBody(body)) {
    return invalid([issue('unsafe-marker', field, refKind)]);
  }

  if (!SAFE_REF_BODY_PATTERN.test(body)) {
    return invalid([issue('invalid-format', field, refKind)]);
  }

  return Object.freeze({ ok: true, value: value as TRef });
}

function validateAuxiliaryRef(kind: OcaSafeAuxiliaryRefKind, value: unknown): OcaRefValidationResult<SafePublicRef> {
  return validatePrefixedRef(kind, AUXILIARY_REF_PREFIXES[kind], value, kind);
}

function hasUnsafeRefEnvelope(value: string): boolean {
  const trimmed = value.trim();

  if (trimmed !== value) {
    return true;
  }

  return (
    /\s/u.test(value) ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('..') ||
    value.startsWith('{') ||
    value.startsWith('[') ||
    value.includes('{') ||
    value.includes('}') ||
    value.includes('[') ||
    value.includes(']') ||
    URL_LIKE_PATTERN.test(value) ||
    RAW_REMOTE_PATTERN.test(value) ||
    DRIVE_LIKE_PATTERN.test(value) ||
    value.startsWith('.') ||
    value.startsWith('~') ||
    hasUnsafeTextMarker(value)
  );
}

function hasUnsafeRefBody(body: string): boolean {
  return NUMERIC_PATTERN.test(body) || body.includes('..') || hasUnsafeTextMarker(body);
}

function readRequiredRef<TRef extends string>(
  input: Record<string, unknown>,
  field: string,
  validator: (value: unknown) => OcaRefValidationResult<TRef>,
  issues: OcaSessionModelValidationIssue[],
): TRef | undefined {
  if (!(field in input)) {
    issues.push(issue('missing-field', field));
    return undefined;
  }

  const result = validator(input[field]);
  if (!result.ok) {
    issues.push(...result.issues.map((currentIssue) => renameIssueField(currentIssue, field)));
    return undefined;
  }

  return result.value;
}

function readOptionalRef<TRef extends string>(
  input: Record<string, unknown>,
  field: string,
  validator: (value: unknown) => OcaRefValidationResult<TRef>,
  issues: OcaSessionModelValidationIssue[],
): TRef | undefined {
  if (!(field in input)) {
    return undefined;
  }

  const result = validator(input[field]);
  if (!result.ok) {
    issues.push(...result.issues.map((currentIssue) => renameIssueField(currentIssue, field)));
    return undefined;
  }

  return result.value;
}

function readOptionalAuxiliaryRef(
  input: Record<string, unknown>,
  field: keyof OcaSessionModelOptionalFields,
  kind: OcaSafeAuxiliaryRefKind,
  issues: OcaSessionModelValidationIssue[],
): SafePublicRef | undefined {
  if (!(field in input)) {
    return undefined;
  }

  const result = validateAuxiliaryRef(kind, input[field]);
  if (!result.ok) {
    issues.push(...result.issues.map((currentIssue) => renameIssueField(currentIssue, field)));
    return undefined;
  }

  return result.value;
}

function readRefArray<TRef extends string>(
  input: Record<string, unknown>,
  field: string,
  validator: (value: unknown) => OcaRefValidationResult<TRef>,
  issues: OcaSessionModelValidationIssue[],
): readonly TRef[] {
  if (!(field in input)) {
    return Object.freeze([]);
  }

  const value = input[field];
  if (!Array.isArray(value)) {
    issues.push(issue('not-array', field));
    return Object.freeze([]);
  }

  if (value.length > MAX_REF_LIST_LENGTH) {
    issues.push(issue('too-long', field));
    return Object.freeze([]);
  }

  const refs: TRef[] = [];
  for (const item of value) {
    const result = validator(item);
    if (!result.ok) {
      issues.push(issue('invalid-item', field));
      continue;
    }

    refs.push(result.value);
  }

  return Object.freeze(refs);
}

function readLifecycleState(
  input: Record<string, unknown>,
  issues: OcaSessionModelValidationIssue[],
): OcaSessionLifecycleState | undefined {
  if (!('lifecycleState' in input)) {
    issues.push(issue('missing-field', 'lifecycleState'));
    return undefined;
  }

  const value = input.lifecycleState;
  if (!isOcaSessionLifecycleState(value)) {
    issues.push(issue('invalid-state', 'lifecycleState'));
    return undefined;
  }

  return value;
}

function readDerivedStatus(
  input: Record<string, unknown>,
  lifecycleState: OcaSessionLifecycleState | undefined,
  issues: OcaSessionModelValidationIssue[],
): OcaSessionDerivedStatus | undefined {
  if (lifecycleState === undefined) {
    return undefined;
  }

  const expected = deriveOcaSessionStatus(lifecycleState);

  if (!('derivedStatus' in input)) {
    return expected;
  }

  const value = input.derivedStatus;
  if (!isOcaSessionDerivedStatus(value)) {
    issues.push(issue('invalid-status', 'derivedStatus'));
    return undefined;
  }

  if (value !== expected) {
    issues.push(issue('status-mismatch', 'derivedStatus'));
    return undefined;
  }

  return value;
}

function readOptionalTimestamp(
  input: Record<string, unknown>,
  field: 'createdAt' | 'updatedAt',
  issues: OcaSessionModelValidationIssue[],
): string | undefined {
  if (!(field in input)) {
    return undefined;
  }

  const value = input[field];
  if (typeof value !== 'string') {
    issues.push(issue('not-string', field));
    return undefined;
  }

  if (value.length > 32 || !SAFE_TIMESTAMP_PATTERN.test(value)) {
    issues.push(issue('invalid-format', field));
    return undefined;
  }

  return value;
}

function readOptionalSummary(
  input: Record<string, unknown>,
  field: 'summary',
  issues: OcaSessionModelValidationIssue[],
): string | undefined {
  if (!(field in input)) {
    return undefined;
  }

  const value = input[field];
  const result = normalizeBoundedSummary(value, field);
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }

  return result.value;
}

function normalizeBoundedSummary(value: unknown, field: string): OcaRefValidationResult<string> {
  if (typeof value !== 'string') {
    return invalid([issue('not-string', field)]);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return invalid([issue('empty', field)]);
  }

  if (normalized.length > MAX_SUMMARY_LENGTH) {
    return invalid([issue('too-long', field)]);
  }

  if (hasUnsafeSummaryMarker(normalized)) {
    return invalid([issue('unsafe-marker', field)]);
  }

  return Object.freeze({ ok: true, value: normalized });
}

function readPublicIssues(
  input: Record<string, unknown>,
  issues: OcaSessionModelValidationIssue[],
): readonly OcaSessionPublicIssue[] {
  if (!('issues' in input)) {
    return Object.freeze([]);
  }

  const value = input.issues;
  if (!Array.isArray(value)) {
    issues.push(issue('not-array', 'issues'));
    return Object.freeze([]);
  }

  if (value.length > MAX_PUBLIC_ISSUES) {
    issues.push(issue('too-long', 'issues'));
    return Object.freeze([]);
  }

  const publicIssues: OcaSessionPublicIssue[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      issues.push(issue('invalid-item', 'issues'));
      continue;
    }

    const publicIssue = normalizePublicIssue(item);
    if (publicIssue.ok) {
      publicIssues.push(publicIssue.value);
      continue;
    }

    issues.push(issue('invalid-item', 'issues'));
  }

  return Object.freeze(publicIssues);
}

function normalizePublicIssue(
  value: Record<string, unknown>,
):
  | {
      readonly ok: true;
      readonly value: OcaSessionPublicIssue;
    }
  | {
      readonly ok: false;
    } {
  if (typeof value.code !== 'string' || value.code.length === 0 || value.code.length > MAX_ISSUE_CODE_LENGTH) {
    return Object.freeze({ ok: false });
  }

  if (!SAFE_ISSUE_CODE_PATTERN.test(value.code) || hasUnsafeTextMarker(value.code)) {
    return Object.freeze({ ok: false });
  }

  const summaryResult = normalizeBoundedSummary(value.summary, 'issues.summary');
  if (!summaryResult.ok) {
    return Object.freeze({ ok: false });
  }

  const optional: { ref?: SafePublicRef } = {};
  if ('ref' in value) {
    const refResult = validateAuxiliaryRef('correlation', value.ref);
    if (!refResult.ok) {
      return Object.freeze({ ok: false });
    }

    optional.ref = refResult.value;
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      code: value.code,
      summary: summaryResult.value,
      ...optional,
    } satisfies OcaSessionPublicIssue),
  });
}

function clonePublicIssue(publicIssue: OcaSessionPublicIssue): OcaSessionPublicIssue {
  const optional: { ref?: SafePublicRef } = {};
  if (publicIssue.ref !== undefined) {
    optional.ref = publicIssue.ref;
  }

  return Object.freeze({
    code: publicIssue.code,
    summary: publicIssue.summary,
    ...optional,
  } satisfies OcaSessionPublicIssue);
}

function assignOptional<TKey extends keyof OcaSessionModelOptionalFields>(
  target: OcaSessionModelOptionalFields,
  key: TKey,
  value: OcaSessionModelOptionalFields[TKey] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function isSafeSerializableValue(value: unknown): boolean {
  if (value === null) {
    return true;
  }

  if (typeof value === 'string') {
    return value.length <= MAX_PUBLIC_STRING_LENGTH && !hasUnsafeSummaryMarker(value);
  }

  if (typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isSafeSerializableValue);
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (UNSAFE_PUBLIC_JSON_KEYS.has(key) || !isSafeSerializableValue(child)) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function hasUnsafeSummaryMarker(value: string): boolean {
  return (
    value.includes('\n') ||
    value.includes('\r') ||
    value.includes('\t') ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('..') ||
    value.startsWith('{') ||
    value.startsWith('[') ||
    value.includes('{') ||
    value.includes('}') ||
    value.includes('[') ||
    value.includes(']') ||
    URL_LIKE_PATTERN.test(value) ||
    RAW_REMOTE_PATTERN.test(value) ||
    DRIVE_LIKE_PATTERN.test(value) ||
    value.startsWith('.') ||
    value.startsWith('~') ||
    hasUnsafeTextMarker(value)
  );
}

function hasUnsafeTextMarker(value: string): boolean {
  const lower = value.toLowerCase();

  return UNSAFE_TEXT_MARKERS.some((marker) => lower.includes(marker));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function frozenStateSet(values: readonly OcaSessionLifecycleState[]): ReadonlySet<OcaSessionLifecycleState> {
  return new Set(values);
}

function invalid(issues: readonly OcaSessionModelValidationIssue[]): { readonly ok: false; readonly issues: readonly OcaSessionModelValidationIssue[] } {
  return Object.freeze({ ok: false, issues: Object.freeze(issues.map(cloneIssue)) });
}

function issue(
  code: OcaSessionModelReasonCode,
  field: string,
  refKind?: OcaRefKind | OcaSafeAuxiliaryRefKind,
): OcaSessionModelValidationIssue {
  const base = { code, field };
  if (refKind === undefined) {
    return Object.freeze(base);
  }

  return Object.freeze({ ...base, refKind });
}

function cloneIssue(currentIssue: OcaSessionModelValidationIssue): OcaSessionModelValidationIssue {
  return issue(currentIssue.code, currentIssue.field, currentIssue.refKind);
}

function renameIssueField(currentIssue: OcaSessionModelValidationIssue, field: string): OcaSessionModelValidationIssue {
  return issue(currentIssue.code, field, currentIssue.refKind);
}

function fromCharCodes(codes: readonly number[]): string {
  return String.fromCharCode(...codes);
}

const UNSAFE_PUBLIC_JSON_KEYS = new Set(
  [
    [114, 97, 119, 76, 111, 103],
    [114, 97, 119, 68, 105, 102, 102],
    [114, 97, 119, 79, 117, 116, 112, 117, 116],
    [114, 97, 119, 80, 97, 116, 104],
    [102, 105, 108, 101, 80, 97, 116, 104],
    [114, 101, 112, 111, 80, 97, 116, 104],
    [119, 111, 114, 107, 115, 112, 97, 99, 101, 80, 97, 116, 104],
    [112, 114, 111, 118, 105, 100, 101, 114, 80, 97, 121, 108, 111, 97, 100],
    [114, 117, 110, 116, 105, 109, 101, 80, 97, 121, 108, 111, 97, 100],
    [99, 108, 105, 101, 110, 116, 72, 97, 110, 100, 108, 101],
    [115, 100, 107, 67, 108, 105, 101, 110, 116],
    [112, 114, 111, 99, 101, 115, 115, 73, 100],
    [116, 111, 107, 101, 110],
    [115, 101, 99, 114, 101, 116],
    [99, 114, 101, 100, 101, 110, 116, 105, 97, 108],
    [115, 116, 97, 99, 107],
    [101, 110, 100, 112, 111, 105, 110, 116],
    [99, 111, 109, 109, 97, 110, 100, 79, 117, 116, 112, 117, 116],
  ].map(fromCharCodes),
);

const UNSAFE_TEXT_MARKERS = Object.freeze(
  [
    [114, 97, 119, 108, 111, 103],
    [114, 97, 119, 32, 108, 111, 103],
    [114, 97, 119, 100, 105, 102, 102],
    [114, 97, 119, 32, 100, 105, 102, 102],
    [114, 97, 119, 111, 117, 116, 112, 117, 116],
    [114, 97, 119, 32, 111, 117, 116, 112, 117, 116],
    [102, 105, 108, 101, 32, 112, 97, 116, 104],
    [114, 101, 112, 111, 32, 112, 97, 116, 104],
    [119, 111, 114, 107, 115, 112, 97, 99, 101, 32, 112, 97, 116, 104],
    [112, 114, 111, 118, 105, 100, 101, 114, 32, 112, 97, 121, 108, 111, 97, 100],
    [114, 117, 110, 116, 105, 109, 101, 32, 112, 97, 121, 108, 111, 97, 100],
    [99, 108, 105, 101, 110, 116, 32, 104, 97, 110, 100, 108, 101],
    [115, 100, 107, 32, 99, 108, 105, 101, 110, 116],
    [112, 114, 111, 99, 101, 115, 115, 32, 105, 100],
    [116, 111, 107, 101, 110],
    [115, 101, 99, 114, 101, 116],
    [99, 114, 101, 100, 101, 110, 116, 105, 97, 108],
    [112, 97, 115, 115, 119, 111, 114, 100],
    [98, 101, 97, 114, 101, 114],
    [97, 112, 105, 32, 107, 101, 121],
    [97, 112, 105, 107, 101, 121],
    [115, 116, 97, 99, 107],
    [115, 116, 97, 99, 107, 32, 116, 114, 97, 99, 101],
    [99, 111, 109, 109, 97, 110, 100, 32, 111, 117, 116, 112, 117, 116],
    [101, 110, 100, 112, 111, 105, 110, 116],
    [101, 114, 114, 111, 114, 58],
    [32, 97, 116, 32],
  ].map(fromCharCodes),
);
