const fs = require("fs");
const h = fs.readFileSync("E:/ai-supermarket/scripts/_prod-home.html", "utf8");
const checks = {
  stack: h.includes("landing-curved-stack"),
  maxw: h.includes("max-w-[860px]"),
  bailout: h.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING"),
  noModelPanel:
    !h.includes("LandingModelPanel") && !h.includes("支持的模型"),
  loginHrefCount: (h.match(/href="\/login"/g) || []).length,
  lead: h.includes("按场景拿服务"),
  sub: h.includes("先问导购匹配"),
  pulseLoading: h.includes("animate-pulse"),
  roundedLoginCta: /bg-\[#7c5cff\][^>]*>[\s\S]*?登录/.test(h),
};
console.log(JSON.stringify(checks, null, 2));
fs.appendFileSync(
  "E:/ai-supermarket/debug-502d57.log",
  JSON.stringify({
    sessionId: "502d57",
    runId: "post-fix",
    hypothesisId: "H1-H2",
    location: "scripts/verify-prod-home.mjs",
    message: "production HTML landing checks",
    data: checks,
    timestamp: Date.now(),
  }) + "\n"
);
