import axios from 'axios';
import type { Event, TimeSlot, Participant, ParticipantAvailability } from '@scheduler/shared';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL, 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const createEvent = async (eventData: Partial<Event>, participantsEmails: string[]): Promise<Event> => {
  const { data } = await api.post('/events', { eventData, participantsEmails });
  return data;
};

export const getUserEvents = async (userId: string): Promise<Event[]> => {
  const { data } = await api.get(`/events/user/${userId}`);
  return data;
};

export const getEvent = async (id: string): Promise<{ event: Event, participants: Participant[], timeSlots: TimeSlot[] }> => {
  const { data } = await api.get(`/events/${id}`);
  return data;
};

export const addParticipant = async (eventId: string, email: string): Promise<Participant> => {
  const { data } = await api.post(`/events/${eventId}/participants`, { email });
  return data;
};

export const addGuest = async (eventId: string, name: string): Promise<Participant> => {
  const { data } = await api.post(`/events/${eventId}/participants/guest`, { name });
  return data;
};

export const getEventSlots = async (eventId: string): Promise<TimeSlot[]> => {
  const { data } = await api.get(`/events/${eventId}/slots`);
  return data;
};

export const submitVote = async (
  eventId: string,
  participantId: string,
  timeSlotId: string,
  availability: ParticipantAvailability
): Promise<Participant> => {
  const { data } = await api.post(`/events/${eventId}/vote`, {
    participantId,
    timeSlotId,
    availability,
  });
  return data;
};

export const confirmSlot = async (eventId: string, slotId: string, organizerId: string): Promise<Event> => {
  const { data } = await api.post(`/events/${eventId}/confirm-slot`, { slotId, organizerId });
  return data;
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  await api.delete(`/events/${eventId}`);
};

export const getProfile = async (): Promise<any> => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const updateProfile = async (profileData: any): Promise<any> => {
  const { data } = await api.put('/auth/me', profileData);
  return data;
};

export default api;
