#!/usr/bin/env bash
set -euo pipefail
APP=/home/ubuntu/ai-supermarket
cd "$APP"
test -f .next/standalone/server.js
test -d .next/server
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/server .next/standalone/.next/static .next/standalone/public
cp -a .next/server .next/standalone/.next/server
cp -a .next/static .next/standalone/.next/static
cp -a public .next/standalone/public
mkdir -p .next/standalone/prisma
if [[ -f prisma/prod.db ]]; then
  cp -a prisma/prod.db .next/standalone/prisma/prod.db
fi
chown -R ubuntu:ubuntu .next/standalone
systemctl restart ai-supermarket
sleep 2
systemctl is-active ai-supermarket
test -d .next/standalone/.next/server/app/products && echo products_server_ok
test -d .next/standalone/.next/server/app/chat && echo chat_server_ok
curl -sI -o /dev/null -w "local_products:%{http_code}\n" http://127.0.0.1:3010/products || true
curl -sI -o /dev/null -w "local_chat:%{http_code}\n" http://127.0.0.1:3010/chat || true
echo "fix-standalone done"
