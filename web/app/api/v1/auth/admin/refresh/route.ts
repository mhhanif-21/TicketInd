import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/security/auth';
import { serializeAdminSession } from '@/lib/security/adminSession';
import {
  clearAdminSessionCookies,
  getAdminRefreshTokenFromRequest,
  setAdminSessionCookies,
} from '@/lib/security/adminCookies';
import { refreshAdminSession } from '@/lib/security/adminSessionRefresh';

export const runtime = 'nodejs';

function requestIdFor(request: Request): string {
  return request.headers.get('x-request-id')?.trim()
    || request.headers.get('x-vercel-id')?.trim()
    || 'admin-refresh-request';
}

async function readBodyRefreshToken(request: Request): Promise<string> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) return '';

  try {
    const body = await request.json() as { refresh_token?: unknown };
    return typeof body?.refresh_token === 'string'
      ? body.refresh_token.trim()
      : '';
  } catch {
    return '';
  }
}

export async function POST(request: Request) {
  const bodyToken = await readBodyRefreshToken(request);
  const refreshToken = bodyToken || getAdminRefreshTokenFromRequest(request);

  if (!refreshToken) {
    const response = NextResponse.json(
      { status: 'error', message: 'Refresh token is required' },
      { status: 400 },
    );
    clearAdminSessionCookies(response);
    return response;
  }

  const result = await refreshAdminSession(refreshToken, requestIdFor(request));

  if (result.status === 'unavailable') {
    return NextResponse.json(
      {
        status: 'error',
        code: 'AUTH_REFRESH_UNAVAILABLE',
        message: 'Session service temporarily unavailable. Please try again.',
      },
      { status: 503 },
    );
  }

  if (result.status === 'invalid' || result.status === 'forbidden') {
    const response = NextResponse.json(
      {
        status: 'error',
        message: result.status === 'forbidden'
          ? 'Account does not have admin access'
          : 'Session expired or invalid',
      },
      { status: result.status === 'forbidden' ? 403 : 401 },
    );
    clearAdminSessionCookies(response);
    return response;
  }

  // Defensive check: refreshAdminSession already validates the allowlist.
  if (!isAdminUser(result.user)) {
    const response = NextResponse.json(
      { status: 'error', message: 'Account does not have admin access' },
      { status: 403 },
    );
    clearAdminSessionCookies(response);
    return response;
  }

  const response = NextResponse.json(
    {
      status: 'success',
      data: serializeAdminSession(result.session, result.user),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  setAdminSessionCookies(response, result.session);
  return response;
}
