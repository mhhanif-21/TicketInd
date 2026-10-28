'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin/api';
import type {
  AdminEventDeleteResponse,
  AdminEventDetailResponse,
  AdminEventFilters,
  AdminEventListResponse,
  AdminEventStatsResponse,
  AdminEventUpdatePayload,
  AdminEventUpdateResponse,
  EventStatus,
} from '@/lib/admin/types';

export function invalidateEventQueries(
  queryClient: QueryClient,
  eventId?: string,
): Promise<unknown> {
  const invalidations: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: ['admin', 'events'] }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
  ];
  if (eventId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', eventId] }),
    );
  }
  return Promise.all(invalidations);
}

export function buildEventListQuery(filters: AdminEventFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
    sort: filters.sort,
  });

  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (filters.status !== 'all') params.set('status', filters.status);

  return params.toString();
}

export function useAdminEvents(filters: AdminEventFilters) {
  return useQuery({
    queryKey: ['admin', 'events', filters],
    queryFn: () => adminFetch<AdminEventListResponse>(
      `/api/v1/events?${buildEventListQuery(filters)}`,
    ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminEvent(eventId: string) {
  return useQuery({
    queryKey: ['admin', 'event', eventId],
    queryFn: () => adminFetch<AdminEventDetailResponse>(`/api/v1/events/${eventId}`),
    enabled: Boolean(eventId),
  });
}

export function useEventStats(eventId: string) {
  return useQuery({
    queryKey: ['admin', 'event', eventId, 'stats'],
    queryFn: () => adminFetch<AdminEventStatsResponse>(`/api/v1/events/${eventId}/stats`),
    enabled: Boolean(eventId),
  });
}

export function useUpdateEvent(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminEventUpdatePayload) => adminFetch<AdminEventUpdateResponse>(
      `/api/v1/events/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    ),
    onSuccess: () => invalidateEventQueries(queryClient, eventId),
  });
}

export function useSetEventStatus(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: EventStatus) => adminFetch<AdminEventUpdateResponse>(
      `/api/v1/events/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      },
    ),
    onSuccess: () => invalidateEventQueries(queryClient, eventId),
  });
}

export function useDeleteEvent(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminFetch<AdminEventDeleteResponse>(
      `/api/v1/events/${eventId}`,
      { method: 'DELETE' },
    ),
    // Do not refetch the deleted detail route; the page navigates to the list.
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      queryClient.removeQueries({ queryKey: ['admin', 'event', eventId] }),
    ]),
  });
}
