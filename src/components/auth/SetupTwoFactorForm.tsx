'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { setupTotpAction, type FormState } from '@/app/actions/auth';
import FormSubmitButton from '@/components/auth/FormSubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SetupTwoFactorFormProps = {
  username: string;
  secretBase32: string;
  qrCodeDataUrl: string;
  continueHref?: string;
};

export default function SetupTwoFactorForm({
  username,
  secretBase32,
  qrCodeDataUrl,
  continueHref = '/dashboard',
}: SetupTwoFactorFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(setupTotpAction, {});

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div className="flex items-center justify-center rounded border border-border bg-white p-3">
          <img src={qrCodeDataUrl} alt="QR code" className="h-auto w-full max-w-[140px]" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Manual key</p>
          <p className="break-all font-mono text-xs leading-relaxed">{secretBase32}</p>
        </div>
      </div>

      {state.error && (
        <Alert tone="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
      )}

      {!state.recoveryCodes ? (
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="setup-code" className="text-xs">Authenticator code</Label>
            <Input id="setup-code" name="code" inputMode="numeric" pattern="[0-9]*" maxLength={6} className="font-mono tracking-widest" placeholder="123456" required />
          </div>
          <FormSubmitButton label="Verify and activate" pendingLabel="Verifying…" />
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Recovery codes</p>
            <p className="text-xs text-muted-foreground mt-1">
              Save these. Each works once if you lose your device.
            </p>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {state.recoveryCodes.map((code) => (
              <div key={code} className="rounded border border-border px-3 py-1.5 font-mono text-xs">
                {code}
              </div>
            ))}
          </div>
          <Link
            href={continueHref}
            className="inline-flex h-9 w-full items-center justify-center rounded bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Continue
          </Link>
        </div>
      )}
    </div>
  );
}
