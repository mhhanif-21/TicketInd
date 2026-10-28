import { NextResponse } from 'next/server';
import {
  clearAdminSessionCookies,
  isCookieAuthenticatedMutationAllowed,
  resolveAdminAccessCredential,
} from '@/lib/security/adminCookies';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const credential = resolveAdminAccessCredential(request);
  if (!isCookieAuthenticatedMutationAllowed(request, credential)) {
    return NextResponse.json(
      { status: 'error', message: 'Invalid request origin' },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    status: 'success',
    message: 'Logged out',
  });
  clearAdminSessionCookies(response);
  return response;
}
