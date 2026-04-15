FROM node:22-alpine

ARG APP_VERSION

LABEL org.opencontainers.image.source="https://github.com/kitakitsune0x/bigbossbot"

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

EXPOSE 3000

CMD ["sh", "scripts/docker-entrypoint.sh"]
