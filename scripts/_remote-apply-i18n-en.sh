#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP=/home/ubuntu/ai-supermarket
cd "$APP"
grep -n 'we-media-topics' src/lib/i18n/product-en.ts | head -3
sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
KEEP_STANDALONE=""
if [[ -f .next/standalone/server.js ]]; then
  KEEP_STANDALONE=".next/standalone.keep.$$"
  cp -a .next/standalone "$KEEP_STANDALONE"
fi
if ! npx next build --webpack; then
  echo "webpack build failed"
  if [[ -n "$KEEP_STANDALONE" && -d "$KEEP_STANDALONE" ]]; then
    rm -rf .next/standalone
    mv "$KEEP_STANDALONE" .next/standalone
  fi
  exit 1
fi
if [[ ! -f .next/standalone/server.js ]]; then
  echo "FATAL: missing standalone"
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
curl -sS -o /dev/null -w "local3010=%{http_code}\n" http://127.0.0.1:3010/
if grep -Rqs 'Creator topic planning' .next/standalone/.next 2>/dev/null; then
  echo "VERIFY: Creator topic planning present in build"
else
  echo "WARN: Creator topic planning not found in standalone"
fi
echo "remote-i18n-apply done"
