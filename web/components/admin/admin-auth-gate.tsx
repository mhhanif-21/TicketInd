'use client';

import type { ReactNode } from 'react';
import { Loader2, RefreshCw, ShieldAlert, TicketCheck } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { useAdminAuth } from '@/lib/admin/auth-provider';

function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary">
        <TicketCheck aria-hidden="true" className="h-6 w-6" />
      </span>
      <div className="text-center">
        <p className="text-lg font-bold tracking-tight text-on-surface">Event Gate</p>
        <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
          Admin console
        </p>
      </div>
    </div>
  );
}

function SessionLoading({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface font-body-md px-6">
      <div className="flex flex-col items-center gap-6">
        <BrandMark />
        <div className="flex items-center gap-2 text-sm text-secondary">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          {message}
        </div>
      </div>
    </div>
  );
}

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const { status, error, retrySession } = useAdminAuth();

  if (status === 'loading') {
    return <SessionLoading message="Verifying your admin session…" />;
  }

  if (status === 'unauthenticated') {
    return <SessionLoading message="Redirecting to sign in…" />;
  }

  if (status === 'unavailable') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface font-body-md px-6">
        <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col items-center text-center">
            <BrandMark />
            <span className="mt-8 flex h-10 w-10 items-center justify-center rounded-full bg-error-container text-on-error-container">
              <ShieldAlert aria-hidden="true" className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-xl font-semibold text-on-surface">
              Session check unavailable
            </h1>
            <p className="mt-2 font-description text-sm text-on-surface-variant">
              {error ?? 'We could not verify your admin session right now. Your session has not been cleared.'}
            </p>
            <button
              type="button"
              onClick={retrySession}
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
