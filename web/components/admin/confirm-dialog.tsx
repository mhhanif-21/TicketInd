'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/admin/format';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  requireConfirmationText,
  confirmationHint = 'Type the text below to confirm.',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  loading?: boolean;
  requireConfirmationText?: string;
  confirmationHint?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);
  const [confirmationText, setConfirmationText] = useState('');

  useEffect(() => {
    if (!open) return;

    setConfirmationText('');
    if (requireConfirmationText) {
      confirmationInputRef.current?.focus();
    } else {
      confirmRef.current?.focus();
    }
  }, [open, requireConfirmationText]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) onCancel();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => {
          if (!loading) onCancel();
        }}
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
      >
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            tone === 'danger' ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface',
          )}
        >
          <AlertTriangle aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 id={titleId} className="mt-4 text-lg font-semibold text-on-surface">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 font-description text-sm text-on-surface-variant">
          {description}
        </p>

        {requireConfirmationText ? (
          <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <label htmlFor={`${titleId}-confirmation`} className="block font-description text-xs text-on-surface-variant">
              {confirmationHint}
            </label>
            <p className="mt-1 select-all break-all rounded-md bg-surface-container-lowest px-2 py-1 font-mono text-xs font-semibold text-on-surface">
              {requireConfirmationText}
            </p>
            <input
              id={`${titleId}-confirmation`}
              ref={confirmationInputRef}
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              disabled={loading}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="Type the text exactly"
            />
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading || Boolean(requireConfirmationText && confirmationText !== requireConfirmationText)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
              tone === 'danger'
                ? 'bg-error text-on-error focus:ring-error'
                : 'bg-primary text-on-primary focus:ring-primary',
            )}
          >
            {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
