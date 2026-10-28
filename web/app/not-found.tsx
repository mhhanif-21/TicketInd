import Link from 'next/link';
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react';
import { AdminThemeInitializer } from '@/components/admin/admin-theme';

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-5 py-16 font-body-md text-on-surface dark:bg-primary dark:text-on-primary">
      <AdminThemeInitializer />
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:border-on-primary/20 dark:bg-primary-container sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-secondary dark:bg-on-primary/10 dark:text-on-primary/70">
          <Compass aria-hidden="true" className="h-7 w-7" />
        </span>
        <p className="mt-6 font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary dark:text-on-primary/60">
          404 · Not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface dark:text-on-primary">
          This page could not be found
        </h1>
        <p className="mx-auto mt-2 max-w-sm font-description text-sm leading-relaxed text-on-surface-variant dark:text-on-primary/70">
          The link may be outdated or the address was typed incorrectly. If you were looking for
          the admin console, use the button below.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-on-primary dark:text-primary dark:focus:ring-on-primary"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to home
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary dark:border-on-primary/30 dark:text-on-primary dark:hover:bg-on-primary/10"
          >
            <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
            Admin dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
