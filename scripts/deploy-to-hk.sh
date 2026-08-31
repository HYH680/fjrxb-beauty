#!/usr/bin/env bash
# Create deploy tarball and apply on HK (run from repo root via Git Bash or WSL).
# Windows: use scripts/deploy-prod.mjs instead.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@119.28.45.212}"
OUT="/tmp/ai-supermarket-deploy.tgz"
cd "$ROOT"
tar -czf "$OUT" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='prisma/prod.db' \
  --exclude='prisma/*.db' \
  --exclude='scripts/.newapi*' \
  --exclude='scripts/.letta*' \
  .
echo "packed $OUT"
scp -o BatchMode=yes "$OUT" "$HOST:/tmp/ai-supermarket-deploy.tgz"
scp -o BatchMode=yes "$ROOT/scripts/remote-apply-deploy.sh" "$HOST:/tmp/ai-supermarket-remote-apply.sh"
ssh -o BatchMode=yes "$HOST" "bash /tmp/ai-supermarket-remote-apply.sh"
