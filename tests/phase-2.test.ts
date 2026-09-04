import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isNominationWindowOpen,
  sampleEvents,
  samplePrograms,
} from '../packages/shared/src/index';

test('Phase 2: published events and programs are seeded for browsing', () => {
  assert.ok(sampleEvents.length >= 1);
  assert.ok(samplePrograms.length >= 1);

  const publishedEvent = sampleEvents.find((event) => event.status === 'PUBLISHED');
  assert.ok(publishedEvent);
  assert.equal(publishedEvent?.title, 'Durga Puja 2026');
});

test('Phase 2: nomination window opens only within configured dates', () => {
  const program = samplePrograms[0];

  assert.equal(
    isNominationWindowOpen(program, new Date('2026-09-10T12:00:00+05:30')),
    true,
  );

  assert.equal(
    isNominationWindowOpen(program, new Date('2026-09-21T12:00:00+05:30')),
    false,
  );
});

test('Phase 2: un-published programs are not open for nomination', () => {
  const draftProgram = {
    status: 'DRAFT',
    nominationOpenAt: '2026-09-01T00:00:00+05:30',
    nominationCloseAt: '2026-09-30T23:59:00+05:30',
  } as const;

  assert.equal(isNominationWindowOpen(draftProgram), false);
});
