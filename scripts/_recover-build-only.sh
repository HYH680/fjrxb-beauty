#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:/usr/bin:/bin
APP=/home/ubuntu/ai-supermarket
LOCK=/tmp/ai-supermarket-build.lock
exec 9>"$LOCK"
flock -n 9 || { echo "another build running"; exit 1; }

systemctl stop ai-supermarket 2>/dev/null || true
pkill -u ubuntu -f '/home/ubuntu/ai-supermarket' 2>/dev/null || true
sleep 3

cd "$APP"
mv node_modules "/tmp/nm-del-$$" 2>/dev/null || true
mv .next "/tmp/nxt-del-$$" 2>/dev/null || true
rm -rf "/tmp/nm-del-$$" "/tmp/nxt-del-$$" &

sudo -u ubuntu -H env PATH=/opt/nodejs/bin:/usr/bin HOME=/home/ubuntu bash <<'UB'
set -euo pipefail
cd /home/ubuntu/ai-supermarket
npm ci --no-audit --no-fund
npx prisma generate
NODE_ENV=production NODE_OPTIONS=--max-old-space-size=1536 npx next build --webpack
test -f .next/standalone/server.js
mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
if [[ ! -d .next/standalone/.next/server ]]; then
  cp -a .next/server .next/standalone/.next/server
fi
test -f .next/standalone/.next/server/app/products/page_client-reference-manifest.js
mkdir -p .next/standalone/prisma
cp -a prisma/prod.db .next/standalone/prisma/prod.db
UB

systemctl reset-failed ai-supermarket
systemctl start ai-supermarket
sleep 5
curl -sS -o /dev/null -w "home=%{http_code}\n" http://127.0.0.1:3010/
curl -sS -o /dev/null -w "products=%{http_code}\n" http://127.0.0.1:3010/products
curl -sk -o /dev/null -w "https=%{http_code}\n" --resolve fjrxb.beauty:443:127.0.0.1 https://fjrxb.beauty/
echo DONE
