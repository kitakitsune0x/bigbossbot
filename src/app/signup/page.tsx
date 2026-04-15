import { redirect } from 'next/navigation';
import SignupForm from '@/components/auth/SignupForm';
import BrandLogo from '@/components/layout/BrandLogo';
import { APP_NAME } from '@/lib/auth/config';
import { getCurrentSessionContext } from '@/lib/auth/service';

export default async function SignupPage() {
  const session = await getCurrentSessionContext();

  if (session?.status === 'active') {
    redirect('/dashboard');
  }

  if (session?.status === 'pending_2fa_setup') {
    redirect('/setup-2fa');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-6 w-6 rounded-md" priority />
            <span className="text-sm font-semibold tracking-wider">{APP_NAME}</span>
          </div>
          <h1 className="text-lg font-semibold mt-4">Create account</h1>
          <p className="text-sm text-muted-foreground">
            Register for {APP_NAME}. 2FA setup required before dashboard access.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
