import { spawn, spawnSync } from 'node:child_process';

function fail(message: string, error?: unknown) {
  if (error) {
    console.error(message, error);
  } else {
    console.error(message);
  }

  process.exit(1);
}

const dockerUp = spawnSync('docker', ['compose', 'up', '-d', 'postgres', 'intel'], {
  stdio: 'inherit',
  env: process.env,
});

if (dockerUp.error) {
  fail('Unable to start postgres/intel services with Docker Compose.', dockerUp.error);
}

if ((dockerUp.status ?? 1) !== 0) {
  process.exit(dockerUp.status ?? 1);
}

const nextCommand = process.platform === 'win32' ? 'next.cmd' : 'next';
const nextDev = spawn(nextCommand, ['dev', '--webpack'], {
  stdio: 'inherit',
  env: process.env,
});

if (!nextDev.pid) {
  fail('Unable to start the Next.js dev server.');
}

const forwardSignal = (signal: NodeJS.Signals) => {
  if (!nextDev.killed) {
    nextDev.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

nextDev.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

nextDev.on('error', (error) => {
  fail('Unable to run the Next.js dev server.', error);
});
