import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  ADMIN_REFRESH_COOKIE_PATH,
  adminAccessCookieOptions,
  adminRefreshCookieOptions,
  clearAdminSessionCookies,
  getAdminRefreshTokenFromRequest,
  getCookieValue,
  isCookieAuthenticatedMutationAllowed,
  isSameOriginRequest,
  resolveAdminAccessCredential,
  setAdminSessionCookies,
} from '@/lib/security/adminCookies';

afterEach(() => {
  vi.unstubAllEnvs();
});

function setCookieHeaders(response: NextResponse): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const combined = response.headers.get('set-cookie');
  return combined ? [combined] : [];
}

describe('admin cookie helpers', () => {
  it('reads a named value from a cookie header', () => {
    const header = `foo=bar; ${ADMIN_ACCESS_COOKIE}=access-value; ${ADMIN_REFRESH_COOKIE}=refresh-value`;
    expect(getCookieValue(header, ADMIN_ACCESS_COOKIE)).toBe('access-value');
    expect(getCookieValue(header, ADMIN_REFRESH_COOKIE)).toBe('refresh-value');
    expect(getCookieValue(header, 'missing')).toBeNull();
    expect(getCookieValue(null, ADMIN_ACCESS_COOKIE)).toBeNull();
  });

  it('decodes URL-encoded cookie values', () => {
    expect(getCookieValue(`${ADMIN_ACCESS_COOKIE}=a%20b`, ADMIN_ACCESS_COOKIE)).toBe('a b');
  });

  it('prefers a Bearer token over the browser cookie', () => {
    const request = new Request('https://ticketin.test/api/v1/events', {
      headers: {
        authorization: 'Bearer header-token',
        cookie: `${ADMIN_ACCESS_COOKIE}=cookie-token`,
      },
    });
    expect(resolveAdminAccessCredential(request)).toEqual({
      token: 'header-token',
      source: 'bearer',
    });
  });

  it('falls back to the admin access cookie', () => {
    const request = new Request('https://ticketin.test/api/v1/events', {
      headers: { cookie: `${ADMIN_ACCESS_COOKIE}=cookie-token` },
    });
    expect(resolveAdminAccessCredential(request)).toEqual({
      token: 'cookie-token',
      source: 'cookie',
    });
  });

  it('sets HttpOnly access and scoped refresh cookies', () => {
    const response = NextResponse.json({ status: 'success' });
    setAdminSessionCookies(response, {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3_600,
    });

    const cookies = setCookieHeaders(response);
    const accessCookie = cookies.find((cookie) => cookie.startsWith(`${ADMIN_ACCESS_COOKIE}=`));
    const refreshCookie = cookies.find((cookie) => cookie.startsWith(`${ADMIN_REFRESH_COOKIE}=`));

    expect(accessCookie).toBeDefined();
    expect(accessCookie).toMatch(/httponly/i);
    expect(accessCookie).toMatch(/samesite=lax/i);
    expect(accessCookie).toMatch(/path=\//i);
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/httponly/i);
    expect(refreshCookie).toMatch(/samesite=lax/i);
    expect(refreshCookie).toMatch(/path=\/api\/v1\/auth\/admin/i);
  });

  it('clears both cookies with max-age zero', () => {
    const response = NextResponse.json({ status: 'success' });
    clearAdminSessionCookies(response);

    const cookies = setCookieHeaders(response);
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {
      expect(cookie).toMatch(/max-age=0/i);
    }
  });

  it('marks cookies secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(adminAccessCookieOptions().secure).toBe(true);
    expect(adminRefreshCookieOptions().secure).toBe(true);
    expect(adminRefreshCookieOptions().path).toBe(ADMIN_REFRESH_COOKIE_PATH);
  });

  it('reads the refresh token from the browser cookie', () => {
    const request = new Request('https://ticketin.test/api/v1/auth/admin/session', {
      headers: { cookie: `${ADMIN_REFRESH_COOKIE}=refresh-token` },
    });
    expect(getAdminRefreshTokenFromRequest(request)).toBe('refresh-token');
  });
});

describe('admin cookie request origin checks', () => {
  it('accepts same-origin mutations', () => {
    const request = new Request('https://app.ticketin.test/api/v1/events', {
      method: 'POST',
      headers: { origin: 'https://app.ticketin.test' },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it('rejects cross-origin mutations', () => {
    const request = new Request('https://app.ticketin.test/api/v1/events', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it('accepts a forwarded host used by the proxy', () => {
    const request = new Request('http://localhost:3000/api/v1/events', {
      method: 'POST',
      headers: {
        origin: 'https://ticketin.example',
        'x-forwarded-host': 'ticketin.example',
      },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it('uses Sec-Fetch-Site when Origin is absent', () => {
    const crossSite = new Request('https://app.ticketin.test/api/v1/events', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site' },
    });
    const sameOrigin = new Request('https://app.ticketin.test/api/v1/events', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
    });

    expect(isSameOriginRequest(crossSite)).toBe(false);
    expect(isSameOriginRequest(sameOrigin)).toBe(true);
  });

  it('only applies the origin check to cookie-authenticated mutations', () => {
    const crossOrigin = new Request('https://app.ticketin.test/api/v1/events', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });

    expect(isCookieAuthenticatedMutationAllowed(crossOrigin, {
      token: 'token',
      source: 'bearer',
    })).toBe(true);
    expect(isCookieAuthenticatedMutationAllowed(crossOrigin, {
      token: 'token',
      source: 'cookie',
    })).toBe(false);
    expect(isCookieAuthenticatedMutationAllowed(
      new Request('https://app.ticketin.test/api/v1/events', { method: 'GET' }),
      { token: 'token', source: 'cookie' },
    )).toBe(true);
  });
});
