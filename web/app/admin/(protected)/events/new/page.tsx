'use client';

import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';

export default function AdminCreateEventPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to events
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
          Create event
        </h1>
        <p className="mt-2 font-description text-sm text-on-surface-variant">
          Set up a new event, poster, and registration flow.
        </p>
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-secondary">
          <Construction aria-hidden="true" className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-on-surface">
          Event creation is not available yet
        </h2>
        <p className="mt-2 max-w-md font-description text-sm leading-relaxed text-on-surface-variant">
          The create-event wizard is being moved to the web admin. Authentication,
          the dashboard, and the event catalog are already available in this release.
        </p>
        <Link
          href="/admin/events"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Return to events
        </Link>
      </div>
    </div>
  );
}
