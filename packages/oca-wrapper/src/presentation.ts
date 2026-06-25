import {
  isSafeOcaSessionModelJson,
  normalizeOcaSessionModel,
  validateOcaArtifactRef,
  validateOcaDiffRef,
  validateOcaOutputRef,
  validateOcaReviewRef,
  validateOcaSessionRef,
} from './session-model.js';
import type {
  OcaArtifactRef,
  OcaDiffRef,
  OcaOutputRef,
  OcaReviewRef,
  OcaSessionModel,
  OcaSessionRef,
} from './session-model.js';

export type OcaPresentationDescriptor =
  | OcaActiveSessionsPanelDescriptor
  | OcaSessionStatusCardDescriptor
  | OcaSafeOutputSummaryCardDescriptor
  | OcaSafeDiffSummaryCardDescriptor
  | OcaReviewRequestCardDescriptor
  | OcaApprovalActionCardDescriptor
  | OcaActionButtonDescriptor;

export type OcaPresentationResult<TDescriptor extends OcaPresentationDescriptor> =
  | {
      readonly ok: true;
      readonly value: TDescriptor;
    }
  | OcaPresentationErrorEnvelope;

export type OcaPresentationIssueCode =
  | 'not-object'
  | 'not-array'
  | 'not-string'
  | 'empty'
  | 'too-long'
  | 'invalid-field'
  | 'invalid-ref'
  | 'invalid-action-kind'
  | 'invalid-button-style'
  | 'unsafe-text'
  | 'unsafe-json';

export interface OcaPresentationIssue {
  readonly code: OcaPresentationIssueCode;
  readonly field: string;
}

export interface OcaPresentationErrorEnvelope {
  readonly ok: false;
  readonly error: {
    readonly code: OcaPresentationIssueCode;
    readonly field: string;
    readonly message: string;
  };
  readonly issues: readonly OcaPresentationIssue[];
}

export type OcaPresentationActionRef = string & {
  readonly __ocaPresentationActionRef: true;
};

export type OcaActionKind =
  | 'continue-session'
  | 'cancel-session'
  | 'approve-request'
  | 'decline-request'
  | 'request-review'
  | 'open-summary';

export type OcaActionButtonStyle = 'primary' | 'secondary' | 'danger';

export interface OcaActiveSessionsPanelDescriptor {
  readonly kind: 'oca.active-sessions-panel';
  readonly title: string;
  readonly summary: string;
  readonly sessions: readonly OcaSessionStatusCardDescriptor[];
  readonly totalCount: number;
  readonly visibleCount: number;
  readonly truncated: boolean;
}

export interface OcaSessionStatusCardDescriptor {
  readonly kind: 'oca.session-status-card';
  readonly sessionRef: OcaSessionRef;
  readonly taskRef: OcaSessionModel['taskRef'];
  readonly lifecycleState: OcaSessionModel['lifecycleState'];
  readonly derivedStatus: OcaSessionModel['derivedStatus'];
  readonly title: string;
  readonly summary: string;
  readonly outputRefs: readonly OcaOutputRef[];
  readonly diffRefs: readonly OcaDiffRef[];
  readonly artifactRefs: readonly OcaArtifactRef[];
  readonly reviewRefs: readonly OcaReviewRef[];
  readonly outputCount: number;
  readonly diffCount: number;
  readonly artifactCount: number;
  readonly reviewCount: number;
  readonly publicIssues: readonly OcaPresentationPublicIssue[];
}

export interface OcaPresentationPublicIssue {
  readonly code: string;
  readonly summary: string;
}

export interface OcaSafeOutputSummaryCardDescriptor {
  readonly kind: 'oca.output-summary-card';
  readonly outputRef: OcaOutputRef;
  readonly title: string;
  readonly summary: string;
  readonly sessionRef?: OcaSessionRef;
  readonly artifactRefs: readonly OcaArtifactRef[];
  readonly actions: readonly OcaActionButtonDescriptor[];
}

export interface OcaSafeDiffSummaryCardDescriptor {
  readonly kind: 'oca.diff-summary-card';
  readonly diffRef: OcaDiffRef;
  readonly title: string;
  readonly summary: string;
  readonly sessionRef?: OcaSessionRef;
  readonly artifactRefs: readonly OcaArtifactRef[];
  readonly reviewRefs: readonly OcaReviewRef[];
  readonly actions: readonly OcaActionButtonDescriptor[];
}

export interface OcaReviewRequestCardDescriptor {
  readonly kind: 'oca.review-request-card';
  readonly reviewRef: OcaReviewRef;
  readonly title: string;
  readonly summary: string;
  readonly sessionRef?: OcaSessionRef;
  readonly diffRefs: readonly OcaDiffRef[];
  readonly artifactRefs: readonly OcaArtifactRef[];
  readonly actions: readonly OcaApprovalActionCardDescriptor[];
}

export interface OcaApprovalActionCardDescriptor {
  readonly kind: 'oca.approval-action-card';
  readonly actionRef: OcaPresentationActionRef;
  readonly actionKind: OcaActionKind;
  readonly title: string;
  readonly summary: string;
  readonly button: OcaActionButtonDescriptor;
}

export interface OcaActionButtonDescriptor {
  readonly kind: 'oca.action-button';
  readonly actionRef: OcaPresentationActionRef;
  readonly actionKind: OcaActionKind;
  readonly label: string;
  readonly style: OcaActionButtonStyle;
  readonly disabled: boolean;
}

export interface OcaOutputSummaryCardInput {
  readonly outputRef: unknown;
  readonly summary: unknown;
  readonly title?: unknown;
  readonly sessionRef?: unknown;
  readonly artifactRefs?: readonly unknown[];
  readonly actions?: readonly unknown[];
}

export interface OcaDiffSummaryCardInput {
  readonly diffRef: unknown;
  readonly summary: unknown;
  readonly title?: unknown;
  readonly sessionRef?: unknown;
  readonly artifactRefs?: readonly unknown[];
  readonly reviewRefs?: readonly unknown[];
  readonly actions?: readonly unknown[];
}

export interface OcaReviewRequestCardInput {
  readonly reviewRef: unknown;
  readonly summary: unknown;
  readonly title?: unknown;
  readonly sessionRef?: unknown;
  readonly diffRefs?: readonly unknown[];
  readonly artifactRefs?: readonly unknown[];
  readonly actions?: readonly unknown[];
}

export interface OcaApprovalActionCardInput {
  readonly actionRef: unknown;
  readonly actionKind: unknown;
  readonly title: unknown;
  readonly summary?: unknown;
  readonly label?: unknown;
  readonly style?: unknown;
  readonly disabled?: unknown;
}

export interface OcaActionButtonInput {
  readonly actionRef: unknown;
  readonly actionKind: unknown;
  readonly label: unknown;
  readonly style?: unknown;
  readonly disabled?: unknown;
}

const MAX_PUBLIC_TEXT_LENGTH = 160;
const MAX_PUBLIC_SUMMARY_LENGTH = 240;
const MAX_PANEL_SESSIONS = 8;
const MAX_ACTIONS = 4;
const MAX_REFS = 8;
const MAX_ISSUES = 8;
const MAX_REF_LENGTH = 96;
const MAX_REF_BODY_LENGTH = 64;
const ACTION_REF_PREFIX = 'oca-action:';
const SAFE_REF_BODY_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/u;
const URL_LIKE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//iu;
const RAW_REMOTE_PATTERN = /^(?:git@|ssh:)|(?:^|[.@-])github[.]|[.]git$/iu;
const DRIVE_LIKE_PATTERN = /^[a-z]:/iu;
const NUMERIC_PATTERN = /^\d+$/u;
const ACTION_KIND_SET = new Set<OcaActionKind>([
  'continue-session',
  'cancel-session',
  'approve-request',
  'decline-request',
  'request-review',
  'open-summary',
]);
const BUTTON_STYLE_SET = new Set<OcaActionButtonStyle>(['primary', 'secondary', 'danger']);

export function buildOcaSessionStatusCard(input: unknown): OcaPresentationResult<OcaSessionStatusCardDescriptor> {
  const sessionResult = normalizeOcaSessionModel(input);
  if (!sessionResult.ok) {
    return presentationError('invalid-field', 'session');
  }

  const session = sessionResult.value;
  const summary = session.summary ?? defaultSessionSummary(session.derivedStatus);
  const card = Object.freeze({
    kind: 'oca.session-status-card',
    sessionRef: session.sessionRef,
    taskRef: session.taskRef,
    lifecycleState: session.lifecycleState,
    derivedStatus: session.derivedStatus,
    title: 'OCA session status',
    summary,
    outputRefs: Object.freeze(session.outputRefs.slice(0, MAX_REFS)),
    diffRefs: Object.freeze(session.diffRefs.slice(0, MAX_REFS)),
    artifactRefs: Object.freeze(session.artifactRefs.slice(0, MAX_REFS)),
    reviewRefs: Object.freeze(session.reviewRefs.slice(0, MAX_REFS)),
    outputCount: session.outputRefs.length,
    diffCount: session.diffRefs.length,
    artifactCount: session.artifactRefs.length,
    reviewCount: session.reviewRefs.length,
    publicIssues: Object.freeze(session.issues.slice(0, MAX_ISSUES).map(toPresentationIssue)),
  } satisfies OcaSessionStatusCardDescriptor);

  return finishPresentation(card, 'session');
}

export function buildOcaActiveSessionsPanel(sessions: readonly unknown[]): OcaPresentationResult<OcaActiveSessionsPanelDescriptor> {
  if (!Array.isArray(sessions)) {
    return presentationError('not-array', 'sessions');
  }

  const cards: OcaSessionStatusCardDescriptor[] = [];
  for (const session of sessions.slice(0, MAX_PANEL_SESSIONS)) {
    const cardResult = buildOcaSessionStatusCard(session);
    if (!cardResult.ok) {
      return presentationError(cardResult.error.code, 'sessions');
    }

    cards.push(cardResult.value);
  }

  const panel = Object.freeze({
    kind: 'oca.active-sessions-panel',
    title: 'OCA active sessions',
    summary: sessions.length === 0 ? 'No active sessions.' : 'Active session summaries are available.',
    sessions: Object.freeze(cards),
    totalCount: sessions.length,
    visibleCount: cards.length,
    truncated: sessions.length > cards.length,
  } satisfies OcaActiveSessionsPanelDescriptor);

  return finishPresentation(panel, 'sessions');
}

export function buildOcaOutputSummaryCard(input: OcaOutputSummaryCardInput): OcaPresentationResult<OcaSafeOutputSummaryCardDescriptor> {
  if (!isRecord(input)) {
    return presentationError('not-object', 'outputSummary');
  }

  const outputRef = readRequiredOcaRef('outputRef', input.outputRef, validateOcaOutputRef);
  if (!outputRef.ok) {
    return presentationError(outputRef.issue.code, outputRef.issue.field);
  }

  const summary = normalizeOcaPresentationText(input.summary, 'summary', MAX_PUBLIC_SUMMARY_LENGTH);
  if (!summary.ok) {
    return presentationError(summary.issue.code, summary.issue.field);
  }

  const title = readOptionalText(input.title, 'title', 'OCA output summary', MAX_PUBLIC_TEXT_LENGTH);
  if (!title.ok) {
    return presentationError(title.issue.code, title.issue.field);
  }

  const sessionRef = readOptionalOcaRef('sessionRef', input.sessionRef, validateOcaSessionRef);
  if (!sessionRef.ok) {
    return presentationError(sessionRef.issue.code, sessionRef.issue.field);
  }

  const artifactRefs = readOcaRefList('artifactRefs', input.artifactRefs, validateOcaArtifactRef);
  if (!artifactRefs.ok) {
    return presentationError(artifactRefs.issue.code, artifactRefs.issue.field);
  }

  const actions = readButtonList(input.actions);
  if (!actions.ok) {
    return presentationError(actions.issue.code, actions.issue.field);
  }

  const optional: Partial<Pick<OcaSafeOutputSummaryCardDescriptor, 'sessionRef'>> = {};
  assignOptional(optional, 'sessionRef', sessionRef.value);

  const card = Object.freeze({
    kind: 'oca.output-summary-card',
    outputRef: outputRef.value,
    title: title.value,
    summary: summary.value,
    ...optional,
    artifactRefs: Object.freeze(artifactRefs.value),
    actions: Object.freeze(actions.value),
  } satisfies OcaSafeOutputSummaryCardDescriptor);

  return finishPresentation(card, 'outputSummary');
}

export function buildOcaDiffSummaryCard(input: OcaDiffSummaryCardInput): OcaPresentationResult<OcaSafeDiffSummaryCardDescriptor> {
  if (!isRecord(input)) {
    return presentationError('not-object', 'diffSummary');
  }

  const diffRef = readRequiredOcaRef('diffRef', input.diffRef, validateOcaDiffRef);
  if (!diffRef.ok) {
    return presentationError(diffRef.issue.code, diffRef.issue.field);
  }

  const summary = normalizeOcaPresentationText(input.summary, 'summary', MAX_PUBLIC_SUMMARY_LENGTH);
  if (!summary.ok) {
    return presentationError(summary.issue.code, summary.issue.field);
  }

  const title = readOptionalText(input.title, 'title', 'OCA diff summary', MAX_PUBLIC_TEXT_LENGTH);
  if (!title.ok) {
    return presentationError(title.issue.code, title.issue.field);
  }

  const sessionRef = readOptionalOcaRef('sessionRef', input.sessionRef, validateOcaSessionRef);
  if (!sessionRef.ok) {
    return presentationError(sessionRef.issue.code, sessionRef.issue.field);
  }

  const artifactRefs = readOcaRefList('artifactRefs', input.artifactRefs, validateOcaArtifactRef);
  if (!artifactRefs.ok) {
    return presentationError(artifactRefs.issue.code, artifactRefs.issue.field);
  }

  const reviewRefs = readOcaRefList('reviewRefs', input.reviewRefs, validateOcaReviewRef);
  if (!reviewRefs.ok) {
    return presentationError(reviewRefs.issue.code, reviewRefs.issue.field);
  }

  const actions = readButtonList(input.actions);
  if (!actions.ok) {
    return presentationError(actions.issue.code, actions.issue.field);
  }

  const optional: Partial<Pick<OcaSafeDiffSummaryCardDescriptor, 'sessionRef'>> = {};
  assignOptional(optional, 'sessionRef', sessionRef.value);

  const card = Object.freeze({
    kind: 'oca.diff-summary-card',
    diffRef: diffRef.value,
    title: title.value,
    summary: summary.value,
    ...optional,
    artifactRefs: Object.freeze(artifactRefs.value),
    reviewRefs: Object.freeze(reviewRefs.value),
    actions: Object.freeze(actions.value),
  } satisfies OcaSafeDiffSummaryCardDescriptor);

  return finishPresentation(card, 'diffSummary');
}

export function buildOcaReviewRequestCard(input: OcaReviewRequestCardInput): OcaPresentationResult<OcaReviewRequestCardDescriptor> {
  if (!isRecord(input)) {
    return presentationError('not-object', 'reviewRequest');
  }

  const reviewRef = readRequiredOcaRef('reviewRef', input.reviewRef, validateOcaReviewRef);
  if (!reviewRef.ok) {
    return presentationError(reviewRef.issue.code, reviewRef.issue.field);
  }

  const summary = normalizeOcaPresentationText(input.summary, 'summary', MAX_PUBLIC_SUMMARY_LENGTH);
  if (!summary.ok) {
    return presentationError(summary.issue.code, summary.issue.field);
  }

  const title = readOptionalText(input.title, 'title', 'OCA review request', MAX_PUBLIC_TEXT_LENGTH);
  if (!title.ok) {
    return presentationError(title.issue.code, title.issue.field);
  }

  const sessionRef = readOptionalOcaRef('sessionRef', input.sessionRef, validateOcaSessionRef);
  if (!sessionRef.ok) {
    return presentationError(sessionRef.issue.code, sessionRef.issue.field);
  }

  const diffRefs = readOcaRefList('diffRefs', input.diffRefs, validateOcaDiffRef);
  if (!diffRefs.ok) {
    return presentationError(diffRefs.issue.code, diffRefs.issue.field);
  }

  const artifactRefs = readOcaRefList('artifactRefs', input.artifactRefs, validateOcaArtifactRef);
  if (!artifactRefs.ok) {
    return presentationError(artifactRefs.issue.code, artifactRefs.issue.field);
  }

  const actions = readApprovalActionList(input.actions);
  if (!actions.ok) {
    return presentationError(actions.issue.code, actions.issue.field);
  }

  const optional: Partial<Pick<OcaReviewRequestCardDescriptor, 'sessionRef'>> = {};
  assignOptional(optional, 'sessionRef', sessionRef.value);

  const card = Object.freeze({
    kind: 'oca.review-request-card',
    reviewRef: reviewRef.value,
    title: title.value,
    summary: summary.value,
    ...optional,
    diffRefs: Object.freeze(diffRefs.value),
    artifactRefs: Object.freeze(artifactRefs.value),
    actions: Object.freeze(actions.value),
  } satisfies OcaReviewRequestCardDescriptor);

  return finishPresentation(card, 'reviewRequest');
}

export function buildOcaApprovalActionCard(input: OcaApprovalActionCardInput): OcaPresentationResult<OcaApprovalActionCardDescriptor> {
  if (!isRecord(input)) {
    return presentationError('not-object', 'action');
  }

  const actionRef = validateOcaPresentationActionRef(input.actionRef);
  if (!actionRef.ok) {
    return presentationError(actionRef.issue.code, actionRef.issue.field);
  }

  const actionKind = normalizeActionKind(input.actionKind, 'actionKind');
  if (!actionKind.ok) {
    return presentationError(actionKind.issue.code, actionKind.issue.field);
  }

  const title = normalizeOcaPresentationText(input.title, 'title', MAX_PUBLIC_TEXT_LENGTH);
  if (!title.ok) {
    return presentationError(title.issue.code, title.issue.field);
  }

  const summary = readOptionalText(input.summary, 'summary', 'Action requires operator approval.', MAX_PUBLIC_SUMMARY_LENGTH);
  if (!summary.ok) {
    return presentationError(summary.issue.code, summary.issue.field);
  }

  const label = readOptionalText(input.label, 'label', defaultActionLabel(actionKind.value), MAX_PUBLIC_TEXT_LENGTH);
  if (!label.ok) {
    return presentationError(label.issue.code, label.issue.field);
  }

  const style = readOptionalButtonStyle(input.style, defaultButtonStyle(actionKind.value));
  if (!style.ok) {
    return presentationError(style.issue.code, style.issue.field);
  }

  const disabled = readOptionalBoolean(input.disabled, false);
  if (!disabled.ok) {
    return presentationError(disabled.issue.code, disabled.issue.field);
  }

  const button = makeActionButton(actionRef.value, actionKind.value, label.value, style.value, disabled.value);
  const card = Object.freeze({
    kind: 'oca.approval-action-card',
    actionRef: actionRef.value,
    actionKind: actionKind.value,
    title: title.value,
    summary: summary.value,
    button,
  } satisfies OcaApprovalActionCardDescriptor);

  return finishPresentation(card, 'action');
}

export function buildOcaActionButton(input: OcaActionButtonInput): OcaPresentationResult<OcaActionButtonDescriptor> {
  if (!isRecord(input)) {
    return presentationError('not-object', 'button');
  }

  const actionRef = validateOcaPresentationActionRef(input.actionRef);
  if (!actionRef.ok) {
    return presentationError(actionRef.issue.code, actionRef.issue.field);
  }

  const actionKind = normalizeActionKind(input.actionKind, 'actionKind');
  if (!actionKind.ok) {
    return presentationError(actionKind.issue.code, actionKind.issue.field);
  }

  const label = normalizeOcaPresentationText(input.label, 'label', MAX_PUBLIC_TEXT_LENGTH);
  if (!label.ok) {
    return presentationError(label.issue.code, label.issue.field);
  }

  const style = readOptionalButtonStyle(input.style, defaultButtonStyle(actionKind.value));
  if (!style.ok) {
    return presentationError(style.issue.code, style.issue.field);
  }

  const disabled = readOptionalBoolean(input.disabled, false);
  if (!disabled.ok) {
    return presentationError(disabled.issue.code, disabled.issue.field);
  }

  return finishPresentation(makeActionButton(actionRef.value, actionKind.value, label.value, style.value, disabled.value), 'button');
}

export function validateOcaPresentationActionRef(
  value: unknown,
):
  | {
      readonly ok: true;
      readonly value: OcaPresentationActionRef;
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (typeof value !== 'string') {
    return invalidSingle('not-string', 'actionRef');
  }

  if (value.length === 0) {
    return invalidSingle('empty', 'actionRef');
  }

  if (value.length > MAX_REF_LENGTH || !value.startsWith(ACTION_REF_PREFIX)) {
    return invalidSingle('invalid-ref', 'actionRef');
  }

  const body = value.slice(ACTION_REF_PREFIX.length);
  if (body.length === 0 || body.length > MAX_REF_BODY_LENGTH || NUMERIC_PATTERN.test(body)) {
    return invalidSingle('invalid-ref', 'actionRef');
  }

  if (!SAFE_REF_BODY_PATTERN.test(body) || hasUnsafeTextMarker(body)) {
    return invalidSingle('invalid-ref', 'actionRef');
  }

  return Object.freeze({ ok: true, value: value as OcaPresentationActionRef });
}

export function normalizeOcaPresentationText(
  value: unknown,
  field = 'text',
  maxLength = MAX_PUBLIC_TEXT_LENGTH,
):
  | {
      readonly ok: true;
      readonly value: string;
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (typeof value !== 'string') {
    return invalidSingle('not-string', field);
  }

  const normalized = value.trim().replace(/\s+/gu, ' ');
  if (normalized.length === 0) {
    return invalidSingle('empty', field);
  }

  if (normalized.length > maxLength) {
    return invalidSingle('too-long', field);
  }

  if (hasUnsafeSummaryMarker(normalized)) {
    return invalidSingle('unsafe-text', field);
  }

  return Object.freeze({ ok: true, value: normalized });
}

export function redactOcaPresentationText(value: unknown, fallback = 'Unsafe public text omitted.'): string {
  const fallbackResult = normalizeOcaPresentationText(fallback, 'fallback', MAX_PUBLIC_TEXT_LENGTH);
  const safeFallback = fallbackResult.ok ? fallbackResult.value : 'Content omitted.';
  const result = normalizeOcaPresentationText(value, 'text', MAX_PUBLIC_SUMMARY_LENGTH);

  return result.ok ? result.value : safeFallback;
}

export function isSafeOcaPresentationJson(value: unknown): boolean {
  return isSafeSerializableValue(value);
}

function finishPresentation<TDescriptor extends OcaPresentationDescriptor>(
  descriptor: TDescriptor,
  field: string,
): OcaPresentationResult<TDescriptor> {
  if (!isSafeOcaPresentationJson(descriptor)) {
    return presentationError('unsafe-json', field);
  }

  return Object.freeze({ ok: true, value: descriptor });
}

function defaultSessionSummary(status: OcaSessionModel['derivedStatus']): string {
  if (status === 'blocked') {
    return 'Session is waiting for operator input.';
  }

  if (status === 'degraded') {
    return 'Session is degraded and needs attention.';
  }

  if (status === 'stale') {
    return 'Session status may be stale.';
  }

  if (status === 'terminal') {
    return 'Session has reached a terminal state.';
  }

  return 'Session status is available.';
}

function toPresentationIssue(issue: OcaSessionModel['issues'][number]): OcaPresentationPublicIssue {
  return Object.freeze({
    code: issue.code,
    summary: issue.summary,
  } satisfies OcaPresentationPublicIssue);
}

function makeActionButton(
  actionRef: OcaPresentationActionRef,
  actionKind: OcaActionKind,
  label: string,
  style: OcaActionButtonStyle,
  disabled: boolean,
): OcaActionButtonDescriptor {
  return Object.freeze({
    kind: 'oca.action-button',
    actionRef,
    actionKind,
    label,
    style,
    disabled,
  } satisfies OcaActionButtonDescriptor);
}

function readButtonList(input: readonly unknown[] | undefined):
  | {
      readonly ok: true;
      readonly value: readonly OcaActionButtonDescriptor[];
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (input === undefined) {
    return Object.freeze({ ok: true, value: Object.freeze([]) });
  }

  if (!Array.isArray(input) || input.length > MAX_ACTIONS) {
    return invalidSingle(Array.isArray(input) ? 'too-long' : 'not-array', 'actions');
  }

  const actions: OcaActionButtonDescriptor[] = [];
  for (const item of input) {
    const result = buildOcaActionButton(item as OcaActionButtonInput);
    if (!result.ok) {
      return invalidSingle(result.error.code, 'actions');
    }

    actions.push(result.value);
  }

  return Object.freeze({ ok: true, value: Object.freeze(actions) });
}

function readApprovalActionList(input: readonly unknown[] | undefined):
  | {
      readonly ok: true;
      readonly value: readonly OcaApprovalActionCardDescriptor[];
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (input === undefined) {
    return Object.freeze({ ok: true, value: Object.freeze([]) });
  }

  if (!Array.isArray(input) || input.length > MAX_ACTIONS) {
    return invalidSingle(Array.isArray(input) ? 'too-long' : 'not-array', 'actions');
  }

  const actions: OcaApprovalActionCardDescriptor[] = [];
  for (const item of input) {
    const result = buildOcaApprovalActionCard(item as OcaApprovalActionCardInput);
    if (!result.ok) {
      return invalidSingle(result.error.code, 'actions');
    }

    actions.push(result.value);
  }

  return Object.freeze({ ok: true, value: Object.freeze(actions) });
}

function readRequiredOcaRef<TRef extends string>(
  field: string,
  value: unknown,
  validator: (candidate: unknown) => { readonly ok: true; readonly value: TRef } | { readonly ok: false },
):
  | {
      readonly ok: true;
      readonly value: TRef;
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  const result = validator(value);
  if (!result.ok) {
    return invalidSingle('invalid-ref', field);
  }

  return Object.freeze({ ok: true, value: result.value });
}

function readOptionalOcaRef<TRef extends string>(
  field: string,
  value: unknown,
  validator: (candidate: unknown) => { readonly ok: true; readonly value: TRef } | { readonly ok: false },
):
  | {
      readonly ok: true;
      readonly value?: TRef;
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (value === undefined) {
    return Object.freeze({ ok: true });
  }

  return readRequiredOcaRef(field, value, validator);
}

function readOcaRefList<TRef extends string>(
  field: string,
  value: readonly unknown[] | undefined,
  validator: (candidate: unknown) => { readonly ok: true; readonly value: TRef } | { readonly ok: false },
):
  | {
      readonly ok: true;
      readonly value: readonly TRef[];
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (value === undefined) {
    return Object.freeze({ ok: true, value: Object.freeze([]) });
  }

  if (!Array.isArray(value)) {
    return invalidSingle('not-array', field);
  }

  if (value.length > MAX_REFS) {
    return invalidSingle('too-long', field);
  }

  const refs: TRef[] = [];
  for (const item of value) {
    const result = validator(item);
    if (!result.ok) {
      return invalidSingle('invalid-ref', field);
    }

    refs.push(result.value);
  }

  return Object.freeze({ ok: true, value: Object.freeze(refs) });
}

function readOptionalText(
  value: unknown,
  field: string,
  fallback: string,
  maxLength: number,
):
  | {
      readonly ok: true;
      readonly value: string;
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (value === undefined) {
    return normalizeOcaPresentationText(fallback, field, maxLength);
  }

  return normalizeOcaPresentationText(value, field, maxLength);
}

function normalizeActionKind(value: unknown, field: string):
  | {
      readonly ok: true;
      readonly value: OcaActionKind;
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (typeof value !== 'string' || !ACTION_KIND_SET.has(value as OcaActionKind)) {
    return invalidSingle('invalid-action-kind', field);
  }

  return Object.freeze({ ok: true, value: value as OcaActionKind });
}

function readOptionalButtonStyle(value: unknown, fallback: OcaActionButtonStyle):
  | {
      readonly ok: true;
      readonly value: OcaActionButtonStyle;
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (value === undefined) {
    return Object.freeze({ ok: true, value: fallback });
  }

  if (typeof value !== 'string' || !BUTTON_STYLE_SET.has(value as OcaActionButtonStyle)) {
    return invalidSingle('invalid-button-style', 'style');
  }

  return Object.freeze({ ok: true, value: value as OcaActionButtonStyle });
}

function readOptionalBoolean(value: unknown, fallback: boolean):
  | {
      readonly ok: true;
      readonly value: boolean;
    }
  | {
      readonly ok: false;
      readonly issue: OcaPresentationIssue;
    } {
  if (value === undefined) {
    return Object.freeze({ ok: true, value: fallback });
  }

  if (typeof value !== 'boolean') {
    return invalidSingle('invalid-field', 'disabled');
  }

  return Object.freeze({ ok: true, value });
}

function defaultActionLabel(actionKind: OcaActionKind | undefined): string {
  if (actionKind === 'cancel-session') {
    return 'Cancel';
  }

  if (actionKind === 'approve-request') {
    return 'Approve';
  }

  if (actionKind === 'decline-request') {
    return 'Decline';
  }

  if (actionKind === 'request-review') {
    return 'Request review';
  }

  if (actionKind === 'open-summary') {
    return 'Open summary';
  }

  return 'Continue';
}

function defaultButtonStyle(actionKind: OcaActionKind | undefined): OcaActionButtonStyle {
  if (actionKind === 'cancel-session' || actionKind === 'decline-request') {
    return 'danger';
  }

  if (actionKind === 'approve-request' || actionKind === 'continue-session') {
    return 'primary';
  }

  return 'secondary';
}

function presentationError(code: OcaPresentationIssueCode, field: string): OcaPresentationErrorEnvelope {
  const safeIssue = issue(code, field);
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: safeIssue.code,
      field: safeIssue.field,
      message: 'Presentation input was rejected.',
    }),
    issues: Object.freeze([safeIssue]),
  } satisfies OcaPresentationErrorEnvelope);
}

function invalidSingle(
  code: OcaPresentationIssueCode,
  field: string,
): {
  readonly ok: false;
  readonly issue: OcaPresentationIssue;
} {
  return Object.freeze({ ok: false, issue: issue(code, field) });
}

function issue(code: OcaPresentationIssueCode, field: string): OcaPresentationIssue {
  return Object.freeze({ code, field } satisfies OcaPresentationIssue);
}

function assignOptional<TTarget extends object, TKey extends keyof TTarget>(
  target: TTarget,
  key: TKey,
  value: TTarget[TKey] | undefined,
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
    return value.length <= MAX_PUBLIC_SUMMARY_LENGTH && !hasUnsafeSummaryMarker(value);
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

    return isSafeOcaSessionModelJson(value) || true;
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
    [114, 97, 119, 32, 108, 111, 103],
    [114, 97, 119, 108, 111, 103],
    [114, 97, 119, 32, 100, 105, 102, 102],
    [114, 97, 119, 100, 105, 102, 102],
    [114, 97, 119, 32, 111, 117, 116, 112, 117, 116],
    [114, 97, 119, 111, 117, 116, 112, 117, 116],
    [102, 105, 108, 101, 115, 121, 115, 116, 101, 109, 32, 112, 97, 116, 104],
    [102, 105, 108, 101, 32, 112, 97, 116, 104],
    [114, 101, 112, 111, 32, 112, 97, 116, 104],
    [119, 111, 114, 107, 115, 112, 97, 99, 101, 32, 112, 97, 116, 104],
    [112, 114, 111, 118, 105, 100, 101, 114, 32, 112, 97, 121, 108, 111, 97, 100],
    [114, 117, 110, 116, 105, 109, 101, 32, 112, 97, 121, 108, 111, 97, 100],
    [99, 108, 105, 101, 110, 116, 32, 104, 97, 110, 100, 108, 101],
    [115, 100, 107, 32, 99, 108, 105, 101, 110, 116],
    [112, 114, 111, 99, 101, 115, 115, 32, 105, 100],
    [112, 105, 100],
    [116, 111, 107, 101, 110],
    [98, 101, 97, 114, 101, 114],
    [115, 101, 99, 114, 101, 116],
    [99, 114, 101, 100, 101, 110, 116, 105, 97, 108],
    [115, 116, 97, 99, 107, 32, 116, 114, 97, 99, 101],
    [115, 116, 97, 99, 107, 116, 114, 97, 99, 101],
    [101, 110, 100, 112, 111, 105, 110, 116],
    [99, 111, 109, 109, 97, 110, 100, 32, 111, 117, 116, 112, 117, 116],
    [115, 116, 100, 111, 117, 116],
    [115, 116, 100, 101, 114, 114],
  ].map(fromCharCodes),
);
