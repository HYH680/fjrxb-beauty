import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const PORT = 3000;

function waitForPort(port, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`port ${port} not open within ${timeoutMs}ms`));
        } else {
          setTimeout(tryConnect, 1000);
        }
      });
      socket.once("timeout", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`port ${port} not open within ${timeoutMs}ms`));
        } else {
          setTimeout(tryConnect, 1000);
        }
      });
      socket.connect(port, "127.0.0.1");
    };
    tryConnect();
  });
}

function fetchStatus(path, timeoutMs = 600000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ path, status: res.statusCode, bodyLength: body.length });
      });
    });
    req.on("error", (err) => {
      resolve({ path, status: 0, error: err.message });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ path, status: 0, error: "timeout" });
    });
  });
}

function waitForReady(child, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    let stdout = "";
    const timer = setTimeout(() => {
      reject(new Error("timeout waiting for Ready"));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      child.stderr?.off("data", onStderr);
      child.stdout?.off("data", onStdout);
      child.off("exit", onExit);
    };

    const onStderr = (data) => {
      stderr += data.toString();
      if (stderr.includes("EADDRINUSE")) {
        cleanup();
        reject(new Error(`port ${PORT} already in use`));
      }
    };

    const onStdout = (data) => {
      stdout += data.toString();
      if (stdout.includes("Ready")) {
        cleanup();
        resolve();
      }
    };

    const onExit = (code) => {
      cleanup();
      reject(new Error(`next dev exited before Ready (code ${code})`));
    };

    child.stderr?.on("data", onStderr);
    child.stdout?.on("data", onStdout);
    child.once("exit", onExit);
  });
}

const env = {
  ...process.env,
  NODE_OPTIONS: "--use-system-ca",
  PORT: String(PORT),
};

console.log("Starting next dev...");
const child = spawn(
  "node_modules\\.bin\\next.cmd",
  ["dev", "--webpack", "-p", String(PORT), "-H", "127.0.0.1"],
  {
    cwd: projectRoot,
    env,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  }
);

child.stdout.on("data", (data) => process.stdout.write(data));
child.stderr.on("data", (data) => process.stderr.write(data));

try {
  await waitForReady(child, 120000);
  console.log("next dev reported Ready");

  await waitForPort(PORT, 30000);
  console.log(`Port ${PORT} is open`);

  // Give a moment for the server to fully initialize
  await new Promise((r) => setTimeout(r, 2000));

  console.log("Fetching /gridscan-test ...");
  const r1 = await fetchStatus("/gridscan-test", 300000);
  console.log(`  /gridscan-test: ${r1.status}${r1.error ? ` (${r1.error})` : ""} body=${r1.bodyLength ?? 0}`);

  console.log("Fetching /chat ...");
  const r2 = await fetchStatus("/chat", 300000);
  console.log(`  /chat: ${r2.status}${r2.error ? ` (${r2.error})` : ""} body=${r2.bodyLength ?? 0}`);
} catch (err) {
  console.error("Verification failed:", err.message);
} finally {
  child.kill("SIGTERM");
  setTimeout(() => child.kill("SIGKILL"), 5000);
  // Also kill any lingering node processes on this port (Windows)
  try {
    const { execSync } = await import("node:child_process");
    execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr ":${PORT}"') do taskkill /PID %a /F 2>nul`, { shell: "cmd.exe" });
  } catch {}
}
