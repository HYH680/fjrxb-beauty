// P0 验证：启动 dev server → 请求 /products → 检查图标门面与 Featured 区
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const PORT = 3007;
const REQUEST_TIMEOUT = 1800000;
const READY_TIMEOUT = 900000;

function portOpen(port) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(800);
    const done = (v) => {
      s.destroy();
      resolve(v);
    };
    s.once("connect", () => done(true));
    s.once("error", () => done(false));
    s.once("timeout", () => done(false));
    s.connect(port, "127.0.0.1");
  });
}

function waitForReady(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const timer = setTimeout(() => reject(new Error("timeout waiting for Ready")), timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      child.stdout?.off("data", onOut);
      child.stderr?.off("data", onErr);
      child.off("exit", onExit);
    };
    const onOut = (d) => {
      out += d.toString();
      if (out.includes("Ready")) {
        cleanup();
        resolve(out);
      }
    };
    const onErr = (d) => {
      err += d.toString();
      if (err.includes("EADDRINUSE")) {
        cleanup();
        reject(new Error(`port ${PORT} already in use`));
      }
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`next dev exited before Ready (code ${code}) err=${err.slice(0, 400)}`));
    };
    child.stdout?.on("data", onOut);
    child.stderr?.on("data", onErr);
    child.once("exit", onExit);
  });
}

function fetchPage(pathname, timeoutMs) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port: PORT, path: pathname, timeout: timeoutMs },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "", error: "timeout" });
    });
    req.on("error", (e) => resolve({ status: 0, body: "", error: e.message }));
  });
}

// 关键：不依赖 .bin shim，直接用 node 跑 next 入口
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
if (!fs.existsSync(nextBin)) {
  console.error("next bin missing:", nextBin);
  process.exit(1);
}
const env = { ...process.env, NODE_OPTIONS: "--use-system-ca", PORT: String(PORT) };
let child = null;
let owned = false;

if (await portOpen(PORT)) {
  console.log(`[1/4] reusing dev server already listening on ${PORT}`);
} else {
  console.log("[1/4] starting next dev (webpack) ...");
  const t0 = Date.now();
  child = spawn(
    process.execPath,
    [nextBin, "dev", "--webpack", "-p", String(PORT), "-H", "127.0.0.1"],
    { cwd: projectRoot, env, stdio: ["ignore", "pipe", "pipe"] }
  );
  owned = true;
  child.stdout.on("data", (d) => process.stdout.write(d.toString().trimEnd() + "\n"));
  child.stderr.on("data", (d) => process.stderr.write(d.toString().trimEnd() + "\n"));
  await waitForReady(child, READY_TIMEOUT);
  console.log(`[2/4] dev ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

let failed = false;
try {
  const started = Date.now();
  console.log("      ... requesting /products");
  const res = await fetchPage("/products", REQUEST_TIMEOUT);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (res.status !== 200) {
    failed = true;
    console.log(`[3/5] /products -> FAILED status=${res.status} error=${res.error ?? "-"} (${secs}s)`);
  } else {
    const html = res.body;
    const checks = {
      "P1 编辑精选区块标题（编辑精选/Editors' Picks）": html.includes("编辑精选") || html.includes("Editors' Picks"),
      "P0 热门推荐渐变条 from-violet-500": html.includes("from-violet-500 via-purple-500 to-cyan-500"),
      "P0 热门推荐 6 列网格 lg:grid-cols-6": html.includes("lg:grid-cols-6"),
      "门面按钮 aria-pressed": html.includes("aria-pressed"),
      "毛玻璃容器 shelf-glass": html.includes("shelf-glass"),
      "玻璃内嵌块 shelf-pane": html.includes("shelf-pane"),
      "i18n 文案无未翻译裸 key（catalog.editorsPick 不出现）": !html.includes("catalog.editorsPick"),
    };
    console.log(`[3/5] /products -> 200 OK  (${secs}s, ${html.length} bytes)`);
    for (const [label, ok] of Object.entries(checks)) {
      console.log(`       ${ok ? "PASS" : "FAIL"}  ${label}`);
      if (!ok) failed = true;
    }
    fs.writeFileSync(path.join(projectRoot, "verify-p0.html"), html, "utf8");
    console.log("      saved HTML -> verify-p0.html");
  }

  if (!failed) {
    const t1 = Date.now();
    console.log("      ... requesting /products?view=capability");
    const res2 = await fetchPage("/products?view=capability", REQUEST_TIMEOUT);
    const secs2 = ((Date.now() - t1) / 1000).toFixed(1);
    if (res2.status !== 200) {
      failed = true;
      console.log(`[4/5] /products?view=capability -> FAILED status=${res2.status} (${secs2}s)`);
    } else {
      const html2 = res2.body;
      const checks2 = {
        "P1 行业细分筛选标题（行业细分/By Industry）": html2.includes("行业细分") || html2.includes("By Industry"),
        "P1 全部分类 chip（全部/All）": html2.includes("全部") || html2.includes(">All<"),
        "P1 编辑精选不在能力视图（不应出现）": !(html2.includes("编辑精选") && html2.indexOf("编辑精选") < html2.indexOf("行业细分")),
        "能力视图 hint 文案存在": html2.includes("只看当前在线可用能力") || html2.includes("live capabilities"),
      };
      console.log(`[4/5] /products?view=capability -> 200 OK  (${secs2}s, ${html2.length} bytes)`);
      for (const [label, ok] of Object.entries(checks2)) {
        console.log(`       ${ok ? "PASS" : "FAIL"}  ${label}`);
        if (!ok) failed = true;
      }
      fs.writeFileSync(path.join(projectRoot, "verify-capability.html"), html2, "utf8");
      console.log("      saved HTML -> verify-capability.html");
    }
  }
  console.log("[5/5] done");
} catch (e) {
  failed = true;
  console.error("[error]", e.message);
} finally {
  if (owned && child && failed) {
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 4000);
  } else if (owned && child) {
    console.log(`[note] dev server kept alive (pid=${child.pid}) on http://127.0.0.1:${PORT}`);
    child.unref();
  }
}

process.exit(failed ? 1 : 0);
