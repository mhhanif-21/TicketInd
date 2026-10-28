import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import { supabase } from '@/lib/supabase';
import { isAdminUser } from '@/lib/security/auth';
import { serializeAdminUser } from '@/lib/security/adminSession';
import {
  clearAdminSessionCookies,
  getAdminRefreshTokenFromRequest,
  isCookieAuthenticatedMutationAllowed,
  resolveAdminAccessCredential,
  setAdminSessionCookies,
} from '@/lib/security/adminCookies';
import { refreshAdminSession } from '@/lib/security/adminSessionRefresh';

export const runtime = 'nodejs';

const SESSION_LOOKUP_TIMEOUT_MS = 8_000;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('admin_session_timeout')), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function requestIdFor(request: Request): string {
  return request.headers.get('x-request-id')?.trim()
    || request.headers.get('x-vercel-id')?.trim()
    || 'admin-session-request';
}

function isInvalidAccessTokenError(error: unknown): boolean {
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
    || candidate.code === 'bad_jwt'
    || candidate.code === 'invalid_token'
    || candidate.code === 'session_not_found';
}

function accessTokenExpiresAt(token: string): number | null {
  try {
    const payload = decodeJwt(token);
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function successResponse(user: Parameters<typeof serializeAdminUser>[0], expiresAt: number | null) {
  return NextResponse.json(
    {
      status: 'success',
      data: {
        role: 'admin',
        user: serializeAdminUser(user),
        expires_at: expiresAt,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request: Request) {
  const credential = resolveAdminAccessCredential(request);
  if (!isCookieAuthenticatedMutationAllowed(request, credential)) {
    return NextResponse.json(
      { status: 'error', message: 'Invalid request origin' },
      { status: 403 },
    );
  }

  if (credential.token) {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.getUser(credential.token),
        SESSION_LOOKUP_TIMEOUT_MS,
      );

      if (!error && data.user) {
        if (!isAdminUser(data.user)) {
          const response = NextResponse.json(
            { status: 'error', message: 'Account does not have admin access' },
            { status: 403 },
          );
          clearAdminSessionCookies(response);
          return response;
        }

        return successResponse(
          data.user,
          accessTokenExpiresAt(credential.token),
        );
      }

      if (error && !isInvalidAccessTokenError(error)) {
        console.error('admin_session_lookup_unavailable', {
          requestId: requestIdFor(request),
          errorName: error instanceof Error ? error.name : 'AuthProviderError',
        });
        return NextResponse.json(
          {
            status: 'error',
            code: 'AUTH_UNAVAILABLE',
            message: 'Session service temporarily unavailable. Please try again.',
          },
          { status: 503 },
        );
      }
    } catch (error) {
      console.error('admin_session_lookup_unavailable', {
        requestId: requestIdFor(request),
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      return NextResponse.json(
        {
          status: 'error',
          code: 'AUTH_UNAVAILABLE',
          message: 'Session service temporarily unavailable. Please try again.',
        },
        { status: 503 },
      );
    }
  }

  const refreshToken = getAdminRefreshTokenFromRequest(request);
  if (!refreshToken) {
    const response = NextResponse.json(
      { status: 'error', message: 'No active admin session' },
      { status: 401 },
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

  const response = successResponse(result.user, result.session.expires_at);
  setAdminSessionCookies(response, result.session);
  return response;
}
