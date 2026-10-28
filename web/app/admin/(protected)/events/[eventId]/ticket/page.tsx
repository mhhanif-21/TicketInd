'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  CloudOff,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  RefreshCw,
  Save,
  Ticket,
  UploadCloud,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmailTemplateSection } from '@/components/admin/email-template-section';
import { EmptyState } from '@/components/admin/empty-state';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { StatusBadge } from '@/components/admin/status-badge';
import { TicketCanvasPreview } from '@/components/admin/ticket-canvas-preview';
import { DefaultTicketPreview } from '@/components/admin/ticket-default-preview';
import { useToast } from '@/components/admin/toast';
import { adminFetch } from '@/lib/admin/api';
import { validateEventImageFile } from '@/lib/admin/image-validation';
import { invalidateEventQueries, useAdminEvent } from '@/lib/admin/queries/events';
import { useAdminTicketTemplate } from '@/lib/admin/queries/templates';
import {
  ensureRequiredTicketElements,
  ticketElementsFromApi,
  validateTicketTemplate,
  type TicketBackgroundResponse,
  type TicketTemplateConfig,
  type TicketTemplateElement,
  type TicketTemplateMode,
  type TicketTemplateSaveResponse,
} from '@/lib/admin/ticket-template';
import type { AdminEventDetail } from '@/lib/admin/types';
import { cn } from '@/lib/admin/format';

const TicketCanvasEditor = dynamic(
  () => import('@/components/admin/ticket-canvas-editor').then((mod) => mod.TicketCanvasEditor),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#1d1d1d]">
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Loading ticket canvas…
        </span>
      </div>
    ),
  },
);

function imageAspectRatio(source: string): Promise<number | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve(image.naturalWidth > 0 && image.naturalHeight > 0
        ? image.naturalWidth / image.naturalHeight
        : null);
    };
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

async function fileAspectRatio(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file);
  try {
    return await imageAspectRatio(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function TicketWorkspace({
  event,
  initialTemplate,
}: {
  event: AdminEventDetail;
  initialTemplate: TicketTemplateConfig;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<TicketTemplateMode>(initialTemplate.mode);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(initialTemplate.background_url);
  const [aspectRatio, setAspectRatio] = useState(3 / 4);
  const [elements, setElements] = useState<TicketTemplateElement[]>(
    () => ensureRequiredTicketElements(ticketElementsFromApi(initialTemplate.elements)),
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!backgroundUrl) return;
    let cancelled = false;
    void imageAspectRatio(backgroundUrl).then((ratio) => {
      if (!cancelled && ratio) setAspectRatio(ratio);
    });
    return () => {
      cancelled = true;
    };
  }, [backgroundUrl]);

  useEffect(() => {
    if (!dirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  function firstSetupRequested(): boolean {
    return new URLSearchParams(window.location.search).get('firstSetup') === '1';
  }

  function maybeShowPublishDecision() {
    if (event.status === 'Draft' && firstSetupRequested()) {
      setPublishOpen(true);
    }
  }

  function selectMode(next: TicketTemplateMode) {
    if (next === mode) return;
    setMode(next);
    setError(null);
    if (next === 'custom') {
      setElements((current) => ensureRequiredTicketElements(current));
    }
    setDirty(true);
  }

  async function uploadBackground(file: File) {
    if (uploading || saving) return;
    setError(null);
    const validationError = await validateEventImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const ratio = await fileAspectRatio(file);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('background', file);
      const response = await adminFetch<TicketBackgroundResponse>(
        `/api/v1/events/${event.id}/ticket-template/background`,
        { method: 'POST', body: formData },
      );
      setBackgroundUrl(response.data.background_url);
      if (ratio) setAspectRatio(ratio);
      setDirty(true);
      toast({
        variant: 'success',
        title: 'Background uploaded',
        description: 'Save the ticket template to apply this design.',
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error
        ? uploadError.message
        : 'The background image could not be uploaded.');
    } finally {
      setUploading(false);
    }
  }

  async function saveTemplate() {
    if (saving || uploading) return;
    setError(null);
    const nextElements = mode === 'custom'
      ? ensureRequiredTicketElements(elements)
      : [];
    const validation = validateTicketTemplate(mode, backgroundUrl, nextElements);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    try {
      await adminFetch<TicketTemplateSaveResponse>(
        `/api/v1/events/${event.id}/ticket-template`,
        {
          method: 'PUT',
          body: JSON.stringify({
            mode,
            elements: mode === 'custom' ? nextElements : [],
          }),
        },
      );
      if (mode === 'custom') setElements(nextElements);
      setDirty(false);
      await Promise.all([
        invalidateEventQueries(queryClient, event.id),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'event', event.id, 'ticket-template'],
        }),
      ]);
      toast({
        variant: 'success',
        title: 'Ticket template saved',
        description: mode === 'custom'
          ? 'New tickets will use your custom design.'
          : 'New tickets will use the default Event Gate design.',
      });
      maybeShowPublishDecision();
    } catch (saveError) {
      setError(saveError instanceof Error
        ? saveError.message
        : 'The ticket template could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function publishNow() {
    if (publishing) return;
    setPublishing(true);
    try {
      await adminFetch(`/api/v1/events/${event.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Published' }),
      });
      await invalidateEventQueries(queryClient, event.id);
      toast({
        variant: 'success',
        title: 'Event published',
        description: 'Registration is now open and the ticket design is live.',
      });
      setPublishOpen(false);
      router.push(`/admin/events/${event.id}`);
    } catch (publishError) {
      toast({
        variant: 'error',
        title: 'Event could not be published',
        description: publishError instanceof Error
          ? publishError.message
          : 'Please try again.',
      });
    } finally {
      setPublishing(false);
    }
  }

  const customReady = Boolean(backgroundUrl) && elements.length > 0;
  const sample = {
    name: 'Participant name',
    email: 'participant@email.com',
    eventName: event.name,
    ticketCode: 'A1B2C3D4',
  };

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
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
                Ticket & email template
              </p>
              <StatusBadge status={event.status} />
              {dirty ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                  Unsaved changes
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
              {event.name}
            </h1>
            <p className="mt-2 max-w-2xl font-description text-sm text-on-surface-variant">
              Choose the default Event Gate ticket or design a custom template with your own
              background. QR and ticket code are always required.
            </p>
          </div>

          <Link
            href={`/admin/events/${event.id}/form`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Layers aria-hidden="true" className="h-4 w-4" />
            Registration form
          </Link>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-description text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Ticket design</h2>
            <p className="mt-1 font-description text-sm text-on-surface-variant">
              The default design includes the participant name, event details, QR code, and ticket code.
            </p>
          </div>
          <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-caps text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">
            {mode === 'custom' ? 'Custom design' : 'Default design'}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={mode === 'default'}
            onClick={() => selectMode('default')}
            disabled={saving || uploading}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60',
              mode === 'default'
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Ticket aria-hidden="true" className="h-4 w-4" />
              Default Event Gate ticket
            </span>
            <span className={cn(
              'mt-1 block font-description text-xs',
              mode === 'default' ? 'text-on-primary/75' : 'text-on-surface-variant',
            )}>
              Ready to use. No image upload needed.
            </span>
          </button>
          <button
            type="button"
            aria-pressed={mode === 'custom'}
            onClick={() => selectMode('custom')}
            disabled={saving || uploading}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60',
              mode === 'custom'
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ImageIcon aria-hidden="true" className="h-4 w-4" />
              Custom background
            </span>
            <span className={cn(
              'mt-1 block font-description text-xs',
              mode === 'custom' ? 'text-on-primary/75' : 'text-on-surface-variant',
            )}>
              Upload a design and place data elements on the canvas.
            </span>
          </button>
        </div>

        {mode === 'default' ? (
          <div className="mt-5">
            <DefaultTicketPreview
              eventName={event.name}
              eventDate={event.date}
              location={event.location}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low/60 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-on-surface">Template background</p>
                  <p className="mt-0.5 font-description text-xs text-on-surface-variant">
                    JPG, PNG, or WebP up to 5 MB. The image keeps its own aspect ratio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud aria-hidden="true" className="h-4 w-4" />
                  )}
                  {backgroundUrl ? 'Change background' : 'Upload background'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(changeEvent) => {
                    const file = changeEvent.target.files?.[0];
                    changeEvent.target.value = '';
                    if (file) void uploadBackground(file);
                  }}
                />
              </div>

              {!backgroundUrl ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-description text-xs text-amber-900">
                  Upload a background before editing or saving a custom ticket.
                </p>
              ) : null}
            </div>

            {customReady ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Canvas preview</p>
                    <p className="mt-0.5 font-description text-xs text-on-surface-variant">
                      Sample data shown here. Generated tickets use real participant data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(true)}
                    disabled={saving || uploading}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Maximize2 aria-hidden="true" className="h-4 w-4" />
                    Edit canvas
                  </button>
                </div>
                <TicketCanvasPreview
                  backgroundUrl={backgroundUrl}
                  elements={elements}
                  sample={sample}
                  aspectRatio={aspectRatio}
                  className="mx-auto max-w-md"
                />
              </>
            ) : null}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/admin/events/${event.id}`}
            className="rounded-xl border border-outline-variant px-4 py-2.5 text-center text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => void saveTemplate()}
            disabled={saving || uploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-4 w-4" />
            )}
            Save ticket template
          </button>
        </div>
      </section>

      {event.registrationMode === 'Manual Review' ? (
        <EmailTemplateSection eventId={event.id} enabled />
      ) : (
        <section className="flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface-container-low/60 p-4">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          <p className="font-description text-sm text-on-surface-variant">
            Custom OTP and approval emails are only available for events using Manual Review.
            This event accepts registrations automatically.
          </p>
        </section>
      )}

      {editorOpen && backgroundUrl ? (
        <TicketCanvasEditor
          eventId={event.id}
          eventName={event.name}
          backgroundUrl={backgroundUrl}
          aspectRatio={aspectRatio}
          initialElements={elements}
          onClose={() => setEditorOpen(false)}
          onSaved={(savedElements) => {
            setElements(savedElements);
            setMode('custom');
            setDirty(false);
            setError(null);
            void Promise.all([
              invalidateEventQueries(queryClient, event.id),
              queryClient.invalidateQueries({
                queryKey: ['admin', 'event', event.id, 'ticket-template'],
              }),
            ]);
            maybeShowPublishDecision();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={publishOpen}
        title="Event setup saved"
        description="The event is ready. Publish it now so participants can register, or keep it as a draft and publish later from the event overview."
        confirmLabel="Publish now"
        cancelLabel="Later"
        loading={publishing}
        onConfirm={() => void publishNow()}
        onCancel={() => {
          setPublishOpen(false);
          router.push(`/admin/events/${event.id}`);
        }}
      />
    </div>
  );
}

export default function AdminTicketTemplatePage() {
  const params = useParams<{ eventId: string | string[] }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId ?? '';
  const eventQuery = useAdminEvent(eventId);
  const templateQuery = useAdminTicketTemplate(eventId);

  if (eventQuery.isLoading || templateQuery.isLoading) return <PageLoadingSkeleton />;

  if (
    eventQuery.isError
    || templateQuery.isError
    || !eventQuery.data?.data
    || !templateQuery.data?.data
  ) {
    const message = eventQuery.error instanceof Error
      ? eventQuery.error.message
      : templateQuery.error instanceof Error
        ? templateQuery.error.message
        : 'This event may have been removed or is not available.';
    return (
      <div className="space-y-6">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to events
        </Link>
        <EmptyState
          icon={CloudOff}
          title="Ticket configuration could not be loaded"
          description={message}
          action={(
            <button
              type="button"
              onClick={() => {
                void eventQuery.refetch();
                void templateQuery.refetch();
              }}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Try again
            </button>
          )}
        />
      </div>
    );
  }

  return (
    <TicketWorkspace
      key={eventQuery.data.data.id}
      event={eventQuery.data.data}
      initialTemplate={templateQuery.data.data}
    />
  );
}
