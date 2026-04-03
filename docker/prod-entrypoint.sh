#!/bin/sh
set -e
cd /app
ROOT="${UPLOADS_DIR:-/app/uploads}"
mkdir -p "$ROOT/posts" "$ROOT/profiles"
# 런타임에 DB가 준비된 뒤 마이그레이션 적용 (프로덕션 스타일)
npx prisma migrate deploy
exec node server.js
