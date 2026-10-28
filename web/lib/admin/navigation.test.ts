import { describe, expect, it } from 'vitest';
import { safeAdminNextPath } from '@/lib/admin/navigation';

describe('safeAdminNextPath', () => {
  it('defaults to the dashboard', () => {
    expect(safeAdminNextPath(null)).toBe('/admin');
    expect(safeAdminNextPath(undefined)).toBe('/admin');
    expect(safeAdminNextPath('')).toBe('/admin');
  });

  it('keeps admin paths with query strings', () => {
    expect(safeAdminNextPath('/admin/events?page=2')).toBe('/admin/events?page=2');
  });

  it('rejects external and protocol-relative paths', () => {
    expect(safeAdminNextPath('https://evil.example/admin')).toBe('/admin');
    expect(safeAdminNextPath('//evil.example/admin')).toBe('/admin');
    expect(safeAdminNextPath('/admin\\evil')).toBe('/admin');
  });

  it('rejects non-admin paths', () => {
    expect(safeAdminNextPath('/events')).toBe('/admin');
    expect(safeAdminNextPath('/')).toBe('/admin');
  });

  it('never redirects back to the login page', () => {
    expect(safeAdminNextPath('/admin/login')).toBe('/admin');
    expect(safeAdminNextPath('/admin/login?next=/admin')).toBe('/admin');
  });
});
