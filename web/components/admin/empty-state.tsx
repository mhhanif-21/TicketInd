import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center px-5 py-10 text-center'
          : 'flex flex-col items-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-14 text-center'
      }
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-secondary">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-on-surface">{title}</h2>
      <p className="mt-1.5 max-w-md font-description text-sm text-on-surface-variant">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
