import { NextRequest, NextResponse } from 'next/server';
import { authorizeNetworkApiAccess } from '@/lib/auth/session';
import { actorIsAdmin } from '@/lib/intel/gateway';
import {
  fetchIntelNetworkSettings,
  IntelServiceError,
  updateIntelNetworkSettings,
} from '@/lib/intel/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = await authorizeNetworkApiAccess('read_network');
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (!actorIsAdmin(auth)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await fetchIntelNetworkSettings(auth);
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

export async function PUT(request: NextRequest) {
  const auth = await authorizeNetworkApiAccess('use_network');
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (!actorIsAdmin(auth)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
  }

  try {
    const payload = await updateIntelNetworkSettings(auth, body);
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
