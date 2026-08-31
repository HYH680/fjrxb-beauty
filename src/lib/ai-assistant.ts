import { listCatalog } from "@/lib/catalog";
import type { ChatHistoryItem, Product } from "@/types";
import { getLlmConfig, chatTemperature, chatCompletionMaxTokens, extractAssistantText } from "@/lib/llm-config";
import { compactCatalogPrompt } from "@/lib/catalog-prompt";
import { buildGuideSystemPrompt } from "@/lib/guide-prompt";
import { wrapUserMessageForEnfirst } from "@/lib/enfirst-bridge";
import {
  localizedProductName,
  localizedProductDescription,
  preferEnglishCopy,
} from "@/lib/i18n/localize-copy";

function responseLanguageLabel(locale?: string) {
  const code = (locale || "zh-CN").trim() || "zh-CN";
  if (code.startsWith("zh")) return "Chinese";
  if (code === "en" || code.startsWith("en-")) return "English";
  if (code === "ja" || code.startsWith("ja-")) return "Japanese";
  if (code === "ko" || code.startsWith("ko-")) return "Korean";
  if (code.startsWith("es")) return "Spanish";
  if (code.startsWith("fr")) return "French";
  if (code.startsWith("de")) return "German";
  if (code.startsWith("pt")) return "Portuguese";
  if (code.startsWith("ru")) return "Russian";
  if (code.startsWith("ar")) return "Arabic";
  if (code.startsWith("vi")) return "Vietnamese";
  if (code.startsWith("th")) return "Thai";
  if (code.startsWith("id")) return "Indonesian";
  return `the language for locale "${code}"`;
}

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
    "设计",
    "品牌",
    "logo",
    "视觉规范",
    "版式",
    "线框",
    "ui",
    "界面",
    "落地页",
    "包装",
    "盒型",
    "物料",
    "配色",
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
    "头像",
    "avatar",
    "dicebear",
    "uploadthing",
    "裁剪",
    "注册头像",
    "预设头像",
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

  // 设计策划（品牌/版式/线框/包装）优先推 creative 设计卡，而不是纯出图通道
  if (
    /品牌视觉|视觉规范|logo|版式|线框|包装设计|盒型|落地页|ui\b|界面设计|配色方案/i.test(
      message
    ) ||
    (/设计/.test(message) &&
      /品牌|海报|包装|界面|线框|logo|版式|物料/i.test(message))
  ) {
    for (const p of catalog) {
      if (p.category === "creative") {
        scores.set(p.id, (scores.get(p.id) ?? 0) + 6);
      }
    }
    const designBoost: [RegExp, string][] = [
      [/logo|品牌视觉|视觉规范|配色/, "brand-visual"],
      [/版式|海报版式|物料排版|招贴/, "poster-layout"],
      [/线框|ui\b|界面|落地页|信息架构/i, "ui-wireframe"],
      [/包装|盒型|瓶贴|标签设计/, "packaging-design"],
    ];
    for (const [re, id] of designBoost) {
      if (re.test(message) && catalog.some((p) => p.id === id)) {
        scores.set(id, (scores.get(id) ?? 0) + 10);
      }
    }
  }

  const ranked = catalog
    .filter((p) => scores.has(p.id))
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, 3);

  return ranked;
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
  kind: "ask" | "recommend" | "compare" | "price",
  locale = "zh-CN"
): string[] {
  const en = preferEnglishCopy(locale);
  if (kind === "ask") {
    return en
      ? ["Here’s the real task I’m on", "Help me think the approach", "Is there a shelf fit?", "How do you charge?"]
      : ["我说一下手头的事", "先帮我想思路", "货架上有没有合适的", "你们怎么收费"];
  }
  if (kind === "compare" && recommended.length >= 2) {
    return en
      ? ["Which fits long-term use?", "Activate the better fit", "Anything lighter?"]
      : ["哪个更适合长期用", "帮我开通更合适的", "还有更轻量的吗"];
  }
  if (kind === "price") {
    return en
      ? ["Compare two options", "Add to my service list", "Start with a lighter plan"]
      : ["对比一下两款", "帮我加入服务单", "先从轻量方案试"];
  }
  if (recommended.length) {
    return en
      ? ["Compare these two", "Add to my service list", "Lower budget options", "Fit for a small team?"]
      : ["这两款对比一下", "帮我加入服务单", "预算再低一点", "适合几个人的团队"];
  }
  return en
    ? ["I’m stuck on a real task", "Help me think through the approach", "How do you charge?"]
    : ["我卡在一件具体的事上", "先帮我想思路", "你们怎么收费"];
}

function priceLabel(p: Pick<Product, "price" | "unit">, locale: string) {
  if (preferEnglishCopy(locale)) {
    const unit = p.unit === "每月" ? "month" : p.unit;
    return `${p.price} / ${unit}`;
  }
  return `${p.price} 元/${p.unit}`;
}

function compareText(list: Product[], locale = "zh-CN"): string {
  return list
    .slice(0, 3)
    .map((p, i) => {
      const name = localizedProductName(p, locale);
      const desc = localizedProductDescription(p, locale);
      return `${i + 1}. **${name}** (${priceLabel(p, locale)})\n   ${desc}`;
    })
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
  profile?: { industry?: string | null; occupation?: string | null },
  locale = "zh-CN"
): Promise<RecommendationResult> {
  const catalog = await loadGuideCatalog();
  const en = preferEnglishCopy(locale);
  const followUp = FOLLOW_UP.test(message);
  const contextText = `${previousUserNeeds(history)} ${message}`.trim();
  const prev = productsByIds(previousProductIds(history), catalog);
  const defaultChips = en
    ? ["I’m stuck on a real task", "Help me think through the approach", "How do you charge?", "Show me something on the shelf"]
    : ["我卡在一件具体的事上", "先帮我想思路", "你们怎么收费", "货架上有没有合适的"];

  if ((isVague(message) && history.length === 0) || /怎么收费|服务费|token|代币|how.*(charge|price|fee)|pricing/i.test(message)) {
    if (/怎么收费|服务费|token|代币|how.*(charge|price|fee)|pricing/i.test(message)) {
      return {
        reply: en
          ? `Monthly fee covers mapping, setup, and follow-up; model usage is billed by vendors—details sit on each service page.\n\nIf you tell me what you’re trying to get done, I can say whether you even need a paid activation yet.`
          : `月费含梳理、接入和跟进；模型调用按厂商计费，细节写在各服务页。\n\n你先说眼下要搞定什么，我可以告诉你现在要不要开通、还是先把事情想清楚就行。`,
        recommendedProducts: [],
        followUps: defaultChips,
      };
    }

    const bg = [profile?.industry, profile?.occupation].filter(Boolean).join(" · ");
    return {
      reply: en
        ? profile?.industry
          ? `Hi. I know you’re around ${bg}—no need to fill a form. What’s the actual thing you’re dealing with right now? I’ll think it through with you; if something on our shelf truly helps, I’ll point to it.`
          : `Hi — I’m the guide. Say what you’re working on or stuck on in your own words. I’ll help you think it through first; the shelf is only for when you actually need to activate something.`
        : profile?.industry
          ? `你好。知道你偏${bg}这边，不用先填表。你现在手头真正卡的是哪一件？我先帮你想清楚；货架上真有用得上的，我再指给你。`
          : "你好，我是这边的导购。你正在忙什么、卡在哪，用自己的话说就行。我先帮你想办法；真要开通服务时，再对货架。",
      recommendedProducts: [],
      followUps: defaultChips,
    };
  }

  let recommended = matchProducts(followUp ? contextText : message, catalog);

  if (followUp) {
    if (/便宜|轻量|预算|低一点|cheaper|budget|lighter/i.test(message)) {
      const pool = recommended.length ? recommended : prev.length ? prev : catalog;
      recommended = [...pool].sort((a, b) => a.price - b.price).slice(0, 3);
    } else if (/对比|比较|区别|compare|difference/i.test(message)) {
      recommended = (recommended.length ? recommended : prev).slice(0, 3);
    } else if (/其他|别的|换一个|还有|another|other|else/i.test(message)) {
      const exclude = new Set(previousProductIds(history));
      recommended = matchProducts(contextText, catalog)
        .filter((p) => !exclude.has(p.id))
        .slice(0, 3);
    } else if (/开通|加入购物车|就这个|activate|add to cart|this one/i.test(message) && prev.length) {
      recommended = prev.slice(0, 1);
      const name = localizedProductName(recommended[0], locale);
      return {
        reply: en
          ? `Sure. Add **${name}** to your service list — ${priceLabel(recommended[0], locale)}.\n\nActivate below, or ask whether it fits your team size.`
          : `可以。先把 **${name}** 放进服务单，${priceLabel(recommended[0], locale)}。\n\n点下方开通，或再问适不适合你的团队规模。`,
        recommendedProducts: recommended,
        followUps: en
          ? ["Fit for how many people?", "Compare another option", "Open the cart"]
          : ["适合几个人的团队", "再对比一款", "去购物车看看"],
      };
    } else if (!recommended.length && prev.length) {
      recommended = prev.slice(0, 3);
    }
  }

  if (/对比|比较|区别|compare|difference/i.test(message) && (recommended.length >= 2 || prev.length >= 2)) {
    const list = recommended.length >= 2 ? recommended : prev.slice(0, 3);
    const first = localizedProductName(list[0], locale);
    return {
      reply: en
        ? `Side-by-side:\n\n${compareText(list, locale)}\n\nSafer pick: ${first}; if you want to start fast, take the lighter tier.`
        : `并排看这几项：\n\n${compareText(list, locale)}\n\n更稳妥可以看 ${first}；想先跑起来，选更轻的一档。`,
      recommendedProducts: list,
      followUps: buildFollowUps(message, list, "compare", locale),
    };
  }

  if (!recommended.length) {
    return {
      reply: en
        ? "I hear you, but I need one concrete beat—what you’re trying to finish, or what’s blocking you. Say it in plain words and I’ll reason with you; we’ll only touch the shelf if something actually fits."
        : "我听到了，但还缺一件具体的事——你想完成什么，或卡在哪一步。用大白话说就行，我先帮你想；货架上真有贴得上的，再提服务。",
      recommendedProducts: [],
      followUps: buildFollowUps(message, [], "ask", locale),
    };
  }

  const top = recommended[0];
  const topName = localizedProductName(top, locale);
  const topDesc = localizedProductDescription(top, locale);
  const names = recommended
    .map((p) => `**${localizedProductName(p, locale)}** · ${priceLabel(p, locale)}`)
    .join("\n• ");

  return {
    reply: en
      ? `Here’s how I’d think about “${message}”: if you want a ready path on our shelf, these are the closest fits—\n\n• ${names}\n\nI’d look at **${topName}** first. ${topDesc}\n\nIf none of that matches what you meant, just correct me in your own words.`
      : `按你说的「${message}」，我这边会这样想：如果要走本站现成服务，比较贴的是——\n\n• ${names}\n\n我会先看 **${topName}**。${topDesc}\n\n要是都不对路，你用自己的话纠正我，我们接着想。`,
    recommendedProducts: recommended,
    followUps: buildFollowUps(message, recommended, "recommend", locale),
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
      const name = localizedProductName(contextProduct, locale || "zh-CN");
      const desc = localizedProductDescription(contextProduct, locale || "zh-CN");
      const en = preferEnglishCopy(locale || "zh-CN");
      return {
        reply: en
          ? `You’re viewing **${name}** (${priceLabel(contextProduct, locale || "en")}).\n\n${desc}\n\nWant a side-by-side with neighbors, or check if it’s worth activating?`
          : `你正在看 **${name}**（${priceLabel(contextProduct, locale || "zh-CN")}）。\n\n${desc}\n\n要不要和相近服务比一比，或看适不适合开通？`,
        recommendedProducts: [contextProduct],
        followUps: en
          ? ["Compare with similar services", "What team size fits?", "Help me activate"]
          : ["和相近服务对比", "适合什么样的团队", "帮我开通"],
      };
    }
    return await getLocalRecommendation(message, history, profile, locale || "zh-CN");
  }

  try {
    let catalogText = "";
    try {
      catalogText = await compactCatalogPrompt(locale || "zh-CN");
    } catch {
      catalogText = catalog
        .slice(0, 40)
        .map((p) => {
          const name = localizedProductName(p, locale || "zh-CN");
          const desc = localizedProductDescription(p, locale || "zh-CN");
          return `- ${p.id}: ${name} · ${desc}`;
        })
        .join("\n");
    }

    const historyMessages = history.slice(-16).map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: h.content,
    }));

    const bridged = wrapUserMessageForEnfirst(
      message,
      responseLanguageLabel(locale),
      "auto"
    );

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Product-Id": "guide",
      },
      body: JSON.stringify({
        model,
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
          { role: "user", content: bridged.content },
        ],
        temperature: chatTemperature(model, 0.9),
        max_tokens: Math.max(chatCompletionMaxTokens(model, false), 1800),
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
      followUps: followUps.length
        ? followUps
        : buildFollowUps(message, recommendedProducts, "recommend", locale || "zh-CN"),
    };
  } catch {
    return await getLocalRecommendation(message, history, profile, locale || "zh-CN");
  }
}
