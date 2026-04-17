import { NextRequest, NextResponse } from 'next/server';
import { authorizeReadApiAccess } from '@/lib/auth/session';
import { fetchIntelServiceFeed, IntelServiceError } from '@/lib/intel/service';
import { getWorkspaceFromRequest } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const payload = await fetchIntelServiceFeed('news', getWorkspaceFromRequest(request), auth);
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    if (error instanceof IntelServiceError) {
      return NextResponse.json({ error: error.message, detail: error.detail }, { status: error.status });
    }

    throw error;
  }
}
