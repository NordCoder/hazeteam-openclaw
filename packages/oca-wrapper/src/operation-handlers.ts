import {
  listOcaWrapperOperationDescriptors,
  type OcaOperationApprovalClassification,
  type OcaOperationDescriptor,
  type OcaOperationRef,
  type OcaOperationReplayClassification,
} from './capability-descriptor.js';
import {
  createFakeOcaClient,
  type FakeOcaClient,
  type FakeOcaClientEnvelope,
  type FakeOcaClientRequest,
} from './fake-client.js';
import {
  validateOcaArtifactRef,
  validateOcaBranchRef,
  validateOcaDiffRef,
  validateOcaLogRef,
  validateOcaOutputRef,
  validateOcaReviewRef,
  validateOcaSessionRef,
  validateOcaTaskRef,
  validateOcaWorktreeRef,
  type OcaArtifactRef,
  type OcaBranchRef,
  type OcaDiffRef,
  type OcaLogRef,
  type OcaOutputRef,
  type OcaReviewRef,
  type OcaSessionRef,
  type OcaTaskRef,
  type OcaWorktreeRef,
} from './session-model.js';

export type OcaOperationEffectClassification = 'read-only' | 'external-effect' | 'repository-mutation' | 'unknown';
export type OcaOperationExecutionPosture = 'fake';
export type OcaOperationFakeExecutionState = 'called' | 'not-called';
export type OcaOperationHandlerStatus = 'executed' | 'approval-blocked' | 'invalid-input' | 'fake-failed';
export type OcaOperationApprovalState = 'not-required' | 'pending' | 'approved-marker' | 'unknown';
export type OcaOperationIdempotencyRequirement = 'not-required' | 'required-for-effect' | 'required-for-replay-guard' | 'unknown';

export interface OcaOperationHandlerRequest {
  readonly operationRef: OcaOperationRef;
  readonly approved?: boolean;
  readonly fakeFailure?: boolean;
  readonly sessionRef?: OcaSessionRef;
  readonly taskRef?: OcaTaskRef;
  readonly worktreeRef?: OcaWorktreeRef;
  readonly branchRef?: OcaBranchRef;
  readonly outputRef?: OcaOutputRef;
  readonly logRef?: OcaLogRef;
  readonly diffRef?: OcaDiffRef;
  readonly artifactRef?: OcaArtifactRef;
  readonly reviewRef?: OcaReviewRef;
  readonly inputSummary?: string;
}

export interface OcaOperationHandlerDependencies {
  readonly fakeClient?: FakeOcaClient;
}

export interface OcaOperationPublicIssue {
  readonly code:
    | 'not-object'
    | 'missing-field'
    | 'invalid-field'
    | 'invalid-operation'
    | 'invalid-ref'
    | 'unsafe-summary'
    | 'approval-required'
    | 'fake-failure';
  readonly field: string;
  readonly summary: string;
}

export interface OcaOperationApprovalEnvelope {
  readonly required: boolean;
  readonly classification: OcaOperationApprovalClassification | 'unknown';
  readonly state: OcaOperationApprovalState;
}

export interface OcaOperationIdempotencyEnvelope {
  readonly classification: OcaOperationReplayClassification | 'unknown';
  readonly required: OcaOperationIdempotencyRequirement;
  readonly mutating: boolean;
}

export interface OcaOperationHandlerBaseEnvelope {
  readonly ok: boolean;
  readonly status: OcaOperationHandlerStatus;
  readonly executionPosture: OcaOperationExecutionPosture;
  readonly fakeExecution: OcaOperationFakeExecutionState;
  readonly effect: OcaOperationEffectClassification;
  readonly approval: OcaOperationApprovalEnvelope;
  readonly idempotency: OcaOperationIdempotencyEnvelope;
  readonly issues: readonly OcaOperationPublicIssue[];
  readonly operationRef?: OcaOperationRef;
}

export interface OcaOperationHandlerExecutedEnvelope extends OcaOperationHandlerBaseEnvelope {
  readonly ok: true;
  readonly status: 'executed';
  readonly fakeExecution: 'called';
  readonly operationRef: OcaOperationRef;
  readonly result: FakeOcaClientEnvelope;
}

export interface OcaOperationHandlerApprovalBlockedEnvelope extends OcaOperationHandlerBaseEnvelope {
  readonly ok: false;
  readonly status: 'approval-blocked';
  readonly fakeExecution: 'not-called';
  readonly operationRef: OcaOperationRef;
}

export interface OcaOperationHandlerInvalidEnvelope extends OcaOperationHandlerBaseEnvelope {
  readonly ok: false;
  readonly status: 'invalid-input';
  readonly fakeExecution: 'not-called';
}

export interface OcaOperationHandlerFakeFailedEnvelope extends OcaOperationHandlerBaseEnvelope {
  readonly ok: false;
  readonly status: 'fake-failed';
  readonly fakeExecution: 'called';
  readonly operationRef: OcaOperationRef;
  readonly result: FakeOcaClientEnvelope;
}

export type OcaOperationHandlerResult =
  | OcaOperationHandlerExecutedEnvelope
  | OcaOperationHandlerApprovalBlockedEnvelope
  | OcaOperationHandlerInvalidEnvelope
  | OcaOperationHandlerFakeFailedEnvelope;

export interface OcaOperationPolicy {
  readonly operationRef: OcaOperationRef;
  readonly approval: OcaOperationApprovalClassification;
  readonly effect: Exclude<OcaOperationEffectClassification, 'unknown'>;
  readonly idempotency: OcaOperationReplayClassification;
  readonly idempotencyRequired: OcaOperationIdempotencyRequirement;
  readonly mutating: boolean;
}

export function listOcaOperationPolicies(): readonly OcaOperationPolicy[] {
  return Object.freeze(OPERATION_DESCRIPTORS.map(toPolicy));
}

export function getOcaOperationPolicy(operationRef: OcaOperationRef): OcaOperationPolicy {
  const descriptor = OPERATION_DESCRIPTOR_BY_REF.get(operationRef);

  if (descriptor === undefined) {
    throw new Error('unknown safe OCA operation ref');
  }

  return toPolicy(descriptor);
}

export function handleOcaOperation(
  input: unknown,
  dependencies: OcaOperationHandlerDependencies = {},
): OcaOperationHandlerResult {
  const normalized = normalizeOcaOperationHandlerRequest(input);

  if (!normalized.ok) {
    return invalidEnvelope(normalized.issues, normalized.operationRef);
  }

  const request = normalized.value;
  const policy = getOcaOperationPolicy(request.operationRef);
  const approval = approvalEnvelope(policy, request.approved);
  const idempotency = idempotencyEnvelope(policy);

  if (policy.approval !== 'read-only' && request.approved !== true) {
    return Object.freeze({
      ok: false,
      status: 'approval-blocked',
      operationRef: request.operationRef,
      executionPosture: 'fake',
      fakeExecution: 'not-called',
      effect: policy.effect,
      approval,
      idempotency,
      issues: Object.freeze([
        issue('approval-required', 'approved', 'Operation requires an explicit safe approval marker before fake execution.'),
      ]),
    } satisfies OcaOperationHandlerApprovalBlockedEnvelope);
  }

  const runner = dependencies.fakeClient ?? createFakeOcaClient();
  const result = runner.runOperation(buildFakeRequest(request, policy));

  if (!result.ok) {
    return Object.freeze({
      ok: false,
      status: 'fake-failed',
      operationRef: request.operationRef,
      executionPosture: 'fake',
      fakeExecution: 'called',
      effect: policy.effect,
      approval,
      idempotency,
      issues: Object.freeze([issue('fake-failure', 'fake', 'Fake operation failed with a safe bounded envelope.')]),
      result,
    } satisfies OcaOperationHandlerFakeFailedEnvelope);
  }

  return Object.freeze({
    ok: true,
    status: 'executed',
    operationRef: request.operationRef,
    executionPosture: 'fake',
    fakeExecution: 'called',
    effect: policy.effect,
    approval,
    idempotency,
    issues: Object.freeze([]),
    result,
  } satisfies OcaOperationHandlerExecutedEnvelope);
}

export function normalizeOcaOperationHandlerRequest(input: unknown):
  | {
      readonly ok: true;
      readonly value: OcaOperationHandlerRequest;
    }
  | {
      readonly ok: false;
      readonly operationRef?: OcaOperationRef;
      readonly issues: readonly OcaOperationPublicIssue[];
    } {
  if (!isRecord(input)) {
    return Object.freeze({ ok: false, issues: Object.freeze([issue('not-object', 'request', 'Operation request must be a safe object.')]) });
  }

  const issues: OcaOperationPublicIssue[] = [];
  const operationRef = readOperationRef(input, issues);
  const request: MutableOcaOperationHandlerRequest = {};

  if (operationRef !== undefined) {
    request.operationRef = operationRef;
  }

  readBooleanField(input, 'approved', request, issues);
  readBooleanField(input, 'fakeFailure', request, issues);
  readSummaryField(input, request, issues);
  readRefField(input, 'sessionRef', validateOcaSessionRef, request, issues);
  readRefField(input, 'taskRef', validateOcaTaskRef, request, issues);
  readRefField(input, 'worktreeRef', validateOcaWorktreeRef, request, issues);
  readRefField(input, 'branchRef', validateOcaBranchRef, request, issues);
  readRefField(input, 'outputRef', validateOcaOutputRef, request, issues);
  readRefField(input, 'logRef', validateOcaLogRef, request, issues);
  readRefField(input, 'diffRef', validateOcaDiffRef, request, issues);
  readRefField(input, 'artifactRef', validateOcaArtifactRef, request, issues);
  readRefField(input, 'reviewRef', validateOcaReviewRef, request, issues);

  if (operationRef !== undefined) {
    applyRequiredRefRules(operationRef, request, issues);
  }

  if (issues.length > 0 || operationRef === undefined) {
    const invalidResult: MutableNormalizeInvalid = {
      ok: false,
      issues: Object.freeze(issues),
    };
    if (operationRef !== undefined) {
      invalidResult.operationRef = operationRef;
    }
    return Object.freeze(invalidResult);
  }

  return Object.freeze({ ok: true, value: Object.freeze(request as OcaOperationHandlerRequest) });
}

export function isSafeOcaOperationHandlerJson(value: unknown): boolean {
  return isJsonValue(value);
}

function invalidEnvelope(issues: readonly OcaOperationPublicIssue[], operationRef: OcaOperationRef | undefined): OcaOperationHandlerInvalidEnvelope {
  const policy = operationRef === undefined ? undefined : getOcaOperationPolicy(operationRef);
  const envelope: MutableInvalidEnvelope = {
    ok: false,
    status: 'invalid-input',
    executionPosture: 'fake',
    fakeExecution: 'not-called',
    effect: policy === undefined ? 'unknown' : policy.effect,
    approval: policy === undefined ? unknownApprovalEnvelope() : approvalEnvelope(policy, undefined),
    idempotency: policy === undefined ? unknownIdempotencyEnvelope() : idempotencyEnvelope(policy),
    issues: Object.freeze([...issues]),
  };

  if (operationRef !== undefined) {
    envelope.operationRef = operationRef;
  }

  return Object.freeze(envelope as OcaOperationHandlerInvalidEnvelope);
}

function buildFakeRequest(request: OcaOperationHandlerRequest, policy: OcaOperationPolicy): FakeOcaClientRequest {
  const fakeRequest: MutableFakeOcaClientRequest = {
    operationRef: request.operationRef,
    effect: policy.effect,
  };

  copyOptional(fakeRequest, 'fakeFailure', request.fakeFailure);
  copyOptional(fakeRequest, 'sessionRef', request.sessionRef);
  copyOptional(fakeRequest, 'taskRef', request.taskRef);
  copyOptional(fakeRequest, 'worktreeRef', request.worktreeRef);
  copyOptional(fakeRequest, 'branchRef', request.branchRef);
  copyOptional(fakeRequest, 'outputRef', request.outputRef);
  copyOptional(fakeRequest, 'logRef', request.logRef);
  copyOptional(fakeRequest, 'diffRef', request.diffRef);
  copyOptional(fakeRequest, 'artifactRef', request.artifactRef);
  copyOptional(fakeRequest, 'reviewRef', request.reviewRef);

  return Object.freeze(fakeRequest as FakeOcaClientRequest);
}

function toPolicy(descriptor: OcaOperationDescriptor): OcaOperationPolicy {
  const effect = effectFromApproval(descriptor.approval);

  return Object.freeze({
    operationRef: descriptor.operationRef,
    approval: descriptor.approval,
    effect,
    idempotency: descriptor.replay,
    idempotencyRequired: idempotencyRequiredFromReplay(descriptor.replay, effect),
    mutating: effect !== 'read-only',
  } satisfies OcaOperationPolicy);
}

function approvalEnvelope(policy: OcaOperationPolicy, approved: boolean | undefined): OcaOperationApprovalEnvelope {
  if (policy.approval === 'read-only') {
    return Object.freeze({ required: false, classification: policy.approval, state: 'not-required' });
  }

  return Object.freeze({
    required: true,
    classification: policy.approval,
    state: approved === true ? 'approved-marker' : 'pending',
  });
}

function idempotencyEnvelope(policy: OcaOperationPolicy): OcaOperationIdempotencyEnvelope {
  return Object.freeze({
    classification: policy.idempotency,
    required: policy.idempotencyRequired,
    mutating: policy.mutating,
  });
}

function unknownApprovalEnvelope(): OcaOperationApprovalEnvelope {
  return Object.freeze({ required: false, classification: 'unknown', state: 'unknown' });
}

function unknownIdempotencyEnvelope(): OcaOperationIdempotencyEnvelope {
  return Object.freeze({ classification: 'unknown', required: 'unknown', mutating: false });
}

function effectFromApproval(approval: OcaOperationApprovalClassification): Exclude<OcaOperationEffectClassification, 'unknown'> {
  if (approval === 'read-only') {
    return 'read-only';
  }

  return approval === 'approval-required-repository-mutation' ? 'repository-mutation' : 'external-effect';
}

function idempotencyRequiredFromReplay(
  replay: OcaOperationReplayClassification,
  effect: Exclude<OcaOperationEffectClassification, 'unknown'>,
): OcaOperationIdempotencyRequirement {
  if (effect === 'read-only') {
    return 'not-required';
  }

  return replay === 'idempotent-request' ? 'required-for-effect' : 'required-for-replay-guard';
}

function readOperationRef(input: Record<string, unknown>, issues: OcaOperationPublicIssue[]): OcaOperationRef | undefined {
  if (!('operationRef' in input)) {
    issues.push(issue('missing-field', 'operationRef', 'Operation ref is required.'));
    return undefined;
  }

  const value = input.operationRef;
  if (typeof value !== 'string' || !OPERATION_DESCRIPTOR_BY_REF.has(value as OcaOperationRef)) {
    issues.push(issue('invalid-operation', 'operationRef', 'Operation ref must be registered for the OCA wrapper.'));
    return undefined;
  }

  return value as OcaOperationRef;
}

function readBooleanField<TKey extends 'approved' | 'fakeFailure'>(
  input: Record<string, unknown>,
  field: TKey,
  request: MutableOcaOperationHandlerRequest,
  issues: OcaOperationPublicIssue[],
): void {
  if (!(field in input)) {
    return;
  }

  const value = input[field];
  if (typeof value !== 'boolean') {
    issues.push(issue('invalid-field', field, `${field} must be a boolean marker.`));
    return;
  }

  request[field] = value;
}

function readSummaryField(
  input: Record<string, unknown>,
  request: MutableOcaOperationHandlerRequest,
  issues: OcaOperationPublicIssue[],
): void {
  if (!('inputSummary' in input)) {
    return;
  }

  const value = input.inputSummary;
  if (typeof value !== 'string' || value.length === 0 || value.length > 240 || /[\\/{}\[\]]/u.test(value)) {
    issues.push(issue('unsafe-summary', 'inputSummary', 'Input summary must be bounded safe text.'));
    return;
  }

  request.inputSummary = value;
}

function readRefField<TKey extends OcaRefField>(
  input: Record<string, unknown>,
  field: TKey,
  validator: RefValidator,
  request: MutableOcaOperationHandlerRequest,
  issues: OcaOperationPublicIssue[],
): void {
  if (!(field in input)) {
    return;
  }

  const result = validator(input[field]);
  if (!result.ok) {
    issues.push(issue('invalid-ref', field, `${field} must be a safe OCA ref.`));
    return;
  }

  request[field] = result.value as OcaOperationHandlerRequest[TKey];
}

function applyRequiredRefRules(
  operationRef: OcaOperationRef,
  request: MutableOcaOperationHandlerRequest,
  issues: OcaOperationPublicIssue[],
): void {
  if (operationRef === 'hazeteam.oca.start-session') {
    requireField(request.taskRef, 'taskRef', issues);
    return;
  }

  if (operationRef === 'hazeteam.oca.list') {
    return;
  }

  requireField(request.sessionRef, 'sessionRef', issues);

  if (operationRef === 'hazeteam.oca.get-output') {
    requireField(request.outputRef, 'outputRef', issues);
  }

  if (operationRef === 'hazeteam.oca.diff-get') {
    requireField(request.diffRef, 'diffRef', issues);
  }

  if (operationRef === 'hazeteam.oca.review-submit') {
    requireField(request.reviewRef, 'reviewRef', issues);
  }
}

function requireField(value: unknown, field: string, issues: OcaOperationPublicIssue[]): void {
  if (value === undefined) {
    issues.push(issue('missing-field', field, `${field} is required for this operation.`));
  }
}

function issue(code: OcaOperationPublicIssue['code'], field: string, summary: string): OcaOperationPublicIssue {
  return Object.freeze({ code, field, summary });
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function copyOptional<TKey extends keyof FakeOcaClientRequest>(
  target: MutableFakeOcaClientRequest,
  key: TKey,
  value: FakeOcaClientRequest[TKey] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

type Mutable<T> = {
  -readonly [TKey in keyof T]: T[TKey];
};

type MutableOcaOperationHandlerRequest = Partial<Mutable<OcaOperationHandlerRequest>>;
type MutableFakeOcaClientRequest = Mutable<FakeOcaClientRequest>;
type MutableInvalidEnvelope = Mutable<OcaOperationHandlerInvalidEnvelope>;
type MutableNormalizeInvalid = { ok: false; operationRef?: OcaOperationRef; issues: readonly OcaOperationPublicIssue[] };
type OcaRefField =
  | 'sessionRef'
  | 'taskRef'
  | 'worktreeRef'
  | 'branchRef'
  | 'outputRef'
  | 'logRef'
  | 'diffRef'
  | 'artifactRef'
  | 'reviewRef';
type RefValidator = (value: unknown) => { readonly ok: true; readonly value: string } | { readonly ok: false };

const OPERATION_DESCRIPTORS = listOcaWrapperOperationDescriptors();
const OPERATION_DESCRIPTOR_BY_REF = new Map<OcaOperationRef, OcaOperationDescriptor>(
  OPERATION_DESCRIPTORS.map((descriptor) => [descriptor.operationRef, descriptor]),
);
