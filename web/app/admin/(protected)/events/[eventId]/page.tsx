'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe,
  Layers,
  ListChecks,
  MapPin,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Ticket,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { AdaptiveImage } from '@/components/media/AdaptiveImage';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { useToast } from '@/components/admin/toast';
import {
  useAdminEvent,
  useDeleteEvent,
  useEventStats,
  useSetEventStatus,
} from '@/lib/admin/queries/events';
import { formatEventDateTime, formatNumber } from '@/lib/admin/format';

type ConfirmAction = 'publish' | 'cancel' | 'delete' | null;

export default function AdminEventDetailPage() {
  const params = useParams<{ eventId: string | string[] }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId ?? '';
  const router = useRouter();
  const { toast } = useToast();
  const eventQuery = useAdminEvent(eventId);
  const statsQuery = useEventStats(eventId);
  const statusMutation = useSetEventStatus(eventId);
  const deleteMutation = useDeleteEvent(eventId);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const event = eventQuery.data?.data;
  const stats = statsQuery.data?.data;

  if (eventQuery.isLoading) return <PageLoadingSkeleton />;

  if (eventQuery.isError || !event) {
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
          icon={Layers}
          title="Event could not be loaded"
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

  const pending = stats?.pending ?? 0;
  const accepted = stats?.accepted ?? 0;
  const present = stats?.present ?? 0;
  const capacity = stats?.total_capacity ?? event.capacity;
  const actionLoading = statusMutation.isPending || deleteMutation.isPending;
  const heroPosterUrl = event.posterUrl
    ?? event.media?.find((item) => item.role === 'cover')?.publicUrl
    ?? null;

  async function handleConfirm() {
    const action = confirmAction;
    if (!action || !event) return;

    try {
      if (action === 'delete') {
        await deleteMutation.mutateAsync();
        toast({ variant: 'success', title: 'Event deleted permanently' });
        router.push('/admin/events');
        return;
      }

      await statusMutation.mutateAsync(action === 'publish' ? 'Published' : 'Cancelled');
      toast({
        variant: 'success',
        title: action === 'publish' ? 'Event published' : 'Event cancelled',
        description: action === 'publish'
          ? 'The event is now visible to participants.'
          : 'New registrations are no longer accepted.',
      });
      setConfirmAction(null);
    } catch (error) {
      setConfirmAction(null);
      toast({
        variant: 'error',
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  const managementItems = [
    {
      href: `/admin/events/${event.id}/edit`,
      icon: Pencil,
      title: 'Edit event details',
      description: 'Change information, date, capacity, and posters.',
      available: true,
    },
    {
      href: `/admin/events/${event.id}/form`,
      icon: ListChecks,
      title: 'Registration form',
      description: 'Manage custom questions, options, and field order.',
      available: true,
    },
    {
      href: `/admin/events/${event.id}/ticket`,
      icon: Ticket,
      title: 'Ticket & email template',
      description: 'Customize the ticket canvas and Manual Review emails.',
      available: true,
    },
    {
      href: `/admin/events/${event.id}/access`,
      icon: ShieldCheck,
      title: 'Committee access',
      description: 'Registration link, QR code, scanner URL, and volunteer PIN.',
      available: true,
    },
    {
      href: `/admin/events/${event.id}/participants`,
      icon: Users,
      title: 'Participants & review',
      description: 'Review registrations and issue tickets.',
      available: false,
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to events
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
                Event overview
              </p>
              <StatusBadge status={event.status} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
              {event.name}
            </h1>
            <p className="mt-1.5 font-description text-sm text-secondary">/{event.slug}</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {event.public_registration_url ? (
              <a
                href={event.public_registration_url}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                Public page
              </a>
            ) : null}
            <Link
              href={`/admin/events/${event.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit event
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending review" value={formatNumber(pending)} icon={Clock3} tone="warning" />
        <StatCard label="Accepted" value={formatNumber(accepted)} icon={CheckCircle2} tone="success" />
        <StatCard label="Present" value={formatNumber(present)} icon={UserCheck} />
        <StatCard label="Capacity" value={formatNumber(capacity)} icon={Users} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          {heroPosterUrl ? (
            <AdaptiveImage
              src={heroPosterUrl}
              alt={`Poster for ${event.name}`}
              sizes="(max-width: 1280px) 100vw, 720px"
              fit="cover"
              frameAspectRatio={16 / 9}
              blurredBackdrop
              containerClassName="border-b border-outline-variant bg-surface-container"
            />
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center border-b border-outline-variant bg-surface-container px-6 text-center font-headline-md text-headline-md text-secondary">
              {event.name}
            </div>
          )}

          <div className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-on-surface">Event details</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
                  Date & time
                </dt>
                <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-on-surface">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 text-secondary" />
                  {formatEventDateTime(event.date)}
                </dd>
              </div>
              <div>
                <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
                  Location
                </dt>
                <dd className="mt-1.5 flex items-start gap-2 text-sm font-medium text-on-surface">
                  <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <span>{event.location}</span>
                </dd>
              </div>
              <div>
                <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
                  Registration mode
                </dt>
                <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-on-surface">
                  <Ticket aria-hidden="true" className="h-4 w-4 text-secondary" />
                  {event.registrationMode}
                </dd>
              </div>
              <div>
                <dt className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
                  Capacity
                </dt>
                <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-on-surface">
                  <Users aria-hidden="true" className="h-4 w-4 text-secondary" />
                  {formatNumber(event.capacity)} participants
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-outline-variant pt-5">
              <h3 className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary">
                Description
              </h3>
              <p className="mt-2 whitespace-pre-wrap font-description text-sm leading-relaxed text-on-surface-variant">
                {event.description || 'No description has been added for this event.'}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <h2 className="text-base font-semibold text-on-surface">Operational snapshot</h2>
            <p className="mt-1 font-description text-xs text-on-surface-variant">
              Live registration and check-in counts for this event.
            </p>

            {statsQuery.isLoading ? (
              <div className="mt-5 space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded-xl bg-surface-container" />
                ))}
              </div>
            ) : statsQuery.isError ? (
              <p className="mt-5 rounded-xl bg-red-50 px-3 py-2.5 font-description text-xs text-red-800">
                Live metrics could not be loaded. Event details are still available.
              </p>
            ) : (
              <dl className="mt-5 space-y-3">
                {[
                  { label: 'Pending review', value: pending },
                  { label: 'Accepted registrations', value: accepted },
                  { label: 'Checked in', value: present },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl bg-surface-container-low px-3.5 py-3"
                  >
                    <dt className="font-description text-xs text-on-surface-variant">{item.label}</dt>
                    <dd className="text-sm font-semibold text-on-surface">{formatNumber(item.value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {event.status === 'Draft' ? (
            <section className="rounded-2xl border border-outline-variant bg-primary p-5 text-on-primary">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Globe aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">Ready to go live?</h2>
                  <p className="mt-1 font-description text-xs leading-relaxed text-white/70">
                    Publishing makes the event visible and opens registration. You can publish
                    after checking the form and ticket setup.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmAction('publish')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
              >
                <Globe aria-hidden="true" className="h-4 w-4" />
                Publish event
              </button>
            </section>
          ) : null}
        </div>
      </div>

      <section>
        <h2 className="text-base font-semibold text-on-surface">Event management</h2>
        <p className="mt-1 font-description text-sm text-on-surface-variant">
          Tools for running this event from the web admin.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {managementItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface">{item.title}</span>
                    {!item.available ? (
                      <span className="rounded-full border border-outline-variant px-1.5 py-0.5 font-label-caps text-[8px] uppercase tracking-[0.08em] text-secondary">
                        Soon
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block font-description text-xs text-on-surface-variant">
                    {item.description}
                  </span>
                </span>
              </>
            );

            return item.available ? (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:border-primary/40 hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {content}
              </Link>
            ) : (
              <div
                key={item.title}
                aria-disabled="true"
                className="flex cursor-not-allowed items-start gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 opacity-65"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-800">
            <XCircle aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-red-950">Danger zone</h2>
            <p className="mt-1 font-description text-xs leading-relaxed text-red-900/70">
              Cancelling stops new registrations. Deleting removes the event, form, registrations,
              tickets, and stored files permanently.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {event.status !== 'Cancelled' ? (
                <button
                  type="button"
                  onClick={() => setConfirmAction('cancel')}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <XCircle aria-hidden="true" className="h-4 w-4" />
                  Cancel event
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setConfirmAction('delete')}
                className="inline-flex items-center gap-2 rounded-xl bg-error px-3.5 py-2 text-sm font-semibold text-on-error transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmAction === 'publish'}
        title="Publish this event?"
        description="The event will become visible on the public page and registration will open. Make sure the registration form and ticket setup are ready."
        confirmLabel="Publish event"
        loading={actionLoading}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'cancel'}
        title="Cancel this event?"
        description="New registrations will no longer be accepted and public access will be disabled. This cannot be undone."
        confirmLabel="Cancel event"
        tone="danger"
        loading={actionLoading}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'delete'}
        title="Delete this event permanently?"
        description="The event, registration form, participants, tickets, exports, and stored files will be permanently deleted. This cannot be undone."
        confirmLabel="Delete permanently"
        tone="danger"
        loading={actionLoading}
        requireConfirmationText={event.name}
        confirmationHint="Type the exact event name to enable deletion:"
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
