import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_REQUIRE_2FA } from '@/lib/auth/config';
import { getApiTokenAccessContext, getCurrentSessionContext, type ApiTokenAccessContext } from '@/lib/auth/service';
import type { SessionContext } from '@/types/auth';

// React cache() deduplicates within a single server render pass.
// Layout + page calling requirePageSession() will only hit the DB once.
const getSession = cache(() => getCurrentSessionContext());

export type ReadApiAccessContext = SessionContext | ApiTokenAccessContext;

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

  if (!options?.allowPendingSetup && AUTH_REQUIRE_2FA && session.status === 'pending_2fa_setup') {
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

  if (AUTH_REQUIRE_2FA && session.status !== 'active') {
    return NextResponse.json({ error: 'Two-factor setup required' }, { status: 403 });
  }

  return session;
}

export async function authorizeReadApiAccess(): Promise<ReadApiAccessContext | NextResponse> {
  const headerList = await headers();
  const authorization = headerList.get('authorization')?.trim();

  if (authorization) {
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawToken = authorization.slice('Bearer '.length).trim();
    if (!rawToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokenContext = await getApiTokenAccessContext(rawToken);
    if (!tokenContext) {
      return NextResponse.json({ error: 'Invalid or revoked API token' }, { status: 401 });
    }

    return tokenContext;
  }

  return authorizeApiSession();
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
