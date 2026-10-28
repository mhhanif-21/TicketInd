import { normalizePosterAspectMode, type PosterAspectMode } from '@/lib/events/posterAspect';
import type {
  AdminEvent,
  AdminEventDetail,
  EventRegistrationMode,
} from '@/lib/admin/types';

export interface EventDetailsDraft {
  name: string;
  location: string;
  capacity: string;
  date: string;
  description: string;
  registrationMode: EventRegistrationMode;
  posterAspectMode: PosterAspectMode;
  whatsappGroupUrl: string;
}

export interface EventWritePayload {
  name: string;
  location: string;
  capacity: number;
  date: string;
  description: string | null;
  registration_mode: EventRegistrationMode;
  poster_aspect_mode: PosterAspectMode;
  whatsapp_group_url: string | null;
}

export type EventDetailsErrors = Partial<Record<keyof EventDetailsDraft | 'form', string>>;

const MAX_NAME_LENGTH = 255;
const MAX_LOCATION_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 10_000;
const MAX_CAPACITY = 1_000_000;
const WHATSAPP_GROUP_HOSTS = new Set([
  'chat.whatsapp.com',
  'wa.me',
  'whatsapp.com',
  'www.whatsapp.com',
  'api.whatsapp.com',
]);

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateTimeLocalValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
}

function defaultDateInput(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toDateTimeLocalValue(date);
}

export function defaultEventDateTimeLocal(): string {
  return defaultDateInput();
}

export function createEmptyEventDetails(): EventDetailsDraft {
  return {
    name: '',
    location: '',
    capacity: '',
    date: '',
    description: '',
    registrationMode: 'Auto-Accept',
    posterAspectMode: 'landscape',
    whatsappGroupUrl: '',
  };
}

export function eventDetailsFromEvent(
  event: Pick<
    AdminEvent | AdminEventDetail,
    'name' | 'location' | 'capacity' | 'date' | 'description' | 'registrationMode' | 'posterAspectMode'
  > & { whatsappGroupUrl?: string | null; whatsapp_group_url?: string | null },
): EventDetailsDraft {
  return {
    name: event.name,
    location: event.location,
    capacity: String(event.capacity),
    date: toDateTimeLocalValue(event.date),
    description: event.description ?? '',
    registrationMode: event.registrationMode,
    posterAspectMode: normalizePosterAspectMode(event.posterAspectMode),
    whatsappGroupUrl: event.whatsappGroupUrl ?? event.whatsapp_group_url ?? '',
  };
}

function parseWhatsappGroupUrl(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Enter a valid WhatsApp group URL.');
  }

  if (parsed.protocol !== 'https:' || !WHATSAPP_GROUP_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error('Use an https://chat.whatsapp.com/... or https://wa.me/... link.');
  }

  return parsed.toString();
}

export function validateEventDetails(draft: EventDetailsDraft): {
  payload: EventWritePayload | null;
  errors: EventDetailsErrors;
} {
  const errors: EventDetailsErrors = {};
  const name = draft.name.trim();
  const location = draft.location.trim();
  const description = draft.description.trim();
  const capacity = Number(draft.capacity);

  if (!name) {
    errors.name = 'Event name is required.';
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Event name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  if (!location) {
    errors.location = 'Location is required.';
  } else if (location.length > MAX_LOCATION_LENGTH) {
    errors.location = `Location must be ${MAX_LOCATION_LENGTH} characters or fewer.`;
  }

  if (
    !draft.capacity.trim()
    || !Number.isSafeInteger(capacity)
    || capacity < 1
    || capacity > MAX_CAPACITY
  ) {
    errors.capacity = `Capacity must be a whole number between 1 and ${MAX_CAPACITY}.`;
  }

  const eventDate = draft.date ? new Date(draft.date) : null;
  if (!eventDate || Number.isNaN(eventDate.getTime())) {
    errors.date = 'Select a valid event date and time.';
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  let whatsappGroupUrl: string | null = null;
  try {
    whatsappGroupUrl = parseWhatsappGroupUrl(draft.whatsappGroupUrl);
  } catch (error) {
    errors.whatsappGroupUrl = error instanceof Error
      ? error.message
      : 'Enter a valid WhatsApp group URL.';
  }

  if (Object.keys(errors).length > 0) {
    return { payload: null, errors };
  }

  return {
    errors,
    payload: {
      name,
      location,
      capacity,
      date: eventDate!.toISOString(),
      description: description || null,
      registration_mode: draft.registrationMode,
      poster_aspect_mode: draft.posterAspectMode,
      whatsapp_group_url: whatsappGroupUrl,
    },
  };
}
