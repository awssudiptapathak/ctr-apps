export interface FeedEvent {
  id: string;
  year: number;
  title: string;
  description: string | null;
  venue: string | null;
  startAt: string;
  endAt: string;
  status: string;
}

export interface FeedProgram {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  rules: string | null;
  maxParticipants: number;
  nominationOpenAt: string | null;
  nominationCloseAt: string | null;
  status: string;
  event: FeedEvent | null;
}

export interface FeedSchedule {
  id: string;
  startAt: string;
  endAt: string;
  venue: string;
  status: string;
  programId: string;
  programName: string;
  eventId: string;
  eventTitle: string;
}

export interface GalleryImage {
  id: string;
  title: string | null;
  caption: string | null;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  flatNo: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: string;
  onboardingCompleted: boolean;
}

export interface AllocatedSlot {
  id: string;
  programId: string;
  nominationId: string;
  startAt: string;
  endAt: string;
  venue: string;
  status: string;
}

export interface Nomination {
  id: string;
  programId: string;
  userId: string;
  participantName: string;
  participantPhone: string | null;
  participantFlatNo: string | null;
  participantAge: number | null;
  performanceMode: 'SOLO' | 'GROUP' | null;
  performanceType: string | null;
  probableTimeMinutes: number | null;
  performanceSummary: string | null;
  photoData: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  allocatedSlot: AllocatedSlot | null;
}
