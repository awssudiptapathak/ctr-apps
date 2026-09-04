import test from 'node:test';
import assert from 'node:assert/strict';

import { getNominationDecisionCounts, isNominationWindowOpen, samplePrograms } from '../packages/shared/src/index';

test('Phase 3: nomination counts summarize approval pipeline accurately', () => {
  const counts = getNominationDecisionCounts([
    { status: 'PENDING' },
    { status: 'APPROVED' },
    { status: 'WAITLISTED' },
    { status: 'REJECTED' },
    { status: 'APPROVED' },
  ] as Array<{ status: string }>);

  assert.deepEqual(counts, {
    total: 5,
    pending: 1,
    approved: 2,
    rejected: 1,
    waitlisted: 1,
  });
});

test('Phase 3: program nomination windows reflect active festival phases', () => {
  const program = samplePrograms[0];

  assert.equal(isNominationWindowOpen(program, new Date('2026-09-10T12:00:00+05:30')), true);
  assert.equal(isNominationWindowOpen(program, new Date('2026-09-21T12:00:00+05:30')), false);
});

test('Phase 3: a non-published program stays closed for nominations', () => {
  const draftProgram = {
    status: 'DRAFT',
    nominationOpenAt: '2026-09-01T00:00:00+05:30',
    nominationCloseAt: '2026-09-30T23:59:00+05:30',
  } as const;

  assert.equal(isNominationWindowOpen(draftProgram), false);
});
