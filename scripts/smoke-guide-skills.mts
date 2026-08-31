import { buildGuideSystemPrompt, GUIDE_THINKING_STEPS } from "../src/lib/guide-prompt.ts";
import { getAIRecommendation } from "../src/lib/ai-assistant.ts";

const p = buildGuideSystemPrompt({
  catalog: "qwen-plus 千问",
  profile: { industry: "餐饮", occupation: "店长" },
});
console.log("PASS think", p.includes("思考 → 组织 → 回答"));
console.log("PASS no industry loop", p.includes("禁止每句复述"));
console.log("PASS steps", GUIDE_THINKING_STEPS.join(" > "));

const hello = await getAIRecommendation("你好", []);
console.log("hello:", hello.reply.slice(0, 160).replace(/\n/g, " | "));
console.log(
  "PASS not industry-robot",
  !/请先告诉我你的行业|你目前是/.test(hello.reply) || /你好/.test(hello.reply)
);

const scene = await getAIRecommendation("我想给淘宝店做客服自动回复", []);
console.log("scene:", scene.reply.slice(0, 160).replace(/\n/g, " | "));
console.log("PASS recommends", scene.recommendedProducts.length > 0, scene.recommendedProducts.map((x) => x.id).join(","));
