'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type FormState, verifyTwoFactorAction } from '@/app/actions/auth';
import FormSubmitButton from '@/components/auth/FormSubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { APP_NAME } from '@/lib/auth/config';

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {showVerifyStep ? 'Verify your sign-in' : `Sign in to ${APP_NAME}`}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {showVerifyStep
            ? 'Enter an authenticator code or a recovery code to continue into the command center.'
            : 'Enter your username and password to access your dashboard.'}
        </p>
      </div>

      {activeMessage && (
        <Alert tone={hasError ? 'destructive' : 'success'}>
          <AlertDescription>{activeMessage}</AlertDescription>
        </Alert>
      )}

      {!showVerifyStep ? (
        <form action={loginFormAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username" className="text-xs">Username</Label>
            <Input id="username" name="username" autoComplete="username" placeholder="ops_lead" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <FormSubmitButton label="Sign in" pendingLabel="Signing in…" />
        </form>
      ) : (
        <form action={verifyFormAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code" className="text-xs">Authenticator code</Label>
            <Input id="code" name="code" inputMode="numeric" pattern="[0-9]*" maxLength={6} className="font-mono tracking-widest" placeholder="123456" />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                or recovery code
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="recovery-code" className="text-xs">Recovery code</Label>
            <Input id="recovery-code" name="recoveryCode" className="font-mono uppercase tracking-widest" placeholder="ABCDEF-123456" />
          </div>
          <FormSubmitButton label="Verify" pendingLabel="Verifying…" />
        </form>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            {showVerifyStep ? 'switch flow' : 'need access'}
          </span>
        </div>
      </div>

      {showVerifyStep ? (
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Start over</Link>
        </Button>
      ) : (
        <Button asChild variant="outline" className="w-full">
          <Link href="/signup">Create account</Link>
        </Button>
      )}

      <p className="text-center text-xs leading-5 text-muted-foreground">
        Protected access for live intelligence, theater monitoring, and operational alerts.
      </p>
    </div>
  );
}
