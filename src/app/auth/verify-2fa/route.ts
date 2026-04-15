import { NextRequest, NextResponse } from 'next/server';
import { verifyTwoFactorSchema } from '@/lib/auth/schemas';
import { verifyLoginSecondFactor } from '@/lib/auth/service';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = verifyTwoFactorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid two-factor payload.' },
      { status: 400 }
    );
  }

  const result = await verifyLoginSecondFactor(parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    nextPath: result.nextPath,
  });
}
