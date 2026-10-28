'use client';

import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus, MoveLeft, MoveRight, Star, Trash2, UploadCloud } from 'lucide-react';
import { AdaptiveImage } from '@/components/media/AdaptiveImage';
import type { AdminMediaItem } from '@/lib/admin/event-media';
import { cn } from '@/lib/admin/format';

export function ImageUploader({
  items,
  aspectRatio,
  maxItems = 5,
  disabled = false,
  error,
  onAddFiles,
  onRemove,
  onMove,
  onMakeCover,
}: {
  items: AdminMediaItem[];
  aspectRatio: number;
  maxItems?: number;
  disabled?: boolean;
  error?: string | null;
  onAddFiles: (files: File[]) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
  onMakeCover: (key: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const canAdd = !disabled && items.length < maxItems;

  function openPicker() {
    if (canAdd) inputRef.current?.click();
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !canAdd) return;
    const files = Array.from(fileList);
    if (files.length > 0) onAddFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Event posters</h3>
          <p className="mt-0.5 font-description text-xs text-on-surface-variant">
            The first image becomes the main poster. Choosing a new main poster replaces the
            previous cover. JPG, PNG, or WebP, up to 5 MB each.
          </p>
        </div>
        <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-caps text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">
          {items.length} / {maxItems}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
        tabIndex={-1}
      />

      {items.length === 0 ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          aria-label="Add event posters"
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (canAdd) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
            dragging
              ? 'border-primary bg-surface-container'
              : 'border-outline-variant bg-surface-container-low/40 hover:border-primary/50 hover:bg-surface-container-low',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-secondary">
            <UploadCloud aria-hidden="true" className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-semibold text-on-surface">
            Drop posters here, or click to browse
          </p>
          <p className="mt-1 max-w-sm font-description text-xs text-on-surface-variant">
            Add up to five images. You can crop each one before saving.
          </p>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (canAdd) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
            dragging && 'rounded-2xl ring-2 ring-primary ring-offset-2',
          )}
        >
          {items.map((item, index) => (
            <div
              key={item.key}
              className="group relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container"
            >
              <AdaptiveImage
                src={item.kind === 'local' ? item.previewUrl : item.publicUrl}
                alt={index === 0 ? 'Main event poster' : `Event poster ${index + 1}`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                fit="cover"
                frameAspectRatio={aspectRatio}
                unoptimized={item.kind === 'local'}
                containerClassName="bg-surface-container"
              />

              <div className="absolute left-2 top-2 flex items-center gap-1.5">
                <span className="rounded-full bg-black/75 px-2 py-1 font-label-caps text-[9px] font-semibold uppercase tracking-[0.08em] text-white">
                  {index === 0 ? 'Main poster' : `Poster ${index + 1}`}
                </span>
                {item.kind === 'local' ? (
                  <span className="rounded-full bg-white/90 px-2 py-1 font-label-caps text-[9px] font-semibold uppercase tracking-[0.08em] text-on-surface">
                    New
                  </span>
                ) : null}
              </div>

              <div className="absolute inset-x-2 bottom-2 flex items-center justify-end gap-1 rounded-lg bg-black/65 p-1 opacity-100 backdrop-blur-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                {index > 0 ? (
                  <button
                    type="button"
                    aria-label="Make main poster"
                    disabled={disabled}
                    onClick={() => onMakeCover(item.key)}
                    className="rounded-md p-1.5 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-40"
                  >
                    <Star aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Move poster left"
                  disabled={disabled || index === 0}
                  onClick={() => onMove(item.key, -1)}
                  className="rounded-md p-1.5 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-40"
                >
                  <MoveLeft aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move poster right"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => onMove(item.key, 1)}
                  className="rounded-md p-1.5 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-40"
                >
                  <MoveRight aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Remove poster"
                  disabled={disabled}
                  onClick={() => onRemove(item.key)}
                  className="rounded-md p-1.5 text-white transition-colors hover:bg-red-500/80 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-40"
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {items.length < maxItems ? (
            <button
              type="button"
              onClick={openPicker}
              disabled={!canAdd}
              className="flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low/40 px-4 text-center transition-colors hover:border-primary/50 hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus aria-hidden="true" className="h-6 w-6 text-secondary" />
              <span className="mt-2 text-sm font-semibold text-on-surface">Add poster</span>
              <span className="mt-0.5 font-description text-xs text-on-surface-variant">
                {maxItems - items.length} slot{maxItems - items.length === 1 ? '' : 's'} left
              </span>
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
