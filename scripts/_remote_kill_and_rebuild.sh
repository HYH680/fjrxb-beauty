#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP=/home/ubuntu/ai-supermarket

echo "=== kill competing builds ==="
# Kill stuck remote-apply / next build under ai-supermarket (not the live next-server on 3010)
pkill -f '/tmp/ai-supermarket-remote-apply' 2>/dev/null || true
pkill -f '/tmp/_remote_fix_standalone' 2>/dev/null || true
# kill npm/next build workers for this app
for p in $(pgrep -f 'next build' || true); do
  echo "kill next-build pid=$p"
  kill -9 "$p" 2>/dev/null || true
done
for p in $(pgrep -f 'npm exec next' || true); do
  echo "kill npm-exec pid=$p"
  kill -9 "$p" 2>/dev/null || true
done
for p in $(pgrep -f 'npm ci --no-audit' || true); do
  echo "kill npm-ci pid=$p"
  kill -9 "$p" 2>/dev/null || true
done
# kill the sudo wrapper running remote-apply body
for p in $(pgrep -f 'KEEP_STANDALONE' || true); do
  echo "kill apply-body pid=$p"
  kill -9 "$p" 2>/dev/null || true
done
sleep 2
ps aux | grep -E 'next build|KEEP_STANDALONE|remote-apply' | grep -v grep || echo "no competing builds"

# Preserve secrets
cp -a "$APP/.env" /tmp/ai-sm.env.bak
cp -a "$APP/prisma/prod.db" /tmp/ai-sm.prod.db.bak

# Clear lock if any
rm -f "$APP/.next/lock"

sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
export NODE_ENV=production
export NODE_OPTIONS=--max-old-space-size=1536
# Ensure server-only present
node -e "require(\"server-only\")" 2>/dev/null || npm install server-only@0.0.1 --no-audit --no-fund --save
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

# Ensure no new build races in for 5s
sleep 2
if pgrep -f 'next build' >/dev/null; then
  echo "WARN: another next build appeared; killing"
  pkill -9 -f 'next build' || true
fi

PID=$(systemctl show -p MainPID --value ai-supermarket)
echo PID=$PID
ls -l /proc/$PID/cwd
readlink /proc/$PID/cwd
test -f "$APP/.next/standalone/server.js"
test -d "$APP/.next/standalone/.next/static/chunks"
chunk=$(find "$APP/.next/standalone/.next/static/chunks" -type f -name "*.js" | head -1)
rel=${chunk#*/.next/static}
echo "sample_static=$rel"
curl -sS -o /dev/null -w "local_root=%{http_code}\n" http://127.0.0.1:3010/
curl -sS -o /dev/null -w "local_cart=%{http_code}\n" http://127.0.0.1:3010/cart
curl -sS -o /dev/null -w "local_catalog=%{http_code}\n" http://127.0.0.1:3010/api/catalog
curl -sS -o /dev/null -w "local_svg=%{http_code}\n" http://127.0.0.1:3010/catalog/watermarks-remover.svg
curl -sS -o /dev/null -w "local_static=%{http_code}\n" "http://127.0.0.1:3010/_next/static${rel}"
# cwd must NOT be deleted
if ls -l /proc/$PID/cwd | grep -q deleted; then
  echo FATAL_CWD_DELETED
  exit 1
fi
echo FINAL_OK