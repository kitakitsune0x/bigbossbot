import { NextRequest, NextResponse } from 'next/server';
import { adminUserUpdateSchema } from '@/lib/auth/schemas';
import { authorizeAdminApiSession } from '@/lib/auth/session';
import { updateUserByAdmin } from '@/lib/auth/service';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeAdminApiSession();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json().catch(() => null);
  const parsed = adminUserUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid admin update payload.' },
      { status: 400 }
    );
  }

  const { id } = await params;
  const result = await updateUserByAdmin(auth, id, parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
