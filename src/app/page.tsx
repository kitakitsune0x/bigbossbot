import { redirect } from 'next/navigation';
import { getCurrentSessionContext } from '@/lib/auth/service';

export default async function HomePage() {
  const session = await getCurrentSessionContext();

  if (!session) {
    redirect('/login');
  }

  if (session.status === 'pending_2fa_setup') {
    redirect('/setup-2fa');
  }

  if (session.status === 'active') {
    redirect('/dashboard');
  }

  redirect('/login?error=disabled');
}
