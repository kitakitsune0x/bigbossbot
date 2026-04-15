import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SERVICE_UNAVAILABLE_MESSAGE } from '@/lib/auth/config';
import { loginSchema } from '@/lib/auth/schemas';
import { startLogin } from '@/lib/auth/service';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid login payload.' },
      { status: 400 }
    );
  }

  const result = await startLogin(parsed.data.username, parsed.data.password);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.message === AUTH_SERVICE_UNAVAILABLE_MESSAGE ? 503 : 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    requiresTwoFactor: result.requiresTwoFactor ?? false,
    pendingSetup: result.pendingSetup ?? false,
    nextPath: result.nextPath ?? null,
  });
}
