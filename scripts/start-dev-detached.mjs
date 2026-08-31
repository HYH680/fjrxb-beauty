import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const env = {
  ...process.env,
  NODE_OPTIONS: "--use-system-ca",
  PORT: "3113",
};

// 只保留 --use-system-ca，移除 safe-delete shim
if (env.NODE_OPTIONS.includes("--require")) {
  env.NODE_OPTIONS = "--use-system-ca";
}

const child = spawn(
  "node_modules\\.bin\\next.cmd",
  ["dev", "--webpack", "-p", "3113"],
  {
    cwd: projectRoot,
    env,
    detached: true,
    shell: true,
    stdio: "ignore",
    windowsHide: true,
  }
);

child.on("error", (err) => {
  console.error("[error]", err);
});

child.unref();

console.log(`started dev server pid=${child.pid}`);
