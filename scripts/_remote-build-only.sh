#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP=/home/ubuntu/ai-supermarket
cd "$APP"
sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
npx next build --webpack
test -f .next/standalone/server.js
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
echo BUILD_OK
'
systemctl restart ai-supermarket
sleep 2
curl -sS -o /dev/null -w "local3010=%{http_code}\n" http://127.0.0.1:3010/
curl -sk -o /dev/null -w "https_local=%{http_code}\n" --resolve fjrxb.beauty:443:127.0.0.1 https://fjrxb.beauty/
if grep -Rqs '种地看数据' .next/standalone/.next/static/chunks 2>/dev/null; then
  echo HAS_OPS_COPY
else
  echo NO_OPS_COPY
fi
echo deploy finish done
