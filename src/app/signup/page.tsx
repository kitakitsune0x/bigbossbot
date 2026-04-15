import { redirect } from 'next/navigation';
import SignupForm from '@/components/auth/SignupForm';
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
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              AW
            </div>
            <span className="text-sm font-semibold tracking-wider">AWARE</span>
          </div>
          <h1 className="text-lg font-semibold mt-4">Create account</h1>
          <p className="text-sm text-muted-foreground">
            Register for AWARE. 2FA setup required before dashboard access.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
