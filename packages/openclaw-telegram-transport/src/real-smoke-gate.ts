import { isSafeTransportConfigJson, parseTransportConfig } from './config.js';

import type { TransportConfigInput, TransportConfigReadinessProjection } from './config.js';

export const REAL_SMOKE_GATE_STATUSES = Object.freeze([
  'skipped',
  'blocked-by-profile',
  'blocked-by-secret',
  'blocked-by-missing-port',
  'ready-to-run',
  'passed',
  'failed-safe',
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

export type RealSmokeBlockedReason =
  | 'none'
  | 'not-enabled'
  | 'profile-not-real-smoke'
  | 'network-gate-not-enabled'
  | 'operator-ack-missing'
  | 'unsafe-operation-class'
  | 'missing-safe-test-ref'
  | 'missing-or-invalid-secret-ref'
  | 'transport-port-not-implemented'
  | 'provider-attempt-failed-safe'
  | 'business-attempt-failed-safe'
  | 'unsafe-output-detected';

export interface RealSmokeGateEnvironmentInput {
  readonly [key: string]: unknown;
}

export interface RealSmokeAttemptInput {
  readonly providerAckResult?: unknown;
  readonly businessResult?: unknown;
}

export interface RealSmokeGateInput {
  readonly enabled?: unknown;
  readonly profile?: unknown;
  readonly allowNetwork?: unknown;
  readonly operatorAcknowledged?: unknown;
  readonly operationClass?: unknown;
  readonly cleanupPolicy?: unknown;
  readonly correlationRef?: unknown;
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
  readonly descriptorVersion: 'w14f';
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
  readonly transportPortStatus: RealSmokePortStatus;
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
const DEFAULT_CORRELATION_REF = 'corr:w14f-real-smoke-gate';

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
  if (!SAFE_REF_PATTERN.test(normalized)) {
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
  return dependencies.some((dependency) => dependency.transportRef === `transport:${dependency.provider}`);
}

function normalizeAttemptProviderAck(attempt: RealSmokeAttemptInput | undefined): RealSmokeProviderAckResult {
  return normalizeOneOf(attempt?.providerAckResult, REAL_SMOKE_PROVIDER_ACK_RESULTS, 'not-attempted');
}

function normalizeAttemptBusinessResult(attempt: RealSmokeAttemptInput | undefined): RealSmokeBusinessResult {
  return normalizeOneOf(attempt?.businessResult, REAL_SMOKE_BUSINESS_RESULTS, 'not-attempted');
}

function attemptStatus(
  providerAckResult: RealSmokeProviderAckResult,
  businessResult: RealSmokeBusinessResult,
): Pick<RealSmokeGateReport, 'status' | 'blockedReason'> {
  if (providerAckResult === 'not-attempted' && businessResult === 'not-attempted') {
    return { status: 'ready-to-run', blockedReason: 'none' };
  }

  if (providerAckResult !== 'provider-acknowledged') {
    return { status: 'failed-safe', blockedReason: 'provider-attempt-failed-safe' };
  }

  if (businessResult !== 'business-succeeded') {
    return { status: 'failed-safe', blockedReason: 'business-attempt-failed-safe' };
  }

  return { status: 'passed', blockedReason: 'none' };
}

function makeReport(input: {
  readonly status: RealSmokeGateStatus;
  readonly blockedReason: RealSmokeBlockedReason;
  readonly operationClass: RealSmokeOperationClass;
  readonly cleanupPolicy: RealSmokeCleanupPolicy;
  readonly correlationRef: string;
  readonly providerAckResult: RealSmokeProviderAckResult;
  readonly businessResult: RealSmokeBusinessResult;
  readonly transportPortStatus: RealSmokePortStatus;
  readonly readiness: TransportConfigReadinessProjection;
}): RealSmokeGateReport {
  const dependencies = configuredDependencies(input.readiness);
  const report = Object.freeze({
    descriptorKind: 'openclaw-telegram-real-smoke-gate',
    descriptorVersion: 'w14f',
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
    transportPortStatus: input.transportPortStatus,
    noLeakResult: 'passed',
    remoteAttempt: 'not-attempted',
    willCallRemote: false,
    effects: 'none',
    jsonSerializable: true,
    readiness: input.readiness,
  } satisfies RealSmokeGateReport);

  if (isSafeRealSmokeGateReportJson(report)) {
    return report;
  }

  return Object.freeze({
    ...report,
    status: 'failed-safe',
    blockedReason: 'unsafe-output-detected',
    noLeakResult: 'failed-safe',
    correlationRef: DEFAULT_CORRELATION_REF,
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
    transportPortStatus: 'missing',
    config,
  } satisfies RealSmokeGateInput);
}

export function evaluateRealSmokeGate(input: RealSmokeGateInput = Object.freeze({})): RealSmokeGateReport {
  const config = parseTransportConfig(input.config ?? { profile: input.profile });
  const operationClass = normalizeOneOf(input.operationClass, REAL_SMOKE_OPERATION_CLASSES, 'ephemeral-write');
  const cleanupPolicy = normalizeOneOf(input.cleanupPolicy, REAL_SMOKE_CLEANUP_POLICIES, 'not-applicable');
  const correlationRef = safeCorrelationRef(input.correlationRef);
  const transportPortStatus = normalizeOneOf(input.transportPortStatus, REAL_SMOKE_PORT_STATUSES, 'missing');
  const providerAckResult = normalizeAttemptProviderAck(input.attempt);
  const businessResult = normalizeAttemptBusinessResult(input.attempt);
  const base = {
    operationClass,
    cleanupPolicy,
    correlationRef,
    providerAckResult,
    businessResult,
    transportPortStatus,
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
      status: 'blocked-by-profile',
      blockedReason: 'profile-not-real-smoke',
    });
  }

  if (!gateEnabled(input.allowNetwork)) {
    return makeReport({
      ...base,
      status: 'blocked-by-profile',
      blockedReason: 'network-gate-not-enabled',
    });
  }

  if (!gateEnabled(input.operatorAcknowledged)) {
    return makeReport({
      ...base,
      status: 'blocked-by-profile',
      blockedReason: 'operator-ack-missing',
    });
  }

  if (operationClass === 'destructive' || operationClass === 'long-running' || operationClass === 'sensitive-output') {
    return makeReport({
      ...base,
      status: 'blocked-by-profile',
      blockedReason: 'unsafe-operation-class',
    });
  }

  const dependencies = configuredDependencies(config.readiness);
  if (hasMissingTransportRef(dependencies)) {
    return makeReport({
      ...base,
      status: 'blocked-by-profile',
      blockedReason: 'missing-safe-test-ref',
    });
  }

  if (config.descriptor.status === 'blocked-by-secret') {
    return makeReport({
      ...base,
      status: 'blocked-by-secret',
      blockedReason: 'missing-or-invalid-secret-ref',
    });
  }

  if (transportPortStatus === 'missing') {
    return makeReport({
      ...base,
      status: 'blocked-by-missing-port',
      blockedReason: 'transport-port-not-implemented',
    });
  }

  const status = attemptStatus(providerAckResult, businessResult);
  return makeReport({
    ...base,
    status: status.status,
    blockedReason: status.blockedReason,
  });
}

export function isSafeRealSmokeGateReportJson(value: unknown): boolean {
  if (!isSafeTransportConfigJson(value)) {
    return false;
  }

  const encoded = JSON.stringify(value);
  return typeof encoded === 'string' && !encoded.includes('process.env') && !encoded.includes('providerClientObject');
}
