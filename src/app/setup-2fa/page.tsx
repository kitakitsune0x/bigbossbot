import { redirect } from 'next/navigation';
import SetupTwoFactorForm from '@/components/auth/SetupTwoFactorForm';
import { requirePageSession } from '@/lib/auth/session';
import { getOrCreateTotpSetup } from '@/lib/auth/service';

export default async function SetupTwoFactorPage() {
  const session = await requirePageSession({ allowPendingSetup: true });

  if (session.status === 'active') {
    redirect('/dashboard');
  }

  const setup = await getOrCreateTotpSetup(session.userId);

  if (setup.alreadyConfigured) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              AW
            </div>
            <span className="text-sm font-semibold tracking-wider">AWARE</span>
          </div>
          <h1 className="text-lg font-semibold mt-4">Two-factor setup</h1>
          <p className="text-sm text-muted-foreground">
            Scan the QR code with your authenticator app.
          </p>
        </div>
        <SetupTwoFactorForm
          username={setup.username}
          secretBase32={setup.secretBase32}
          qrCodeDataUrl={setup.qrCodeDataUrl}
        />
      </div>
    </div>
  );
}
