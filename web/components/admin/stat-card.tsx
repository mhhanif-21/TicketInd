import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/admin/format';

type StatTone = 'default' | 'success' | 'warning';

const toneStyles: Record<StatTone, string> = {
  default: 'bg-surface-container text-on-surface',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: StatTone;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/[0.035]"
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-label-caps text-[10px] uppercase tracking-[0.16em] text-secondary">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-on-surface">{value}</p>
          {hint ? (
            <p className="mt-2 font-description text-xs text-on-surface-variant">{hint}</p>
          ) : null}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneStyles[tone])}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
