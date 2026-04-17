import { NextRequest, NextResponse } from 'next/server';
import { authorizeNetworkApiAccess } from '@/lib/auth/session';
import {
  deleteIntelNetworkContact,
  IntelServiceError,
  upsertIntelNetworkContact,
} from '@/lib/intel/service';

type RouteParams = {
  params: Promise<{ peerId: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeNetworkApiAccess('use_network');
  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid contact payload.' }, { status: 400 });
  }

  const { peerId } = await params;

  try {
    const payload = await upsertIntelNetworkContact(auth, peerId, body);
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

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeNetworkApiAccess('use_network');
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { peerId } = await params;

  try {
    const payload = await deleteIntelNetworkContact(auth, peerId);
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
