FROM node:22-alpine

ARG APP_VERSION

LABEL org.opencontainers.image.source="https://github.com/kitakitsune0x/bigbossbot"
LABEL org.opencontainers.image.title="BIG BOSS BOT"
LABEL org.opencontainers.image.description="Real-time OSINT command center for monitoring the Middle East conflict."
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_VERSION=${APP_VERSION}
ENV BIG_BOSS_VERSION=${APP_VERSION}
ENV NEXT_PUBLIC_APP_VERSION=${APP_VERSION}

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --include=dev

COPY . .

RUN npm run build

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["sh", "scripts/docker-entrypoint.sh"]
