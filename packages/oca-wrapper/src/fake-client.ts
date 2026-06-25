import type { OcaOperationRef } from './capability-descriptor.js';
import type {
  OcaArtifactRef,
  OcaBranchRef,
  OcaDiffRef,
  OcaLogRef,
  OcaOutputRef,
  OcaReviewRef,
  OcaSessionRef,
  OcaTaskRef,
  OcaWorktreeRef,
} from './session-model.js';

export type FakeOcaEffectClassification = 'read-only' | 'external-effect' | 'repository-mutation';
export type FakeOcaExecutionPosture = 'fake';
export type FakeOcaExecutionState = 'succeeded' | 'failed';

export interface FakeOcaSafeRefs {
  readonly sessionRef?: OcaSessionRef;
  readonly taskRef?: OcaTaskRef;
  readonly worktreeRef?: OcaWorktreeRef;
  readonly branchRef?: OcaBranchRef;
  readonly outputRef?: OcaOutputRef;
  readonly logRef?: OcaLogRef;
  readonly diffRef?: OcaDiffRef;
  readonly artifactRef?: OcaArtifactRef;
  readonly reviewRef?: OcaReviewRef;
}

export interface FakeOcaClientRequest extends FakeOcaSafeRefs {
  readonly operationRef: OcaOperationRef;
  readonly effect: FakeOcaEffectClassification;
  readonly fakeFailure?: boolean;
}

export interface FakeOcaPublicIssue {
  readonly code: 'fake-failure';
  readonly field: 'fake';
  readonly summary: string;
}

export interface FakeOcaClientSuccessEnvelope {
  readonly ok: true;
  readonly operationRef: OcaOperationRef;
  readonly executionPosture: FakeOcaExecutionPosture;
  readonly fakeExecution: 'called';
  readonly state: 'succeeded';
  readonly effect: FakeOcaEffectClassification;
  readonly refs: FakeOcaSafeRefs;
  readonly summary: string;
  readonly resultRefs: readonly string[];
}

export interface FakeOcaClientFailureEnvelope {
  readonly ok: false;
  readonly operationRef: OcaOperationRef;
  readonly executionPosture: FakeOcaExecutionPosture;
  readonly fakeExecution: 'called';
  readonly state: 'failed';
  readonly effect: FakeOcaEffectClassification;
  readonly refs: FakeOcaSafeRefs;
  readonly summary: string;
  readonly issues: readonly FakeOcaPublicIssue[];
  readonly resultRefs: readonly string[];
}

export type FakeOcaClientEnvelope = FakeOcaClientSuccessEnvelope | FakeOcaClientFailureEnvelope;

export interface FakeOcaClient {
  readonly runOperation: (request: FakeOcaClientRequest) => FakeOcaClientEnvelope;
}

export function createFakeOcaClient(): FakeOcaClient {
  return Object.freeze({
    runOperation(request: FakeOcaClientRequest): FakeOcaClientEnvelope {
      const refs = cloneSafeRefs(request);
      const resultRefs = buildResultRefs(request);

      if (request.fakeFailure === true) {
        return Object.freeze({
          ok: false,
          operationRef: request.operationRef,
          executionPosture: 'fake',
          fakeExecution: 'called',
          state: 'failed',
          effect: request.effect,
          refs,
          summary: 'Fake operation failed safely.',
          issues: Object.freeze([
            Object.freeze({
              code: 'fake-failure',
              field: 'fake',
              summary: 'Fake operation returned a bounded failure envelope.',
            } satisfies FakeOcaPublicIssue),
          ]),
          resultRefs,
        } satisfies FakeOcaClientFailureEnvelope);
      }

      return Object.freeze({
        ok: true,
        operationRef: request.operationRef,
        executionPosture: 'fake',
        fakeExecution: 'called',
        state: 'succeeded',
        effect: request.effect,
        refs,
        summary: 'Fake operation completed with safe bounded output.',
        resultRefs,
      } satisfies FakeOcaClientSuccessEnvelope);
    },
  } satisfies FakeOcaClient);
}

function cloneSafeRefs(request: FakeOcaClientRequest): FakeOcaSafeRefs {
  const refs: MutableFakeOcaSafeRefs = {};
  assignOptional(refs, 'sessionRef', request.sessionRef);
  assignOptional(refs, 'taskRef', request.taskRef);
  assignOptional(refs, 'worktreeRef', request.worktreeRef);
  assignOptional(refs, 'branchRef', request.branchRef);
  assignOptional(refs, 'outputRef', request.outputRef);
  assignOptional(refs, 'logRef', request.logRef);
  assignOptional(refs, 'diffRef', request.diffRef);
  assignOptional(refs, 'artifactRef', request.artifactRef);
  assignOptional(refs, 'reviewRef', request.reviewRef);

  return Object.freeze(refs);
}

function buildResultRefs(request: FakeOcaClientRequest): readonly string[] {
  const resultRefs: string[] = [];

  if (request.sessionRef !== undefined) {
    resultRefs.push(request.sessionRef);
  }

  if (request.outputRef !== undefined) {
    resultRefs.push(request.outputRef);
  }

  if (request.logRef !== undefined) {
    resultRefs.push(request.logRef);
  }

  if (request.diffRef !== undefined) {
    resultRefs.push(request.diffRef);
  }

  if (request.reviewRef !== undefined) {
    resultRefs.push(request.reviewRef);
  }

  if (resultRefs.length === 0) {
    resultRefs.push(deriveSyntheticRef(request.operationRef, request.effect));
  }

  return Object.freeze(resultRefs);
}

function deriveSyntheticRef(operationRef: OcaOperationRef, effect: FakeOcaEffectClassification): string {
  const operationName = operationRef.slice(operationRef.lastIndexOf('.') + 1);
  const checksum = checksumSafe(operationRef + ':' + effect).toString(16).padStart(4, '0');

  return `oca-output:${operationName}-${checksum}`;
}

function checksumSafe(value: string): number {
  let checksum = 17;

  for (const char of value) {
    checksum = (checksum * 31 + char.charCodeAt(0)) % 65521;
  }

  return checksum;
}

function assignOptional<TKey extends keyof FakeOcaSafeRefs>(
  target: MutableFakeOcaSafeRefs,
  key: TKey,
  value: FakeOcaSafeRefs[TKey] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

type Mutable<T> = {
  -readonly [TKey in keyof T]: T[TKey];
};

type MutableFakeOcaSafeRefs = Mutable<FakeOcaSafeRefs>;
