'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Check,
  Loader2,
  QrCode,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useToast } from '@/components/admin/toast';
import { adminFetch } from '@/lib/admin/api';
import {
  TICKET_TEMPLATE_COLOR_PRESETS,
  TICKET_TEMPLATE_MAX_FONT_SIZE,
  TICKET_TEMPLATE_MIN_FONT_SIZE,
  TICKET_TEMPLATE_MIN_QR_SIZE,
  TICKET_TEMPLATE_MAX_QR_SIZE,
  TICKET_TEMPLATE_OPTIONAL_TOKENS,
  TICKET_TEMPLATE_CANVAS_WIDTH,
  addTicketElement,
  availableTicketTokens,
  ensureRequiredTicketElements,
  normalizeTicketElement,
  removeTicketElement,
  setTicketElementFontSize,
  ticketElementFontSizeForCanvas,
  ticketElementLabel,
  validateTicketTemplate,
  type TicketTemplateElement,
  type TicketTemplateSaveResponse,
} from '@/lib/admin/ticket-template';
import { cn } from '@/lib/admin/format';

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

interface PointerInteraction {
  kind: 'move' | 'resize';
  index: number;
  handle?: ResizeHandle;
  pointerId: number;
  startX: number;
  startY: number;
  original: TicketTemplateElement;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function squareQrElements(
  elements: TicketTemplateElement[],
  aspectRatio: number,
): TicketTemplateElement[] {
  const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 0.75;
  return elements.map((element) => {
    if (element.type !== 'qr') return element;
    const rawWidth = element.width * safeAspect;
    const rawHeight = element.height;
    const size = Math.min(rawWidth, rawHeight);
    const rawLeft = element.x * safeAspect + (rawWidth - size) / 2;
    const rawTop = element.y + (rawHeight - size) / 2;
    return normalizeTicketElement({
      ...element,
      x: rawLeft / safeAspect,
      y: rawTop,
      width: size / safeAspect,
      height: size,
    });
  });
}

function movedElement(
  original: TicketTemplateElement,
  deltaX: number,
  deltaY: number,
): TicketTemplateElement {
  return normalizeTicketElement({
    ...original,
    x: original.x + deltaX,
    y: original.y + deltaY,
  });
}

function resizedElement(
  original: TicketTemplateElement,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  canvasWidth: number,
  canvasHeight: number,
): TicketTemplateElement {
  if (canvasWidth <= 0 || canvasHeight <= 0) return original;

  if (original.type === 'qr') {
    const rawWidth = original.width * canvasWidth;
    const rawHeight = original.height * canvasHeight;
    const size = Math.min(rawWidth, rawHeight);
    const left = original.x * canvasWidth + (rawWidth - size) / 2;
    const top = original.y * canvasHeight + (rawHeight - size) / 2;
    const right = left + size;
    const bottom = top + size;
    const minSize = TICKET_TEMPLATE_MIN_QR_SIZE * Math.min(canvasWidth, canvasHeight);
    const maxSize = Math.min(
      TICKET_TEMPLATE_MAX_QR_SIZE * Math.min(canvasWidth, canvasHeight),
      handle === 'nw' || handle === 'sw' ? right : canvasWidth - left,
      handle === 'nw' || handle === 'ne' ? bottom : canvasHeight - top,
    );
    const growth = handle === 'nw'
      ? Math.max(-deltaX, -deltaY)
      : handle === 'ne'
        ? Math.max(deltaX, -deltaY)
        : handle === 'sw'
          ? Math.max(-deltaX, deltaY)
          : Math.max(deltaX, deltaY);
    const nextSize = clamp(size + growth, minSize, Math.max(minSize, maxSize));
    let nextLeft = left;
    let nextTop = top;
    if (handle === 'nw' || handle === 'sw') nextLeft = right - nextSize;
    if (handle === 'nw' || handle === 'ne') nextTop = bottom - nextSize;

    return normalizeTicketElement({
      ...original,
      x: nextLeft / canvasWidth,
      y: nextTop / canvasHeight,
      width: nextSize / canvasWidth,
      height: nextSize / canvasHeight,
    });
  }

  let left = original.x * canvasWidth;
  let top = original.y * canvasHeight;
  let width = original.width * canvasWidth;
  let height = original.height * canvasHeight;
  const originalWidth = width;
  const originalHeight = height;

  if (handle === 'se') {
    width += deltaX;
    height += deltaY;
  } else if (handle === 'nw') {
    left += deltaX;
    top += deltaY;
    width -= deltaX;
    height -= deltaY;
  } else if (handle === 'ne') {
    top += deltaY;
    width += deltaX;
    height -= deltaY;
  } else {
    left += deltaX;
    width -= deltaX;
    height += deltaY;
  }

  const minWidth = Math.max(8, 0.04 * canvasWidth);
  const minHeight = Math.max(8, 0.02 * canvasHeight);
  const maxWidth = 0.95 * canvasWidth;
  const maxHeight = 0.5 * canvasHeight;
  width = clamp(width, minWidth, maxWidth);
  height = clamp(height, minHeight, maxHeight);

  if (handle === 'nw' || handle === 'sw') {
    left = (original.x * canvasWidth) + originalWidth - width;
  }
  if (handle === 'nw' || handle === 'ne') {
    top = (original.y * canvasHeight) + originalHeight - height;
  }
  left = clamp(left, 0, canvasWidth - width);
  top = clamp(top, 0, canvasHeight - height);

  const heightRatio = height / Math.max(1, originalHeight);
  const fontSize = clamp(
    original.fontSize * heightRatio,
    TICKET_TEMPLATE_MIN_FONT_SIZE,
    TICKET_TEMPLATE_MAX_FONT_SIZE,
  );

  return normalizeTicketElement({
    ...original,
    x: left / canvasWidth,
    y: top / canvasHeight,
    width: width / canvasWidth,
    height: height / canvasHeight,
    fontSize,
  });
}

const handlePositions: Array<{
  handle: ResizeHandle;
  className: string;
  cursor: string;
}> = [
  { handle: 'nw', className: '-left-1.5 -top-1.5', cursor: 'nwse-resize' },
  { handle: 'ne', className: '-right-1.5 -top-1.5', cursor: 'nesw-resize' },
  { handle: 'sw', className: '-bottom-1.5 -left-1.5', cursor: 'nesw-resize' },
  { handle: 'se', className: '-bottom-1.5 -right-1.5', cursor: 'nwse-resize' },
];

export function TicketCanvasEditor({
  eventId,
  eventName,
  backgroundUrl,
  aspectRatio,
  initialElements,
  onClose,
  onSaved,
}: {
  eventId: string;
  eventName: string;
  backgroundUrl: string;
  aspectRatio: number;
  initialElements: TicketTemplateElement[];
  onClose: () => void;
  onSaved: (elements: TicketTemplateElement[]) => void;
}) {
  const { toast } = useToast();
  const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 0.75;
  const [elements, setElements] = useState<TicketTemplateElement[]>(() => (
    squareQrElements(ensureRequiredTicketElements(initialElements), safeAspect)
  ));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const hostRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<PointerInteraction | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const update = () => {
      const availableWidth = host.clientWidth;
      const availableHeight = host.clientHeight;
      if (availableWidth <= 0 || availableHeight <= 0) return;
      let width = availableWidth;
      let height = width / safeAspect;
      if (height > availableHeight) {
        height = availableHeight;
        width = height * safeAspect;
      }
      setCanvasSize({
        width: Math.max(1, width),
        height: Math.max(1, height),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [safeAspect]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || saving) return;
      if (dirty) {
        setDiscardOpen(true);
      } else {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dirty, onClose, saving]);

  const selected = selectedIndex === null ? null : elements[selectedIndex];
  const availableTokens = availableTicketTokens(elements);

  function updateElement(index: number, next: TicketTemplateElement) {
    setElements((current) => current.map((element, itemIndex) => (
      itemIndex === index ? next : element
    )));
    setDirty(true);
  }

  function beginInteraction(
    event: ReactPointerEvent<HTMLElement>,
    index: number,
    kind: 'move' | 'resize',
    handle?: ResizeHandle,
  ) {
    if (event.button !== 0 || saving) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedIndex(index);
    event.currentTarget.setPointerCapture(event.pointerId);
    interaction.current = {
      kind,
      index,
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      original: elements[index],
    };
  }

  function moveInteraction(event: ReactPointerEvent<HTMLElement>) {
    const current = interaction.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;
    const next = current.kind === 'move'
      ? movedElement(
        current.original,
        deltaX / Math.max(1, canvasSize.width),
        deltaY / Math.max(1, canvasSize.height),
      )
      : resizedElement(
        current.original,
        current.handle ?? 'se',
        deltaX,
        deltaY,
        canvasSize.width,
        canvasSize.height,
      );
    updateElement(current.index, next);
  }

  function endInteraction(event: ReactPointerEvent<HTMLElement>) {
    if (interaction.current?.pointerId === event.pointerId) {
      interaction.current = null;
    }
  }

  function removeSelected() {
    if (selectedIndex === null) return;
    const next = removeTicketElement(elements, selectedIndex);
    if (next === elements) return;
    setElements(next);
    setSelectedIndex(null);
    setDirty(true);
  }

  function updateSelected(patch: Partial<TicketTemplateElement>) {
    if (selectedIndex === null || !selected) return;
    updateElement(selectedIndex, normalizeTicketElement({ ...selected, ...patch }));
  }

  function handleCanvasKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (selectedIndex === null || !selected) return;
    if (event.key === 'Escape') {
      setSelectedIndex(null);
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeSelected();
      return;
    }

    const step = event.shiftKey ? 0.02 : 0.005;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    updateElement(
      selectedIndex,
      movedElement(selected, delta[0], delta[1]),
    );
  }

  async function save() {
    if (saving) return;
    setError(null);
    const validation = validateTicketTemplate('custom', backgroundUrl, elements);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    try {
      await adminFetch<TicketTemplateSaveResponse>(
        `/api/v1/events/${eventId}/ticket-template`,
        {
          method: 'PUT',
          body: JSON.stringify({ mode: 'custom', elements }),
        },
      );
      setDirty(false);
      toast({ variant: 'success', title: 'Custom ticket saved' });
      onSaved(elements);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The ticket template could not be saved.');
      setSaving(false);
    }
  }

  function requestClose() {
    if (saving) return;
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-[#1d1d1d]">
      <header className="flex flex-wrap items-center gap-3 border-b border-outline-variant bg-surface-container-lowest px-4 py-3">
        <button
          type="button"
          aria-label="Close ticket editor"
          onClick={requestClose}
          disabled={saving}
          className="rounded-lg p-2 text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-on-surface">Edit ticket template</h2>
          <p className="truncate font-description text-xs text-on-surface-variant">
            {eventName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          Save template
        </button>
      </header>

      <div ref={hostRef} className="relative flex min-h-[160px] flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
        <div
          role="application"
          aria-label="Ticket canvas. Drag elements to move, use corner handles to resize, or use arrow keys."
          tabIndex={0}
          onKeyDown={handleCanvasKeyDown}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelectedIndex(null);
          }}
          className="relative shrink-0 overflow-hidden rounded-xl bg-black shadow-[0_24px_70px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{ width: canvasSize.width || 1, height: canvasSize.height || 1, touchAction: 'none' }}
        >
          {/* The background is a signed URL from the authenticated template API. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundUrl}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
            style={{ objectFit: 'fill' }}
            draggable={false}
          />

          <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/55 px-2.5 py-1.5 text-[10px] font-medium text-white">
            Drag to move · pull corners to resize · arrow keys nudge
          </div>

          {elements.map((element, index) => {
            const isSelected = index === selectedIndex;
            const boxStyle: CSSProperties = {
              left: `${element.x * 100}%`,
              top: `${element.y * 100}%`,
              width: `${element.width * 100}%`,
              height: `${element.height * 100}%`,
            };

            return (
              <div
                key={`${element.type}-${element.token ?? ''}-${index}`}
                className={cn('absolute', isSelected && 'z-20')}
                style={boxStyle}
              >
                <div
                  role="button"
                  tabIndex={-1}
                  aria-label={`${ticketElementLabel(element)} element`}
                  onPointerDown={(event) => beginInteraction(event, index, 'move')}
                  onPointerMove={moveInteraction}
                  onPointerUp={endInteraction}
                  onPointerCancel={endInteraction}
                  className={cn(
                    'relative h-full w-full touch-none select-none',
                    isSelected
                      ? 'ring-2 ring-blue-400'
                      : 'ring-1 ring-transparent hover:ring-blue-300/60',
                    element.type === 'qr'
                      ? 'flex cursor-move items-center justify-center bg-white'
                      : 'flex cursor-move items-center justify-center overflow-hidden',
                  )}
                >
                  {element.type === 'qr' ? (
                    <QrCode
                      aria-hidden="true"
                      className="h-full w-full p-[4%] text-black"
                      strokeWidth={1.6}
                    />
                  ) : (
                    <span
                      className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-0.5 text-center font-bold leading-none"
                      style={{
                        color: element.color,
                        fontSize: ticketElementFontSizeForCanvas(element.fontSize, canvasSize.width),
                      }}
                    >
                      {element.type === 'ticket_code' ? 'A1B2C3D4' : ticketElementLabel(element)}
                    </span>
                  )}
                </div>

                {isSelected ? handlePositions.map((item) => (
                  <button
                    key={item.handle}
                    type="button"
                    aria-label={`Resize ${ticketElementLabel(element)} from ${item.handle}`}
                    onPointerDown={(event) => beginInteraction(event, index, 'resize', item.handle)}
                    onPointerMove={moveInteraction}
                    onPointerUp={endInteraction}
                    onPointerCancel={endInteraction}
                    className={cn(
                      'absolute z-30 h-3.5 w-3.5 touch-none rounded-full border-2 border-blue-400 bg-white shadow',
                      item.className,
                    )}
                    style={{ cursor: item.cursor }}
                  />
                )) : null}
              </div>
            );
          })}
        </div>
      </div>

      <section className="max-h-[44vh] overflow-y-auto border-t border-outline-variant bg-surface-container-lowest px-4 py-3">
        {error ? (
          <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {selected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-description text-[10px] uppercase tracking-[0.12em] text-secondary">
                  Selected element
                </p>
                <p className="mt-0.5 text-sm font-semibold text-on-surface">
                  {ticketElementLabel(selected)}
                </p>
              </div>
              {selected.type === 'qr' || selected.type === 'ticket_code' ? (
                <span className="rounded-full border border-outline-variant px-2.5 py-1 font-label-caps text-[9px] uppercase tracking-[0.08em] text-secondary">
                  Required
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(null)}
                    className="rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    Deselect
                  </button>
                  <button
                    type="button"
                    onClick={removeSelected}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>

            {selected.type !== 'qr' ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <label htmlFor="ticket-font-size" className="block text-xs font-semibold text-on-surface">
                    Font size
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      id="ticket-font-size"
                      type="range"
                      min={TICKET_TEMPLATE_MIN_FONT_SIZE}
                      max={TICKET_TEMPLATE_MAX_FONT_SIZE}
                      step={1}
                      value={selected.fontSize}
                      onChange={(event) => updateSelected({
                        fontSize: setTicketElementFontSize(selected, Number(event.target.value)).fontSize,
                      })}
                      className="h-1.5 w-full cursor-pointer accent-primary"
                    />
                    <input
                      type="number"
                      min={TICKET_TEMPLATE_MIN_FONT_SIZE}
                      max={TICKET_TEMPLATE_MAX_FONT_SIZE}
                      step={1}
                      value={selected.fontSize}
                      aria-label="Ticket text font size"
                      onChange={(event) => updateSelected({
                        fontSize: setTicketElementFontSize(selected, Number(event.target.value)).fontSize,
                      })}
                      className="w-16 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-center text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-on-surface">Text color</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {TICKET_TEMPLATE_COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Set text color ${color}`}
                        aria-pressed={selected.color.toLowerCase() === color.toLowerCase()}
                        onClick={() => updateSelected({ color })}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                          selected.color.toLowerCase() === color.toLowerCase()
                            ? 'border-blue-500 ring-2 ring-blue-300'
                            : 'border-black/20',
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {selected.color.toLowerCase() === color.toLowerCase() ? (
                          <Check
                            aria-hidden="true"
                            className="h-3 w-3"
                            style={{ color: color === '#FFFFFF' || color === '#EAB308' ? '#111111' : '#FFFFFF' }}
                          />
                        ) : null}
                      </button>
                    ))}
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant px-2 py-1 text-[10px] font-semibold text-on-surface">
                      Custom
                      <input
                        type="color"
                        value={selected.color}
                        onChange={(event) => updateSelected({ color: event.target.value })}
                        className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <p className="font-description text-xs text-on-surface-variant">
                QR is required and always rendered as a square. Use a corner handle to resize it.
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-on-surface">Add element</p>
            <p className="mt-0.5 font-description text-xs text-on-surface-variant">
              Select a token to place participant data on the ticket. Each token can be used once.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TICKET_TEMPLATE_OPTIONAL_TOKENS.map((token) => {
                const tokenInUse = !availableTokens.includes(token);
                return (
                  <button
                    key={token}
                    type="button"
                    disabled={tokenInUse}
                    onClick={() => {
                      setElements(addTicketElement(elements, token));
                      setSelectedIndex(elements.length);
                      setDirty(true);
                    }}
                    className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    [{token}]
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
          <p className="font-description text-[11px] text-on-surface-variant">
            Canvas reference: {TICKET_TEMPLATE_CANVAS_WIDTH}px wide. Saved geometry scales with the background image.
          </p>
          <button
            type="button"
            onClick={() => {
              setElements(squareQrElements(ensureRequiredTicketElements(initialElements), safeAspect));
              setSelectedIndex(null);
              setDirty(false);
              setError(null);
            }}
            className="ml-auto rounded-lg border border-outline-variant px-2.5 py-1.5 text-[11px] font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Reset changes
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={discardOpen}
        title="Discard canvas changes?"
        description="Unsaved element positions, colors, and text sizes will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={onClose}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  );
}
