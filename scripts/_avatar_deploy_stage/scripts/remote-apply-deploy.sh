#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
APP='/home/ubuntu/ai-supermarket'
mkdir -p "$APP"
# 覆盖式发布：删掉旧 src/public，避免并行半成品孤儿 TSX 卡死 next build
# 保留 data/uploads（用户头像等），勿删
mkdir -p "$APP/data/uploads/avatars"
rm -rf "$APP/src" "$APP/public"
tar -xzf /tmp/ai-supermarket-deploy.tgz -C "$APP" --exclude='.env' --exclude='prisma/prod.db'
# node_modules may have dangling paths mid-install; don't abort deploy on chown noise
chown -R ubuntu:ubuntu "$APP" 2>/dev/null || true
cd "$APP"
if [[ ! -f .env ]]; then
  echo "MISSING $APP/.env — abort"
  exit 1
fi
python3 - <<'PY'
from pathlib import Path
import re
p = Path("/home/ubuntu/ai-supermarket") / ".env"
text = p.read_text(encoding="utf-8")
want = 'DATABASE_URL="file:/home/ubuntu/ai-supermarket/prisma/prod.db"'
new = re.sub(r'^DATABASE_URL=.*$', want, text, count=1, flags=re.M)
if 'DATABASE_URL=' not in new:
    new = new.rstrip() + "\n" + want + "\n"
p.write_text(new, encoding="utf-8")
print("DATABASE_URL ok")
PY
chown ubuntu:ubuntu "$APP/.env"

sudo -u ubuntu -H bash -lc '
set -euo pipefail
export PATH=/opt/nodejs/bin:$PATH
cd /home/ubuntu/ai-supermarket
npm ci --no-audit --no-fund
npx prisma generate
npx prisma db push
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
# Turbopack 有时不产出 standalone；生产必须有 .next/standalone/server.js
# Keep previous standalone while building so the live process (cwd on standalone)
# can still serve /_next/static until we restart onto the new tree.
KEEP_STANDALONE=""
if [[ -f .next/standalone/server.js ]]; then
  KEEP_STANDALONE=".next/standalone.keep.$$"
  cp -a .next/standalone "$KEEP_STANDALONE"
fi
if ! npx next build --webpack; then
  echo "webpack build failed; retry default next build"
  npm run build
fi
if [[ ! -f .next/standalone/server.js ]]; then
  echo "FATAL: .next/standalone/server.js missing after build"
  if [[ -n "$KEEP_STANDALONE" && -d "$KEEP_STANDALONE" ]]; then
    rm -rf .next/standalone
    mv "$KEEP_STANDALONE" .next/standalone
    echo "restored previous standalone"
  fi
  ls -la .next | head -40
  exit 1
fi
if [[ -n "$KEEP_STANDALONE" && -d "$KEEP_STANDALONE" ]]; then
  rm -rf "$KEEP_STANDALONE"
fi
mkdir -p .next/standalone/.next
rm -rf .next/standalone/public .next/standalone/.next/static .next/standalone/.next/server
# standalone 有时缺页面 manifest；用完整 .next/server 覆盖
cp -a .next/server .next/standalone/.next/server
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
chunk_n=$(find .next/standalone/.next/static/chunks -type f 2>/dev/null | wc -l | tr -d " ")
if [[ "${chunk_n}" -lt 5 ]]; then
  echo "FATAL: standalone static chunks too few (${chunk_n})"
  exit 1
fi
echo "standalone chunks=${chunk_n}"
if [[ ! -f .next/standalone/public/catalog/watermarks-remover.svg ]]; then
  echo "FATAL: watermarks-remover.svg missing from standalone public"
  exit 1
fi
mkdir -p .next/standalone/prisma
if [[ -f prisma/prod.db ]]; then
  cp -a prisma/prod.db .next/standalone/prisma/prod.db
fi
chown -R ubuntu:ubuntu .next/standalone
'

sudo systemctl restart ai-supermarket
sleep 2
sudo systemctl --no-pager --full status ai-supermarket | head -20
curl -sS -o /dev/null -w "local3010=%{http_code}\n" http://127.0.0.1:3010/
curl -sk -o /dev/null -w "https_local=%{http_code}\n" --resolve fjrxb.beauty:443:127.0.0.1 https://fjrxb.beauty/
if ! grep -Rqs '自媒体' .next/standalone/.next/static/chunks 2>/dev/null; then
  echo "WARN: 自媒体 not found in standalone chunks (check product-meta)"
fi
echo "deploy apply done"
