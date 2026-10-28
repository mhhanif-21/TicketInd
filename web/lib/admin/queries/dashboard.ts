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
  });
}

export { dashboardQueryKey };
