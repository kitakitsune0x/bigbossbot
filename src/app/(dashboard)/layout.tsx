import { redirect } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { AUTH_REQUIRE_2FA } from '@/lib/auth/config';
import { getOptionalPageSession } from '@/lib/auth/session';
import { getOrCreateUserPreferences } from '@/lib/auth/service';
import { createDefaultUserPreferences } from '@/types/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOptionalPageSession();

  if (session?.status === 'pending_2fa_setup' && AUTH_REQUIRE_2FA) {
    redirect('/setup-2fa');
  }

  const viewer = session && session.status !== 'disabled'
    ? {
        username: session.username,
        role: session.role,
      }
    : null;
  const preferences =
    viewer && session
      ? await getOrCreateUserPreferences(session.userId)
      : createDefaultUserPreferences();

  return (
    <DashboardShell
      viewer={viewer}
      initialPreferences={preferences}
    >
      {children}
    </DashboardShell>
  );
}
