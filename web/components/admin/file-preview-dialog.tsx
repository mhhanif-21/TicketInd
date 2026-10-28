'use client';

import { useEffect, useRef } from 'react';
import { Download, ExternalLink, FileText, X } from 'lucide-react';

function downloadUrl(url: string, fileName: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('download', fileName);
    return parsed.toString();
  } catch {
    return url;
  }
}

export function FilePreviewDialog({
  fileName,
  mimeType,
  url,
  onClose,
}: {
  fileName: string;
  mimeType: string;
  url: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const isImage = mimeType.toLowerCase().startsWith('image/');
  const download = downloadUrl(url, fileName);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close file preview"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${fileName}`}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        <header className="flex items-start gap-3 border-b border-outline-variant px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-on-surface">{fileName}</p>
            <p className="mt-0.5 truncate font-description text-[11px] text-secondary">
              {mimeType || 'Participant file'}
            </p>
          </div>
          <a
            href={download}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
            Download
          </a>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close file preview"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-surface-container-low p-4">
          {isImage ? (
            // Signed Supabase URL; rendering as a plain image avoids the Next
            // image optimizer trying to fetch a short-lived private URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={fileName}
              className="mx-auto max-h-[70vh] w-auto max-w-full rounded-xl bg-white object-contain shadow-sm"
            />
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-secondary">
                <FileText aria-hidden="true" className="h-7 w-7" />
              </span>
              <p className="mt-4 text-sm font-semibold text-on-surface">{fileName}</p>
              <p className="mt-1 max-w-md font-description text-xs text-on-surface-variant">
                This file type cannot be previewed inline. Open it in a new tab or download the
                signed copy.
              </p>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant px-4 py-3">
          <p className="font-description text-[11px] text-on-surface-variant">
            This signed link expires after a few minutes.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            Open in new tab
          </a>
        </footer>
      </div>
    </div>
  );
}
