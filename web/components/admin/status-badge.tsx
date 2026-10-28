import { cn } from '@/lib/admin/format';

const statusStyles: Record<string, { label: string; className: string; dot: string }> = {
  Published: {
    label: 'Published',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  Draft: {
    label: 'Draft',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  Cancelled: {
    label: 'Cancelled',
    className: 'border-red-200 bg-red-50 text-red-800',
    dot: 'bg-red-500',
  },
  Pending: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  Accepted: {
    label: 'Accepted',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  Rejected: {
    label: 'Rejected',
    className: 'border-red-200 bg-red-50 text-red-800',
    dot: 'bg-red-500',
  },
  Expired: {
    label: 'Expired',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
    dot: 'bg-slate-400',
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = statusStyles[status] ?? {
    label: status || 'Unknown',
    className: 'border-outline-variant bg-surface-container text-on-surface-variant',
    dot: 'bg-secondary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-label-caps text-[10px] font-semibold uppercase tracking-[0.08em]',
        style.className,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {style.label}
    </span>
  );
}

export function AttendanceBadge({
  attendance,
  className,
}: {
  attendance: string;
  className?: string;
}) {
  const present = attendance === 'Present';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-label-caps text-[10px] font-semibold uppercase tracking-[0.08em]',
        present
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-outline-variant bg-surface-container text-on-surface-variant',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', present ? 'bg-emerald-500' : 'bg-secondary')}
      />
      {present ? 'Present' : 'Not present'}
    </span>
  );
}
