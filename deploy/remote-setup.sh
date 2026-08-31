#!/usr/bin/env bash
set -euo pipefail

APP=/home/ubuntu/ai-supermarket
NODE=/opt/node20
NODE_VER=v20.19.4

echo "== uploaded files =="
ls -lh /tmp/ai-supermarket.tgz /tmp/ai-supermarket.env /tmp/ai-supermarket.prod.db /tmp/remote-bootstrap.sh /tmp/ai-supermarket.service /tmp/nginx-fjrxb.beauty.conf /tmp/patch-singbox-443.py

echo "== node 20 =="
if [[ ! -x "$NODE/bin/node" ]] || ! "$NODE/bin/node" -v | grep -q '^v20\.'; then
  curl -fsSL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-linux-x64.tar.xz" -o /tmp/node20.tar.xz
  sudo mkdir -p "$NODE"
  sudo tar -xJf /tmp/node20.tar.xz -C "$NODE" --strip-components=1
fi
"$NODE/bin/node" -v
"$NODE/bin/npm" -v

echo "== extract app =="
mkdir -p "$APP"
tar -xzf /tmp/ai-supermarket.tgz -C "$APP"
install -m 600 /tmp/ai-supermarket.env "$APP/.env"
mkdir -p "$APP/prisma"
install -m 644 /tmp/ai-supermarket.prod.db "$APP/prisma/prod.db"
chmod +x /tmp/remote-bootstrap.sh /tmp/patch-singbox-443.py

echo "== free RAM: stop old website node on :3000 if present =="
# Old SPA API; nginx will no longer use it after cutover.
if pid=$(ss -tlnp | awk '/:3000 /{print}'); then
  echo "listeners 3000: $pid"
fi
if pgrep -af 'node /var/www/www.fjrxb.beauty/server' >/dev/null; then
  sudo pkill -f 'node /var/www/www.fjrxb.beauty/server/index.js' || true
  sleep 1
fi
free -h

echo "== bootstrap (npm ci + prisma + build) =="
export PATH="$NODE/bin:$PATH"
bash /tmp/remote-bootstrap.sh

echo "== systemd =="
sudo cp /tmp/ai-supermarket.service /etc/systemd/system/ai-supermarket.service
sudo systemctl daemon-reload
sudo systemctl enable ai-supermarket
sudo systemctl restart ai-supermarket
sleep 2
sudo systemctl --no-pager --full status ai-supermarket || true

echo "== health localhost:3010 =="
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS -o /tmp/next-home.html -w "%{http_code}" http://127.0.0.1:3010/ | tee /tmp/next-code; then
    echo
    break
  fi
  echo "wait $i"
  sleep 2
done
head -c 200 /tmp/next-home.html || true
echo

echo "== setup phase 1 done (app up on 3010). nginx/ssl is a separate step. =="
