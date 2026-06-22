import assert from 'node:assert/strict';
import test from 'node:test';

import { OPENCLAW_TESTKIT_PACKAGE } from '../../dist/index.js';

test('@hazeteam/openclaw-testkit exports skeleton-safe metadata', () => {
  assert.equal(OPENCLAW_TESTKIT_PACKAGE.name, '@hazeteam/openclaw-testkit');
  assert.equal(OPENCLAW_TESTKIT_PACKAGE.status, 'skeleton');
  assert.deepEqual(Object.keys(OPENCLAW_TESTKIT_PACKAGE).sort(), ['name', 'status']);
});
