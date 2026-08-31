"""通用 npm 包修复：从 cdn.npmmirror 直链下载 tarball，断点续传解压到指定目录。
用法: python _repair-pkg.py <name> <version> [dest_rel]
- 跳过已存在、大小一致且非 0xFF 填充的文件
- os.replace 原子覆盖，绝不调 os.remove（避开 safe-delete shim）
"""
import os, sys, time, urllib.request, tarfile

name, version = sys.argv[1], sys.argv[2]
dest_rel = sys.argv[3] if len(sys.argv) > 3 else f"node_modules/{name}"
ROOT = r"E:\ai-supermarket"
TGZ = os.path.join(ROOT, "_pkg-" + name.replace("/", "__") + ".tgz")
DEST = os.path.join(ROOT, dest_rel)
CHECK = b"\xff" * 16

url = f"https://cdn.npmmirror.com/packages/{name}/{version}/{name.split('/')[-1]}-{version}.tgz"
if not os.path.exists(TGZ) or os.path.getsize(TGZ) < 1024:
    print(f"downloading {url}", flush=True)
    for attempt in range(3):
        try:
            urllib.request.urlretrieve(url, TGZ + ".dl")
            os.replace(TGZ + ".dl", TGZ)
            break
        except Exception as e:
            print(f"  dl attempt {attempt+1} failed: {e}", flush=True)
            time.sleep(2)
print(f"tarball: {os.path.getsize(TGZ)} bytes", flush=True)

start = time.time()
with tarfile.open(TGZ, "r:gz") as tf:
    members = tf.getmembers()
    # 自适应根目录前缀（通常为 package/，个别包如 @types/node 是 "node v20.19/"）
    roots = {m.name.split("/", 1)[0] for m in members if "/" in m.name}
    prefix = (next(iter(roots)) + "/") if len(roots) == 1 else ""
    todo = []
    for m in members:
        if prefix and m.name.startswith(prefix):
            rel = m.name[len(prefix):]
        elif prefix:
            continue
        else:
            rel = m.name  # 平铺 tarball 兜底
        if not rel:
            continue
        if m.isdir() or m.issym() or m.islnk():
            continue
        todo.append((m, rel, m.size))
    total = len(todo)
    print(f"files to write: {total} (prefix={prefix!r})", flush=True)

    written, errs = 0, []
    for i, (m, rel, size) in enumerate(todo):
        target = os.path.join(DEST, rel.replace("/", os.sep))
        try:
            if os.path.exists(target) and os.path.getsize(target) == size:
                with open(target, "rb") as f:
                    head = f.read(16)
                if len(head) >= 16 and head != CHECK:
                    continue
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
        if (i + 1) % 500 == 0:
            print(f"  {i+1}/{total} written={written} errs={len(errs)} elapsed={time.time()-start:.0f}s", flush=True)
    print(f"done: written={written}, errors={len(errs)}, total={total}, elapsed={time.time()-start:.0f}s", flush=True)
    for n, e in errs[:10]:
        print("  ERR", n, e)
