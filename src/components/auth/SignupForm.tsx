'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signupAction, type FormState } from '@/app/actions/auth';
import FormSubmitButton from '@/components/auth/FormSubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupForm() {
  const [state, formAction] = useActionState<FormState, FormData>(signupAction, {});

  return (
    <div className="space-y-4">
      {state.error && (
        <Alert tone="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="signup-username" className="text-xs">Username</Label>
          <Input id="signup-username" name="username" autoComplete="username" placeholder="intel_bridge" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-password" className="text-xs">Password</Label>
          <Input id="signup-password" name="password" type="password" autoComplete="new-password" placeholder="At least 10 characters" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-confirm-password" className="text-xs">Confirm password</Label>
          <Input id="signup-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required />
        </div>
        <FormSubmitButton label="Create account" pendingLabel="Creating…" />
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Already registered?{' '}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
