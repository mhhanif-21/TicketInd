export const TICKET_TEMPLATE_CANVAS_WIDTH = 1_200;
export const TICKET_TEMPLATE_MIN_FONT_SIZE = 12;
export const TICKET_TEMPLATE_MAX_FONT_SIZE = 120;
export const TICKET_TEMPLATE_DEFAULT_FONT_SIZE = 24;
export const TICKET_TEMPLATE_DEFAULT_COLOR = '#111111';
export const TICKET_TEMPLATE_MIN_QR_SIZE = 0.12;
export const TICKET_TEMPLATE_MAX_QR_SIZE = 0.85;
export const TICKET_TEMPLATE_MIN_TEXT_WIDTH = 0.04;
export const TICKET_TEMPLATE_MIN_TEXT_HEIGHT = 0.02;
export const TICKET_TEMPLATE_MAX_TEXT_WIDTH = 0.95;
export const TICKET_TEMPLATE_MAX_TEXT_HEIGHT = 0.5;

export const TICKET_TEMPLATE_COLOR_PRESETS = [
  '#111111',
  '#FFFFFF',
  '#6B7280',
  '#DC2626',
  '#2563EB',
  '#16A34A',
  '#EAB308',
  '#7C3AED',
  '#EC4899',
] as const;

export const TICKET_TEMPLATE_OPTIONAL_TOKENS = ['NAME', 'EMAIL', 'EVENT_NAME'] as const;

export type TicketTemplateElementType =
  | 'qr'
  | 'ticket_code'
  | 'name'
  | 'email'
  | 'event_name'
  | 'field';

export type TicketTemplateMode = 'default' | 'custom';

export interface TicketTemplateElement {
  type: TicketTemplateElementType;
  token?: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TicketTemplateConfig {
  mode: TicketTemplateMode;
  background_url: string | null;
  elements: TicketTemplateElement[];
  token_options: string[];
}

export interface TicketTemplateResponse {
  status: 'success';
  data: TicketTemplateConfig;
}

export interface TicketTemplateSaveResponse {
  status: 'success';
  message?: string;
}

export interface TicketBackgroundResponse {
  status: 'success';
  data: {
    background_url: string | null;
  };
}

export interface TicketTemplateSample {
  name?: string;
  email?: string;
  eventName?: string;
  ticketCode?: string;
}

const ELEMENT_TYPES: TicketTemplateElementType[] = [
  'qr',
  'ticket_code',
  'name',
  'email',
  'event_name',
  'field',
];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeColor(value: unknown): string {
  return typeof value === 'string' && HEX_COLOR.test(value.trim())
    ? value.trim().toLowerCase()
    : TICKET_TEMPLATE_DEFAULT_COLOR;
}

function normalizeFontSize(value: unknown): number {
  if (typeof value === 'string') {
    if (value === 'small') return 16;
    if (value === 'large') return 36;
    return TICKET_TEMPLATE_DEFAULT_FONT_SIZE;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return TICKET_TEMPLATE_DEFAULT_FONT_SIZE;
  }
  if (value > 0 && value <= 1) {
    return Math.round(
      TICKET_TEMPLATE_MIN_FONT_SIZE
      + ((value - 0.45) / 0.55) * (TICKET_TEMPLATE_MAX_FONT_SIZE - TICKET_TEMPLATE_MIN_FONT_SIZE),
    );
  }
  return Math.round(clamp(value, TICKET_TEMPLATE_MIN_FONT_SIZE, TICKET_TEMPLATE_MAX_FONT_SIZE));
}

function isElementType(value: unknown): value is TicketTemplateElementType {
  return typeof value === 'string' && ELEMENT_TYPES.includes(value as TicketTemplateElementType);
}

export function defaultTicketTemplateElements(): TicketTemplateElement[] {
  return [
    {
      type: 'qr',
      fontSize: TICKET_TEMPLATE_DEFAULT_FONT_SIZE,
      color: TICKET_TEMPLATE_DEFAULT_COLOR,
      x: 0.35,
      y: 0.18,
      width: 0.3,
      height: 0.3,
    },
    {
      type: 'ticket_code',
      fontSize: TICKET_TEMPLATE_DEFAULT_FONT_SIZE,
      color: TICKET_TEMPLATE_DEFAULT_COLOR,
      x: 0.15,
      y: 0.62,
      width: 0.7,
      height: 0.1,
    },
  ];
}

export function normalizeTicketElement(
  value: Partial<TicketTemplateElement> & { font_size?: unknown },
): TicketTemplateElement {
  const type = isElementType(value.type) ? value.type : 'name';
  const isQr = type === 'qr';
  const minWidth = isQr ? 0.02 : TICKET_TEMPLATE_MIN_TEXT_WIDTH;
  const minHeight = isQr ? 0.02 : TICKET_TEMPLATE_MIN_TEXT_HEIGHT;
  const maxWidth = isQr ? 1 : TICKET_TEMPLATE_MAX_TEXT_WIDTH;
  const maxHeight = isQr ? 1 : TICKET_TEMPLATE_MAX_TEXT_HEIGHT;

  const width = clamp(Number(value.width), minWidth, maxWidth);
  const height = clamp(Number(value.height), minHeight, maxHeight);

  return {
    type,
    token: typeof value.token === 'string' && value.token.trim()
      ? value.token.trim()
      : undefined,
    fontSize: normalizeFontSize(value.fontSize ?? value.font_size),
    color: normalizeColor(value.color),
    x: clamp(Number(value.x), 0, 1 - width),
    y: clamp(Number(value.y), 0, 1 - height),
    width,
    height,
  };
}

/**
 * Keeps exactly one QR and one ticket code in the editable canvas. A stored
 * template should already satisfy this, but repairing the editor state avoids
 * trapping an admin in a template that can never be saved.
 */
export function ensureRequiredTicketElements(
  elements: TicketTemplateElement[],
): TicketTemplateElement[] {
  const normalized = elements.map(normalizeTicketElement);
  const required = new Set<string>();
  const kept: TicketTemplateElement[] = [];

  for (const element of normalized) {
    if (element.type === 'qr' || element.type === 'ticket_code') {
      if (required.has(element.type)) continue;
      required.add(element.type);
    }
    kept.push(element);
  }

  for (const fallback of defaultTicketTemplateElements()) {
    if (!required.has(fallback.type)) kept.push(fallback);
  }

  return kept;
}

export function ticketElementsFromApi(value: unknown): TicketTemplateElement[] {
  if (!Array.isArray(value)) return defaultTicketTemplateElements();
  return ensureRequiredTicketElements(
    value
      .filter((item): item is Record<string, unknown> => (
        typeof item === 'object' && item !== null && !Array.isArray(item)
      ))
      .map((item) => normalizeTicketElement({
        type: isElementType(item.type) ? item.type : undefined,
        token: typeof item.token === 'string' ? item.token : undefined,
        fontSize: typeof item.fontSize === 'number'
          ? item.fontSize
          : typeof item.font_size === 'number'
            ? item.font_size
            : undefined,
        color: typeof item.color === 'string' ? item.color : undefined,
        x: typeof item.x === 'number' ? item.x : undefined,
        y: typeof item.y === 'number' ? item.y : undefined,
        width: typeof item.width === 'number' ? item.width : undefined,
        height: typeof item.height === 'number' ? item.height : undefined,
      })),
  );
}

export function ticketElementToken(element: TicketTemplateElement): string | null {
  if (element.type === 'name') return 'NAME';
  if (element.type === 'email') return 'EMAIL';
  if (element.type === 'event_name') return 'EVENT_NAME';
  if (element.type === 'ticket_code') return 'CODE';
  return null;
}

export function ticketElementLabel(element: TicketTemplateElement): string {
  if (element.type === 'qr') return 'QR Code';
  if (element.type === 'ticket_code') return 'Ticket Code';
  if (element.type === 'name') return 'Name';
  if (element.type === 'email') return 'Email';
  if (element.type === 'event_name') return 'Event Name';
  return element.token ?? 'Participant Data';
}

export function ticketElementSample(
  element: TicketTemplateElement,
  sample: TicketTemplateSample = {},
): string {
  if (element.type === 'ticket_code') return sample.ticketCode || 'A1B2C3D4';
  if (element.type === 'name') return sample.name || 'Participant name';
  if (element.type === 'email') return sample.email || 'participant@email.com';
  if (element.type === 'event_name') return sample.eventName || 'Event name';
  if (element.type === 'field') return `[${element.token ?? 'FIELD'}]`;
  return '';
}

export function availableTicketTokens(
  elements: TicketTemplateElement[],
): string[] {
  const used = new Set(elements.map(ticketElementToken).filter(Boolean));
  return TICKET_TEMPLATE_OPTIONAL_TOKENS.filter((token) => !used.has(token));
}

export function addTicketElement(
  elements: TicketTemplateElement[],
  token: string,
): TicketTemplateElement[] {
  if (!TICKET_TEMPLATE_OPTIONAL_TOKENS.includes(
    token as (typeof TICKET_TEMPLATE_OPTIONAL_TOKENS)[number],
  )) {
    return elements;
  }
  if (elements.some((element) => ticketElementToken(element) === token)) return elements;

  const type: TicketTemplateElementType = token === 'NAME'
    ? 'name'
    : token === 'EMAIL'
      ? 'email'
      : 'event_name';
  const y = clamp(0.68 + elements.length * 0.055, 0, 0.86);
  const draft = normalizeTicketElement({
    type,
    x: 0.12,
    y,
    width: 0.22,
    height: 0.08,
    fontSize: TICKET_TEMPLATE_DEFAULT_FONT_SIZE,
    color: TICKET_TEMPLATE_DEFAULT_COLOR,
  });
  return [...elements, draft];
}

export function removeTicketElement(
  elements: TicketTemplateElement[],
  index: number,
): TicketTemplateElement[] {
  const target = elements[index];
  if (!target || target.type === 'qr' || target.type === 'ticket_code') return elements;
  return elements.filter((_, itemIndex) => itemIndex !== index);
}

export function moveTicketElement(
  element: TicketTemplateElement,
  deltaX: number,
  deltaY: number,
): TicketTemplateElement {
  return normalizeTicketElement({
    ...element,
    x: element.x + deltaX,
    y: element.y + deltaY,
  });
}

export function setTicketElementFontSize(
  element: TicketTemplateElement,
  fontSize: number,
): TicketTemplateElement {
  return {
    ...element,
    fontSize: normalizeFontSize(fontSize),
  };
}

export function validateTicketTemplate(
  mode: TicketTemplateMode,
  backgroundUrl: string | null,
  elements: TicketTemplateElement[],
): string | null {
  if (mode === 'default') return null;
  if (!backgroundUrl) return 'Upload a background image before saving a custom ticket.';
  if (elements.filter((element) => element.type === 'qr').length !== 1) {
    return 'The ticket template must contain exactly one QR code.';
  }
  if (elements.filter((element) => element.type === 'ticket_code').length !== 1) {
    return 'The ticket template must contain exactly one ticket code.';
  }

  for (const element of elements) {
    if (
      !Number.isFinite(element.x)
      || !Number.isFinite(element.y)
      || !Number.isFinite(element.width)
      || !Number.isFinite(element.height)
      || element.x < 0
      || element.y < 0
      || element.width <= 0
      || element.height <= 0
      || element.x + element.width > 1.000_001
      || element.y + element.height > 1.000_001
    ) {
      return 'Every ticket element must fit inside the canvas.';
    }
  }

  const optionalKeys = elements
    .map(ticketElementToken)
    .filter((token): token is string => Boolean(token) && token !== 'CODE');
  if (new Set(optionalKeys).size !== optionalKeys.length) {
    return 'Each participant detail can only be placed once.';
  }
  return null;
}

export function ticketElementFontSizeForCanvas(
  fontSize: number,
  canvasWidth: number,
): number {
  return Math.max(1, (fontSize / TICKET_TEMPLATE_CANVAS_WIDTH) * canvasWidth);
}
