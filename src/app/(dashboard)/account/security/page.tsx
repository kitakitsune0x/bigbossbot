import { redirect } from 'next/navigation';

export default function LegacySecurityPage() {
  redirect('/account/settings');
}
