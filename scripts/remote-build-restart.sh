#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
export NODE_ENV=production
export NODE_OPTIONS=--max-old-space-size=1536
npm run build
mkdir -p .next/standalone/.next
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
mkdir -p .next/standalone/prisma
if [[ -f prisma/prod.db ]]; then
  cp -a prisma/prod.db .next/standalone/prisma/prod.db
fi
sudo systemctl restart ai-supermarket
sleep 2
sudo systemctl --no-pager --full status ai-supermarket | head -15
curl -sS -o /dev/null -w "local3010=%{http_code}\n" http://127.0.0.1:3010/
curl -sk -o /dev/null -w "https_chat=%{http_code}\n" --resolve fjrxb.beauty:443:127.0.0.1 https://fjrxb.beauty/chat
echo BUILD_DONE
