#!/bin/sh
set -e
cd /app
ROOT="${UPLOADS_DIR:-/app/uploads}"
mkdir -p "$ROOT/posts" "$ROOT/profiles"
npx prisma migrate deploy
exec npm run dev -- --hostname 0.0.0.0 --port 3000
