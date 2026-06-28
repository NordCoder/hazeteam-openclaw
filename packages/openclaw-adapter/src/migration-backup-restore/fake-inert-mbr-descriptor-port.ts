import type {
  BackupDescriptor,
  BackupDescriptorRef,
  BackupIntegrityStatus,
  BackupStatus,
  CountStatus,
  DeploymentRef,
  DescriptorBase,
  DescriptorEvidence,
  DescriptorEvidenceClass,
  DescriptorEvidenceRef,
  ExternalEffectReplayGate,
  ExternalReferenceDescriptor,
  ExternalReferenceKind,
  ExternalReferenceRef,
  ExternalReferenceValidityClass,
  MigrationBackupRestoreDescriptorKind,
  MigrationBackupRestoreDescriptorRef,
  MigrationBackupRestorePublicDescriptor,
  MigrationBackupRestoreSafeRef,
  MigrationDescriptor,
  MigrationDescriptorRef,
  MigrationGroup,
  MigrationIdempotencyPosture,
  MigrationSchemaSummaryRef,
  MigrationState,
  OperatorActionRequirement,
  ReadinessNonClaims,
  RecoveryDescriptor,
  RecoveryDescriptorRef,
  RecoveryProfile,
  RecoveryStatus,
  RedactionPolicyRef,
  ReplayEligibilityClass,
  ReplayEligibilityDescriptor,
  ReplayEligibilityRef,
  RestoreDescriptor,
  RestoreDescriptorRef,
  RestoreStatus,
  SafeDescriptorSummary,
  SafeDescriptorSummaryStatus,
  SafeReasonCode,
  SafeRecordCount,
  SafetyInvariants,
  SchemaCompatibilityClass,
  SchemaVersionSummary,
  StartupDisposition,
  StoreGroup,
  VersionRef,
} from './migration-backup-restore-contract.js';

export interface FakeInertMbrEvidenceInput {
  readonly evidenceId: string;
  readonly evidenceClass?: DescriptorEvidenceClass;
  readonly reasonCodes?: readonly SafeReasonCode[];
}

export interface FakeInertMbrDescriptorInputBase {
  readonly descriptorId: string;
  readonly reasonCodes?: readonly SafeReasonCode[];
  readonly evidence?: readonly FakeInertMbrEvidenceInput[];
  readonly detailCode?: string;
}

export interface FakeInertMbrSchemaVersionInput extends FakeInertMbrDescriptorInputBase {
  readonly schemaSummaryId?: string;
  readonly schemaGroup: MigrationGroup;
  readonly currentVersionId?: string;
  readonly targetVersionId?: string;
  readonly compatibility: SchemaCompatibilityClass;
  readonly migrationState: MigrationState;
  readonly startupDisposition?: StartupDisposition;
}

export interface FakeInertMbrMigrationInput extends FakeInertMbrDescriptorInputBase {
  readonly migrationId?: string;
  readonly migrationGroup: MigrationGroup;
  readonly fromSchema?: SchemaVersionSummary;
  readonly toSchema?: SchemaVersionSummary;
  readonly migrationState: MigrationState;
  readonly startupDisposition?: StartupDisposition;
  readonly idempotencyPosture: MigrationIdempotencyPosture;
  readonly operatorActionRequirement?: OperatorActionRequirement;
}

export interface FakeInertMbrSafeRecordCountInput {
  readonly storeGroup: StoreGroup;
  readonly count?: number;
  readonly countStatus: CountStatus;
}

export interface FakeInertMbrBackupInput extends FakeInertMbrDescriptorInputBase {
  readonly backupId?: string;
  readonly backupStatus: BackupStatus;
  readonly sourceDeploymentId?: string;
  readonly sourceVersionId?: string;
  readonly schemaVersionSummary?: SchemaVersionSummary;
  readonly storeGroupsIncluded?: readonly StoreGroup[];
  readonly storeGroupsExcluded?: readonly StoreGroup[];
  readonly safeRecordCounts?: readonly FakeInertMbrSafeRecordCountInput[];
  readonly redactionPolicyId?: string;
  readonly integrityStatus: BackupIntegrityStatus;
  readonly operatorActionRequirement?: OperatorActionRequirement;
}

export interface FakeInertMbrExternalReferenceInput extends FakeInertMbrDescriptorInputBase {
  readonly externalReferenceId?: string;
  readonly externalReferenceKind: ExternalReferenceKind;
  readonly validityClass: ExternalReferenceValidityClass;
  readonly operatorActionRequirement?: OperatorActionRequirement;
}

export interface FakeInertMbrReplayEligibilityInput extends FakeInertMbrDescriptorInputBase {
  readonly replayEligibilityId?: string;
  readonly replayEligibility?: ReplayEligibilityClass;
  readonly externalReferenceValidity?: ExternalReferenceValidityClass;
  readonly externalReferenceValidities?: readonly ExternalReferenceValidityClass[];
  readonly idempotencyPreserved?: boolean;
  readonly providerAcknowledged?: boolean;
  readonly businessSuccess?: boolean;
  readonly readyToAttempt?: boolean;
  readonly externalEffectReplayGate?: ExternalEffectReplayGate;
}

export interface FakeInertMbrRestoreInput extends FakeInertMbrDescriptorInputBase {
  readonly restoreId?: string;
  readonly restoreStatus?: RestoreStatus;
  readonly targetDeploymentId?: string;
  readonly backupDescriptor?: BackupDescriptor;
  readonly backupId?: string;
  readonly schemaVersionSummary?: SchemaVersionSummary;
  readonly storeGroupsIncluded?: readonly StoreGroup[];
  readonly idempotencyPreserved: boolean;
  readonly externalReferences?: readonly ExternalReferenceDescriptor[];
  readonly replayEligibility?: ReplayEligibilityDescriptor;
  readonly operatorActionRequirement?: OperatorActionRequirement;
}

export interface FakeInertMbrRecoveryInput extends FakeInertMbrDescriptorInputBase {
  readonly recoveryId?: string;
  readonly recoveryStatus?: RecoveryStatus;
  readonly recoveryProfile: RecoveryProfile;
  readonly migrationDescriptor?: MigrationDescriptor;
  readonly backupDescriptor?: BackupDescriptor;
  readonly restoreDescriptor?: RestoreDescriptor;
  readonly replayEligibility?: ReplayEligibilityDescriptor;
  readonly operatorActionRequirement?: OperatorActionRequirement;
}

export interface FakeInertMbrPublicDescriptorInput {
  readonly schemaVersions?: readonly FakeInertMbrSchemaVersionInput[];
  readonly migrations?: readonly FakeInertMbrMigrationInput[];
  readonly backups?: readonly FakeInertMbrBackupInput[];
  readonly externalReferences?: readonly FakeInertMbrExternalReferenceInput[];
  readonly replayEligibilities?: readonly FakeInertMbrReplayEligibilityInput[];
  readonly restores?: readonly FakeInertMbrRestoreInput[];
  readonly recoveries?: readonly FakeInertMbrRecoveryInput[];
}

export interface FakeInertMigrationBackupRestoreDescriptorPort {
  readonly describeSchemaVersion: (input: FakeInertMbrSchemaVersionInput) => SchemaVersionSummary;
  readonly describeMigration: (input: FakeInertMbrMigrationInput) => MigrationDescriptor;
  readonly describeBackup: (input: FakeInertMbrBackupInput) => BackupDescriptor;
  readonly describeExternalReference: (input: FakeInertMbrExternalReferenceInput) => ExternalReferenceDescriptor;
  readonly describeReplayEligibility: (input: FakeInertMbrReplayEligibilityInput) => ReplayEligibilityDescriptor;
  readonly describeRestore: (input: FakeInertMbrRestoreInput) => RestoreDescriptor;
  readonly describeRecovery: (input: FakeInertMbrRecoveryInput) => RecoveryDescriptor;
  readonly describePublicDescriptors: (
    input: FakeInertMbrPublicDescriptorInput,
  ) => readonly MigrationBackupRestorePublicDescriptor[];
}

const DESCRIPTOR_VERSION = 'w27c.fake-inert.descriptor-port.v1';
const MAX_IDENTIFIER_LENGTH = 64;
const MAX_DETAIL_CODE_LENGTH = 80;
const MAX_REASON_CODES = 14;
const MAX_EVIDENCE_ITEMS = 8;
const MAX_STORE_GROUPS = 10;
const MAX_EXTERNAL_REFERENCES = 8;
const MAX_RECORD_COUNTS = 10;
const MAX_SAFE_REFS = 12;
const MAX_SAFE_COUNT = 1_000_000_000;

const READINESS_NON_CLAIMS: ReadinessNonClaims = Object.freeze({
  descriptorExistenceIsMigrationReadiness: false,
  descriptorExistenceIsBackupReadiness: false,
  descriptorExistenceIsRestoreReadiness: false,
  descriptorExistenceIsRecoveryReadiness: false,
  descriptorExistenceIsProductionStorageReadiness: false,
  descriptorExistenceIsProductionReadiness: false,
  migrationReadiness: 'not-claimed',
  backupReadiness: 'not-claimed',
  restoreReadiness: 'not-claimed',
  recoveryReadiness: 'not-claimed',
  productionStorageReadiness: 'not-claimed',
  productionReadiness: 'not-claimed',
});

const SAFETY_INVARIANTS: SafetyInvariants = Object.freeze({
  restoreIsReplay: false,
  restoreAuthorizesExternalEffects: false,
  replayOfExternalEffectsRequiresLaterGate: true,
  providerAcknowledgementImpliesBusinessSuccess: false,
  readyToAttemptIsPass: false,
  descriptorOnly: true,
  publicProjection: 'redacted-json-safe',
  representation: 'source-contract-descriptor-only',
});

const BASE_REASON_CODES: readonly SafeReasonCode[] = Object.freeze([
  'descriptor-only-not-readiness',
  'production-storage-not-claimed',
  'production-not-claimed',
]);

export function createFakeInertMigrationBackupRestoreDescriptorPort(): FakeInertMigrationBackupRestoreDescriptorPort {
  return {
    describeSchemaVersion,
    describeMigration,
    describeBackup,
    describeExternalReference,
    describeReplayEligibility,
    describeRestore,
    describeRecovery,
    describePublicDescriptors,
  };
}

export function describeSchemaVersion(input: FakeInertMbrSchemaVersionInput): SchemaVersionSummary {
  const startupDisposition = input.startupDisposition ?? deriveStartupDisposition(input.compatibility, input.migrationState);
  const reasonCodes = reasonCodesForSchema(input.compatibility, input.migrationState, input.reasonCodes);
  const schemaSummaryRef = schemaSummaryRefFromId(input.schemaSummaryId ?? input.descriptorId);
  const descriptor: SchemaVersionSummary = {
    ...createDescriptorBase('schema-version-summary', input, input.compatibility, reasonCodes, [schemaSummaryRef]),
    schemaSummaryRef,
    schemaGroup: input.schemaGroup,
    ...(input.currentVersionId === undefined ? {} : { currentVersionRef: versionRefFromId(input.currentVersionId) }),
    ...(input.targetVersionId === undefined ? {} : { targetVersionRef: versionRefFromId(input.targetVersionId) }),
    compatibility: input.compatibility,
    migrationState: input.migrationState,
    startupDisposition,
  };

  return cloneJsonSafe(descriptor);
}

export function describeMigration(input: FakeInertMbrMigrationInput): MigrationDescriptor {
  const startupDisposition = input.startupDisposition ?? deriveStartupDispositionFromMigrationState(input.migrationState);
  const operatorActionRequirement =
    input.operatorActionRequirement ?? deriveMigrationOperatorAction(input.migrationState, startupDisposition);
  const reasonCodes = reasonCodesForMigration(
    input.migrationState,
    startupDisposition,
    operatorActionRequirement,
    input.reasonCodes,
  );
  const migrationRef = migrationRefFromId(input.migrationId ?? input.descriptorId);
  const descriptor: MigrationDescriptor = {
    ...createDescriptorBase('migration-descriptor', input, input.migrationState, reasonCodes, [migrationRef]),
    migrationRef,
    migrationGroup: input.migrationGroup,
    ...(input.fromSchema === undefined ? {} : { fromSchema: cloneJsonSafe(input.fromSchema) }),
    ...(input.toSchema === undefined ? {} : { toSchema: cloneJsonSafe(input.toSchema) }),
    migrationState: input.migrationState,
    startupDisposition,
    idempotencyPosture: input.idempotencyPosture,
    operatorActionRequirement,
    readinessNonClaims: READINESS_NON_CLAIMS,
    safetyInvariants: SAFETY_INVARIANTS,
  };

  return cloneJsonSafe(descriptor);
}

export function describeBackup(input: FakeInertMbrBackupInput): BackupDescriptor {
  const operatorActionRequirement =
    input.operatorActionRequirement ?? deriveBackupOperatorAction(input.backupStatus, input.integrityStatus);
  const reasonCodes = reasonCodesForBackup(
    input.backupStatus,
    input.integrityStatus,
    operatorActionRequirement,
    input.reasonCodes,
  );
  const backupRef = backupRefFromId(input.backupId ?? input.descriptorId);
  const descriptor: BackupDescriptor = {
    ...createDescriptorBase('backup-descriptor', input, input.backupStatus, reasonCodes, [backupRef]),
    backupRef,
    backupStatus: input.backupStatus,
    ...(input.sourceDeploymentId === undefined ? {} : { sourceDeploymentRef: deploymentRefFromId(input.sourceDeploymentId) }),
    ...(input.sourceVersionId === undefined ? {} : { sourceVersionRef: versionRefFromId(input.sourceVersionId) }),
    ...(input.schemaVersionSummary === undefined ? {} : { schemaVersionSummary: cloneJsonSafe(input.schemaVersionSummary) }),
    storeGroupsIncluded: normalizeStoreGroups(input.storeGroupsIncluded),
    ...(input.storeGroupsExcluded === undefined
      ? {}
      : { storeGroupsExcluded: normalizeStoreGroups(input.storeGroupsExcluded) }),
    ...(input.safeRecordCounts === undefined
      ? {}
      : { safeRecordCounts: normalizeSafeRecordCounts(input.safeRecordCounts) }),
    ...(input.redactionPolicyId === undefined ? {} : { redactionPolicyRef: redactionPolicyRefFromId(input.redactionPolicyId) }),
    sensitiveMaterialExcluded: true,
    integrityStatus: input.integrityStatus,
    operatorActionRequirement,
    readinessNonClaims: READINESS_NON_CLAIMS,
    safetyInvariants: SAFETY_INVARIANTS,
  };

  return cloneJsonSafe(descriptor);
}

export function describeExternalReference(input: FakeInertMbrExternalReferenceInput): ExternalReferenceDescriptor {
  const operatorActionRequirement =
    input.operatorActionRequirement ?? deriveExternalReferenceOperatorAction(input.validityClass);
  const reasonCodes = reasonCodesForExternalReference(
    input.validityClass,
    operatorActionRequirement,
    input.reasonCodes,
  );
  const externalReferenceRef = externalReferenceRefFromId(input.externalReferenceId ?? input.descriptorId);
  const descriptor: ExternalReferenceDescriptor = {
    ...createDescriptorBase('external-reference-descriptor', input, input.validityClass, reasonCodes, [externalReferenceRef]),
    externalReferenceRef,
    externalReferenceKind: input.externalReferenceKind,
    validityClass: input.validityClass,
    operatorActionRequirement,
    mayAuthorizeDestructiveOperation: false,
    mayAuthorizeExternalEffects: false,
  };

  return cloneJsonSafe(descriptor);
}

export function describeReplayEligibility(input: FakeInertMbrReplayEligibilityInput): ReplayEligibilityDescriptor {
  const externalReferenceValidities = normalizeExternalReferenceValidities(input);
  const replayEligibility =
    input.replayEligibility ?? deriveReplayEligibility(input.idempotencyPreserved, externalReferenceValidities);
  const externalEffectReplayGate =
    input.externalEffectReplayGate ?? deriveExternalEffectReplayGate(replayEligibility, externalReferenceValidities);
  const reasonCodes = reasonCodesForReplayEligibility(
    replayEligibility,
    externalEffectReplayGate,
    input.providerAcknowledged,
    input.businessSuccess,
    input.readyToAttempt,
    input.reasonCodes,
  );
  const replayEligibilityRef = replayEligibilityRefFromId(input.replayEligibilityId ?? input.descriptorId);
  const descriptor: ReplayEligibilityDescriptor = {
    ...createDescriptorBase('replay-eligibility-descriptor', input, replayEligibility, reasonCodes, [replayEligibilityRef]),
    replayEligibilityRef,
    replayEligibility,
    externalEffectReplayGate,
    replayAuthorizedByRestore: false,
    providerAcknowledgementImpliesBusinessSuccess: false,
    readyToAttemptIsPass: false,
  };

  return cloneJsonSafe(descriptor);
}

export function describeRestore(input: FakeInertMbrRestoreInput): RestoreDescriptor {
  const externalReferences = normalizeExternalReferences(input.externalReferences);
  const restoreStatus = input.restoreStatus ?? deriveRestoreStatus(externalReferences);
  const replayEligibility =
    input.replayEligibility ??
    describeReplayEligibility({
      descriptorId: `${input.descriptorId}.restore-replay`,
      idempotencyPreserved: input.idempotencyPreserved,
      externalReferenceValidities: externalReferences.map((reference) => reference.validityClass),
      reasonCodes: input.reasonCodes,
    });
  const operatorActionRequirement =
    input.operatorActionRequirement ?? deriveRestoreOperatorAction(restoreStatus, externalReferences);
  const reasonCodes = reasonCodesForRestore(
    restoreStatus,
    operatorActionRequirement,
    input.idempotencyPreserved,
    externalReferences,
    input.reasonCodes,
  );
  const restoreRef = restoreRefFromId(input.restoreId ?? input.descriptorId);
  const descriptor: RestoreDescriptor = {
    ...createDescriptorBase('restore-descriptor', input, restoreStatus, reasonCodes, [
      restoreRef,
      replayEligibility.replayEligibilityRef,
      ...externalReferences.map((reference) => reference.externalReferenceRef),
    ]),
    restoreRef,
    restoreStatus,
    ...(input.targetDeploymentId === undefined ? {} : { targetDeploymentRef: deploymentRefFromId(input.targetDeploymentId) }),
    ...(input.backupDescriptor === undefined
      ? input.backupId === undefined
        ? {}
        : { backupRef: backupRefFromId(input.backupId) }
      : { backupRef: input.backupDescriptor.backupRef }),
    ...(input.schemaVersionSummary === undefined ? {} : { schemaVersionSummary: cloneJsonSafe(input.schemaVersionSummary) }),
    storeGroupsIncluded: normalizeStoreGroups(input.storeGroupsIncluded),
    idempotencyPreserved: input.idempotencyPreserved,
    externalReferences,
    replayEligibility,
    operatorActionRequirement,
    readinessNonClaims: READINESS_NON_CLAIMS,
    safetyInvariants: SAFETY_INVARIANTS,
    restoreIsReplay: false,
    restoreAuthorizesExternalEffects: false,
  };

  return cloneJsonSafe(descriptor);
}

export function describeRecovery(input: FakeInertMbrRecoveryInput): RecoveryDescriptor {
  const replayEligibility = input.replayEligibility ?? replayEligibilityForRecoveryInput(input);
  const recoveryStatus = input.recoveryStatus ?? deriveRecoveryStatus(input.restoreDescriptor, replayEligibility);
  const operatorActionRequirement =
    input.operatorActionRequirement ?? deriveRecoveryOperatorAction(recoveryStatus, replayEligibility);
  const reasonCodes = reasonCodesForRecovery(
    recoveryStatus,
    replayEligibility,
    operatorActionRequirement,
    input.reasonCodes,
  );
  const recoveryRef = recoveryRefFromId(input.recoveryId ?? input.descriptorId);
  const descriptor: RecoveryDescriptor = {
    ...createDescriptorBase('recovery-descriptor', input, recoveryStatus, reasonCodes, [
      recoveryRef,
      replayEligibility.replayEligibilityRef,
      ...optionalDescriptorRefs(input.migrationDescriptor, input.backupDescriptor, input.restoreDescriptor),
    ]),
    recoveryRef,
    recoveryStatus,
    recoveryProfile: input.recoveryProfile,
    ...(input.migrationDescriptor === undefined ? {} : { migrationDescriptor: cloneJsonSafe(input.migrationDescriptor) }),
    ...(input.backupDescriptor === undefined ? {} : { backupDescriptor: cloneJsonSafe(input.backupDescriptor) }),
    ...(input.restoreDescriptor === undefined ? {} : { restoreDescriptor: cloneJsonSafe(input.restoreDescriptor) }),
    replayEligibility,
    operatorActionRequirement,
    readinessNonClaims: READINESS_NON_CLAIMS,
    safetyInvariants: SAFETY_INVARIANTS,
  };

  return cloneJsonSafe(descriptor);
}

export function describePublicDescriptors(
  input: FakeInertMbrPublicDescriptorInput,
): readonly MigrationBackupRestorePublicDescriptor[] {
  const descriptors: MigrationBackupRestorePublicDescriptor[] = [];

  for (const schemaInput of input.schemaVersions ?? []) {
    descriptors.push(describeSchemaVersion(schemaInput) as MigrationBackupRestorePublicDescriptor);
  }

  for (const migrationInput of input.migrations ?? []) {
    descriptors.push(describeMigration(migrationInput) as MigrationBackupRestorePublicDescriptor);
  }

  for (const backupInput of input.backups ?? []) {
    descriptors.push(describeBackup(backupInput) as MigrationBackupRestorePublicDescriptor);
  }

  for (const externalReferenceInput of input.externalReferences ?? []) {
    descriptors.push(describeExternalReference(externalReferenceInput) as MigrationBackupRestorePublicDescriptor);
  }

  for (const replayInput of input.replayEligibilities ?? []) {
    descriptors.push(describeReplayEligibility(replayInput) as MigrationBackupRestorePublicDescriptor);
  }

  for (const restoreInput of input.restores ?? []) {
    descriptors.push(describeRestore(restoreInput) as MigrationBackupRestorePublicDescriptor);
  }

  for (const recoveryInput of input.recoveries ?? []) {
    descriptors.push(describeRecovery(recoveryInput) as MigrationBackupRestorePublicDescriptor);
  }

  return cloneJsonSafe(descriptors);
}

function createDescriptorBase<TKind extends MigrationBackupRestoreDescriptorKind>(
  descriptorKind: TKind,
  input: FakeInertMbrDescriptorInputBase,
  status: SafeDescriptorSummaryStatus,
  reasonCodes: readonly SafeReasonCode[],
  safeRefs: readonly MigrationBackupRestoreSafeRef[],
): DescriptorBase & { readonly descriptorKind: TKind } {
  const descriptorRef = descriptorRefFromId(descriptorKind, input.descriptorId);

  return {
    descriptorRef,
    descriptorKind,
    descriptorVersion: DESCRIPTOR_VERSION,
    adapterReadiness: 'adapter-ready-for-real-system-integration',
    explicitGatePolicy: 'under-explicit-gates',
    productionReadiness: 'not-production-ready',
    publicProjection: 'redacted-json-safe',
    representation: 'source-contract-descriptor-only',
    reasonCodes,
    evidence: createEvidence(input, reasonCodes),
    summary: createSafeSummary(status, reasonCodes, [descriptorRef, ...safeRefs], input.detailCode),
  };
}

function createEvidence(
  input: FakeInertMbrDescriptorInputBase,
  reasonCodes: readonly SafeReasonCode[],
): readonly DescriptorEvidence[] {
  const defaultEvidence: readonly DescriptorEvidence[] = [
    {
      evidenceRef: evidenceRefFromId(`${input.descriptorId}.fake-inert-summary`),
      evidenceClass: 'fake-inert-summary',
      reasonCodes,
      redacted: true,
      jsonSafe: true,
    },
    {
      evidenceRef: evidenceRefFromId(`${input.descriptorId}.descriptor-only`),
      evidenceClass: 'descriptor-only',
      reasonCodes: BASE_REASON_CODES,
      redacted: true,
      jsonSafe: true,
    },
  ];
  const suppliedEvidence = (input.evidence ?? []).slice(0, MAX_EVIDENCE_ITEMS).map((evidence): DescriptorEvidence => ({
    evidenceRef: evidenceRefFromId(evidence.evidenceId),
    evidenceClass: evidence.evidenceClass ?? 'fake-inert-summary',
    reasonCodes: uniqueReasonCodes(evidence.reasonCodes ?? reasonCodes),
    redacted: true,
    jsonSafe: true,
  }));

  return [...defaultEvidence, ...suppliedEvidence].slice(0, MAX_EVIDENCE_ITEMS);
}

function createSafeSummary(
  status: SafeDescriptorSummaryStatus,
  reasonCodes: readonly SafeReasonCode[],
  safeRefs: readonly MigrationBackupRestoreSafeRef[],
  detailCode: string | undefined,
): SafeDescriptorSummary {
  return {
    summaryKind: 'redacted-summary',
    status,
    reasonCodes,
    safeRefs: uniqueSafeRefs(safeRefs),
    ...(detailCode === undefined ? {} : { detailCode: normalizeDetailCode(detailCode) }),
    redacted: true,
    jsonSafe: true,
  };
}

function reasonCodesForSchema(
  compatibility: SchemaCompatibilityClass,
  migrationState: MigrationState,
  supplied: readonly SafeReasonCode[] | undefined,
): readonly SafeReasonCode[] {
  return uniqueReasonCodes([
    ...BASE_REASON_CODES,
    ...reasonCodesForSchemaCompatibility(compatibility),
    ...reasonCodesForMigrationState(migrationState),
    ...(supplied ?? []),
  ]);
}

function reasonCodesForMigration(
  migrationState: MigrationState,
  startupDisposition: StartupDisposition,
  operatorActionRequirement: OperatorActionRequirement,
  supplied: readonly SafeReasonCode[] | undefined,
): readonly SafeReasonCode[] {
  return uniqueReasonCodes([
    ...BASE_REASON_CODES,
    ...reasonCodesForMigrationState(migrationState),
    ...reasonCodesForStartupDisposition(startupDisposition),
    ...reasonCodesForOperatorAction(operatorActionRequirement),
    ...(supplied ?? []),
  ]);
}

function reasonCodesForBackup(
  backupStatus: BackupStatus,
  integrityStatus: BackupIntegrityStatus,
  operatorActionRequirement: OperatorActionRequirement,
  supplied: readonly SafeReasonCode[] | undefined,
): readonly SafeReasonCode[] {
  return uniqueReasonCodes([
    ...BASE_REASON_CODES,
    ...reasonCodesForBackupStatus(backupStatus),
    ...reasonCodesForBackupIntegrity(integrityStatus),
    ...reasonCodesForOperatorAction(operatorActionRequirement),
    ...(supplied ?? []),
  ]);
}

function reasonCodesForExternalReference(
  validityClass: ExternalReferenceValidityClass,
  operatorActionRequirement: OperatorActionRequirement,
  supplied: readonly SafeReasonCode[] | undefined,
): readonly SafeReasonCode[] {
  return uniqueReasonCodes([
    ...BASE_REASON_CODES,
    ...reasonCodesForExternalReferenceValidity(validityClass),
    ...reasonCodesForOperatorAction(operatorActionRequirement),
    'external-effect-not-authorized',
    ...(supplied ?? []),
  ]);
}

function reasonCodesForReplayEligibility(
  replayEligibility: ReplayEligibilityClass,
  externalEffectReplayGate: ExternalEffectReplayGate,
  providerAcknowledged: boolean | undefined,
  businessSuccess: boolean | undefined,
  readyToAttempt: boolean | undefined,
  supplied: readonly SafeReasonCode[] | undefined,
): readonly SafeReasonCode[] {
  return uniqueReasonCodes([
    ...BASE_REASON_CODES,
    ...reasonCodesForReplayClass(replayEligibility),
    ...reasonCodesForReplayGate(externalEffectReplayGate),
    providerAcknowledged === true && businessSuccess !== true ? 'provider-acknowledgement-only' : 'none',
    businessSuccess !== true ? 'business-success-missing' : 'none',
    readyToAttempt === true ? 'ready-to-attempt-not-pass' : 'none',
    'replay-not-authorized',
    ...(supplied ?? []),
  ]);
}

function reasonCodesForRestore(
  restoreStatus: RestoreStatus,
  operatorActionRequirement: OperatorActionRequirement,
  idempotencyPreserved: boolean,
  externalReferences: readonly ExternalReferenceDescriptor[],
  supplied: readonly SafeReasonCode[] | undefined,
): readonly SafeReasonCode[] {
  return uniqueReasonCodes([
    ...BASE_REASON_CODES,
    ...reasonCodesForRestoreStatus(restoreStatus),
    ...reasonCodesForOperatorAction(operatorActionRequirement),
    ...externalReferences.flatMap((reference) => reasonCodesForExternalReferenceValidity(reference.validityClass)),
    idempotencyPreserved ? 'none' : 'operator-review-required',
    'external-effect-not-authorized',
    'replay-not-authorized',
    ...(supplied ?? []),
  ]);
}

function reasonCodesForRecovery(
  recoveryStatus: RecoveryStatus,
  replayEligibility: ReplayEligibilityDescriptor,
  operatorActionRequirement: OperatorActionRequirement,
  supplied: readonly SafeReasonCode[] | undefined,
): readonly SafeReasonCode[] {
  return uniqueReasonCodes([
    ...BASE_REASON_CODES,
    ...reasonCodesForRecoveryStatus(recoveryStatus),
    ...reasonCodesForOperatorAction(operatorActionRequirement),
    ...(replayEligibility.reasonCodes ?? []),
    'external-effect-not-authorized',
    'replay-not-authorized',
    ...(supplied ?? []),
  ]);
}

function reasonCodesForSchemaCompatibility(
  compatibility: SchemaCompatibilityClass,
): readonly SafeReasonCode[] {
  switch (compatibility) {
    case 'compatible':
      return ['none'];
    case 'migration-required':
      return ['migration-required'];
    case 'unsupported-version':
      return ['unsupported-version'];
    case 'unknown':
      return ['unknown-version'];
  }
}

function reasonCodesForMigrationState(migrationState: MigrationState): readonly SafeReasonCode[] {
  switch (migrationState) {
    case 'not-configured':
      return ['not-configured'];
    case 'up-to-date':
      return ['none'];
    case 'migration-required':
      return ['migration-required'];
    case 'migration-in-progress':
      return ['migration-in-progress'];
    case 'migration-failed':
      return ['migration-failed'];
    case 'rollback-required':
      return ['rollback-required'];
    case 'unsupported-version':
      return ['unsupported-version'];
    case 'unknown':
      return ['unknown-version'];
  }
}

function reasonCodesForStartupDisposition(startupDisposition: StartupDisposition): readonly SafeReasonCode[] {
  switch (startupDisposition) {
    case 'may-start':
    case 'not-applicable':
      return ['none'];
    case 'degraded':
      return ['ready-to-attempt-not-pass'];
    case 'blocked':
      return ['blocked-by-explicit-gate'];
    case 'unknown':
      return ['unknown-version'];
  }
}

function reasonCodesForBackupStatus(backupStatus: BackupStatus): readonly SafeReasonCode[] {
  switch (backupStatus) {
    case 'not-configured':
      return ['not-configured'];
    case 'not-created':
      return ['backup-not-created'];
    case 'available':
      return ['none'];
    case 'verification-required':
    case 'unknown':
      return ['backup-integrity-unknown'];
    case 'degraded':
      return ['ready-to-attempt-not-pass'];
    case 'failed-safe':
      return ['failed-safe'];
  }
}

function reasonCodesForBackupIntegrity(integrityStatus: BackupIntegrityStatus): readonly SafeReasonCode[] {
  switch (integrityStatus) {
    case 'integrity-evidence-present':
      return ['none'];
    case 'not-checked':
    case 'operator-summary-only':
    case 'unknown':
      return ['backup-integrity-unknown'];
    case 'degraded':
      return ['ready-to-attempt-not-pass'];
    case 'failed-safe':
      return ['failed-safe'];
  }
}

function reasonCodesForExternalReferenceValidity(
  validityClass: ExternalReferenceValidityClass,
): readonly SafeReasonCode[] {
  switch (validityClass) {
    case 'assumed-valid':
      return ['none'];
    case 'needs-reconcile':
      return ['external-reference-needs-reconcile'];
    case 'stale':
    case 'invalid':
      return ['restore-target-needs-review'];
    case 'unknown':
      return ['external-reference-unknown'];
  }
}

function reasonCodesForReplayClass(replayEligibility: ReplayEligibilityClass): readonly SafeReasonCode[] {
  switch (replayEligibility) {
    case 'not-replayable':
      return ['replay-not-authorized'];
    case 'inspect-only':
      return ['external-effect-not-authorized'];
    case 'eligible-after-dry-run-reconciliation':
      return ['dry-run-reconciliation-required'];
    case 'eligible-after-operator-approval':
      return ['operator-review-required'];
    case 'unknown':
      return ['external-reference-unknown'];
  }
}

function reasonCodesForReplayGate(externalEffectReplayGate: ExternalEffectReplayGate): readonly SafeReasonCode[] {
  switch (externalEffectReplayGate) {
    case 'not-authorized':
    case 'inspect-only':
      return ['external-effect-not-authorized'];
    case 'later-approval-required':
      return ['operator-review-required'];
    case 'dry-run-reconciliation-required':
      return ['dry-run-reconciliation-required'];
    case 'later-approval-and-dry-run-reconciliation-required':
      return ['operator-review-required', 'dry-run-reconciliation-required'];
  }
}

function reasonCodesForRestoreStatus(restoreStatus: RestoreStatus): readonly SafeReasonCode[] {
  switch (restoreStatus) {
    case 'not-attempted':
      return ['restore-not-attempted'];
    case 'planned-inspect-only':
      return ['external-effect-not-authorized'];
    case 'needs-reconcile':
      return ['restore-target-needs-review', 'dry-run-reconciliation-required'];
    case 'degraded':
      return ['ready-to-attempt-not-pass'];
    case 'blocked':
      return ['blocked-by-explicit-gate'];
    case 'failed-safe':
      return ['failed-safe'];
    case 'unknown':
      return ['external-reference-unknown'];
  }
}

function reasonCodesForRecoveryStatus(recoveryStatus: RecoveryStatus): readonly SafeReasonCode[] {
  switch (recoveryStatus) {
    case 'not-started':
      return ['restore-not-attempted'];
    case 'inspect-only':
      return ['external-effect-not-authorized'];
    case 'operator-review-required':
      return ['operator-review-required'];
    case 'blocked':
      return ['blocked-by-explicit-gate'];
    case 'degraded':
      return ['ready-to-attempt-not-pass'];
    case 'failed-safe':
      return ['failed-safe'];
    case 'unknown':
      return ['external-reference-unknown'];
  }
}

function reasonCodesForOperatorAction(
  operatorActionRequirement: OperatorActionRequirement,
): readonly SafeReasonCode[] {
  switch (operatorActionRequirement) {
    case 'none':
      return ['none'];
    case 'operator-review-required':
      return ['operator-review-required'];
    case 'dry-run-reconciliation-required':
      return ['dry-run-reconciliation-required'];
    case 'approval-required-before-external-effects':
      return ['operator-review-required', 'external-effect-not-authorized'];
    case 'manual-remediation-required':
      return ['operator-review-required'];
    case 'blocked-by-explicit-gate':
      return ['blocked-by-explicit-gate'];
  }
}

function deriveStartupDisposition(
  compatibility: SchemaCompatibilityClass,
  migrationState: MigrationState,
): StartupDisposition {
  if (compatibility === 'compatible' && migrationState === 'up-to-date') {
    return 'may-start';
  }

  if (compatibility === 'migration-required' || migrationState === 'migration-required') {
    return 'degraded';
  }

  if (migrationState === 'migration-in-progress') {
    return 'degraded';
  }

  if (migrationState === 'not-configured') {
    return 'not-applicable';
  }

  if (
    compatibility === 'unsupported-version' ||
    migrationState === 'unsupported-version' ||
    migrationState === 'migration-failed' ||
    migrationState === 'rollback-required'
  ) {
    return 'blocked';
  }

  return 'unknown';
}

function deriveStartupDispositionFromMigrationState(migrationState: MigrationState): StartupDisposition {
  switch (migrationState) {
    case 'up-to-date':
      return 'may-start';
    case 'migration-required':
    case 'migration-in-progress':
      return 'degraded';
    case 'migration-failed':
    case 'rollback-required':
    case 'unsupported-version':
      return 'blocked';
    case 'not-configured':
      return 'not-applicable';
    case 'unknown':
      return 'unknown';
  }
}

function deriveMigrationOperatorAction(
  migrationState: MigrationState,
  startupDisposition: StartupDisposition,
): OperatorActionRequirement {
  if (startupDisposition === 'blocked') {
    return 'blocked-by-explicit-gate';
  }

  switch (migrationState) {
    case 'up-to-date':
      return 'none';
    case 'migration-required':
    case 'migration-in-progress':
    case 'unknown':
      return 'operator-review-required';
    case 'migration-failed':
    case 'rollback-required':
    case 'unsupported-version':
      return 'manual-remediation-required';
    case 'not-configured':
      return 'blocked-by-explicit-gate';
  }
}

function deriveBackupOperatorAction(
  backupStatus: BackupStatus,
  integrityStatus: BackupIntegrityStatus,
): OperatorActionRequirement {
  if (backupStatus === 'available' && integrityStatus === 'integrity-evidence-present') {
    return 'none';
  }

  if (backupStatus === 'failed-safe' || integrityStatus === 'failed-safe') {
    return 'manual-remediation-required';
  }

  if (backupStatus === 'not-configured') {
    return 'blocked-by-explicit-gate';
  }

  return 'operator-review-required';
}

function deriveExternalReferenceOperatorAction(
  validityClass: ExternalReferenceValidityClass,
): OperatorActionRequirement {
  switch (validityClass) {
    case 'assumed-valid':
      return 'none';
    case 'needs-reconcile':
      return 'dry-run-reconciliation-required';
    case 'stale':
    case 'invalid':
      return 'manual-remediation-required';
    case 'unknown':
      return 'operator-review-required';
  }
}

function deriveReplayEligibility(
  idempotencyPreserved: boolean | undefined,
  externalReferenceValidities: readonly ExternalReferenceValidityClass[],
): ReplayEligibilityClass {
  if (idempotencyPreserved === false) {
    return 'not-replayable';
  }

  if (externalReferenceValidities.some((validity) => validity === 'invalid' || validity === 'stale')) {
    return 'not-replayable';
  }

  if (externalReferenceValidities.some((validity) => validity === 'unknown')) {
    return 'inspect-only';
  }

  if (externalReferenceValidities.some((validity) => validity === 'needs-reconcile')) {
    return 'eligible-after-dry-run-reconciliation';
  }

  if (idempotencyPreserved === true) {
    return 'eligible-after-operator-approval';
  }

  return 'inspect-only';
}

function deriveExternalEffectReplayGate(
  replayEligibility: ReplayEligibilityClass,
  externalReferenceValidities: readonly ExternalReferenceValidityClass[],
): ExternalEffectReplayGate {
  if (replayEligibility === 'eligible-after-dry-run-reconciliation') {
    return 'dry-run-reconciliation-required';
  }

  if (replayEligibility === 'eligible-after-operator-approval') {
    return externalReferenceValidities.some((validity) => validity === 'needs-reconcile')
      ? 'later-approval-and-dry-run-reconciliation-required'
      : 'later-approval-required';
  }

  if (replayEligibility === 'inspect-only') {
    return 'inspect-only';
  }

  return 'not-authorized';
}

function deriveRestoreStatus(externalReferences: readonly ExternalReferenceDescriptor[]): RestoreStatus {
  if (externalReferences.some((reference) => reference.validityClass === 'invalid')) {
    return 'blocked';
  }

  if (externalReferences.some((reference) => reference.validityClass === 'stale')) {
    return 'needs-reconcile';
  }

  if (externalReferences.some((reference) => reference.validityClass === 'needs-reconcile')) {
    return 'needs-reconcile';
  }

  if (externalReferences.some((reference) => reference.validityClass === 'unknown')) {
    return 'planned-inspect-only';
  }

  return 'planned-inspect-only';
}

function deriveRestoreOperatorAction(
  restoreStatus: RestoreStatus,
  externalReferences: readonly ExternalReferenceDescriptor[],
): OperatorActionRequirement {
  if (restoreStatus === 'blocked' || restoreStatus === 'failed-safe') {
    return 'blocked-by-explicit-gate';
  }

  if (externalReferences.some((reference) => reference.validityClass === 'invalid' || reference.validityClass === 'stale')) {
    return 'manual-remediation-required';
  }

  if (externalReferences.some((reference) => reference.validityClass === 'needs-reconcile')) {
    return 'dry-run-reconciliation-required';
  }

  if (restoreStatus === 'needs-reconcile') {
    return 'dry-run-reconciliation-required';
  }

  return 'operator-review-required';
}

function deriveRecoveryStatus(
  restoreDescriptor: RestoreDescriptor | undefined,
  replayEligibility: ReplayEligibilityDescriptor,
): RecoveryStatus {
  if (restoreDescriptor?.restoreStatus === 'blocked' || restoreDescriptor?.restoreStatus === 'failed-safe') {
    return 'blocked';
  }

  if (replayEligibility.replayEligibility === 'not-replayable') {
    return 'operator-review-required';
  }

  if (replayEligibility.replayEligibility === 'inspect-only') {
    return 'inspect-only';
  }

  return 'operator-review-required';
}

function deriveRecoveryOperatorAction(
  recoveryStatus: RecoveryStatus,
  replayEligibility: ReplayEligibilityDescriptor,
): OperatorActionRequirement {
  if (recoveryStatus === 'blocked' || recoveryStatus === 'failed-safe') {
    return 'blocked-by-explicit-gate';
  }

  if (replayEligibility.externalEffectReplayGate === 'dry-run-reconciliation-required') {
    return 'dry-run-reconciliation-required';
  }

  if (replayEligibility.externalEffectReplayGate === 'later-approval-and-dry-run-reconciliation-required') {
    return 'approval-required-before-external-effects';
  }

  return 'operator-review-required';
}

function replayEligibilityForRecoveryInput(input: FakeInertMbrRecoveryInput): ReplayEligibilityDescriptor {
  if (input.restoreDescriptor !== undefined) {
    return cloneJsonSafe(input.restoreDescriptor.replayEligibility);
  }

  return describeReplayEligibility({
    descriptorId: `${input.descriptorId}.recovery-replay`,
    replayEligibility: 'inspect-only',
    externalEffectReplayGate: 'inspect-only',
    reasonCodes: input.reasonCodes,
  });
}

function normalizeStoreGroups(groups: readonly StoreGroup[] | undefined): readonly StoreGroup[] {
  return uniqueBounded(groups ?? [], MAX_STORE_GROUPS);
}

function normalizeSafeRecordCounts(
  counts: readonly FakeInertMbrSafeRecordCountInput[],
): readonly SafeRecordCount[] {
  return counts.slice(0, MAX_RECORD_COUNTS).map((count): SafeRecordCount => ({
    storeGroup: count.storeGroup,
    count: count.countStatus === 'exact' || count.countStatus === 'bounded-estimate' ? normalizeSafeCount(count.count) : 0,
    countStatus: count.countStatus,
  }));
}

function normalizeExternalReferences(
  references: readonly ExternalReferenceDescriptor[] | undefined,
): readonly ExternalReferenceDescriptor[] {
  return (references ?? []).slice(0, MAX_EXTERNAL_REFERENCES).map(cloneJsonSafe);
}

function normalizeExternalReferenceValidities(
  input: FakeInertMbrReplayEligibilityInput,
): readonly ExternalReferenceValidityClass[] {
  const validities = [
    ...(input.externalReferenceValidity === undefined ? [] : [input.externalReferenceValidity]),
    ...(input.externalReferenceValidities ?? []),
  ];

  return validities.slice(0, MAX_EXTERNAL_REFERENCES);
}

function optionalDescriptorRefs(
  migrationDescriptor: MigrationDescriptor | undefined,
  backupDescriptor: BackupDescriptor | undefined,
  restoreDescriptor: RestoreDescriptor | undefined,
): readonly MigrationBackupRestoreSafeRef[] {
  return [
    ...(migrationDescriptor === undefined ? [] : [migrationDescriptor.migrationRef]),
    ...(backupDescriptor === undefined ? [] : [backupDescriptor.backupRef]),
    ...(restoreDescriptor === undefined ? [] : [restoreDescriptor.restoreRef]),
  ];
}

function uniqueReasonCodes(reasonCodes: readonly SafeReasonCode[]): readonly SafeReasonCode[] {
  return uniqueBounded(
    reasonCodes.filter((reasonCode) => reasonCode !== 'none'),
    MAX_REASON_CODES,
  );
}

function uniqueSafeRefs(refs: readonly MigrationBackupRestoreSafeRef[]): readonly MigrationBackupRestoreSafeRef[] {
  return uniqueBounded(refs, MAX_SAFE_REFS);
}

function uniqueBounded<TValue>(values: readonly TValue[], maxCount: number): readonly TValue[] {
  const result: TValue[] = [];

  for (const value of values) {
    if (!result.includes(value)) {
      result.push(value);
    }

    if (result.length >= maxCount) {
      break;
    }
  }

  return result;
}

function descriptorRefFromId(
  descriptorKind: MigrationBackupRestoreDescriptorKind,
  id: string,
): MigrationBackupRestoreDescriptorRef {
  return `migration-backup-restore-descriptor:${descriptorKind}.${normalizeIdentifier(id)}`;
}

function schemaSummaryRefFromId(id: string): MigrationSchemaSummaryRef {
  return `schema-summary:${normalizeIdentifier(id)}`;
}

function migrationRefFromId(id: string): MigrationDescriptorRef {
  return `migration-descriptor:${normalizeIdentifier(id)}`;
}

function backupRefFromId(id: string): BackupDescriptorRef {
  return `backup-descriptor:${normalizeIdentifier(id)}`;
}

function restoreRefFromId(id: string): RestoreDescriptorRef {
  return `restore-descriptor:${normalizeIdentifier(id)}`;
}

function recoveryRefFromId(id: string): RecoveryDescriptorRef {
  return `recovery-descriptor:${normalizeIdentifier(id)}`;
}

function replayEligibilityRefFromId(id: string): ReplayEligibilityRef {
  return `replay-eligibility:${normalizeIdentifier(id)}`;
}

function externalReferenceRefFromId(id: string): ExternalReferenceRef {
  return `external-reference:${normalizeIdentifier(id)}`;
}

function evidenceRefFromId(id: string): DescriptorEvidenceRef {
  return `descriptor-evidence:${normalizeIdentifier(id)}`;
}

function deploymentRefFromId(id: string): DeploymentRef {
  return `deployment:${normalizeIdentifier(id)}`;
}

function versionRefFromId(id: string): VersionRef {
  return `version:${normalizeIdentifier(id)}`;
}

function redactionPolicyRefFromId(id: string): RedactionPolicyRef {
  return `redaction-policy:${normalizeIdentifier(id)}`;
}

function normalizeIdentifier(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, MAX_IDENTIFIER_LENGTH);

  return normalized.length === 0 ? 'synthetic' : normalized;
}

function normalizeDetailCode(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, MAX_DETAIL_CODE_LENGTH);

  return normalized.length === 0 ? 'redacted' : normalized;
}

function normalizeSafeCount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.min(Math.floor(value), MAX_SAFE_COUNT);
}

function cloneJsonSafe<TValue>(value: TValue): TValue {
  assertJsonSafeValue(value);
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function assertJsonSafeValue(value: unknown): void {
  if (value === null) {
    return;
  }

  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'boolean') {
    return;
  }

  if (valueType === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('finite-json-number-required');
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertJsonSafeValue(item);
    }

    return;
  }

  if (valueType !== 'object') {
    throw new Error('json-safe-value-required');
  }

  const objectPrototype = Object.getPrototypeOf(value);

  if (objectPrototype !== Object.prototype && objectPrototype !== null) {
    throw new Error('plain-json-object-required');
  }

  for (const item of Object.values(value as Record<string, unknown>)) {
    assertJsonSafeValue(item);
  }
}
