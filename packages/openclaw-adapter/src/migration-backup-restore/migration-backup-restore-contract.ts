export type MigrationBackupRestoreJsonPrimitive = string | number | boolean | null;

export type MigrationBackupRestoreJsonValue =
  | MigrationBackupRestoreJsonPrimitive
  | readonly MigrationBackupRestoreJsonValue[]
  | { readonly [key: string]: MigrationBackupRestoreJsonValue };

export type MigrationBackupRestoreDescriptorRepresentation = 'source-contract-descriptor-only';
export type MigrationBackupRestorePublicProjectionKind = 'redacted-json-safe';
export type MigrationBackupRestoreAdapterReadiness = 'adapter-ready-for-real-system-integration';
export type MigrationBackupRestoreExplicitGatePolicy = 'under-explicit-gates';
export type MigrationBackupRestoreProductionReadiness = 'not-production-ready';
export type MigrationBackupRestoreReadinessClaim = 'not-claimed';

export type MigrationBackupRestoreSafeRef = `${string}:${string}`;
export type MigrationBackupRestoreDescriptorRef = `migration-backup-restore-descriptor:${string}`;
export type MigrationSchemaSummaryRef = `schema-summary:${string}`;
export type MigrationDescriptorRef = `migration-descriptor:${string}`;
export type BackupDescriptorRef = `backup-descriptor:${string}`;
export type RestoreDescriptorRef = `restore-descriptor:${string}`;
export type RecoveryDescriptorRef = `recovery-descriptor:${string}`;
export type ReplayEligibilityRef = `replay-eligibility:${string}`;
export type ExternalReferenceRef = `external-reference:${string}`;
export type DescriptorEvidenceRef = `descriptor-evidence:${string}`;
export type DeploymentRef = `deployment:${string}`;
export type VersionRef = `version:${string}`;
export type RedactionPolicyRef = `redaction-policy:${string}`;
export type OperatorRef = `operator:${string}`;

export type MigrationBackupRestoreDescriptorKind =
  | 'schema-version-summary'
  | 'migration-descriptor'
  | 'backup-descriptor'
  | 'restore-descriptor'
  | 'recovery-descriptor'
  | 'replay-eligibility-descriptor'
  | 'external-reference-descriptor';

export type SchemaCompatibilityClass =
  | 'compatible'
  | 'migration-required'
  | 'unsupported-version'
  | 'unknown';

export type MigrationState =
  | 'not-configured'
  | 'up-to-date'
  | 'migration-required'
  | 'migration-in-progress'
  | 'migration-failed'
  | 'rollback-required'
  | 'unsupported-version'
  | 'unknown';

export type StartupDisposition = 'may-start' | 'degraded' | 'blocked' | 'not-applicable' | 'unknown';

export type MigrationGroup =
  | 'core-facing-store'
  | 'adapter-owned-store'
  | 'runtime-capability-store'
  | 'deployment-orchestration'
  | 'unknown';

export type MigrationIdempotencyPosture =
  | 'idempotent'
  | 'operator-reviewed-non-idempotent'
  | 'not-applicable'
  | 'unknown';

export type StoreGroup =
  | 'core-facing-records'
  | 'adapter-topic-bindings'
  | 'adapter-idempotency-records'
  | 'provider-event-receipt-records'
  | 'callback-replay-records'
  | 'delivery-attempt-records'
  | 'external-message-reference-records'
  | 'runtime-capability-records'
  | 'migration-metadata'
  | 'safe-readiness-metadata';

export type BackupStatus =
  | 'not-configured'
  | 'not-created'
  | 'available'
  | 'verification-required'
  | 'degraded'
  | 'failed-safe'
  | 'unknown';

export type BackupIntegrityStatus =
  | 'not-checked'
  | 'operator-summary-only'
  | 'integrity-evidence-present'
  | 'degraded'
  | 'failed-safe'
  | 'unknown';

export type RestoreStatus =
  | 'not-attempted'
  | 'planned-inspect-only'
  | 'needs-reconcile'
  | 'degraded'
  | 'blocked'
  | 'failed-safe'
  | 'unknown';

export type RecoveryStatus =
  | 'not-started'
  | 'inspect-only'
  | 'operator-review-required'
  | 'blocked'
  | 'degraded'
  | 'failed-safe'
  | 'unknown';

export type RecoveryProfile =
  | 'local-dev-reset'
  | 'local-dev-restore'
  | 'staging-restore-dry-run'
  | 'production-restore-safe'
  | 'production-restore-with-operator-approval';

export type ExternalReferenceValidityClass =
  | 'assumed-valid'
  | 'needs-reconcile'
  | 'stale'
  | 'invalid'
  | 'unknown';

export type ExternalReferenceKind =
  | 'external-message-reference'
  | 'topic-reference'
  | 'runtime-operation-reference'
  | 'automation-job-reference'
  | 'unknown';

export type OperatorActionRequirement =
  | 'none'
  | 'operator-review-required'
  | 'dry-run-reconciliation-required'
  | 'approval-required-before-external-effects'
  | 'manual-remediation-required'
  | 'blocked-by-explicit-gate';

export type ReplayEligibilityClass =
  | 'not-replayable'
  | 'inspect-only'
  | 'eligible-after-dry-run-reconciliation'
  | 'eligible-after-operator-approval'
  | 'unknown';

export type ExternalEffectReplayGate =
  | 'not-authorized'
  | 'inspect-only'
  | 'later-approval-required'
  | 'dry-run-reconciliation-required'
  | 'later-approval-and-dry-run-reconciliation-required';

export type SafeReasonCode =
  | 'none'
  | 'not-configured'
  | 'unknown-version'
  | 'unsupported-version'
  | 'migration-required'
  | 'migration-in-progress'
  | 'migration-failed'
  | 'rollback-required'
  | 'backup-not-created'
  | 'backup-integrity-unknown'
  | 'restore-not-attempted'
  | 'restore-target-needs-review'
  | 'external-reference-unknown'
  | 'external-reference-needs-reconcile'
  | 'external-effect-not-authorized'
  | 'operator-review-required'
  | 'dry-run-reconciliation-required'
  | 'provider-acknowledgement-only'
  | 'business-success-missing'
  | 'ready-to-attempt-not-pass'
  | 'descriptor-only-not-readiness'
  | 'production-storage-not-claimed'
  | 'production-not-claimed'
  | 'replay-not-authorized'
  | 'unsafe-output-redacted'
  | 'blocked-by-explicit-gate'
  | 'failed-safe';

export type DescriptorEvidenceClass =
  | 'static-contract'
  | 'descriptor-only'
  | 'redacted-operator-summary'
  | 'fake-inert-summary'
  | 'manual-review-note'
  | 'not-run'
  | 'inspect-only';

export type CountStatus = 'exact' | 'bounded-estimate' | 'not-counted' | 'unknown';

export type SafeDescriptorSummaryStatus =
  | MigrationState
  | BackupStatus
  | RestoreStatus
  | RecoveryStatus
  | ReplayEligibilityClass
  | ExternalReferenceValidityClass
  | SchemaCompatibilityClass;

export interface DescriptorEvidence {
  readonly evidenceRef: DescriptorEvidenceRef;
  readonly evidenceClass: DescriptorEvidenceClass;
  readonly reasonCodes?: readonly SafeReasonCode[];
  readonly redacted: true;
  readonly jsonSafe: true;
}

export interface SafeDescriptorSummary {
  readonly summaryKind: 'redacted-summary';
  readonly status: SafeDescriptorSummaryStatus;
  readonly reasonCodes?: readonly SafeReasonCode[];
  readonly safeRefs?: readonly MigrationBackupRestoreSafeRef[];
  readonly detailCode?: string;
  readonly redacted: true;
  readonly jsonSafe: true;
}

/** Descriptor existence is not migration, backup, restore, recovery, storage, or production readiness. */
export interface ReadinessNonClaims {
  readonly descriptorExistenceIsMigrationReadiness: false;
  readonly descriptorExistenceIsBackupReadiness: false;
  readonly descriptorExistenceIsRestoreReadiness: false;
  readonly descriptorExistenceIsRecoveryReadiness: false;
  readonly descriptorExistenceIsProductionStorageReadiness: false;
  readonly descriptorExistenceIsProductionReadiness: false;
  readonly migrationReadiness: MigrationBackupRestoreReadinessClaim;
  readonly backupReadiness: MigrationBackupRestoreReadinessClaim;
  readonly restoreReadiness: MigrationBackupRestoreReadinessClaim;
  readonly recoveryReadiness: MigrationBackupRestoreReadinessClaim;
  readonly productionStorageReadiness: MigrationBackupRestoreReadinessClaim;
  readonly productionReadiness: MigrationBackupRestoreReadinessClaim;
}

/** Restore is not replay, restore does not authorize external effects, and later replay needs explicit gates. */
export interface SafetyInvariants {
  readonly restoreIsReplay: false;
  readonly restoreAuthorizesExternalEffects: false;
  readonly replayOfExternalEffectsRequiresLaterGate: true;
  /** Provider acknowledgement is not business success. */
  readonly providerAcknowledgementImpliesBusinessSuccess: false;
  /** Ready-to-attempt is not pass. */
  readonly readyToAttemptIsPass: false;
  readonly descriptorOnly: true;
  readonly publicProjection: MigrationBackupRestorePublicProjectionKind;
  readonly representation: MigrationBackupRestoreDescriptorRepresentation;
}

export interface DescriptorBase {
  readonly descriptorRef: MigrationBackupRestoreDescriptorRef;
  readonly descriptorKind: MigrationBackupRestoreDescriptorKind;
  readonly descriptorVersion: string;
  readonly adapterReadiness: MigrationBackupRestoreAdapterReadiness;
  readonly explicitGatePolicy: MigrationBackupRestoreExplicitGatePolicy;
  readonly productionReadiness: MigrationBackupRestoreProductionReadiness;
  readonly publicProjection: MigrationBackupRestorePublicProjectionKind;
  readonly representation: MigrationBackupRestoreDescriptorRepresentation;
  readonly reasonCodes?: readonly SafeReasonCode[];
  readonly evidence?: readonly DescriptorEvidence[];
  readonly summary?: SafeDescriptorSummary;
}

export interface SchemaVersionSummary extends DescriptorBase {
  readonly descriptorKind: 'schema-version-summary';
  readonly schemaSummaryRef: MigrationSchemaSummaryRef;
  readonly schemaGroup: MigrationGroup;
  readonly currentVersionRef?: VersionRef;
  readonly targetVersionRef?: VersionRef;
  readonly compatibility: SchemaCompatibilityClass;
  readonly migrationState: MigrationState;
  readonly startupDisposition: StartupDisposition;
}

export interface MigrationDescriptor extends DescriptorBase {
  readonly descriptorKind: 'migration-descriptor';
  readonly migrationRef: MigrationDescriptorRef;
  readonly migrationGroup: MigrationGroup;
  readonly fromSchema?: SchemaVersionSummary;
  readonly toSchema?: SchemaVersionSummary;
  readonly migrationState: MigrationState;
  readonly startupDisposition: StartupDisposition;
  readonly idempotencyPosture: MigrationIdempotencyPosture;
  readonly operatorActionRequirement: OperatorActionRequirement;
  readonly readinessNonClaims: ReadinessNonClaims;
  readonly safetyInvariants: SafetyInvariants;
}

export interface SafeRecordCount {
  readonly storeGroup: StoreGroup;
  readonly count: number;
  readonly countStatus: CountStatus;
}

export interface BackupDescriptor extends DescriptorBase {
  readonly descriptorKind: 'backup-descriptor';
  readonly backupRef: BackupDescriptorRef;
  readonly backupStatus: BackupStatus;
  readonly sourceDeploymentRef?: DeploymentRef;
  readonly sourceVersionRef?: VersionRef;
  readonly schemaVersionSummary?: SchemaVersionSummary;
  readonly storeGroupsIncluded: readonly StoreGroup[];
  readonly storeGroupsExcluded?: readonly StoreGroup[];
  readonly safeRecordCounts?: readonly SafeRecordCount[];
  readonly redactionPolicyRef?: RedactionPolicyRef;
  readonly sensitiveMaterialExcluded: true;
  readonly integrityStatus: BackupIntegrityStatus;
  readonly operatorActionRequirement: OperatorActionRequirement;
  readonly readinessNonClaims: ReadinessNonClaims;
  readonly safetyInvariants: SafetyInvariants;
}

export interface ExternalReferenceDescriptor extends DescriptorBase {
  readonly descriptorKind: 'external-reference-descriptor';
  readonly externalReferenceRef: ExternalReferenceRef;
  readonly externalReferenceKind: ExternalReferenceKind;
  readonly validityClass: ExternalReferenceValidityClass;
  readonly operatorActionRequirement: OperatorActionRequirement;
  readonly mayAuthorizeDestructiveOperation: false;
  readonly mayAuthorizeExternalEffects: false;
}

/** Replay eligibility is descriptive only; external effects require later approval or dry-run reconciliation. */
export interface ReplayEligibilityDescriptor extends DescriptorBase {
  readonly descriptorKind: 'replay-eligibility-descriptor';
  readonly replayEligibilityRef: ReplayEligibilityRef;
  readonly replayEligibility: ReplayEligibilityClass;
  readonly externalEffectReplayGate: ExternalEffectReplayGate;
  readonly replayAuthorizedByRestore: false;
  /** Provider acknowledgement is not business success. */
  readonly providerAcknowledgementImpliesBusinessSuccess: false;
  /** Ready-to-attempt is not pass. */
  readonly readyToAttemptIsPass: false;
  readonly reasonCodes?: readonly SafeReasonCode[];
}

export interface RestoreDescriptor extends DescriptorBase {
  readonly descriptorKind: 'restore-descriptor';
  readonly restoreRef: RestoreDescriptorRef;
  readonly restoreStatus: RestoreStatus;
  readonly targetDeploymentRef?: DeploymentRef;
  readonly backupRef?: BackupDescriptorRef;
  readonly schemaVersionSummary?: SchemaVersionSummary;
  readonly storeGroupsIncluded: readonly StoreGroup[];
  readonly idempotencyPreserved: boolean;
  readonly externalReferences: readonly ExternalReferenceDescriptor[];
  readonly replayEligibility: ReplayEligibilityDescriptor;
  readonly operatorActionRequirement: OperatorActionRequirement;
  readonly readinessNonClaims: ReadinessNonClaims;
  readonly safetyInvariants: SafetyInvariants;
  readonly restoreIsReplay: false;
  readonly restoreAuthorizesExternalEffects: false;
}

export interface RecoveryDescriptor extends DescriptorBase {
  readonly descriptorKind: 'recovery-descriptor';
  readonly recoveryRef: RecoveryDescriptorRef;
  readonly recoveryStatus: RecoveryStatus;
  readonly recoveryProfile: RecoveryProfile;
  readonly migrationDescriptor?: MigrationDescriptor;
  readonly backupDescriptor?: BackupDescriptor;
  readonly restoreDescriptor?: RestoreDescriptor;
  readonly replayEligibility: ReplayEligibilityDescriptor;
  readonly operatorActionRequirement: OperatorActionRequirement;
  readonly readinessNonClaims: ReadinessNonClaims;
  readonly safetyInvariants: SafetyInvariants;
}

export type MigrationBackupRestoreDescriptor =
  | SchemaVersionSummary
  | MigrationDescriptor
  | BackupDescriptor
  | RestoreDescriptor
  | RecoveryDescriptor
  | ReplayEligibilityDescriptor
  | ExternalReferenceDescriptor;

export type MigrationBackupRestorePublicDescriptor = MigrationBackupRestoreDescriptor & {
  readonly publicProjection: 'redacted-json-safe';
  readonly representation: 'source-contract-descriptor-only';
  readonly productionReadiness: 'not-production-ready';
};
