import test from 'node:test';
import assert from 'node:assert/strict';

import { checkNominationEligibility, type ProgramRecord } from '../packages/shared/src/index';

const now = new Date('2026-10-05T12:00:00+05:30');

function publishedOpenProgram(overrides: Partial<ProgramRecord> = {}): Pick<ProgramRecord, 'id' | 'status' | 'nominationOpenAt' | 'nominationCloseAt'> {
  return {
    id: 'prog-1',
    status: 'PUBLISHED',
    nominationOpenAt: '2026-10-01T00:00:00+05:30',
    nominationCloseAt: '2026-10-20T23:59:00+05:30',
    ...overrides,
  };
}

test('Phase 9: a resident may nominate for an open, published program', () => {
  const result = checkNominationEligibility({
    program: publishedOpenProgram(),
    existingNominations: [],
    at: now,
  });
  assert.deepEqual(result, { ok: true });
});

test('Phase 9: nomination is rejected when the program is not published', () => {
  const result = checkNominationEligibility({
    program: publishedOpenProgram({ status: 'DRAFT' }),
    existingNominations: [],
    at: now,
  });
  assert.deepEqual(result, { ok: false, reason: 'NOT_PUBLISHED' });
});

test('Phase 9: nomination is rejected before the window opens', () => {
  const result = checkNominationEligibility({
    program: publishedOpenProgram({ nominationOpenAt: '2026-10-10T00:00:00+05:30' }),
    existingNominations: [],
    at: now,
  });
  assert.deepEqual(result, { ok: false, reason: 'WINDOW_CLOSED' });
});

test('Phase 9: nomination is rejected after the window closes', () => {
  const result = checkNominationEligibility({
    program: publishedOpenProgram({ nominationCloseAt: '2026-09-30T23:59:00+05:30' }),
    existingNominations: [],
    at: now,
  });
  assert.deepEqual(result, { ok: false, reason: 'WINDOW_CLOSED' });
});

test('Phase 9: nomination is rejected when the resident already has an active nomination for that program', () => {
  const result = checkNominationEligibility({
    program: publishedOpenProgram(),
    existingNominations: [{ programId: 'prog-1', status: 'PENDING' }],
    at: now,
  });
  assert.deepEqual(result, { ok: false, reason: 'ALREADY_NOMINATED' });
});

test('Phase 9: a duplicate nomination is still rejected for approved/waitlisted/slot-allocated statuses', () => {
  for (const status of ['APPROVED', 'WAITLISTED', 'SLOT_ALLOCATED', 'COMPLETED']) {
    const result = checkNominationEligibility({
      program: publishedOpenProgram(),
      existingNominations: [{ programId: 'prog-1', status }],
      at: now,
    });
    assert.deepEqual(result, { ok: false, reason: 'ALREADY_NOMINATED' }, `status ${status}`);
  }
});

test('Phase 9: a rejected or cancelled prior nomination does not block a new nomination', () => {
  for (const status of ['REJECTED', 'CANCELLED']) {
    const result = checkNominationEligibility({
      program: publishedOpenProgram(),
      existingNominations: [{ programId: 'prog-1', status }],
      at: now,
    });
    assert.deepEqual(result, { ok: true }, `status ${status}`);
  }
});

test('Phase 9: an active nomination for a different program does not block this one', () => {
  const result = checkNominationEligibility({
    program: publishedOpenProgram(),
    existingNominations: [{ programId: 'prog-2', status: 'PENDING' }],
    at: now,
  });
  assert.deepEqual(result, { ok: true });
});
