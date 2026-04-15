'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type FormState, verifyTwoFactorAction } from '@/app/actions/auth';
import FormSubmitButton from '@/components/auth/FormSubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const INITIAL_STATE: FormState = {
  step: 'credentials',
};

export default function LoginForm() {
  const [loginState, loginFormAction] = useActionState(loginAction, INITIAL_STATE);
  const [verifyState, verifyFormAction] = useActionState<FormState, FormData>(verifyTwoFactorAction, {});
  const showVerifyStep = loginState.step === 'verify' || verifyState.step === 'verify';
  const activeMessage = verifyState.error ?? verifyState.success ?? loginState.error ?? loginState.success;
  const hasError = Boolean(verifyState.error ?? loginState.error);

  return (
    <div className="space-y-4">
      {activeMessage && (
        <Alert tone={hasError ? 'destructive' : 'success'}>
          <AlertDescription>{activeMessage}</AlertDescription>
        </Alert>
      )}

      {!showVerifyStep ? (
        <form action={loginFormAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs">Username</Label>
            <Input id="username" name="username" autoComplete="username" placeholder="ops_lead" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <FormSubmitButton label="Sign in" pendingLabel="Signing in…" />
        </form>
      ) : (
        <form action={verifyFormAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-xs">Authenticator code</Label>
            <Input id="code" name="code" inputMode="numeric" pattern="[0-9]*" maxLength={6} className="font-mono tracking-widest" placeholder="123456" />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex-1 h-px bg-border" />
            <span>or recovery code</span>
            <span className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recovery-code" className="text-xs">Recovery code</Label>
            <Input id="recovery-code" name="recoveryCode" className="font-mono uppercase tracking-widest" placeholder="ABCDEF-123456" />
          </div>
          <FormSubmitButton label="Verify" pendingLabel="Verifying…" />
        </form>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Need an account?{' '}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">Create one</Link>
      </p>
    </div>
  );
}
