/**
 * Fast deploy: tar + scp of src + key config only, then remote build.
 * Avoids packing the whole E: drive tree.
 * Uses system `tar` directly (no Node copyRecursive) — E: antivirus makes per-file copy very slow.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.DEPLOY_HOST || "root@119.28.45.212";

function run(cmd, args) {
  console.log(">", cmd, args.join(" "));
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: false });
  if (r.status !== 0) process.exit(r.status || 1);
}

const paths = [
  "src",
  "public",
  "prisma/schema.prisma",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "components.json",
  "scripts/remote-apply-deploy.sh",
  "scripts/migrate-avatars.mjs",
];

for (const rel of paths) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.warn("missing", rel);
  } else {
    console.log("include", rel);
  }
}

// Keep the archive outside the watched repository. On Windows, antivirus and
// editor file watchers can hold newly-created archives in scripts/ indefinitely.
const tarLocal = path.join(os.tmpdir(), `ai-supermarket-deploy-${Date.now()}.tgz`);
try {
  if (fs.existsSync(path.join(root, "scripts", "_deploy.tgz"))) {
    fs.unlinkSync(path.join(root, "scripts", "_deploy.tgz"));
  }
} catch {
  /* old lock — ignore, use unique name below */
}
run("tar", ["-czf", tarLocal, "-C", root, ...paths.filter((rel) => fs.existsSync(path.join(root, rel)))]);

run("scp", ["-o", "BatchMode=yes", tarLocal, `${host}:/tmp/ai-supermarket-deploy.tgz`]);
run("scp", [
  "-o",
  "BatchMode=yes",
  path.join(root, "scripts", "remote-apply-deploy.sh"),
  `${host}:/tmp/ai-supermarket-remote-apply.sh`,
]);

run("ssh", ["-o", "BatchMode=yes", host, "bash /tmp/ai-supermarket-remote-apply.sh"]);

try {
  fs.unlinkSync(tarLocal);
} catch {
  /* ignore */
}
console.log("deploy finished");
