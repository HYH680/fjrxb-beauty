#!/usr/bin/env bash
set -euo pipefail
# Smoke-test public pages on prod (localhost via nginx resolve)
BASE="${1:-https://fjrxb.beauty}"
RESOLVE=(--resolve fjrxb.beauty:443:127.0.0.1)
for path in / /chat /products /login /home; do
  code=$(curl -sk "${RESOLVE[@]}" -o /dev/null -w "%{http_code}" "$BASE$path")
  echo "$path $code"
done
# CSS from homepage must 200
css=$(curl -sk "${RESOLVE[@]}" "$BASE/" | grep -oE '/_next/static/chunks/[^" ]+\.css' | head -1)
if [[ -n "$css" ]]; then
  c=$(curl -sk "${RESOLVE[@]}" -o /dev/null -w "%{http_code}" "$BASE$css")
  echo "css $css $c"
else
  echo "css MISSING"
  exit 1
fi
echo SMOKE_OK
