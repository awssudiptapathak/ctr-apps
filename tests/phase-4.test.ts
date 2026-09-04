import test from 'node:test';
import assert from 'node:assert/strict';

import { allocateSlotsForProgram, generateTimeSlots, isSlotConflict } from '../packages/shared/src/index';

test('Phase 4: generated slots respect the event window and duration', () => {
  const slots = generateTimeSlots('2026-10-06T18:00:00+05:30', '2026-10-06T20:00:00+05:30', 30, 'Main Hall');

  assert.equal(slots.length, 4);
  assert.equal(slots[0].startAt, '2026-10-06T12:30:00.000Z');
  assert.equal(slots[3].endAt, '2026-10-06T14:30:00.000Z');
});

test('Phase 4: slot conflict detection prevents overlapping bookings in the same venue', () => {
  const existing = [
    { startAt: '2026-10-06T18:00:00.000Z', endAt: '2026-10-06T18:30:00.000Z', venue: 'Main Hall' },
    { startAt: '2026-10-06T18:30:00.000Z', endAt: '2026-10-06T19:00:00.000Z', venue: 'Main Hall' },
  ];

  assert.equal(
    isSlotConflict({ startAt: '2026-10-06T18:15:00.000Z', endAt: '2026-10-06T18:45:00.000Z', venue: 'Main Hall' }, existing),
    true,
  );

  assert.equal(
    isSlotConflict({ startAt: '2026-10-06T19:00:00.000Z', endAt: '2026-10-06T19:30:00.000Z', venue: 'Main Hall' }, existing),
    false,
  );
});

test('Phase 4: program allocation generates only valid slots for the requested count', () => {
  const slots = allocateSlotsForProgram('2026-10-06T18:00:00+05:30', '2026-10-06T21:00:00+05:30', 45, 'Stage A', 4);

  assert.equal(slots.length, 4);
  assert.equal(slots[0].venue, 'Stage A');
  assert.equal(slots[0].endAt, '2026-10-06T13:15:00.000Z');
});
