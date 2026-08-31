#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP=/home/ubuntu/ai-supermarket
cd "$APP"
chown -R ubuntu:ubuntu "$APP/src" "$APP/public" 2>/dev/null || true

sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
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
  echo "FATAL: .next/standalone/server.js missing after build"
  if [[ -n "$KEEP_STANDALONE" && -d "$KEEP_STANDALONE" ]]; then
    rm -rf .next/standalone
    mv "$KEEP_STANDALONE" .next/standalone
    echo "restored previous standalone"
  fi
  exit 1
fi
if [[ -n "$KEEP_STANDALONE" && -d "$KEEP_STANDALONE" ]]; then
  rm -rf "$KEEP_STANDALONE"
fi

mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static .next/standalone/.next/server
cp -a .next/server .next/standalone/.next/server
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
mkdir -p .next/standalone/prisma
if [[ -f prisma/prod.db ]]; then
  cp -a prisma/prod.db .next/standalone/prisma/prod.db
fi
chown -R ubuntu:ubuntu .next/standalone
'

systemctl restart ai-supermarket
sleep 2
systemctl is-active ai-supermarket
curl -sS -o /dev/null -w "home:%{http_code} products:%{http_code} chat:%{http_code}\n" http://127.0.0.1:3010/ http://127.0.0.1:3010/products http://127.0.0.1:3010/chat
echo "rebuild-black-bg done"
