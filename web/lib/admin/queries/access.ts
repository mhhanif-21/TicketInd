'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin/api';
import type {
  AdminEventDetailResponse,
  AdminPinRegenerationResponse,
} from '@/lib/admin/types';

/**
 * Rotates the volunteer PIN and immediately syncs the cached event detail.
 * The API returns the only copy of the plaintext PIN, so the cache update is
 * what keeps the page showing the new value without an extra refetch.
 */
export function useRegenerateVolunteerPin(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminFetch<AdminPinRegenerationResponse>(
      `/api/v1/events/${eventId}/generate-pin`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    ),
    onSuccess: (response) => {
      queryClient.setQueryData<AdminEventDetailResponse>(
        ['admin', 'event', eventId],
        (current) => current
          ? {
            ...current,
            data: {
              ...current.data,
              volunteer_pin: response.data.pin,
            },
          }
          : current,
      );
    },
  });
}
