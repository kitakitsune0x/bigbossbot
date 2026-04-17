import { NextResponse } from 'next/server';
import { authorizeReadApiAccess } from '@/lib/auth/session';
import { getVisibleWorkspaces } from '@/lib/intel/gateway';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) {
    return auth;
  }

  return NextResponse.json({
    workspaces: getVisibleWorkspaces(auth),
    fetchedAt: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}
