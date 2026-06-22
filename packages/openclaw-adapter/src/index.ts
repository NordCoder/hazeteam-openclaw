export type OpenClawAdapterPackageStatus = 'skeleton';

export interface OpenClawAdapterPackageMetadata {
  readonly name: '@hazeteam/openclaw-adapter';
  readonly status: OpenClawAdapterPackageStatus;
}

export const OPENCLAW_ADAPTER_PACKAGE: OpenClawAdapterPackageMetadata = {
  name: '@hazeteam/openclaw-adapter',
  status: 'skeleton',
};

export * from './contracts/index.js';
