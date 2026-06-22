import type { AdapterCorrelationRef, AdapterDetailsRef } from './refs.js';

const ADAPTER_READINESS_CHECK_STATUSES = ['pass', 'warn', 'fail', 'unknown'] as const;
const MAX_READINESS_COMPONENT_LENGTH = 80;
const MAX_READINESS_MESSAGE_LENGTH = 240;
const DEFAULT_READINESS_MESSAGE = 'Adapter readiness check reported.';
const SAFE_READINESS_COMPONENT_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const UNSAFE_ASSIGNMENT_PATTERN = /\b[A-Za-z][A-Za-z0-9_-]{0,40}\b\s*[:=]\s*\S+/gu;

export type AdapterReadinessStatus = 'ready' | 'degraded' | 'not-ready' | 'unknown';

export type AdapterReadinessCheckStatus = (typeof ADAPTER_READINESS_CHECK_STATUSES)[number];

export type AdapterReadinessComponent =
  | 'adapter'
  | 'core'
  | 'openclaw-channel'
  | 'telegram-channel'
  | 'topic-binding'
  | 'delivery'
  | 'runtime'
  | 'permission'
  | 'idempotency'
  | 'callback'
  | 'approval'
  | 'storage'
  | (string & {});

export interface AdapterReadinessCheck {
  readonly component: AdapterReadinessComponent;
  readonly status: AdapterReadinessCheckStatus;
  readonly message: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

export interface OpenClawTelegramAdapterReadiness {
  readonly status: AdapterReadinessStatus;
  readonly checks: readonly AdapterReadinessCheck[];
  readonly generatedAt?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}

function isAdapterReadinessCheckStatus(status: string): status is AdapterReadinessCheckStatus {
  return (ADAPTER_READINESS_CHECK_STATUSES as readonly string[]).includes(status);
}

function normalizeReadinessComponent(component: string): AdapterReadinessComponent {
  if (
    component.length === 0 ||
    component.length > MAX_READINESS_COMPONENT_LENGTH ||
    component.trim() !== component ||
    !SAFE_READINESS_COMPONENT_PATTERN.test(component)
  ) {
    throw new TypeError('Adapter readiness component must be a non-empty safe identifier.');
  }

  return component as AdapterReadinessComponent;
}

function normalizeReadinessMessage(message: string): string {
  const normalizedMessage = message
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(UNSAFE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalizedMessage.length === 0) {
    return DEFAULT_READINESS_MESSAGE;
  }

  if (normalizedMessage.length <= MAX_READINESS_MESSAGE_LENGTH) {
    return normalizedMessage;
  }

  return `${normalizedMessage.slice(0, MAX_READINESS_MESSAGE_LENGTH - 3)}...`;
}

function summarizeReadinessStatus(
  checks: readonly AdapterReadinessCheck[],
): AdapterReadinessStatus {
  if (checks.length === 0) {
    return 'unknown';
  }

  if (checks.some((check) => check.status === 'fail')) {
    return 'not-ready';
  }

  if (checks.some((check) => check.status === 'warn')) {
    return 'degraded';
  }

  if (checks.some((check) => check.status === 'unknown')) {
    return 'unknown';
  }

  return 'ready';
}

export function createAdapterReadinessCheck(input: {
  readonly component: AdapterReadinessComponent | string;
  readonly status: AdapterReadinessCheckStatus;
  readonly message: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}): AdapterReadinessCheck {
  if (!isAdapterReadinessCheckStatus(input.status)) {
    throw new TypeError('Unsupported adapter readiness check status.');
  }

  return Object.freeze({
    component: normalizeReadinessComponent(input.component),
    status: input.status,
    message: normalizeReadinessMessage(input.message),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
  });
}

export function summarizeAdapterReadiness(input: {
  readonly checks: readonly AdapterReadinessCheck[];
  readonly generatedAt?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly correlationRef?: AdapterCorrelationRef;
}): OpenClawTelegramAdapterReadiness {
  const checks = Object.freeze([...input.checks]);

  return Object.freeze({
    status: summarizeReadinessStatus(checks),
    checks,
    ...(input.generatedAt === undefined ? {} : { generatedAt: input.generatedAt }),
    ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
  });
}
