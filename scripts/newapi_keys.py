import sqlite3
DB = r"C:\Users\ZhuanZ(无密码)\Projects\ai-supermarket\newapi\one-api.db"
c = sqlite3.connect(DB)
for r in c.execute("SELECT id, name, type, base_url, key, models FROM channels").fetchall():
    print(f"id={r[0]} name={r[1]} type={r[2]} base={r[3]} keylen={len(r[4]) if r[4] else 0} models={r[5]}")
