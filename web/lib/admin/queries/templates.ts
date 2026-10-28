'use client';

import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin/api';
import type {
  EmailTemplateKind,
  EmailTemplateResponse,
} from '@/lib/admin/email-template';
import type { TicketTemplateResponse } from '@/lib/admin/ticket-template';

export function useAdminTicketTemplate(eventId: string) {
  return useQuery({
    queryKey: ['admin', 'event', eventId, 'ticket-template'],
    queryFn: () => adminFetch<TicketTemplateResponse>(
      `/api/v1/events/${eventId}/ticket-template`,
    ),
    enabled: Boolean(eventId),
  });
}

export function useAdminEmailTemplate(
  eventId: string,
  kind: EmailTemplateKind,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['admin', 'event', eventId, 'email-template', kind],
    queryFn: () => adminFetch<EmailTemplateResponse>(
      `/api/v1/events/${eventId}/approval-email-template?kind=${kind}`,
    ),
    enabled: Boolean(eventId) && enabled,
    staleTime: 60_000,
  });
}
