#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP=/home/ubuntu/ai-supermarket

# Kill any leftover builds again
pkill -9 -f 'next build' 2>/dev/null || true
pkill -9 -f 'KEEP_STANDALONE' 2>/dev/null || true
pkill -9 -f 'npm ci --no-audit' 2>/dev/null || true
sleep 1

cp -a "$APP/.env" /tmp/ai-sm.env.bak
cp -a "$APP/prisma/prod.db" /tmp/ai-sm.prod.db.bak
rm -f "$APP/.next/lock"
ls -d "$APP"/.next/standalone.keep.* 2>/dev/null || echo "no keep dirs"

sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
npm ci --no-audit --no-fund
npx prisma generate
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

# Block accidental remote-apply for a moment by renaming the trigger script if present
if [[ -f /tmp/ai-supermarket-remote-apply.sh ]]; then
  mv /tmp/ai-supermarket-remote-apply.sh /tmp/ai-supermarket-remote-apply.sh.disabled || true
fi

systemctl restart ai-supermarket
sleep 4
PID=$(systemctl show -p MainPID --value ai-supermarket)
echo PID=$PID
ls -l /proc/$PID/cwd
if ls -l /proc/$PID/cwd | grep -q deleted; then echo FATAL_CWD_DELETED; exit 1; fi
test -f "$APP/.next/standalone/server.js"
chunk=$(find "$APP/.next/standalone/.next/static/chunks" -type f -name "*.js" | head -1)
rel=${chunk#*/.next/static}
curl -sS -o /dev/null -w "local_root=%{http_code}\n" http://127.0.0.1:3010/
curl -sS -o /dev/null -w "local_cart=%{http_code}\n" http://127.0.0.1:3010/cart
curl -sS -o /dev/null -w "local_catalog=%{http_code}\n" http://127.0.0.1:3010/api/catalog
curl -sS -o /dev/null -w "local_svg=%{http_code}\n" http://127.0.0.1:3010/catalog/watermarks-remover.svg
curl -sS -o /dev/null -w "local_svg2=%{http_code}\n" http://127.0.0.1:3010/catalog/ai-self-media.svg
curl -sS -o /dev/null -w "local_static=%{http_code}\n" "http://127.0.0.1:3010/_next/static${rel}"
# confirm still no race after curls
sleep 2
if ls -l /proc/$PID/cwd | grep -q deleted; then echo FATAL_CWD_DELETED_AFTER; exit 1; fi
if [[ ! -d "$APP/.next/standalone/.next/static/chunks" ]]; then echo FATAL_STATIC_GONE; exit 1; fi
pgrep -af 'next build' || echo "no next build running"
echo FINAL_OK