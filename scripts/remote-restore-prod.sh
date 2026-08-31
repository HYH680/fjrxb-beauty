#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
npm ci --no-audit --no-fund
npx prisma generate
npx prisma db push
export NODE_ENV=production
export NODE_OPTIONS=--max-old-space-size=1536
rm -f .next/lock
npx next build --webpack
mkdir -p .next/standalone/.next
cp -a .next/server .next/standalone/.next/server
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
mkdir -p .next/standalone/prisma data/uploads/avatars
cp -a prisma/prod.db .next/standalone/prisma/prod.db
chown -R ubuntu:ubuntu .next/standalone data
systemctl restart ai-supermarket
sleep 3
systemctl is-active ai-supermarket
curl -sS -o /dev/null -w "home:%{http_code} me:%{http_code} preset:%{http_code}\n" \
  http://127.0.0.1:3010/ \
  http://127.0.0.1:3010/api/auth/me \
  http://127.0.0.1:3010/avatars/presets/avatar-01.svg
echo RESTORE_OK
