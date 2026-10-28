import { describe, expect, it } from 'vitest';
import {
  eventAccessState,
  registrationQrFileName,
  registrationQrPath,
  scannerUrlFromRegistrationUrl,
} from '@/lib/admin/access';

describe('admin event access helpers', () => {
  it('only treats Published events as active access', () => {
    expect(eventAccessState('Published')).toBe('active');
    expect(eventAccessState('Draft')).toBe('draft');
    expect(eventAccessState('Cancelled')).toBe('cancelled');
  });

  it('appends the volunteer check-in path to the public registration URL', () => {
    expect(scannerUrlFromRegistrationUrl('https://ticketin.id/event-gate'))
      .toBe('https://ticketin.id/event-gate/checkin');
    expect(scannerUrlFromRegistrationUrl('https://ticketin.id/event-gate/'))
      .toBe('https://ticketin.id/event-gate/checkin');
    expect(scannerUrlFromRegistrationUrl('http://localhost:3000/demo'))
      .toBe('http://localhost:3000/demo/checkin');
    expect(scannerUrlFromRegistrationUrl(null)).toBeNull();
    expect(scannerUrlFromRegistrationUrl('   ')).toBeNull();
  });

  it('builds a same-origin QR path and safe download filename', () => {
    expect(registrationQrPath('engineering-career-expo'))
      .toBe('/api/v1/events/engineering-career-expo/qr');
    expect(registrationQrPath('event with spaces'))
      .toBe('/api/v1/events/event%20with%20spaces/qr');
    expect(registrationQrFileName('engineering-career-expo'))
      .toBe('engineering-career-expo-registration-qr.png');
    expect(registrationQrFileName('Event / 2026'))
      .toBe('Event-2026-registration-qr.png');
    expect(registrationQrFileName('   ')).toBe('event-registration-qr.png');
  });
});
