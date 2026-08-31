/**
 * Local smoke: ensure test user + subscription → login → /api/runtime/chat
 * Usage: npm run smoke:runtime
 * Env: SMOKE_BASE (default http://127.0.0.1:3000)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";
const EMAIL = (process.env.SMOKE_EMAIL || "smoke-runtime@local.test").toLowerCase();
const PASSWORD = process.env.SMOKE_PASSWORD || "SmokeTest1";
const NAME = "Runtime Smoke";
const PRODUCT_ID = process.env.SMOKE_PRODUCT || "ai-summarize";

const prisma = new PrismaClient();

function cookieJar() {
  const jar = new Map();
  return {
    store(res) {
      const raw = typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
      for (const line of raw) {
        const [pair] = line.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
      const single = res.headers.get("set-cookie");
      if (single && raw.length === 0) {
        const [pair] = single.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
    },
    header() {
      if (jar.size === 0) return undefined;
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
  };
}

async function ensureUserAndSub() {
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      name: NAME,
      password: hashed,
      role: "user",
      industry: "测试",
      occupation: "冒烟",
    },
    update: {
      password: hashed,
      name: NAME,
    },
  });

  await prisma.subscription.upsert({
    where: {
      userId_productId: { userId: user.id, productId: PRODUCT_ID },
    },
    create: {
      userId: user.id,
      productId: PRODUCT_ID,
      status: "active",
      paymentMethod: "smoke",
    },
    update: {
      status: "active",
      paymentMethod: "smoke",
    },
  });

  return user;
}

async function main() {
  const t0 = Date.now();
  const user = await ensureUserAndSub();
  console.log(JSON.stringify({ step: "db", userId: user.id, email: EMAIL, productId: PRODUCT_ID }));

  const cookies = cookieJar();

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    signal: AbortSignal.timeout(30000),
  });
  cookies.store(loginRes);
  const loginBody = await loginRes.json().catch(() => ({}));
  console.log(
    JSON.stringify({
      step: "login",
      status: loginRes.status,
      ms: Date.now() - t0,
      hasCookie: Boolean(cookies.header()),
      body: loginBody,
    })
  );
  if (!loginRes.ok) {
    throw new Error(`login failed: ${loginRes.status}`);
  }

  const meRes = await fetch(`${BASE}/api/auth/me`, {
    headers: { Accept: "application/json", Cookie: cookies.header() },
    signal: AbortSignal.timeout(15000),
  });
  const meBody = await meRes.json().catch(() => ({}));
  console.log(JSON.stringify({ step: "me", status: meRes.status, body: meBody }));

  const chatT0 = Date.now();
  const chatRes = await fetch(`${BASE}/api/runtime/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookies.header(),
    },
    body: JSON.stringify({
      productId: PRODUCT_ID,
      message: "用一句话总结：本地冒烟验证前后端 runtime chat 连通。",
      history: [],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const chatRaw = await chatRes.text();
  let chatBody;
  try {
    chatBody = JSON.parse(chatRaw);
  } catch {
    const metaAt = chatRaw.indexOf("\n\n__META__");
    if (metaAt >= 0) {
      const reply = chatRaw.slice(0, metaAt);
      let meta = {};
      try {
        meta = JSON.parse(chatRaw.slice(metaAt + "\n\n__META__".length));
      } catch {
        meta = {};
      }
      chatBody = { reply, ...meta };
    } else {
      chatBody = { raw: chatRaw.slice(0, 300) };
    }
  }
  const preview =
    typeof chatBody?.reply === "string"
      ? chatBody.reply.slice(0, 200)
      : JSON.stringify(chatBody).slice(0, 280);

  console.log(
    JSON.stringify({
      step: "runtime-chat",
      status: chatRes.status,
      ms: Date.now() - chatT0,
      keys: chatBody && typeof chatBody === "object" ? Object.keys(chatBody).slice(0, 12) : [],
      preview,
    })
  );

  if (chatRes.status !== 200) {
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, totalMs: Date.now() - t0 }));
  }
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
