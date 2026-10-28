'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  CloudOff,
  Eye,
  ListChecks,
  Loader2,
  RefreshCw,
  Save,
  Ticket,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { FormBuilderStep } from '@/components/admin/form-builder-step';
import { FormPreview } from '@/components/admin/form-preview';
import { PageLoadingSkeleton } from '@/components/admin/loading-skeleton';
import { StatusBadge } from '@/components/admin/status-badge';
import { useToast } from '@/components/admin/toast';
import { adminFetch } from '@/lib/admin/api';
import {
  formFieldsFromEvent,
  validateAdminFormFields,
  type AdminFormFieldDraft,
} from '@/lib/admin/form-fields';
import { invalidateEventQueries, useAdminEvent } from '@/lib/admin/queries/events';
import type { AdminEventDetail, AdminEventDetailResponse } from '@/lib/admin/types';
import { cn } from '@/lib/admin/format';

type BuilderTab = 'builder' | 'preview';

function FormBuilderWorkspace({ event }: { event: AdminEventDetail }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [fields, setFields] = useState<AdminFormFieldDraft[]>(
    () => formFieldsFromEvent(event.formFields),
  );
  const [tab, setTab] = useState<BuilderTab>('builder');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  function updateFields(next: AdminFormFieldDraft[]) {
    setFields(next);
    setDirty(true);
    setError(null);
  }

  async function save() {
    if (saving) return;
    setError(null);
    const validation = validateAdminFormFields(fields);
    if (!validation.payload) {
      setError(validation.error ?? 'The form could not be saved.');
      setTab('builder');
      return;
    }

    setSaving(true);
    try {
      await adminFetch(`/api/v1/events/${event.id}/fields`, {
        method: 'POST',
        body: JSON.stringify({ fields: validation.payload }),
      });
      try {
        const refreshed = await adminFetch<AdminEventDetailResponse>(
          `/api/v1/events/${event.id}`,
        );
        setFields(formFieldsFromEvent(refreshed.data.formFields));
      } catch {
        // The save already succeeded; a stale local ID is recoverable by reload.
      }
      await invalidateEventQueries(queryClient, event.id);
      setDirty(false);
      toast({
        variant: 'success',
        title: 'Registration form saved',
        description: 'The public registration page now uses these questions.',
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The form could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const customCount = fields.filter((field) => field.fieldKind === 'custom').length;

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
                Registration form
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
              Build the questions participants answer when registering. Name and email stay locked
              as required system fields.
            </p>
          </div>

          <Link
            href={`/admin/events/${event.id}/ticket${event.status === 'Draft' ? '?firstSetup=1' : ''}`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Ticket aria-hidden="true" className="h-4 w-4" />
            Ticket template
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3">
        <div role="tablist" aria-label="Form builder views" className="flex gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'builder'}
            onClick={() => setTab('builder')}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
              tab === 'builder'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            )}
          >
            <ListChecks aria-hidden="true" className="h-4 w-4" />
            Builder
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'preview'}
            onClick={() => setTab('preview')}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
              tab === 'preview'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            )}
          >
            <Eye aria-hidden="true" className="h-4 w-4" />
            Preview
          </button>
        </div>

        <p className="px-1 font-description text-xs text-on-surface-variant">
          {customCount} custom question{customCount === 1 ? '' : 's'} · 23 maximum
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-description text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {tab === 'builder' ? (
        <>
          <div className="flex items-start gap-2 rounded-xl border border-outline-variant bg-surface-container-low/60 px-4 py-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="font-description text-xs text-on-surface-variant">
              Drag questions into the order you want participants to see. Fields cannot be deleted
              after registrations exist, but their labels and required state can still be updated.
            </p>
          </div>

          <FormBuilderStep
            fields={fields}
            onChange={updateFields}
            disabled={saving}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/admin/events/${event.id}`}
              className="rounded-xl border border-outline-variant px-4 py-2.5 text-center text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="h-4 w-4" />
              )}
              Save form
            </button>
          </div>
        </>
      ) : (
        <>
          <FormPreview fields={fields} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setTab('builder')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to builder
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="h-4 w-4" />
              )}
              Save form
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminFormBuilderPage() {
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

  return <FormBuilderWorkspace key={eventQuery.data.data.id} event={eventQuery.data.data} />;
}
