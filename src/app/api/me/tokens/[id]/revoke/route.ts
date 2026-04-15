import { NextResponse } from 'next/server';
import { authorizeApiSession } from '@/lib/auth/session';
import { revokeUserApiToken } from '@/lib/auth/service';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await authorizeApiSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;
  const result = await revokeUserApiToken(session.userId, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    revokedAt: new Date().toISOString(),
  });
}
