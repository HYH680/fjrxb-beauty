import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function prismaProbe() {
  try {
    const n = await prisma.catalogProduct.count();
    console.log(JSON.stringify({ prisma: "ok", count: n }));
    const rows = await prisma.catalogProduct.findMany({ take: 3 });
    console.log(
      JSON.stringify({
        sample: rows.map((r) => ({ id: r.id, cat: r.category, name: r.name })),
      })
    );
  } catch (e) {
    console.error(
      JSON.stringify({
        prisma: "fail",
        message: String(e?.message || e),
        code: e?.code,
      })
    );
  } finally {
    await prisma.$disconnect();
  }
}

const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";

async function hit(name, path, opts = {}, timeout = 45000) {
  const t0 = Date.now();
  try {
    const res = await fetch(BASE + path, {
      ...opts,
      signal: AbortSignal.timeout(timeout),
      headers: {
        Accept: "application/json",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(opts.headers || {}),
      },
    });
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("json")
      ? await res.json()
      : (await res.text()).slice(0, 240);
    const preview =
      typeof body === "string"
        ? body.replace(/\s+/g, " ").slice(0, 140)
        : JSON.stringify(body).slice(0, 200);
    const keys =
      body && typeof body === "object" && !Array.isArray(body)
        ? Object.keys(body).slice(0, 12).join(",")
        : Array.isArray(body)
          ? "array"
          : "";
    console.log(JSON.stringify({ name, status: res.status, ms: Date.now() - t0, keys, preview }));
    return { name, status: res.status, body, ok: res.ok };
  } catch (e) {
    console.log(
      JSON.stringify({ name, error: String(e.message || e), ms: Date.now() - t0 })
    );
    return { name, error: String(e.message || e) };
  }
}

const mode = process.argv[2] || "all";

if (mode === "prisma" || mode === "all") {
  await prismaProbe();
}

if (mode === "api" || mode === "all") {
  const r = [];
  r.push(await hit("catalog", "/api/catalog", {}, 90000));
  r.push(await hit("auth-me", "/api/auth/me"));
  r.push(await hit("subscriptions", "/api/subscriptions"));
  r.push(await hit("settings-llm", "/api/settings/llm"));
  r.push(await hit("settings-models", "/api/settings/models"));
  r.push(await hit("settings-integrations", "/api/settings/integrations"));
  r.push(await hit("cart", "/api/cart"));
  r.push(await hit("jobs", "/api/jobs"));
  r.push(await hit("account-usage", "/api/account/usage"));
  r.push(await hit("ops-playbook", "/api/ops/playbook?productId=ai-summarize"));
  r.push(await hit("forgot-get", "/api/auth/forgot-password"));
  r.push(
    await hit("login-bad", "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "smoke@example.com", password: "bad" }),
    })
  );
  r.push(await hit("chat-get", "/api/chat"));

  const cat = r.find((x) => x.name === "catalog");
  const firstId = cat?.body?.products?.[0]?.id;
  if (firstId) r.push(await hit("catalog-one", `/api/catalog/${firstId}`));

  // lightweight runtime chat (may call LLM)
  r.push(
    await hit(
      "runtime-chat",
      "/api/runtime/chat",
      {
        method: "POST",
        body: JSON.stringify({
          productId: "ai-summarize",
          messages: [{ role: "user", content: "用一句话总结：前后端连通测试" }],
        }),
      },
      90000
    )
  );

  console.log("---SUMMARY---");
  console.log(
    JSON.stringify(
      {
        total: r.length,
        networkErrors: r.filter((x) => x.error).map((x) => x.name),
        http5xx: r.filter((x) => x.status >= 500).map((x) => `${x.name}:${x.status}`),
        http4xx: r
          .filter((x) => x.status >= 400 && x.status < 500)
          .map((x) => `${x.name}:${x.status}`),
        http2xx: r
          .filter((x) => x.status >= 200 && x.status < 300)
          .map((x) => `${x.name}:${x.status}`),
        catalogCount: cat?.body?.products?.length ?? null,
      },
      null,
      2
    )
  );
}
