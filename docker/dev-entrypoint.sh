#!/bin/sh
set -e
cd /app
ROOT="${UPLOADS_DIR:-/app/uploads}"
mkdir -p "$ROOT/posts" "$ROOT/profiles"

# compose 가 빈 named volume 을 node_modules 에 마운트하면 drizzle-orm 이 없어
# drizzle-kit migrate 가 "Please install latest version of drizzle-orm" 로 종료됩니다.
if [ ! -d node_modules/drizzle-orm ] || [ ! -x node_modules/.bin/drizzle-kit ]; then
  echo "[dev-entrypoint] node_modules 불완전 — npm ci"
  npm ci
fi

# npx 대신 lockfile 과 맞는 로컬 drizzle-kit 사용 (스키마가 drizzle-orm 을 require)
npm run db:deploy

exec npm run dev -- --hostname 0.0.0.0 --port 3000
