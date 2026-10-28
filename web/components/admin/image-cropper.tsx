'use client';

import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Crop, Loader2, Minus, Plus, X } from 'lucide-react';

const MAX_OUTPUT_DIMENSION = 3_000;
const OUTPUT_QUALITY = 0.85;

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be loaded.'));
    image.src = source;
  });
}

function outputFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '').trim() || 'poster';
  return `${base}.jpg`;
}

async function cropImageToFile(
  imageUrl: string,
  cropPixels: Area,
  originalName: string,
): Promise<File> {
  const image = await loadImage(imageUrl);
  const width = Math.max(1, Math.round(cropPixels.width));
  const height = Math.max(1, Math.round(cropPixels.height));
  const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(width, height));
  const outputWidth = Math.max(1, Math.round(width * scale));
  const outputHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The image could not be processed.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', OUTPUT_QUALITY);
  });
  if (!blob) throw new Error('The cropped image could not be created.');

  return new File([blob], outputFileName(originalName), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export function ImageCropper({
  file,
  aspectRatio,
  progressLabel,
  onCancel,
  onApply,
}: {
  file: File;
  aspectRatio: number;
  progressLabel?: string;
  onCancel: () => void;
  onApply: (file: File) => Promise<void> | void;
}) {
  const [imageUrl] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  async function handleApply() {
    if (!croppedAreaPixels || busy) return;
    setBusy(true);
    setError(null);
    try {
      const cropped = await cropImageToFile(imageUrl, croppedAreaPixels, file.name);
      await onApply(cropped);
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : 'The image could not be cropped.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close cropper"
        onClick={() => {
          if (!busy) onCancel();
        }}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crop event poster"
        className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_24px_70px_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Crop aria-hidden="true" className="h-4 w-4 text-secondary" />
              <h2 className="text-base font-semibold text-on-surface">Crop poster</h2>
            </div>
            <p className="mt-1 font-description text-xs text-on-surface-variant">
              {progressLabel ?? 'Drag to reposition, then zoom to fit.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cancel crop"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-2 text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="relative h-[min(56vh,430px)] w-full bg-black">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            objectFit="contain"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>

        <div className="space-y-3 border-t border-outline-variant px-5 py-4">
          <div className="flex items-center gap-3">
            <Minus aria-hidden="true" className="h-4 w-4 shrink-0 text-secondary" />
            <label htmlFor="crop-zoom" className="sr-only">
              Zoom
            </label>
            <input
              id="crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={busy}
              className="h-1.5 w-full cursor-pointer accent-primary"
            />
            <Plus aria-hidden="true" className="h-4 w-4 shrink-0 text-secondary" />
          </div>

          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 font-description text-xs text-red-800">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={busy || !croppedAreaPixels}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Apply crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImageCropQueue({
  files,
  aspectRatio,
  onCancel,
  onComplete,
}: {
  files: File[];
  aspectRatio: number;
  onCancel: () => void;
  onComplete: (files: File[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<File[]>([]);
  const current = files[index];

  if (!current) return null;

  function handleApply(cropped: File) {
    const nextResults = [...results, cropped];
    if (index + 1 >= files.length) {
      onComplete(nextResults);
      return;
    }
    setResults(nextResults);
    setIndex(index + 1);
  }

  return (
    <ImageCropper
      key={`${current.name}-${current.lastModified}-${index}`}
      file={current}
      aspectRatio={aspectRatio}
      progressLabel={`Image ${index + 1} of ${files.length}. Drag to reposition, then zoom to fit.`}
      onCancel={onCancel}
      onApply={handleApply}
    />
  );
}
