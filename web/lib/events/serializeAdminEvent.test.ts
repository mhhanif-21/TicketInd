import { describe, expect, it } from 'vitest';
import { serializeAdminEvent } from '@/lib/events/serializeAdminEvent';

describe('serializeAdminEvent', () => {
  it('removes server-only PIN hash and creation key fields', () => {
    const safe = serializeAdminEvent({
      id: 'event-1',
      name: 'Event',
      volunteerPin: '123456',
      volunteerPinHash: 'hash',
      creationKey: 'idempotency-key',
      status: 'Draft',
    });

    expect(safe).toMatchObject({
      id: 'event-1',
      name: 'Event',
      volunteerPin: '123456',
      status: 'Draft',
    });
    expect('volunteerPinHash' in safe).toBe(false);
    expect('creationKey' in safe).toBe(false);
  });
});
