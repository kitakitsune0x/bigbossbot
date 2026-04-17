import { NextRequest, NextResponse } from 'next/server';
import { authorizeNetworkApiAccess } from '@/lib/auth/session';
import { actorIsAdmin } from '@/lib/intel/gateway';
import { controlIntelNetwork, IntelServiceError } from '@/lib/intel/service';

type RouteParams = {
  params: Promise<{ action: string }>;
};

const ALLOWED_ACTIONS = new Set(['connect', 'disconnect', 'restart']);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeNetworkApiAccess('use_network');
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (!actorIsAdmin(auth)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { action } = await params;
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Unsupported control action.' }, { status: 400 });
  }

  try {
    const payload = await controlIntelNetwork(auth, action);
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
