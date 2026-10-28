export function safeAdminNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/admin')) return '/admin';
  if (value.startsWith('//') || value.includes('\\')) return '/admin';
  if (value === '/admin/login' || value.startsWith('/admin/login?') || value.startsWith('/admin/login#')) {
    return '/admin';
  }
  return value;
}
