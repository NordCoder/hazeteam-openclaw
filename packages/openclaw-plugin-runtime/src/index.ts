export type OpenClawPluginRuntimePackageStatus = 'skeleton';

export type OpenClawPluginRuntimeReadiness = 'not-configured';

export type OpenClawPluginRuntimeEffect = 'none';

export interface OpenClawPluginRuntimePackageMetadata {
  readonly name: '@hazeteam/openclaw-plugin-runtime';
  readonly status: OpenClawPluginRuntimePackageStatus;
  readonly productionReady: false;
  readonly contractSlice: 'W13A';
}

export interface OpenClawPluginRuntimeDescriptor {
  readonly kind: 'openclaw-plugin-runtime';
  readonly packageName: '@hazeteam/openclaw-plugin-runtime';
  readonly packageStatus: OpenClawPluginRuntimePackageStatus;
  readonly descriptorVersion: 'w13a';
  readonly readiness: OpenClawPluginRuntimeReadiness;
  readonly productionReady: false;
  readonly effects: OpenClawPluginRuntimeEffect;
  readonly scope: 'package-boundary';
}

export interface OpenClawPluginRuntimeSkeletonDescription {
  readonly package: OpenClawPluginRuntimePackageMetadata;
  readonly descriptor: OpenClawPluginRuntimeDescriptor;
}

export const OPENCLAW_PLUGIN_RUNTIME_PACKAGE = Object.freeze({
  name: '@hazeteam/openclaw-plugin-runtime',
  status: 'skeleton',
  productionReady: false,
  contractSlice: 'W13A',
} satisfies OpenClawPluginRuntimePackageMetadata);

export const OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR = Object.freeze({
  kind: 'openclaw-plugin-runtime',
  packageName: OPENCLAW_PLUGIN_RUNTIME_PACKAGE.name,
  packageStatus: OPENCLAW_PLUGIN_RUNTIME_PACKAGE.status,
  descriptorVersion: 'w13a',
  readiness: 'not-configured',
  productionReady: false,
  effects: 'none',
  scope: 'package-boundary',
} satisfies OpenClawPluginRuntimeDescriptor);

export function describeOpenClawPluginRuntime(): OpenClawPluginRuntimeSkeletonDescription {
  return {
    package: OPENCLAW_PLUGIN_RUNTIME_PACKAGE,
    descriptor: OPENCLAW_PLUGIN_RUNTIME_DESCRIPTOR,
  };
}
