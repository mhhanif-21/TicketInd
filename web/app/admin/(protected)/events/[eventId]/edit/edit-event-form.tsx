'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ImageIcon,
  Loader2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { EventDetailsFields } from '@/components/admin/event-details-fields';
import { ImageUploader } from '@/components/admin/image-uploader';
import { StatusBadge } from '@/components/admin/status-badge';
import { useToast } from '@/components/admin/toast';
import { AdminApiError, adminFetch } from '@/lib/admin/api';
import {
  eventDetailsFromEvent,
  validateEventDetails,
  type EventDetailsDraft,
  type EventDetailsErrors,
} from '@/lib/admin/event-form';
import {
  createLocalMediaItem,
  makeMediaCover,
  mediaItemsFromEvent,
  moveMediaItem,
  removeMediaItem,
  syncExistingEventMedia,
  validateMediaItems,
  type AdminMediaItem,
  type LocalMediaItem,
  type MediaSyncState,
} from '@/lib/admin/event-media';
import { getPosterAspectRatio } from '@/lib/events/posterAspect';
import { invalidateEventQueries } from '@/lib/admin/queries/events';
import type { AdminEventDetail } from '@/lib/admin/types';
import { validateEventImageFile } from '@/lib/admin/image-validation';

const ImageCropQueue = dynamic(
  () => import('@/components/admin/image-cropper').then((mod) => mod.ImageCropQueue),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40">
        <span className="flex items-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface shadow-lg">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Opening image editor…
        </span>
      </div>
    ),
  },
);

const sectionClassName = 'rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-6';

function apiFieldToDetailsField(field: string): keyof EventDetailsDraft | null {
  const map: Record<string, keyof EventDetailsDraft> = {
    name: 'name',
    location: 'location',
    capacity: 'capacity',
    date: 'date',
    description: 'description',
    registration_mode: 'registrationMode',
    poster_aspect_mode: 'posterAspectMode',
    whatsapp_group_url: 'whatsappGroupUrl',
  };
  return map[field] ?? null;
}

export function EditEventForm({ event }: { event: AdminEventDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [details, setDetails] = useState<EventDetailsDraft>(() => eventDetailsFromEvent(event));
  const [errors, setErrors] = useState<EventDetailsErrors>({});
  const [media, setMedia] = useState<AdminMediaItem[]>(() => mediaItemsFromEvent(event));
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [validatingMedia, setValidatingMedia] = useState(false);
  const [cropFiles, setCropFiles] = useState<File[] | null>(null);
  const [mediaNeedsRetry, setMediaNeedsRetry] = useState(false);

  const mediaSync = useRef<MediaSyncState>({ mediaChanged: false });
  const previewUrls = useRef(new Set<string>());
  const originalAspectMode = event.posterAspectMode;

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function replaceMedia(next: AdminMediaItem[], previous: AdminMediaItem[]) {
    const nextLocalUrls = new Set(
      next
        .filter((item): item is LocalMediaItem => item.kind === 'local')
        .map((item) => item.previewUrl),
    );
    for (const item of previous) {
      if (item.kind === 'local' && !nextLocalUrls.has(item.previewUrl)) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrls.current.delete(item.previewUrl);
      }
    }
    for (const url of nextLocalUrls) previewUrls.current.add(url);
    setMedia(next);
  }

  function updateDetails(patch: Partial<EventDetailsDraft>) {
    setDetails((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Array<keyof EventDetailsDraft>) {
        delete next[key];
      }
      return next;
    });
    setPageError(null);
  }

  async function handleAddFiles(files: File[]) {
    setMediaError(null);
    const remaining = 5 - media.length;
    if (remaining <= 0) {
      setMediaError('A maximum of 5 event posters is allowed.');
      return;
    }
    if (files.length > remaining) {
      setMediaError(`Only ${remaining} more poster${remaining === 1 ? '' : 's'} can be added.`);
      return;
    }

    setValidatingMedia(true);
    const errorsFound: string[] = [];
    for (const file of files) {
      const error = await validateEventImageFile(file);
      if (error) errorsFound.push(error);
    }
    setValidatingMedia(false);

    if (errorsFound.length > 0) {
      setMediaError(errorsFound.join(' '));
      return;
    }

    setCropFiles(files);
  }

  async function handleCropComplete(croppedFiles: File[]) {
    setCropFiles(null);
    setValidatingMedia(true);
    const errorsFound: string[] = [];
    for (const file of croppedFiles) {
      const error = await validateEventImageFile(file);
      if (error) errorsFound.push(error);
    }
    setValidatingMedia(false);
    if (errorsFound.length > 0) {
      setMediaError(errorsFound.join(' '));
      return;
    }

    const items = croppedFiles.map((file) => {
      const item = createLocalMediaItem(file);
      previewUrls.current.add(item.previewUrl);
      return item;
    });
    setMedia((current) => [...current, ...items]);
    mediaSync.current.mediaChanged = true;
    setMediaError(null);
    setMediaNeedsRetry(false);
  }

  function handleRemoveMedia(key: string) {
    setMedia((current) => {
      const target = current.find((item) => item.key === key);
      if (target?.kind === 'local') previewUrls.current.delete(target.previewUrl);
      return removeMediaItem(current, key);
    });
    mediaSync.current.mediaChanged = true;
    setMediaNeedsRetry(false);
  }

  function handleMoveMedia(key: string, direction: -1 | 1) {
    setMedia((current) => moveMediaItem(current, key, direction));
    mediaSync.current.mediaChanged = true;
    setMediaNeedsRetry(false);
  }

  function handleMakeCover(key: string) {
    setMedia((current) => makeMediaCover(current, key));
    mediaSync.current.mediaChanged = true;
    setMediaNeedsRetry(false);
  }

  function applyApiFieldError(error: unknown): boolean {
    if (!(error instanceof AdminApiError) || !error.field) return false;
    const field = apiFieldToDetailsField(error.field);
    if (!field) return false;
    setErrors((current) => ({ ...current, [field]: error.message }));
    return true;
  }

  async function saveEvent() {
    if (busy) return;
    setPageError(null);
    setMediaError(null);
    setMediaNeedsRetry(false);

    const validation = validateEventDetails(details);
    setErrors(validation.errors);
    if (!validation.payload) {
      setPageError('Fix the highlighted event details before saving.');
      return;
    }

    const mediaValidation = validateMediaItems(media);
    if (mediaValidation) {
      setMediaError(mediaValidation);
      return;
    }

    setBusy(true);
    try {
      await adminFetch(`/api/v1/events/${event.id}`, {
        method: 'PUT',
        body: JSON.stringify(validation.payload),
      });
      await invalidateEventQueries(queryClient, event.id);

      if (mediaSync.current.mediaChanged || media.some((item) => item.kind === 'local')) {
        try {
          const synced = await syncExistingEventMedia(event.id, media, mediaSync.current);
          replaceMedia(synced, media);
        } catch (error) {
          if (error instanceof Error && 'items' in error) {
            const nextItems = (error as Error & { items: AdminMediaItem[] }).items;
            replaceMedia(nextItems, media);
          }
          setMediaError(
            error instanceof Error
              ? `Event details saved, but media could not be updated. ${error.message}`
              : 'Event details saved, but media could not be updated. Please retry.',
          );
          setMediaNeedsRetry(true);
          setBusy(false);
          return;
        }
      }

      await invalidateEventQueries(queryClient, event.id);
      toast({ variant: 'success', title: 'Event updated successfully' });
      router.push(`/admin/events/${event.id}`);
    } catch (error) {
      if (applyApiFieldError(error)) {
        setPageError('Fix the highlighted event details before saving.');
      } else {
        setPageError(error instanceof Error ? error.message : 'The event could not be updated.');
      }
      setBusy(false);
    }
  }

  async function retryMediaOnly() {
    if (busy) return;
    setBusy(true);
    setMediaError(null);
    try {
      const synced = await syncExistingEventMedia(event.id, media, mediaSync.current);
      replaceMedia(synced, media);
      setMediaNeedsRetry(false);
      await invalidateEventQueries(queryClient, event.id);
      toast({ variant: 'success', title: 'Event media updated successfully' });
      router.push(`/admin/events/${event.id}`);
    } catch (error) {
      if (error instanceof Error && 'items' in error) {
        const nextItems = (error as Error & { items: AdminMediaItem[] }).items;
        replaceMedia(nextItems, media);
      }
      setMediaError(
        error instanceof Error ? error.message : 'The media could not be updated. Please retry.',
      );
      setMediaNeedsRetry(true);
      setBusy(false);
    }
  }

  const aspectRatio = getPosterAspectRatio(details.posterAspectMode);
  const aspectChanged = details.posterAspectMode !== originalAspectMode;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/events/${event.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to event
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
            Edit event
          </p>
          <StatusBadge status={event.status} />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
          {event.name}
        </h1>
        <p className="mt-2 font-description text-sm text-on-surface-variant">
          Update event information and manage the poster collection.
        </p>
      </div>

      {pageError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-description text-sm text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className={sectionClassName}>
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
            <Save aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-on-surface">Event details</h2>
            <p className="mt-0.5 font-description text-xs text-on-surface-variant">
              Changes update the public event page immediately.
            </p>
          </div>
        </div>
        <EventDetailsFields
          value={details}
          errors={errors}
          disabled={busy}
          onChange={updateDetails}
        />
      </section>

      <section className={sectionClassName}>
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
            <ImageIcon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-on-surface">Poster & gallery</h2>
            <p className="mt-0.5 font-description text-xs text-on-surface-variant">
              Reorder, remove, or add posters. The first image becomes the main poster.
            </p>
          </div>
        </div>
        <ImageUploader
          items={media}
          aspectRatio={aspectRatio}
          disabled={busy || validatingMedia}
          error={mediaError}
          onAddFiles={(files) => void handleAddFiles(files)}
          onRemove={handleRemoveMedia}
          onMove={handleMoveMedia}
          onMakeCover={handleMakeCover}
        />
        {aspectChanged ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="font-description text-xs text-amber-900">
              Poster format changed. Images already saved keep their original crop; newly added
              images use the new format.
            </p>
          </div>
        ) : null}
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/admin/events/${event.id}`}
          className="rounded-xl border border-outline-variant px-4 py-2.5 text-center text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Cancel
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row">
          {mediaNeedsRetry ? (
            <button
              type="button"
              onClick={() => void retryMediaOnly()}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Retry media
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void saveEvent()}
            disabled={busy || validatingMedia || Boolean(cropFiles)}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-4 w-4" />
            )}
            Save changes
          </button>
        </div>
      </div>

      {cropFiles ? (
        <ImageCropQueue
          files={cropFiles}
          aspectRatio={aspectRatio}
          onCancel={() => setCropFiles(null)}
          onComplete={handleCropComplete}
        />
      ) : null}
    </div>
  );
}
