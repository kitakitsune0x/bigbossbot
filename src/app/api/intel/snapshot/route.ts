import { NextRequest, NextResponse } from 'next/server';
import { authorizeReadApiAccess } from '@/lib/auth/session';
import { IntelGatewayError, getIntelSnapshotPayload } from '@/lib/intel/gateway';
import { getWorkspaceFromRequest } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseInclude(request: NextRequest) {
  const repeated = request.nextUrl.searchParams.getAll('include');
  if (repeated.length > 0) {
    return repeated.flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
  }

  const single = request.nextUrl.searchParams.get('include');
  if (!single) {
    return undefined;
  }

  return single.split(',').map((value) => value.trim()).filter(Boolean);
}

export async function GET(request: NextRequest) {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const workspace = getWorkspaceFromRequest(request);

  try {
    const payload = await getIntelSnapshotPayload({
      request,
      auth,
      workspace,
      include: parseInclude(request),
    });

    return NextResponse.json({
      ...payload,
      legacyTheater: null,
    }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    if (error instanceof IntelGatewayError) {
      return NextResponse.json({ error: error.message, detail: error.detail }, { status: error.status });
    }

    throw error;
  }
}
