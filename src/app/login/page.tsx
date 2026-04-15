import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { APP_MONOGRAM, APP_NAME } from '@/lib/auth/config';
import { getCurrentSessionContext } from '@/lib/auth/service';

export default async function LoginPage() {
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
              {APP_MONOGRAM}
            </div>
            <span className="text-sm font-semibold tracking-wider">{APP_NAME}</span>
          </div>
          <h1 className="text-lg font-semibold mt-4">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Enter credentials to access the command center.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
