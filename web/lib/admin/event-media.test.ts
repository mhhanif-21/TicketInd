import { describe, expect, it } from 'vitest';
import type { AdminEventDetail } from '@/lib/admin/types';
import {
  makeMediaCover,
  mediaItemsFromEvent,
  moveMediaItem,
  validateMediaItems,
  type AdminMediaItem,
  type RemoteMediaItem,
} from '@/lib/admin/event-media';

function eventDetail(overrides: Partial<AdminEventDetail> = {}): AdminEventDetail {
  return {
    id: 'event-1',
    name: 'Event',
    slug: 'event',
    description: null,
    location: 'Venue',
    date: '2026-11-12T09:00:00.000Z',
    posterUrl: null,
    posterAspectMode: 'landscape',
    capacity: 100,
    registrationMode: 'Auto-Accept',
    status: 'Draft',
    whatsapp_group_url: null,
    public_registration_url: null,
    public_qr_code_url: null,
    volunteer_pin: null,
    media: [],
    ...overrides,
  };
}

function remote(id: string, role: 'cover' | 'gallery', order: number): RemoteMediaItem {
  return {
    key: `remote-${id}`,
    kind: 'remote',
    id,
    publicUrl: `https://cdn.test/${id}`,
    role,
    ...(id === 'legacy-cover' ? { legacy: true } : {}),
    ...(role === 'gallery' ? { displayOrder: order } : {}),
  } as RemoteMediaItem;
}

describe('event media draft helpers', () => {
  it('orders the cover first and gallery by display order', () => {
    const items = mediaItemsFromEvent(eventDetail({
      posterUrl: 'https://cdn.test/legacy',
      media: [
        { id: 'gallery-2', role: 'gallery', displayOrder: 1, publicUrl: 'https://cdn.test/g2' },
        { id: 'cover-1', role: 'cover', displayOrder: 0, publicUrl: 'https://cdn.test/cover' },
        { id: 'gallery-1', role: 'gallery', displayOrder: 0, publicUrl: 'https://cdn.test/g1' },
      ],
    }));

    expect(items.map((item) => item.kind === 'remote' ? item.id : item.key)).toEqual([
      'cover-1',
      'gallery-1',
      'gallery-2',
    ]);
    expect(items.some((item) => item.kind === 'remote' && item.legacy)).toBe(false);
  });

  it('creates a legacy cover when only posterUrl exists', () => {
    const items = mediaItemsFromEvent(eventDetail({
      posterUrl: 'https://cdn.test/legacy',
    }));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'remote',
      id: 'legacy-cover',
      role: 'cover',
      legacy: true,
    });
  });

  it('moves items and can promote any image to cover', () => {
    const items: AdminMediaItem[] = [
      remote('a', 'cover', 0),
      remote('b', 'gallery', 0),
      remote('c', 'gallery', 1),
    ];

    expect(moveMediaItem(items, 'remote-c', -1).map((item) => (
      item.kind === 'remote' ? item.id : item.key
    ))).toEqual(['a', 'c', 'b']);

    expect(makeMediaCover(items, 'remote-c').map((item) => (
      item.kind === 'remote' ? item.id : item.key
    ))).toEqual(['c', 'b']);
  });

  it('drops a legacy cover once another image becomes the cover', () => {
    const items: AdminMediaItem[] = [
      remote('legacy-cover', 'cover', 0),
      remote('g1', 'gallery', 0),
    ];
    expect(makeMediaCover(items, 'remote-g1').map((item) => (
      item.kind === 'remote' ? item.id : item.key
    ))).toEqual(['g1']);
  });

  it('validates the poster count', () => {
    expect(validateMediaItems([])).toBeTruthy();
    expect(validateMediaItems([remote('a', 'cover', 0)])).toBeNull();
    expect(validateMediaItems(Array.from({ length: 6 }, (_, index) => (
      remote(`m-${index}`, index === 0 ? 'cover' : 'gallery', index)
    )))).toContain('5');
  });
});
