'use client';

import Link from 'next/link';
import {
  CalendarDays,
  CalendarX2,
  ChartNoAxesCombined,
  ChevronRight,
  CloudOff,
  RefreshCw,
  UserCheck,
  Users,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAdminDashboard } from '@/lib/admin/queries/dashboard';
import { cn, formatEventDate, formatNumber } from '@/lib/admin/format';

function UpcomingEventRow({
  event,
}: {
  event: {
    id: string;
    name: string;
    slug: string;
    date: string;
    location: string;
    status?: string;
    registrants_count: number;
  };
}) {
  const date = new Date(event.date);
  const validDate = !Number.isNaN(date.getTime());
  const month = validDate ? date.toLocaleDateString('en-GB', { month: 'short' }) : '—';
  const day = validDate ? date.toLocaleDateString('en-GB', { day: '2-digit' }) : '—';

  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-container-low focus:bg-surface-container-low focus:outline-none sm:px-5"
    >
      <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest">
        <span className="font-label-caps text-[9px] uppercase tracking-[0.08em] text-secondary">
          {month}
        </span>
        <span className="text-base font-bold leading-tight text-on-surface">{day}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-on-surface">{event.name}</p>
          {event.status ? <StatusBadge status={event.status} className="hidden sm:inline-flex" /> : null}
        </div>
        <p className="mt-1 truncate font-description text-xs text-on-surface-variant">
          {formatEventDate(event.date)}
          <span aria-hidden="true" className="mx-1.5 text-outline-variant">•</span>
          {event.location}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-on-surface">
          {formatNumber(event.registrants_count)}
        </p>
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

export default function AdminOversightPage() {
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
          eyebrow="Executive oversight"
          title="Oversight"
          description="Organization-wide registration and attendance summary."
        />
        <EmptyState
          icon={CloudOff}
          title="Oversight data could not be loaded"
          description={error instanceof Error
            ? error.message
            : 'The oversight summary is temporarily unavailable.'}
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
    ? (data.total_present / data.total_registrations) * 100
    : 0;
  const attendancePercent = Math.round(attendanceRate * 10) / 10;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Executive oversight"
        title="Oversight"
        description="A high-level, organization-wide summary for strategic monitoring."
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

      <section aria-label="Oversight statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total events"
          value={formatNumber(data.total_events)}
          icon={CalendarDays}
          hint="Across the full event catalog"
        />
        <StatCard
          label="Total registrations"
          value={formatNumber(data.total_registrations)}
          icon={Users}
          hint="All registration statuses"
        />
        <StatCard
          label="Present"
          value={formatNumber(data.total_present)}
          icon={UserCheck}
          hint="Participants checked in"
          tone="success"
        />
        <StatCard
          label="Attendance rate"
          value={`${attendancePercent.toFixed(1)}%`}
          icon={ChartNoAxesCombined}
          hint={data.total_registrations > 0
            ? `${formatNumber(data.total_present)} of ${formatNumber(data.total_registrations)} registrations`
            : 'No registrations recorded yet'}
        />
      </section>

      <section
        aria-label="Attendance overview"
        className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Attendance overview</h2>
            <p className="mt-1 font-description text-sm text-on-surface-variant">
              Present participants divided by all registrations across every event.
            </p>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-on-surface">
            {attendancePercent.toFixed(1)}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Attendance rate"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={attendancePercent}
          className="mt-5 h-3 overflow-hidden rounded-full bg-surface-container"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${Math.min(100, Math.max(0, attendancePercent))}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 font-description text-xs text-on-surface-variant">
          <span>{formatNumber(data.total_present)} checked in</span>
          <span>{formatNumber(data.total_registrations)} total registrations</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Upcoming events</h2>
            <p className="mt-1 font-description text-xs text-on-surface-variant">
              Published events scheduled next across the organization.
            </p>
          </div>
          <Link
            href="/admin/events"
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-on-surface underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
          >
            View all events
          </Link>
        </div>

        {data.upcoming_events.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarX2}
            title="No upcoming published events"
            description="Publish an event with a future date to see it in this oversight view."
            action={(
              <Link
                href="/admin/events"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                Open events
              </Link>
            )}
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
  );
}
