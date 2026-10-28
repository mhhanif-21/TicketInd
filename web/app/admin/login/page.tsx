'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ScanLine,
  ShieldCheck,
  TicketCheck,
  Users,
} from 'lucide-react';
import { AdminApiError, adminFetch } from '@/lib/admin/api';
import { safeAdminNextPath } from '@/lib/admin/navigation';

const inputClassName =
  'w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-3 text-sm text-on-surface placeholder:text-secondary/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof AdminApiError)) {
    return 'Sign in failed. Please try again.';
  }

  if (error.status === 401) return 'Email or password is incorrect.';
  if (error.status === 403) return 'This account does not have admin access.';
  if (error.status === 0) return error.message;
  return error.message || 'Sign in failed. Please try again.';
}

export default function AdminLoginPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Enter your email and password.');
      emailRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminFetch('/api/v1/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
        authRetry: false,
        redirectOnAuthFailure: false,
      });

      const params = new URLSearchParams(window.location.search);
      const nextPath = safeAdminNextPath(params.get('next'));
      router.replace(nextPath);
      router.refresh();
    } catch (loginError) {
      setError(loginErrorMessage(loginError));
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface font-body-md text-on-surface lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary px-12 py-14 text-on-primary lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <TicketCheck aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-bold tracking-tight">Event Gate</p>
            <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-white/60">
              Admin console
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="font-label-caps text-[10px] uppercase tracking-[0.22em] text-white/60">
            One workspace
          </p>
          <h1 className="mt-4 font-display-lg text-4xl leading-[1.1] text-white xl:text-5xl">
            Run every event from one place.
          </h1>
          <p className="mt-5 max-w-md font-body-lg text-base leading-relaxed text-white/70">
            Build registration forms, publish events, review participants, and
            keep check-in moving — all from the browser.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              { icon: CalendarDays, label: 'Create and publish events with media' },
              { icon: Users, label: 'Review registrations and issue tickets' },
              { icon: ScanLine, label: 'Control volunteer scanner access' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  {item.label}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative font-description text-xs text-white/45">
          Secure admin access for event organizers.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 md:px-10 lg:min-h-0">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-on-primary">
              <TicketCheck aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-bold tracking-tight text-on-surface">Event Gate</p>
              <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
                Admin console
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] sm:p-8">
            <div>
              <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
                Admin access
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface">
                Sign in
              </h2>
              <p className="mt-2 font-description text-sm text-on-surface-variant">
                Use the admin account registered for your organization.
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-description text-sm text-red-800"
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="block text-sm font-medium text-on-surface">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
                  />
                  <input
                    ref={emailRef}
                    id="admin-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    aria-invalid={Boolean(error && !email.trim())}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="block text-sm font-medium text-on-surface">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
                  />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    aria-invalid={Boolean(error && !password)}
                    className={`${inputClassName} pr-11`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-start gap-2 border-t border-outline-variant pt-5 text-xs text-secondary">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="font-description leading-relaxed">
                Your session is stored in an HttpOnly cookie and cannot be read by browser scripts.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center font-description text-xs text-secondary">
            Only accounts with explicit admin access can sign in.
          </p>
        </div>
      </section>
    </main>
  );
}
