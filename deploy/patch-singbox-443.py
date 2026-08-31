#!/usr/bin/env python3
"""Move sing-box Reality inbound off 443 so Nginx can terminate HTTPS."""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

PATH = Path("/etc/sing-box/config.json")
BACKUP = Path("/etc/sing-box/config.json.bak-website-443")
NEW_PORT = 8444


def main() -> int:
    if not PATH.exists():
        print("missing", PATH, file=sys.stderr)
        return 1
    if not BACKUP.exists():
        shutil.copy2(PATH, BACKUP)
        print("backup", BACKUP)
    data = json.loads(PATH.read_text(encoding="utf-8"))
    changed = False
    for inbound in data.get("inbounds", []):
        if inbound.get("tag") == "vless-reality" and inbound.get("listen_port") == 443:
            inbound["listen_port"] = NEW_PORT
            changed = True
    if not changed:
        print("no vless-reality:443 inbound to patch (already moved?)")
        return 0
    PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("patched vless-reality listen_port ->", NEW_PORT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
