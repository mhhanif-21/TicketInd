'use client';

import Link from 'next/link';
import { AlertTriangle, LayoutDashboard, RefreshCw } from 'lucide-react';
import { AdminThemeInitializer } from '@/components/admin/admin-theme';

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="admin-theme flex min-h-screen items-center justify-center bg-surface px-5 py-10 font-body-md text-on-surface">
      <AdminThemeInitializer />
      <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/30 sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
          <AlertTriangle aria-hidden="true" className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-red-950 dark:text-red-200">
          The admin console could not be loaded
        </h1>
        <p className="mt-2 font-description text-sm leading-relaxed text-red-900/75 dark:text-red-200/75">
          An unexpected error interrupted the admin shell. Your session and saved data have not
          been cleared. Try loading the console again.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-red-900/60 dark:text-red-200/60">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
          >
            <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
            Admin dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
