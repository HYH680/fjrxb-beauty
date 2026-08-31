#!/bin/bash
# Portable dev bootstrap for G-disk Ubuntu + E-disk projects.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT"

echo "==> Project: $PROJECT"

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node 20, git, docker..."
  sudo apt update
  sudo apt install -y curl git docker.io docker-compose-plugin ca-certificates gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  sudo usermod -aG docker "$USER" || true
  sudo systemctl enable --now docker 2>/dev/null || sudo service docker start 2>/dev/null || true
  echo ""
  echo "Node installed. Log out and back in (or: newgrp docker), then run this script again."
  exit 0
fi

if [ ! -d node_modules ] || [ ! -f node_modules/.package-lock.json ]; then
  echo "==> npm ci (first run may take a while on USB)..."
  rm -rf node_modules .next
  npm ci
fi

if [ -f prisma/schema.prisma ]; then
  npx prisma generate
fi

if [ -f docker-compose.newapi.yml ]; then
  docker compose -f docker-compose.newapi.yml up -d || true
  npm run newapi:sync 2>/dev/null || true
fi

echo "==> Starting dev server: http://localhost:3000"
npm run dev
