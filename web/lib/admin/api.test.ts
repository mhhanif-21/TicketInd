import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminApiError, adminFetch } from '@/lib/admin/api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('adminFetch', () => {
  it('requests admin APIs with same-origin credentials and no-store caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      status: 'success',
      data: { total_events: 3 },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await adminFetch<{ status: string; data: { total_events: number } }>(
      '/api/v1/admin/dashboard',
    );

    expect(result.data.total_events).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/v1/admin/dashboard');
    expect(init.credentials).toBe('same-origin');
    expect(init.cache).toBe('no-store');
  });

  it('maps API errors to AdminApiError with code and field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      status: 'error',
      message: 'Event not found',
      code: 'EVENT_NOT_FOUND',
      field: 'id',
    }, 404)));

    await expect(adminFetch('/api/v1/events/missing')).rejects.toMatchObject({
      name: 'AdminApiError',
      status: 404,
      message: 'Event not found',
      code: 'EVENT_NOT_FOUND',
      field: 'id',
    });
  });

  it('refreshes the session once and retries a 401 response', async () => {
    let originalCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      void _init;
      const path = String(input);
      if (path === '/api/v1/auth/admin/refresh') {
        return jsonResponse({ status: 'success' });
      }

      originalCalls += 1;
      if (originalCalls === 1) {
        return jsonResponse({ status: 'error', message: 'Token expired' }, 401);
      }
      return jsonResponse({ status: 'success', data: ['event'] });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await adminFetch<{ data: string[] }>('/api/v1/events');
    expect(result.data).toEqual(['event']);
    expect(originalCalls).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const refreshInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect(refreshInit.method).toBe('POST');
    expect(refreshInit.credentials).toBe('same-origin');
  });

  it('throws when the refresh attempt also fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/v1/auth/admin/refresh') {
        return jsonResponse({ status: 'error', message: 'Session expired' }, 401);
      }
      return jsonResponse({ status: 'error', message: 'Token expired' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(adminFetch('/api/v1/events')).rejects.toBeInstanceOf(AdminApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports a temporary refresh failure without treating it as logout', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/v1/auth/admin/refresh') {
        return jsonResponse({
          status: 'error',
          code: 'AUTH_REFRESH_UNAVAILABLE',
          message: 'Service unavailable',
        }, 503);
      }
      return jsonResponse({ status: 'error', message: 'Token expired' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(adminFetch('/api/v1/events')).rejects.toMatchObject({
      status: 503,
      code: 'AUTH_REFRESH_UNAVAILABLE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not set Content-Type for FormData uploads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'success' }));
    vi.stubGlobal('fetch', fetchMock);

    const form = new FormData();
    form.append('cover', new Blob(['image']), 'cover.png');
    await adminFetch('/api/v1/events/123/poster', {
      method: 'POST',
      body: form,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('content-type')).toBeNull();
    expect(headers.get('accept')).toBe('application/json');
  });

  it('maps network failures to a status 0 AdminApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(adminFetch('/api/v1/events')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
