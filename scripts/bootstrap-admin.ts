import 'dotenv/config';
import { AUTH_REQUIRE_2FA } from '@/lib/auth/config';
import { getPrisma } from '@/lib/prisma';
import { hashPassword, normalizeUsername } from '@/lib/auth/crypto';

async function main() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD must be set');
  }

  const prisma = getPrisma();
  const canonical = normalizeUsername(username);
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true, username: true },
  });

  if (existingAdmin) {
    console.log(`Admin already exists: ${existingAdmin.username}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const defaultAuthState = AUTH_REQUIRE_2FA
    ? { status: 'pending_2fa_setup' as const, totpRequired: true }
    : { status: 'active' as const, totpRequired: false };
  const existingUser = await prisma.user.findUnique({
    where: { usernameCanonical: canonical },
    select: { id: true },
  });

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          username,
          usernameCanonical: canonical,
          passwordHash,
          role: 'admin',
          status: defaultAuthState.status,
          totpRequired: defaultAuthState.totpRequired,
        },
      })
    : await prisma.user.create({
        data: {
          username,
          usernameCanonical: canonical,
          passwordHash,
          role: 'admin',
          status: defaultAuthState.status,
          totpRequired: defaultAuthState.totpRequired,
        },
      });

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      usernameCanonical: user.usernameCanonical,
      action: 'admin_bootstrap',
      metadata: {
        source: 'bootstrap:admin',
      },
    },
  });

  console.log(
    AUTH_REQUIRE_2FA
      ? `Bootstrapped admin ${user.username}. They will finish 2FA setup on first login.`
      : `Bootstrapped admin ${user.username}. They can sign in immediately and enable 2FA later.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
