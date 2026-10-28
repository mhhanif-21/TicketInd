'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CloudOff,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Ticket,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FilePreviewDialog } from '@/components/admin/file-preview-dialog';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { AttendanceBadge, StatusBadge } from '@/components/admin/status-badge';
import { useToast } from '@/components/admin/toast';
import { AdminApiError } from '@/lib/admin/api';
import { formatEventDateTime, initials } from '@/lib/admin/format';
import { useAdminEvent } from '@/lib/admin/queries/events';
import {
  fetchParticipantFile,
  useAdminParticipant,
  useRetryParticipantTicket,
  useReviewParticipant,
} from '@/lib/admin/queries/participants';
import {
  buildParticipantAnswerRows,
  participantHasDownloadableTicket,
  participantOrganizationValue,
  participantTicketDownloadUrl,
  participantTicketNeedsRetry,
} from '@/lib/admin/participants';
import type { AdminParticipant } from '@/lib/admin/types';
import { cn } from '@/lib/admin/format';

type ReviewAction = 'approve' | 'reject';

interface PreviewFile {
  fileName: string;
  mimeType: string;
  url: string;
}

const toneStyles = {
  success: {
    box: 'border-emerald-200 bg-emerald-50',
    icon: 'text-emerald-700',
    title: 'text-emerald-950',
    text: 'text-emerald-900/75',
    Icon: CheckCircle2,
  },
  warning: {
    box: 'border-amber-200 bg-amber-50',
    icon: 'text-amber-700',
    title: 'text-amber-950',
    text: 'text-amber-900/75',
    Icon: Clock3,
  },
  error: {
    box: 'border-red-200 bg-red-50',
    icon: 'text-red-700',
    title: 'text-red-950',
    text: 'text-red-900/75',
    Icon: XCircle,
  },
  neutral: {
    box: 'border-outline-variant bg-surface-container-low',
    icon: 'text-secondary',
    title: 'text-on-surface',
    text: 'text-on-surface-variant',
    Icon: Ticket,
  },
} as const;

function ticketState(participant: AdminParticipant): {
  tone: keyof typeof toneStyles;
  title: string;
  description: string;
  inProgress: boolean;
} {
  if (participant.status === 'Pending') {
    return {
      tone: 'neutral',
      title: 'Awaiting review',
      description: 'Approve this registration to accept the participant and issue a ticket.',
      inProgress: false,
    };
  }
  if (participant.status === 'Rejected') {
    return {
      tone: 'error',
      title: 'Registration rejected',
      description: 'No ticket was issued because this registration was rejected.',
      inProgress: false,
    };
  }
  if (participant.status === 'Draft') {
    return {
      tone: 'neutral',
      title: 'Still a draft',
      description: 'This registration has not been submitted for review yet.',
      inProgress: false,
    };
  }
  if (participant.status === 'Expired') {
    return {
      tone: 'neutral',
      title: 'Registration expired',
      description: 'This registration expired before it was reviewed.',
      inProgress: false,
    };
  }

  if (participant.ticketJobStatus === 'failed') {
    return {
      tone: 'error',
      title: 'Ticket generation failed',
      description: participant.qrCodeUrl
        ? 'The ticket artwork exists, but ticket delivery failed. Retry issuance to send it again.'
        : 'The participant is accepted, but their ticket could not be generated. Retry issuance below.',
      inProgress: false,
    };
  }
  if (participant.ticketJobStatus === 'cancelled') {
    return {
      tone: 'warning',
      title: 'Ticket generation cancelled',
      description: 'The ticket job was cancelled. Contact support if this participant still needs a ticket.',
      inProgress: false,
    };
  }
  if (
    participant.ticketJobStatus === 'queued'
    || participant.ticketJobStatus === 'publishing'
    || participant.ticketJobStatus === 'published'
    || participant.ticketJobStatus === 'processing'
  ) {
    return {
      tone: 'warning',
      title: 'Ticket generation in progress',
      description: 'The ticket is being generated and emailed. Refresh this page to check the latest status.',
      inProgress: true,
    };
  }
  if (participant.qrCodeUrl) {
    return {
      tone: 'success',
      title: 'Ticket issued',
      description: 'The ticket artwork is ready. You can download it for manual delivery if needed.',
      inProgress: false,
    };
  }
  if (participant.ticketJobStatus === 'completed') {
    return {
      tone: 'error',
      title: 'Ticket artwork is missing',
      description: 'The ticket job completed without producing artwork. Contact support before retrying.',
      inProgress: false,
    };
  }
  return {
    tone: 'warning',
    title: 'Ticket not issued yet',
    description: 'This participant is accepted but has no ticket artwork. Retry issuance below.',
    inProgress: false,
  };
}

export default function AdminParticipantDetailPage() {
  const params = useParams<{ eventId: string | string[]; registrationId: string | string[] }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId ?? '';
  const registrationId = Array.isArray(params.registrationId)
    ? params.registrationId[0]
    : params.registrationId ?? '';
  const router = useRouter();
  const { toast } = useToast();
  const eventQuery = useAdminEvent(eventId);
  const detailQuery = useAdminParticipant(registrationId);
  const reviewMutation = useReviewParticipant(eventId, registrationId);
  const retryMutation = useRetryParticipantTicket(eventId, registrationId);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [fileBusyKey, setFileBusyKey] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  const listUrl = `/admin/events/${eventId}/participants`;
  const participant = detailQuery.data?.data;
  const event = eventQuery.data?.data;

  if (detailQuery.isLoading) return <PageLoadingSkeleton />;

  if (
    (detailQuery.isError && !participant)
    || !participant
    || (participant.eventId && participant.eventId !== eventId)
  ) {
    return (
      <div className="space-y-6">
        <Link
          href={listUrl}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to participants
        </Link>
        <EmptyState
          icon={CloudOff}
          title="Participant could not be loaded"
          description={
            participant && participant.eventId !== eventId
              ? 'This participant does not belong to the selected event.'
              : detailQuery.error instanceof Error
                ? detailQuery.error.message
                : 'This participant may have been removed or is not available.'
          }
          action={(
            <button
              type="button"
              onClick={() => void detailQuery.refetch()}
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

  const answerRows = buildParticipantAnswerRows({
    answers: participant.answers,
    answerFieldLabels: participant.answerFieldLabels,
  });
  const organization = participantOrganizationValue({
    answers: participant.answers,
    answerFieldLabels: participant.answerFieldLabels,
  });
  const ticket = ticketState(participant);
  const tone = toneStyles[ticket.tone];
  const ticketDownload = participantTicketDownloadUrl(
    participant.qrCodeUrl,
    participant.ticketCode,
  );
  const hasDownloadableTicket = participantHasDownloadableTicket(participant);
  const needsRetry = participantTicketNeedsRetry(participant);
  const canReview = participant.status === 'Pending';
  const participantId = participant.id;

  async function handleReview() {
    if (!reviewAction) return;
    const action = reviewAction;
    try {
      await reviewMutation.mutateAsync(action === 'approve' ? 'Approve' : 'Reject');
      setReviewAction(null);
      toast({
        variant: 'success',
        title: action === 'approve' ? 'Participant approved' : 'Participant rejected',
        description: action === 'approve'
          ? 'Ticket generation has been queued.'
          : 'The registration is now closed.',
      });
      router.push(listUrl);
    } catch (error) {
      setReviewAction(null);
      const refreshed = await detailQuery.refetch();
      const latest = refreshed.data?.data;
      const statusChanged = latest && latest.status !== 'Pending';

      if (statusChanged) {
        toast({
          variant: 'error',
          title: latest.status === 'Accepted'
            ? 'Participant accepted, but ticket issuance needs attention'
            : 'Participant status changed',
          description: latest.status === 'Accepted'
            ? 'The review was saved, but the ticket job could not be published. Retry ticket issuance from this page.'
            : error instanceof Error
              ? error.message
              : 'The latest status has been loaded.',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Review could not be saved',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      }
    }
  }

  async function handleRetryTicket() {
    try {
      await retryMutation.mutateAsync();
      toast({
        variant: 'success',
        title: 'Ticket retry queued',
        description: 'Refresh this page after a moment to see the updated ticket status.',
      });
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Ticket retry failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  async function handleOpenFile(fieldKey: string) {
    if (fileBusyKey) return;
    setFileError(null);
    setFileBusyKey(fieldKey);
    try {
      const response = await fetchParticipantFile(participantId, fieldKey);
      setPreviewFile({
        fileName: response.data.file_name,
        mimeType: response.data.mime_type,
        url: response.data.url,
      });
    } catch (error) {
      setFileError(error instanceof AdminApiError
        ? error.message
        : 'The participant file could not be opened. Please try again.');
    } finally {
      setFileBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={listUrl}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to participants
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
                Participant review
              </p>
              <StatusBadge status={participant.status} />
              <AttendanceBadge attendance={participant.presenceStatus} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
              {participant.name}
            </h1>
            <p className="mt-1.5 break-all font-description text-sm text-secondary">
              {participant.email}
              {event ? ` · ${event.name}` : ''}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void detailQuery.refetch()}
              disabled={detailQuery.isFetching}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            >
              <RefreshCw
                aria-hidden="true"
                className={cn('h-4 w-4', detailQuery.isFetching && 'animate-spin')}
              />
              Refresh
            </button>
            {hasDownloadableTicket && ticketDownload ? (
              <a
                href={ticketDownload}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Download ticket
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {detailQuery.isError ? (
        <section
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <p className="font-description text-sm text-amber-900">
            The latest participant data could not be loaded. Showing the last loaded record.
          </p>
          <button
            type="button"
            onClick={() => void detailQuery.refetch()}
            className="rounded-lg border border-amber-300 bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
          >
            Try again
          </button>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.8fr]">
        <section className="order-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-6 xl:order-none">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-xl font-semibold text-secondary">
              {initials(participant.name)}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-on-surface">{participant.name}</h2>
              <p className="mt-1 break-all font-description text-sm text-on-surface-variant">
                {participant.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={participant.status} />
                <AttendanceBadge attendance={participant.presenceStatus} />
              </div>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-outline-variant pt-5 sm:grid-cols-2">
            <div>
              <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
                Registered at
              </dt>
              <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-on-surface">
                <CalendarClock aria-hidden="true" className="h-4 w-4 text-secondary" />
                {formatEventDateTime(participant.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
                Organization
              </dt>
              <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-on-surface">
                <UserCheck aria-hidden="true" className="h-4 w-4 text-secondary" />
                <span className="break-words">{organization}</span>
              </dd>
            </div>
            <div>
              <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
                Email
              </dt>
              <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-on-surface">
                <Mail aria-hidden="true" className="h-4 w-4 text-secondary" />
                <a
                  href={`mailto:${participant.email}`}
                  className="break-all underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {participant.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
                Ticket code
              </dt>
              <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-on-surface">
                <Ticket aria-hidden="true" className="h-4 w-4 text-secondary" />
                <span className="font-mono">{participant.ticketCode ?? 'Not issued'}</span>
              </dd>
            </div>
          </dl>
        </section>

        <aside className="order-1 space-y-4 xl:order-none">
          {canReview ? (
            <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
              <h2 className="text-base font-semibold text-on-surface">Review registration</h2>
              <p className="mt-1.5 font-description text-sm text-on-surface-variant">
                Approving accepts the participant and queues ticket generation and email delivery.
                Rejecting closes the registration without issuing a ticket.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction('approve')}
                  disabled={reviewMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewMutation.isPending && reviewAction === 'approve' ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  )}
                  Approve & issue ticket
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction('reject')}
                  disabled={reviewMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle aria-hidden="true" className="h-4 w-4" />
                  Reject registration
                </button>
              </div>
              <p className="mt-4 border-t border-outline-variant pt-4 font-description text-xs leading-relaxed text-on-surface-variant">
                Review actions are final. Make sure the participant&apos;s answers are complete
                before approving.
              </p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-on-surface">Ticket & attendance</h2>
              {participant.status === 'Accepted' ? (
                <button
                  type="button"
                  onClick={() => void detailQuery.refetch()}
                  disabled={detailQuery.isFetching}
                  aria-label="Refresh ticket status"
                  className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                >
                  <RefreshCw
                    aria-hidden="true"
                    className={cn('h-3.5 w-3.5', detailQuery.isFetching && 'animate-spin')}
                  />
                </button>
              ) : null}
            </div>

            <div className={cn('mt-4 rounded-xl border p-4', tone.box)}>
              <div className="flex items-start gap-3">
                <tone.Icon aria-hidden="true" className={cn('mt-0.5 h-5 w-5 shrink-0', tone.icon)} />
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold', tone.title)}>{ticket.title}</p>
                  <p className={cn('mt-1 font-description text-xs leading-relaxed', tone.text)}>
                    {ticket.description}
                  </p>
                </div>
              </div>
            </div>

            {participant.ticketJobStatus === 'failed' && participant.ticketJobLastError ? (
              <details className="mt-3 rounded-xl bg-surface-container-low px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-on-surface-variant">
                  Technical details
                </summary>
                <p className="mt-2 max-h-32 overflow-auto break-words font-mono text-[11px] leading-relaxed text-secondary">
                  {participant.ticketJobLastError}
                </p>
              </details>
            ) : null}

            <div className="mt-4 space-y-2">
              {hasDownloadableTicket && ticketDownload ? (
                <a
                  href={ticketDownload}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  Download ticket
                </a>
              ) : null}

              {needsRetry ? (
                <button
                  type="button"
                  onClick={() => void handleRetryTicket()}
                  disabled={retryMutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {retryMutation.isPending ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  )}
                  Retry ticket issuance
                </button>
              ) : null}

              {ticket.inProgress ? (
                <p className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-container-low px-3 py-2 font-description text-xs text-on-surface-variant">
                  <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                  Waiting for the ticket worker
                </p>
              ) : null}
            </div>

            <p className="mt-4 border-t border-outline-variant pt-4 font-description text-xs leading-relaxed text-on-surface-variant">
              Attendance: {participant.presenceStatus === 'Present' ? 'checked in' : 'not checked in'}.
              Ticket downloads use a short-lived signed file link.
            </p>
          </section>
        </aside>

        <section className="order-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-6 xl:order-none xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Form answers</h2>
              <p className="mt-1 font-description text-sm text-on-surface-variant">
                Labels come from the snapshot saved when this participant registered.
              </p>
            </div>
            <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-caps text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">
              {answerRows.length} {answerRows.length === 1 ? 'answer' : 'answers'}
            </span>
          </div>

          {fileError ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
              {fileError}
            </p>
          ) : null}

          {answerRows.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-6 text-center font-description text-sm text-on-surface-variant">
              This participant did not answer any custom questions.
            </p>
          ) : (
            <dl className="mt-5 divide-y divide-outline-variant/70">
              {answerRows.map((row) => (
                <div key={row.fieldKey} className="grid gap-1.5 py-4 sm:grid-cols-[220px_1fr] sm:gap-4">
                  <dt className="font-label-caps text-[10px] uppercase tracking-[0.1em] text-secondary">
                    {row.label}
                  </dt>
                  <dd className="min-w-0">
                    {row.isFile ? (
                      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low/60 px-3.5 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-secondary">
                          {row.isImage ? (
                            <ImageIcon aria-hidden="true" className="h-4 w-4" />
                          ) : (
                            <FileText aria-hidden="true" className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-all text-sm font-medium text-on-surface">{row.value}</p>
                          <p className="mt-0.5 truncate font-description text-[11px] text-secondary">
                            {row.mimeType || 'File'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleOpenFile(row.fieldKey)}
                          disabled={Boolean(fileBusyKey)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                        >
                          {fileBusyKey === row.fieldKey ? (
                            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download aria-hidden="true" className="h-3.5 w-3.5" />
                          )}
                          {row.isImage ? 'View photo' : 'Open file'}
                        </button>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface">
                        {row.value}
                      </p>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={reviewAction === 'approve'}
        title="Approve this participant?"
        description="The registration will be accepted and ticket generation will be queued. The ticket email will be sent after the ticket is generated."
        confirmLabel="Approve participant"
        loading={reviewMutation.isPending}
        onConfirm={() => void handleReview()}
        onCancel={() => setReviewAction(null)}
      />

      <ConfirmDialog
        open={reviewAction === 'reject'}
        title="Reject this participant?"
        description="The registration will be rejected and no ticket will be issued. This final status cannot be changed from the admin UI."
        confirmLabel="Reject participant"
        loading={reviewMutation.isPending}
        tone="danger"
        onConfirm={() => void handleReview()}
        onCancel={() => setReviewAction(null)}
      />

      {previewFile ? (
        <FilePreviewDialog
          fileName={previewFile.fileName}
          mimeType={previewFile.mimeType}
          url={previewFile.url}
          onClose={() => setPreviewFile(null)}
        />
      ) : null}
    </div>
  );
}
