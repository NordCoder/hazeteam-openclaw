import type {
  OcaOperationApprovalClassification,
  OcaOperationRef,
  OcaOperationReplayClassification,
} from './capability-descriptor.js';
import {
  getOcaOperationPolicy,
  handleOcaOperation,
  type OcaOperationEffectClassification,
  type OcaOperationHandlerDependencies,
  type OcaOperationHandlerRequest,
  type OcaOperationHandlerResult,
  type OcaOperationIdempotencyRequirement,
  type OcaOperationPolicy,
  type OcaOperationPublicIssue,
} from './operation-handlers.js';

export type OcaApprovalRuntimeToolStatus = 'executed' | 'approval-required' | 'invalid-operation' | 'invalid-approval' | 'fake-failed';
export type OcaApprovalRuntimeExecutionPosture = 'fake';
export type OcaApprovalRuntimeFakeExecution = 'called' | 'not-called';
export type OcaApprovalRuntimeApprovalState = 'not-required' | 'pending' | 'approved' | 'invalid' | 'unknown';
export type OcaApprovalRuntimeIssueCode =
  | 'not-object'
  | 'missing-field'
  | 'invalid-field'
  | 'invalid-operation'
  | 'invalid-approval'
  | 'approval-required'
  | 'unsafe-json';

export type OcaApprovalRequirementRef = string & {
  readonly __ocaApprovalRequirementRef: true;
};

export type OcaApprovalDecisionRef = string & {
  readonly __ocaApprovalDecisionRef: true;
};

type SafePublicRef = string & {
  readonly __ocaApprovalRuntimeSafePublicRef: true;
};

export type OcaApprovalRuntimeSafeRefs = Pick<
  OcaOperationHandlerRequest,
  'sessionRef' | 'taskRef' | 'worktreeRef' | 'branchRef' | 'outputRef' | 'logRef' | 'diffRef' | 'artifactRef' | 'reviewRef'
>;

export interface OcaApprovalDecision {
  readonly kind: 'explicit-approval';
  readonly approved: true;
  readonly requirementRef: OcaApprovalRequirementRef;
  readonly operationRef: OcaOperationRef;
  readonly effect: Exclude<OcaOperationEffectClassification, 'unknown'>;
  readonly idempotencyRef?: SafePublicRef;
  readonly requestRef?: SafePublicRef;
  readonly decisionRef?: OcaApprovalDecisionRef;
}

export interface OcaApprovalRuntimeToolRequest extends OcaApprovalRuntimeSafeRefs {
  readonly operationRef: OcaOperationRef;
  readonly inputSummary?: string;
  readonly fakeFailure?: boolean;
  readonly idempotencyRef?: SafePublicRef;
  readonly requestRef?: SafePublicRef;
  readonly approvalDecision?: OcaApprovalDecision;
}

export interface OcaApprovalRuntimeToolApprovalEnvelope {
  readonly required: boolean;
  readonly classification: OcaOperationApprovalClassification | 'unknown';
  readonly state: OcaApprovalRuntimeApprovalState;
}

export interface OcaApprovalRuntimeToolIdempotencyEnvelope {
  readonly classification: OcaOperationReplayClassification | 'unknown';
  readonly required: OcaOperationIdempotencyRequirement;
  readonly mutating: boolean;
  readonly idempotencyRef?: SafePublicRef;
  readonly requestRef?: SafePublicRef;
}

export interface OcaApprovalRuntimePublicIssue {
  readonly code: OcaApprovalRuntimeIssueCode;
  readonly field: string;
  readonly summary: string;
}

export interface OcaApprovalRequirementDescriptor {
  readonly requirementRef: OcaApprovalRequirementRef;
  readonly operationRef: OcaOperationRef;
  readonly effect: Exclude<OcaOperationEffectClassification, 'unknown'>;
  readonly classification: OcaOperationApprovalClassification;
  readonly idempotency: OcaApprovalRuntimeToolIdempotencyEnvelope;
  readonly safeRefs: OcaApprovalRuntimeSafeRefs;
  readonly summary: string;
}

export interface OcaApprovalRuntimeToolResult {
  readonly ok: boolean;
  readonly status: OcaApprovalRuntimeToolStatus;
  readonly executionPosture: OcaApprovalRuntimeExecutionPosture;
  readonly fakeExecution: OcaApprovalRuntimeFakeExecution;
  readonly effect: OcaOperationEffectClassification;
  readonly approval: OcaApprovalRuntimeToolApprovalEnvelope;
  readonly idempotency: OcaApprovalRuntimeToolIdempotencyEnvelope;
  readonly issues: readonly OcaApprovalRuntimePublicIssue[];
  readonly operationRef?: OcaOperationRef;
  readonly requirement?: OcaApprovalRequirementDescriptor;
  readonly operationResult?: OcaOperationHandlerResult;
}

export interface OcaApprovalRuntimeToolIntegration {
  readonly handle: (request: unknown) => OcaApprovalRuntimeToolResult;
}

export function createOcaApprovalRuntimeToolIntegration(
  dependencies: OcaOperationHandlerDependencies = {},
): OcaApprovalRuntimeToolIntegration {
  return Object.freeze({
    handle(request: unknown): OcaApprovalRuntimeToolResult {
      return handleOcaApprovalRuntimeToolRequest(request, dependencies);
    },
  } satisfies OcaApprovalRuntimeToolIntegration);
}

export function handleOcaApprovalRuntimeToolRequest(
  request: unknown,
  dependencies: OcaOperationHandlerDependencies = {},
): OcaApprovalRuntimeToolResult {
  const normalized = normalizeRuntimeToolRequest(request);

  if (!normalized.ok) {
    return invalidRuntimeResult('invalid-operation', normalized.issues, normalized.operationRef, normalized.policy, normalized.idempotencyRef, normalized.requestRef);
  }

  const context = normalized.value;
  if ('approved' in context.input) {
    return invalidRuntimeResult(
      'invalid-approval',
      Object.freeze([issue('invalid-approval', 'approvalDecision', 'Approval requires an explicit safe decision object.')]),
      context.operationRef,
      context.policy,
      context.idempotencyRef,
      context.requestRef,
    );
  }

  if (context.policy.approval === 'read-only') {
    if ('approvalDecision' in context.input) {
      const decision = normalizeApprovalDecision(context.input.approvalDecision, context);
      if (!decision.ok) {
        return invalidRuntimeResult(
          'invalid-approval',
          decision.issues,
          context.operationRef,
          context.policy,
          context.idempotencyRef,
          context.requestRef,
        );
      }
    }

    return resultFromHandler(handleOcaOperation(buildOperationInput(context.input), dependencies), context, 'not-required');
  }

  const preApproval = handleOcaOperation(buildOperationInput(context.input), dependencies);
  if (preApproval.status === 'invalid-input') {
    return invalidRuntimeResult(
      'invalid-operation',
      operationIssues(preApproval.issues),
      context.operationRef,
      context.policy,
      context.idempotencyRef,
      context.requestRef,
    );
  }

  const requirement = buildApprovalRequirementDescriptor(context);
  if (!('approvalDecision' in context.input)) {
    return approvalRequiredResult(context, requirement);
  }

  const decision = normalizeApprovalDecision(context.input.approvalDecision, context);
  if (!decision.ok) {
    return invalidRuntimeResult(
      'invalid-approval',
      decision.issues,
      context.operationRef,
      context.policy,
      context.idempotencyRef,
      context.requestRef,
    );
  }

  return resultFromHandler(handleOcaOperation(buildOperationInput(context.input, true), dependencies), context, 'approved', requirement);
}

export function isSafeOcaApprovalRuntimeJson(value: unknown): boolean {
  return isSafeSerializableValue(value);
}

function normalizeRuntimeToolRequest(input: unknown):
  | {
      readonly ok: true;
      readonly value: NormalizedRuntimeToolRequest;
    }
  | {
      readonly ok: false;
      readonly issues: readonly OcaApprovalRuntimePublicIssue[];
      readonly operationRef?: OcaOperationRef;
      readonly policy?: OcaOperationPolicy;
      readonly idempotencyRef?: SafePublicRef;
      readonly requestRef?: SafePublicRef;
    } {
  if (!isRecord(input)) {
    return Object.freeze({ ok: false, issues: Object.freeze([issue('not-object', 'request', 'Runtime tool request must be a safe object.')]) });
  }

  if (firstUnsafePublicKey(input) !== undefined) {
    return Object.freeze({ ok: false, issues: Object.freeze([issue('invalid-field', 'request', 'Runtime tool request contains an unsafe public field.')]) });
  }

  if (!('operationRef' in input)) {
    return Object.freeze({ ok: false, issues: Object.freeze([issue('missing-field', 'operationRef', 'Operation ref is required.')]) });
  }

  if (typeof input.operationRef !== 'string') {
    return Object.freeze({ ok: false, issues: Object.freeze([issue('invalid-operation', 'operationRef', 'Operation ref must be a registered safe OCA operation.')]) });
  }

  const operationRef = input.operationRef as OcaOperationRef;
  const policy = tryGetPolicy(operationRef);
  if (policy === undefined) {
    return Object.freeze({ ok: false, issues: Object.freeze([issue('invalid-operation', 'operationRef', 'Operation ref must be a registered safe OCA operation.')]) });
  }

  const issues: OcaApprovalRuntimePublicIssue[] = [];
  const idempotencyRef = readSafePublicRef(input, 'idempotencyRef', 'idempotency', issues);
  const requestRef = readSafePublicRef(input, 'requestRef', 'request', issues);

  if (issues.length > 0) {
    return Object.freeze({
      ok: false,
      issues: Object.freeze(issues),
      operationRef,
      policy,
      ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
      ...(requestRef === undefined ? {} : { requestRef }),
    });
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      input,
      operationRef,
      policy,
      ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
      ...(requestRef === undefined ? {} : { requestRef }),
    } satisfies NormalizedRuntimeToolRequest),
  });
}

function normalizeApprovalDecision(
  decision: unknown,
  context: NormalizedRuntimeToolRequest,
):
  | {
      readonly ok: true;
      readonly value: OcaApprovalDecision;
    }
  | {
      readonly ok: false;
      readonly issues: readonly OcaApprovalRuntimePublicIssue[];
    } {
  if (!isRecord(decision)) {
    return Object.freeze({ ok: false, issues: Object.freeze([issue('invalid-approval', 'approvalDecision', 'Approval decision must be an explicit safe object.')]) });
  }

  if (firstUnsafePublicKey(decision) !== undefined) {
    return Object.freeze({ ok: false, issues: Object.freeze([issue('invalid-approval', 'approvalDecision', 'Approval decision contains an unsafe public field.')]) });
  }

  for (const key of Object.keys(decision)) {
    if (!ALLOWED_DECISION_KEYS.includes(key)) {
      return Object.freeze({ ok: false, issues: Object.freeze([issue('invalid-approval', 'approvalDecision', 'Approval decision contains an unsupported public field.')]) });
    }
  }

  if (context.policy.approval === 'read-only') {
    return Object.freeze({ ok: false, issues: Object.freeze([issue('invalid-approval', 'approvalDecision', 'Approval decision is not required for read-only operation.')]) });
  }

  const requirement = buildApprovalRequirementDescriptor(context);
  const issues: OcaApprovalRuntimePublicIssue[] = [];

  if (decision.kind !== 'explicit-approval') {
    issues.push(issue('invalid-approval', 'kind', 'Approval decision kind must be explicit.'));
  }

  if (decision.approved !== true) {
    issues.push(issue('invalid-approval', 'approved', 'Approval decision must grant approval explicitly.'));
  }

  if (decision.operationRef !== context.operationRef) {
    issues.push(issue('invalid-approval', 'operationRef', 'Approval decision operation must match the request.'));
  }

  if (decision.effect !== context.policy.effect) {
    issues.push(issue('invalid-approval', 'effect', 'Approval decision effect must match the request.'));
  }

  if (decision.requirementRef !== requirement.requirementRef) {
    issues.push(issue('invalid-approval', 'requirementRef', 'Approval decision requirement must match the request.'));
  }

  const idempotencyRef = readSafePublicRef(decision, 'idempotencyRef', 'idempotency', issues);
  const requestRef = readSafePublicRef(decision, 'requestRef', 'request', issues);
  const decisionRef = readApprovalDecisionRef(decision, issues);

  if (context.idempotencyRef !== undefined && idempotencyRef !== context.idempotencyRef) {
    issues.push(issue('invalid-approval', 'idempotencyRef', 'Approval decision idempotency ref must match the request.'));
  }

  if (context.idempotencyRef === undefined && idempotencyRef !== undefined) {
    issues.push(issue('invalid-approval', 'idempotencyRef', 'Approval decision idempotency ref must be request-scoped.'));
  }

  if (context.requestRef !== undefined && requestRef !== context.requestRef) {
    issues.push(issue('invalid-approval', 'requestRef', 'Approval decision request ref must match the request.'));
  }

  if (context.requestRef === undefined && requestRef !== undefined) {
    issues.push(issue('invalid-approval', 'requestRef', 'Approval decision request ref must be request-scoped.'));
  }

  if (issues.length > 0) {
    return Object.freeze({ ok: false, issues: Object.freeze(issues) });
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: 'explicit-approval',
      approved: true,
      requirementRef: requirement.requirementRef,
      operationRef: context.operationRef,
      effect: context.policy.effect,
      ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
      ...(requestRef === undefined ? {} : { requestRef }),
      ...(decisionRef === undefined ? {} : { decisionRef }),
    } satisfies OcaApprovalDecision),
  });
}

function approvalRequiredResult(
  context: NormalizedRuntimeToolRequest,
  requirement: OcaApprovalRequirementDescriptor,
): OcaApprovalRuntimeToolResult {
  return safeResult({
    ok: false,
    status: 'approval-required',
    operationRef: context.operationRef,
    executionPosture: 'fake',
    fakeExecution: 'not-called',
    effect: context.policy.effect,
    approval: approvalEnvelope(context.policy, 'pending'),
    idempotency: idempotencyEnvelope(context.policy, context.idempotencyRef, context.requestRef),
    issues: Object.freeze([issue('approval-required', 'approvalDecision', 'Explicit approval is required before fake execution.')]),
    requirement,
  });
}

function resultFromHandler(
  handled: OcaOperationHandlerResult,
  context: NormalizedRuntimeToolRequest,
  state: Exclude<OcaApprovalRuntimeApprovalState, 'pending' | 'invalid' | 'unknown'>,
  requirement?: OcaApprovalRequirementDescriptor,
): OcaApprovalRuntimeToolResult {
  const status = handled.status === 'fake-failed' ? 'fake-failed' : handled.status === 'invalid-input' ? 'invalid-operation' : 'executed';

  return safeResult({
    ok: handled.ok,
    status,
    operationRef: context.operationRef,
    executionPosture: 'fake',
    fakeExecution: handled.fakeExecution,
    effect: handled.effect,
    approval: approvalEnvelope(context.policy, state),
    idempotency: idempotencyEnvelope(context.policy, context.idempotencyRef, context.requestRef),
    issues: status === 'invalid-operation' ? operationIssues(handled.issues) : Object.freeze([]),
    ...(requirement === undefined ? {} : { requirement }),
    operationResult: handled,
  });
}

function invalidRuntimeResult(
  status: 'invalid-operation' | 'invalid-approval',
  issues: readonly OcaApprovalRuntimePublicIssue[],
  operationRef: OcaOperationRef | undefined,
  policy: OcaOperationPolicy | undefined,
  idempotencyRef: SafePublicRef | undefined,
  requestRef: SafePublicRef | undefined,
): OcaApprovalRuntimeToolResult {
  return safeResult({
    ok: false,
    status,
    ...(operationRef === undefined ? {} : { operationRef }),
    executionPosture: 'fake',
    fakeExecution: 'not-called',
    effect: policy === undefined ? 'unknown' : policy.effect,
    approval: policy === undefined ? unknownApprovalEnvelope() : approvalEnvelope(policy, status === 'invalid-approval' ? 'invalid' : 'pending'),
    idempotency: policy === undefined ? unknownIdempotencyEnvelope() : idempotencyEnvelope(policy, idempotencyRef, requestRef),
    issues: Object.freeze([...issues]),
  });
}

function buildApprovalRequirementDescriptor(context: NormalizedRuntimeToolRequest): OcaApprovalRequirementDescriptor {
  return Object.freeze({
    requirementRef: buildRequirementRef(context),
    operationRef: context.operationRef,
    effect: context.policy.effect,
    classification: context.policy.approval,
    idempotency: idempotencyEnvelope(context.policy, context.idempotencyRef, context.requestRef),
    safeRefs: collectSafeRefs(context.input),
    summary: 'Explicit approval is required before fake OCA execution.',
  } satisfies OcaApprovalRequirementDescriptor);
}

function buildRequirementRef(context: NormalizedRuntimeToolRequest): OcaApprovalRequirementRef {
  const body = [
    context.operationRef,
    context.policy.effect,
    context.policy.approval,
    context.policy.idempotency,
    context.idempotencyRef ?? 'none',
    context.requestRef ?? 'none',
    ...safeRefFingerprintParts(context.input),
  ].join('|');
  const operationName = context.operationRef.slice(context.operationRef.lastIndexOf('.') + 1);
  const checksum = checksumSafe(body).toString(16).padStart(4, '0');

  return `approval-requirement:${operationName}-${checksum}` as OcaApprovalRequirementRef;
}

function safeRefFingerprintParts(input: Record<string, unknown>): readonly string[] {
  const parts: string[] = [];

  for (const field of OCA_REF_FIELDS) {
    const value = input[field];
    if (typeof value === 'string' && isSafeOcaRefLike(value)) {
      parts.push(`${field}=${value}`);
    }
  }

  return Object.freeze(parts);
}

function buildOperationInput(input: Record<string, unknown>, approved?: true): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const key of OPERATION_INPUT_KEYS) {
    if (key in input) {
      output[key] = input[key];
    }
  }

  if (approved === true) {
    output.approved = true;
  }

  return Object.freeze(output);
}

function collectSafeRefs(input: Record<string, unknown>): OcaApprovalRuntimeSafeRefs {
  const refs: MutableRuntimeSafeRefs = {};

  for (const field of OCA_REF_FIELDS) {
    copySafeRef(refs, field, input[field]);
  }

  return Object.freeze(refs);
}

function copySafeRef(target: MutableRuntimeSafeRefs, field: RuntimeRefField, value: unknown): void {
  if (typeof value !== 'string' || !isSafeOcaRefLike(value)) {
    return;
  }

  if (field === 'sessionRef') {
    target.sessionRef = value as OcaApprovalRuntimeSafeRefs['sessionRef'];
    return;
  }
  if (field === 'taskRef') {
    target.taskRef = value as OcaApprovalRuntimeSafeRefs['taskRef'];
    return;
  }
  if (field === 'worktreeRef') {
    target.worktreeRef = value as OcaApprovalRuntimeSafeRefs['worktreeRef'];
    return;
  }
  if (field === 'branchRef') {
    target.branchRef = value as OcaApprovalRuntimeSafeRefs['branchRef'];
    return;
  }
  if (field === 'outputRef') {
    target.outputRef = value as OcaApprovalRuntimeSafeRefs['outputRef'];
    return;
  }
  if (field === 'logRef') {
    target.logRef = value as OcaApprovalRuntimeSafeRefs['logRef'];
    return;
  }
  if (field === 'diffRef') {
    target.diffRef = value as OcaApprovalRuntimeSafeRefs['diffRef'];
    return;
  }
  if (field === 'artifactRef') {
    target.artifactRef = value as OcaApprovalRuntimeSafeRefs['artifactRef'];
    return;
  }

  target.reviewRef = value as OcaApprovalRuntimeSafeRefs['reviewRef'];
}

function operationIssues(issues: readonly OcaOperationPublicIssue[]): readonly OcaApprovalRuntimePublicIssue[] {
  return Object.freeze(
    issues.map((currentIssue) =>
      issue(
        currentIssue.code === 'approval-required' ? 'approval-required' : 'invalid-operation',
        currentIssue.field,
        currentIssue.summary,
      ),
    ),
  );
}

function approvalEnvelope(policy: OcaOperationPolicy, state: OcaApprovalRuntimeApprovalState): OcaApprovalRuntimeToolApprovalEnvelope {
  if (policy.approval === 'read-only') {
    return Object.freeze({ required: false, classification: policy.approval, state: 'not-required' });
  }

  return Object.freeze({ required: true, classification: policy.approval, state });
}

function idempotencyEnvelope(
  policy: OcaOperationPolicy,
  idempotencyRef: SafePublicRef | undefined,
  requestRef: SafePublicRef | undefined,
): OcaApprovalRuntimeToolIdempotencyEnvelope {
  return Object.freeze({
    classification: policy.idempotency,
    required: policy.idempotencyRequired,
    mutating: policy.mutating,
    ...(idempotencyRef === undefined ? {} : { idempotencyRef }),
    ...(requestRef === undefined ? {} : { requestRef }),
  } satisfies OcaApprovalRuntimeToolIdempotencyEnvelope);
}

function unknownApprovalEnvelope(): OcaApprovalRuntimeToolApprovalEnvelope {
  return Object.freeze({ required: false, classification: 'unknown', state: 'unknown' });
}

function unknownIdempotencyEnvelope(): OcaApprovalRuntimeToolIdempotencyEnvelope {
  return Object.freeze({ classification: 'unknown', required: 'unknown', mutating: false });
}

function tryGetPolicy(operationRef: OcaOperationRef): OcaOperationPolicy | undefined {
  try {
    return getOcaOperationPolicy(operationRef);
  } catch {
    return undefined;
  }
}

function readSafePublicRef(
  input: Record<string, unknown>,
  field: 'idempotencyRef' | 'requestRef',
  kind: 'idempotency' | 'request',
  issues: OcaApprovalRuntimePublicIssue[],
): SafePublicRef | undefined {
  if (!(field in input)) {
    return undefined;
  }

  const value = input[field];
  const prefix = `${kind}:`;
  if (typeof value !== 'string' || !isSafePrefixedRef(value, prefix)) {
    issues.push(issue('invalid-field', field, `${field} must be a bounded safe ref.`));
    return undefined;
  }

  return value as SafePublicRef;
}

function readApprovalDecisionRef(input: Record<string, unknown>, issues: OcaApprovalRuntimePublicIssue[]): OcaApprovalDecisionRef | undefined {
  if (!('decisionRef' in input)) {
    return undefined;
  }

  const value = input.decisionRef;
  if (typeof value !== 'string' || !isSafePrefixedRef(value, 'approval-decision:')) {
    issues.push(issue('invalid-approval', 'decisionRef', 'Approval decision ref must be bounded and safe.'));
    return undefined;
  }

  return value as OcaApprovalDecisionRef;
}

function isSafeOcaRefLike(value: string): boolean {
  return OCA_REF_PREFIXES.some((prefix) => isSafePrefixedRef(value, prefix));
}

function isSafePrefixedRef(value: string, prefix: string): boolean {
  if (value.length === 0 || value.length > MAX_SAFE_REF_LENGTH || !value.startsWith(prefix)) {
    return false;
  }

  if (hasUnsafeStringMarker(value)) {
    return false;
  }

  const body = value.slice(prefix.length);
  return body.length > 0 && body.length <= MAX_SAFE_REF_BODY_LENGTH && SAFE_REF_BODY_PATTERN.test(body);
}

function safeResult(result: OcaApprovalRuntimeToolResult): OcaApprovalRuntimeToolResult {
  if (isSafeOcaApprovalRuntimeJson(result)) {
    return Object.freeze(result);
  }

  return Object.freeze({
    ok: false,
    status: 'invalid-operation',
    executionPosture: 'fake',
    fakeExecution: 'not-called',
    effect: 'unknown',
    approval: unknownApprovalEnvelope(),
    idempotency: unknownIdempotencyEnvelope(),
    issues: Object.freeze([issue('unsafe-json', 'result', 'Runtime tool result was reduced to a safe envelope.')]),
  } satisfies OcaApprovalRuntimeToolResult);
}

function issue(code: OcaApprovalRuntimeIssueCode, field: string, summary: string): OcaApprovalRuntimePublicIssue {
  return Object.freeze({ code, field, summary });
}

function isSafeSerializableValue(value: unknown): boolean {
  if (value === null) {
    return true;
  }

  if (typeof value === 'string') {
    return value.length <= MAX_PUBLIC_STRING_LENGTH && !hasUnsafeStringMarker(value);
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
      if (isUnsafePublicKey(key) || !isSafeSerializableValue(child)) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function firstUnsafePublicKey(value: Record<string, unknown>): string | undefined {
  return Object.keys(value).find(isUnsafePublicKey);
}

function isUnsafePublicKey(key: string): boolean {
  const lower = key.toLowerCase();
  return UNSAFE_PUBLIC_JSON_KEYS.some((unsafeKey) => lower === unsafeKey || lower.endsWith(unsafeKey));
}

function hasUnsafeStringMarker(value: string): boolean {
  const lower = value.toLowerCase();

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
    UNSAFE_TEXT_MARKERS.some((marker) => lower.includes(marker))
  );
}

function checksumSafe(value: string): number {
  let checksum = 23;

  for (const char of value) {
    checksum = (checksum * 33 + char.charCodeAt(0)) % 65521;
  }

  return checksum;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fromCharCodes(codes: readonly number[]): string {
  return String.fromCharCode(...codes);
}

type NormalizedRuntimeToolRequest = {
  readonly input: Record<string, unknown>;
  readonly operationRef: OcaOperationRef;
  readonly policy: OcaOperationPolicy;
  readonly idempotencyRef?: SafePublicRef;
  readonly requestRef?: SafePublicRef;
};

type Mutable<T> = {
  -readonly [TKey in keyof T]: T[TKey];
};

type MutableRuntimeSafeRefs = Mutable<OcaApprovalRuntimeSafeRefs>;

type RuntimeRefField = keyof OcaApprovalRuntimeSafeRefs;

const OPERATION_INPUT_KEYS = Object.freeze([
  'operationRef',
  'fakeFailure',
  'sessionRef',
  'taskRef',
  'worktreeRef',
  'branchRef',
  'outputRef',
  'logRef',
  'diffRef',
  'artifactRef',
  'reviewRef',
  'inputSummary',
] as const);

const OCA_REF_FIELDS = Object.freeze([
  'sessionRef',
  'taskRef',
  'worktreeRef',
  'branchRef',
  'outputRef',
  'logRef',
  'diffRef',
  'artifactRef',
  'reviewRef',
] as const satisfies readonly RuntimeRefField[]);

const OCA_REF_PREFIXES: readonly string[] = Object.freeze([
  'oca-session:',
  'oca-task:',
  'oca-worktree:',
  'oca-branch:',
  'oca-output:',
  'oca-log:',
  'oca-diff:',
  'oca-artifact:',
  'oca-review:',
]);

const ALLOWED_DECISION_KEYS: readonly string[] = Object.freeze([
  'kind',
  'approved',
  'requirementRef',
  'operationRef',
  'effect',
  'idempotencyRef',
  'requestRef',
  'decisionRef',
]);

const SAFE_REF_BODY_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/u;
const URL_LIKE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//iu;
const RAW_REMOTE_PATTERN = /^(?:git@|ssh:)|(?:^|[.@-])github[.]|[.]git$/iu;
const DRIVE_LIKE_PATTERN = /^[a-z]:/iu;
const MAX_SAFE_REF_LENGTH = 96;
const MAX_SAFE_REF_BODY_LENGTH = 64;
const MAX_PUBLIC_STRING_LENGTH = 512;

const UNSAFE_PUBLIC_JSON_KEYS = Object.freeze(
  [
    [114, 97, 119, 108, 111, 103],
    [114, 97, 119, 100, 105, 102, 102],
    [114, 97, 119, 111, 117, 116, 112, 117, 116],
    [114, 97, 119, 112, 97, 116, 104],
    [102, 105, 108, 101, 112, 97, 116, 104],
    [114, 101, 112, 111, 112, 97, 116, 104],
    [119, 111, 114, 107, 115, 112, 97, 99, 101, 112, 97, 116, 104],
    [112, 114, 111, 118, 105, 100, 101, 114, 112, 97, 121, 108, 111, 97, 100],
    [114, 117, 110, 116, 105, 109, 101, 112, 97, 121, 108, 111, 97, 100],
    [99, 97, 108, 108, 98, 97, 99, 107, 100, 97, 116, 97],
    [99, 104, 97, 116, 105, 100],
    [116, 104, 114, 101, 97, 100, 105, 100],
    [99, 108, 105, 101, 110, 116],
    [99, 108, 105, 101, 110, 116, 104, 97, 110, 100, 108, 101],
    [115, 100, 107, 99, 108, 105, 101, 110, 116],
    [112, 114, 111, 99, 101, 115, 115, 105, 100],
    [116, 111, 107, 101, 110],
    [115, 101, 99, 114, 101, 116],
    [99, 114, 101, 100, 101, 110, 116, 105, 97, 108],
    [115, 116, 97, 99, 107],
    [101, 110, 100, 112, 111, 105, 110, 116],
    [99, 111, 109, 109, 97, 110, 100, 111, 117, 116, 112, 117, 116],
    [112, 97, 116, 104],
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
