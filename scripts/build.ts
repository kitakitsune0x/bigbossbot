import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolveBuildVersion } from '../src/lib/build-version';

const buildVersion = resolveBuildVersion(
  process.env.BIG_BOSS_VERSION,
  process.env.APP_VERSION,
  process.env.NEXT_PUBLIC_APP_VERSION,
);

writeFileSync('.build-version', `${buildVersion}\n`);

const env = {
  ...process.env,
  APP_VERSION: buildVersion,
  BIG_BOSS_VERSION: buildVersion,
  NEXT_PUBLIC_APP_VERSION: buildVersion,
};

const nextCommand = process.platform === 'win32' ? 'next.cmd' : 'next';
const result = spawnSync(nextCommand, ['build'], {
  env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
