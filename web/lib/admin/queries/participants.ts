'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin/api';
import { buildParticipantListQuery } from '@/lib/admin/participants';
import type {
  AdminParticipantDetailResponse,
  AdminParticipantFileResponse,
  AdminParticipantFilters,
  AdminParticipantListResponse,
  AdminParticipantReviewResponse,
  AdminParticipantTicketRetryResponse,
} from '@/lib/admin/types';

export function invalidateParticipantQueries(
  queryClient: QueryClient,
  eventId: string,
  registrationId?: string,
): Promise<unknown> {
  const invalidations: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({
      queryKey: ['admin', 'event', eventId, 'participants'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['admin', 'event', eventId, 'stats'],
    }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
  ];
  if (registrationId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: ['admin', 'participant', registrationId],
      }),
    );
  }
  return Promise.all(invalidations);
}

export function useAdminParticipants(
  eventId: string,
  filters: AdminParticipantFilters,
) {
  return useQuery({
    queryKey: ['admin', 'event', eventId, 'participants', filters],
    queryFn: () => adminFetch<AdminParticipantListResponse>(
      `/api/v1/events/${eventId}/registrations?${buildParticipantListQuery(filters)}`,
    ),
    enabled: Boolean(eventId),
    placeholderData: keepPreviousData,
  });
}

export function useAdminParticipant(registrationId: string) {
  return useQuery({
    queryKey: ['admin', 'participant', registrationId],
    queryFn: () => adminFetch<AdminParticipantDetailResponse>(
      `/api/v1/registrations/${registrationId}`,
    ),
    enabled: Boolean(registrationId),
  });
}

export function useReviewParticipant(eventId: string, registrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: 'Approve' | 'Reject') => adminFetch<AdminParticipantReviewResponse>(
      `/api/v1/registrations/${registrationId}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      },
    ),
    // The API can return 503 after accepting the registration but failing to
    // publish the ticket job. Refresh regardless so the detail screen shows
    // the real final status and the retry action when applicable.
    onSettled: () => invalidateParticipantQueries(queryClient, eventId, registrationId),
  });
}

export function useRetryParticipantTicket(eventId: string, registrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminFetch<AdminParticipantTicketRetryResponse>(
      `/api/v1/registrations/${registrationId}/ticket/retry`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    ),
    onSettled: () => invalidateParticipantQueries(queryClient, eventId, registrationId),
  });
}

export function fetchParticipantFile(
  registrationId: string,
  fieldKey: string,
): Promise<AdminParticipantFileResponse> {
  return adminFetch<AdminParticipantFileResponse>(
    `/api/v1/registrations/${registrationId}/files/${encodeURIComponent(fieldKey)}`,
  );
}
