import { NextRequest, NextResponse } from 'next/server';
import { authorizeReadApiAccess } from '@/lib/auth/session';
import { IntelGatewayError, getIntelFeedPayload } from '@/lib/intel/gateway';
import { getWorkspaceFromRequest } from '@/lib/workspaces';

type RouteParams = {
  params: Promise<{ feed: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseLimit(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('limit');
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const workspace = getWorkspaceFromRequest(request);
  const { feed } = await params;

  try {
    const payload = await getIntelFeedPayload({
      request,
      auth,
      feed,
      workspace,
      limit: parseLimit(request),
    });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'x-bigboss-workspace': workspace,
        'x-bigboss-legacy-theater': '',
      },
    });
  } catch (error) {
    if (error instanceof IntelGatewayError) {
      return NextResponse.json({ error: error.message, detail: error.detail }, { status: error.status });
    }

    throw error;
  }
}
