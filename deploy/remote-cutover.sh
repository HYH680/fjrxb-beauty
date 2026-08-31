#!/usr/bin/env bash
set -euo pipefail
APP=/home/ubuntu/ai-supermarket
export PATH=/opt/nodejs/bin:$PATH

sed -i 's/\r$//' /tmp/ai-supermarket.service /tmp/nginx-fjrxb.beauty.conf /tmp/patch-singbox-443.py

echo "== absolute sqlite url =="
python3 - <<'PY'
from pathlib import Path
p = Path("/home/ubuntu/ai-supermarket/.env")
text = p.read_text(encoding="utf-8")
old = 'DATABASE_URL="file:./prod.db"'
new = 'DATABASE_URL="file:/home/ubuntu/ai-supermarket/prisma/prod.db"'
if old in text:
    p.write_text(text.replace(old, new), encoding="utf-8")
    print("updated DATABASE_URL")
else:
    print("DATABASE_URL already custom")
    for line in text.splitlines():
        if line.startswith("DATABASE_URL="):
            print(line)
            break
PY

echo "== standalone layout =="
ls -la "$APP/.next/standalone/server.js"
ls -d "$APP/.next/standalone/public" "$APP/.next/standalone/.next/static" || true
mkdir -p "$APP/.next/standalone/prisma" "$APP/.next/standalone/.next"
if [[ ! -d $APP/.next/standalone/public ]]; then cp -a "$APP/public" "$APP/.next/standalone/public"; fi
if [[ ! -d $APP/.next/standalone/.next/static ]]; then cp -a "$APP/.next/static" "$APP/.next/standalone/.next/static"; fi
cp -a "$APP/prisma/prod.db" "$APP/.next/standalone/prisma/prod.db"
cp -a "$APP/prisma/schema.prisma" "$APP/.next/standalone/prisma/schema.prisma"

echo "== restart next standalone =="
sudo cp /tmp/ai-supermarket.service /etc/systemd/system/ai-supermarket.service
sudo sed -i 's/\r$//' /etc/systemd/system/ai-supermarket.service
sudo systemctl daemon-reload
sudo systemctl restart ai-supermarket
sleep 2
sudo systemctl --no-pager --full status ai-supermarket | head -25
curl -sS -o /dev/null -w "local3010=%{http_code}\n" http://127.0.0.1:3010/

echo "== move sing-box off 443 =="
sudo python3 /tmp/patch-singbox-443.py
sudo systemctl restart sing-box
sleep 1
sudo systemctl --no-pager --full status sing-box | head -20
echo "listeners after sing-box restart:"
sudo ss -tlnp | grep -E ':443|:8444|:80|:3010' || true

echo "== nginx site =="
sudo cp /etc/nginx/sites-available/fjrxb /etc/nginx/sites-available/fjrxb.bak-before-next
sudo cp /tmp/nginx-fjrxb.beauty.conf /etc/nginx/sites-available/fjrxb
sudo nginx -t
sudo systemctl reload nginx
echo "listeners after nginx:"
sudo ss -tlnp | grep -E ':443|:8444|:80|:3010' || true

echo "== public https =="
curl -sS -o /tmp/pub.html -w "https_apex=%{http_code} err=%{errormsg}\n" --connect-timeout 15 https://fjrxb.beauty/ || true
curl -sS -o /dev/null -w "https_www=%{http_code}\n" --connect-timeout 15 https://www.fjrxb.beauty/ || true
curl -sS -o /dev/null -w "http_redirect=%{http_code} loc=%{redirect_url}\n" --connect-timeout 15 http://fjrxb.beauty/ || true
head -c 180 /tmp/pub.html || true
echo
