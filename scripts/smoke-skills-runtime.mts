/**
 * Smoke-test: installed Agent Skills map onto live ai-supermarket modules.
 * Run: npx tsx scripts/smoke-skills-runtime.mts
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { products } from "../src/data/products.ts";
import {
  extractFactsFromTurn,
  formatMemoryForPrompt,
  cloudAgentConfig,
} from "../src/lib/shop-consultant.ts";
import { getServiceBrief, isReviewOps } from "../src/lib/service-briefs.ts";
import {
  chatTemperature,
  chatCompletionMaxTokens,
  extractAssistantText,
} from "../src/lib/llm-config.ts";
import {
  attachedSkillsForProduct,
  skillIdsForProduct,
  skillPlaybookForPrompt,
} from "../src/lib/service-skills.ts";
import { buildWorkspaceCsPrompt } from "../src/lib/review-prompt.ts";
import { resolveModelRoute } from "../src/lib/model-router.ts";

const root = join(import.meta.dirname, "..");
const skillsDir = join(root, ".cursor", "skills");

const requiredSkills = [
  "letta-development-guide",
  "shop-memory-ops",
  "model-thinking-ops",
  "product-playbook-run",
  "pdf",
  "xlsx",
  "copywriting",
  "reactbits",
];

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`PASS  ${label}${detail ? " — " + detail : ""}`);
  else {
    console.log(`FAIL  ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

console.log("=== 1. Skill files present ===");
for (const name of requiredSkills) {
  const p = join(skillsDir, name, "SKILL.md");
  ok(`skill:${name}`, existsSync(p), p);
  if (existsSync(p)) {
    const head = readFileSync(p, "utf8").slice(0, 200);
    ok(`frontmatter:${name}`, head.startsWith("---") && /name:\s*\S+/.test(head));
  }
}

console.log("\n=== 2. Memory (shop-memory-ops) ===");
const facts = extractFactsFromTurn(
  "我们是重庆老火锅，客单价大概120元，主要客群是附近上班族，想要提升好评率",
  "助手这段营销话里的客群二字不应污染记忆"
);
ok("extract shopType", facts.shopType?.includes("火锅") === true, JSON.stringify(facts.shopType));
ok("extract avgPrice", Boolean(facts.avgPrice), JSON.stringify(facts.avgPrice));
ok("extract audience", Boolean(facts.audience), JSON.stringify(facts.audience));
ok("extract goal", Boolean(facts.goal), JSON.stringify(facts.goal));
const prompt = formatMemoryForPrompt({ summary: "老顾客，重口味", facts });
ok("formatMemoryForPrompt", /业态|客群|长期印象/.test(prompt), prompt.slice(0, 120));
const cloud = cloudAgentConfig();
ok(
  "letta config shape",
  typeof cloud.letta.enabled === "boolean",
  `enabled=${cloud.letta.enabled}`
);

console.log("\n=== 3. Thinking (model-thinking-ops) ===");
ok("thinking temp=1", chatTemperature("ernie-5.0-thinking-preview") === 1);
ok("normal temp", chatTemperature("qwen-plus", 0.6) === 0.6 || chatTemperature("qwen-plus", 0.6) === 1);
ok("reasoner tokens", chatCompletionMaxTokens("deepseek-reasoner", false) >= 1600);
const text = extractAssistantText({
  choices: [
    {
      message: {
        content: "",
        reasoning_content: "一步步想…\n\n最终回答：可以用千问做客服草稿",
      },
    },
  ],
});
ok("extract reasoning_content", text.includes("客服") || text.length > 0, text.slice(0, 80));

console.log("\n=== 4. Processing (product-playbook-run) ===");
const review = getServiceBrief("restaurant-cs");
ok("review-ops kind", review.kind === "review-ops", review.kind);
ok("isReviewOps", isReviewOps("restaurant-cs") === true);
const vision = getServiceBrief("invoice-photo");
ok("vision-run kind", vision.kind === "vision-run", vision.kind);
const playbook = getServiceBrief("ai-rewrite");
ok("playbook-run kind", playbook.kind === "playbook-run", playbook.kind);
ok("refuse passwords", review.refuse.some((r) => /密码/.test(r)));

console.log("\n=== 5. Catalog coverage sample ===");
const dirs = readdirSync(skillsDir).filter((d) =>
  existsSync(join(skillsDir, d, "SKILL.md"))
);
ok("skill count >= 50", dirs.length >= 50, `count=${dirs.length}`);

console.log("\n=== 6. All catalog SKUs wired to skills ===");
const missingDisk: string[] = [];
for (const product of products) {
  const ids = skillIdsForProduct(product);
  ok(`sku:${product.id} has base+domain`, ids.length >= 4, ids.join(","));
  const prompt = skillPlaybookForPrompt(product);
  ok(`sku:${product.id} prompt`, /本服务已挂接能力/.test(prompt));
  for (const id of ids) {
    if (!existsSync(join(skillsDir, id, "SKILL.md"))) missingDisk.push(`${product.id}:${id}`);
  }
  const brief = getServiceBrief(product.id);
  const system = buildWorkspaceCsPrompt({
    productName: product.name,
    productId: product.id,
    brief,
    hasImages: false,
    notes: [],
    skillPlaybookBlock: prompt,
  });
  ok(`sku:${product.id} system inject`, system.includes("本服务已挂接能力"));
}
ok("all mapped skill folders exist", missingDisk.length === 0, missingDisk.slice(0, 8).join("; "));

console.log("\n=== 7. Model route can run (qwen / vision / review) ===");
const samples = ["qwen-plus", "restaurant-cs", "invoice-photo", "ai-rewrite", "cursor-pro"]
  .map((id) => products.find((p) => p.id === id))
  .filter((p): p is (typeof products)[number] => Boolean(p));
for (const product of samples) {
  const textRoute = resolveModelRoute({
    product,
    message: "你好，帮我做一下这项服务",
    hasImages: false,
  });
  ok(
    `route:${product.id} text attempts`,
    textRoute.attempts.length > 0,
    `${textRoute.label} n=${textRoute.attempts.length}`
  );
}
const invoice = products.find((p) => p.id === "invoice-photo");
if (invoice) {
  const vis = resolveModelRoute({
    product: invoice,
    message: "看这张发票",
    hasImages: true,
  });
  ok("route:invoice-photo vision attempts", vis.attempts.length > 0, vis.label);
}

console.log("\n=== 8. Live LLM ping (qwen-plus first attempt) ===");
{
  const qwen = products.find((p) => p.id === "qwen-plus");
  if (qwen) {
    const route = resolveModelRoute({
      product: qwen,
      message: "只回复：ok",
      hasImages: false,
    });
    const cfg = route.attempts[0];
    if (!cfg) {
      ok("live ping config", false, "no attempts");
    } else {
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 25_000);
        const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.apiKey}`,
            "X-Product-Id": "qwen-plus",
          },
          body: JSON.stringify({
            model: cfg.model,
            temperature: 1,
            max_tokens: 32,
            messages: [
              {
                role: "system",
                content: skillPlaybookForPrompt(qwen).slice(0, 800),
              },
              { role: "user", content: "只回复两个字：收到" },
            ],
          }),
          signal: ac.signal,
        });
        clearTimeout(timer);
        const data = (await res.json().catch(() => ({}))) as {
          choices?: { message?: { content?: string } }[];
          error?: { message?: string };
        };
        const reply = extractAssistantText(data);
        ok(
          "live ping http",
          res.ok && Boolean(reply),
          res.ok ? reply.slice(0, 40) : `${res.status} ${data.error?.message || ""}`.slice(0, 120)
        );
      } catch (err) {
        ok("live ping http", false, String(err).slice(0, 120));
      }
    }
  }
}

console.log("\n=== RESULT ===");
if (failed) {
  console.error(`FAILED ${failed} checks`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED — skills align with runtime modules");
