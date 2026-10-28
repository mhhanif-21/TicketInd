import { describe, expect, it } from 'vitest';
import {
  EventValidationError,
  validateEventCreatePayload,
  validateEventUpdatePayload,
} from '@/lib/validation/event';

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Tech Conference 2026',
    capacity: 250,
    registration_mode: 'Auto-Accept',
    location: 'Jakarta Convention Center',
    date: '2026-11-12T09:00:00.000Z',
    description: 'A conference for builders.',
    poster_aspect_mode: 'landscape',
    whatsapp_group_url: null,
    ...overrides,
  };
}

function captureValidationError(run: () => unknown): EventValidationError {
  try {
    run();
  } catch (error) {
    if (error instanceof EventValidationError) return error;
    throw error;
  }
  throw new Error('Expected EventValidationError to be thrown');
}

describe('event slug validation', () => {
  it('generates a slug from the event name', () => {
    const input = validateEventCreatePayload(validPayload());
    expect(input.slug).toBe('tech-conference-2026');
  });

  it('rejects the reserved admin slug on create', () => {
    const error = captureValidationError(() => (
      validateEventCreatePayload(validPayload({ slug: 'admin' }))
    ));
    expect(error.code).toBe('EVENT_SLUG_RESERVED');
    expect(error.field).toBe('slug');
  });

  it('rejects a generated reserved slug', () => {
    const error = captureValidationError(() => (
      validateEventCreatePayload(validPayload({ name: 'Admin' }))
    ));
    expect(error.code).toBe('EVENT_SLUG_RESERVED');
  });

  it('rejects the reserved api slug on update', () => {
    const error = captureValidationError(() => (
      validateEventUpdatePayload({ slug: 'api' })
    ));
    expect(error.code).toBe('EVENT_SLUG_RESERVED');
  });

  it('still accepts ordinary slugs and status updates', () => {
    const update = validateEventUpdatePayload({
      slug: 'admin-summit',
      status: 'Published',
    });
    expect(update.slug).toBe('admin-summit');
    expect(update.status).toBe('Published');
  });
});
