import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SERVICE_UNAVAILABLE_MESSAGE } from '@/lib/auth/config';
import { signupSchema } from '@/lib/auth/schemas';
import { registerUser } from '@/lib/auth/service';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid sign-up payload.' },
      { status: 400 }
    );
  }

  const result = await registerUser(parsed.data.username, parsed.data.password);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.message === AUTH_SERVICE_UNAVAILABLE_MESSAGE ? 503 : 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    nextPath: result.nextPath,
  });
}
