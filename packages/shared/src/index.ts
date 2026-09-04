export const APP_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type AppRole = (typeof APP_ROLES)[number];
export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const NOMINATION_STATUSES = ['OPEN', 'PENDING', 'REJECTED', 'CANCELLED', 'APPROVED', 'WAITLISTED', 'SLOT_ALLOCATED', 'COMPLETED'] as const;
export type NominationStatus = (typeof NOMINATION_STATUSES)[number];

export const TICKET_CATEGORIES = ['EVENT', 'NOMINATION', 'TECHNICAL', 'GENERAL', 'OTHER'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface Profile {
  id: string;
  authUserId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  flatNo?: string | null;
  role: AppRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  key: string;
  valueJson: Record<string, unknown> | null;
  updatedAt: string;
}

export interface EventRecord {
  id: string;
  year: number;
  title: string;
  description: string | null;
  venue: string | null;
  startAt: string;
  endAt: string;
  status: EventStatus;
  publishAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramRecord {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  rules: string | null;
  maxParticipants: number;
  nominationOpenAt?: string | null;
  nominationCloseAt?: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NominationRecord {
  id: string;
  programId: string;
  residentId: string;
  status: NominationStatus;
  submittedAt: string;
  comments?: string | null;
}

export interface TimeSlotRecord {
  id: string;
  programId: string;
  nominationId?: string | null;
  startAt: string;
  endAt: string;
  venue: string;
  status: 'BOOKED' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantSlotConfirmation {
  id: string;
  programId: string;
  eventTitle: string;
  programName: string;
  venue: string;
  slotStartAt: string;
  slotEndAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'RESCHEDULE_REQUESTED';
}

export const AUTH_FLOW_STEPS = {
  firstLogin: ['phone-otp', 'profile-setup', 'password-setup'],
  subsequentLogin: ['phone-password'],
  forgotPassword: ['phone-otp', 'new-password'],
} as const;

export const sampleEvents: EventRecord[] = [
  {
    id: 'evt-1',
    year: 2026,
    title: 'Durga Puja 2026',
    description: 'Cultural festival and performance calendar for the community.',
    venue: 'Clubtown Main Hall',
    startAt: '2026-10-05T18:00:00+05:30',
    endAt: '2026-10-10T22:00:00+05:30',
    status: 'PUBLISHED',
    publishAt: '2026-09-01T00:00:00+05:30',
    createdAt: '2026-09-01T00:00:00+05:30',
    updatedAt: '2026-09-01T00:00:00+05:30',
  },
  {
    id: 'evt-2',
    year: 2026,
    title: 'Winter Music Week',
    description: 'Open auditions and community music performances.',
    venue: 'Clubtown Community Stage',
    startAt: '2026-12-10T17:00:00+05:30',
    endAt: '2026-12-15T21:30:00+05:30',
    status: 'DRAFT',
    publishAt: null,
    createdAt: '2026-09-02T00:00:00+05:30',
    updatedAt: '2026-09-02T00:00:00+05:30',
  },
];

export const samplePrograms: ProgramRecord[] = [
  {
    id: 'prog-1',
    eventId: 'evt-1',
    name: 'Singing Competition',
    description: 'Solo and duet vocal performances with age-group categories.',
    rules: 'Open to residents above age 12. Accompaniment must be solo or karaoke.',
    maxParticipants: 20,
    nominationOpenAt: '2026-09-01T00:00:00+05:30',
    nominationCloseAt: '2026-09-20T23:59:00+05:30',
    status: 'PUBLISHED',
    createdAt: '2026-09-01T00:00:00+05:30',
    updatedAt: '2026-09-01T00:00:00+05:30',
  },
  {
    id: 'prog-2',
    eventId: 'evt-1',
    name: 'Dance Competition',
    description: 'Group dance and classical fusion categories.',
    rules: 'Teams of 2-8 members. Costumes should be comfortable and stage-safe.',
    maxParticipants: 16,
    nominationOpenAt: '2026-09-02T00:00:00+05:30',
    nominationCloseAt: '2026-09-25T23:59:00+05:30',
    status: 'PUBLISHED',
    createdAt: '2026-09-02T00:00:00+05:30',
    updatedAt: '2026-09-02T00:00:00+05:30',
  },
];

export const sampleParticipantSlotConfirmations: ParticipantSlotConfirmation[] = [
  {
    id: 'slot-confirm-1',
    programId: 'prog-1',
    eventTitle: 'Durga Puja 2026',
    programName: 'Singing Competition',
    venue: 'Main Hall Stage',
    slotStartAt: '2026-10-06T18:30:00+05:30',
    slotEndAt: '2026-10-06T19:00:00+05:30',
    status: 'PENDING',
  },
];

export function isValidPhoneNumber(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.trim());
}

export function isDuplicateActiveNomination(status: string): boolean {
  return ['PENDING', 'APPROVED', 'WAITLISTED', 'SLOT_ALLOCATED', 'COMPLETED'].includes(status);
}

export function isNominationWindowOpen(
  program: Pick<ProgramRecord, 'nominationOpenAt' | 'nominationCloseAt'> & { status: string },
  at: Date = new Date(),
): boolean {
  if (program.status !== 'PUBLISHED') {
    return false;
  }

  if (!program.nominationOpenAt || !program.nominationCloseAt) {
    return false;
  }

  const openAt = new Date(program.nominationOpenAt).getTime();
  const closeAt = new Date(program.nominationCloseAt).getTime();
  const currentTime = at.getTime();

  return currentTime >= openAt && currentTime <= closeAt;
}

export type NominationSubmitCheck =
  | { ok: true }
  | { ok: false; reason: 'NOT_PUBLISHED' | 'WINDOW_CLOSED' | 'ALREADY_NOMINATED' };

export interface NominationEligibilityProgram {
  id: string;
  status: string;
  nominationOpenAt: string | null;
  nominationCloseAt: string | null;
}

export interface NominationEligibilityInput {
  program: NominationEligibilityProgram;
  existingNominations: Array<{ programId: string; status: string }>;
  at?: Date;
}

export function checkNominationEligibility({
  program,
  existingNominations,
  at = new Date(),
}: NominationEligibilityInput): NominationSubmitCheck {
  if (program.status !== 'PUBLISHED') {
    return { ok: false, reason: 'NOT_PUBLISHED' };
  }

  if (!isNominationWindowOpen(program, at)) {
    return { ok: false, reason: 'WINDOW_CLOSED' };
  }

  const alreadyNominated = existingNominations.some(
    (nomination) =>
      nomination.programId === program.id && isDuplicateActiveNomination(nomination.status),
  );
  if (alreadyNominated) {
    return { ok: false, reason: 'ALREADY_NOMINATED' };
  }

  return { ok: true };
}

export function isValidSlotRange(startAt: string, endAt: string): boolean {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  return Number.isFinite(start) && Number.isFinite(end) && start < end;
}

export function fitsWithinEventWindow(
  eventStartAt: string,
  eventEndAt: string,
  slotStartAt: string,
  slotEndAt: string,
): boolean {
  const eventStart = new Date(eventStartAt).getTime();
  const eventEnd = new Date(eventEndAt).getTime();
  const slotStart = new Date(slotStartAt).getTime();
  const slotEnd = new Date(slotEndAt).getTime();

  return slotStart >= eventStart && slotEnd <= eventEnd;
}

export function buildNotification(type: string, title: string, body: string, data: Record<string, unknown> = {}) {
  return {
    type,
    title,
    body,
    data,
    createdAt: new Date().toISOString(),
  };
}

export function isAnnouncementActive(
  publishAt: string | null,
  expiresAt: string | null,
  at: Date = new Date(),
): boolean {
  const currentTime = at.getTime();

  if (!publishAt) {
    return false;
  }

  const publishTime = new Date(publishAt).getTime();
  const expireTime = expiresAt ? new Date(expiresAt).getTime() : Number.POSITIVE_INFINITY;

  return currentTime >= publishTime && currentTime < expireTime;
}

export function canResolveTicket(status: string): boolean {
  return ['OPEN', 'IN_PROGRESS', 'WAITING_USER'].includes(status);
}

export function isEscalatedPriority(priority: string): boolean {
  return ['HIGH', 'URGENT'].includes(priority);
}

export function createMockWhatsAppMessage(idempotencyKey: string, message: string) {
  return {
    idempotencyKey,
    message,
    provider: 'mock',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
  };
}

export function dedupeMessageKeys(messages: Array<{ idempotencyKey: string }>): Array<{ idempotencyKey: string }> {
  const seen = new Set<string>();

  return messages.filter((message) => {
    if (seen.has(message.idempotencyKey)) {
      return false;
    }

    seen.add(message.idempotencyKey);
    return true;
  });
}

export function getNominationDecisionCounts(nominations: Array<Pick<NominationRecord, 'status'>>) {
  const totals = {
    total: nominations.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    waitlisted: 0,
  };

  nominations.forEach((nomination) => {
    if (nomination.status === 'PENDING') totals.pending += 1;
    if (nomination.status === 'APPROVED') totals.approved += 1;
    if (nomination.status === 'REJECTED') totals.rejected += 1;
    if (nomination.status === 'WAITLISTED') totals.waitlisted += 1;
  });

  return totals;
}

export function generateTimeSlots(
  startAt: string,
  endAt: string,
  durationMinutes: number,
  venue: string,
): Array<Pick<TimeSlotRecord, 'startAt' | 'endAt' | 'venue'>> {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const durationMs = durationMinutes * 60 * 1000;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || durationMinutes <= 0 || durationMs <= 0) {
    return [];
  }

  const slots: Array<Pick<TimeSlotRecord, 'startAt' | 'endAt' | 'venue'>> = [];

  for (let cursor = start; cursor + durationMs <= end; cursor += durationMs) {
    const slotStart = new Date(cursor).toISOString();
    const slotEnd = new Date(cursor + durationMs).toISOString();

    slots.push({ startAt: slotStart, endAt: slotEnd, venue });
  }

  return slots;
}

export function isSlotConflict(
  candidate: Pick<TimeSlotRecord, 'startAt' | 'endAt' | 'venue'>,
  existingSlots: Array<Pick<TimeSlotRecord, 'startAt' | 'endAt' | 'venue'>>,
): boolean {
  const candidateStart = new Date(candidate.startAt).getTime();
  const candidateEnd = new Date(candidate.endAt).getTime();

  if (!Number.isFinite(candidateStart) || !Number.isFinite(candidateEnd) || candidateStart >= candidateEnd) {
    return true;
  }

  return existingSlots.some((slot) => {
    if (slot.venue !== candidate.venue) {
      return false;
    }

    const slotStart = new Date(slot.startAt).getTime();
    const slotEnd = new Date(slot.endAt).getTime();

    return Number.isFinite(slotStart) && Number.isFinite(slotEnd) && candidateStart < slotEnd && candidateEnd > slotStart;
  });
}

export function allocateSlotsForProgram(
  programStartAt: string,
  programEndAt: string,
  durationMinutes: number,
  venue: string,
  totalSlots: number,
): Array<Pick<TimeSlotRecord, 'startAt' | 'endAt' | 'venue'>> {
  const slots = generateTimeSlots(programStartAt, programEndAt, durationMinutes, venue);
  return slots.slice(0, Math.min(totalSlots, slots.length));
}

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';

export interface ReminderTemplate {
  type: 'EVENT_REMINDER' | 'PROGRAM_DEADLINE' | 'SLOT_CONFIRMATION';
  channel: NotificationChannel;
  title: string;
  body: string;
  sendAt: string;
  audience: 'RESIDENT' | 'ADMIN' | 'ALL';
}

export function createReminderTemplate(
  type: ReminderTemplate['type'],
  channel: NotificationChannel,
  title: string,
  body: string,
  sendAt: string,
  audience: ReminderTemplate['audience'] = 'RESIDENT',
): ReminderTemplate {
  return {
    type,
    channel,
    title,
    body,
    sendAt,
    audience,
  };
}

export function isReminderDue(reminder: Pick<ReminderTemplate, 'sendAt'>, at: Date = new Date()): boolean {
  const reminderTime = new Date(reminder.sendAt).getTime();
  const currentTime = at.getTime();

  return Number.isFinite(reminderTime) && currentTime >= reminderTime;
}

export function buildReminderBatch(reminders: ReminderTemplate[]): ReminderTemplate[] {
  return reminders.filter((reminder, index, list) => {
    const duplicate = list.findIndex((candidate) =>
      candidate.type === reminder.type &&
      candidate.channel === reminder.channel &&
      candidate.title === reminder.title &&
      candidate.body === reminder.body &&
      candidate.sendAt === reminder.sendAt,
    );

    return duplicate === index;
  });
}

export function groupParticipantSlotsByTime(confirmations: ParticipantSlotConfirmation[]) {
  return confirmations.reduce<Record<string, ParticipantSlotConfirmation[]>>((accumulator, confirmation) => {
    const groupKey = `${confirmation.slotStartAt}-${confirmation.slotEndAt}`;
    accumulator[groupKey] = accumulator[groupKey] ? [...accumulator[groupKey], confirmation] : [confirmation];
    return accumulator;
  }, {});
}

export function getParticipantSlotsInWindow(
  confirmations: ParticipantSlotConfirmation[],
  startAt: string,
  endAt: string,
): ParticipantSlotConfirmation[] {
  const windowStart = new Date(startAt).getTime();
  const windowEnd = new Date(endAt).getTime();

  return confirmations.filter((confirmation) => {
    const slotStart = new Date(confirmation.slotStartAt).getTime();
    const slotEnd = new Date(confirmation.slotEndAt).getTime();
    return slotStart >= windowStart && slotEnd <= windowEnd;
  });
}

export function exportParticipantListCsv(confirmations: ParticipantSlotConfirmation[]): string {
  const rows = [
    ['Event', 'Program', 'Venue', 'Start time', 'End time', 'Status'],
    ...confirmations.map((confirmation) => [
      confirmation.eventTitle,
      confirmation.programName,
      confirmation.venue,
      new Date(confirmation.slotStartAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      new Date(confirmation.slotEndAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      confirmation.status,
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell).replace(/"/g, '""');
          return /[",\n]/.test(value) ? `"${value}"` : value;
        })
        .join(','),
    )
    .join('\n');
}

export * from './api';
