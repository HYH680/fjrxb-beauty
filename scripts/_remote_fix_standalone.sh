#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP=/home/ubuntu/ai-supermarket
cd "$APP"

test -f .env || { echo MISSING_ENV; exit 1; }
test -f prisma/prod.db || { echo MISSING_DB; exit 1; }
cp -a .env /tmp/ai-sm.env.bak
cp -a prisma/prod.db /tmp/ai-sm.prod.db.bak

rm -rf src.old public.old
mv src src.old
mv src_new src
mv public public.old
mv public_new public

cp -a /tmp/ai-sm-files/package.json "$APP/"
cp -a /tmp/ai-sm-files/package-lock.json "$APP/"
cp -a /tmp/ai-sm-files/next.config.ts "$APP/"
cp -a /tmp/ai-sm-files/tsconfig.json "$APP/"
cp -a /tmp/ai-sm-files/postcss.config.mjs "$APP/"
cp -a /tmp/ai-sm-files/components.json "$APP/"
cp -a /tmp/ai-sm-files/schema.prisma "$APP/prisma/schema.prisma"

cp -a /tmp/ai-sm.env.bak "$APP/.env"
cp -a /tmp/ai-sm.prod.db.bak "$APP/prisma/prod.db"

chown -R ubuntu:ubuntu "$APP/src" "$APP/public" "$APP/package.json" "$APP/package-lock.json" \
  "$APP/next.config.ts" "$APP/tsconfig.json" "$APP/postcss.config.mjs" "$APP/components.json" \
  "$APP/prisma/schema.prisma" "$APP/.env" "$APP/prisma/prod.db"

sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
npm ci --no-audit --no-fund
npx prisma generate
npx prisma db push
export NODE_ENV=production
export NODE_OPTIONS=--max-old-space-size=1536
npx next build --webpack
if [[ ! -f .next/standalone/server.js ]]; then
  echo FATAL_NO_STANDALONE
  ls -la .next | head -40
  exit 1
fi
mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static .next/standalone/.next/server
cp -a .next/server .next/standalone/.next/server
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
chunk_n=$(find .next/standalone/.next/static/chunks -type f 2>/dev/null | wc -l | tr -d " ")
echo standalone_chunks=$chunk_n
if [[ "$chunk_n" -lt 5 ]]; then echo FATAL_FEW_CHUNKS; exit 1; fi
test -f .next/standalone/public/catalog/watermarks-remover.svg || { echo FATAL_SVG; exit 1; }
mkdir -p .next/standalone/prisma
cp -a prisma/prod.db .next/standalone/prisma/prod.db
chown -R ubuntu:ubuntu .next/standalone
'

cp -a /tmp/ai-sm.env.bak "$APP/.env"
cp -a /tmp/ai-sm.prod.db.bak "$APP/prisma/prod.db"
chown ubuntu:ubuntu "$APP/.env" "$APP/prisma/prod.db"

systemctl restart ai-supermarket
sleep 3
systemctl --no-pager --full status ai-supermarket | head -25
PID=$(systemctl show -p MainPID --value ai-supermarket)
echo PID=$PID
ls -l /proc/$PID/cwd
echo "cwd_target=$(readlink /proc/$PID/cwd)"
test -f /home/ubuntu/ai-supermarket/.next/standalone/server.js && echo server_js_ok
curl -sS -o /dev/null -w "local_root=%{http_code}\n" http://127.0.0.1:3010/
curl -sS -o /dev/null -w "local_catalog=%{http_code}\n" http://127.0.0.1:3010/api/catalog
curl -sS -o /dev/null -w "local_cart=%{http_code}\n" http://127.0.0.1:3010/cart
echo APPLY_DONE