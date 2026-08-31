"""下载并修复 eslint@9.39.5：只补缺失文件，os.replace 原子覆盖"""
import os, time, urllib.request, tarfile

VERSION = "9.39.5"
URL = f"https://cdn.npmmirror.com/packages/eslint/{VERSION}/eslint-{VERSION}.tgz"
TGZ = r"E:\ai-supermarket\_eslint-pkg.tgz"
DEST = r"E:\ai-supermarket\node_modules\eslint"

print("downloading", URL, flush=True)
t0 = time.time()
urllib.request.urlretrieve(URL, TGZ)
print(f"downloaded {os.path.getsize(TGZ)} bytes in {time.time()-t0:.0f}s", flush=True)

start = time.time()
with tarfile.open(TGZ, "r:gz") as tf:
    members = tf.getmembers()
    by_name = {m.name: m for m in members}
    missing = []
    for m in members:
        parts = m.name.split("/", 1)
        if len(parts) < 2 or not parts[1]:
            continue
        rel = parts[1].replace("/", os.sep)
        target = os.path.join(DEST, rel)
        if m.isdir():
            os.makedirs(target, exist_ok=True)
            continue
        if m.issym() or m.islnk():
            continue
        if os.path.exists(target) and os.path.getsize(target) == m.size:
            continue
        missing.append(rel)
    print(f"missing: {len(missing)}", flush=True)
    written, errs = 0, []
    for rel in missing:
        m = by_name["package/" + rel.replace(os.sep, "/")]
        target = os.path.join(DEST, rel)
        try:
            os.makedirs(os.path.dirname(target), exist_ok=True)
            src = tf.extractfile(m)
            if src is None:
                continue
            tmp = target + ".wb-tmp"
            with open(tmp, "wb") as f:
                while True:
                    chunk = src.read(1 << 20)
                    if not chunk:
                        break
                    f.write(chunk)
            os.replace(tmp, target)
            written += 1
        except Exception as e:
            errs.append((rel, str(e)))
    print(f"done: written={written}, errors={len(errs)}, elapsed={time.time()-start:.0f}s", flush=True)
    for name, e in errs[:10]:
        print("  ERR", name, e)
