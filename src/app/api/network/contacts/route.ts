import { NextResponse } from 'next/server';
import { authorizeNetworkApiAccess } from '@/lib/auth/session';
import { fetchIntelNetworkContacts, IntelServiceError } from '@/lib/intel/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = await authorizeNetworkApiAccess('read_network');
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const payload = await fetchIntelNetworkContacts(auth);
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
