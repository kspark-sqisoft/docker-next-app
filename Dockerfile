# 운영 스타일: 멀티스테이지 빌드 + Next standalone + 시작 시 prisma migrate deploy
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
# postinstall 에서 prisma generate 가 실행되므로 스키마를 먼저 복사
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 빌드 시 스키마 검증용(실제 DB 연결 불필요). generate / next build 용
ENV DATABASE_URL="postgresql://blog:blog@localhost:5432/blog"
ENV AUTH_SECRET="build_time_secret_at_least_32_characters_long_x"
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/app/generated ./app/generated

COPY docker/prod-entrypoint.sh /usr/local/bin/prod-entrypoint.sh
RUN tr -d '\r' < /usr/local/bin/prod-entrypoint.sh > /tmp/prod-entrypoint.sh \
  && mv /tmp/prod-entrypoint.sh /usr/local/bin/prod-entrypoint.sh \
  && chmod +x /usr/local/bin/prod-entrypoint.sh

# migrate deploy용 Prisma CLI(의존성 전체). standalone node_modules 와 병합 설치
USER root
RUN npm install prisma@7.6.0
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["/usr/local/bin/prod-entrypoint.sh"]
