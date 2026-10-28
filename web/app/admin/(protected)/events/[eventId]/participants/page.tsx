'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudOff,
  Download,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { Pagination } from '@/components/admin/pagination';
import { AttendanceBadge, StatusBadge } from '@/components/admin/status-badge';
import { useAdminEvent } from '@/lib/admin/queries/events';
import { useParticipantExport } from '@/lib/admin/queries/exports';
import { useAdminParticipants } from '@/lib/admin/queries/participants';
import {
  participantHasDownloadableTicket,
  participantOrganizationValue,
  participantTicketDownloadUrl,
  withDownloadFileName,
} from '@/lib/admin/participants';
import { cn, formatEventDateTime, formatNumber, initials } from '@/lib/admin/format';
import { useDebouncedValue } from '@/lib/admin/use-debounced-value';
import type {
  AdminParticipant,
  AdminParticipantFilters,
  ParticipantAttendanceFilter,
  ParticipantFilterStatus,
  ParticipantSort,
} from '@/lib/admin/types';

const controlClassName =
  'h-10 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60';

const defaultFilters: AdminParticipantFilters = {
  page: 1,
  limit: 15,
  search: '',
  status: 'all',
  attendance: 'all',
  sort: 'desc',
  startDate: null,
  endDate: null,
};

function ParticipantAvatar({ participant }: { participant: AdminParticipant }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-sm font-semibold text-secondary">
      {initials(participant.name)}
    </span>
  );
}

function ParticipantTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <div className="border-b border-outline-variant p-4">
        <div className="h-4 w-36 animate-pulse rounded bg-surface-container-high" />
      </div>
      <div className="divide-y divide-outline-variant/70">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-surface-container-high" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-44 animate-pulse rounded bg-surface-container-high" />
              <div className="h-3 w-56 animate-pulse rounded bg-surface-container" />
            </div>
            <div className="hidden h-3 w-24 animate-pulse rounded bg-surface-container sm:block" />
            <div className="hidden h-5 w-20 animate-pulse rounded-full bg-surface-container md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminParticipantsPage() {
  const params = useParams<{ eventId: string | string[] }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId ?? '';
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const [filters, setFilters] = useState<AdminParticipantFilters>(defaultFilters);

  useEffect(() => {
    setFilters((current) => (
      current.search === debouncedSearch.trim()
        ? current
        : { ...current, search: debouncedSearch.trim(), page: 1 }
    ));
  }, [debouncedSearch]);

  const eventQuery = useAdminEvent(eventId);
  const participantsQuery = useAdminParticipants(eventId, filters);
  const exportControl = useParticipantExport(eventId);

  const participants = participantsQuery.data?.data ?? [];
  const meta = participantsQuery.data?.meta;
  const event = eventQuery.data?.data;
  const hasActiveFilters = filters.search !== ''
    || filters.status !== 'all'
    || filters.attendance !== 'all'
    || Boolean(filters.startDate)
    || Boolean(filters.endDate)
    || filters.sort !== 'desc';

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
          icon={CloudOff}
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

  const exportDownloadUrl = exportControl.fileUrl
    ? withDownloadFileName(exportControl.fileUrl, `${event.slug}-participants.csv`)
    : null;

  function updateFilter(patch: Partial<AdminParticipantFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  function updateStatus(status: ParticipantFilterStatus | 'all') {
    setFilters((current) => ({
      ...current,
      status,
      // The API keeps date filtering as a separate mode from status and
      // attendance; selecting one clears the other to avoid a 400 response.
      startDate: status === 'all' ? current.startDate : null,
      endDate: status === 'all' ? current.endDate : null,
      page: 1,
    }));
  }

  function updateAttendance(attendance: ParticipantAttendanceFilter | 'all') {
    setFilters((current) => ({
      ...current,
      attendance,
      startDate: attendance === 'all' ? current.startDate : null,
      endDate: attendance === 'all' ? current.endDate : null,
      page: 1,
    }));
  }

  function updateDate(field: 'start' | 'end', value: string) {
    setFilters((current) => {
      let startDate = field === 'start' ? value || null : current.startDate;
      let endDate = field === 'end' ? value || null : current.endDate;
      if (startDate && endDate && startDate > endDate) {
        if (field === 'start') endDate = startDate;
        else startDate = endDate;
      }
      const hasDateFilter = Boolean(startDate || endDate);
      return {
        ...current,
        startDate,
        endDate,
        status: hasDateFilter ? 'all' : current.status,
        attendance: hasDateFilter ? 'all' : current.attendance,
        page: 1,
      };
    });
  }

  function clearFilters() {
    setSearchInput('');
    setFilters({ ...defaultFilters, limit: filters.limit });
  }

  function changePage(page: number) {
    setFilters((current) => ({ ...current, page }));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const columns: DataTableColumn<AdminParticipant>[] = [
    {
      key: 'participant',
      header: 'Participant',
      render: (participant) => (
        <Link
          href={`/admin/events/${eventId}/participants/${participant.id}`}
          className="group flex min-w-0 items-center gap-3 focus:outline-none"
        >
          <ParticipantAvatar participant={participant} />
          <span className="min-w-0">
            <span className="block max-w-[240px] truncate text-sm font-semibold text-on-surface group-hover:underline">
              {participant.name}
            </span>
            <span className="mt-0.5 block max-w-[260px] truncate font-description text-xs text-secondary">
              {participant.email}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (participant) => (
        <span className="block max-w-[180px] truncate font-description text-sm text-on-surface-variant">
          {participantOrganizationValue({
            answers: participant.answers,
            answerFieldLabels: participant.answerFieldLabels,
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (participant) => <StatusBadge status={participant.status} />,
    },
    {
      key: 'attendance',
      header: 'Attendance',
      render: (participant) => <AttendanceBadge attendance={participant.presenceStatus} />,
    },
    {
      key: 'registered',
      header: 'Registered',
      render: (participant) => (
        <span className="whitespace-nowrap font-description text-sm text-on-surface-variant">
          {formatEventDateTime(participant.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (participant) => {
        const downloadUrl = participantHasDownloadableTicket(participant)
          ? participantTicketDownloadUrl(participant.qrCodeUrl, participant.ticketCode)
          : null;
        return (
          <div className="flex items-center justify-end gap-1">
            {downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Download ticket for ${participant.name}`}
                title="Download ticket"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
              </a>
            ) : null}
            <Link
              href={`/admin/events/${eventId}/participants/${participant.id}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {participant.status === 'Pending' ? 'Review' : 'View'}
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to event
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
                Participant management
              </p>
              <StatusBadge status={event.status} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
              Participants
            </h1>
            <p className="mt-2 max-w-2xl font-description text-sm text-on-surface-variant">
              {event.name} · Review registrations, issue tickets, and export participant data.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void participantsQuery.refetch()}
              disabled={participantsQuery.isFetching}
              aria-label="Refresh participant list"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            >
              <RefreshCw
                aria-hidden="true"
                className={cn('h-4 w-4', participantsQuery.isFetching && 'animate-spin')}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => void exportControl.start()}
              disabled={exportControl.isBusy}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportControl.isBusy ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Download aria-hidden="true" className="h-4 w-4" />
              )}
              {exportControl.isBusy
                ? 'Preparing CSV…'
                : exportControl.phase === 'ready'
                  ? 'Export again'
                  : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {exportControl.phase !== 'idle' && exportControl.message ? (
        <section
          role={exportControl.phase === 'failed' ? 'alert' : 'status'}
          className={cn(
            'flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3.5',
            exportControl.phase === 'ready' && 'border-emerald-200 bg-emerald-50',
            (exportControl.phase === 'starting' || exportControl.phase === 'polling')
              && 'border-outline-variant bg-surface-container-low',
            exportControl.phase === 'timeout' && 'border-amber-200 bg-amber-50',
            exportControl.phase === 'failed' && 'border-red-200 bg-red-50',
          )}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            {exportControl.phase === 'ready' ? (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            ) : exportControl.phase === 'starting' || exportControl.phase === 'polling' ? (
              <Loader2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-secondary" />
            ) : exportControl.phase === 'timeout' ? (
              <Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            ) : (
              <X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            )}
            <p
              className={cn(
                'font-description text-sm',
                exportControl.phase === 'ready' && 'text-emerald-900',
                (exportControl.phase === 'starting' || exportControl.phase === 'polling')
                  && 'text-on-surface-variant',
                exportControl.phase === 'timeout' && 'text-amber-900',
                exportControl.phase === 'failed' && 'text-red-800',
              )}
            >
              {exportControl.message}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {exportControl.phase === 'ready' && exportDownloadUrl ? (
              <a
                href={exportDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Download aria-hidden="true" className="h-3.5 w-3.5" />
                Download CSV
              </a>
            ) : null}
            {exportControl.phase === 'timeout' ? (
              <button
                type="button"
                onClick={() => void exportControl.checkAgain()}
                className="rounded-lg border border-amber-300 bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                Check status
              </button>
            ) : null}
            {exportControl.phase === 'failed' ? (
              <button
                type="button"
                onClick={() => void exportControl.start()}
                className="rounded-lg border border-red-300 bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                Try again
              </button>
            ) : null}
            {exportControl.phase !== 'starting' && exportControl.phase !== 'polling' ? (
              <button
                type="button"
                onClick={exportControl.reset}
                aria-label="Dismiss export status"
                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-white/60 hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section
        aria-label="Participant filters"
        className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] md:p-4"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="participant-search" className="sr-only">
                Search participants
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
              />
              <input
                id="participant-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name or email…"
                className={`${controlClassName} w-full pl-10 pr-9`}
              />
              {searchInput ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchInput('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <label htmlFor="participant-status" className="sr-only">
                Filter by registration status
              </label>
              <select
                id="participant-status"
                value={filters.status}
                onChange={(event) => updateStatus(
                  event.target.value as ParticipantFilterStatus | 'all',
                )}
                className={controlClassName}
              >
                <option value="all">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Draft">Draft</option>
              </select>

              <label htmlFor="participant-attendance" className="sr-only">
                Filter by attendance
              </label>
              <select
                id="participant-attendance"
                value={filters.attendance}
                onChange={(event) => updateAttendance(
                  event.target.value as ParticipantAttendanceFilter | 'all',
                )}
                className={controlClassName}
              >
                <option value="all">All attendance</option>
                <option value="present">Present</option>
                <option value="absent">Not present</option>
              </select>

              <label htmlFor="participant-sort" className="sr-only">
                Sort participants
              </label>
              <select
                id="participant-sort"
                value={filters.sort}
                onChange={(event) => updateFilter({
                  sort: event.target.value as ParticipantSort,
                })}
                className={controlClassName}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-outline-variant px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary sm:col-span-1"
                >
                  <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-outline-variant pt-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
              Registered from
              <input
                type="date"
                value={filters.startDate ?? ''}
                onChange={(event) => updateDate('start', event.target.value)}
                className={controlClassName}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
              Registered to
              <input
                type="date"
                value={filters.endDate ?? ''}
                onChange={(event) => updateDate('end', event.target.value)}
                className={controlClassName}
              />
            </label>
            {filters.startDate || filters.endDate ? (
              <button
                type="button"
                onClick={() => setFilters((current) => ({
                  ...current,
                  startDate: null,
                  endDate: null,
                  page: 1,
                }))}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-outline-variant px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
                Clear dates
              </button>
            ) : null}
            <p className="max-w-xl font-description text-[11px] leading-relaxed text-on-surface-variant sm:ml-auto">
              Date filtering is separate from status and attendance. Choosing a date range clears
              status and attendance; choosing either of those clears the dates.
            </p>
          </div>
        </div>
      </section>

      {participantsQuery.isError && participantsQuery.data ? (
        <section
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <p className="font-description text-sm text-amber-900">
            The participant list could not be refreshed. Showing the last loaded results.
          </p>
          <button
            type="button"
            onClick={() => void participantsQuery.refetch()}
            className="rounded-lg border border-amber-300 bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
          >
            Try again
          </button>
        </section>
      ) : null}

      {participantsQuery.isLoading && !participantsQuery.data ? (
        <ParticipantTableSkeleton />
      ) : null}

      {!participantsQuery.isLoading && participantsQuery.isError && !participantsQuery.data ? (
        <EmptyState
          icon={CloudOff}
          title="Participants could not be loaded"
          description={participantsQuery.error instanceof Error
            ? participantsQuery.error.message
            : 'The participant list is temporarily unavailable.'}
          action={(
            <button
              type="button"
              onClick={() => void participantsQuery.refetch()}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Try again
            </button>
          )}
        />
      ) : null}

      {participantsQuery.data ? (
        <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-4 py-3.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-on-surface">
                {formatNumber(meta?.total ?? participants.length)}
                {' '}
                {(meta?.total ?? participants.length) === 1 ? 'participant' : 'participants'}
              </p>
              {participantsQuery.isFetching ? (
                <span className="flex items-center gap-1.5 font-description text-xs text-secondary">
                  <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
                  Updating
                </span>
              ) : null}
            </div>
            {hasActiveFilters ? (
              <p className="font-description text-xs text-secondary">Filters applied</p>
            ) : null}
          </div>

          {participants.length === 0 ? (
            <EmptyState
              compact
              icon={hasActiveFilters ? Search : Users}
              title={hasActiveFilters ? 'No participants match these filters' : 'No registrations yet'}
              description={hasActiveFilters
                ? 'Try a different search, status, attendance, or date range.'
                : 'Participants will appear here as soon as registration opens and people sign up.'}
              action={hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  href={`/admin/events/${eventId}/access`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Open committee access
                </Link>
              )}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  rows={participants}
                  getRowKey={(participant) => participant.id}
                />
              </div>

              <div className="divide-y divide-outline-variant/70 md:hidden">
                {participants.map((participant) => {
                  const downloadUrl = participantHasDownloadableTicket(participant)
                    ? participantTicketDownloadUrl(participant.qrCodeUrl, participant.ticketCode)
                    : null;
                  const detailUrl = `/admin/events/${eventId}/participants/${participant.id}`;

                  return (
                    <div key={participant.id} className="flex items-start gap-3 px-4 py-4">
                      <Link
                        href={detailUrl}
                        className="flex min-w-0 flex-1 items-start gap-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <ParticipantAvatar participant={participant} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-on-surface">
                            {participant.name}
                          </span>
                          <span className="mt-0.5 block truncate font-description text-xs text-secondary">
                            {participant.email}
                          </span>
                          <span className="mt-1 block truncate font-description text-xs text-on-surface-variant">
                            {participantOrganizationValue({
                              answers: participant.answers,
                              answerFieldLabels: participant.answerFieldLabels,
                            })}
                          </span>
                          <span className="mt-1 block font-description text-[11px] text-secondary">
                            Registered {formatEventDateTime(participant.createdAt)}
                          </span>
                        </span>
                      </Link>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <StatusBadge status={participant.status} />
                        <AttendanceBadge attendance={participant.presenceStatus} />
                        <div className="flex items-center gap-1">
                          {downloadUrl ? (
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Download ticket for ${participant.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <Download aria-hidden="true" className="h-4 w-4" />
                            </a>
                          ) : null}
                          <Link
                            href={detailUrl}
                            aria-label={`${participant.status === 'Pending' ? 'Review' : 'View'} ${participant.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <ChevronRight aria-hidden="true" className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {meta && meta.total > 0 ? (
            <Pagination
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              totalPages={meta.totalPages}
              onPageChange={changePage}
              onLimitChange={(limit) => setFilters((current) => ({
                ...current,
                limit,
                page: 1,
              }))}
              disabled={participantsQuery.isFetching}
              limitOptions={[15, 25, 50]}
              itemLabel="participants"
              itemLabelSingular="participant"
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
