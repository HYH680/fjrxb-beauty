import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

/** 在本机 Bash 工具里直接跑 node CLI 经常拿不到输出，用子进程捕获后落盘再读。 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
if (!args.length) {
  console.error("usage: node scripts/run-cli.mjs <cmd> [...args]");
  process.exit(1);
}

const outFile = path.join(projectRoot, "cli-output.log");
const log = fs.createWriteStream(outFile, { flags: "w" });

const child = spawn(args[0], args.slice(1), {
  cwd: projectRoot,
  shell: true,
  env: { ...process.env, NODE_OPTIONS: "--use-system-ca" },
  stdio: ["ignore", "pipe", "pipe"],
});

let buf = "";
const pump = (d) => {
  const s = d.toString();
  buf += s;
  log.write(s);
  process.stdout.write(s);
};

child.stdout.on("data", pump);
child.stderr.on("data", pump);

child.on("error", (e) => {
  log.write(`[spawn error] ${e.message}\n`);
  log.end();
  console.error(`[spawn error] ${e.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  log.write(`\n[exit code=${code} signal=${signal} bytes=${buf.length}]\n`);
  log.end();
  process.exit(code ?? 1);
});
