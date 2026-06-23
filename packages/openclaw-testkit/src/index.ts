export type OpenClawTestkitPackageStatus = 'skeleton';

export interface OpenClawTestkitPackageMetadata {
  readonly name: '@hazeteam/openclaw-testkit';
  readonly status: OpenClawTestkitPackageStatus;
}

export const OPENCLAW_TESTKIT_PACKAGE: OpenClawTestkitPackageMetadata = {
  name: '@hazeteam/openclaw-testkit',
  status: 'skeleton',
};

export * from './events/telegram-event-factories.js';
export * from './fakes/fake-delivery-sink.js';
export * from './fakes/fake-runtime.js';
export * from './fakes/fake-approval.js';
