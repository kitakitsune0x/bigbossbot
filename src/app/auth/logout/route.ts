import { NextResponse } from 'next/server';
import { revokeCurrentSession } from '@/lib/auth/service';

export async function POST() {
  await revokeCurrentSession();
  return NextResponse.json({ ok: true });
}
