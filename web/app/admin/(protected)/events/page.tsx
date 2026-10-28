'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronRight,
  CloudOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AdaptiveImage } from '@/components/media/AdaptiveImage';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAdminEvents } from '@/lib/admin/queries/events';
import type { AdminEvent, AdminEventFilters, EventSort, EventStatus } from '@/lib/admin/types';
import { useDebouncedValue } from '@/lib/admin/use-debounced-value';
import { cn, formatEventDate, formatNumber } from '@/lib/admin/format';

const controlClassName =
  'h-10 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60';

function EventPoster({ event, className }: { event: AdminEvent; className: string }) {
  if (event.posterUrl) {
    return (
      <AdaptiveImage
        src={event.posterUrl}
        alt=""
        sizes="80px"
        fit="cover"
        frameAspectRatio={4 / 5}
        containerClassName={cn('shrink-0 rounded-lg border border-outline-variant bg-surface-container', className)}
      />
    );
  }

  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-secondary', className)}>
      <CalendarDays aria-hidden="true" className="h-5 w-5" />
    </div>
  );
}

function RegistrantMeter({ event }: { event: AdminEvent }) {
  const count = event.registrantsCount ?? 0;
  const percent = event.capacity > 0
    ? Math.min(100, Math.round((count / event.capacity) * 100))
    : 0;

  return (
    <div className="min-w-[104px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-on-surface">{formatNumber(count)}</span>
        <span className="font-description text-[10px] text-secondary">
          of {formatNumber(event.capacity)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function EventTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <div className="border-b border-outline-variant p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-container-high" />
      </div>
      <div className="divide-y divide-outline-variant/70">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center gap-4 p-4">
            <div className="h-12 w-10 animate-pulse rounded-lg bg-surface-container-high" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-44 animate-pulse rounded bg-surface-container-high" />
              <div className="h-3 w-28 animate-pulse rounded bg-surface-container" />
            </div>
            <div className="hidden h-3 w-24 animate-pulse rounded bg-surface-container sm:block" />
            <div className="hidden h-3 w-20 animate-pulse rounded bg-surface-container md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminEventsPage() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const [filters, setFilters] = useState<AdminEventFilters>({
    page: 1,
    limit: 10,
    search: '',
    sort: 'date_desc',
    status: 'all',
  });

  useEffect(() => {
    setFilters((current) => (
      current.search === debouncedSearch
        ? current
        : { ...current, search: debouncedSearch, page: 1 }
    ));
  }, [debouncedSearch]);

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminEvents(filters);

  const events = response?.data ?? [];
  const meta = response?.meta;
  const hasActiveFilters = filters.search !== ''
    || filters.status !== 'all'
    || filters.sort !== 'date_desc';

  function updateFilter(patch: Partial<AdminEventFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  function clearFilters() {
    setSearchInput('');
    setFilters({
      page: 1,
      limit: filters.limit,
      search: '',
      sort: 'date_desc',
      status: 'all',
    });
  }

  function changePage(page: number) {
    setFilters((current) => ({ ...current, page }));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const columns: DataTableColumn<AdminEvent>[] = [
    {
      key: 'event',
      header: 'Event',
      render: (event) => (
        <Link
          href={`/admin/events/${event.id}`}
          className="group flex items-center gap-3 focus:outline-none"
        >
          <EventPoster event={event} className="h-14 w-11" />
          <span className="min-w-0">
            <span className="block max-w-[240px] truncate text-sm font-semibold text-on-surface group-hover:underline">
              {event.name}
            </span>
            <span className="mt-0.5 block max-w-[240px] truncate font-description text-xs text-secondary">
              /{event.slug}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (event) => (
        <span className="whitespace-nowrap font-description text-sm text-on-surface-variant">
          {formatEventDate(event.date)}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (event) => (
        <span className="block max-w-[180px] truncate font-description text-sm text-on-surface-variant">
          {event.location}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event) => <StatusBadge status={event.status} />,
    },
    {
      key: 'registrants',
      header: 'Registrants',
      render: (event) => <RegistrantMeter event={event} />,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (event) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/events/${event.id}/edit`}
            aria-label={`Edit ${event.name}`}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            Edit
          </Link>
          <Link
            href={`/admin/events/${event.id}`}
            aria-label={`Open ${event.name}`}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Open
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Event catalog"
        title="Events"
        description="Search, filter, and open any event in your organization."
        actions={(
          <>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label="Refresh event list"
              className="flex h-10 items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            >
              <RefreshCw aria-hidden="true" className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/admin/events/new"
              className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Create event
            </Link>
          </>
        )}
      />

      <section
        aria-label="Event filters"
        className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] md:p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="event-search" className="sr-only">
              Search events
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
            />
            <input
              id="event-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, slug, or location…"
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
            <label htmlFor="event-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="event-status"
              value={filters.status}
              onChange={(event) => updateFilter({ status: event.target.value as EventStatus | 'all' })}
              className={controlClassName}
            >
              <option value="all">All statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <label htmlFor="event-sort" className="sr-only">
              Sort events
            </label>
            <select
              id="event-sort"
              value={filters.sort}
              onChange={(event) => updateFilter({ sort: event.target.value as EventSort })}
              className={controlClassName}
            >
              <option value="date_desc">Event date: newest</option>
              <option value="date_asc">Event date: oldest</option>
              <option value="created_desc">Recently created</option>
              <option value="created_asc">Oldest created</option>
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
      </section>

      {isLoading ? <EventTableSkeleton /> : null}

      {!isLoading && isError && !response ? (
        <EmptyState
          icon={CloudOff}
          title="Events could not be loaded"
          description={error instanceof Error ? error.message : 'The event catalog is temporarily unavailable.'}
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
      ) : null}

      {!isLoading && response ? (
        <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-on-surface">
                {formatNumber(meta?.total ?? events.length)} {meta?.total === 1 ? 'event' : 'events'}
              </p>
              {isFetching ? (
                <span className="flex items-center gap-1.5 font-description text-xs text-secondary">
                  <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
                  Updating
                </span>
              ) : null}
            </div>
            {hasActiveFilters ? (
              <p className="hidden font-description text-xs text-secondary sm:block">
                Filters applied
              </p>
            ) : null}
          </div>

          {events.length === 0 ? (
            <EmptyState
              compact
              icon={Search}
              title={hasActiveFilters ? 'No events match these filters' : 'No events yet'}
              description={hasActiveFilters
                ? 'Try a different search, status, or sort order.'
                : 'Create your first event to start collecting registrations.'}
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
                  href="/admin/events/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Create event
                </Link>
              )}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  rows={events}
                  getRowKey={(event) => event.id}
                />
              </div>

              <div className="divide-y divide-outline-variant/70 md:hidden">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="flex gap-3 px-4 py-4 transition-colors hover:bg-surface-container-low focus:bg-surface-container-low focus:outline-none"
                  >
                    <EventPoster event={event} className="h-24 w-[76px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold text-on-surface">
                          {event.name}
                        </p>
                        <StatusBadge status={event.status} className="shrink-0" />
                      </div>
                      <p className="mt-1.5 truncate font-description text-xs text-on-surface-variant">
                        {formatEventDate(event.date)}
                      </p>
                      <p className="mt-0.5 truncate font-description text-xs text-on-surface-variant">
                        {event.location}
                      </p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <RegistrantMeter event={event} />
                        <ChevronRight aria-hidden="true" className="mb-1 h-4 w-4 shrink-0 text-secondary" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {meta && meta.total > 0 ? (
            <Pagination
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              totalPages={meta.total_pages}
              onPageChange={changePage}
              onLimitChange={(limit) => updateFilter({ limit })}
              disabled={isFetching}
              itemLabel="events"
              itemLabelSingular="event"
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
