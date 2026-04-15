import { cache } from 'react';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getCurrentSessionContext } from '@/lib/auth/service';

// React cache() deduplicates within a single server render pass.
// Layout + page calling requirePageSession() will only hit the DB once.
const getSession = cache(() => getCurrentSessionContext());

export async function requirePageSession(options?: {
  allowPendingSetup?: boolean;
  requireAdmin?: boolean;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.status === 'disabled') {
    redirect('/login?error=disabled');
  }

  if (!options?.allowPendingSetup && session.status === 'pending_2fa_setup') {
    redirect('/setup-2fa');
  }

  if (options?.requireAdmin && session.role !== 'admin') {
    redirect('/dashboard');
  }

  return session;
}

export async function authorizeApiSession() {
  const session = await getCurrentSessionContext();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.status === 'disabled') {
    return NextResponse.json({ error: 'Account disabled' }, { status: 403 });
  }

  if (session.status !== 'active') {
    return NextResponse.json({ error: 'Two-factor setup required' }, { status: 403 });
  }

  return session;
}

export async function authorizeAdminApiSession() {
  const session = await authorizeApiSession();

  if (session instanceof NextResponse) {
    return session;
  }

  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return session;
}
