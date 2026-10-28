import { createClient } from '@supabase/supabase-js';
import { isAdminUser, type UserLike } from '@/lib/security/auth';

const AUTH_REFRESH_TIMEOUT_MS = 8_000;

export interface RefreshedAdminSession {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
}

export type AdminSessionRefreshResult =
  | {
    status: 'success';
    session: RefreshedAdminSession;
    user: UserLike;
  }
  | { status: 'invalid' }
  | { status: 'forbidden' }
  | { status: 'unavailable' };

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('auth_refresh_timeout')), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isInvalidRefreshError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
  };
  const status = candidate.status ?? candidate.statusCode;
  return status === 400
    || status === 401
    || status === 403
    || candidate.code === 'invalid_refresh_token'
    || candidate.code === 'refresh_token_not_found';
}

export async function refreshAdminSession(
  refreshToken: string,
  requestId = 'admin-session-refresh',
): Promise<AdminSessionRefreshResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('admin_session_refresh_unavailable', {
      requestId,
      errorName: 'MissingSupabaseConfiguration',
    });
    return { status: 'unavailable' };
  }

  let data;
  let error;
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    ({ data, error } = await withTimeout(
      client.auth.refreshSession({ refresh_token: refreshToken }),
      AUTH_REFRESH_TIMEOUT_MS,
    ));
  } catch (refreshError) {
    console.error('admin_session_refresh_unavailable', {
      requestId,
      errorName: refreshError instanceof Error ? refreshError.name : 'UnknownError',
    });
    return { status: 'unavailable' };
  }

  if (error) {
    if (!isInvalidRefreshError(error)) {
      console.error('admin_session_refresh_unavailable', {
        requestId,
        errorName: error instanceof Error ? error.name : 'AuthProviderError',
      });
      return { status: 'unavailable' };
    }
    return { status: 'invalid' };
  }

  if (!data.session || !data.user) {
    return { status: 'invalid' };
  }

  if (!isAdminUser(data.user)) {
    return { status: 'forbidden' };
  }

  return {
    status: 'success',
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? null,
    },
    user: data.user,
  };
}
