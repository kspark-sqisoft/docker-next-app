#!/bin/sh
set -e
cd /app
ROOT="${UPLOADS_DIR:-/app/uploads}"
mkdir -p "$ROOT/posts" "$ROOT/profiles"

# Windows 호스트에서 로컬 next dev 로 만든 .next 가 마운트되면 Linux 컨테이너와 섞여
# 새로고침해도 옛 번들이 나오는 현상이 날 수 있음 → 기본은 기동 시 삭제
if [ "${NEXT_PURGE_DOT_NEXT:-1}" != "0" ]; then
  echo "[dev-entrypoint] Removing /app/.next (set NEXT_PURGE_DOT_NEXT=0 to keep)"
  rm -rf /app/.next
fi

npx prisma migrate deploy
# Docker 바인드 마운트(특히 Windows)에서 Turbopack HMR이 자주 끊김 → Webpack + 폴링이 안정적
exec npm run dev:docker -- --hostname 0.0.0.0 --port 3000
