'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  TicketCheck,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, initials } from '@/lib/admin/format';
import { useAdminAuth } from '@/lib/admin/auth-provider';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/events', label: 'Events', icon: CalendarDays },
  { href: '/admin/oversight', label: 'Oversight', icon: ChartNoAxesCombined },
  { href: '/admin/manual-book', label: 'Manual book', icon: BookOpen },
];

function isActivePath(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminSidebar({
  mobile = false,
  onNavigate,
  onClose,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  return (
    <div className="flex h-full flex-col bg-surface-container-lowest">
      <div className="flex h-16 items-center justify-between border-b border-outline-variant px-5">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary">
            <TicketCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight text-on-surface">Event Gate</span>
            <span className="block font-label-caps text-[10px] uppercase tracking-[0.16em] text-secondary">
              Admin console
            </span>
          </span>
        </Link>
        {mobile ? (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded-lg p-2 text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-3 font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
          Workspace
        </p>
        {navItems.map((item) => {
          const active = !item.disabled && isActivePath(pathname, item);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary/60"
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full border border-outline-variant px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                  Soon
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                active
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-outline-variant p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
            {initials(user?.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-on-surface">
              {user?.name ?? 'Admin'}
            </span>
            <span className="block truncate font-description text-xs text-secondary">
              {user?.email ?? 'Signed in'}
            </span>
          </span>
        </div>
        <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-medium text-secondary">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Protected admin session
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
