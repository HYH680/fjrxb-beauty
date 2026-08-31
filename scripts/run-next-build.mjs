import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const extra = args.length ? args : [];

const env = {
  ...process.env,
  NODE_OPTIONS: "--use-system-ca",
};

const logPath = path.join(projectRoot, "build-service-cards.log");
const log = fs.createWriteStream(logPath, { flags: "w" });

const child = spawn("node_modules\\.bin\\next.cmd", ["build", ...extra], {
  cwd: projectRoot,
  env,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

let chunks = 0;
const handle = (data) => {
  chunks += data.length;
  process.stdout.write(data.toString());
  log.write(data);
};

child.stdout.on("data", handle);
child.stderr.on("data", handle);

child.on("error", (err) => {
  const msg = `[spawn error] ${err.message}\n`;
  process.stdout.write(msg);
  log.write(msg);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  const msg = `\n[next build exited code=${code} signal=${signal} bytes=${chunks}]\n`;
  process.stdout.write(msg);
  log.write(msg);
  log.end();
  process.exit(code ?? 1);
});
