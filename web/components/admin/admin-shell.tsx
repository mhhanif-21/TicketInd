'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminThemeToggle } from '@/components/admin/admin-theme';
import { useAdminAuth } from '@/lib/admin/auth-provider';
import { cn, initials } from '@/lib/admin/format';

function titleForPath(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard';
  if (pathname.startsWith('/admin/events')) return 'Events';
  if (pathname.startsWith('/admin/oversight')) return 'Oversight';
  if (pathname.startsWith('/admin/manual-book')) return 'Manual book';
  return 'Admin';
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setUserMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-outline-variant lg:block">
        <AdminSidebar />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 w-[min(84vw,300px)] shadow-2xl"
          >
            <AdminSidebar
              mobile
              onClose={() => setDrawerOpen(false)}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary lg:hidden"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-secondary">
                <span>Admin</span>
                <span aria-hidden="true">/</span>
                <span className="truncate font-semibold text-on-surface" aria-current="page">
                  {titleForPath(pathname)}
                </span>
              </nav>
            </div>

            <AdminThemeToggle />

            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary sm:flex"
            >
              View public site
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full border border-outline-variant py-1 pl-1 pr-2 transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary">
                  {initials(user?.name)}
                </span>
                <span className="hidden max-w-32 truncate text-xs font-semibold text-on-surface sm:block">
                  {user?.name ?? 'Admin'}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'h-3.5 w-3.5 text-secondary transition-transform',
                    userMenuOpen && 'rotate-180',
                  )}
                />
              </button>

              {userMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_16px_40px_rgba(0,0,0,0.14)]"
                >
                  <div className="border-b border-outline-variant p-4">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {user?.name ?? 'Admin'}
                    </p>
                    <p className="mt-0.5 truncate font-description text-xs text-secondary">
                      {user?.email ?? 'Signed in'}
                    </p>
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                      <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                      Admin access verified
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void logout()}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-on-surface transition-colors hover:bg-surface-container focus:bg-surface-container focus:outline-none"
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
