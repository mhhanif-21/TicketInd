import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/auth/admin/session/route';
import { supabase } from '@/lib/supabase';
import { refreshAdminSession } from '@/lib/security/adminSessionRefresh';
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
} from '@/lib/security/adminCookies';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('@/lib/security/adminSessionRefresh', () => ({
  refreshAdminSession: vi.fn(),
}));

const adminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  app_metadata: { role: 'admin' },
  user_metadata: { name: 'Admin One' },
};

const getUserMock = vi.mocked(supabase.auth.getUser);
const refreshMock = vi.mocked(refreshAdminSession);

function requestWithCookies(cookies: Record<string, string>): Request {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return new Request('https://app.ticketin.test/api/v1/auth/admin/session', {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

function setCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const combined = response.headers.get('set-cookie');
  return combined ? [combined] : [];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/auth/admin/session', () => {
  it('returns the current admin profile for a valid access cookie', async () => {
    getUserMock.mockResolvedValue({ data: { user: adminUser }, error: null } as never);

    const response = await GET(requestWithCookies({ [ADMIN_ACCESS_COOKIE]: 'valid-token' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.user).toEqual({
      id: 'admin-1',
      name: 'Admin One',
      email: 'admin@example.com',
    });
    expect(refreshMock).not.toHaveBeenCalled();
    expect(setCookieHeaders(response)).toHaveLength(0);
  });

  it('rotates cookies when the access token expired but refresh is valid', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { status: 401, code: 'bad_jwt' },
    } as never);
    refreshMock.mockResolvedValue({
      status: 'success',
      session: {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_at: 1_800_000_000,
      },
      user: adminUser,
    });

    const response = await GET(requestWithCookies({
      [ADMIN_ACCESS_COOKIE]: 'expired-token',
      [ADMIN_REFRESH_COOKIE]: 'valid-refresh',
    }));
    const body = await response.json();
    const cookies = setCookieHeaders(response);

    expect(response.status).toBe(200);
    expect(body.data.user.email).toBe('admin@example.com');
    expect(refreshMock).toHaveBeenCalledWith('valid-refresh', expect.any(String));
    expect(cookies.some((cookie) => cookie.includes('new-access'))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes('new-refresh'))).toBe(true);
  });

  it('clears cookies when the refresh token is invalid', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { status: 401, code: 'bad_jwt' },
    } as never);
    refreshMock.mockResolvedValue({ status: 'invalid' });

    const response = await GET(requestWithCookies({
      [ADMIN_ACCESS_COOKIE]: 'expired-token',
      [ADMIN_REFRESH_COOKIE]: 'bad-refresh',
    }));
    const cookies = setCookieHeaders(response);

    expect(response.status).toBe(401);
    expect(cookies).toHaveLength(2);
    expect(cookies.every((cookie) => /max-age=0/i.test(cookie))).toBe(true);
  });

  it('does not clear cookies when the auth provider is unavailable', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { status: 500, code: 'unexpected_failure' },
    } as never);

    const response = await GET(requestWithCookies({
      [ADMIN_ACCESS_COOKIE]: 'expired-token',
      [ADMIN_REFRESH_COOKIE]: 'valid-refresh',
    }));

    expect(response.status).toBe(503);
    expect(setCookieHeaders(response)).toHaveLength(0);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('clears cookies when there is no active session at all', async () => {
    const response = await GET(requestWithCookies({}));

    expect(response.status).toBe(401);
    expect(setCookieHeaders(response)).toHaveLength(2);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('rejects a valid non-admin account and clears the session', async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    } as never);

    const response = await GET(requestWithCookies({ [ADMIN_ACCESS_COOKIE]: 'user-token' }));

    expect(response.status).toBe(403);
    expect(setCookieHeaders(response)).toHaveLength(2);
  });
});
