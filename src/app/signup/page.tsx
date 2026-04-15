import { redirect } from 'next/navigation';
import SignupForm from '@/components/auth/SignupForm';
import BrandLogo from '@/components/layout/BrandLogo';
import { APP_NAME, AUTH_REQUIRE_2FA } from '@/lib/auth/config';
import { getOptionalPageSession } from '@/lib/auth/session';

export default async function SignupPage() {
  const session = await getOptionalPageSession();

  if (session?.status === 'active') {
    redirect('/dashboard');
  }

  if (session?.status === 'pending_2fa_setup') {
    redirect(AUTH_REQUIRE_2FA ? '/setup-2fa' : '/dashboard');
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
            Register for {APP_NAME}.{' '}
            {AUTH_REQUIRE_2FA
              ? 'Authenticator setup is required before dashboard access.'
              : 'Authenticator setup is optional and can be enabled after sign-in.'}
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
