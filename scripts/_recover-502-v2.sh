#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP=/home/ubuntu/ai-supermarket
cd "$APP"
systemctl stop ai-supermarket || true
sleep 1

sudo -u ubuntu -H env PATH=/opt/nodejs/bin:/usr/bin HOME=/home/ubuntu \
  NODE_ENV=production NODE_OPTIONS=--max-old-space-size=1536 \
  bash -c '
set -euo pipefail
cd /home/ubuntu/ai-supermarket
rm -rf .next node_modules
npm ci --no-audit --no-fund
npx prisma generate
npx next build --webpack
test -f .next/standalone/server.js
mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
# critical: full server tree for manifests
if [[ ! -d .next/standalone/.next/server ]]; then
  cp -a .next/server .next/standalone/.next/server
fi
test -f .next/standalone/.next/server/app/products/page_client-reference-manifest.js
chunk_n=$(find .next/standalone/.next/static/chunks -type f | wc -l | tr -d " ")
echo "standalone_chunks=${chunk_n}"
mkdir -p .next/standalone/prisma
cp -a prisma/prod.db .next/standalone/prisma/prod.db
chown -R ubuntu:ubuntu .next/standalone
'

systemctl reset-failed ai-supermarket
systemctl start ai-supermarket
sleep 4
systemctl is-active ai-supermarket
test -d /home/ubuntu/ai-supermarket/.next/standalone
curl -sS -o /dev/null -w "home=%{http_code}\n" http://127.0.0.1:3010/
curl -sS -o /dev/null -w "products=%{http_code}\n" http://127.0.0.1:3010/products
curl -sk -o /dev/null -w "https=%{http_code}\n" --resolve fjrxb.beauty:443:127.0.0.1 https://fjrxb.beauty/products
echo recover2_done
