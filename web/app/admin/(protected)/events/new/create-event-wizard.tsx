'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ImageIcon,
  ListChecks,
  Loader2,
  Send,
  Ticket,
} from 'lucide-react';
import { EventDetailsFields } from '@/components/admin/event-details-fields';
import { FormBuilderStep } from '@/components/admin/form-builder-step';
import { ImageCropQueue } from '@/components/admin/image-cropper';
import { ImageUploader } from '@/components/admin/image-uploader';
import { PageHeader } from '@/components/admin/page-header';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { DefaultTicketPreview } from '@/components/admin/ticket-default-preview';
import { useToast } from '@/components/admin/toast';
import { WizardStepper } from '@/components/admin/wizard-stepper';
import { AdminApiError, adminFetch } from '@/lib/admin/api';
import {
  createEmptyEventDetails,
  defaultEventDateTimeLocal,
  eventDetailsFromEvent,
  validateEventDetails,
  type EventDetailsDraft,
  type EventDetailsErrors,
  type EventWritePayload,
} from '@/lib/admin/event-form';
import {
  createLocalMediaItem,
  fetchAdminEvent,
  mediaItemsFromEvent,
  makeMediaCover,
  moveMediaItem,
  removeMediaItem,
  syncExistingEventMedia,
  validateMediaItems,
  type AdminMediaItem,
  type LocalMediaItem,
  type MediaSyncState,
} from '@/lib/admin/event-media';
import {
  defaultAdminFormFields,
  formFieldsFromEvent,
  validateAdminFormFields,
  type AdminFormFieldDraft,
} from '@/lib/admin/form-fields';
import { getPosterAspectRatio } from '@/lib/events/posterAspect';
import { createIdempotencyKey } from '@/lib/admin/idempotency';
import { invalidateEventQueries } from '@/lib/admin/queries/events';
import type { AdminEventDetail, AdminEventWriteResponse } from '@/lib/admin/types';
import { validateEventImageFile } from '@/lib/admin/image-validation';
import { formatEventDateTime } from '@/lib/admin/format';

const steps = ['Details & media', 'Registration form', 'Ticket template', 'Review & publish'];
const sectionClassName = 'rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-6';

function mergeDetailsErrors(
  current: EventDetailsErrors,
  next: EventDetailsErrors,
): EventDetailsErrors {
  return { ...current, ...next };
}

export function CreateEventWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<EventDetailsDraft>(createEmptyEventDetails);
  const [detailsErrors, setDetailsErrors] = useState<EventDetailsErrors>({});
  const [media, setMedia] = useState<AdminMediaItem[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<AdminFormFieldDraft[]>(defaultAdminFormFields);
  const [formError, setFormError] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<AdminEventDetail | null>(null);
  const [ticketMode, setTicketMode] = useState<'default' | 'custom'>('default');
  const [publishNow, setPublishNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [validatingMedia, setValidatingMedia] = useState(false);
  const [cropFiles, setCropFiles] = useState<File[] | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const idempotencyKey = useRef(createIdempotencyKey());
  const mediaSync = useRef<MediaSyncState>({ mediaChanged: false });
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    setDetails((current) => (
      current.date ? current : { ...current, date: defaultEventDateTimeLocal() }
    ));
  }, []);

  useEffect(() => {
    const resumeId = new URLSearchParams(window.location.search).get('eventId');
    if (!resumeId) return;

    let cancelled = false;
    setRestoring(true);
    setRestoreError(null);

    (async () => {
      try {
        const event = await fetchAdminEvent(resumeId);
        if (cancelled) return;
        if (event.status !== 'Draft') {
          setRestoreError('Only draft events can be resumed in the create wizard.');
          return;
        }
        setEventId(event.id);
        setCreatedEvent(event);
        setDetails(eventDetailsFromEvent(event));
        const resumedMedia = mediaItemsFromEvent(event);
        replaceMedia(resumedMedia, []);
        setFormFields(formFieldsFromEvent(event.formFields));
        try {
          const template = await adminFetch<{
            status: 'success';
            data: { mode: 'default' | 'custom' };
          }>(`/api/v1/events/${event.id}/ticket-template`);
          if (!cancelled) setTicketMode(template.data.mode);
        } catch {
          // The ticket step re-checks the existing mode before saving.
        }
        setStep(resumedMedia.length > 0 ? 1 : 0);
        toast({
          variant: 'info',
          title: 'Draft resumed',
          description: resumedMedia.length > 0
            ? 'Continue setting up your event. Media stays as saved on the server.'
            : 'This draft has no poster yet. Add one before continuing.',
        });
      } catch (error) {
        if (!cancelled) {
          setRestoreError(error instanceof Error ? error.message : 'The draft could not be loaded.');
        }
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // The resume lookup is intentionally a one-time page bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setDetailsErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Array<keyof EventDetailsDraft>) {
        delete next[key];
      }
      return next;
    });
    setStepError(null);
  }

  async function handleAddFiles(files: File[]) {
    setMediaError(null);
    setStepError(null);
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
    const errors: string[] = [];
    for (const file of files) {
      const error = await validateEventImageFile(file);
      if (error) errors.push(error);
    }
    setValidatingMedia(false);

    if (errors.length > 0) {
      setMediaError(errors.join(' '));
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
  }

  function handleRemoveMedia(key: string) {
    setMedia((current) => {
      const target = current.find((item) => item.key === key);
      if (target?.kind === 'local') {
        previewUrls.current.delete(target.previewUrl);
      }
      return removeMediaItem(current, key);
    });
    mediaSync.current.mediaChanged = true;
  }

  function handleMoveMedia(key: string, direction: -1 | 1) {
    setMedia((current) => moveMediaItem(current, key, direction));
    mediaSync.current.mediaChanged = true;
  }

  function handleMakeCover(key: string) {
    setMedia((current) => makeMediaCover(current, key));
    mediaSync.current.mediaChanged = true;
  }

  function applyDetailsApiError(error: unknown) {
    if (!(error instanceof AdminApiError)) return false;
    const fieldMap: Record<string, keyof EventDetailsDraft> = {
      name: 'name',
      location: 'location',
      capacity: 'capacity',
      date: 'date',
      description: 'description',
      registration_mode: 'registrationMode',
      poster_aspect_mode: 'posterAspectMode',
      whatsapp_group_url: 'whatsappGroupUrl',
    };
    const field = error.field ? fieldMap[error.field] : undefined;
    if (field) {
      setDetailsErrors((current) => mergeDetailsErrors(current, { [field]: error.message }));
      return true;
    }
    return false;
  }

  async function saveDetailsAndContinue() {
    if (busy) return;
    setStepError(null);
    setMediaError(null);

    const validation = validateEventDetails(details);
    setDetailsErrors(validation.errors);
    if (!validation.payload) {
      setStepError('Fix the highlighted event details before continuing.');
      return;
    }

    const mediaValidation = validateMediaItems(media);
    if (mediaValidation) {
      setMediaError(mediaValidation);
      return;
    }

    setBusy(true);
    let currentEventId = eventId;
    const payload: EventWritePayload = validation.payload;

    try {
      if (!currentEventId) {
        const response = await adminFetch<AdminEventWriteResponse>('/api/v1/events', {
          method: 'POST',
          headers: { 'Idempotency-Key': idempotencyKey.current },
          body: JSON.stringify(payload),
        });
        currentEventId = response.data.id;
        setEventId(currentEventId);
        window.history.replaceState(
          null,
          '',
          `/admin/events/new?eventId=${encodeURIComponent(currentEventId)}`,
        );

        try {
          mediaSync.current.mediaChanged = true;
          const synced = await syncExistingEventMedia(currentEventId, media, mediaSync.current);
          replaceMedia(synced, media);
          mediaSync.current.mediaChanged = false;
          const event = await fetchAdminEvent(currentEventId);
          setCreatedEvent(event);
        } catch (mediaUploadError) {
          throw new Error(
            mediaUploadError instanceof Error
              ? `Draft saved, but media upload failed. ${mediaUploadError.message}`
              : 'Draft saved, but media upload failed. Retry before continuing.',
          );
        }
      } else {
        await adminFetch(`/api/v1/events/${currentEventId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (mediaSync.current.mediaChanged || media.some((item) => item.kind === 'local')) {
          try {
            const synced = await syncExistingEventMedia(
              currentEventId,
              media,
              mediaSync.current,
            );
            replaceMedia(synced, media);
          } catch (mediaError) {
            if (mediaError instanceof Error && 'items' in mediaError) {
              const nextItems = (mediaError as Error & { items: AdminMediaItem[] }).items;
              replaceMedia(nextItems, media);
            }
            throw mediaError;
          }
        }

        const event = await fetchAdminEvent(currentEventId);
        setCreatedEvent(event);
      }

      await invalidateEventQueries(queryClient, currentEventId);
      setStep(1);
      setBusy(false);
      toast({
        variant: 'success',
        title: 'Draft saved',
        description: 'Now set up the registration form.',
      });
    } catch (error) {
      setBusy(false);
      if (currentEventId) {
        void invalidateEventQueries(queryClient, currentEventId);
      }
      if (applyDetailsApiError(error)) {
        setStepError('Fix the highlighted event details before continuing.');
      } else {
        setStepError(error instanceof Error ? error.message : 'The event could not be saved.');
      }
    }
  }

  async function saveFormAndContinue() {
    if (busy || !eventId) return;
    setFormError(null);
    setStepError(null);

    const validation = validateAdminFormFields(formFields);
    if (!validation.payload) {
      setFormError(validation.error);
      return;
    }

    setBusy(true);
    try {
      await adminFetch(`/api/v1/events/${eventId}/fields`, {
        method: 'POST',
        body: JSON.stringify({ fields: validation.payload }),
      });
      await invalidateEventQueries(queryClient, eventId);
      setStep(2);
      toast({ variant: 'success', title: 'Registration form saved' });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The form could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function saveTicketAndContinue() {
    if (busy || !eventId) return;
    setTicketError(null);
    setStepError(null);
    setBusy(true);
    try {
      const existingTemplate = await adminFetch<{
        status: 'success';
        data: { mode: 'default' | 'custom' };
      }>(`/api/v1/events/${eventId}/ticket-template`);

      let keptCustom = false;
      if (existingTemplate.data.mode === 'custom') {
        keptCustom = true;
        setTicketMode('custom');
      } else {
        setTicketMode('default');
        await adminFetch(`/api/v1/events/${eventId}/ticket-template`, {
          method: 'PUT',
          body: JSON.stringify({ mode: 'default', elements: [] }),
        });
      }

      await invalidateEventQueries(queryClient, eventId);
      setStep(3);
      toast({
        variant: 'success',
        title: keptCustom ? 'Custom ticket kept' : 'Default ticket selected',
        description: keptCustom
          ? 'Your existing custom ticket design was not changed.'
          : undefined,
      });
    } catch (error) {
      setTicketError(error instanceof Error ? error.message : 'The ticket setup could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function finalizeEvent() {
    if (busy || !eventId) return;
    setStepError(null);
    setBusy(true);
    try {
      if (publishNow) {
        await adminFetch(`/api/v1/events/${eventId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'Published' }),
        });
      }
      await invalidateEventQueries(queryClient, eventId);
      toast({
        variant: 'success',
        title: publishNow ? 'Event published' : 'Event saved as draft',
        description: publishNow
          ? 'Your event is live and ready for registrations.'
          : 'You can publish it later from the event overview.',
      });
      router.push(`/admin/events/${eventId}`);
    } catch (error) {
      setStepError(error instanceof Error ? error.message : 'The event could not be finalized.');
      setBusy(false);
    }
  }

  if (restoring) return <PageLoadingSkeleton />;

  if (restoreError) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Create event"
          title="Draft could not be resumed"
          description={restoreError}
          actions={(
            <Link
              href="/admin/events"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Back to events
            </Link>
          )}
        />
      </div>
    );
  }

  const aspectRatio = getPosterAspectRatio(details.posterAspectMode);
  const customFieldCount = formFields.filter((field) => field.fieldKind === 'custom').length;
  const eventName = createdEvent?.name ?? details.name;
  const eventDate = createdEvent?.date ?? details.date;
  const eventLocation = createdEvent?.location ?? details.location;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to events
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
              Create event
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
              Set up your event
            </h1>
            <p className="mt-2 max-w-2xl font-description text-sm text-on-surface-variant">
              Start with the event details and media, then configure the registration form and ticket.
            </p>
          </div>
          {eventId ? (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
              Draft saved
            </span>
          ) : null}
        </div>
      </div>

      <WizardStepper
        steps={steps}
        current={step}
        onStepClick={setStep}
      />

      {stepError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-description text-sm text-red-800">
          {stepError}
        </div>
      ) : null}

      {step === 0 ? (
        <>
          <section className={sectionClassName}>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-on-surface">Event details</h2>
                <p className="mt-0.5 font-description text-xs text-on-surface-variant">
                  This information appears on the public event page.
                </p>
              </div>
            </div>
            <EventDetailsFields
              value={details}
              errors={detailsErrors}
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
                  Upload the main poster and optional gallery images.
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
            {createdEvent && createdEvent.posterAspectMode !== details.posterAspectMode ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p className="font-description text-xs text-amber-900">
                  Poster format changed. Images already saved keep their original crop; newly added
                  images use the new format.
                </p>
              </div>
            ) : null}
          </section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link
              href="/admin/events"
              className="rounded-xl border border-outline-variant px-4 py-2.5 text-center text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void saveDetailsAndContinue()}
              disabled={busy || validatingMedia || Boolean(cropFiles)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              {eventId ? 'Save & continue' : 'Create draft & continue'}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <FormBuilderStep
            fields={formFields}
            onChange={(fields) => {
              setFormFields(fields);
              setFormError(null);
            }}
            error={formError}
            disabled={busy}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => void saveFormAndContinue()}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Save form & continue
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <section className={sectionClassName}>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
                <Ticket aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-on-surface">Ticket setup</h2>
                <p className="mt-0.5 font-description text-xs text-on-surface-variant">
                  New events use the default Event Gate ticket. If this draft already has a
                  custom ticket, it will be kept.
                </p>
              </div>
            </div>
            {ticketMode === 'custom' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Existing custom ticket preserved
                </p>
                <p className="mt-2 font-description text-sm leading-relaxed text-emerald-900/75">
                  This event already has a custom ticket design. Continuing will not overwrite it.
                  You can refine it later in the ticket editor.
                </p>
              </div>
            ) : (
              <>
                <DefaultTicketPreview
                  eventName={eventName}
                  eventDate={eventDate}
                  location={eventLocation}
                />
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    Default ticket selected
                  </p>
                  <p className="mt-1 font-description text-xs text-emerald-900/75">
                    Tickets will include the participant name, event details, ticket code, and QR code.
                  </p>
                </div>
              </>
            )}
            {ticketError ? (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
                {ticketError}
              </p>
            ) : null}
          </section>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => void saveTicketAndContinue()}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Save ticket & continue
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <section className={sectionClassName}>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
                <ListChecks aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-on-surface">Review & publish</h2>
                <p className="mt-0.5 font-description text-xs text-on-surface-variant">
                  Check the setup before making this event available.
                </p>
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Event name', value: eventName || '—' },
                { label: 'Date & time', value: formatEventDateTime(eventDate) },
                { label: 'Location', value: eventLocation || '—' },
                { label: 'Capacity', value: details.capacity || '—' },
                { label: 'Registration mode', value: details.registrationMode },
                { label: 'Posters', value: `${media.length} image${media.length === 1 ? '' : 's'}` },
                { label: 'Custom questions', value: String(customFieldCount) },
                { label: 'Ticket', value: ticketMode === 'custom' ? 'Existing custom ticket' : 'Default Event Gate ticket' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-surface-container-low px-3.5 py-3">
                  <dt className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-secondary">
                    {item.label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-on-surface">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 rounded-xl border border-outline-variant bg-surface-container-low/70 p-4">
              <p className="text-sm font-semibold text-on-surface">Custom questions</p>
              {customFieldCount === 0 ? (
                <p className="mt-1 font-description text-xs text-on-surface-variant">
                  Participants will only enter their name and email.
                </p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {formFields
                    .filter((field) => field.fieldKind === 'custom')
                    .map((field) => (
                      <li
                        key={field.key}
                        className="rounded-full border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs text-on-surface"
                      >
                        {field.fieldName || 'Untitled question'}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant p-4 transition-colors hover:bg-surface-container-low">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(event) => setPublishNow(event.target.checked)}
                disabled={busy}
                className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span>
                <span className="block text-sm font-semibold text-on-surface">Publish now</span>
                <span className="mt-0.5 block font-description text-xs text-on-surface-variant">
                  Make the event public immediately. Leave unchecked to keep it as a draft.
                </span>
              </span>
            </label>
          </section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => void finalizeEvent()}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="h-4 w-4" />
              )}
              {publishNow ? 'Publish event' : 'Save as draft'}
            </button>
          </div>
        </>
      ) : null}

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
