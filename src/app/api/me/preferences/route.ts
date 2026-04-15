import { NextRequest, NextResponse } from 'next/server';
import { preferencesPatchSchema } from '@/lib/auth/schemas';
import { authorizeApiSession } from '@/lib/auth/session';
import { getOrCreateUserPreferences, updateUserPreferences } from '@/lib/auth/service';

export async function GET() {
  const auth = await authorizeApiSession();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const preferences = await getOrCreateUserPreferences(auth.userId);

  return NextResponse.json({
    user: {
      userId: auth.userId,
      username: auth.username,
      role: auth.role,
    },
    preferences,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeApiSession();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json().catch(() => null);
  const parsed = preferencesPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid preferences payload.' },
      { status: 400 }
    );
  }

  const preferences = await updateUserPreferences(auth.userId, parsed.data);

  return NextResponse.json({ preferences });
}
