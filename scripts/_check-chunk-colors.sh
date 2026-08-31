#!/usr/bin/env bash
set -euo pipefail
cd /home/ubuntu/ai-supermarket/.next/standalone/.next/static/chunks
for f in 2561-*.js 7428-*.js app/chat/page-*.js; do
  echo "=== $f"
  grep -oE '3b82f6|7c5cff|2563eb|8b6dff' $f 2>/dev/null | sort | uniq -c || true
done
