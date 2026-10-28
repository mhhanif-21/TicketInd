import { adminFetch } from '@/lib/admin/api';
import type {
  AdminEventDetail,
  AdminEventDetailResponse,
  AdminEventGalleryAppendResponse,
  AdminEventMediaUploadResponse,
  AdminMediaRow,
} from '@/lib/admin/types';

export interface RemoteMediaItem {
  key: string;
  kind: 'remote';
  id: string;
  publicUrl: string;
  role: 'cover' | 'gallery';
  legacy?: boolean;
}

export interface LocalMediaItem {
  key: string;
  kind: 'local';
  file: File;
  previewUrl: string;
}

export type AdminMediaItem = RemoteMediaItem | LocalMediaItem;

let localMediaSequence = 0;

export function createLocalMediaItem(file: File): LocalMediaItem {
  localMediaSequence += 1;
  return {
    key: `local-${Date.now()}-${localMediaSequence}`,
    kind: 'local',
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function revokeMediaItem(item: AdminMediaItem | null | undefined): void {
  if (item?.kind === 'local' && item.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export function revokeMediaItems(items: AdminMediaItem[]): void {
  items.forEach(revokeMediaItem);
}

function remoteItemFromRow(row: AdminMediaRow): RemoteMediaItem {
  return {
    key: `remote-${row.id}`,
    kind: 'remote',
    id: row.id,
    publicUrl: row.publicUrl,
    role: row.role,
  };
}

export function mediaItemsFromEvent(event: AdminEventDetail): AdminMediaItem[] {
  const items: AdminMediaItem[] = [];
  const media = (event.media ?? []).filter((item) => item.publicUrl.trim() !== '');
  const cover = media.find((item) => item.role === 'cover' && item.displayOrder === 0)
    ?? media.find((item) => item.role === 'cover');

  if (cover) {
    items.push(remoteItemFromRow({
      id: cover.id,
      role: 'cover',
      displayOrder: cover.displayOrder,
      publicUrl: cover.publicUrl,
    }));
  } else if (event.posterUrl) {
    items.push({
      key: 'legacy-cover',
      kind: 'remote',
      id: 'legacy-cover',
      publicUrl: event.posterUrl,
      role: 'cover',
      legacy: true,
    });
  }

  const gallery = media
    .filter((item) => item.role !== 'cover')
    .filter((item) => item.id !== cover?.id)
    .sort((left, right) => left.displayOrder - right.displayOrder);

  for (const item of gallery) {
    if (items.some((existing) => (
      existing.kind === 'remote' && existing.publicUrl === item.publicUrl
    ))) {
      continue;
    }
    items.push(remoteItemFromRow({
      id: item.id,
      role: 'gallery',
      displayOrder: item.displayOrder,
      publicUrl: item.publicUrl,
    }));
  }

  return items;
}

export function moveMediaItem(
  items: AdminMediaItem[],
  key: string,
  direction: -1 | 1,
): AdminMediaItem[] {
  const index = items.findIndex((item) => item.key === key);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= items.length) return items;

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return dropSupersededCovers(next);
}

export function makeMediaCover(items: AdminMediaItem[], key: string): AdminMediaItem[] {
  const index = items.findIndex((item) => item.key === key);
  if (index <= 0) return items;

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.unshift(item);
  return dropSupersededCovers(next);
}

/**
 * Only one remote event_media row can have the cover role. Replacing the cover
 * overwrites that row, so a previous remote cover cannot be retained as a
 * gallery item. Legacy poster URLs have no row at all.
 */
function dropSupersededCovers(items: AdminMediaItem[]): AdminMediaItem[] {
  return items.filter((item, index) => (
    index === 0
    || item.kind !== 'remote'
    || (item.role !== 'cover' && !item.legacy)
  ));
}

export function removeMediaItem(items: AdminMediaItem[], key: string): AdminMediaItem[] {
  const target = items.find((item) => item.key === key);
  revokeMediaItem(target);
  return items.filter((item) => item.key !== key);
}

export function validateMediaItems(items: AdminMediaItem[]): string | null {
  if (items.length === 0) return 'Add at least one event poster.';
  if (items.length > 5) return 'A maximum of 5 event posters is allowed.';
  return null;
}

export async function fetchAdminEvent(eventId: string): Promise<AdminEventDetail> {
  const response = await adminFetch<AdminEventDetailResponse>(`/api/v1/events/${eventId}`);
  return response.data;
}

export async function uploadEventPoster(eventId: string, file: File): Promise<AdminEventMediaUploadResponse> {
  const formData = new FormData();
  formData.append('poster', file);
  return adminFetch<AdminEventMediaUploadResponse>(
    `/api/v1/events/${eventId}/poster`,
    { method: 'POST', body: formData },
  );
}

export async function promoteEventMedia(eventId: string, mediaId: string): Promise<void> {
  await adminFetch(`/api/v1/events/${eventId}/media`, {
    method: 'PATCH',
    body: JSON.stringify({ promote_media_id: mediaId }),
  });
}

export async function replaceEventGallery(eventId: string, mediaIds: string[]): Promise<void> {
  if (mediaIds.length > 4) {
    throw new Error('A maximum of 5 event posters is allowed, including the cover.');
  }
  await adminFetch(`/api/v1/events/${eventId}/media`, {
    method: 'PATCH',
    body: JSON.stringify({
      replace_gallery: true,
      gallery_media_ids: mediaIds,
    }),
  });
}

async function appendEventGalleryFile(
  eventId: string,
  file: File,
): Promise<AdminMediaRow | null> {
  const formData = new FormData();
  formData.append('gallery', file);
  const response = await adminFetch<AdminEventGalleryAppendResponse>(
    `/api/v1/events/${eventId}/media/gallery`,
    { method: 'POST', body: formData },
  );
  return response.data?.media?.[0] ?? null;
}

function newestGalleryRow(
  event: AdminEventDetail,
  knownIds: Set<string>,
): AdminMediaRow | null {
  const candidates = (event.media ?? [])
    .filter((item) => item.role === 'gallery')
    .filter((item) => !knownIds.has(item.id))
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const newest = candidates.at(-1);
  return newest
    ? {
      id: newest.id,
      role: 'gallery',
      displayOrder: newest.displayOrder,
      publicUrl: newest.publicUrl,
    }
    : null;
}

export class EventMediaSyncError extends Error {
  constructor(
    message: string,
    public readonly items: AdminMediaItem[],
  ) {
    super(message);
    this.name = 'EventMediaSyncError';
  }
}

export interface MediaSyncState {
  mediaChanged: boolean;
}

/**
 * Ports the mobile media reconciliation flow: upload a local cover, promote a
 * remote gallery item to cover when needed, replace retained gallery IDs,
 * append local gallery files, then persist the final order and read back.
 */
export async function syncExistingEventMedia(
  eventId: string,
  currentItems: AdminMediaItem[],
  state: MediaSyncState,
): Promise<AdminMediaItem[]> {
  if (currentItems.length === 0) {
    throw new EventMediaSyncError('Add at least one event poster.', currentItems);
  }

  const working = dropSupersededCovers([...currentItems]);
  const first = working[0];

  if (first.kind === 'local') {
    await uploadEventPoster(eventId, first.file);
    try {
      const refreshed = await fetchAdminEvent(eventId);
      const remoteCover = mediaItemsFromEvent(refreshed)[0];
      if (remoteCover?.kind === 'remote' && remoteCover.role === 'cover') {
        revokeMediaItem(first);
        working[0] = remoteCover;
      }
    } catch {
      // The final read-back will still resolve the cover row.
    }
    state.mediaChanged = true;
  } else if (first.role !== 'cover' && !first.legacy) {
    await promoteEventMedia(eventId, first.id);
    working[0] = { ...first, role: 'cover' };
    state.mediaChanged = true;
  }

  if (!state.mediaChanged) return working;

  const retainedGalleryIds = working
    .slice(1)
    .filter((item): item is RemoteMediaItem => (
      item.kind === 'remote' && item.role === 'gallery' && !item.legacy
    ))
    .map((item) => item.id);

  await replaceEventGallery(eventId, retainedGalleryIds);

  const knownGalleryIds = new Set(retainedGalleryIds);
  for (let index = 1; index < working.length; index += 1) {
    const item = working[index];
    if (item.kind !== 'local') continue;

    try {
      let row = await appendEventGalleryFile(eventId, item.file);
      if (!row) {
        const refreshed = await fetchAdminEvent(eventId);
        row = newestGalleryRow(refreshed, knownGalleryIds);
      }
      if (!row) {
        throw new Error('uploaded_row_not_found');
      }

      knownGalleryIds.add(row.id);
      working[index] = remoteItemFromRow(row);
      revokeMediaItem(item);
    } catch {
      throw new EventMediaSyncError(
        'Some gallery photos could not be uploaded. Please retry the failed photos.',
        working,
      );
    }
  }

  const finalGalleryIds = working
    .slice(1)
    .map((item) => {
      if (item.kind === 'remote' && !item.legacy) return item.id;
      throw new EventMediaSyncError(
        'Some gallery photos are not ready to be saved yet. Please retry.',
        working,
      );
    });

  await replaceEventGallery(eventId, finalGalleryIds);

  let refreshed: AdminEventDetail;
  try {
    refreshed = await fetchAdminEvent(eventId);
  } catch {
    throw new EventMediaSyncError(
      'Media was uploaded, but the latest event state could not be loaded. Please retry.',
      working,
    );
  }

  const serverItems = mediaItemsFromEvent(refreshed);
  if (serverItems.length !== working.length) {
    throw new EventMediaSyncError(
      'Media was uploaded, but could not be confirmed by the server. Please retry.',
      working,
    );
  }

  state.mediaChanged = false;
  return serverItems;
}
