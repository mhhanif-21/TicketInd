'use client';

import Link from 'next/link';
import {
  CalendarDays,
  CalendarX2,
  ChevronRight,
  ClipboardList,
  CloudOff,
  RefreshCw,
  UserCheck,
  Users,
} from 'lucide-react';
import { AdaptiveImage } from '@/components/media/AdaptiveImage';
import { EmptyState } from '@/components/admin/empty-state';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAdminDashboard } from '@/lib/admin/queries/dashboard';
import type { DashboardEventSummary } from '@/lib/admin/types';
import { cn, formatEventDate, formatNumber } from '@/lib/admin/format';

function EventThumbnail({ event }: { event: DashboardEventSummary }) {
  if (event.posterUrl) {
    return (
      <AdaptiveImage
        src={event.posterUrl}
        alt=""
        sizes="56px"
        fit="cover"
        frameAspectRatio={1}
        containerClassName="h-14 w-14 shrink-0 rounded-xl border border-outline-variant bg-surface-container"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container text-secondary">
      <CalendarDays aria-hidden="true" className="h-5 w-5" />
    </div>
  );
}

function RecentEventRow({
  event,
  showStatus,
}: {
  event: DashboardEventSummary;
  showStatus?: boolean;
}) {
  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-container-low focus:bg-surface-container-low focus:outline-none sm:px-5"
    >
      <EventThumbnail event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-on-surface">{event.name}</p>
          {showStatus && event.status ? (
            <StatusBadge status={event.status} className="hidden sm:inline-flex" />
          ) : null}
        </div>
        <p className="mt-1 truncate font-description text-xs text-on-surface-variant">
          {formatEventDate(event.date)}
          <span aria-hidden="true" className="mx-1.5 text-outline-variant">•</span>
          {event.location}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-semibold text-on-surface">{formatNumber(event.registrants_count)}</p>
        <p className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-secondary">
          registrants
        </p>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-secondary transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function UpcomingEventRow({ event }: { event: DashboardEventSummary }) {
  const date = new Date(event.date);
  const validDate = !Number.isNaN(date.getTime());
  const month = validDate ? date.toLocaleDateString('en-GB', { month: 'short' }) : '—';
  const day = validDate ? date.toLocaleDateString('en-GB', { day: '2-digit' }) : '—';

  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-container-low focus:bg-surface-container-low focus:outline-none sm:px-5"
    >
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest">
        <span className="font-label-caps text-[9px] uppercase tracking-[0.08em] text-secondary">
          {month}
        </span>
        <span className="text-sm font-bold leading-tight text-on-surface">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-on-surface">{event.name}</p>
        <p className="mt-1 truncate font-description text-xs text-on-surface-variant">
          {event.location}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-on-surface">{formatNumber(event.registrants_count)}</p>
        <p className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-secondary">going</p>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-secondary transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

export default function AdminDashboardPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminDashboard();

  if (isLoading) return <PageLoadingSkeleton />;

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Overview"
          title="Dashboard"
          description="A live view of your events and registrations."
        />
        <EmptyState
          icon={CloudOff}
          title="Dashboard could not be loaded"
          description={error instanceof Error ? error.message : 'The dashboard is temporarily unavailable.'}
          action={(
            <button
              type="button"
              onClick={() => void refetch()}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Try again
            </button>
          )}
        />
      </div>
    );
  }

  const attendanceRate = data.total_registrations > 0
    ? Math.round((data.total_present / data.total_registrations) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Here is today's operational summary across every event."
        actions={(
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          >
            <RefreshCw aria-hidden="true" className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </button>
        )}
      />

      <section aria-label="Event statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Events created"
          value={formatNumber(data.total_events)}
          icon={ClipboardList}
          hint="Across the full event catalog"
        />
        <StatCard
          label="Registrations"
          value={formatNumber(data.total_registrations)}
          icon={Users}
          hint="All-time participant registrations"
        />
        <StatCard
          label="Present"
          value={formatNumber(data.total_present)}
          icon={UserCheck}
          hint={data.total_registrations > 0
            ? `${attendanceRate}% attendance rate`
            : 'No check-ins recorded yet'}
          tone="success"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Recent events</h2>
              <p className="mt-1 font-description text-xs text-on-surface-variant">
                The five most recently created events.
              </p>
            </div>
            <Link
              href="/admin/events"
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-on-surface underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
            >
              View all
            </Link>
          </div>

          {data.recent_events.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarDays}
              title="No events yet"
              description="Create your first event to start collecting registrations."
              action={(
                <Link
                  href="/admin/events/new"
                  className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Create event
                </Link>
              )}
            />
          ) : (
            <div className="divide-y divide-outline-variant/70">
              {data.recent_events.map((event) => (
                <RecentEventRow key={event.id} event={event} showStatus />
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Upcoming events</h2>
              <p className="mt-1 font-description text-xs text-on-surface-variant">
                Published events scheduled next.
              </p>
            </div>
            <Link
              href="/admin/events"
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-on-surface underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
            >
              View all
            </Link>
          </div>

          {data.upcoming_events.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarX2}
              title="No upcoming events"
              description="Published events with a future date will appear here."
            />
          ) : (
            <div className="divide-y divide-outline-variant/70">
              {data.upcoming_events.map((event) => (
                <UpcomingEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
