'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  RefreshCw,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react';
import { AdaptiveImage } from '@/components/media/AdaptiveImage';
import { EmptyState } from '@/components/admin/empty-state';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAdminEvent, useEventStats } from '@/lib/admin/queries/events';
import { formatEventDate, formatNumber } from '@/lib/admin/format';

export default function AdminEventDetailPage() {
  const params = useParams<{ eventId: string | string[] }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId ?? '';
  const eventQuery = useAdminEvent(eventId);
  const statsQuery = useEventStats(eventId);
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

          {event.public_registration_url ? (
            <a
              href={event.public_registration_url}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              View public page
            </a>
          ) : null}
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
          {event.posterUrl ? (
            <AdaptiveImage
              src={event.posterUrl}
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
                  Date
                </dt>
                <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium text-on-surface">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 text-secondary" />
                  {formatEventDate(event.date)}
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

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <Info aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-amber-950">More tools are on the way</h2>
                <p className="mt-1 font-description text-xs leading-relaxed text-amber-900/80">
                  Event editing, form builder, ticket templates, access management, and
                  participant review will be added to the web admin in the next releases.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
