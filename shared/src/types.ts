export interface User {
  id: string;
  email: string;
  yandexId?: string;
  vkId?: string;
  timezone: string;
  encryptedTokens?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  bufferMinutes?: number;
  status: 'planning' | 'confirmed' | 'cancelled';
  organizerId: string;
  finalSlotId?: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
}

export interface TimeSlot {
  id: string;
  eventId: string;
  startTime: Date;
  endTime: Date;
  score?: number; // Calculated rank based on participants
  votes?: Vote[];
}

export type ParticipantAvailability = 'available' | 'preferred' | 'unavailable' | 'unknown';

export interface Vote {
  id: string;
  participantId: string;
  timeSlotId: string;
  availability: ParticipantAvailability;
}

export interface Participant {
  id: string;
  eventId: string;
  userId?: string;
  email?: string;
  name?: string;
  availability: ParticipantAvailability;
  comment?: string;
  timeSlotId?: string;
}
