import { NextResponse } from 'next/server';
import { authorizeApiSession } from '@/lib/auth/session';
import { createUserApiToken, listUserApiTokens } from '@/lib/auth/service';
import { apiTokenCreateSchema } from '@/lib/auth/schemas';

export async function GET() {
  const session = await authorizeApiSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const tokens = await listUserApiTokens(session.userId);
  return NextResponse.json({ tokens });
}

export async function POST(request: Request) {
  const session = await authorizeApiSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const payload = await request.json().catch(() => null);
  const parsed = apiTokenCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid token request.' },
      { status: 400 },
    );
  }

  const result = await createUserApiToken(session.userId, parsed.data.name);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      apiToken: result.apiToken,
      token: result.token,
    },
    { status: 201 },
  );
}
