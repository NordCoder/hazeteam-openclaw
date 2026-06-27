export type OpenClawAdapterPackageStatus = 'foundation';

export interface OpenClawAdapterPackageMetadata {
  readonly name: '@hazeteam/openclaw-adapter';
  readonly status: OpenClawAdapterPackageStatus;
}

export const OPENCLAW_ADAPTER_PACKAGE: OpenClawAdapterPackageMetadata = {
  name: '@hazeteam/openclaw-adapter',
  status: 'foundation',
};

export * from './contracts/index.js';
export * from './binding/index.js';
export * from './commands/index.js';
export * from './mapping/index.js';
export * from './rendering/index.js';
export * from './host/index.js';
export * from './permissions/index.js';
export * from './delivery/index.js';
export * from './callbacks/index.js';
export * from './runtime/index.js';
export * from './approvals/index.js';
export * from './storage/index.js';
export * from './openclaw/index.js';
export * from './durable-state/index.js';
