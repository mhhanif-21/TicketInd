export interface AdminApiErrorBody {
  status?: string;
  message?: string;
  code?: string;
  field?: string;
}

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export interface AdminRequestInit extends RequestInit {
  /** Retry once after rotating the session cookie. Defaults to true. */
  authRetry?: boolean;
  /** Send the browser back to login when the session cannot be recovered. */
  redirectOnAuthFailure?: boolean;
}

let refreshInFlight: Promise<RefreshResult> | null = null;

type RefreshResult = 'refreshed' | 'invalid' | 'unavailable';

function fallbackMessage(status: number): string {
  if (status === 0) return 'Unable to reach the server. Check your connection and try again.';
  if (status === 401 || status === 403) return 'Your session has ended. Please sign in again.';
  if (status === 404) return 'The requested data could not be found.';
  if (status === 413) return 'The upload is too large. Use a smaller image and try again.';
  if (status === 408 || status === 429) return 'The server is busy. Please try again in a moment.';
  if (status >= 500) return 'The server is temporarily unavailable. Please try again.';
  return 'Something went wrong. Please try again.';
}

function isTestEnvironment(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/admin/login')) return;

  const nextPath = `${window.location.pathname}${window.location.search}`;
  const loginUrl = new URL('/admin/login', window.location.origin);
  if (nextPath && nextPath !== '/admin') {
    loginUrl.searchParams.set('next', nextPath);
  }
  window.location.assign(`${loginUrl.pathname}${loginUrl.search}`);
}

async function refreshAdminSession(): Promise<RefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async (): Promise<RefreshResult> => {
    try {
      const response = await fetch('/api/v1/auth/admin/refresh', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: '{}',
        cache: 'no-store',
      });
      if (response.ok) return 'refreshed';
      if (response.status === 401 || response.status === 403) return 'invalid';
      return 'unavailable';
    } catch {
      return 'unavailable';
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  const text = await response.text();
  return text || undefined;
}

function toAdminApiError(response: Response, body: unknown): AdminApiError {
  const payload = body && typeof body === 'object'
    ? body as AdminApiErrorBody
    : undefined;
  const message = typeof payload?.message === 'string' && payload.message.trim()
    ? payload.message.trim()
    : fallbackMessage(response.status);

  return new AdminApiError(
    response.status,
    message,
    typeof payload?.code === 'string' ? payload.code : undefined,
    typeof payload?.field === 'string' ? payload.field : undefined,
  );
}

function buildHeaders(init: AdminRequestInit): Headers {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const body = init.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && body !== null && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

async function performRequest<T>(
  path: string,
  init: AdminRequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: buildHeaders(init),
      credentials: 'same-origin',
      cache: init.cache ?? 'no-store',
    });
  } catch {
    throw new AdminApiError(0, fallbackMessage(0), 'NETWORK_ERROR');
  }

  const body = await parseResponseBody(response);

  if (response.ok) {
    return body as T;
  }

  const error = toAdminApiError(response, body);

  const canRetry = init.authRetry !== false
    && response.status === 401
    && !path.startsWith('/api/v1/auth/admin/');
  if (canRetry) {
    const refreshResult = await refreshAdminSession();
    if (refreshResult === 'refreshed') {
      return performRequest<T>(path, { ...init, authRetry: false });
    }
    if (refreshResult === 'invalid') {
      if (!isTestEnvironment() && init.redirectOnAuthFailure !== false) {
        redirectToLogin();
      }
      throw error;
    }

    throw new AdminApiError(
      503,
      'Your session could not be refreshed right now. Please try again.',
      'AUTH_REFRESH_UNAVAILABLE',
    );
  }

  throw error;
}

/**
 * Browser-side admin API client. Uses the HttpOnly session cookie, rotates it
 * on 401, and retries the original request once.
 */
export function adminFetch<T>(
  path: string,
  init: AdminRequestInit = {},
): Promise<T> {
  return performRequest<T>(path, init);
}

export async function adminJson<T>(
  path: string,
  method: string,
  payload: unknown,
): Promise<T> {
  return adminFetch<T>(path, {
    method,
    body: JSON.stringify(payload),
  });
}
