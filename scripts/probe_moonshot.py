import sqlite3, json, urllib.request, urllib.error
DB = r"C:\Users\ZhuanZ(无密码)\Projects\ai-supermarket\newapi\one-api.db"
c = sqlite3.connect(DB)
row = c.execute("SELECT key FROM channels WHERE id=5").fetchone()
k = row[0]
print("kimi key len:", len(k))
# probe moonshot models
req = urllib.request.Request("https://api.moonshot.cn/v1/models", headers={"Authorization": "Bearer " + k})
try:
    with urllib.request.urlopen(req, timeout=15) as r:
        obj = json.loads(r.read().decode())
        print("moonshot models count:", len(obj.get("data", [])))
        for m in obj.get("data", []):
            print("  ", m.get("id"))
except urllib.error.HTTPError as e:
    print("moonshot models err:", e.code, e.read().decode()[:300])
