#!/bin/sh

set -eu

assert_not_placeholder() {
  var_name="$1"
  value="$2"

  case "$value" in
    "" )
      echo "$var_name must be set before starting the container."
      exit 1
      ;;
    replace-with-a-long-random-secret|replace-with-a-long-random-secret-value|replace-with-a-strong-password|replace-with-a-long-random-password|replace-with-your-cloudflare-tunnel-token)
      echo "$var_name still uses the example placeholder value. Set a real secret before starting the container."
      exit 1
      ;;
  esac
}

assert_not_placeholder AUTH_ENCRYPTION_KEY "${AUTH_ENCRYPTION_KEY:-}"

if [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  assert_not_placeholder BOOTSTRAP_ADMIN_PASSWORD "${BOOTSTRAP_ADMIN_PASSWORD}"
fi

echo "Applying Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

if [ -n "${BOOTSTRAP_ADMIN_USERNAME:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  echo "Ensuring bootstrap admin exists..."
  npm run bootstrap:admin
else
  echo "Skipping bootstrap admin setup because credentials were not provided."
fi

exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port "${PORT:-3000}"
