import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApiError, adminFetch } from '@/lib/admin/api';
import {
  EventMediaSyncError,
  syncExistingEventMedia,
  type AdminMediaItem,
  type MediaSyncState,
  type RemoteMediaItem,
} from '@/lib/admin/event-media';
import type { AdminEventDetail } from '@/lib/admin/types';

vi.mock('@/lib/admin/api', () => ({
  adminFetch: vi.fn(),
}));

const fetchMock = vi.mocked(adminFetch);

function eventDetail(media: AdminEventDetail['media']): AdminEventDetail {
  return {
    id: 'event-1',
    name: 'Event',
    slug: 'event',
    description: null,
    location: 'Venue',
    date: '2026-11-12T09:00:00.000Z',
    posterUrl: media?.find((item) => item.role === 'cover')?.publicUrl ?? null,
    posterAspectMode: 'landscape',
    capacity: 100,
    registrationMode: 'Auto-Accept',
    status: 'Draft',
    whatsapp_group_url: null,
    public_registration_url: null,
    public_qr_code_url: null,
    volunteer_pin: null,
    media,
  };
}

function remoteItem(id: string, role: 'cover' | 'gallery'): RemoteMediaItem {
  return {
    key: `remote-${id}`,
    kind: 'remote',
    id,
    publicUrl: `https://cdn.test/${id}`,
    role,
  };
}

function localItem(name: string): AdminMediaItem {
  return {
    key: `local-${name}`,
    kind: 'local',
    file: new File(['image-bytes'], `${name}.jpg`, { type: 'image/jpeg' }),
    previewUrl: `blob:test/${name}`,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('syncExistingEventMedia', () => {
  it('uploads a local cover, appends gallery files, and persists final order', async () => {
    let eventReads = 0;
    const replaceOrders: string[][] = [];

    fetchMock.mockImplementation((async (path: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (path === '/api/v1/events/event-1' && method === 'GET') {
        eventReads += 1;
        return {
          data: eventReads === 1
            ? eventDetail([
              { id: 'cover-new', role: 'cover', displayOrder: 0, publicUrl: 'https://cdn.test/new-cover' },
              { id: 'g1', role: 'gallery', displayOrder: 0, publicUrl: 'https://cdn.test/g1' },
            ])
            : eventDetail([
              { id: 'cover-new', role: 'cover', displayOrder: 0, publicUrl: 'https://cdn.test/new-cover' },
              { id: 'g1', role: 'gallery', displayOrder: 0, publicUrl: 'https://cdn.test/g1' },
              { id: 'g2', role: 'gallery', displayOrder: 1, publicUrl: 'https://cdn.test/g2' },
            ]),
        };
      }
      if (path === '/api/v1/events/event-1/poster') {
        return { status: 'success', data: { posterUrl: 'https://cdn.test/new-cover', media: [] } };
      }
      if (path === '/api/v1/events/event-1/media' && method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as { gallery_media_ids: string[] };
        replaceOrders.push(body.gallery_media_ids);
        return { status: 'success' };
      }
      if (path === '/api/v1/events/event-1/media/gallery') {
        return {
          status: 'success',
          data: {
            media: [{
              id: 'g2',
              role: 'gallery',
              displayOrder: 1,
              publicUrl: 'https://cdn.test/g2',
            }],
          },
        };
      }
      throw new Error(`Unexpected request ${method} ${path}`);
    }) as never);

    const state: MediaSyncState = { mediaChanged: true };
    const result = await syncExistingEventMedia(
      'event-1',
      [localItem('cover'), remoteItem('g1', 'gallery'), localItem('gallery')],
      state,
    );

    expect(result.map((item) => item.kind === 'remote' ? item.id : item.key)).toEqual([
      'cover-new',
      'g1',
      'g2',
    ]);
    expect(replaceOrders).toEqual([['g1'], ['g1', 'g2']]);
    expect(state.mediaChanged).toBe(false);
  });

  it('promotes a remote gallery item to cover', async () => {
    let promotedId = '';
    fetchMock.mockImplementation((async (path: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (path === '/api/v1/events/event-1/media' && method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as {
          promote_media_id?: string;
          gallery_media_ids?: string[];
        };
        if (body.promote_media_id) promotedId = body.promote_media_id;
        return { status: 'success' };
      }
      if (path === '/api/v1/events/event-1' && method === 'GET') {
        return {
          data: eventDetail([
            { id: 'g1', role: 'cover', displayOrder: 0, publicUrl: 'https://cdn.test/g1' },
          ]),
        };
      }
      throw new Error(`Unexpected request ${method} ${path}`);
    }) as never);

    const state: MediaSyncState = { mediaChanged: true };
    const result = await syncExistingEventMedia(
      'event-1',
      [remoteItem('g1', 'gallery')],
      state,
    );

    expect(promotedId).toBe('g1');
    expect(result[0]).toMatchObject({ kind: 'remote', id: 'g1', role: 'cover' });
  });

  it('keeps local gallery files available when an append fails', async () => {
    fetchMock.mockImplementation((async (path: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (path === '/api/v1/events/event-1/media' && method === 'PATCH') {
        return { status: 'success' };
      }
      if (path === '/api/v1/events/event-1/media/gallery') {
        throw new AdminApiError(500, 'Upload failed');
      }
      throw new Error(`Unexpected request ${method} ${path}`);
    }) as never);

    const state: MediaSyncState = { mediaChanged: true };
    const items: AdminMediaItem[] = [
      remoteItem('cover', 'cover'),
      localItem('gallery'),
    ];

    await expect(syncExistingEventMedia('event-1', items, state)).rejects.toBeInstanceOf(
      EventMediaSyncError,
    );

    try {
      await syncExistingEventMedia('event-1', items, state);
    } catch (error) {
      expect(error).toBeInstanceOf(EventMediaSyncError);
      expect((error as EventMediaSyncError).items[1]).toMatchObject({
        kind: 'local',
        key: 'local-gallery',
      });
    }
  });
});
