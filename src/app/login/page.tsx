import Image from 'next/image';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import BrandLogo from '@/components/layout/BrandLogo';
import { APP_NAME, AUTH_REQUIRE_2FA } from '@/lib/auth/config';
import { getOptionalPageSession } from '@/lib/auth/session';

export default async function LoginPage() {
  const session = await getOptionalPageSession();

  if (session?.status === 'active') {
    redirect('/dashboard');
  }

  if (session?.status === 'pending_2fa_setup') {
    redirect(AUTH_REQUIRE_2FA ? '/setup-2fa' : '/dashboard');
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-border/60 bg-black lg:flex">
        <Image
          src="/bigbosslogin.png"
          alt="BIG BOSS BOT login artwork"
          fill
          priority
          className="object-cover object-center"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.25)_30%,rgba(0,0,0,0.72)_100%)]" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-10">
          <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-white">
            <BrandLogo
              className="size-10 overflow-hidden rounded-xl border border-white/15 bg-black/50 object-cover shadow-sm backdrop-blur-sm"
              priority
            />
            <span>{APP_NAME}</span>
          </div>

          <div className="flex max-w-xl flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Secure command center</p>
              <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-white">
                Live intelligence, alerts, and market context in one protected workspace.
              </h1>
              <p className="max-w-lg text-sm leading-7 text-white/78">
                Review theater-specific feeds and operational dashboards behind a single authenticated sign-in.
              </p>
            </div>

            <blockquote className="max-w-lg border-l border-white/15 pl-4 text-sm leading-7 text-white/72">
              Built for operators who need fast context, clean signal, and a secure path into the dashboard.
            </blockquote>

            <div className="grid max-w-xl grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/35 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Access</p>
                <p className="mt-2 text-sm font-medium text-white">Private user sessions</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/35 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Coverage</p>
                <p className="mt-2 text-sm font-medium text-white">Middle East and Ukraine theaters</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/35 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Signal</p>
                <p className="mt-2 text-sm font-medium text-white">Live feeds, alerts, and map intel</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandLogo className="size-10 overflow-hidden rounded-xl border border-border bg-background object-cover shadow-sm" priority />
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
