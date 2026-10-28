import type { EventStatus } from '@/lib/admin/types';

export type EventAccessState = 'active' | 'draft' | 'cancelled';

/**
 * Access links are a lifecycle capability: the API deliberately returns null
 * public URLs until the event is Published. Keep the UI decision in one place
 * so Draft and Cancelled states cannot accidentally render active controls.
 */
export function eventAccessState(status: EventStatus): EventAccessState {
  if (status === 'Published') return 'active';
  if (status === 'Cancelled') return 'cancelled';
  return 'draft';
}

/**
 * Public registration URLs are `${base}/${slug}` (optionally behind a path
 * prefix). The volunteer login lives one segment deeper at `/checkin`, so
 * append instead of rebuilding the URL from the current admin origin.
 */
export function scannerUrlFromRegistrationUrl(
  registrationUrl: string | null | undefined,
): string | null {
  const trimmed = registrationUrl?.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  return `${trimmed}/checkin`;
}

/**
 * Use a same-origin QR path in the admin so preview and download keep working
 * on localhost and preview deployments. The route itself resolves the public
 * canonical URL that gets encoded into the QR image.
 */
export function registrationQrPath(slug: string): string {
  return `/api/v1/events/${encodeURIComponent(slug)}/qr`;
}

export function registrationQrFileName(slug: string): string {
  const safeSlug = slug.trim().replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '');
  return `${safeSlug || 'event'}-registration-qr.png`;
}
