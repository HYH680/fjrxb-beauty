#!/usr/bin/env bash
set -euo pipefail
APP=/home/ubuntu/ai-supermarket
NODE=/opt/nodejs
NODE_VER=v22.18.0

sed -i 's/\r$//' /tmp/remote-bootstrap.sh /tmp/ai-supermarket.service || true

echo "== node 22 =="
if [[ ! -x "$NODE/bin/node" ]] || ! "$NODE/bin/node" -v | grep -q '^v22\.'; then
  curl -fsSL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-linux-x64.tar.xz" -o /tmp/node22.tar.xz
  sudo mkdir -p "$NODE"
  sudo tar -xJf /tmp/node22.tar.xz -C "$NODE" --strip-components=1
fi
export PATH="$NODE/bin:$PATH"
node -v
npm -v

echo "== reinstall modules with node 22 =="
cd "$APP"
rm -rf node_modules
npm ci --no-audit --no-fund

echo "== prisma + build =="
npx prisma generate
npx prisma db push
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
npm run build

if [[ -d .next/standalone ]]; then
  mkdir -p .next/standalone/.next
  cp -a public .next/standalone/public
  cp -a .next/static .next/standalone/.next/static
fi

echo "== systemd =="
sudo cp /tmp/ai-supermarket.service /etc/systemd/system/ai-supermarket.service
sudo sed -i 's/\r$//' /etc/systemd/system/ai-supermarket.service
sudo systemctl daemon-reload
sudo systemctl enable ai-supermarket
sudo systemctl restart ai-supermarket
sleep 3
sudo systemctl --no-pager --full status ai-supermarket || true

echo "== health localhost:3010 =="
code=000
for i in $(seq 1 15); do
  code=$(curl -sS -o /tmp/next-home.html -w "%{http_code}" http://127.0.0.1:3010/ || true)
  echo "try $i -> $code"
  if [[ "$code" == "200" || "$code" == "307" || "$code" == "308" ]]; then
    break
  fi
  sleep 2
done
head -c 240 /tmp/next-home.html || true
echo
echo "final_http=$code"
