'use client';

import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin/api';
import type { AdminDashboardResponse, DashboardStats } from '@/lib/admin/types';

const dashboardQueryKey = ['admin', 'dashboard'] as const;

export function useAdminDashboard() {
  return useQuery({
    queryKey: dashboardQueryKey,
    queryFn: async (): Promise<DashboardStats> => {
      const response = await adminFetch<AdminDashboardResponse>('/api/v1/admin/dashboard');
      return response.data;
    },
    // Dashboard and Oversight share this query. A short freshness window
    // avoids a duplicate fetch when admins move between the two views, while
    // the explicit Refresh buttons still force live operational numbers.
    staleTime: 15_000,
  });
}

export { dashboardQueryKey };
