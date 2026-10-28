'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin/api';
import type {
  AdminEventDetailResponse,
  AdminEventFilters,
  AdminEventListResponse,
  AdminEventStatsResponse,
} from '@/lib/admin/types';

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
