#!/bin/sh

set -eu

echo "Applying Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

if [ -n "${BOOTSTRAP_ADMIN_USERNAME:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  echo "Ensuring bootstrap admin exists..."
  npm run bootstrap:admin
else
  echo "Skipping bootstrap admin setup because credentials were not provided."
fi

exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port "${PORT:-3000}"
