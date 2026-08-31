import sqlite3, json, urllib.request, urllib.error

DB = r"C:\Users\ZhuanZ(无密码)\Projects\ai-supermarket\newapi\one-api.db"
GW = "http://localhost:3001"
ARK_KEY = "ark-YOUR_KEY_HERE"

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

# login
login = api("POST", "/api/user/login", {"username": "admin", "password": "YOUR_PASSWORD_HERE"})
tok = login["data"]["access_token"]
print("login ok, token len", len(tok))

def update_channel(cid, new_models):
    ch = api("GET", f"/api/channel/{cid}", token=tok)["data"]
    ch["key"] = keys[cid]
    ch["models"] = new_models
    # status field is rejected by UpdateChannel; remove read-only fields
    for f in ["status", "created_time", "test_time", "response_time", "balance", "balance_updated_time", "used_quota"]:
        ch.pop(f, None)
    res = api("PUT", "/api/channel/", ch, token=tok)
    print(f"  update channel {cid} ({ch['name']}): success={res.get('success')} msg={res.get('message','')}")
    return res

print("=== update deepseek (add v4-pro) ===")
update_channel(1, "deepseek-chat,deepseek-v4-pro")

print("=== update qwen (add qwen3.8-max + kimi/kimi-k3) ===")
update_channel(2, "qwen-plus,qwen3.8-max,kimi/kimi-k3")

print("=== create doubao channel (type 45) ===")
doubao = {
    "mode": "single",
    "channel": {
        "type": 45,
        "name": "doubao",
        "key": ARK_KEY,
        "base_url": "https://ark.cn-beijing.volces.com",
        "models": "doubao-seed-2-1-pro-260628,doubao-seed-2-0-pro-260215",
        "group": "default",
        "status": 1,
        "weight": 0,
        "priority": 0,
    },
}
res = api("POST", "/api/channel/", doubao, token=tok)
print(f"  create doubao: success={res.get('success')} msg={res.get('message','')} data={res.get('data','')}")
