#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP=/home/ubuntu/ai-supermarket
cd "$APP"
mkdir -p data/uploads/avatars
chown -R ubuntu:ubuntu data
if [[ -f /tmp/ai-avatar-deploy.tgz ]]; then
  tar -xzf /tmp/ai-avatar-deploy.tgz -C "$APP"
  chown -R ubuntu:ubuntu "$APP/src" "$APP/prisma/schema.prisma" "$APP/scripts/remote-apply-deploy.sh" 2>/dev/null || true
fi
chown -R ubuntu:ubuntu "$APP/public/avatars" 2>/dev/null || true

sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
npx prisma generate
npx prisma db push
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
rm -f .next/lock
KEEP_STANDALONE=""
if [[ -f .next/standalone/server.js ]]; then
  KEEP_STANDALONE=".next/standalone.keep.$$"
  cp -a .next/standalone "$KEEP_STANDALONE"
fi
npx next build --webpack
if [[ ! -f .next/standalone/server.js ]]; then
  echo "FATAL: missing standalone"
  exit 1
fi
if [[ -n "$KEEP_STANDALONE" && -d "$KEEP_STANDALONE" ]]; then rm -rf "$KEEP_STANDALONE"; fi
mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static .next/standalone/.next/server
cp -a .next/server .next/standalone/.next/server
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
mkdir -p .next/standalone/prisma
if [[ -f prisma/prod.db ]]; then cp -a prisma/prod.db .next/standalone/prisma/prod.db; fi
chown -R ubuntu:ubuntu .next/standalone
'

systemctl restart ai-supermarket
sleep 3
systemctl is-active ai-supermarket
curl -sS -o /dev/null -w "me:%{http_code} preset:%{http_code} home:%{http_code}\n" \
  http://127.0.0.1:3010/api/auth/me \
  http://127.0.0.1:3010/avatars/presets/avatar-01.png \
  http://127.0.0.1:3010/
echo "avatar deploy apply done"
