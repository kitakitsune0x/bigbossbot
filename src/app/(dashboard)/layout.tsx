import DashboardShell from '@/components/layout/DashboardShell';
import { requirePageSession } from '@/lib/auth/session';
import { getOrCreateUserPreferences } from '@/lib/auth/service';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageSession();
  const preferences = await getOrCreateUserPreferences(session.userId);

  return (
    <DashboardShell
      username={session.username}
      role={session.role}
      initialPreferences={preferences}
    >
      {children}
    </DashboardShell>
  );
}
