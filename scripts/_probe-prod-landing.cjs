const fs = require("fs");
const https = require("https");
const http = require("http");

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: 25000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") })
      );
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const data = JSON.stringify(payload);
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  const home = await fetchText("https://fjrxb.beauty/");
  fs.writeFileSync("E:/ai-supermarket/scripts/_prod-home2.html", home.body);
  const h = home.body;
  const checks = {
    status: home.status,
    bytes: h.length,
    stack: h.includes("landing-curved-stack"),
    maxw: h.includes("max-w-[860px]"),
    bailout: h.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING"),
    loginHrefCount: (h.match(/href="\/login"/g) || []).length,
    hasModelPanel: h.includes("LandingModelPanel"),
  };
  console.log("home", JSON.stringify(checks));

  const probe = await postJson("https://fjrxb.beauty/api/debug-log", {
    sessionId: "502d57",
    runId: "post-fix",
    hypothesisId: "H0",
    location: "shell-probe",
    message: "prod debug-log probe",
    data: { ok: true },
    timestamp: Date.now(),
  });
  console.log("debugLog", probe.status, probe.body.slice(0, 200));

  fs.appendFileSync(
    "E:/ai-supermarket/debug-502d57.log",
    JSON.stringify({
      sessionId: "502d57",
      runId: "post-fix",
      hypothesisId: "H1-H2",
      location: "scripts/probe-prod-landing.cjs",
      message: "prod home + debug-log probe",
      data: { checks, debugLogStatus: probe.status, debugLogBody: probe.body.slice(0, 120) },
      timestamp: Date.now(),
    }) + "\n"
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
