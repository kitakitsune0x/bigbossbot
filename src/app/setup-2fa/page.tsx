import { redirect } from 'next/navigation';
import SetupTwoFactorForm from '@/components/auth/SetupTwoFactorForm';
import BrandLogo from '@/components/layout/BrandLogo';
import { APP_NAME } from '@/lib/auth/config';
import { requirePageSession } from '@/lib/auth/session';
import { getOrCreateTotpSetup } from '@/lib/auth/service';

export default async function SetupTwoFactorPage() {
  const session = await requirePageSession({ allowPendingSetup: true });
  const continueHref = session.status === 'active' ? '/account/settings' : '/dashboard';

  const setup = await getOrCreateTotpSetup(session.userId);

  if (setup.alreadyConfigured) {
    redirect(continueHref);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-6 w-6 rounded-md" priority />
            <span className="text-sm font-semibold tracking-wider">{APP_NAME}</span>
          </div>
          <h1 className="text-lg font-semibold mt-4">Two-factor setup</h1>
          <p className="text-sm text-muted-foreground">
            Scan the QR code with your authenticator app to enable sign-in verification.
          </p>
        </div>
        <SetupTwoFactorForm
          username={setup.username}
          secretBase32={setup.secretBase32}
          qrCodeDataUrl={setup.qrCodeDataUrl}
          continueHref={continueHref}
        />
      </div>
    </div>
  );
}
