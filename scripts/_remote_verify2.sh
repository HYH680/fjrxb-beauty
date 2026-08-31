#!/usr/bin/env bash
set -uo pipefail
chunk=$(find /home/ubuntu/ai-supermarket/.next/standalone/.next/static/chunks -type f -name '*.js' | head -1)
echo "chunk=$chunk"
rel=${chunk#*/.next/static}
echo "rel=$rel"
code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3010/_next/static${rel}")
echo "local_static=${code}"
# also try a known pattern from build-manifest
js=$(python3 - <<'PY'
from pathlib import Path
p=Path('/home/ubuntu/ai-supermarket/.next/standalone/.next/static/chunks')
files=sorted(p.glob('*.js'))
print(files[0].name if files else '')
PY
)
echo "js=$js"
code2=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3010/_next/static/chunks/${js}")
echo "local_static_chunk=${code2}"
for u in / /cart /api/catalog /catalog/watermarks-remover.svg /_next/static/chunks/${js}; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --resolve fjrxb.beauty:443:127.0.0.1 "https://fjrxb.beauty${u}")
  echo "https_local${u}=${code}"
done
echo "dns_google=$(dig +short fjrxb.beauty A @8.8.8.8 | tr '\n' ' ')"
echo "dns_www=$(dig +short www.fjrxb.beauty A @8.8.8.8 | tr '\n' ' ')"
echo "dns_dnspod=$(dig +short fjrxb.beauty A @119.29.29.29 | tr '\n' ' ')"
PID=$(systemctl show -p MainPID --value ai-supermarket)
echo "cwd=$(readlink /proc/$PID/cwd)"
echo "deleted=$(ls -l /proc/$PID/cwd | grep -c deleted || true)"
systemctl is-active ai-supermarket
echo VERIFY2_DONE