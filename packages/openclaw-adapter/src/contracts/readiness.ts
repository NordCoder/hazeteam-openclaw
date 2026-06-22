import type { AdapterIsoTimestamp } from "./refs.js";

export const adapterReadinessStatuses = Object.freeze([
  "ready",
  "degraded",
  "not_configured",
  "failed"
] as const);

export type AdapterReadinessStatus = (typeof adapterReadinessStatuses)[number];

export const adapterCheckStatuses = Object.freeze([
  "ready",
  "missing",
  "degraded",
  "failed"
] as const);

export type AdapterCheckStatus = (typeof adapterCheckStatuses)[number];

export type AdapterReadinessCheckName =
  | "topicBindingStore"
  | "channelRegistry"
  | "deliveryCapability"
  | "domainRegistry"
  | "runtimeBridge"
  | "storeBindings"
  | "permissionPolicy";

export interface AdapterCheckResult {
  readonly status: AdapterCheckStatus;
  readonly code: string;
  readonly safeMessage: string;
  readonly detailsRef?: string;
}

export type AdapterReadinessChecks = Readonly<Record<AdapterReadinessCheckName, AdapterCheckResult>>;

export interface OpenClawTelegramAdapterReadiness {
  readonly status: AdapterReadinessStatus;
  readonly coreReadiness?: unknown;
  readonly checks: AdapterReadinessChecks;
  readonly safeSummary: string;
  readonly generatedAt: AdapterIsoTimestamp;
}
