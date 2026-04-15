# VPS Deployment

This deployment path is designed for a public GitHub repository with private runtime secrets:

- GitHub Actions builds and pushes the app image to GHCR when you push to `main`
- your VPS pulls and restarts the app automatically with Watchtower
- Cloudflare Tunnel publishes the app without exposing the VPS origin IP
- all secrets stay in `.env.production` on the VPS and never need to live in GitHub Actions

## Architecture

`git push` -> GitHub Actions publishes `ghcr.io/kitakitsune0x/bigbossbot:latest` -> Watchtower on the VPS pulls the updated image -> Docker restarts `big-boss-app-prod` -> Cloudflare Tunnel serves the app on your hostname

## Before You Begin

1. Make sure the repository history does not contain secrets you care about before switching the repo to public.
2. Decide whether your GHCR package will be public or private.
   - Public is the simplest path. The VPS can pull the image without a registry login.
   - Private also works, but you must run `docker login ghcr.io` on the VPS with a token that has `read:packages`.
3. Add your domain to Cloudflare if you want the origin IP hidden.

## Cloudflare Tunnel Setup

Create a tunnel in Cloudflare Zero Trust and add a public hostname that forwards traffic to `http://app:3000`.

When Cloudflare gives you the tunnel token, keep it for `.env.production` as `CLOUDFLARE_TUNNEL_TOKEN`.

## VPS Bootstrap

Install Docker Engine and the Docker Compose plugin on the VPS, then clone the public repository:

```bash
git clone https://github.com/kitakitsune0x/bigbossbot.git
cd bigbossbot
cp .env.production.example .env.production
```

Edit `.env.production` and replace every placeholder value before starting anything:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `AUTH_ENCRYPTION_KEY`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `CLOUDFLARE_TUNNEL_TOKEN`

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
- `watchtower` to auto-pull newer images from GHCR
- `cloudflared` so the app can be reached without opening inbound ports on the VPS

## Automatic Updates

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
docker compose --env-file .env.production -f docker-compose.vps.yml logs -f app cloudflared watchtower
```

Stop the stack:

```bash
docker compose --env-file .env.production -f docker-compose.vps.yml down
```

## Notes

- The production compose file does not publish the app port or Postgres port to the internet.
- If you later want the MCP sidecar on the VPS too, it is safer to add it separately after the web app is stable.
- Bootstrapping the admin account is idempotent. After the first successful deploy, you can remove `BOOTSTRAP_ADMIN_PASSWORD` from `.env.production` if you prefer.
