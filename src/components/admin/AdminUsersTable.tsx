'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUserSummary } from '@/types/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type AdminUsersTableProps = {
  currentUserId: string;
  users: AdminUserSummary[];
};

type ActionState = {
  message?: string;
  temporaryPassword?: string;
  error?: string;
};

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? 'Request failed');
  return json;
}

export default function AdminUsersTable({ currentUserId, users }: AdminUsersTableProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Record<string, ActionState>>({});
  const [isPending, startTransition] = useTransition();

  function setMessage(userId: string, next: ActionState) {
    setStatus((c) => ({ ...c, [userId]: next }));
  }

  function runAction(userId: string, action: () => Promise<void>) {
    startTransition(async () => {
      try { await action(); router.refresh(); }
      catch (e) { setMessage(userId, { error: e instanceof Error ? e.message : 'Failed' }); }
    });
  }

  function formatDate(v: string | null) { return v ? new Date(v).toLocaleDateString() : '—'; }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Manage roles, credentials, and access.</p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{users.length} total</span>
      </div>

      {users.map((user) => {
        const s = status[user.id];
        return (
          <section key={user.id} className="border border-border rounded">
            <div className="border-b border-border px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold">{user.username}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{user.role}</span>
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${user.status === 'disabled' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {user.status.replace(/_/g, ' ')}
                </span>
                {user.id === currentUserId && <span className="text-[9px] font-semibold uppercase tracking-wider text-primary">you</span>}
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                Created {formatDate(user.createdAt)} · Login {formatDate(user.lastLoginAt)} · {user.activeSessionCount} sess
              </p>
            </div>
            <div className="px-4 py-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => runAction(user.id, async () => {
                  await requestJson(`/api/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ role: user.role === 'admin' ? 'member' : 'admin' }) });
                  setMessage(user.id, { message: `→ ${user.role === 'admin' ? 'member' : 'admin'}` });
                })}>{user.role === 'admin' ? 'Demote' : 'Promote'}</Button>

                <Button size="sm" variant={user.status === 'disabled' ? 'secondary' : 'destructive'} disabled={isPending} onClick={() => runAction(user.id, async () => {
                  await requestJson(`/api/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status: user.status === 'disabled' ? 'active' : 'disabled' }) });
                  setMessage(user.id, { message: user.status === 'disabled' ? 'Enabled' : 'Disabled' });
                })}>{user.status === 'disabled' ? 'Enable' : 'Disable'}</Button>

                <Button size="sm" variant="outline" disabled={isPending} onClick={() => runAction(user.id, async () => {
                  const r = await requestJson(`/api/admin/users/${user.id}/reset-password`, { method: 'POST', body: '{}' });
                  setMessage(user.id, { message: 'Password reset', temporaryPassword: r.temporaryPassword });
                })}>Reset pw</Button>

                <Button size="sm" variant="outline" disabled={isPending} onClick={() => runAction(user.id, async () => {
                  await requestJson(`/api/admin/users/${user.id}/reset-2fa`, { method: 'POST', body: '{}' });
                  setMessage(user.id, { message: '2FA reset' });
                })}>Reset 2FA</Button>

                <Button size="sm" variant="secondary" disabled={isPending} onClick={() => runAction(user.id, async () => {
                  await requestJson(`/api/admin/users/${user.id}/revoke-sessions`, { method: 'POST', body: '{}' });
                  setMessage(user.id, { message: 'Sessions revoked' });
                })}>Revoke</Button>
              </div>

              {s?.message && <Alert tone="success"><AlertDescription>{s.message}</AlertDescription></Alert>}
              {s?.error && <Alert tone="destructive"><AlertDescription>{s.error}</AlertDescription></Alert>}
              {s?.temporaryPassword && (
                <Alert tone="warning">
                  <AlertDescription>
                    <span className="text-[10px] font-medium">Temp password: </span>
                    <span className="font-mono text-xs">{s.temporaryPassword}</span>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
