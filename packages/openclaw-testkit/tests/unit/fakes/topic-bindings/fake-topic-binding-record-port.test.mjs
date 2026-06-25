import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFakeDeterministicTopicBindingRef,
  createFakeTopicBindingKeyId,
  createFakeTopicBindingRecord,
} from '../../../../dist/topic-bindings/topic-binding-fixtures.js';
import { createFakeTopicBindingRecordPort } from '../../../../dist/fakes/topic-bindings/fake-topic-binding-record-port.js';
import { createTopicBindingRecordStore } from '../../../../../openclaw-adapter/dist/storage/topic-bindings/topic-binding-record-store.js';

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

test('fixture records are deterministic and do not use display title for canonical refs', () => {
  const first = createFakeTopicBindingRecord({ display: { topicTitle: 'Coder Topic' } });
  const renamed = createFakeTopicBindingRecord({ display: { topicTitle: 'Renamed Topic' } });

  assert.equal(first.bindingRef, createFakeDeterministicTopicBindingRef(first.bindingKey));
  assert.equal(renamed.bindingRef, first.bindingRef);
  assert.equal(createFakeTopicBindingKeyId(renamed.bindingKey), createFakeTopicBindingKeyId(first.bindingKey));
  assert.equal(renamed.bindingRef.includes('Renamed'), false);
});

test('fake topic binding record port stores cloned records sorted by binding key', () => {
  const first = createFakeTopicBindingRecord({
    bindingKey: { channelRef: 'telegram-channel:a-channel' },
    target: { workspaceRef: 'workspace:a' },
  });
  const second = createFakeTopicBindingRecord({
    bindingKey: { channelRef: 'telegram-channel:z-channel' },
    target: { workspaceRef: 'workspace:z' },
  });
  const fake = createFakeTopicBindingRecordPort([second, first]);

  const listed = fake.port.list();
  assert.deepEqual(listed.map((record) => record.bindingKey.channelRef), [
    'telegram-channel:a-channel',
    'telegram-channel:z-channel',
  ]);
  assert.deepEqual(fake.port.getByBindingRef(first.bindingRef), first);
  assert.deepEqual(fake.port.getByBindingKey(createFakeTopicBindingKeyId(first.bindingKey)), first);
  assert.notEqual(fake.port.getByBindingRef(first.bindingRef), first);
});

test('fake port composes with adapter topic binding store and preserves replay idempotency', async () => {
  const fake = createFakeTopicBindingRecordPort();
  const store = createTopicBindingRecordStore({ records: fake.port });
  const first = createFakeTopicBindingRecord();
  const updated = createFakeTopicBindingRecord({
    version: 2,
    updatedAt: '2026-06-25T00:01:00.000Z',
  });

  const created = await store.upsert(first);
  const replayed = await store.upsert(first);
  const updateDecision = await store.upsert(updated);

  assert.equal(created.status, 'created');
  assert.equal(replayed.status, 'replayed');
  assert.equal(updateDecision.status, 'updated');
  assert.equal(fake.getPutCount(), 2);
  assert.deepEqual(await store.getByBindingRef(first.bindingRef), updated);
});

test('fake port rejects unsafe record fields and keeps prior state unchanged', () => {
  const safe = createFakeTopicBindingRecord();
  const fake = createFakeTopicBindingRecordPort([safe]);
  const unsafeFieldName = ['raw', 'Callback'].join('');
  const unsafe = {
    ...cloneJson(safe),
    bindingRef: 'topic-binding:unsafe-record',
    [unsafeFieldName]: { provider: 'unsafe' },
  };

  assert.throws(
    () => fake.port.put(unsafe),
    /unsafe provider/u,
  );
  assert.equal(fake.getPutCount(), 1);
  assert.deepEqual(fake.getSnapshot(), [safe]);
});

test('fake port delete is deterministic and does not fabricate missing records', () => {
  const safe = createFakeTopicBindingRecord();
  const fake = createFakeTopicBindingRecordPort([safe]);

  assert.equal(fake.port.deleteByBindingRef('topic-binding:missing'), false);
  assert.equal(fake.getDeleteCount(), 0);
  assert.equal(fake.port.deleteByBindingRef(safe.bindingRef), true);
  assert.equal(fake.getDeleteCount(), 1);
  assert.equal(fake.port.getByBindingRef(safe.bindingRef), null);
  assert.deepEqual(fake.port.list(), []);
});
