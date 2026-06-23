import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTelegramActionButtonDescriptor,
  createTelegramButtonGroupDescriptor,
  createTelegramCardDescriptor,
  createTelegramTextBlock,
  isTelegramCardDescriptor,
} from '../../dist/commands/ui-descriptors.js';
import {
  createCommandDescriptor,
  createCommandDescriptorSet,
  findCommandDescriptor,
  isCommandDescriptor,
} from '../../dist/commands/command-descriptors.js';

function assertNoForbiddenPublicFields(sample) {
  const forbiddenFieldNames = [
    'rawUpdate',
    'telegramUpdate',
    'rawTelegramUpdate',
    'rawOpenClawEvent',
    'rawProviderObject',
    'rawProviderResponse',
    'providerObject',
    'provider',
    'rawCallbackBody',
    'rawError',
    'stack',
    'botToken',
    'apiKey',
    'secret',
    'credential',
    'handler',
    'execute',
    'dispatch',
    'router',
    'toolPayload',
    'rawToolPayload',
    'approvalPayload',
  ];

  const queue = [sample];
  while (queue.length > 0) {
    const current = queue.pop();

    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const fieldName of forbiddenFieldNames) {
      assert.equal(fieldName in current, false, `sample exposes forbidden field ${fieldName}`);
    }

    for (const value of Object.values(current)) {
      if (value !== null && typeof value === 'object') {
        queue.push(value);
      }
    }
  }
}

const approveButton = createTelegramActionButtonDescriptor({
  label: ' Approve ',
  payload: 'token:approve-1',
  style: 'primary',
});

const rejectButton = createTelegramActionButtonDescriptor({
  label: 'Reject',
  payload: 'hz:token:reject-1',
  style: 'danger',
});

test('text block and card descriptor helpers create bounded safe DTOs', () => {
  const textBlock = createTelegramTextBlock({
    text: '  Ready\nfor review  ',
    tone: 'strong',
  });
  const card = createTelegramCardDescriptor({
    intent: 'command-help',
    title: '  Review commands  ',
    body: [textBlock],
  });

  assert.deepEqual(textBlock, {
    kind: 'telegram-text-block',
    text: 'Ready for review',
    tone: 'strong',
  });
  assert.deepEqual(card, {
    kind: 'telegram-card-descriptor',
    intent: 'command-help',
    title: 'Review commands',
    body: [textBlock],
  });
  assert.equal(Object.isFrozen(card), true);
  assert.equal(Object.isFrozen(card.body), true);
  assertNoForbiddenPublicFields(card);
});

test('tokenized action button descriptor keeps only opaque hz payload', () => {
  assert.deepEqual(approveButton, {
    kind: 'telegram-action-button-descriptor',
    label: 'Approve',
    payload: 'hz:token:approve-1',
    style: 'primary',
  });
  assert.equal(rejectButton.payload, 'hz:token:reject-1');
  assert.equal(Object.isFrozen(approveButton), true);
  assertNoForbiddenPublicFields(approveButton);
});

test('button group descriptor freezes bounded descriptor buttons', () => {
  const group = createTelegramButtonGroupDescriptor({
    buttons: [approveButton, rejectButton],
  });

  assert.deepEqual(group, {
    kind: 'telegram-button-group-descriptor',
    buttons: [approveButton, rejectButton],
  });
  assert.equal(Object.isFrozen(group), true);
  assert.equal(Object.isFrozen(group.buttons), true);
  assert.throws(() => group.buttons.push(approveButton), TypeError);
  assertNoForbiddenPublicFields(group);
});

test('card descriptor guard accepts safe cards and rejects invalid or raw payload cards', () => {
  const group = createTelegramButtonGroupDescriptor({ buttons: [approveButton] });
  const card = createTelegramCardDescriptor({
    intent: 'action-request',
    title: 'Approve deploy',
    body: [createTelegramTextBlock({ text: 'Deploy production?', tone: 'plain' })],
    buttonGroups: [group],
  });

  assert.equal(isTelegramCardDescriptor(card), true);
  assert.equal(isTelegramCardDescriptor(null), false);
  assert.equal(isTelegramCardDescriptor({}), false);
  assert.equal(
    isTelegramCardDescriptor({
      kind: 'telegram-card-descriptor',
      intent: 'action-request',
      title: 'Unsafe',
      approvalPayload: { approve: true },
    }),
    false,
  );
});

test('ui descriptor helpers reject empty, unbounded, and non-token payload values', () => {
  assert.throws(() => createTelegramTextBlock({ text: '' }), TypeError);
  assert.throws(
    () =>
      createTelegramActionButtonDescriptor({
        label: '',
        payload: 'token:approve-1',
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createTelegramActionButtonDescriptor({
        label: 'x'.repeat(81),
        payload: 'token:approve-1',
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createTelegramActionButtonDescriptor({
        label: 'Approve',
        payload: '{"action":"approve"}',
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createTelegramCardDescriptor({
        title: 'Unsafe',
        body: [createTelegramTextBlock({ text: 'ok' })],
        rawProviderObject: { id: 1 },
      }),
    TypeError,
  );
});

test('command descriptor helper creates safe normalized command contracts', () => {
  const command = createCommandDescriptor({
    name: '/Help',
    title: ' Help ',
    scope: 'topic',
    visibility: 'public',
    description: ' Show topic-aware help ',
    aliases: ['/h'],
    permissionRequirement: {
      action: 'invoke-command',
      resourceKind: 'agent',
      resourceRef: 'agent:coder',
      rawToolPayload: { tool: 'deploy' },
    },
  });

  assert.equal(isCommandDescriptor(command), true);
  assert.equal(command.name, 'help');
  assert.equal(command.title, 'Help');
  assert.equal(command.description, 'Show topic-aware help');
  assert.deepEqual(command.aliases, ['h']);
  assert.deepEqual(command.permissionRequirement, {
    action: 'invoke-command',
    resourceKind: 'agent',
    resourceRef: 'agent:coder',
  });
  assert.equal(Object.isFrozen(command), true);
  assertNoForbiddenPublicFields(command);
});

test('command descriptor set creation validates unique lookup names', () => {
  const help = createCommandDescriptor({
    name: 'help',
    title: 'Help',
    aliases: ['h'],
  });
  const status = createCommandDescriptor({
    name: 'status',
    title: 'Status',
    scope: 'workspace',
    visibility: 'restricted',
  });
  const commandSet = createCommandDescriptorSet({
    commands: [help, status],
    defaultCommandName: '/help',
  });

  assert.equal(commandSet.kind, 'command-descriptor-set');
  assert.equal(commandSet.defaultCommandName, 'help');
  assert.equal(commandSet.commands.length, 2);
  assert.equal(Object.isFrozen(commandSet), true);
  assert.equal(Object.isFrozen(commandSet.commands), true);
  assertNoForbiddenPublicFields(commandSet);

  assert.throws(
    () =>
      createCommandDescriptorSet({
        commands: [help, createCommandDescriptor({ name: 'h', title: 'Duplicate alias' })],
      }),
    TypeError,
  );
});

test('find command descriptor performs lookup only and does not expose router behavior', () => {
  const commandSet = createCommandDescriptorSet({
    commands: [
      createCommandDescriptor({
        name: 'help',
        title: 'Help',
        aliases: ['h'],
      }),
      createCommandDescriptor({
        name: 'status',
        title: 'Status',
      }),
    ],
  });

  assert.equal(findCommandDescriptor(commandSet, '/help')?.name, 'help');
  assert.equal(findCommandDescriptor(commandSet, 'H')?.name, 'help');
  assert.equal(findCommandDescriptor(commandSet, 'status')?.name, 'status');
  assert.equal(findCommandDescriptor(commandSet, 'unknown'), undefined);
  assert.equal(findCommandDescriptor(commandSet, 'unsafe command'), undefined);

  const help = findCommandDescriptor(commandSet, 'help');
  assert.equal('handler' in help, false);
  assert.equal('execute' in help, false);
  assert.equal('dispatch' in help, false);
  assert.equal('router' in help, false);
});

test('command descriptor helper rejects unsafe command names and raw payload fields', () => {
  assert.throws(() => createCommandDescriptor({ name: '', title: 'Empty' }), TypeError);
  assert.throws(() => createCommandDescriptor({ name: 'x'.repeat(33), title: 'Long' }), TypeError);
  assert.throws(() => createCommandDescriptor({ name: 'help now', title: 'Unsafe' }), TypeError);
  assert.throws(
    () =>
      createCommandDescriptor({
        name: 'approve',
        title: 'Approve',
        toolPayload: { action: 'approve' },
      }),
    TypeError,
  );
  assert.equal(isCommandDescriptor({ kind: 'command-descriptor', name: 'bad name' }), false);
});
