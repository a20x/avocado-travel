# Образ сайта для хостинга (docs/09-deploy.md). Три этапа: зависимости → сборка → запуск.
# В итоговый образ попадают только собранный сервер Next.js (output: 'standalone'), статика
# и миграции базы — без исходников, devDependencies и pnpm.
# Проверить локально: docker build -t avocado-travel . && docker run --env-file .env -p 3000:3000 avocado-travel

ARG NODE_VERSION=24-alpine

# 1. Зависимости — отдельным слоем: пока package.json и lock-файл не менялись, Docker берёт их из кэша.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 2. Сборка.
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Адрес сайта Next.js вписывает в код при сборке (ссылки, robots.txt), поэтому он нужен уже здесь.
# Render передаёт переменные окружения сервиса в сборку как аргументы.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# 3. Запуск: только то, что нужно серверу.
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Docker подставляет в HOSTNAME имя контейнера — тогда сервер не принимал бы запросы снаружи.
    HOSTNAME=0.0.0.0 \
    DB_MIGRATE_ON_START=true

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/db/migrations ./db/migrations

# Сервер работает не от root: при уязвимости в коде у атакующего меньше прав в контейнере.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
