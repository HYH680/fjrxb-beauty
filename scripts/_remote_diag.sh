#!/usr/bin/env bash
set -uo pipefail
echo "=== service ==="
systemctl status ai-supermarket --no-pager | head -20
PID=$(systemctl show -p MainPID --value ai-supermarket)
echo PID=$PID
ls -l /proc/$PID/cwd || true
echo "=== standalone ==="
ls -la /home/ubuntu/ai-supermarket/.next/standalone 2>&1 | head -20
ls -la /home/ubuntu/ai-supermarket/.next/standalone/server.js 2>&1
ls -d /home/ubuntu/ai-supermarket/.next/standalone/.next/static 2>&1
ls -d /home/ubuntu/ai-supermarket/.next/static 2>&1
ls -d /home/ubuntu/ai-supermarket/.next/server 2>&1
echo "=== recent .next ==="
ls -la /home/ubuntu/ai-supermarket/.next | head -30
echo "=== processes ==="
ps aux | grep -E 'next|deploy|rebuild|npm|node' | grep -v grep | head -30
echo "=== open files on standalone ==="
lsof +D /home/ubuntu/ai-supermarket/.next 2>/dev/null | head -20 || true