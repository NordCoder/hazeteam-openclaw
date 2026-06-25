import type { AdapterOperationContext } from '../contracts/context.js';
import type { OpenClawTelegramAdapterReadiness } from '../contracts/readiness.js';
import { createAdapterReadinessCheck, summarizeAdapterReadiness } from '../contracts/readiness.js';
import type { AdapterOperationResult } from '../contracts/result.js';
import { adapterErr, adapterOk } from '../contracts/result.js';
import type {
  AdapterCommandFacade,
  AdapterCommandFacadeResult,
  AdapterNormalizedCommandIntent,
} from '../commands/command-facade.js';
import {
  createAdapterCommandFacade,
  describeAdapterCommandFacade,
  summarizeAdapterCommandFacadeReadiness,
} from '../commands/command-facade.js';
import type {
  AdapterCoreFacadeMethodName,
  AdapterCoreHostBoundary,
  AdapterCoreHostFactoryMetadata,
  AdapterCoreHostFactoryMetadataInput,
  AdapterCoreHostPortName,
  AdapterCoreHostPorts,
  AdapterCoreHostRequiredPortName,
  AdapterCorePublicFacade,
  RequiredAdapterCoreFacadeMethodName,
} from './core-host-factory.js';
import { createAdapterCoreHostFactory } from './core-host-factory.js';

const ADAPTER_HOST_COMMAND_FACADE_KIND = 'adapter-host-command-facade' as const;

export interface AdapterHostCommandFacadeInput {
  readonly facade?: AdapterCorePublicFacade | undefined;
  readonly ports?: AdapterCoreHostPorts | undefined;
  readonly metadata?: AdapterCoreHostFactoryMetadataInput | undefined;
  readonly context?: AdapterOperationContext | undefined;
}

export interface AdapterHostCommandFacadeDescriptor {
  readonly kind: typeof ADAPTER_HOST_COMMAND_FACADE_KIND;
  readonly metadata: AdapterCoreHostFactoryMetadata;
  readonly facadeMethods: readonly AdapterCoreFacadeMethodName[];
  readonly requiredFacadeMethods: readonly RequiredAdapterCoreFacadeMethodName[];
  readonly missingRequiredFacadeMethods: readonly RequiredAdapterCoreFacadeMethodName[];
  readonly configuredPorts: readonly AdapterCoreHostPortName[];
  readonly requiredPorts: readonly AdapterCoreHostRequiredPortName[];
  readonly missingRequiredPorts: readonly AdapterCoreHostRequiredPortName[];
  readonly commandMethods: readonly string[];
  readonly missingCommandMethods: readonly string[];
  readonly readiness: OpenClawTelegramAdapterReadiness;
}

export interface AdapterHostCommandFacade {
  readonly commands: AdapterCommandFacade;
  readonly submitCommand: (
    intent: AdapterNormalizedCommandIntent,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<AdapterCommandFacadeResult>>;
  readonly describe: () => AdapterHostCommandFacadeDescriptor;
  readonly getReadiness: () => OpenClawTelegramAdapterReadiness;
}

export type AdapterHostCommandFacadeResult = AdapterOperationResult<AdapterHostCommandFacade>;

function combineHostCommandReadiness(input: {
  readonly host: AdapterCoreHostBoundary;
  readonly commandReadiness: OpenClawTelegramAdapterReadiness;
}): OpenClawTelegramAdapterReadiness {
  const hostAndCommandConfigured =
    input.host.missingRequiredFacadeMethods.length === 0 && input.commandReadiness.status !== 'not-ready';

  return summarizeAdapterReadiness({
    checks: Object.freeze([
      ...input.host.readiness.checks,
      ...input.commandReadiness.checks,
      createAdapterReadinessCheck({
        component: 'core.host-command-facade',
        status: hostAndCommandConfigured ? 'pass' : 'fail',
        message: hostAndCommandConfigured
          ? 'Host and command facade composition is configured over public-safe core methods.'
          : 'Host and command facade composition is missing required public-safe core methods.',
      }),
    ]),
  });
}

function createDescriptor(input: {
  readonly host: AdapterCoreHostBoundary;
  readonly readiness: OpenClawTelegramAdapterReadiness;
}): AdapterHostCommandFacadeDescriptor {
  const commandDescriptor = describeAdapterCommandFacade({ facade: input.host.facade });

  return Object.freeze({
    kind: ADAPTER_HOST_COMMAND_FACADE_KIND,
    metadata: input.host.metadata,
    facadeMethods: input.host.facadeMethods,
    requiredFacadeMethods: input.host.requiredFacadeMethods,
    missingRequiredFacadeMethods: input.host.missingRequiredFacadeMethods,
    configuredPorts: input.host.configuredPorts,
    requiredPorts: input.host.requiredPorts,
    missingRequiredPorts: input.host.missingRequiredPorts,
    commandMethods: commandDescriptor.configuredMethods,
    missingCommandMethods: commandDescriptor.missingRequiredMethods,
    readiness: input.readiness,
  });
}

export function describeAdapterHostCommandFacade(
  input: AdapterHostCommandFacadeInput = {},
): AdapterOperationResult<AdapterHostCommandFacadeDescriptor> {
  const hostResult = createAdapterCoreHostFactory(input);
  if (!hostResult.ok) {
    return hostResult;
  }

  const commandReadiness = summarizeAdapterCommandFacadeReadiness({ facade: hostResult.value.facade });
  const readiness = combineHostCommandReadiness({ host: hostResult.value, commandReadiness });

  return adapterOk(createDescriptor({ host: hostResult.value, readiness }), input.context);
}

export function createAdapterHostCommandFacade(
  input: AdapterHostCommandFacadeInput = {},
): AdapterHostCommandFacadeResult {
  const hostResult = createAdapterCoreHostFactory(input);
  if (!hostResult.ok) {
    return adapterErr(hostResult.error, input.context);
  }

  const host = hostResult.value;
  const commands = createAdapterCommandFacade({ facade: host.facade, context: input.context });

  return adapterOk(
    Object.freeze({
      commands,
      submitCommand(
        intent: AdapterNormalizedCommandIntent,
        context?: AdapterOperationContext,
      ): Promise<AdapterOperationResult<AdapterCommandFacadeResult>> {
        return commands.submit(intent, context ?? input.context);
      },
      describe(): AdapterHostCommandFacadeDescriptor {
        const commandReadiness = commands.getReadiness();
        const readiness = combineHostCommandReadiness({ host, commandReadiness });
        return createDescriptor({ host, readiness });
      },
      getReadiness(): OpenClawTelegramAdapterReadiness {
        const commandReadiness = commands.getReadiness();
        return combineHostCommandReadiness({ host, commandReadiness });
      },
    }),
    input.context,
  );
}
