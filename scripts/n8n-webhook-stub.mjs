/**
 * 本机 Docker/n8n 不可用时的 webhook 占位：接收本站出站事件并回 200。
 * 兼容路径 /webhook/ai-supermarket（与 .env N8N_WEBHOOK_URL 一致）。
 * node scripts/n8n-webhook-stub.mjs
 */
import http from "node:http";
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.N8N_STUB_PORT || 5678);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logFile = path.join(__dirname, "..", ".local-n8n-stub.log");

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString("utf8");
  const line = `[${new Date().toISOString()}] ${req.method} ${req.url} ${body.slice(0, 500)}\n`;
  console.log(line.trim());
  try {
    await appendFile(logFile, line);
  } catch {
    /* ignore */
  }

  let event = "unknown";
  try {
    event = JSON.parse(body || "{}").event || event;
  } catch {
    /* ignore */
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      stub: true,
      received: true,
      event,
      hint: "完整 n8n UI 需 Docker+WSL；此 stub 仅保证本站出站不丢事件",
    })
  );
});

server.listen(port, "127.0.0.1", () => {
  console.log(`n8n webhook stub listening on http://127.0.0.1:${port}`);
  console.log(`log -> ${logFile}`);
});
