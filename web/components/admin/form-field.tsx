import type { ReactNode } from 'react';
import { cn } from '@/lib/admin/format';

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-on-surface">
        {label}
        {required ? <span className="ml-0.5 text-error">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="font-description text-xs font-medium text-error">
          {error}
        </p>
      ) : hint ? (
        <p className="font-description text-xs text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
}
