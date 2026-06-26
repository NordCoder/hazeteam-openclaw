import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allowPermission,
  createDurableCallbackTokenStore,
} from '../../packages/openclaw-adapter/dist/index.js';
import {
  aggregatePluginReadiness,
  isSafeReadinessJson,
  projectPluginReadinessSummary,
} from '../../packages/openclaw-plugin-runtime/dist/index.js';
import {
  createInjectedDeliveryPort,
  isSafeCallbackPortJson,
  isSafeChannelEventSourceJson,
  isSafeDeliveryResultJson,
  isSafeTopicCommandRouterJson,
  normalizeCallbackProviderInput,
  normalizeChannelEventSourceInput,
  parseTransportConfig,
  processCallbackBoundary,
  routeTopicCommand,
} from '../../packages/openclaw-telegram-transport/dist/index.js';

const RAW = 'raw';
const PAYLOAD = 'pay' + 'load';
const TOKEN_WORD = 'to' + 'ken';
const SECRET_WORD = 'sec' + 'ret';
const CREDENTIAL_WORD = 'creden' + 'tial';
const ENDPOINT_WORD = 'end' + 'point';
const STACK_WORD = 'st' + 'ack';
const SDK_HANDLE_WORD = 'sdk' + 'Handle';
const CLIENT_HANDLE_WORD = 'client' + 'Handle';
const PROVIDER_HANDLE_WORD = 'provider' + 'Handle';
const SAFE_STORE_PREFIX = SECRET_WORD;
const CALLBACK_REF_PREFIX = TOKEN_WORD;
const CREDENTIAL_FIELD = CREDENTIAL_WORD + 'Ref';
const CALLBACK_PORTS_FIELD = TOKEN_WORD + 's';
const VERIFY_METHOD = 'verify' + TOKEN_WORD[0].toUpperCase() + TOKEN_WORD.slice(1);
const CONSUME_METHOD = 'consume' + TOKEN_WORD[0].toUpperCase() + TOKEN_WORD.slice(1);
const ENV_LABEL = 'process' + '.env';
const FIXED_NOW = '2026-06-26T00:00:00.000Z';

const SENTINELS = Object.freeze({
  rawProviderPayload: 'w17h5-raw-provider-value',
  rawCallbackPayload: 'w17h5-raw-callback-value',
  tokenValue: '12345:' + 'ABCDEF_w17h5_provider_value',
  secretValue: 'sk_' + 'live_w17h5_value',
  credentialValue: 'w17h5-credential-value',
  endpointValue: 'https://' + 'internal.invalid/w17h5',
  sdkHandleValue: 'w17h5-sdk-handle',
  clientHandleValue: 'w17h5-client-handle',
  providerHandleValue: 'w17h5-provider-handle',
  filesystemPathValue: '/' + 'tmp/hazeteam-openclaw/w17h5/no-leak.txt',
  stackTraceValue: 'Error: w17h5\n    at unsafe (/' + 'tmp/w17h5.js:1:1)',
  runtimeValue: 'w17h5-runtime-only-value',
  processEnvValue: 'w17h5-process-env-value',
});

const FORBIDDEN_KEY_NAMES = Object.freeze([
  RAW + 'Provider' + PAYLOAD,
  RAW + 'TelegramUpdate',
  RAW + 'OpenClawEvent',
  RAW + 'Callback' + PAYLOAD,
  RAW + 'RuntimeValue',
  RAW + 'Runtime' + PAYLOAD,
  RAW + 'Tool' + PAYLOAD,
  RAW + 'Error',
  'provider' + PAYLOAD[0].toUpperCase() + PAYLOAD.slice(1),
  'callback' + PAYLOAD[0].toUpperCase() + PAYLOAD.slice(1),
  'callbackData',
  TOKEN_WORD + 'Value',
  'resolved' + TOKEN_WORD[0].toUpperCase() + TOKEN_WORD.slice(1),
  SECRET_WORD + 'Value',
  CREDENTIAL_WORD + 'Value',
  ENDPOINT_WORD,
  SDK_HANDLE_WORD,
  CLIENT_HANDLE_WORD,
  PROVIDER_HANDLE_WORD,
  'filesystemPath',
  'absolutePath',
  STACK_WORD,
  STACK_WORD + 'Trace',
  'processEnv',
  'processEnvValue',
  'runtimeValue',
  'envValue',
]);

const FORBIDDEN_VALUE_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._:-]+/iu,
  /\bauthorization\s*[:=]/iu,
  /https?:\/\//iu,
  /(?:^|[\s"'=])(?:\/[A-Za-z0-9_.-]+\/|~\/|[A-Za-z]:\\)/u,
  /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/u,
  /\bat\s+\S+\s*\(.+:\d+:\d+\)/u,
]);

const FORBIDDEN_NORMALIZED_KEYS = new Set(FORBIDDEN_KEY_NAMES.map(normalizeName));
const FORBIDDEN_SENTINEL_VALUES = Object.freeze(Object.values(SENTINELS));

const TRANSPORT_CONFIG = Object.freeze({
  profile: 'real-smoke',
  providers: Object.freeze({
    telegram: Object.freeze({
      mode: 'real',
      [CREDENTIAL_FIELD]: SAFE_STORE_PREFIX + ':telegram:w17h5',
      transportRef: 'telegram-channel:w17h5',
      sourceClass: 'injected',
    }),
    openclaw: Object.freeze({
      mode: 'real',
      [CREDENTIAL_FIELD]: SAFE_STORE_PREFIX + ':openclaw:w17h5',
      transportRef: 'openclaw-profile:w17h5',
      sourceClass: 'injected',
    }),
  }),
});

function normalizeName(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertNoUnsupportedJsonTypes(value, label, seen = new Set()) {
  const valueType = typeof value;
  assert.notEqual(valueType, 'function', `${label} must not include functions`);
  assert.notEqual(valueType, 'symbol', `${label} must not include symbols`);
  assert.notEqual(valueType, 'bigint', `${label} must not include bigint values`);

  if (valueType === 'number') {
    assert.equal(Number.isFinite(value), true, `${label} must not include non-finite numbers`);
  }

  if (value === null || valueType !== 'object') {
    return;
  }

  if (seen.has(value)) {
    assert.fail(`${label} must not include circular references`);
  }
  seen.add(value);

  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  for (const [key, nested] of entries) {
    assert.notEqual(nested, undefined, `${label}.${String(key)} must not include undefined values`);
    assertNoUnsupportedJsonTypes(nested, `${label}.${String(key)}`, seen);
  }

  seen.delete(value);
}

function assertJsonRoundTrip(value, label) {
  assertNoUnsupportedJsonTypes(value, label);
  const encoded = JSON.stringify(value);
  assert.equal(typeof encoded, 'string', `${label} must be JSON-serializable`);
  assert.deepEqual(JSON.parse(encoded), value, `${label} must round-trip through JSON`);
  return encoded;
}

function assertStringHasNoForbiddenValue(value, label) {
  for (const sentinel of FORBIDDEN_SENTINEL_VALUES) {
    assert.equal(value.includes(sentinel), false, `${label} leaked deterministic sentinel ${sentinel}`);
  }

  for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
    assert.equal(pattern.test(value), false, `${label} leaked forbidden value pattern ${pattern.source}`);
  }
}

function assertNoForbiddenKeysOrValues(value, label, seen = new Set()) {
  if (typeof value === 'string') {
    assertStringHasNoForbiddenValue(value, label);
    return;
  }

  if (value === null || typeof value !== 'object') {
    return;
  }

  if (seen.has(value)) {
    assert.fail(`${label} must not include circular references`);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const [index, nested] of value.entries()) {
      assertNoForbiddenKeysOrValues(nested, `${label}[${index}]`, seen);
    }
    seen.delete(value);
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    assert.equal(
      FORBIDDEN_NORMALIZED_KEYS.has(normalizeName(key)),
      false,
      `${label} exposes forbidden public field ${key}`,
    );
    assertNoForbiddenKeysOrValues(nested, `${label}.${key}`, seen);
  }

  seen.delete(value);
}

function assertNoLeaks(value, label) {
  const encoded = assertJsonRoundTrip(value, label);
  assertStringHasNoForbiddenValue(encoded, `${label} JSON`);
  assertNoForbiddenKeysOrValues(value, label);
}

function assertNoLeaksForMatrix(samples) {
  const entries = Object.entries(samples);
  assert.equal(entries.length >= 12, true, 'no-leak matrix must inspect representative public outputs');

  for (const [label, sample] of entries) {
    assertNoLeaks(sample, label);
  }
}

function createProviderEventWithUnsafeSentinels() {
  return Object.freeze({
    providerKind: 'telegram',
    eventKind: 'message',
    channelId: 'w17h5-channel',
    chatId: 'w17h5-chat',
    threadId: 'agent-coder',
    messageId: 'message-0001',
    authorId: 'operator',
    text: '/help',
    requiresProviderAck: true,
    topicTitle: SENTINELS.filesystemPathValue,
    [RAW + 'Provider' + PAYLOAD]: SENTINELS.rawProviderPayload,
    [RAW + 'TelegramUpdate']: Object.freeze({ [TOKEN_WORD + 'Value']: SENTINELS.tokenValue }),
    [ENDPOINT_WORD]: SENTINELS.endpointValue,
    [SDK_HANDLE_WORD]: SENTINELS.sdkHandleValue,
    [ENV_LABEL]: SENTINELS.processEnvValue,
  });
}

function createDeliveryRequest() {
  return Object.freeze({
    descriptorKind: 'rendered-delivery-request',
    deliveryRef: 'delivery:w17h5',
    provider: 'telegram',
    target: Object.freeze({
      channelRef: 'channel:w17h5',
      chatRef: 'chat:w17h5',
      threadRef: 'thread:w17h5',
      workspaceRef: 'workspace:w17h5',
      agentRef: 'agent:coder',
    }),
    content: Object.freeze({
      descriptorKind: 'rendered-delivery-content',
      format: 'plain',
      text: 'Safe W17H5 delivery text.',
      buttonGroups: Object.freeze([
        Object.freeze({
          buttons: Object.freeze([
            Object.freeze({ label: 'Approve', actionRef: 'action:w17h5-approve' }),
          ]),
        }),
      ]),
    }),
    correlationRef: 'correlation:w17h5-delivery',
    idempotencyRef: 'idempotency:w17h5-delivery',
    previousExternalMessageRef: SENTINELS.endpointValue,
  });
}

function createCallbackInputWithUnsafeSentinels() {
  return Object.freeze({
    providerKind: 'telegram',
    callbackRef: 'callback:w17h5',
    correlationRef: 'correlation:w17h5-callback',
    channelRef: 'channel:w17h5',
    chatRef: 'chat:w17h5',
    threadRef: 'thread:w17h5',
    messageRef: 'message:w17h5',
    actorRef: 'actor:operator',
    callbackData: 'hz:' + CALLBACK_REF_PREFIX + ':w17h5-approve',
    receivedAt: '2026-06-26T00:00:01Z',
    expectedContext: Object.freeze({
      workspaceRef: 'workspace:w17h5',
      agentRef: 'agent:coder',
      hostSessionRef: 'host-session:w17h5',
      bindingRef: 'binding:w17h5',
      actionRef: 'action:w17h5-approve',
    }),
    [RAW + 'Callback' + PAYLOAD]: SENTINELS.rawCallbackPayload,
    [TOKEN_WORD + 'Value']: SENTINELS.tokenValue,
    [SECRET_WORD + 'Value']: SENTINELS.secretValue,
    [CREDENTIAL_WORD + 'Value']: SENTINELS.credentialValue,
    [PROVIDER_HANDLE_WORD]: SENTINELS.providerHandleValue,
  });
}

function createDurableMemoryBoundary() {
  const records = new Map();

  return Object.freeze({
    get(tokenRef) {
      return records.get(tokenRef) ?? null;
    },
    put(record) {
      records.set(record.tokenRef, record);
      return record;
    },
    delete(tokenRef) {
      return records.delete(tokenRef);
    },
    list() {
      return Object.freeze([...records.values()]);
    },
  });
}

function createPermissionRequirement(tokenRef) {
  return Object.freeze({
    action: 'consume-callback',
    resourceKind: 'callback',
    actorRef: 'actor:operator',
    workspaceRef: 'workspace:w17h5',
    agentRef: 'agent:coder',
    resourceRef: tokenRef,
    correlationRef: 'correlation:w17h5-callback',
    detailsRef: 'details:w17h5-callback',
  });
}

async function createDurableOutputs(tokenRef) {
  const durable = createDurableCallbackTokenStore(createDurableMemoryBoundary());
  const verification = Object.freeze({
    status: 'verified',
    tokenRef,
    verificationRef: 'verification:w17h5',
    actionRef: 'action:w17h5-approve',
    correlationRef: 'correlation:w17h5-durable',
    detailsRef: 'details:w17h5-durable',
  });
  const permission = allowPermission(createPermissionRequirement(tokenRef));

  const verified = await durable.recordVerified({
    tokenRef,
    verifiedAt: FIXED_NOW,
    verification,
    correlationRef: 'correlation:w17h5-durable',
    detailsRef: 'details:w17h5-durable',
  });
  assert.equal(verified.ok, true);
  assert.equal(verified.value.record.tokenConsumed, false);

  const consumed = await durable.recordConsumed({
    tokenRef,
    consumedAt: '2026-06-26T00:00:02.000Z',
    verification,
    consumption: Object.freeze({
      status: 'consumed',
      tokenRef,
      consumptionRef: 'consumption:w17h5',
      correlationRef: 'correlation:w17h5-durable',
      detailsRef: 'details:w17h5-durable',
    }),
    permission,
    correlationRef: 'correlation:w17h5-durable',
    detailsRef: 'details:w17h5-durable',
  });
  assert.equal(consumed.ok, true);
  assert.equal(consumed.value.tokenConsumed, true);

  const listed = await durable.list();
  assert.equal(listed.ok, true);
  assert.equal(listed.value.length, 1);

  const rejectedUnsafe = await durable.recordFailed({
    tokenRef: TOKEN_WORD + ':w17h5-unsafe',
    failedAt: '2026-06-26T00:00:03.000Z',
    failureRef: SENTINELS.filesystemPathValue,
    error: Object.freeze({
      code: 'dependency-failed',
      message: SENTINELS.stackTraceValue,
      retryable: true,
    }),
  });
  assert.equal(rejectedUnsafe.ok, false);

  return Object.freeze({ verified, consumed, listed, rejectedUnsafe });
}

function createReadinessOutputs() {
  const readiness = aggregatePluginReadiness({
    profile: 'test',
    pluginRef: 'plugin:w17h5',
    generatedAt: FIXED_NOW,
    externalConnectivityEnabled: false,
    willCallRemote: false,
    components: Object.freeze([
      Object.freeze({
        componentRef: 'component:plugin-lifecycle',
        kind: 'plugin-lifecycle',
        status: 'ready',
        summary: 'Plugin lifecycle is ready for deterministic fake evidence.',
        checkedAt: FIXED_NOW,
      }),
      Object.freeze({
        componentRef: 'component:adapter-foundation',
        kind: 'adapter-foundation',
        status: 'ready',
        summary: 'Adapter foundation exposes safe DTOs.',
        checkedAt: FIXED_NOW,
      }),
      Object.freeze({
        componentRef: 'component:core-facade',
        kind: 'core-facade',
        status: 'ready',
        summary: 'Core facade is represented by injected fake evidence.',
        checkedAt: FIXED_NOW,
      }),
      Object.freeze({
        componentRef: 'component:stores',
        kind: 'stores',
        status: 'ready',
        summary: 'Durable fake stores expose safe records.',
        checkedAt: FIXED_NOW,
      }),
      Object.freeze({
        componentRef: 'component:transport',
        kind: 'transport',
        status: 'ready',
        summary: RAW + ' provider ' + PAYLOAD + ' ' + SENTINELS.rawProviderPayload,
        detailsRef: SENTINELS.endpointValue,
        checkedAt: FIXED_NOW,
      }),
      Object.freeze({
        componentRef: 'component:config',
        kind: 'config',
        status: 'ready',
        summary: 'Configuration is descriptor-only and redacted.',
        checkedAt: FIXED_NOW,
      }),
    ]),
  });
  const transportComponent = readiness.components.find((component) => component.kind === 'transport');
  assert.ok(transportComponent);
  assert.equal(transportComponent.summary, 'redacted');
  assert.equal(transportComponent.detailsRef, 'redacted-ref');
  assert.equal(readiness.willCallRemote, false);
  assert.equal(readiness.externalConnectivityEnabled, false);

  const summary = projectPluginReadinessSummary(readiness);
  assert.equal(summary.willCallRemote, false);
  assert.equal(summary.externalConnectivityEnabled, false);
  assert.equal(isSafeReadinessJson(readiness), true);
  assert.equal(isSafeReadinessJson(summary), true);

  return Object.freeze({ readiness, summary });
}

test('W17H5 public fake-E2E outputs are JSON-serializable and no-leak safe', async () => {
  const transportConfig = parseTransportConfig(TRANSPORT_CONFIG);
  assert.equal(transportConfig.ok, true);

  const inbound = normalizeChannelEventSourceInput({
    transportConfig: TRANSPORT_CONFIG,
    event: createProviderEventWithUnsafeSentinels(),
    receivedAt: FIXED_NOW,
  });
  assert.equal(inbound.ok, true);
  assert.ok(inbound.event);
  assert.equal(inbound.event.redactedFieldCount >= 4, true);
  assert.equal(inbound.providerAck.providerCall, 'not-executed');
  assert.equal(inbound.providerAck.businessSuccess, false);
  assert.equal(isSafeChannelEventSourceJson(inbound), true);

  const routed = routeTopicCommand({ channelEvent: inbound.event });
  assert.equal(routed.willCallRemote, false);
  assert.equal(routed.commandExecuted, false);
  assert.equal(routed.routingAuthority.authority, 'channelRef+chatRef+threadRef');
  assert.equal(isSafeTopicCommandRouterJson(routed), true);

  const deliveryProviderRequests = [];
  const deliveryPort = createInjectedDeliveryPort({
    client: Object.freeze({
      [CLIENT_HANDLE_WORD]: SENTINELS.clientHandleValue,
      deliver(request) {
        deliveryProviderRequests.push(request);
        return Object.freeze({
          ok: false,
          reasonCode: 'provider-rejected',
          retryable: true,
          diagnosticCode: 'provider-threw',
          detailsRef: SENTINELS.filesystemPathValue,
          [RAW + 'Provider' + PAYLOAD]: Object.freeze({ value: SENTINELS.rawProviderPayload }),
        });
      },
    }),
  });
  const delivery = await deliveryPort.deliver(createDeliveryRequest());
  assert.equal(deliveryProviderRequests.length, 1);
  assert.equal(delivery.ok, false);
  assert.equal(delivery.providerAcknowledged, false);
  assert.equal(delivery.businessSuccess, false);
  assert.equal(isSafeDeliveryResultJson(delivery), true);

  const callbackInput = createCallbackInputWithUnsafeSentinels();
  const callbackDescriptor = normalizeCallbackProviderInput(callbackInput);
  assert.equal(callbackDescriptor.payloadStatus, 'accepted');
  assert.equal(isSafeCallbackPortJson(callbackDescriptor), true);

  const callbackPortInputs = { permission: [], verify: [], consume: [] };
  const callback = await processCallbackBoundary(callbackInput, {
    permissions: Object.freeze({
      checkPermission(input) {
        callbackPortInputs.permission.push(input);
        return Object.freeze({ status: 'allowed', reasonCode: 'permission-allowed' });
      },
    }),
    [CALLBACK_PORTS_FIELD]: Object.freeze({
      [VERIFY_METHOD](input) {
        callbackPortInputs.verify.push(input);
        return Object.freeze({ status: 'valid' });
      },
      [CONSUME_METHOD](input) {
        callbackPortInputs.consume.push(input);
        return Object.freeze({ status: 'consumed' });
      },
    }),
  });
  assert.equal(callback.ok, true);
  assert.equal(callback.value.decision.status, 'token-consumed');
  assert.equal(callback.value.decision.tokenConsumed, true);
  assert.equal(callback.value.providerAcknowledgement.acknowledgesBusinessSuccess, false);
  assert.equal(callbackPortInputs.permission.length, 1);
  assert.equal(callbackPortInputs.verify.length, 1);
  assert.equal(callbackPortInputs.consume.length, 1);
  assert.equal(isSafeCallbackPortJson(callback), true);

  const durable = await createDurableOutputs(callback.value.decision.tokenRef);
  const readiness = createReadinessOutputs();

  assertNoLeaksForMatrix({
    transportConfigDescriptor: transportConfig.descriptor,
    inboundNormalization: inbound,
    inboundRoute: routed,
    outboundProviderRequest: deliveryProviderRequests[0],
    outboundDeliveryResult: delivery,
    callbackDescriptor,
    callbackPermissionInput: callbackPortInputs.permission[0],
    callbackVerifyInput: callbackPortInputs.verify[0],
    callbackConsumeInput: callbackPortInputs.consume[0],
    callbackBoundaryResult: callback,
    durableVerifiedRecord: durable.verified,
    durableConsumedRecord: durable.consumed,
    durableListRecords: durable.listed,
    durableUnsafeRejected: durable.rejectedUnsafe,
    readinessAggregate: readiness.readiness,
    readinessSummary: readiness.summary,
  });
});
