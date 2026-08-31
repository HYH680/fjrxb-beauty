#!/bin/bash
set -euo pipefail

mkdir -p /etc/tinyproxy /etc/systemd/system/tinyproxy.service.d /var/log/tinyproxy
if [ -f /etc/tinyproxy/tinyproxy.conf ]; then
  cp -a /etc/tinyproxy/tinyproxy.conf "/etc/tinyproxy/tinyproxy.conf.bak.$(date +%s)"
fi

cat > /etc/tinyproxy/tinyproxy.conf <<'EOF'
User tinyproxy
Group tinyproxy
Port 8118
Listen 10.0.0.1
Timeout 600
DefaultErrorFile "/usr/share/tinyproxy/default.html"
StatFile "/usr/share/tinyproxy/stats.html"
LogFile "/var/log/tinyproxy/tinyproxy.log"
LogLevel Info
PidFile "/run/tinyproxy/tinyproxy.pid"
MaxClients 100
Allow 10.0.0.0/24
ViaProxyName "tinyproxy"
DisableViaHeader Yes
EOF

cat > /etc/systemd/system/tinyproxy.service.d/after-wg.conf <<'EOF'
[Unit]
After=wg-quick@wg0.service
Requires=wg-quick@wg0.service
EOF

python3 - <<'PY'
from pathlib import Path
p = Path("/etc/wireguard/wg0.conf")
text = p.read_text()
text2 = text.replace("Address = 10.66.66.1/24", "Address = 10.0.0.1/24")
if text2 != text:
    p.write_text(text2)
    print("wg0_address_updated")
else:
    print("wg0_address_ok")
PY

systemctl daemon-reload
systemctl enable tinyproxy
systemctl restart tinyproxy
systemctl is-active tinyproxy
ss -lnt | grep 8118 || true
echo "DONE"
