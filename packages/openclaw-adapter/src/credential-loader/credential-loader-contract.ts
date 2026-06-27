export const CREDENTIAL_LOADER_CREDENTIAL_KINDS = [
  'provider-credential',
  'transport-credential',
  'runtime-configuration',
  'operator-gate',
  'test-fixture-credential',
  'generic-configuration',
  'unknown',
] as const;

export const CREDENTIAL_LOADER_SOURCE_CLASSES = [
  'injected-port',
  'operator-provided',
  'deployment-profile',
  'managed-vault',
  'test-fixture',
  'redacted-only',
  'unavailable',
  'unknown',
] as const;

export const CREDENTIAL_LOADER_READINESS_STATUSES = [
  'configured-redacted',
  'missing',
  'invalid',
  'unavailable',
  'blocked',
  'disabled',
  'redacted-only',
  'dry-run-ready',
] as const;

export const CREDENTIAL_LOADER_RESOLUTION_STATUSES = [
  'configured-redacted',
  'missing',
  'invalid',
  'unavailable',
  'blocked',
  'disabled',
  'redacted-only',
  'not-attempted',
] as const;

export const CREDENTIAL_LOADER_REDACTION_STATES = [
  'redacted',
  'not-present',
  'not-applicable',
] as const;

export const CREDENTIAL_LOADER_ISSUE_SEVERITIES = [
  'info',
  'blocked',
  'failed-safe',
] as const;

export const CREDENTIAL_LOADER_ISSUE_CODES = [
  'missing-credential-ref',
  'missing-requirement',
  'missing-operator-gate',
  'invalid-descriptor',
  'loader-unavailable',
  'blocked-by-policy',
  'disabled-by-operator',
  'redacted-only',
  'not-attempted',
  'not-implemented',
] as const;

export const CREDENTIAL_LOADER_PUBLIC_OUTPUT_CLASSES = [
  'redacted-descriptor-only',
  'readiness-only',
  'no-public-value',
] as const;

export const CREDENTIAL_LOADER_READINESS_CLAIMS = [
  'credential-loader-contract-only',
  'credential-loader-not-production-ready',
  'redacted-public-descriptor-only',
] as const;

export type CredentialLoaderCredentialKind = (typeof CREDENTIAL_LOADER_CREDENTIAL_KINDS)[number];
export type CredentialLoaderSourceClass = (typeof CREDENTIAL_LOADER_SOURCE_CLASSES)[number];
export type CredentialLoaderReadinessStatus = (typeof CREDENTIAL_LOADER_READINESS_STATUSES)[number];
export type CredentialLoaderResolutionStatus = (typeof CREDENTIAL_LOADER_RESOLUTION_STATUSES)[number];
export type CredentialLoaderRedactionState = (typeof CREDENTIAL_LOADER_REDACTION_STATES)[number];
export type CredentialLoaderIssueSeverity = (typeof CREDENTIAL_LOADER_ISSUE_SEVERITIES)[number];
export type CredentialLoaderIssueCode = (typeof CREDENTIAL_LOADER_ISSUE_CODES)[number];
export type CredentialLoaderPublicOutputClass = (typeof CREDENTIAL_LOADER_PUBLIC_OUTPUT_CLASSES)[number];
export type CredentialLoaderReadinessClaim = (typeof CREDENTIAL_LOADER_READINESS_CLAIMS)[number];

export type CredentialLoaderCredentialRef = `credential:${string}`;
export type CredentialLoaderRequirementRef = `credential-requirement:${string}`;
export type CredentialLoaderConfigurationRef = `configuration:${string}`;
export type CredentialLoaderProfileRef = `credential-profile:${string}`;
export type CredentialLoaderSafeText = string;
export type CredentialLoaderSafeIdentifier = string;

export interface CredentialLoaderDiagnostic {
  readonly issueCode: CredentialLoaderIssueCode;
  readonly severity: CredentialLoaderIssueSeverity;
  readonly safeMessage?: CredentialLoaderSafeText;
  readonly safeHint?: CredentialLoaderSafeText;
  readonly blocking: boolean;
}

export interface CredentialLoaderIssueSummary {
  readonly total: number;
  readonly blocking: number;
  readonly missing: number;
  readonly invalid: number;
  readonly unavailable: number;
  readonly redactedOnly: number;
}

export interface CredentialLoaderRequirement {
  readonly requirementRef: CredentialLoaderRequirementRef;
  readonly credentialRef: CredentialLoaderCredentialRef;
  readonly credentialKind: CredentialLoaderCredentialKind;
  readonly sourceClass: CredentialLoaderSourceClass;
  readonly required: boolean;
  readonly redactedLabel?: CredentialLoaderSafeText;
  readonly safePurpose?: CredentialLoaderSafeText;
  readonly configurationRefs?: readonly CredentialLoaderConfigurationRef[];
  readonly profileRef?: CredentialLoaderProfileRef;
}

export interface RedactedCredentialDescriptor {
  readonly descriptorKind: 'redacted-credential-descriptor';
  readonly credentialRef: CredentialLoaderCredentialRef;
  readonly credentialKind: CredentialLoaderCredentialKind;
  readonly sourceClass: CredentialLoaderSourceClass;
  readonly readinessStatus: CredentialLoaderReadinessStatus;
  readonly redactionState: CredentialLoaderRedactionState;
  readonly configuredRedacted: boolean;
  readonly required: boolean;
  readonly redactedLabel?: CredentialLoaderSafeText;
  readonly safeReason?: CredentialLoaderSafeText;
  readonly safeDiagnostics?: readonly CredentialLoaderDiagnostic[];
}

export interface CredentialLoaderRequirementDescriptor {
  readonly descriptorKind: 'credential-requirement-descriptor';
  readonly requirement: CredentialLoaderRequirement;
  readonly credentialDescriptor: RedactedCredentialDescriptor;
  readonly readinessStatus: CredentialLoaderReadinessStatus;
  readonly blocking: boolean;
  readonly safeReason?: CredentialLoaderSafeText;
}

export interface CredentialLoaderReadinessResult {
  readonly resultKind: 'credential-loader-readiness';
  readonly readinessStatus: CredentialLoaderReadinessStatus;
  readonly readinessClaim: CredentialLoaderReadinessClaim;
  readonly publicOutputClass: CredentialLoaderPublicOutputClass;
  readonly credentialDescriptor: RedactedCredentialDescriptor;
  readonly requirementDescriptors: readonly CredentialLoaderRequirementDescriptor[];
  readonly issueSummary: CredentialLoaderIssueSummary;
  readonly issues: readonly CredentialLoaderDiagnostic[];
}

export interface CredentialLoaderResolutionResult {
  readonly resultKind: 'credential-loader-resolution';
  readonly resolutionStatus: CredentialLoaderResolutionStatus;
  readonly readinessStatus: CredentialLoaderReadinessStatus;
  readonly readinessClaim: CredentialLoaderReadinessClaim;
  readonly publicOutputClass: CredentialLoaderPublicOutputClass;
  readonly credentialDescriptor: RedactedCredentialDescriptor;
  readonly issueSummary: CredentialLoaderIssueSummary;
  readonly issues: readonly CredentialLoaderDiagnostic[];
}
