#!/bin/bash
# One-time SSH setup for Cursor Remote-SSH (Ubuntu Live USB + persistence).
set -euo pipefail

echo "=== Cursor Remote SSH 一次性配置 ==="

if ! id ubuntu &>/dev/null; then
  echo "当前用户不是 ubuntu Live 环境，请用试用 Ubuntu 启动后再运行。"
  exit 1
fi

if ! sudo passwd -S ubuntu 2>/dev/null | grep -q P; then
  echo ""
  echo "请先为 ubuntu 设置 SSH 登录密码（不能为空）："
  sudo passwd ubuntu
fi

echo "==> 安装 openssh-server..."
sudo apt update
sudo apt install -y openssh-server

echo "==> 允许密码登录..."
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?KbdInteractiveAuthentication.*/KbdInteractiveAuthentication yes/' /etc/ssh/sshd_config
grep -q '^PasswordAuthentication yes' /etc/ssh/sshd_config || echo 'PasswordAuthentication yes' | sudo tee -a /etc/ssh/sshd_config

sudo systemctl enable ssh 2>/dev/null || true
sudo systemctl restart ssh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBKEY="$SCRIPT_DIR/windows-ssh.pub"
if [ -f "$PUBKEY" ]; then
  echo "==> 安装 Windows 公钥（免密登录 Cursor）..."
  mkdir -p ~/.ssh
  chmod 700 ~/.ssh
  grep -qF "$(cat "$PUBKEY")" ~/.ssh/authorized_keys 2>/dev/null || cat "$PUBKEY" >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
fi

IP="$(hostname -I | awk '{print $1}')"
echo ""
echo "=== 完成 ==="
echo "Ubuntu IP: ${IP:-未知}"
echo ""
echo "在 Windows Cursor 中："
echo "  1. Ctrl+Shift+P -> Remote-SSH: Connect to Host"
echo "  2. 输入: ubuntu@${IP:-<填IP>}"
echo "  3. 打开文件夹: /media/ubuntu/E-Projects/ai-supermarket"
echo ""
echo "或在 Windows PowerShell 测试:"
echo "  ssh ubuntu@${IP:-<填IP>}"
