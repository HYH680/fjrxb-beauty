import sqlite3, sys

DB = r"C:\Users\ZhuanZ(无密码)\Projects\ai-supermarket\newapi\one-api.db"
c = sqlite3.connect(DB)
print("=== tables ===")
for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
    print(r)
print("=== users schema ===")
for r in c.execute("PRAGMA table_info(users)").fetchall():
    print(r)
print("=== admin users ===")
for r in c.execute("SELECT id, username, role, status, password FROM users WHERE role>=10").fetchall():
    print(r)
print("=== channels ===")
try:
    for r in c.execute("SELECT id, name, type, status, base_url, models FROM channels").fetchall():
        print(r)
except Exception as e:
    print("channels err:", e)
print("=== tokens ===")
try:
    for r in c.execute("SELECT id, name, status, key, remain_quota, unlimited_quota FROM tokens").fetchall():
        print(r)
except Exception as e:
    print("tokens err:", e)
