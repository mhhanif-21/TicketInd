import { describe, expect, it } from 'vitest';
import {
  addTicketElement,
  availableTicketTokens,
  defaultTicketTemplateElements,
  ensureRequiredTicketElements,
  moveTicketElement,
  normalizeTicketElement,
  removeTicketElement,
  setTicketElementFontSize,
  ticketElementsFromApi,
  validateTicketTemplate,
} from '@/lib/admin/ticket-template';

describe('admin ticket template model', () => {
  it('provides one QR and one ticket code by default', () => {
    const elements = defaultTicketTemplateElements();
    expect(elements.filter((element) => element.type === 'qr')).toHaveLength(1);
    expect(elements.filter((element) => element.type === 'ticket_code')).toHaveLength(1);
    expect(validateTicketTemplate('custom', 'blob:background', elements)).toBeNull();
  });

  it('requires a background and the two required elements in custom mode', () => {
    const elements = defaultTicketTemplateElements();
    expect(validateTicketTemplate('custom', null, elements)).toContain('background');
    expect(validateTicketTemplate('custom', 'blob:background', [elements[0]]))
      .toContain('ticket code');
  });

  it('repairs missing required elements from the API', () => {
    const elements = ticketElementsFromApi([
      { type: 'name', x: 0.1, y: 0.1, width: 0.2, height: 0.08 },
    ]);
    expect(elements.map((element) => element.type)).toEqual([
      'name',
      'qr',
      'ticket_code',
    ]);
  });

  it('drops duplicate required elements when opening the editor', () => {
    const elements = ensureRequiredTicketElements([
      ...defaultTicketTemplateElements(),
      normalizeTicketElement({
        type: 'qr',
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.2,
      }),
    ]);
    expect(elements.filter((element) => element.type === 'qr')).toHaveLength(1);
  });

  it('keeps text and QR geometry inside the canvas', () => {
    const element = normalizeTicketElement({
      type: 'name',
      x: 0.95,
      y: 0.95,
      width: 0.4,
      height: 0.4,
      fontSize: 500,
      color: 'not-a-color',
    });
    expect(element.x + element.width).toBeLessThanOrEqual(1);
    expect(element.y + element.height).toBeLessThanOrEqual(1);
    expect(element.fontSize).toBe(120);
    expect(element.color).toBe('#111111');
  });

  it('adds optional tokens once and never allows required elements to be removed', () => {
    const start = defaultTicketTemplateElements();
    const withName = addTicketElement(start, 'NAME');
    expect(availableTicketTokens(withName)).not.toContain('NAME');
    expect(addTicketElement(withName, 'NAME')).toEqual(withName);
    expect(removeTicketElement(withName, 0)).toEqual(withName);
    expect(removeTicketElement(withName, 2).map((element) => element.type))
      .toEqual(['qr', 'ticket_code']);
  });

  it('moves and resizes text in normalized coordinates', () => {
    const name = normalizeTicketElement({
      type: 'name',
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.1,
    });
    expect(moveTicketElement(name, 0.8, 0.8)).toMatchObject({
      x: 0.8,
      y: 0.9,
    });
    expect(setTicketElementFontSize(name, 64).fontSize).toBe(64);
    expect(setTicketElementFontSize(name, 300).fontSize).toBe(120);
  });
});
