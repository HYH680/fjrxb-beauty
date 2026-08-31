import { listCatalog } from "@/lib/catalog";
import type { ChatHistoryItem, Product } from "@/types";
import { getLlmConfig, chatTemperature, chatCompletionMaxTokens, extractAssistantText } from "@/lib/llm-config";
import { compactCatalogPrompt } from "@/lib/catalog-prompt";
import { buildGuideSystemPrompt } from "@/lib/guide-prompt";

export interface RecommendationResult {
  reply: string;
  recommendedProducts: Product[];
  followUps: string[];
}

const keywordMap: Record<string, string[]> = {
  llm: ["语言模型", "llm", "gpt", "gpt-5.6", "sol", "claude", "对话", "聊天", "文本", "写作", "代码", "推理", "大模型", "客服", "助手"],
  image: ["图像", "图片", "画图", "文生图", "设计", "视觉", "dall", "midjourney", "stable", "插画", "海报", "营销图"],
  creative: [
    "图片制作",
    "文案作图",
    "反推提示词",
    "工作流",
    "参考图",
    "提示词",
    "出图",
    "nano banana",
    "gemini 出图",
    "创作",
  ],
  "we-media": [
    "自媒体",
    "公众号",
    "视频号",
    "百家号",
    "选题",
    "日更",
    "矩阵号",
    "笔记",
    "分镜",
    "热榜",
    "复盘",
  ],
  speech: ["语音", "声音", "tts", "转录", "whisper", "说话", "朗读", "音频", "会议", "配音", "克隆", "声线", "BGM", "配乐", "片头", "suno"],
  "dev-tools": [
    "开发",
    "编程",
    "agent",
    "知识库问答",
    "研发问答",
    "规范",
    "代码问答",
    "langchain",
    "cursor",
    "工具",
    "团队",
    "研发",
    "gsap",
    "动效",
    "scrolltrigger",
    "动画",
    "skill",
    "水印",
    "去水印",
    "watermark",
    "c2pa",
    "unicode",
    "溯源",
    "隐形字符",
  ],
  "vector-db": ["向量", "检索", "rag", "嵌入", "embedding", "pinecone", "weaviate", "知识库", "搜索", "资料"],
  api: ["api", "接口", "接入", "调用", "replicate", "assistants", "托管", "开通"],
  "video-edit": ["剪辑", "剪视频", "短视频", "自动剪辑", "字幕", "数字人", "口播", "素材", "出片", "剪映", "capcut", "heygen", "成片", "分镜", "视频生成", "视频复刻", "sora", "veo", "静图动效", "图生视频", "首尾帧", "可灵"],
  retail: ["餐饮", "餐厅", "饭店", "外卖", "菜单", "备货", "备料", "评价回复", "大众点评", "美团", "营销文案", "小红书", "抖音", "零售", "开店", "利润"],
  ecommerce: ["网店", "电商", "淘宝", "天猫", "拼多多", "京东", "跨境", "amazon", "shopee", "temu", "lazada", "刊登", "详情页", "标题", "退货", "退换", "直通车", "千川", "店铺", "电商作图", "商品复刻", "主图", "A+", "套图"],
  docs: ["合同", "条款", "协议", "拍照", "扫描", "发票", "回单", "对账单", "识别", "审阅", "风险", "律师"],
  finance: ["记账", "报税", "发票", "凭证", "财务", "会计", "税务", "申报", "经营分析", "月报", "成本", "现金流", "合同到期", "续费提醒"],
  education: ["培训", "课程", "笔记", "作业", "批改", "招生", "文案", "老师", "学生", "家长", "习题", "知识点"],
  hr: ["招聘", "简历", "筛选", "面试", "问题", "HR", "人事", "员工", "制度", "报销", "请假", "入职", "求职", "求职信", "Cover Letter", "模拟面试", "陪练", "ATS"],
};

const FOLLOW_UP =
  /这个|那个|刚才|上面|之前|上次|继续|还有|其他|别的|换一个|便宜|轻量|预算|对比|比较|区别|推荐的|刚才说|开通|加入/;

function matchProducts(message: string, catalog: Product[]): Product[] {
  const lower = message.toLowerCase();
  const scores = new Map<string, number>();

  for (const product of catalog) {
    let score = 0;
    if (lower.includes(product.name.toLowerCase())) score += 10;
    if (lower.includes(product.provider.toLowerCase())) score += 5;
    for (const tag of product.tags) {
      if (lower.includes(tag.toLowerCase())) score += 3;
    }
    for (const [category, keywords] of Object.entries(keywordMap)) {
      if (product.category === category) {
        for (const kw of keywords) {
          if (lower.includes(kw)) score += 2;
        }
      }
    }
    if (score > 0) scores.set(product.id, score);
  }

  if (/淘宝|天猫|拼多多|京东|网店/.test(message) && /客服|评价|回复/.test(message)) {
    for (const p of catalog) {
      if (p.category === "ecommerce") {
        scores.set(p.id, (scores.get(p.id) ?? 0) + 8);
      }
    }
  }

  if (
    /自媒体|公众号|视频号|百家号/.test(message) ||
    (/小红书|抖音/.test(message) && /账号|日更|选题|口播稿|笔记|人设|分镜|热榜|复盘/.test(message))
  ) {
    for (const p of catalog) {
      if (p.category === "we-media") {
        scores.set(p.id, (scores.get(p.id) ?? 0) + 8);
      }
    }
    const stepBoost: [RegExp, string][] = [
      [/选题|热榜|博主/, "we-media-topics"],
      [/写稿|灵感库|帮写/, "we-media-script"],
      [/分镜/, "we-media-storyboard"],
      [/配音|tts|旁白/, "we-media-voice"],
      [/做视频|成片|视觉素材|账号风格/, "we-media-video"],
      [/发布|多平台|分发/, "we-media-publish"],
      [/复盘|回旋/, "we-media-review"],
    ];
    for (const [re, id] of stepBoost) {
      if (re.test(message) && catalog.some((p) => p.id === id)) {
        scores.set(id, (scores.get(id) ?? 0) + 6);
      }
    }
  }

  return catalog
    .filter((p) => scores.has(p.id))
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, 3);
}

function previousProductIds(history: ChatHistoryItem[]): string[] {
  const ids: string[] = [];
  for (const item of history) {
    if (item.role === "assistant" && item.productIds?.length) {
      ids.push(...item.productIds);
    }
  }
  return [...new Set(ids)];
}

function previousUserNeeds(history: ChatHistoryItem[]): string {
  return history
    .filter((h) => h.role === "user")
    .slice(-6)
    .map((h) => h.content)
    .join(" ");
}

function productsByIds(ids: string[], catalog: Product[]): Product[] {
  return ids
    .map((id) => catalog.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
}

function isGreeting(message: string) {
  return /^(你好|您好|hi|hello|在吗|开始|帮我看看|推荐一下|有什么)$/i.test(
    message.trim()
  );
}

function isVague(message: string) {
  return message.trim().length < 6 || isGreeting(message);
}

function buildFollowUps(
  message: string,
  recommended: Product[],
  kind: "ask" | "recommend" | "compare" | "price"
): string[] {
  if (kind === "ask") {
    return ["开淘宝店做客服", "拍照审一份合同", "要做企业知识库", "团队写代码提效"];
  }
  if (kind === "compare" && recommended.length >= 2) {
    return ["哪个更适合长期用", "帮我开通更合适的", "还有更轻量的吗"];
  }
  if (kind === "price") {
    return ["对比一下两款", "帮我加入服务单", "先从轻量方案试"];
  }
  if (recommended.length) {
    return ["这两款对比一下", "帮我加入服务单", "预算再低一点", "适合几个人的团队"];
  }
  return ["我想做智能客服", "先做知识库", "你们怎么收费"];
}

function compareText(list: Product[]): string {
  return list
    .slice(0, 3)
    .map(
      (p, i) =>
        `${i + 1}. **${p.name}**（${p.price} 元/${p.unit}）\n   ${p.description}`
    )
    .join("\n\n");
}

async function loadGuideCatalog(): Promise<Product[]> {
  try {
    return await listCatalog();
  } catch {
    const { products } = await import("@/data/products");
    return products.filter((p) => p.published !== false);
  }
}

async function getLocalRecommendation(
  message: string,
  history: ChatHistoryItem[] = [],
  profile?: { industry?: string | null; occupation?: string | null }
): Promise<RecommendationResult> {
  const catalog = await loadGuideCatalog();
  const followUp = FOLLOW_UP.test(message);
  const contextText = `${previousUserNeeds(history)} ${message}`.trim();
  const prev = productsByIds(previousProductIds(history), catalog);

  if ((isVague(message) && history.length === 0) || /怎么收费|服务费|token|代币/.test(message)) {
    if (/怎么收费|服务费|token|代币/.test(message)) {
      return {
        reply: `月费含梳理、接入和跟进；调用按厂商计费，写在各服务页。\n\n你更想先解决哪一类：客服、知识库、出图，还是研发提效？`,
        recommendedProducts: [],
        followUps: ["想做智能客服", "要做企业知识库", "团队写代码提效", "品牌和营销出图"],
      };
    }

    return {
      reply: profile?.industry
        ? `你好。按你${[profile.industry, profile.occupation].filter(Boolean).join(" · ")}的背景，我常见会先帮这几类：店里的客服/评价、合同发票这类办公、或资料知识库。\n\n你现在最想先搞定哪一件？直接说场景就行，我按你的话匹配服务。`
        : "你好。我是这边的导购，你说正在忙什么，我帮你从货架上对一下服务。\n\n常见入口：店里做客服、拍照审合同、把资料做成可问的知识库、或团队写代码提效。你也可以直接说一句真实情况。",
      recommendedProducts: [],
      followUps: ["想做智能客服", "要做企业知识库", "团队写代码提效", "品牌和营销出图"],
    };
  }

  let recommended = matchProducts(followUp ? contextText : message, catalog);

  if (followUp) {
    if (/便宜|轻量|预算|低一点/.test(message)) {
      const pool = recommended.length ? recommended : prev.length ? prev : catalog;
      recommended = [...pool].sort((a, b) => a.price - b.price).slice(0, 3);
    } else if (/对比|比较|区别/.test(message)) {
      recommended = (recommended.length ? recommended : prev).slice(0, 3);
    } else if (/其他|别的|换一个|还有/.test(message)) {
      const exclude = new Set(previousProductIds(history));
      recommended = matchProducts(contextText, catalog)
        .filter((p) => !exclude.has(p.id))
        .slice(0, 3);
    } else if (/开通|加入购物车|就这个/.test(message) && prev.length) {
      recommended = prev.slice(0, 1);
      return {
        reply: `可以。先把 **${recommended[0].name}** 放进服务单，${recommended[0].price} 元/${recommended[0].unit}。\n\n点下方开通，或再问适不适合你的团队规模。`,
        recommendedProducts: recommended,
        followUps: ["适合几个人的团队", "再对比一款", "去购物车看看"],
      };
    } else if (!recommended.length && prev.length) {
      recommended = prev.slice(0, 3);
    }
  }

  if (/对比|比较|区别/.test(message) && (recommended.length >= 2 || prev.length >= 2)) {
    const list = recommended.length >= 2 ? recommended : prev.slice(0, 3);
    return {
      reply: `并排看这几项：\n\n${compareText(list)}\n\n更稳妥可以看 ${list[0]?.name ?? ""}；想先跑起来，选更轻的一档。`,
      recommendedProducts: list,
      followUps: buildFollowUps(message, list, "compare"),
    };
  }

  if (!recommended.length) {
    return {
      reply: "这一点我还需要更具体一点。是做客服、管资料、出图，还是给研发用？说一个真实场景就行。",
      recommendedProducts: [],
      followUps: buildFollowUps(message, [], "ask"),
    };
  }

  const top = recommended[0];
  const names = recommended
    .map((p) => `**${p.name}** · ${p.price} 元/${p.unit}`)
    .join("\n• ");

  return {
    reply: `按你说的「${message}」，可以从这些开始：\n\n• ${names}\n\n更适合先看 **${top.name}**。${top.description}`,
    recommendedProducts: recommended,
    followUps: buildFollowUps(message, recommended, "recommend"),
  };
}

export async function getAIRecommendation(
  message: string,
  history: ChatHistoryItem[] = [],
  contextProductId?: string,
  profile?: { industry?: string | null; occupation?: string | null },
  userId?: string,
  locale?: string
): Promise<RecommendationResult> {
  const catalog = await loadGuideCatalog();
  const contextProduct = contextProductId
    ? catalog.find((p) => p.id === contextProductId)
    : undefined;

  // getLlmConfig 依赖 Prisma（platformConfig），有时在后台重启/迁移期间会短暂失败；
  // 这种情况下必须降级到本地推荐，避免导购直接 500。
  let apiKey = "";
  let baseUrl = "";
  let model = "";
  try {
    const cfg = await getLlmConfig();
    apiKey = cfg.apiKey;
    baseUrl = cfg.baseUrl;
    model = cfg.model;
  } catch {
    apiKey = "";
  }
  if (!apiKey) {
    if (contextProduct && history.length === 0 && isVague(message)) {
      return {
        reply: `你正在看 **${contextProduct.name}**（${contextProduct.price} 元/${contextProduct.unit}）。\n\n${contextProduct.description}\n\n要不要和相近服务比一比，或看适不适合开通？`,
        recommendedProducts: [contextProduct],
        followUps: ["和相近服务对比", "适合什么样的团队", "帮我开通"],
      };
    }
    return await getLocalRecommendation(message, history, profile);
  }

  try {
    let catalogText = "";
    try {
      catalogText = await compactCatalogPrompt();
    } catch {
      catalogText = catalog
        .slice(0, 40)
        .map((p) => `- ${p.id}: ${p.name} · ${p.description}`)
        .join("\n");
    }

    const historyMessages = history.slice(-16).map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: h.content,
    }));

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Product-Id": "guide",
      },
      body: JSON.stringify({
        model,
        user: userId ?? "anonymous",
        messages: [
          {
            role: "system",
            content: buildGuideSystemPrompt({
              catalog: catalogText,
              profile,
              contextProduct,
              locale,
            }),
          },
          ...historyMessages,
          { role: "user", content: message },
        ],
        temperature: chatTemperature(model, 0.7),
        max_tokens: chatCompletionMaxTokens(model, false),
      }),
    });

    if (!response.ok) throw new Error("模型接口暂时不可用");

    const data = await response.json();
    const content: string = extractAssistantText(data) || data.choices?.[0]?.message?.content || "";
    if (!content.trim()) throw new Error("empty guide reply");
    const recommendMatch = content.match(/RECOMMEND:\s*(.*)/);
    const followMatch = content.match(/FOLLOWUPS:\s*(.*)/);
    const ids =
      recommendMatch?.[1]
        ?.split(",")
        .map((id: string) => id.trim())
        .filter(Boolean) ?? [];
    const followUps =
      followMatch?.[1]
        ?.split("|")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, 4) ?? [];

    const recommendedProducts = ids
      .map((id) => catalog.find((p) => p.id === id))
      .filter((p): p is Product => p !== undefined);

    const reply = content
      .replace(/\nRECOMMEND:[\s\S]*$/, "")
      .replace(/\nFOLLOWUPS:[\s\S]*$/, "")
      .trim();

    if (!reply) throw new Error("empty guide body");

    return {
      reply,
      recommendedProducts,
      followUps: followUps.length ? followUps : buildFollowUps(message, recommendedProducts, "recommend"),
    };
  } catch {
    return await getLocalRecommendation(message, history, profile);
  }
}
