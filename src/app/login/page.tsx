import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import BrandLogo from '@/components/layout/BrandLogo';
import { APP_NAME, AUTH_REQUIRE_2FA } from '@/lib/auth/config';
import { getCurrentSessionContext } from '@/lib/auth/service';

export default async function LoginPage() {
  const session = await getCurrentSessionContext();

  if (session?.status === 'active') {
    redirect('/dashboard');
  }

  if (session?.status === 'pending_2fa_setup') {
    redirect(AUTH_REQUIRE_2FA ? '/setup-2fa' : '/dashboard');
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden border-r border-border/60 bg-muted/40 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-foreground">
          <BrandLogo className="size-10 rounded-xl border border-border bg-background p-1.5 shadow-sm" priority />
          <span>{APP_NAME}</span>
        </div>

        <div className="flex max-w-lg flex-col gap-8">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Secure command center
            </p>
            <div className="flex flex-col gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                Monitor live intelligence, alerts, and markets from one authenticated workspace.
              </h1>
              <p className="max-w-md text-sm leading-7 text-muted-foreground">
                Review conflict activity, theater-specific feeds, and operational dashboards behind a single
                protected sign-in.
              </p>
            </div>
          </div>

          <blockquote className="max-w-md border-l border-border pl-4 text-sm leading-7 text-muted-foreground">
            Built for operators who need fast context, clean signal, and a secure path into the dashboard.
          </blockquote>
        </div>

        <div className="grid max-w-xl grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/70 bg-background/90 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Access</p>
            <p className="mt-2 text-sm font-medium text-foreground">Private user sessions</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/90 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Coverage</p>
            <p className="mt-2 text-sm font-medium text-foreground">Middle East and Ukraine theaters</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/90 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signal</p>
            <p className="mt-2 text-sm font-medium text-foreground">Live feeds, alerts, and map intel</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandLogo className="size-10 rounded-xl border border-border bg-background p-1.5 shadow-sm" priority />
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Secure access</span>
              <span className="text-sm font-semibold text-foreground">{APP_NAME}</span>
            </div>
          </div>

          <LoginForm />
        </div>
      </section>
    </div>
  );
}
