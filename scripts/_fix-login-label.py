from pathlib import Path

header = Path("/home/ubuntu/ai-supermarket/src/components/Header.tsx")
t = header.read_text(encoding="utf-8")
old = '{t("nav.opened")}'
# Only replace the account/login CTA occurrence (last nav link)
if t.count(old) < 1:
    raise SystemExit(f"opened token missing: {t.count(old)}")
# Replace specifically in the login/account CTA block
needle = 'href={user ? "/account" : "/login"}'
idx = t.find(needle)
if idx < 0:
    raise SystemExit("cta href not found")
# find t("nav.opened") after this href
j = t.find('{t("nav.opened")}', idx)
if j < 0:
    raise SystemExit("opened label after cta not found")
t = t[:j] + '{user ? t("nav.opened") : t("nav.login")}' + t[j + len('{t("nav.opened")}') :]
header.write_text(t, encoding="utf-8")
print("header_ok")

messages = Path("/home/ubuntu/ai-supermarket/src/lib/i18n/messages.ts")
m = messages.read_text(encoding="utf-8")
m2 = m.replace('"nav.login": "登入"', '"nav.login": "登录"', 1)
if m2 == m:
    raise SystemExit("登入 not found in messages")
messages.write_text(m2, encoding="utf-8")
print("messages_ok")
