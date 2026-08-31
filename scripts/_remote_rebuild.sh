#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP=/home/ubuntu/ai-supermarket
cp -a "$APP/.env" /tmp/ai-sm.env.bak
cp -a "$APP/prisma/prod.db" /tmp/ai-sm.prod.db.bak
chown -R ubuntu:ubuntu "$APP/src" "$APP/next.config.ts" "$APP/package.json"

sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
npm install server-only@0.0.1 --no-audit --no-fund --save
export NODE_ENV=production
export NODE_OPTIONS=--max-old-space-size=1536
npx next build --webpack
test -f .next/standalone/server.js
mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static .next/standalone/.next/server
cp -a .next/server .next/standalone/.next/server
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
chunk_n=$(find .next/standalone/.next/static/chunks -type f | wc -l | tr -d " ")
echo standalone_chunks=$chunk_n
test "$chunk_n" -ge 5
test -f .next/standalone/public/catalog/watermarks-remover.svg
mkdir -p .next/standalone/prisma
cp -a prisma/prod.db .next/standalone/prisma/prod.db
chown -R ubuntu:ubuntu .next/standalone
'

cp -a /tmp/ai-sm.env.bak "$APP/.env"
cp -a /tmp/ai-sm.prod.db.bak "$APP/prisma/prod.db"
chown ubuntu:ubuntu "$APP/.env" "$APP/prisma/prod.db"

systemctl restart ai-supermarket
sleep 3
systemctl --no-pager --full status ai-supermarket | head -22
PID=$(systemctl show -p MainPID --value ai-supermarket)
echo PID=$PID
ls -l /proc/$PID/cwd
readlink /proc/$PID/cwd
test -f "$APP/.next/standalone/server.js" && echo server_js_ok
curl -sS -o /dev/null -w "local_root=%{http_code}\n" http://127.0.0.1:3010/
curl -sS -o /dev/null -w "local_catalog=%{http_code}\n" http://127.0.0.1:3010/api/catalog
curl -sS -o /dev/null -w "local_cart=%{http_code}\n" http://127.0.0.1:3010/cart
echo REBUILD_DONE