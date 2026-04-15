# VPS Deployment

This deployment path is designed for a public GitHub repository with private runtime secrets:

- GitHub Actions builds and pushes the app image to GHCR when you push to `main`
- Caddy terminates HTTPS on the VM and reverse-proxies to the app over the internal Docker network
- Watchtower can optionally pull and restart the app automatically after the base deployment is stable
- all secrets stay in `.env.production` on the VPS and never need to live in GitHub Actions

## Architecture

`git push` -> GitHub Actions publishes `ghcr.io/kitakitsune0x/bigbossbot:latest` -> Docker on the VPS runs the app image -> Caddy serves your domain over HTTPS and proxies traffic to `app:3000`

## Before You Begin

1. Make sure the repository history does not contain secrets you care about before switching the repo to public.
2. Decide whether your GHCR package will be public or private.
   - Public is the simplest path. The VPS can pull the image without a registry login.
   - Private also works, but you must run `docker login ghcr.io` on the VPS with a token that has `read:packages`.
   - A public repository does not automatically make the GHCR container package public.
3. Point the domain you want to use at the VM with DNS `A` and/or `AAAA` records.
4. Open inbound ports `80` and `443` to the VM so Caddy can complete ACME HTTP challenges and serve HTTPS.

## Caddy Setup

The production stack includes Caddy and a repo-managed [Caddyfile](../Caddyfile) that reverse-proxies your domain to `http://app:3000` over the Docker network.

## VPS Bootstrap

Install Docker Engine and the Docker Compose plugin on the VPS, then clone the public repository:

```bash
git clone https://github.com/kitakitsune0x/bigbossbot.git
cd bigbossbot
cp .env.production.example .env.production
```

Edit `.env.production` and replace every placeholder value before starting anything:

- `APP_DOMAIN`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `AUTH_ENCRYPTION_KEY`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`

The container refuses to start if `AUTH_ENCRYPTION_KEY` or `BOOTSTRAP_ADMIN_PASSWORD` still use the example placeholder values.

If you want automatic deploys on every push, leave `BIG_BOSS_IMAGE` on `:latest`.

If you want a fixed release or a rollback target, pin it to a date tag such as `ghcr.io/kitakitsune0x/bigbossbot:2026.04.15`.

## First Deploy

Start the stack with the VPS-specific compose file:

```bash
docker compose --env-file .env.production -f docker-compose.vps.yml up -d
```

That creates:

- `postgres` for the app database
- `app` for BIG BOSS BOT
- `caddy` to serve HTTPS and reverse-proxy to the app

The first HTTPS certificate issuance can take a minute or two after DNS finishes propagating.

## Automatic Updates

Watchtower is optional in the Caddy-based stack because some older VM Docker installations still ship incompatible API clients.

Once your Docker tooling is current, you can enable Watchtower with:

```bash
docker compose --profile watchtower --env-file .env.production -f docker-compose.vps.yml up -d watchtower
```

Watchtower polls GHCR every `WATCHTOWER_POLL_INTERVAL` seconds and only updates the app container that carries the `bigbossbot` scope label.

Your ongoing workflow becomes:

1. Commit locally.
2. Push to `main`.
3. Wait for the GitHub Actions image publish job to finish.
4. Let Watchtower pull and restart the app automatically on the VPS.

## Rollback

To roll back, edit `.env.production` and pin `BIG_BOSS_IMAGE` to an older date tag, then recreate the app service:

```bash
docker compose --env-file .env.production -f docker-compose.vps.yml up -d app
```

## Useful Commands

Check running services:

```bash
docker compose --env-file .env.production -f docker-compose.vps.yml ps
```

Tail logs:

```bash
docker compose --env-file .env.production -f docker-compose.vps.yml logs -f app caddy
```

Stop the stack:

```bash
docker compose --env-file .env.production -f docker-compose.vps.yml down
```

## Notes

- The production compose file does not publish the app port or Postgres port to the internet.
- Caddy publishes ports `80` and `443` on the host and keeps the app itself private on the internal Docker network.
- If you later want the MCP sidecar on the VPS too, it is safer to add it separately after the web app is stable.
- Bootstrapping the admin account is idempotent. After the first successful deploy, you can remove `BOOTSTRAP_ADMIN_PASSWORD` from `.env.production` if you prefer.
