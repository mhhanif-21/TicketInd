'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  CloudOff,
  Download,
  ExternalLink,
  Globe2,
  Loader2,
  Lock,
  RefreshCw,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { CopyButton } from '@/components/admin/copy-button';
import { EmptyState } from '@/components/admin/empty-state';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { StatusBadge } from '@/components/admin/status-badge';
import { useToast } from '@/components/admin/toast';
import {
  eventAccessState,
  registrationQrFileName,
  registrationQrPath,
  scannerUrlFromRegistrationUrl,
} from '@/lib/admin/access';
import { useRegenerateVolunteerPin } from '@/lib/admin/queries/access';
import { useAdminEvent } from '@/lib/admin/queries/events';
import type { AdminEventDetail } from '@/lib/admin/types';

function AccessUnavailable({
  eventId,
  state,
}: {
  eventId: string;
  state: 'draft' | 'cancelled';
}) {
  const cancelled = state === 'cancelled';
  const Icon = cancelled ? Ban : Lock;

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 text-center shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-10">
      <span
        className={
          cancelled
            ? 'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700'
            : 'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-secondary'
        }
      >
        <Icon aria-hidden="true" className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-on-surface">
        {cancelled ? 'Event cancelled' : 'Event not published yet'}
      </h2>
      <p className="mx-auto mt-2 max-w-lg font-description text-sm leading-relaxed text-on-surface-variant">
        {cancelled
          ? 'Registration link, registration QR, and scanner access are not available for cancelled events.'
          : 'Registration link, registration QR, and scanner access will be available after the event is published.'}
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Link
          href={`/admin/events/${eventId}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to event overview
        </Link>
        {!cancelled ? (
          <Link
            href={`/admin/events/${eventId}/edit`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Review event details
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function RegistrationAccessCard({ event }: { event: AdminEventDetail }) {
  const { toast } = useToast();
  const [qrAttempt, setQrAttempt] = useState(0);
  const [qrFailed, setQrFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const registrationUrl = event.public_registration_url;
  const qrPath = registrationQrPath(event.slug);

  async function downloadQr() {
    if (downloading) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      const response = await fetch(qrPath, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('The registration QR could not be downloaded. Please try again.');
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('image/png')) {
        throw new Error('The registration QR returned an unexpected response. Please try again.');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = registrationQrFileName(event.slug);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      toast({
        variant: 'success',
        title: 'Registration QR downloaded',
        description: registrationQrFileName(event.slug),
      });
    } catch (error) {
      setDownloadError(error instanceof Error
        ? error.message
        : 'The registration QR could not be downloaded. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
          <Globe2 aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-on-surface">Participant registration access</h2>
          <p className="mt-1 font-description text-sm text-on-surface-variant">
            Share this link or QR code so participants can register for the event.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
          Registration link
        </p>
        {registrationUrl ? (
          <div className="mt-1.5 flex items-center gap-2">
            <code
              title={registrationUrl}
              className="min-w-0 flex-1 truncate rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface-variant"
            >
              {registrationUrl}
            </code>
            <CopyButton
              value={registrationUrl}
              label="Copy registration link"
              toastTitle="Registration link copied"
            />
          </div>
        ) : (
          <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-description text-xs text-amber-900">
            The registration link is not available. Check the event status and refresh this page.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-1 items-center justify-center">
        <div className="w-full max-w-[240px] rounded-2xl border border-outline-variant bg-white p-4">
          {qrFailed ? (
            <div className="flex aspect-square flex-col items-center justify-center px-3 text-center">
              <ScanLine aria-hidden="true" className="h-7 w-7 text-secondary" />
              <p className="mt-2 font-description text-xs text-on-surface-variant">
                Registration QR not available yet.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQrFailed(false);
                  setQrAttempt((attempt) => attempt + 1);
                }}
                className="mt-3 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Try again
              </button>
            </div>
          ) : (
            // The QR is generated by the public endpoint on this same origin.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${qrPath}-${qrAttempt}`}
              src={qrPath}
              alt={`Registration QR code for ${event.name}`}
              className="aspect-square h-auto w-full object-contain"
              onError={() => setQrFailed(true)}
            />
          )}
        </div>
      </div>

      {downloadError ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
          {downloadError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void downloadQr()}
          disabled={downloading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Download aria-hidden="true" className="h-4 w-4" />
          )}
          Download QR
        </button>
        {registrationUrl ? (
          <a
            href={registrationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            Open registration page
          </a>
        ) : null}
      </div>
    </section>
  );
}

function ScannerAccessCard({ event }: { event: AdminEventDetail }) {
  const { toast } = useToast();
  const regeneratePin = useRegenerateVolunteerPin(event.id);
  const [confirmPinOpen, setConfirmPinOpen] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinFresh, setPinFresh] = useState(false);

  const scannerUrl = scannerUrlFromRegistrationUrl(event.public_registration_url);
  const activePin = event.volunteer_pin;

  async function handleRegeneratePin() {
    setPinError(null);
    try {
      await regeneratePin.mutateAsync();
      setConfirmPinOpen(false);
      setPinFresh(true);
      toast({
        variant: 'success',
        title: 'New committee PIN generated',
        description: 'The previous PIN no longer works for new volunteer sign-ins.',
      });
    } catch (error) {
      setConfirmPinOpen(false);
      setPinError(error instanceof Error
        ? error.message
        : 'The committee PIN could not be generated. Please try again.');
    }
  }

  return (
    <section className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-on-surface">Committee scanner access</h2>
          <p className="mt-1 font-description text-sm text-on-surface-variant">
            Field volunteers open this URL and sign in with the active PIN to scan participant tickets.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
          Scanner URL
        </p>
        {scannerUrl ? (
          <div className="mt-1.5 flex items-center gap-2">
            <code
              title={scannerUrl}
              className="min-w-0 flex-1 truncate rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface-variant"
            >
              {scannerUrl}
            </code>
            <CopyButton
              value={scannerUrl}
              label="Copy scanner URL"
              toastTitle="Scanner URL copied"
            />
          </div>
        ) : (
          <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-description text-xs text-amber-900">
            The scanner URL is not available. Check the event status and refresh this page.
          </p>
        )}
      </div>

      <div
        className="mt-5 rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-8 text-center"
        aria-live="polite"
      >
        {activePin ? (
          <div className="flex flex-col items-center">
            <div className="flex max-w-full items-center justify-center gap-2">
              <p className="truncate font-mono text-3xl font-bold tracking-[0.22em] text-on-surface sm:text-4xl sm:tracking-[0.3em]">
                {activePin}
              </p>
              <CopyButton
                value={activePin}
                label="Copy committee PIN"
                toastTitle="Committee PIN copied"
              />
            </div>
            <p className="mt-3 font-label-caps text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">
              PIN active
            </p>
            <p className="mt-1 font-description text-xs text-on-surface-variant">
              Share this PIN only with field volunteers.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Lock aria-hidden="true" className="h-9 w-9 text-on-surface" />
            <p className="mt-3 text-sm font-semibold text-on-surface">PIN not generated yet</p>
            <p className="mt-1 font-description text-xs text-on-surface-variant">
              Generate a PIN below so volunteers can sign in to the scanner.
            </p>
          </div>
        )}
      </div>

      {pinFresh ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <p className="font-description text-xs text-emerald-900">
            New PIN generated. Share it with volunteers now; the previous PIN no longer works for
            new sign-ins.
          </p>
        </div>
      ) : null}

      {pinError ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
          {pinError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            setPinError(null);
            setConfirmPinOpen(true);
          }}
          disabled={regeneratePin.isPending}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {regeneratePin.isPending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          )}
          {activePin ? 'Generate new PIN' : 'Generate PIN'}
        </button>
        {scannerUrl ? (
          <a
            href={scannerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <ScanLine aria-hidden="true" className="h-4 w-4" />
            Open scanner page
          </a>
        ) : null}
      </div>

      <p className="mt-4 border-t border-outline-variant pt-4 font-description text-xs leading-relaxed text-on-surface-variant">
        Regenerating the PIN immediately invalidates the old PIN for new volunteer sign-ins.
        Volunteers who are already signed in can keep scanning until their session expires.
      </p>

      <ConfirmDialog
        open={confirmPinOpen}
        title="Regenerate committee PIN?"
        description="The current PIN will stop working immediately for new volunteer sign-ins. Share the new PIN with field volunteers after regenerating."
        confirmLabel="Yes, regenerate PIN"
        cancelLabel="Cancel"
        tone="danger"
        loading={regeneratePin.isPending}
        onConfirm={() => void handleRegeneratePin()}
        onCancel={() => setConfirmPinOpen(false)}
      />
    </section>
  );
}

export default function AdminEventAccessPage() {
  const params = useParams<{ eventId: string | string[] }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId ?? '';
  const eventQuery = useAdminEvent(eventId);

  if (eventQuery.isLoading) return <PageLoadingSkeleton />;

  if (eventQuery.isError || !eventQuery.data?.data) {
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
          title="Event access could not be loaded"
          description={eventQuery.error instanceof Error
            ? eventQuery.error.message
            : 'This event may have been removed or is not available.'}
          action={(
            <button
              type="button"
              onClick={() => void eventQuery.refetch()}
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

  const event = eventQuery.data.data;
  const accessState = eventAccessState(event.status);

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
                Committee access
              </p>
              <StatusBadge status={event.status} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
              {event.name}
            </h1>
            <p className="mt-2 max-w-2xl font-description text-sm text-on-surface-variant">
              Share the registration link with participants, and the scanner URL plus PIN with field
              volunteers.
            </p>
          </div>

          {accessState === 'active' && event.public_registration_url ? (
            <a
              href={event.public_registration_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              Open registration page
            </a>
          ) : null}
        </div>
      </div>

      {accessState === 'active' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <RegistrationAccessCard event={event} />
          <ScannerAccessCard event={event} />
        </div>
      ) : (
        <AccessUnavailable eventId={event.id} state={accessState} />
      )}
    </div>
  );
}
