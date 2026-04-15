import { NextResponse } from 'next/server';
import { authorizeAdminApiSession } from '@/lib/auth/session';
import { getAdminUsers } from '@/lib/auth/service';

export async function GET() {
  const auth = await authorizeAdminApiSession();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const users = await getAdminUsers();
  return NextResponse.json({ users });
}
