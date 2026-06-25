import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const deliverySourcePath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'delivery-port.ts');
const packageRootPath = path.join(repoRoot, 'packages', 'openclaw-telegram-transport', 'src', 'index.ts');

function readUtf8(filePath) {
  return readFileSync(filePath, 'utf8');
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

test('W14C delivery port is a leaf module and is not exported from package root', () => {
  assert.equal(existsSync(deliverySourcePath), true, 'delivery-port.ts should exist');
  const packageRoot = readUtf8(packageRootPath);

  assert.doesNotMatch(packageRoot, /delivery-port/u, 'W14C leaf must not update the package root before W14G fan-in');
  assert.doesNotMatch(packageRoot, /RenderedDeliveryRequest|createInjectedDeliveryPort|deliverRenderedRequest/u);
});

test('W14C delivery port has no provider SDK imports or real network/runtime calls', () => {
  const source = readUtf8(deliverySourcePath);
  const forbiddenImportPatterns = [
    /from\s+['"]@openclaw\//u,
    /from\s+['"]openclaw(?:\/|['"])/u,
    /from\s+['"]telegraf(?:\/|['"])/u,
    /from\s+['"]grammy(?:\/|['"])/u,
    /from\s+['"]telegram(?:\/|['"])/u,
    /from\s+['"]node:https?['"]/u,
    /from\s+['"]node:net['"]/u,
    /from\s+['"]node:tls['"]/u,
    /from\s+['"]ws['"]/u,
    /hazeteam-core\/src/u,
    /hazeteam-core\/dist/u,
  ];
  const forbiddenRuntimePatterns = [
    /\bfetch\s*\(/u,
    /\bWebSocket\s*\(/u,
    /\bprocess\.env\b/u,
    /\bcreateServer\s*\(/u,
    /\.listen\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\bsetTimeout\s*\(/u,
    /registerWebhook/u,
    /startPolling/u,
  ];

  for (const pattern of forbiddenImportPatterns) {
    assert.doesNotMatch(source, pattern, `delivery port imports forbidden module ${pattern}`);
  }

  for (const pattern of forbiddenRuntimePatterns) {
    assert.doesNotMatch(source, pattern, `delivery port performs forbidden runtime work ${pattern}`);
  }
});

test('W14C delivery port does not expose raw provider failure or identity fields', () => {
  const source = readUtf8(deliverySourcePath);
  const forbiddenPublicOutputFields = [
    /\brawProviderResponse\b/u,
    /\brawDeliveryResponse\b/u,
    /\bproviderResponse\b/u,
    /\bresponseBody\b/u,
    /\brequestBody\b/u,
    /\bstack\b/u,
    /\bendpoint\b/u,
    /\bchatId\b/u,
    /\bthreadId\b/u,
    /\bproviderPayload\b/u,
    /\bpayload\b/u,
  ];

  assert.match(source, /DeliveryFailureReasonCode/u, 'delivery port should expose safe reason codes');
  assert.match(source, /businessSuccess:\s*false/u, 'delivery result should not equate provider ack with business success');

  for (const pattern of forbiddenPublicOutputFields) {
    assert.doesNotMatch(source, pattern, `delivery port exposes unsafe output field ${pattern}`);
  }
});

test('W14C delivery execution is reachable only through the injected client boundary', () => {
  const source = readUtf8(deliverySourcePath);

  assert.equal(countMatches(source, /options\.client\.deliver\(/gu), 1, 'provider call must be a single injected-client invocation');
  assert.equal(countMatches(source, /\bnew\s+[A-Z][A-Za-z0-9]*(?:Client|Bot|Api|Sdk)\b/gu), 0, 'delivery port must not construct provider clients');
  assert.doesNotMatch(source, /sendMessage\s*\(/u, 'delivery port must not expose SDK-shaped send calls');
  assert.doesNotMatch(source, /deliverMessage\s*\(/u, 'delivery port must not expose production delivery execution outside the injected boundary');
});
