'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  changePasswordAction,
  regenerateRecoveryCodesAction,
  revokeOtherSessionsAction,
  type FormState,
} from '@/app/actions/auth';
import type { UserSessionSummary } from '@/types/auth';
import FormSubmitButton from '@/components/auth/FormSubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SecurityCenterProps = {
  username: string;
  sessions: UserSessionSummary[];
};

const EMPTY_STATE: FormState = {};

export default function SecurityCenter({ username, sessions }: SecurityCenterProps) {
  const router = useRouter();
  const [passwordState, passwordAction] = useActionState<FormState, FormData>(changePasswordAction, EMPTY_STATE);
  const [recoveryState, recoveryAction] = useActionState<FormState, FormData>(regenerateRecoveryCodesAction, EMPTY_STATE);
  const [sessionState, revokeSessionsAction] = useActionState<FormState, FormData>(revokeOtherSessionsAction, EMPTY_STATE);

  useEffect(() => {
    if (passwordState.success || recoveryState.success || sessionState.success) router.refresh();
  }, [passwordState.success, recoveryState.success, sessionState.success, router]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Security — {username}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage credentials, recovery codes, and active sessions.
        </p>
      </div>

      {/* Change password */}
      <section className="border border-border rounded">
        <div className="border-b border-border px-4 py-2">
          <h3 className="text-[13px] font-semibold">Change password</h3>
        </div>
        <div className="px-4 py-3 space-y-3">
          {passwordState.error && <Alert tone="destructive"><AlertDescription>{passwordState.error}</AlertDescription></Alert>}
          {passwordState.success && <Alert tone="success"><AlertDescription>{passwordState.success}</AlertDescription></Alert>}
          <form action={passwordAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs">Current password</Label>
              <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs">New password</Label>
              <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs">Confirm</Label>
              <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required />
            </div>
            <FormSubmitButton label="Update" pendingLabel="Updating…" fullWidth={false} />
          </form>
        </div>
      </section>

      {/* Recovery codes */}
      <section className="border border-border rounded">
        <div className="border-b border-border px-4 py-2">
          <h3 className="text-[13px] font-semibold">Recovery codes</h3>
        </div>
        <div className="px-4 py-3 space-y-3">
          {recoveryState.error && <Alert tone="destructive"><AlertDescription>{recoveryState.error}</AlertDescription></Alert>}
          {recoveryState.success && <Alert tone="success"><AlertDescription>{recoveryState.success}</AlertDescription></Alert>}
          <form action={recoveryAction}>
            <FormSubmitButton label="Generate new codes" pendingLabel="Generating…" fullWidth={false} variant="outline" />
          </form>
          {recoveryState.recoveryCodes && (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {recoveryState.recoveryCodes.map((code) => (
                <div key={code} className="border border-border px-3 py-1.5 font-mono text-xs rounded">{code}</div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sessions */}
      <section className="border border-border rounded">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <h3 className="text-[13px] font-semibold">Active sessions</h3>
          <form action={revokeSessionsAction}>
            <FormSubmitButton label="Revoke others" pendingLabel="Revoking…" fullWidth={false} size="sm" variant="outline" />
          </form>
        </div>
        <div className="px-4 py-3 space-y-2">
          {sessionState.success && <Alert tone="success"><AlertDescription>{sessionState.success}</AlertDescription></Alert>}
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between border border-border rounded px-3 py-2">
              <div>
                <p className="text-[13px] font-medium">
                  {session.current ? 'Current session' : 'Active session'}
                  {session.current && <span className="ml-2 text-[9px] font-semibold uppercase text-primary">current</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {session.userAgent ?? 'Unknown device'}{session.ipAddress ? ` · ${session.ipAddress}` : ''}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {new Date(session.expiresAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
