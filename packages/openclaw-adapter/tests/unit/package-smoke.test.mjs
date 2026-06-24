import assert from 'node:assert/strict';
import test from 'node:test';

import { OPENCLAW_ADAPTER_PACKAGE } from '../../dist/index.js';

test('@hazeteam/openclaw-adapter exports foundation metadata', () => {
  assert.equal(OPENCLAW_ADAPTER_PACKAGE.name, '@hazeteam/openclaw-adapter');
  assert.equal(OPENCLAW_ADAPTER_PACKAGE.status, 'foundation');
  assert.deepEqual(Object.keys(OPENCLAW_ADAPTER_PACKAGE).sort(), ['name', 'status']);
});
