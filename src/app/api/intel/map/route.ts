import { NextRequest, NextResponse } from 'next/server';
import { authorizeReadApiAccess } from '@/lib/auth/session';
import { IntelGatewayError, getIntelMapPayload } from '@/lib/intel/gateway';
import { getWorkspaceFromRequest } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const workspace = getWorkspaceFromRequest(request);

  try {
    const payload = await getIntelMapPayload({
      auth,
      workspace,
    });

    return NextResponse.json({
      ...((payload && typeof payload === 'object' && !Array.isArray(payload)) ? payload : { entities: payload }),
      workspace,
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
