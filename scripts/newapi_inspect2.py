import sqlite3
DB = r"C:\Users\ZhuanZ(无密码)\Projects\ai-supermarket\newapi\one-api.db"
c = sqlite3.connect(DB)
print("=== vendors ===")
try:
    for r in c.execute("PRAGMA table_info(vendors)").fetchall():
        print(r)
    for r in c.execute("SELECT * FROM vendors LIMIT 50").fetchall():
        print(r)
except Exception as e:
    print("vendors err:", e)
print("=== models table ===")
try:
    for r in c.execute("PRAGMA table_info(models)").fetchall():
        print(r)
    rows = c.execute("SELECT * FROM models LIMIT 20").fetchall()
    for r in rows:
        print(r)
except Exception as e:
    print("models err:", e)
print("=== abilities (sample) ===")
try:
    for r in c.execute("PRAGMA table_info(abilities)").fetchall():
        print(r)
    for r in c.execute("SELECT * FROM abilities LIMIT 30").fetchall():
        print(r)
except Exception as e:
    print("abilities err:", e)
