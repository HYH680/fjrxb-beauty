import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const out = execSync(
  'reg query "HKCU\\Software\\Kingsoft\\Office\\6.0\\Common" /v InstallRoot',
  { encoding: "utf8" }
);
const match = out.match(/InstallRoot\s+REG_SZ\s+(.+)/);
const et = path.join(match[1].trim(), "office6", "et.exe");
const file = path.join(os.homedir(), "Desktop", "ai-supermarket服务表单.xls");
if (!fs.existsSync(et) || !fs.existsSync(file)) {
  console.error("missing", { et: fs.existsSync(et), file: fs.existsSync(file) });
  process.exit(1);
}
spawn(et, [file], { detached: true, stdio: "ignore" }).unref();
console.log("opened", file);
