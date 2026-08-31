#!/usr/bin/env bash
set -euo pipefail
APP=/home/ubuntu/ai-supermarket
NODE=/opt/nodejs
export PATH="$NODE/bin:$PATH"

echo "== node =="
if [[ ! -x "$NODE/bin/node" ]]; then
  echo "Node missing at $NODE"
  exit 1
fi
node -v
npm -v

echo "== install =="
cd "$APP"
if [[ ! -d node_modules ]]; then
  npm ci --no-audit --no-fund
fi

echo "== prisma =="
npx prisma generate
npx prisma db push

echo "== build =="
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
npm run build

echo "== standalone assets =="
if [[ -d .next/standalone ]]; then
  mkdir -p .next/standalone/.next
  cp -a public .next/standalone/public
  cp -a .next/static .next/standalone/.next/static
fi

echo "== done bootstrap =="
