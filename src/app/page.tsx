import { redirect } from 'next/navigation';
import { AUTH_REQUIRE_2FA } from '@/lib/auth/config';
import { getCurrentSessionContext } from '@/lib/auth/service';

export default async function HomePage() {
  const session = await getCurrentSessionContext();

  if (!session) {
    redirect('/login');
  }

  if (session.status === 'pending_2fa_setup') {
    redirect(AUTH_REQUIRE_2FA ? '/setup-2fa' : '/dashboard');
  }

  if (session.status === 'active') {
    redirect('/dashboard');
  }

  redirect('/login?error=disabled');
}
