import AdminUsersTable from '@/components/admin/AdminUsersTable';
import { requirePageSession } from '@/lib/auth/session';
import { getAdminUsers } from '@/lib/auth/service';

export default async function AdminUsersPage() {
  const session = await requirePageSession({ requireAdmin: true });
  const users = await getAdminUsers();

  return (
    <div className="p-4 lg:p-6">
      <AdminUsersTable currentUserId={session.userId} users={users} />
    </div>
  );
}
