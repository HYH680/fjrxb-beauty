#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP='/home/ubuntu/ai-supermarket'
cd "$APP"
echo "=== recover start ==="
if [[ -f /tmp/ai-supermarket-deploy.tgz ]]; then
  mkdir -p "$APP/data/uploads/avatars"
  rm -rf "$APP/src" "$APP/public"
  tar -xzf /tmp/ai-supermarket-deploy.tgz -C "$APP" --exclude='.env' --exclude='prisma/prod.db'
fi
chown -R ubuntu:ubuntu "$APP" 2>/dev/null || true
sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
rm -rf node_modules
npm ci --ignore-scripts --no-audit --no-fund
npx prisma generate
npx prisma db push
export NODE_ENV=production
export NODE_OPTIONS=--max-old-space-size=1536
if ! npx next build --webpack; then
  npm run build
fi
mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static .next/standalone/.next/server
cp -a .next/server .next/standalone/.next/server
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
test -f .next/standalone/server.js
'
systemctl restart ai-supermarket
sleep 4
systemctl is-active ai-supermarket
curl -sS -o /dev/null -w "prod=%{http_code}\n" --max-time 20 http://127.0.0.1:3010/
echo "=== recover done ==="
