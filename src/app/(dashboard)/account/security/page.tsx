import SecurityCenter from '@/components/account/SecurityCenter';
import { requirePageSession } from '@/lib/auth/session';
import { listUserSessions } from '@/lib/auth/service';

export default async function SecurityPage() {
  const session = await requirePageSession();
  const sessions = await listUserSessions(session.userId, session.sessionId);

  return (
    <div className="p-4 lg:p-6">
      <SecurityCenter username={session.username} sessions={sessions} />
    </div>
  );
}
