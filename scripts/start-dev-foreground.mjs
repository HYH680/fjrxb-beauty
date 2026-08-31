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

const child = spawn(
  "node_modules\\.bin\\next.cmd",
  ["dev", "--webpack", "-p", "3113"],
  {
    cwd: projectRoot,
    env,
    shell: true,
    stdio: ["pipe", "inherit", "inherit"],
  }
);

// 提供持久的 stdin，避免子进程因 stdin 关闭而退出
child.stdin.write("\n");
setInterval(() => {
  try {
    child.stdin.write("\n");
  } catch {}
}, 10000);

child.on("error", (err) => {
  console.error("[error]", err);
});
