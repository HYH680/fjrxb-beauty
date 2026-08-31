#!/usr/bin/env python3
from pathlib import Path
p = Path("/home/ubuntu/ai-supermarket/src/components/ChatAssistant.tsx")
b = p.read_bytes()
b.decode("utf-8")
print("remote_utf8_ok", len(b))
