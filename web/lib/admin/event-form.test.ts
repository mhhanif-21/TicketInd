import { describe, expect, it } from 'vitest';
import {
  createEmptyEventDetails,
  defaultEventDateTimeLocal,
  eventDetailsFromEvent,
  toDateTimeLocalValue,
  validateEventDetails,
  type EventDetailsDraft,
} from '@/lib/admin/event-form';

function validDraft(overrides: Partial<EventDetailsDraft> = {}): EventDetailsDraft {
  return {
    name: 'Jakarta Tech Summit',
    location: 'Jakarta Convention Center',
    capacity: '250',
    date: '2026-11-12T09:00',
    description: 'A summit for builders.',
    registrationMode: 'Auto-Accept',
    posterAspectMode: 'landscape',
    whatsappGroupUrl: 'https://chat.whatsapp.com/abc123',
    ...overrides,
  };
}

describe('event form draft', () => {
  it('starts with empty required fields and no date until mounted', () => {
    const draft = createEmptyEventDetails();
    expect(draft.date).toBe('');
    expect(draft.name).toBe('');
    expect(draft.location).toBe('');
    expect(defaultEventDateTimeLocal()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('builds a valid API payload', () => {
    const result = validateEventDetails(validDraft({
      description: '  A summit for builders.  ',
    }));

    expect(result.errors).toEqual({});
    expect(result.payload).toMatchObject({
      name: 'Jakarta Tech Summit',
      location: 'Jakarta Convention Center',
      capacity: 250,
      description: 'A summit for builders.',
      registration_mode: 'Auto-Accept',
      poster_aspect_mode: 'landscape',
      whatsapp_group_url: 'https://chat.whatsapp.com/abc123',
    });
    expect(result.payload?.date).toBe(
      new Date('2026-11-12T09:00').toISOString(),
    );
  });

  it('reports required field errors', () => {
    const result = validateEventDetails(validDraft({
      name: ' ',
      location: '',
      capacity: '0',
      date: '',
    }));

    expect(result.payload).toBeNull();
    expect(result.errors.name).toBeDefined();
    expect(result.errors.location).toBeDefined();
    expect(result.errors.capacity).toBeDefined();
    expect(result.errors.date).toBeDefined();
  });

  it('rejects unsupported WhatsApp hosts and protocols', () => {
    const result = validateEventDetails(validDraft({
      whatsappGroupUrl: 'https://example.com/group',
    }));
    expect(result.payload).toBeNull();
    expect(result.errors.whatsappGroupUrl).toContain('chat.whatsapp.com');
  });

  it('sends an empty optional description as null', () => {
    const result = validateEventDetails(validDraft({ description: '   ' }));
    expect(result.payload?.description).toBeNull();
  });

  it('maps an event detail into editable fields', () => {
    const draft = eventDetailsFromEvent({
      name: 'Event',
      location: 'Venue',
      capacity: 10,
      date: '2026-12-01T10:30:00.000Z',
      description: null,
      registrationMode: 'Manual Review',
      posterAspectMode: 'portrait',
      whatsapp_group_url: 'https://wa.me/628123',
    });

    expect(draft.registrationMode).toBe('Manual Review');
    expect(draft.posterAspectMode).toBe('portrait');
    expect(draft.whatsappGroupUrl).toBe('https://wa.me/628123');
    expect(draft.date).toBe(toDateTimeLocalValue('2026-12-01T10:30:00.000Z'));
  });
});
