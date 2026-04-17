import { NextRequest, NextResponse } from 'next/server';
import { authorizeNetworkApiAccess } from '@/lib/auth/session';
import { fetchIntelNetworkMessages, IntelServiceError, sendIntelNetworkMessage } from '@/lib/intel/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await authorizeNetworkApiAccess('read_network');
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const payload = await fetchIntelNetworkMessages(auth, {
      agentId: request.nextUrl.searchParams.get('agentId') ?? undefined,
      claims: request.nextUrl.searchParams.get('claims') ?? undefined,
      agentToken: request.nextUrl.searchParams.get('agentToken') ?? undefined,
    });

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

export async function POST(request: NextRequest) {
  const auth = await authorizeNetworkApiAccess('use_network');
  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid network message payload.' }, { status: 400 });
  }

  try {
    const payload = await sendIntelNetworkMessage(auth, body);
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
