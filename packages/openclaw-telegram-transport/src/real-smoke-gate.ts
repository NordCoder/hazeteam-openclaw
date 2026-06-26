import { isSafeTransportConfigJson, parseTransportConfig } from './config.js';

import type { TransportConfigInput, TransportConfigReadinessProjection } from './config.js';

export const REAL_SMOKE_GATE_STATUSES = Object.freeze([
  'skipped',
  'blocked-missing-profile',
  'blocked-network-gate-closed',
  'blocked-operator-ack-missing',
  'blocked-unsafe-operation-class',
  'blocked-missing-safe-test-ref',
  'blocked-missing-secret',
  'blocked-missing-port',
  'ready-to-run',
  'passed',
  'failed-safe',
  'blocked-by-profile',
  'blocked-by-secret',
  'blocked-by-missing-port',
] as const);

export type RealSmokeGateStatus = (typeof REAL_SMOKE_GATE_STATUSES)[number];

export const REAL_SMOKE_PROVIDER_KINDS = Object.freeze(['telegram-openclaw'] as const);

export type RealSmokeProviderKind = (typeof REAL_SMOKE_PROVIDER_KINDS)[number];

export const REAL_SMOKE_OPERATION_CLASSES = Object.freeze([
  'read-only',
  'ephemeral-write',
  'persistent-write',
  'destructive',
  'long-running',
  'sensitive-output',
] as const);

export type RealSmokeOperationClass = (typeof REAL_SMOKE_OPERATION_CLASSES)[number];

export const REAL_SMOKE_CLEANUP_POLICIES = Object.freeze(['not-applicable', 'manual', 'automatic'] as const);

export type RealSmokeCleanupPolicy = (typeof REAL_SMOKE_CLEANUP_POLICIES)[number];

export const REAL_SMOKE_PORT_STATUSES = Object.freeze(['missing', 'available'] as const);

export type RealSmokePortStatus = (typeof REAL_SMOKE_PORT_STATUSES)[number];

export const REAL_SMOKE_PROVIDER_ACK_RESULTS = Object.freeze([
  'not-attempted',
  'provider-ack-pending',
  'provider-acknowledged',
  'provider-rejected',
  'provider-unavailable',
] as const);

export type RealSmokeProviderAckResult = (typeof REAL_SMOKE_PROVIDER_ACK_RESULTS)[number];

export const REAL_SMOKE_BUSINESS_RESULTS = Object.freeze([
  'not-attempted',
  'business-success-pending',
  'business-succeeded',
  'business-failed-safe',
] as const);

export type RealSmokeBusinessResult = (typeof REAL_SMOKE_BUSINESS_RESULTS)[number];

export const REAL_SMOKE_ATTEMPT_REPORTS = Object.freeze(['not-supplied', 'supplied-redacted'] as const);

export type RealSmokeAttemptReport = (typeof REAL_SMOKE_ATTEMPT_REPORTS)[number];

export const REAL_SMOKE_REDACTED_FAILURES = Object.freeze([
  'none',
  'provider-ack-failed-safe',
  'business-failed-safe',
  'unsafe-output-redacted',
] as const);

export type RealSmokeRedactedFailure = (typeof REAL_SMOKE_REDACTED_FAILURES)[number];

export type RealSmokeBlockedReason =
  | 'none'
  | 'not-enabled'
  | 'profile-not-real-smoke'
  | 'network-gate-not-enabled'
  | 'operator-ack-missing'
  | 'unsafe-operation-class'
  | 'missing-safe-test-ref'
  | 'missing-or-invalid-credential-ref'
  | 'provider-port-not-injected'
  | 'provider-acknowledgement-failed-safe'
  | 'business-success-failed-safe'
  | 'unsafe-output-detected'
  | 'missing-or-invalid-secret-ref'
  | 'transport-port-not-implemented'
  | 'provider-attempt-failed-safe'
  | 'business-attempt-failed-safe';

export interface RealSmokeGateEnvironmentInput {
  readonly [key: string]: unknown;
}

export interface RealSmokeAttemptInput {
  readonly providerAckResult?: unknown;
  readonly businessResult?: unknown;
  readonly redactedFailureSummary?: unknown;
}

export interface RealSmokeGateInput {
  readonly enabled?: unknown;
  readonly profile?: unknown;
  readonly allowNetwork?: unknown;
  readonly operatorAcknowledged?: unknown;
  readonly operationClass?: unknown;
  readonly cleanupPolicy?: unknown;
  readonly correlationRef?: unknown;
  readonly providerPortStatus?: unknown;
  readonly transportPortStatus?: unknown;
  readonly config?: unknown;
  readonly attempt?: RealSmokeAttemptInput;
}

export interface RealSmokeConfiguredDependency {
  readonly provider: 'telegram' | 'openclaw';
  readonly transportRef: string;
  readonly credentialRef: string;
  readonly credentialStatus: 'configured-redacted' | 'missing' | 'invalid' | 'unavailable' | 'redacted';
}

export interface RealSmokeGateReport {
  readonly descriptorKind: 'openclaw-telegram-real-smoke-gate';
  readonly descriptorVersion: 'w18c';
  readonly status: RealSmokeGateStatus;
  readonly providerKind: RealSmokeProviderKind;
  readonly profile: 'real-smoke' | 'not-real-smoke';
  readonly operationClass: RealSmokeOperationClass;
  readonly cleanupPolicy: RealSmokeCleanupPolicy;
  readonly correlationRef: string;
  readonly configuredDependencyCount: number;
  readonly configuredDependencies: readonly RealSmokeConfiguredDependency[];
  readonly blockedReason: RealSmokeBlockedReason;
  readonly providerAckResult: RealSmokeProviderAckResult;
  readonly businessResult: RealSmokeBusinessResult;
  readonly providerPortStatus: RealSmokePortStatus;
  readonly transportPortStatus: RealSmokePortStatus;
  readonly attemptReport: RealSmokeAttemptReport;
  readonly redactedFailure: RealSmokeRedactedFailure;
  readonly noLeakResult: 'passed' | 'failed-safe';
  readonly remoteAttempt: 'not-attempted';
  readonly willCallRemote: false;
  readonly effects: 'none';
  readonly jsonSerializable: true;
  readonly readiness: TransportConfigReadinessProjection;
}

export const REAL_SMOKE_ENVIRONMENT_KEYS = Object.freeze({
  enabled: 'HAZETEAM_OPENCLAW_REAL_SMOKE',
  profile: 'HAZETEAM_OPENCLAW_SMOKE_PROFILE',
  allowNetwork: 'HAZETEAM_OPENCLAW_SMOKE_ALLOW_NETWORK',
  operatorAcknowledged: 'HAZETEAM_OPENCLAW_SMOKE_OPERATOR_ACK',
  operationClass: 'HAZETEAM_OPENCLAW_SMOKE_OPERATION_CLASS',
  cleanupPolicy: 'HAZETEAM_OPENCLAW_SMOKE_CLEANUP_POLICY',
  correlationRef: 'HAZETEAM_OPENCLAW_SMOKE_CORRELATION_REF',
  telegramCredentialRef: 'HAZETEAM_OPENCLAW_SMOKE_TELEGRAM_CREDENTIAL_REF',
  telegramTransportRef: 'HAZETEAM_OPENCLAW_SMOKE_TELEGRAM_TRANSPORT_REF',
  openClawCredentialRef: 'HAZETEAM_OPENCLAW_SMOKE_OPENCLAW_CREDENTIAL_REF',
  openClawTransportRef: 'HAZETEAM_OPENCLAW_SMOKE_OPENCLAW_TRANSPORT_REF',
} as const);

const SAFE_REF_PATTERN = /^[a-z][a-z0-9:-]{0,119}$/u;
const DEFAULT_CORRELATION_REF = 'corr:w18c-real-smoke-gate';
const MAX_REDACTED_FAILURE_INPUT_LENGTH = 240;

const UNSAFE_REAL_SMOKE_OUTPUT_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /(?:https?|postgres|redis|mongodb):\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\b(?:chat|thread|message|callback)[_-]?id\b/iu,
  /\braw(?:Config|Payload|Update|Response|Body)?\b/u,
  /\b(?:endpoint|stackTrace|stack|trace|diff|logOutput)\b/u,
] as const);

function normalizeOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }

  return fallback;
}

function gateEnabled(value: unknown): boolean {
  return value === true || value === '1' || value === 'true' || value === 'enabled';
}

function safeRef(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/gu, '-').slice(0, 120);
  if (!SAFE_REF_PATTERN.test(normalized) || hasUnsafeRealSmokeOutputText(normalized)) {
    return fallback;
  }

  return normalized;
}

function safeCorrelationRef(value: unknown): string {
  return safeRef(value, DEFAULT_CORRELATION_REF);
}

function configuredDependencies(readiness: TransportConfigReadinessProjection): readonly RealSmokeConfiguredDependency[] {
  return Object.freeze(
    readiness.providers.map((provider) =>
      Object.freeze({
        provider: provider.provider,
        transportRef: provider.transportRef,
        credentialRef: provider.secretRef,
        credentialStatus: provider.secretStatus,
      } satisfies RealSmokeConfiguredDependency),
    ),
  );
}

function hasMissingTransportRef(dependencies: readonly RealSmokeConfiguredDependency[]): boolean {
  return dependencies.some((dependency) => {
    const fallbackRef = `transport:${dependency.provider}`;
    return dependency.transportRef === fallbackRef || dependency.transportRef === `${fallbackRef}:redacted`;
  });
}

function normalizeAttemptProviderAck(attempt: RealSmokeAttemptInput | undefined): RealSmokeProviderAckResult {
  return normalizeOneOf(attempt?.providerAckResult, REAL_SMOKE_PROVIDER_ACK_RESULTS, 'not-attempted');
}

function normalizeAttemptBusinessResult(attempt: RealSmokeAttemptInput | undefined): RealSmokeBusinessResult {
  return normalizeOneOf(attempt?.businessResult, REAL_SMOKE_BUSINESS_RESULTS, 'not-attempted');
}

function attemptReport(attempt: RealSmokeAttemptInput | undefined): RealSmokeAttemptReport {
  return attempt === undefined ? 'not-supplied' : 'supplied-redacted';
}

function hasUnsafeRealSmokeOutputText(value: string): boolean {
  return UNSAFE_REAL_SMOKE_OUTPUT_PATTERNS.some((pattern) => pattern.test(value));
}

function hasUnsafeAttemptOutput(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  try {
    const encoded = JSON.stringify(value);
    return (
      typeof encoded !== 'string' ||
      encoded.length > MAX_REDACTED_FAILURE_INPUT_LENGTH ||
      hasUnsafeRealSmokeOutputText(encoded)
    );
  } catch {
    return true;
  }
}

function attemptStatus(
  providerAckResult: RealSmokeProviderAckResult,
  businessResult: RealSmokeBusinessResult,
  inputAttemptReport: RealSmokeAttemptReport,
  unsafeAttemptOutput: boolean,
): Pick<RealSmokeGateReport, 'status' | 'blockedReason' | 'redactedFailure'> {
  if (unsafeAttemptOutput) {
    return { status: 'failed-safe', blockedReason: 'unsafe-output-detected', redactedFailure: 'unsafe-output-redacted' };
  }

  if (inputAttemptReport === 'not-supplied') {
    return { status: 'ready-to-run', blockedReason: 'none', redactedFailure: 'none' };
  }

  if (providerAckResult !== 'provider-acknowledged') {
    return {
      status: 'failed-safe',
      blockedReason: 'provider-acknowledgement-failed-safe',
      redactedFailure: 'provider-ack-failed-safe',
    };
  }

  if (businessResult !== 'business-succeeded') {
    return {
      status: 'failed-safe',
      blockedReason: 'business-attempt-failed-safe',
      redactedFailure: 'business-failed-safe',
    };
  }

  return { status: 'passed', blockedReason: 'none', redactedFailure: 'none' };
}

function safeFallbackReadiness(readiness: TransportConfigReadinessProjection): TransportConfigReadinessProjection {
  return parseTransportConfig({ profile: readiness.profile }).readiness;
}

function makeReport(input: {
  readonly status: RealSmokeGateStatus;
  readonly blockedReason: RealSmokeBlockedReason;
  readonly operationClass: RealSmokeOperationClass;
  readonly cleanupPolicy: RealSmokeCleanupPolicy;
  readonly correlationRef: string;
  readonly providerAckResult: RealSmokeProviderAckResult;
  readonly businessResult: RealSmokeBusinessResult;
  readonly providerPortStatus: RealSmokePortStatus;
  readonly attemptReport: RealSmokeAttemptReport;
  readonly redactedFailure: RealSmokeRedactedFailure;
  readonly readiness: TransportConfigReadinessProjection;
}): RealSmokeGateReport {
  const dependencies = configuredDependencies(input.readiness);
  const report = Object.freeze({
    descriptorKind: 'openclaw-telegram-real-smoke-gate',
    descriptorVersion: 'w18c',
    status: input.status,
    providerKind: 'telegram-openclaw',
    profile: input.readiness.profile === 'real-smoke' ? 'real-smoke' : 'not-real-smoke',
    operationClass: input.operationClass,
    cleanupPolicy: input.cleanupPolicy,
    correlationRef: input.correlationRef,
    configuredDependencyCount: dependencies.length,
    configuredDependencies: dependencies,
    blockedReason: input.blockedReason,
    providerAckResult: input.providerAckResult,
    businessResult: input.businessResult,
    providerPortStatus: input.providerPortStatus,
    transportPortStatus: input.providerPortStatus,
    attemptReport: input.attemptReport,
    redactedFailure: input.redactedFailure,
    noLeakResult: input.blockedReason === 'unsafe-output-detected' ? 'failed-safe' : 'passed',
    remoteAttempt: 'not-attempted',
    willCallRemote: false,
    effects: 'none',
    jsonSerializable: true,
    readiness: input.readiness,
  } satisfies RealSmokeGateReport);

  if (isSafeRealSmokeGateReportJson(report)) {
    return report;
  }

  const safeReadiness = safeFallbackReadiness(input.readiness);
  const safeDependencies = configuredDependencies(safeReadiness);
  return Object.freeze({
    ...report,
    status: 'failed-safe',
    blockedReason: 'unsafe-output-detected',
    redactedFailure: 'unsafe-output-redacted',
    noLeakResult: 'failed-safe',
    correlationRef: DEFAULT_CORRELATION_REF,
    configuredDependencyCount: safeDependencies.length,
    configuredDependencies: safeDependencies,
    readiness: safeReadiness,
  } satisfies RealSmokeGateReport);
}

export function createRealSmokeGateInputFromEnvironment(environment: RealSmokeGateEnvironmentInput): RealSmokeGateInput {
  const config: TransportConfigInput = {
    profile: environment[REAL_SMOKE_ENVIRONMENT_KEYS.profile],
    providers: {
      telegram: {
        mode: 'real',
        credentialRef: environment[REAL_SMOKE_ENVIRONMENT_KEYS.telegramCredentialRef],
        transportRef: environment[REAL_SMOKE_ENVIRONMENT_KEYS.telegramTransportRef],
        sourceClass: 'env',
      },
      openclaw: {
        mode: 'real',
        credentialRef: environment[REAL_SMOKE_ENVIRONMENT_KEYS.openClawCredentialRef],
        transportRef: environment[REAL_SMOKE_ENVIRONMENT_KEYS.openClawTransportRef],
        sourceClass: 'env',
      },
    },
  };

  return Object.freeze({
    enabled: environment[REAL_SMOKE_ENVIRONMENT_KEYS.enabled],
    profile: environment[REAL_SMOKE_ENVIRONMENT_KEYS.profile],
    allowNetwork: environment[REAL_SMOKE_ENVIRONMENT_KEYS.allowNetwork],
    operatorAcknowledged: environment[REAL_SMOKE_ENVIRONMENT_KEYS.operatorAcknowledged],
    operationClass: environment[REAL_SMOKE_ENVIRONMENT_KEYS.operationClass],
    cleanupPolicy: environment[REAL_SMOKE_ENVIRONMENT_KEYS.cleanupPolicy],
    correlationRef: environment[REAL_SMOKE_ENVIRONMENT_KEYS.correlationRef],
    providerPortStatus: 'missing',
    transportPortStatus: 'missing',
    config,
  } satisfies RealSmokeGateInput);
}

export function evaluateRealSmokeGate(input: RealSmokeGateInput = Object.freeze({})): RealSmokeGateReport {
  const config = parseTransportConfig(input.config ?? { profile: input.profile });
  const operationClass = normalizeOneOf(input.operationClass, REAL_SMOKE_OPERATION_CLASSES, 'ephemeral-write');
  const cleanupPolicy = normalizeOneOf(input.cleanupPolicy, REAL_SMOKE_CLEANUP_POLICIES, 'not-applicable');
  const correlationRef = safeCorrelationRef(input.correlationRef);
  const providerPortStatus = normalizeOneOf(
    input.providerPortStatus ?? input.transportPortStatus,
    REAL_SMOKE_PORT_STATUSES,
    'missing',
  );
  const providerAckResult = normalizeAttemptProviderAck(input.attempt);
  const businessResult = normalizeAttemptBusinessResult(input.attempt);
  const inputAttemptReport = attemptReport(input.attempt);
  const unsafeAttemptOutput = hasUnsafeAttemptOutput(input.attempt?.redactedFailureSummary);
  const base = {
    operationClass,
    cleanupPolicy,
    correlationRef,
    providerAckResult,
    businessResult,
    providerPortStatus,
    attemptReport: inputAttemptReport,
    redactedFailure: 'none' as RealSmokeRedactedFailure,
    readiness: config.readiness,
  } as const;

  if (!gateEnabled(input.enabled)) {
    return makeReport({
      ...base,
      status: 'skipped',
      blockedReason: 'not-enabled',
    });
  }

  if (input.profile !== 'real-smoke' || config.descriptor.profile !== 'real-smoke') {
    return makeReport({
      ...base,
      status: 'blocked-missing-profile',
      blockedReason: 'profile-not-real-smoke',
    });
  }

  if (!gateEnabled(input.allowNetwork)) {
    return makeReport({
      ...base,
      status: 'blocked-network-gate-closed',
      blockedReason: 'network-gate-not-enabled',
    });
  }

  if (!gateEnabled(input.operatorAcknowledged)) {
    return makeReport({
      ...base,
      status: 'blocked-operator-ack-missing',
      blockedReason: 'operator-ack-missing',
    });
  }

  if (operationClass === 'destructive' || operationClass === 'long-running' || operationClass === 'sensitive-output') {
    return makeReport({
      ...base,
      status: 'blocked-unsafe-operation-class',
      blockedReason: 'unsafe-operation-class',
    });
  }

  const dependencies = configuredDependencies(config.readiness);
  if (hasMissingTransportRef(dependencies)) {
    return makeReport({
      ...base,
      status: 'blocked-missing-safe-test-ref',
      blockedReason: 'missing-safe-test-ref',
    });
  }

  if (config.descriptor.status === 'blocked-by-secret') {
    return makeReport({
      ...base,
      status: 'blocked-missing-secret',
      blockedReason: 'missing-or-invalid-credential-ref',
    });
  }

  if (providerPortStatus === 'missing') {
    return makeReport({
      ...base,
      status: 'blocked-missing-port',
      blockedReason: 'provider-port-not-injected',
    });
  }

  const status = attemptStatus(providerAckResult, businessResult, inputAttemptReport, unsafeAttemptOutput);
  return makeReport({
    ...base,
    status: status.status,
    blockedReason: status.blockedReason,
    redactedFailure: status.redactedFailure,
  });
}

function protectedEnvMarker(): string {
  return String.fromCharCode(112, 114, 111, 99, 101, 115, 115, 46, 101, 110, 118);
}

function protectedProviderObjectMarker(): string {
  return String.fromCharCode(112, 114, 111, 118, 105, 100, 101, 114, 67, 108, 105, 101, 110, 116, 79, 98, 106, 101, 99, 116);
}

export function isSafeRealSmokeGateReportJson(value: unknown): boolean {
  if (!isSafeTransportConfigJson(value)) {
    return false;
  }

  const encoded = JSON.stringify(value);
  return (
    typeof encoded === 'string' &&
    !encoded.includes(protectedEnvMarker()) &&
    !encoded.includes(protectedProviderObjectMarker()) &&
    !hasUnsafeRealSmokeOutputText(encoded)
  );
}
