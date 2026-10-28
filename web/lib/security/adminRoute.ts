import { isAdminUser, type UserLike } from '@/lib/security/auth';
import { supabase } from '@/lib/supabase';
import {
  isCookieAuthenticatedMutationAllowed,
  resolveAdminAccessCredential,
} from '@/lib/security/adminCookies';

const ADMIN_AUTH_TIMEOUT_MS = 8_000;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('admin_auth_timeout')), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getAuthenticatedAdmin(request: Request): Promise<UserLike | null> {
  const credential = resolveAdminAccessCredential(request);
  if (!credential.token) return null;

  // Cookie-authenticated mutations must come from this application. Bearer
  // clients are unaffected because they do not rely on ambient credentials.
  if (!isCookieAuthenticatedMutationAllowed(request, credential)) return null;

  try {
    const { data, error } = await withTimeout(
      supabase.auth.getUser(credential.token),
      ADMIN_AUTH_TIMEOUT_MS,
    );
    if (error || !isAdminUser(data.user)) return null;
    return data.user;
  } catch {
    return null;
  }
}
