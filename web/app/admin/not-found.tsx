import Link from 'next/link';
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react';
import { AdminThemeInitializer } from '@/components/admin/admin-theme';

export default function AdminNotFound() {
  return (
    <div className="admin-theme flex min-h-screen items-center justify-center bg-surface px-5 py-10 font-body-md text-on-surface">
      <AdminThemeInitializer />
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-secondary">
          <Compass aria-hidden="true" className="h-7 w-7" />
        </span>
        <p className="mt-6 font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
          404 · Not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface">
          This admin page does not exist
        </h1>
        <p className="mx-auto mt-2 max-w-sm font-description text-sm leading-relaxed text-on-surface-variant">
          The link may be outdated, the event may have been removed, or the address was typed
          incorrectly.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
            Admin dashboard
          </Link>
          <Link
            href="/admin/events"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to events
          </Link>
        </div>
      </div>
    </div>
  );
}
