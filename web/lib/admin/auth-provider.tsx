'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { AdminApiError, adminFetch } from '@/lib/admin/api';
import type { AdminSessionResponse, AdminUser } from '@/lib/admin/types';
import { useToast } from '@/components/admin/toast';

export type AdminAuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'unavailable';

interface AdminAuthState {
  status: AdminAuthStatus;
  user: AdminUser | null;
  error: string | null;
}

interface AdminAuthContextValue extends AdminAuthState {
  retrySession: () => void;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

let sessionLookup: Promise<AdminSessionResponse> | null = null;

function loadAdminSession(): Promise<AdminSessionResponse> {
  if (!sessionLookup) {
    sessionLookup = adminFetch<AdminSessionResponse>('/api/v1/auth/admin/session', {
      authRetry: false,
      redirectOnAuthFailure: false,
    }).finally(() => {
      sessionLookup = null;
    });
  }
  return sessionLookup;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<AdminAuthState>({
    status: 'loading',
    user: null,
    error: null,
  });
  const bootstrapId = useRef(0);
  const logoutInProgress = useRef(false);

  const bootstrap = useCallback(async () => {
    const requestId = ++bootstrapId.current;
    setState({ status: 'loading', user: null, error: null });

    try {
      const response = await loadAdminSession();
      if (bootstrapId.current !== requestId) return;
      setState({
        status: 'authenticated',
        user: response.data.user,
        error: null,
      });
    } catch (error) {
      if (bootstrapId.current !== requestId) return;

      if (
        error instanceof AdminApiError
        && (error.status === 401 || error.status === 403)
      ) {
        setState({ status: 'unauthenticated', user: null, error: null });
        return;
      }

      setState({
        status: 'unavailable',
        user: null,
        error: error instanceof Error
          ? error.message
          : 'The admin session could not be verified.',
      });
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (state.status !== 'unauthenticated' || logoutInProgress.current) return;

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const loginPath = currentPath && currentPath !== '/admin'
      ? `/admin/login?next=${encodeURIComponent(currentPath)}`
      : '/admin/login';
    router.replace(loginPath);
  }, [state.status, router]);

  const retrySession = useCallback(() => {
    void bootstrap();
  }, [bootstrap]);

  const logout = useCallback(async () => {
    try {
      await adminFetch('/api/v1/auth/admin/logout', {
        method: 'POST',
        authRetry: false,
        redirectOnAuthFailure: false,
      });
    } catch (error) {
      const status = error instanceof AdminApiError ? error.status : 0;
      if (status !== 401 && status !== 403) {
        toast({
          variant: 'error',
          title: 'Sign out failed',
          description: error instanceof Error
            ? error.message
            : 'Please try again.',
        });
        return;
      }
    }

    logoutInProgress.current = true;
    setState({ status: 'unauthenticated', user: null, error: null });
    router.replace('/admin/login');
    router.refresh();
  }, [router, toast]);

  const value = useMemo<AdminAuthContextValue>(() => ({
    ...state,
    retrySession,
    logout,
  }), [state, retrySession, logout]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return context;
}
