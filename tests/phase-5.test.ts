import test from 'node:test';
import assert from 'node:assert/strict';

import { buildReminderBatch, buildNotification, createReminderTemplate, isReminderDue } from '../packages/shared/src/index';

test('Phase 5: notification payloads are built with audit metadata', () => {
  const notification = buildNotification('EVENT_REMINDER', 'Event reminder', 'Your performance slot starts soon.', { eventId: 'evt-1' });

  assert.equal(notification.type, 'EVENT_REMINDER');
  assert.equal(notification.title, 'Event reminder');
  assert.equal(notification.body, 'Your performance slot starts soon.');
  assert.ok(notification.createdAt);
});

test('Phase 5: reminders become due when their scheduled timestamp is reached', () => {
  const reminder = createReminderTemplate(
    'EVENT_REMINDER',
    'WHATSAPP',
    'Puja reminder',
    'Residents should be ready in 30 minutes.',
    '2026-09-10T18:00:00+05:30',
  );

  assert.equal(isReminderDue(reminder, new Date('2026-09-10T18:00:00+05:30')), true);
  assert.equal(isReminderDue(reminder, new Date('2026-09-10T17:45:00+05:30')), false);
});

test('Phase 5: duplicate reminders are reduced to a single dispatch per template', () => {
  const reminders = [
    createReminderTemplate('PROGRAM_DEADLINE', 'EMAIL', 'Submission reminder', 'Please confirm your program entry.', '2026-09-15T18:00:00+05:30'),
    createReminderTemplate('PROGRAM_DEADLINE', 'EMAIL', 'Submission reminder', 'Please confirm your program entry.', '2026-09-15T18:00:00+05:30'),
    createReminderTemplate('PROGRAM_DEADLINE', 'WHATSAPP', 'Submission reminder', 'Please confirm your program entry.', '2026-09-15T18:00:00+05:30'),
  ];

  assert.equal(buildReminderBatch(reminders).length, 2);
});
