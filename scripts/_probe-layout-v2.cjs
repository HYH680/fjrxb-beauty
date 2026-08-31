const https = require("https");
const fs = require("fs");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 20000 }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      })
      .on("error", reject);
  });
}

(async () => {
  const { status, body: h } = await get("https://fjrxb.beauty/?_=" + Date.now());
  const data = {
    status,
    stackOld: h.includes("landing-curved-stack"),
    slot: h.includes("landing-curved-slot"),
    max360: h.includes("max-w-[360px]"),
    modelPanel: h.includes("data-landing-model-panel") || h.includes("LandingModelPanel"),
    modelsTitle: h.includes("支持的模型") || h.includes("Supported models"),
    max1200: h.includes("max-w-[1200px]"),
    secondEmail: h.includes("landing-curved-email"),
    loginPrefillCode: h.includes("login_email_prefill"),
  };
  console.log(JSON.stringify(data, null, 2));
  fs.appendFileSync(
    "E:/ai-supermarket/debug-502d57.log",
    JSON.stringify({
      sessionId: "502d57",
      runId: "layout-v2",
      hypothesisId: "H1-H3",
      location: "scripts/probe-layout-v2.cjs",
      message: "prod SSR layout v2 checks",
      data,
      timestamp: Date.now(),
    }) + "\n"
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
