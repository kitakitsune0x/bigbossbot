import SecurityCenter from '@/components/account/SecurityCenter';
import { requirePageSession } from '@/lib/auth/session';
import { listUserApiTokens, listUserSessions } from '@/lib/auth/service';

export default async function SettingsPage() {
  const session = await requirePageSession();
  const [sessions, apiTokens] = await Promise.all([
    listUserSessions(session.userId, session.sessionId),
    listUserApiTokens(session.userId),
  ]);

  return (
    <div className="p-4 lg:p-6">
      <SecurityCenter
        username={session.username}
        sessions={sessions}
        apiTokens={apiTokens}
        hasAuthenticator={session.totpRequired}
      />
    </div>
  );
}
