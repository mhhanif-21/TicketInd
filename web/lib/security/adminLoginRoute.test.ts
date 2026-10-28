import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/auth/admin/login/route';
import { supabase } from '@/lib/supabase';
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
} from '@/lib/security/adminCookies';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

const signInMock = vi.mocked(supabase.auth.signInWithPassword);

const adminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  app_metadata: { role: 'admin' },
  user_metadata: { name: 'Admin One' },
};

function loginRequest(email = 'admin@example.com', password = 'correct-password'): Request {
  return new Request('https://app.ticketin.test/api/v1/auth/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
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

describe('POST /api/v1/auth/admin/login', () => {
  it('sets both HttpOnly session cookies for a valid admin login', async () => {
    signInMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_at: Math.floor(Date.now() / 1000) + 3_600,
        },
        user: adminUser,
      },
      error: null,
    } as never);

    const response = await POST(loginRequest());
    const body = await response.json();
    const cookies = setCookieHeaders(response);

    expect(response.status).toBe(200);
    expect(body.data.access_token).toBe('access-token');
    expect(body.data.user.email).toBe('admin@example.com');
    expect(cookies.find((cookie) => cookie.startsWith(`${ADMIN_ACCESS_COOKIE}=`)))
      .toMatch(/httponly/i);
    expect(cookies.find((cookie) => cookie.startsWith(`${ADMIN_REFRESH_COOKIE}=`)))
      .toMatch(/httponly/i);
  });

  it('rejects invalid credentials without setting cookies', async () => {
    signInMock.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    } as never);

    const response = await POST(loginRequest('admin@example.com', 'wrong'));

    expect(response.status).toBe(401);
    expect(setCookieHeaders(response)).toHaveLength(0);
  });

  it('rejects non-admin accounts without setting cookies', async () => {
    signInMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_at: null,
        },
        user: {
          id: 'user-1',
          email: 'user@example.com',
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    } as never);

    const response = await POST(loginRequest('user@example.com'));

    expect(response.status).toBe(403);
    expect(setCookieHeaders(response)).toHaveLength(0);
  });
});
