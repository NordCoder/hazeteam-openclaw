/**
 * W24B runtime-mode contract vocabulary.
 *
 * This module is intentionally type-only: it declares public-safe vocabulary for
 * future runtime-mode work without constructing providers, starting listeners,
 * opening webhook receivers, polling, supervising daemons, scheduling work, or
 * loading any default configuration. Descriptor presence is not runtime
 * readiness, and fake/inert mode is not real runtime behavior.
 */

export type RuntimeModeKind =
  | 'listener'
  | 'webhook'
  | 'polling'
  | 'daemon'
  | 'supervision'
  | 'explicit-startup'
  | 'opt-in-real-edge';

export type RuntimeModeListenerVocabulary =
  | 'listener-boundary'
  | 'inbound-event-handoff'
  | 'normalized-channel-event-input'
  | 'no-listener-startup';

export type RuntimeModeWebhookVocabulary =
  | 'webhook-boundary'
  | 'provider-update-receipt'
  | 'callback-permission-handoff'
  | 'no-webhook-receiver-startup';

export type RuntimeModePollingVocabulary =
  | 'polling-boundary'
  | 'polling-intent-descriptor'
  | 'cursor-planning-only'
  | 'no-polling-loop';

export type RuntimeModeDaemonVocabulary =
  | 'daemon-boundary'
  | 'supervision-boundary'
  | 'safe-lifecycle-status'
  | 'no-daemon-startup';

export type RuntimeModeStartupVocabulary =
  | 'explicit-operator-start-required'
  | 'no-start-on-import'
  | 'no-start-on-construction'
  | 'host-supplied-start-only';

export type RuntimeModeRealEdgeVocabulary =
  | 'opt-in-real-edge-only'
  | 'gated-real-edge-attempt'
  | 'redacted-attempt-evidence'
  | 'no-default-real-edge';

export type RuntimeModeVocabulary =
  | RuntimeModeListenerVocabulary
  | RuntimeModeWebhookVocabulary
  | RuntimeModePollingVocabulary
  | RuntimeModeDaemonVocabulary
  | RuntimeModeStartupVocabulary
  | RuntimeModeRealEdgeVocabulary;

export type RuntimeModeRealityClassification =
  | 'descriptor-only-not-runtime-readiness'
  | 'fake-inert-not-real-runtime'
  | 'opt-in-real-edge-contract-only'
  | 'unknown-redacted';

export type RuntimeModeLifecycleState =
  | 'not-created'
  | 'described-only'
  | 'configured-redacted'
  | 'ready-to-attempt-not-pass'
  | 'ready-to-run-not-pass'
  | 'start-requested'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'blocked'
  | 'skipped'
  | 'failed-safe';

export type RuntimeModeReadinessState =
  | 'not-ready'
  | 'descriptor-exists-not-ready'
  | 'ready-to-attempt-not-pass'
  | 'ready-to-run-not-pass'
  | 'blocked'
  | 'skipped'
  | 'failed-safe';

export type RuntimeModeDescriptorReadinessState =
  | 'descriptor-only-not-ready'
  | 'descriptor-exists-gates-incomplete'
  | 'descriptor-exists-ready-to-attempt-not-pass'
  | 'descriptor-exists-ready-to-run-not-pass';

export type RuntimeModeStartEligibilityStatus =
  | 'not-eligible'
  | 'eligible-to-attempt-not-pass'
  | 'eligible-to-request-run-not-pass'
  | 'blocked-by-operator-gate'
  | 'blocked-by-runtime-gate'
  | 'blocked-by-real-edge-gate'
  | 'skipped'
  | 'failed-safe';

export type RuntimeModeGateKind =
  | 'operator-gate'
  | 'runtime-mode-gate'
  | 'injected-port-gate'
  | 'real-edge-gate'
  | 'redaction-gate'
  | 'safe-output-gate';

export type RuntimeModeGateStatus =
  | 'open-not-pass'
  | 'closed'
  | 'missing'
  | 'blocked'
  | 'skipped'
  | 'unknown-redacted';

export type RuntimeModeProviderAcknowledgementStatus =
  | 'not-requested'
  | 'acknowledged-not-business-success'
  | 'not-acknowledged'
  | 'unknown-redacted';

export type RuntimeModeBusinessOutcomeStatus =
  | 'not-evaluated'
  | 'succeeded-by-business-rule'
  | 'failed-by-business-rule'
  | 'not-applicable';

export type RuntimeModePublicSafetyStatus =
  | 'redacted-json-safe'
  | 'redacted-fixed-shape'
  | 'unsafe-output-blocked'
  | 'unknown-redacted';

export type RuntimeModeDefaultEffectStatus =
  | 'none'
  | 'explicit-call-required'
  | 'future-gated-only';

export type RuntimeModeDiagnosticSeverity = 'info' | 'blocked' | 'failed-safe';

export interface RuntimeModeSafeDiagnostic {
  readonly code: string;
  readonly severity: RuntimeModeDiagnosticSeverity;
  readonly message: string;
}

export interface RuntimeModeGateDescriptor {
  readonly gateKind: RuntimeModeGateKind;
  readonly gateStatus: RuntimeModeGateStatus;
  readonly requiredForStart: boolean;
  readonly safeReason?: string;
}

export interface RuntimeModeStartEligibility {
  readonly status: RuntimeModeStartEligibilityStatus;
  readonly operatorActionRequired: boolean;
  readonly requiredGateKinds: readonly RuntimeModeGateKind[];
  readonly closedGateKinds?: readonly RuntimeModeGateKind[];
  readonly safeReason?: string;
}

export interface RuntimeModeReadinessDescriptor {
  readonly readinessState: RuntimeModeReadinessState;
  readonly descriptorReadinessState: RuntimeModeDescriptorReadinessState;
  readonly startEligibility: RuntimeModeStartEligibility;
  readonly gates: readonly RuntimeModeGateDescriptor[];
  readonly safeDiagnostics?: readonly RuntimeModeSafeDiagnostic[];
}

export interface RuntimeModeOutcomeSeparation {
  readonly providerAcknowledgementStatus: RuntimeModeProviderAcknowledgementStatus;
  readonly businessOutcomeStatus: RuntimeModeBusinessOutcomeStatus;
  readonly providerAcknowledgementIsBusinessSuccess: false;
}

export interface RuntimeModePublicSafetyDescriptor {
  readonly safetyStatus: RuntimeModePublicSafetyStatus;
  readonly publicShape: 'json-safe-plain-object';
  readonly providerDataBoundary: 'normalized-or-redacted-only';
  readonly runtimeHandleBoundary: 'not-exposed';
  readonly sensitiveValueBoundary: 'not-exposed';
}

export interface RedactedRuntimeModeDescriptor {
  readonly descriptorKind: 'redacted-runtime-mode-descriptor';
  readonly modeRef: string;
  readonly modeKind: RuntimeModeKind;
  readonly vocabulary: readonly RuntimeModeVocabulary[];
  readonly realityClassification: RuntimeModeRealityClassification;
  readonly lifecycleState: RuntimeModeLifecycleState;
  readonly readiness: RuntimeModeReadinessDescriptor;
  readonly outcomeSeparation: RuntimeModeOutcomeSeparation;
  readonly publicSafety: RuntimeModePublicSafetyDescriptor;
  readonly defaultStartup: RuntimeModeDefaultEffectStatus;
  readonly defaultRuntimeEffects: RuntimeModeDefaultEffectStatus;
  readonly runtimeBehaviorImplemented: false;
  readonly listenerImplemented: false;
  readonly webhookImplemented: false;
  readonly pollingImplemented: false;
  readonly daemonImplemented: false;
  readonly productionReady: false;
  readonly safeSummary?: string;
  readonly safeDiagnostics?: readonly RuntimeModeSafeDiagnostic[];
}
