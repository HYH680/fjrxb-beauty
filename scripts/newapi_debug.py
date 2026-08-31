import sqlite3, json, urllib.request, urllib.error

DB = r"C:\Users\ZhuanZ(无密码)\Projects\ai-supermarket\newapi\one-api.db"
GW = "http://localhost:3001"
c = sqlite3.connect(DB)
keys = {r[0]: r[1] for r in c.execute("SELECT id, key FROM channels").fetchall()}

def api(method, path, body=None, token=None):
    url = GW + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"_http_error": e.code, "_body": e.read().decode()}

login = api("POST", "/api/user/login", {"username": "admin", "password": "hyhzuishuai723"})
tok = login["data"]["access_token"]

# Inspect channel 1 full object
ch = api("GET", "/api/channel/1", token=tok)["data"]
print("channel 1 id field:", ch.get("id"), "name:", ch.get("name"))
print("keys in ch:", list(ch.keys())[:20])
