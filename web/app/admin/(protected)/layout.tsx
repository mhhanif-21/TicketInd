import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminAuthGate } from '@/components/admin/admin-auth-gate';
import { ToastProvider } from '@/components/admin/toast';
import { AdminAuthProvider } from '@/lib/admin/auth-provider';
import { AdminQueryProvider } from '@/lib/admin/query-provider';

export const metadata: Metadata = {
  title: {
    default: 'Admin | Event Gate',
    template: '%s | Event Gate Admin',
  },
  robots: { index: false, follow: false },
};

export default function AdminProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AdminQueryProvider>
      <ToastProvider>
        <AdminAuthProvider>
          <AdminAuthGate>{children}</AdminAuthGate>
        </AdminAuthProvider>
      </ToastProvider>
    </AdminQueryProvider>
  );
}
