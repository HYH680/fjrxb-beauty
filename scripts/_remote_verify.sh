#!/usr/bin/env bash
set -euo pipefail
echo "=== local ==="
for u in / /api/catalog /cart /catalog/watermarks-remover.svg /catalog/ai-self-media.svg /catalog/brand-visual.svg; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3010${u}")
  echo "local${u}=${code}"
done
chunk=$(find /home/ubuntu/ai-supermarket/.next/standalone/.next/static/chunks -type f -name '*.js' | head -1)
rel=${chunk#*/.next/static}
code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3010/_next/static${rel}")
echo "local/_next/static${rel}=${code}"
echo "=== public via resolve ==="
for u in / /cart /api/catalog /catalog/watermarks-remover.svg; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --resolve fjrxb.beauty:443:127.0.0.1 "https://fjrxb.beauty${u}")
  echo "https_local${u}=${code}"
done
echo "=== dns dig ==="
dig +short fjrxb.beauty A @8.8.8.8 || true
dig +short www.fjrxb.beauty A @8.8.8.8 || true
dig +short fjrxb.beauty A @119.29.29.29 || true
echo "=== cwd ==="
PID=$(systemctl show -p MainPID --value ai-supermarket)
ls -l /proc/$PID/cwd
echo VERIFY_DONE