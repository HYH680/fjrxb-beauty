import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const PORT = 3007;
const TARGETS = ["/products"];
// 设得足够长：中途 destroy 请求会让 dev server 抛 EPIPE 未捕获异常而进入坏状态
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
    const timer = setTimeout(
      () => reject(new Error("timeout waiting for Ready")),
      timeoutMs
    );
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
      reject(
        new Error(`next dev exited before Ready (code ${code}) err=${err.slice(0, 400)}`)
      );
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
        res.on("data", (c) => {
          body += c;
        });
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

const env = { ...process.env, NODE_OPTIONS: "--use-system-ca", PORT: String(PORT) };
let child = null;
let owned = false;

// 复用已在跑的 dev server，避免每次都丢弃 webpack 缓存重新冷启动
if (await portOpen(PORT)) {
  console.log(`[1/4] reusing dev server already listening on ${PORT}`);
} else {
  console.log("[1/4] starting next dev (webpack) ...");
  const t0 = Date.now();
  child = spawn(
    "node_modules\\.bin\\next.cmd",
    ["dev", "--webpack", "-p", String(PORT), "-H", "127.0.0.1"],
    { cwd: projectRoot, env, shell: true, stdio: ["ignore", "pipe", "pipe"] }
  );
  owned = true;
  child.stdout.on("data", (d) => process.stdout.write(d.toString().trimEnd() + "\n"));
  child.stderr.on("data", (d) => process.stderr.write(d.toString().trimEnd() + "\n"));
  await waitForReady(child, READY_TIMEOUT);
  console.log(`[2/4] dev ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

let failed = false;
try {
  for (const target of TARGETS) {
    const started = Date.now();
    console.log(`      ... requesting ${target}`);
    const res = await fetchPage(target, REQUEST_TIMEOUT);
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (res.status !== 200) {
      failed = true;
      console.log(
        `[3/4] ${target} -> FAILED status=${res.status} error=${res.error ?? "-"} (${secs}s)`
      );
      continue;
    }
    const html = res.body;
    const checks = {
      "毛玻璃容器 shelf-glass": html.includes("shelf-glass"),
      "玻璃内嵌块 shelf-pane": html.includes("shelf-pane"),
      "简介区截断 line-clamp": html.includes("line-clamp"),
      "响应式网格 2xl:grid-cols-4": html.includes("2xl:grid-cols-4"),
      "等高网格 grid-auto-rows": html.includes("grid-auto-rows"),
      "价格 tabular-nums": html.includes("tabular-nums"),
      "状态胶囊 backdrop-blur": html.includes("backdrop-blur"),
    };
    console.log(`[3/4] ${target} -> 200 OK  (${secs}s, ${html.length} bytes)`);
    for (const [label, ok] of Object.entries(checks)) {
      console.log(`       ${ok ? "PASS" : "FAIL"}  ${label}`);
      if (!ok) failed = true;
    }
    fs.writeFileSync(path.join(projectRoot, "verify-products.html"), html, "utf8");
    console.log("[4/4] saved HTML -> verify-products.html");
  }
} catch (e) {
  failed = true;
  console.error("[error]", e.message);
} finally {
  if (owned && child && failed) {
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 4000);
  } else if (owned && child) {
    // 成功后保留 dev server，让 webpack 缓存累积，后续复跑会快很多
    console.log(`[note] dev server kept alive (pid=${child.pid}) on http://127.0.0.1:${PORT}`);
    child.unref();
  }
}

process.exit(failed ? 1 : 0);
