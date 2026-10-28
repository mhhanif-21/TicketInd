'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminProtectedError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/30 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-red-950 dark:text-red-200">
              Something went wrong in the admin console
            </h1>
            <p className="mt-1.5 max-w-2xl font-description text-sm leading-relaxed text-red-900/75 dark:text-red-200/75">
              The page hit an unexpected error. You can retry the page or return to the dashboard.
              Your session and saved data have not been cleared.
            </p>
            {error.digest ? (
              <p className="mt-3 font-mono text-[11px] text-red-900/60 dark:text-red-200/60">
                Reference: {error.digest}
              </p>
            ) : null}
          </div>
        </div>
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
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
