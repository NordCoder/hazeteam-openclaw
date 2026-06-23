const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const MAX_SAFE_REF_LENGTH = 256;
const MAX_SAFE_TITLE_LENGTH = 160;
const MAX_SAFE_MESSAGE_LENGTH = 1000;
const MAX_SAFE_REASON_LENGTH = 240;
const ASSIGNMENT_VALUE_PATTERN = /\b[A-Za-z][A-Za-z0-9_-]{0,40}\b\s*[:=]\s*\S+/gu;

const APPROVAL_DECISION_STATUSES = ['approved', 'rejected', 'expired', 'cancelled'] as const;

export type FakeApprovalDecisionStatus = (typeof APPROVAL_DECISION_STATUSES)[number];

export interface FakeApprovalRequest {
  readonly approvalRef: string;
  readonly title: string;
  readonly message: string;
  readonly workspaceRef?: string | undefined;
  readonly agentRef?: string | undefined;
  readonly actorRef?: string | undefined;
  readonly subjectRef?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeApprovalDecision {
  readonly approvalRef: string;
  readonly status: FakeApprovalDecisionStatus;
  readonly actorRef?: string | undefined;
  readonly reason?: string | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeApprovalSource {
  readonly submit: (request: FakeApprovalRequest) => FakeApprovalRequest;
  readonly getRequests: () => readonly FakeApprovalRequest[];
}

export interface FakeApprovalResolver {
  readonly resolve: (decision: FakeApprovalDecision) => FakeApprovalDecision;
  readonly getDecisions: () => readonly FakeApprovalDecision[];
}

function isDecisionStatus(status: string): status is FakeApprovalDecisionStatus {
  return (APPROVAL_DECISION_STATUSES as readonly string[]).includes(status);
}

function sanitizeText(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(ASSIGNMENT_VALUE_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function sanitizeRef(input: unknown, label: string): string {
  const normalized = sanitizeText(input, label, MAX_SAFE_REF_LENGTH);

  if (!SAFE_REF_PATTERN.test(normalized)) {
    throw new TypeError(`${label} must be a safe reference.`);
  }

  return normalized;
}

function sanitizeOptionalRef(input: string | undefined, label: string): string | undefined {
  return input === undefined ? undefined : sanitizeRef(input, label);
}

function sanitizeOptionalReason(input: string | undefined): string | undefined {
  return input === undefined
    ? undefined
    : sanitizeText(input, 'Fake approval decision reason', MAX_SAFE_REASON_LENGTH);
}

export function createFakeApprovalRequest(input: FakeApprovalRequest): FakeApprovalRequest {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Fake approval request must be an object.');
  }

  const workspaceRef = sanitizeOptionalRef(input.workspaceRef, 'Fake approval workspaceRef');
  const agentRef = sanitizeOptionalRef(input.agentRef, 'Fake approval agentRef');
  const actorRef = sanitizeOptionalRef(input.actorRef, 'Fake approval actorRef');
  const subjectRef = sanitizeOptionalRef(input.subjectRef, 'Fake approval subjectRef');
  const correlationRef = sanitizeOptionalRef(input.correlationRef, 'Fake approval correlationRef');

  return Object.freeze({
    approvalRef: sanitizeRef(input.approvalRef, 'Fake approvalRef'),
    title: sanitizeText(input.title, 'Fake approval title', MAX_SAFE_TITLE_LENGTH),
    message: sanitizeText(input.message, 'Fake approval message', MAX_SAFE_MESSAGE_LENGTH),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(subjectRef === undefined ? {} : { subjectRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function createFakeApprovalDecision(input: FakeApprovalDecision): FakeApprovalDecision {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Fake approval decision must be an object.');
  }

  if (!isDecisionStatus(input.status)) {
    throw new TypeError('Unsupported fake approval decision status.');
  }

  const actorRef = sanitizeOptionalRef(input.actorRef, 'Fake approval decision actorRef');
  const reason = sanitizeOptionalReason(input.reason);
  const correlationRef = sanitizeOptionalRef(input.correlationRef, 'Fake approval decision correlationRef');

  return Object.freeze({
    approvalRef: sanitizeRef(input.approvalRef, 'Fake approval decision approvalRef'),
    status: input.status,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(reason === undefined ? {} : { reason }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function createFakeApprovalSource(): FakeApprovalSource {
  const requests: FakeApprovalRequest[] = [];

  return Object.freeze({
    submit(request: FakeApprovalRequest): FakeApprovalRequest {
      const normalizedRequest = createFakeApprovalRequest(request);
      requests.push(normalizedRequest);
      return normalizedRequest;
    },

    getRequests(): readonly FakeApprovalRequest[] {
      return Object.freeze([...requests]);
    },
  });
}

export function createFakeApprovalResolver(): FakeApprovalResolver {
  const decisions: FakeApprovalDecision[] = [];

  return Object.freeze({
    resolve(decision: FakeApprovalDecision): FakeApprovalDecision {
      const normalizedDecision = createFakeApprovalDecision(decision);
      decisions.push(normalizedDecision);
      return normalizedDecision;
    },

    getDecisions(): readonly FakeApprovalDecision[] {
      return Object.freeze([...decisions]);
    },
  });
}
