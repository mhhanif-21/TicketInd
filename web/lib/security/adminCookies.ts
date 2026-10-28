import type { NextResponse } from 'next/server';

export const ADMIN_ACCESS_COOKIE = 'ticketin_admin_access';
export const ADMIN_REFRESH_COOKIE = 'ticketin_admin_refresh';
export const ADMIN_REFRESH_COOKIE_PATH = '/api/v1/auth/admin';

export const ADMIN_ACCESS_MAX_AGE_SECONDS = 60 * 60;
export const ADMIN_REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface AdminSessionTokens {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
}

export interface AdminAccessCredential {
  token: string | null;
  source: 'bearer' | 'cookie' | null;
}

interface AdminCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

export function isAdminCookieSecure(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function adminAccessCookieOptions(
  maxAge = ADMIN_ACCESS_MAX_AGE_SECONDS,
): AdminCookieOptions {
  return {
    httpOnly: true,
    secure: isAdminCookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function adminRefreshCookieOptions(
  maxAge = ADMIN_REFRESH_MAX_AGE_SECONDS,
): AdminCookieOptions {
  return {
    httpOnly: true,
    secure: isAdminCookieSecure(),
    sameSite: 'lax',
    path: ADMIN_REFRESH_COOKIE_PATH,
    maxAge,
  };
}

function accessCookieMaxAge(expiresAt: number | null | undefined): number {
  if (!expiresAt || !Number.isFinite(expiresAt)) {
    return ADMIN_ACCESS_MAX_AGE_SECONDS;
  }

  const secondsUntilExpiry = Math.floor(expiresAt - Date.now() / 1000);
  if (secondsUntilExpiry < 60) return 60;
  return Math.min(secondsUntilExpiry, ADMIN_ACCESS_MAX_AGE_SECONDS);
}

export function setAdminSessionCookies(
  response: NextResponse,
  session: AdminSessionTokens,
): void {
  response.cookies.set({
    name: ADMIN_ACCESS_COOKIE,
    value: session.access_token,
    ...adminAccessCookieOptions(accessCookieMaxAge(session.expires_at)),
  });
  response.cookies.set({
    name: ADMIN_REFRESH_COOKIE,
    value: session.refresh_token,
    ...adminRefreshCookieOptions(),
  });
}

export function clearAdminSessionCookies(response: NextResponse): void {
  response.cookies.set({
    name: ADMIN_ACCESS_COOKIE,
    value: '',
    ...adminAccessCookieOptions(0),
  });
  response.cookies.set({
    name: ADMIN_REFRESH_COOKIE,
    value: '',
    ...adminRefreshCookieOptions(0),
  });
}

export function getCookieValue(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;

    const rawValue = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

/**
 * Resolves the admin access token, preferring an explicit Bearer header so
 * mobile/API clients keep working while browser sessions use HttpOnly cookies.
 */
export function resolveAdminAccessCredential(request: Request): AdminAccessCredential {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  if (authorization.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (token) return { token, source: 'bearer' };
  }

  const cookieToken = getCookieValue(
    request.headers.get('cookie'),
    ADMIN_ACCESS_COOKIE,
  );
  if (cookieToken) return { token: cookieToken, source: 'cookie' };

  return { token: null, source: null };
}

export function getAdminRefreshTokenFromRequest(request: Request): string | null {
  return getCookieValue(request.headers.get('cookie'), ADMIN_REFRESH_COOKIE);
}

export function isUnsafeHttpMethod(method: string): boolean {
  const normalized = method.toUpperCase();
  return normalized !== 'GET' && normalized !== 'HEAD' && normalized !== 'OPTIONS';
}

/**
 * Browser cookie-authenticated mutations must originate from this application.
 * Requests without Origin/Sec-Fetch-Site are non-browser clients; SameSite=Lax
 * already prevents cross-site cookie attachment for them.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();

  if (!origin) {
    return !secFetchSite || secFetchSite === 'same-origin' || secFetchSite === 'none';
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const requestUrl = new URL(request.url);
  const allowedHosts = new Set<string>([requestUrl.host]);
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = request.headers.get('host')?.trim();
  if (forwardedHost) allowedHosts.add(forwardedHost);
  if (host) allowedHosts.add(host);

  return allowedHosts.has(originUrl.host);
}

export function isCookieAuthenticatedMutationAllowed(
  request: Request,
  credential: AdminAccessCredential,
): boolean {
  if (credential.source !== 'cookie') return true;
  if (!isUnsafeHttpMethod(request.method)) return true;
  return isSameOriginRequest(request);
}
