'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CloudOff, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { useAdminEvent } from '@/lib/admin/queries/events';
import { EditEventForm } from './edit-event-form';

export default function AdminEditEventPage() {
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

  return <EditEventForm key={eventQuery.data.data.id} event={eventQuery.data.data} />;
}
