import test from 'node:test';
import assert from 'node:assert/strict';

import {
  exportParticipantListCsv,
  getParticipantSlotsInWindow,
  groupParticipantSlotsByTime,
  sampleParticipantSlotConfirmations,
} from '../packages/shared/src/index';

test('Phase 6: participant slots are grouped by allocated time block', () => {
  const groups = groupParticipantSlotsByTime(sampleParticipantSlotConfirmations);

  assert.equal(Object.keys(groups).length, 1);
  assert.equal(groups[`${sampleParticipantSlotConfirmations[0].slotStartAt}-${sampleParticipantSlotConfirmations[0].slotEndAt}`][0].programName, 'Singing Competition');
});

test('Phase 6: participant list windows filter by the allocated slot period', () => {
  const filtered = getParticipantSlotsInWindow(
    sampleParticipantSlotConfirmations,
    '2026-10-06T18:00:00+05:30',
    '2026-10-06T19:30:00+05:30',
  );

  assert.equal(filtered.length, 1);
});

test('Phase 6: CSV export contains headers and participant data', () => {
  const csv = exportParticipantListCsv(sampleParticipantSlotConfirmations);

  assert.ok(csv.includes('Event,Program,Venue,Start time,End time,Status'));
  assert.ok(csv.includes('Durga Puja 2026'));
  assert.ok(csv.includes('Singing Competition'));
});
