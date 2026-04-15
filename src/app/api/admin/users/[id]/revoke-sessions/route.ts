import { NextResponse } from 'next/server';
import { authorizeAdminApiSession } from '@/lib/auth/session';
import { revokeSessionsByAdmin } from '@/lib/auth/service';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteParams) {
  const auth = await authorizeAdminApiSession();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const result = await revokeSessionsByAdmin(auth, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
