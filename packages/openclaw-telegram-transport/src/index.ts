export type OpenClawTelegramTransportPackageStatus = 'config-secret-boundary';

export type OpenClawTelegramTransportEffect = 'none';

export type OpenClawTelegramTransportPublicSurface = 'config' | 'secrets';

export interface OpenClawTelegramTransportPackageMetadata {
  readonly name: '@hazeteam/openclaw-telegram-transport';
  readonly status: OpenClawTelegramTransportPackageStatus;
  readonly productionReady: false;
  readonly contractSlice: 'W14A';
  readonly publicSurfaces: readonly OpenClawTelegramTransportPublicSurface[];
}

export interface OpenClawTelegramTransportDescriptor {
  readonly kind: 'openclaw-telegram-transport';
  readonly packageName: '@hazeteam/openclaw-telegram-transport';
  readonly packageStatus: OpenClawTelegramTransportPackageStatus;
  readonly descriptorVersion: 'w14a';
  readonly readiness: 'config-secret-boundary-only';
  readonly productionReady: false;
  readonly effects: OpenClawTelegramTransportEffect;
  readonly scope: 'transport-config-secret-handles';
  readonly publicSurfaces: readonly OpenClawTelegramTransportPublicSurface[];
}

export interface OpenClawTelegramTransportDescription {
  readonly package: OpenClawTelegramTransportPackageMetadata;
  readonly descriptor: OpenClawTelegramTransportDescriptor;
}

export const OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES = Object.freeze([
  'config',
  'secrets',
] as const satisfies readonly OpenClawTelegramTransportPublicSurface[]);

export const OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE = Object.freeze({
  name: '@hazeteam/openclaw-telegram-transport',
  status: 'config-secret-boundary',
  productionReady: false,
  contractSlice: 'W14A',
  publicSurfaces: OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES,
} satisfies OpenClawTelegramTransportPackageMetadata);

export const OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR = Object.freeze({
  kind: 'openclaw-telegram-transport',
  packageName: OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE.name,
  packageStatus: OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE.status,
  descriptorVersion: 'w14a',
  readiness: 'config-secret-boundary-only',
  productionReady: false,
  effects: 'none',
  scope: 'transport-config-secret-handles',
  publicSurfaces: OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES,
} satisfies OpenClawTelegramTransportDescriptor);

export function describeOpenClawTelegramTransport(): OpenClawTelegramTransportDescription {
  return Object.freeze({
    package: OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE,
    descriptor: OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR,
  } satisfies OpenClawTelegramTransportDescription);
}

export {
  OPENCLAW_TELEGRAM_TRANSPORT_PROFILES,
  TRANSPORT_CONFIG_READINESS_STATUSES,
  TRANSPORT_PROVIDER_CLASSIFICATIONS,
  TRANSPORT_PROVIDER_MODES,
  isSafeTransportConfigJson,
  parseTransportConfig,
  projectTransportConfigReadiness,
} from './config.js';

export type {
  OpenClawTelegramTransportProfile,
  TransportConfigDescriptor,
  TransportConfigInput,
  TransportConfigIssue,
  TransportConfigIssueCode,
  TransportConfigIssueSeverity,
  TransportConfigParseResult,
  TransportConfigReadinessProjection,
  TransportConfigReadinessProviderProjection,
  TransportConfigReadinessStatus,
  TransportProviderClassification,
  TransportProviderConfigDescriptor,
  TransportProviderConfigInput,
  TransportProviderMode,
} from './config.js';

export {
  TRANSPORT_SECRET_DESCRIPTOR_STATUSES,
  TRANSPORT_SECRET_HANDLE_BRAND,
  TRANSPORT_SECRET_KINDS,
  TRANSPORT_SECRET_PROVIDERS,
  TRANSPORT_SECRET_SOURCE_CLASSES,
  createOpaqueTransportSecretHandle,
  createTransportSecretDescriptor,
  describeTransportSecretHandle,
  isSafeTransportSecretRef,
  sanitizeTransportSecretRef,
} from './secrets.js';

export type {
  TransportSecretDescriptor,
  TransportSecretDescriptorInput,
  TransportSecretDescriptorIssue,
  TransportSecretDescriptorIssueCode,
  TransportSecretDescriptorIssueSeverity,
  TransportSecretDescriptorResult,
  TransportSecretDescriptorStatus,
  TransportSecretHandle,
  TransportSecretKind,
  TransportSecretProvider,
  TransportSecretSourceClass,
} from './secrets.js';
