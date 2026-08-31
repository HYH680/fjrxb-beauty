// 流式下载 next tarball（避免大文件 arrayBuffer 内存问题）
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const URL = "https://registry.npmmirror.com/next/-/next-16.2.10.tgz";
const OUT = path.join(__dirname, "..", "next-pkg.tgz");

async function main() {
  const res = await fetch(URL);
  console.log("status:", res.status);
  if (!res.ok || !res.body) throw new Error("HTTP " + res.status);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(OUT));
  const size = fs.statSync(OUT).size;
  console.log("written:", OUT, size, "bytes");
}

main().catch((e) => {
  console.error("FAILED:", e && e.stack ? e.stack.split("\n")[0] : e);
  process.exit(1);
});
