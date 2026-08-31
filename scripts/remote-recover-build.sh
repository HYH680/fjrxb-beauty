#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:/usr/bin:/bin:$PATH
cd /home/ubuntu/ai-supermarket
rm -rf node_modules .next
npm install --no-audit --no-fund
npx prisma generate
npx prisma db push
export NODE_ENV=production
export NODE_OPTIONS=--max-old-space-size=1536
npx next build --webpack
mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static .next/standalone/.next/server
cp -a .next/server .next/standalone/.next/server
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
mkdir -p .next/standalone/prisma
cp -a prisma/prod.db .next/standalone/prisma/prod.db 2>/dev/null || true
chown -R ubuntu:ubuntu /home/ubuntu/ai-supermarket/.next
systemctl restart ai-supermarket
sleep 3
systemctl is-active ai-supermarket
curl -sS -o /dev/null -w "local3010=%{http_code}\n" http://127.0.0.1:3010/
