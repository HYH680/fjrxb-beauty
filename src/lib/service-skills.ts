import type { Category, Product } from "@/types";

/** 每项服务都会挂上的运行时能力（记忆 / 思考整形 / playbook 处理）。 */
export const BASE_SERVICE_SKILLS = [
  "shop-memory-ops",
  "model-thinking-ops",
  "product-playbook-run",
] as const;

export const SKILL_LABELS: Record<string, string> = {
  "shop-memory-ops": "店铺记忆",
  "model-thinking-ops": "模型思考",
  "product-playbook-run": "服务处理",
  "letta-development-guide": "长期记忆层",
  copywriting: "文案转化",
  social: "社媒口吻",
  pdf: "PDF/单据",
  docx: "Word/纪要",
  pptx: "演示文稿",
  xlsx: "表格问数",
  "ai-image-generation": "出图提示",
  "ai-video-generation": "成片提示",
  "remotion-best-practices": "剪辑时间轴",
  "frontend-design": "画面构图",
  reactbits: "动效组件",
  "vercel-react-best-practices": "研发实现",
  "gsap-skills": "GSAP 动效",
  "watermarks-remover": "AI 痕迹清理",
  "pinecone-avatars": "预设头像选择",
  dicebear: "生成式头像",
  "upload-crop-image": "上传裁剪",
  uploadthing: "文件上传",
  "supabase-avatar-example": "头像管理示例",
  "mcp-builder": "接口接入",
  "engineering-research": "要点研究",
  "productivity-writing-for-agents": "长文结构",
  "productivity-grill-me": "追问面试",
  "engineering-diagnosing-bugs": "排障",
  "engineering-tdd": "测试先行",
  "engineering-wayfinder": "拆任务",
};

/** 顾问可用的短质量标准（不是给终端用户跑 CLI/写 Python）。 */
const RUNTIME_HINTS: Record<string, string> = {
  copywriting:
    "文案：先问清对象和要他采取的一个动作。清楚优于炫技；写利益和具体数字，少空话。给 2～3 个标题/CTA 备选。",
  social:
    "社媒：按平台改长短和钩子。先写能停住滑动的第一句，再给可直接发的正文。评价回复要像店里人说话。",
  pdf: "PDF/单据：先读可见文字和表格。看不清就写「看不清」，不要编金额、税号、条款。抽出字段用清单。",
  docx: "纪要/文档：按决议、待办、负责人、期限整理。原文含糊处标出来，不要写成已发生的事实。",
  pptx: "演示：先给大纲页标题+要点+备注口播，页数克制，一页一个论点。",
  xlsx: "表格：用已有列计算或解释，公式逻辑说清楚。缺数列就问，不要假装对过账。",
  "ai-image-generation":
    "出图：给可复制的提示词（主体、风格、镜头、禁忌）。说明本站出图走工作台模型，不要让用户去装外部 CLI。",
  "ai-video-generation":
    "成片：给分镜、时长、镜头运动和提示词。口播稿与画面分开写。不要假装已经渲染完成片，除非工作台已出片。",
  "remotion-best-practices":
    "剪辑：给时间码、字幕节奏、镜头顺序。自动剪辑类说明要音频/成片素材，缺什么就问一样。",
  "frontend-design":
    "构图：说清主视觉、留白、字级和不要用的俗套配色。改图给删改清单，不声称已生成新海报（除非走了出图通道）。",
  reactbits: "动效：只在客户要做页面/组件时给组件选型建议；日常客服不要推销组件库。",
  "vercel-react-best-practices":
    "研发：可以给代码和实现步骤。优先可运行的小改动，说明性能与边界。",
  "gsap-skills":
    "GSAP：优先 transform/autoAlpha 与 timeline；ScrollTrigger 挂在顶层；React 用 useGSAP+scope。先给 Cursor 安装命令（npx skills add https://github.com/greensock/gsap-skills），再给可跑代码。不要假装收 Club 费。",
  "watermarks-remover":
    "AI 痕迹：只处理用户有权处理的文稿。先给 Cursor 安装（npx skills add https://github.com/guillaumemeyer/watermarks-remover）。粘贴文：清隐形 Unicode + 改写润稿，区分可核验与尽力而为；禁止声称「证明非 AI / 必过检测器」。C2PA/文件元数据指引自建上游服务，不假装本站托管。不是擦照片 Logo。",
  "pinecone-avatars":
    "预设头像：npm i pinecone-avatars；优先 AvatarPicker 嵌注册/onboarding。导出 SVG/PNG 或存 AvatarConfig。先指向本站 skill 与上游 https://github.com/pinecone-studio/pinecone-avatars。不是向量库 /use/pinecone；不托管 CDN。",
  dicebear:
    "生成头像：按风格+seed 给 HTTP URL 或 @dicebear/* 代码。先装本站 skill；提醒风格素材许可证。不托管 DiceBear 云。上游 https://github.com/dicebear/dicebear。",
  "upload-crop-image":
    "上传裁剪：移植 ImageCropField（crop/zoom/rotate → Canvas File），可接 RHF+Zod。先给 skill 与上游 https://github.com/JsCodeDevlopment/upload-crop-image。不假装本站收文件；存储另接 UploadThing 等。",
  uploadthing:
    "UploadThing：createUploadthing 路由 + UploadButton；env 清单自备密钥与配额。先给 skill；上游 https://github.com/pingdotgg/uploadthing。不代开账户、不托管用户文件。",
  "supabase-avatar-example":
    "头像示例：对照 Supabase nextjs-user-management 的 account 上传 + Storage avatars + profiles.avatar_url + RLS。可只学模式迁到自有 Auth。禁止暗示必须换整套 Supabase auth。上游示例路径 examples/user-management/nextjs-user-management。",
  "mcp-builder":
    "接入：讲清 webhook/凭证要什么、不要商家 App 密码。一次只要一项材料。",
  "letta-development-guide":
    "记忆：已有店铺画像直接用。新事实记进本店记忆，不要每轮重问已知业态/客群。",
  "engineering-research":
    "研究/摘要：先给结论再列依据。长文压成要点+待办，标出原文没说死的地方。",
  "productivity-writing-for-agents":
    "长文：层次清楚，一段一事。系统说明类写给人看，不要输出内部评分表。",
  "productivity-grill-me":
    "面试/筛选：一次只追问最关键的缺口。打分要有理由，结论给招聘方确认，不要假装已通知候选人。",
  "engineering-diagnosing-bugs":
    "排障：先复现再改。问清报错原文和已试过的步骤，一次只给一个最可能的原因和验证方法。",
  "engineering-tdd":
    "测试：先写失败用例再改实现。集成测试说清输入输出，不要空谈覆盖率。",
  "engineering-wayfinder":
    "大任务：拆成可独立完成的一步，标明依赖。不要一次甩出整份路线图。",
  "shop-memory-ops":
    "记忆运行时已按用户×商品隔离注入。已知事实不要重复盘问。",
  "model-thinking-ops":
    "思考过程给客户看短而具体的结论，不要输出思维链草稿或自检清单。",
  "product-playbook-run":
    "只做当前这项服务。缺材料一次问一件。禁止索要商家登录密码。",
};

const DEV_PRODUCTS = new Set([
  "cursor-pro",
  "gsap-skills",
  "watermarks-remover",
  "pinecone-avatars",
  "dicebear",
  "upload-crop-image",
  "uploadthing",
  "supabase-avatar-example",
  "langchain-pro",
  "pinecone",
  "weaviate-cloud",
  "openai-assistants",
  "work-im-bot",
]);

const CATEGORY_SKILLS: Record<Category, string[]> = {
  llm: ["engineering-research", "productivity-writing-for-agents"],
  image: ["ai-image-generation", "frontend-design"],
  speech: ["docx", "ai-video-generation"],
  "dev-tools": ["vercel-react-best-practices", "engineering-code-review"],
  "vector-db": ["letta-development-guide", "engineering-research"],
  api: ["mcp-builder", "letta-development-guide"],
  "video-edit": ["ai-video-generation", "remotion-best-practices"],
  creative: ["copywriting", "ai-image-generation"],
  "we-media": ["copywriting", "social"],
  retail: ["copywriting", "social"],
  ecommerce: ["copywriting", "social"],
  docs: ["pdf", "docx"],
  finance: ["xlsx", "pdf"],
  education: ["docx", "copywriting"],
  hr: ["productivity-grill-me", "copywriting"],
};

/** 按 SKU 追加（与类目合并去重，不替换底座）。 */
const PRODUCT_SKILLS: Record<string, string[]> = {
  "ai-summarize": ["engineering-research", "docx"],
  "ai-rewrite": ["copywriting", "social"],
  "brand-visual": ["frontend-design", "ai-image-generation", "copywriting"],
  "poster-layout": ["frontend-design", "ai-image-generation", "copywriting"],
  "ui-wireframe": ["frontend-design", "vercel-react-best-practices", "copywriting"],
  "packaging-design": ["frontend-design", "ai-image-generation", "copywriting"],
  "ppt-deck": ["pptx", "copywriting"],
  "sheet-analyst": ["xlsx"],
  "meeting-minutes": ["docx"],
  "whisper-api": ["docx"],
  "elevenlabs-tts": ["copywriting"],
  "voice-clone": ["copywriting"],
  "ai-music-bgm": ["copywriting"],
  "invoice-photo": ["pdf", "xlsx"],
  "smart-bookkeeping": ["pdf", "xlsx"],
  "table-ocr": ["xlsx", "pdf"],
  "contract-photo-review": ["pdf", "docx"],
  "doc-compare": ["docx", "pdf"],
  "seal-detect": ["pdf"],
  "content-moderation": ["copywriting", "pdf"],
  "homework-grade": ["docx"],
  "course-notes": ["docx"],
  "enroll-copy": ["copywriting", "social"],
  "open-resume": ["copywriting", "docx"],
  "cover-letter": ["copywriting", "docx"],
  "resume-screen": ["productivity-grill-me", "docx"],
  "interview-questions": ["productivity-grill-me"],
  "mock-interview": ["productivity-grill-me"],
  "job-search-agent": ["productivity-grill-me", "copywriting"],
  "hr-qa-bot": ["letta-development-guide", "copywriting"],
  "cursor-pro": ["vercel-react-best-practices", "reactbits", "engineering-code-review", "engineering-diagnosing-bugs", "engineering-tdd"],
  "gsap-skills": ["gsap-skills", "reactbits", "frontend-design", "vercel-react-best-practices"],
  "watermarks-remover": ["watermarks-remover", "copywriting", "productivity-writing-for-agents"],
  "pinecone-avatars": ["pinecone-avatars", "frontend-design", "vercel-react-best-practices"],
  dicebear: ["dicebear", "frontend-design", "vercel-react-best-practices"],
  "upload-crop-image": ["upload-crop-image", "vercel-react-best-practices", "frontend-design"],
  uploadthing: ["uploadthing", "mcp-builder", "vercel-react-best-practices"],
  "supabase-avatar-example": [
    "supabase-avatar-example",
    "mcp-builder",
    "vercel-react-best-practices",
    "upload-crop-image",
  ],
  "langchain-pro": ["letta-development-guide", "mcp-builder", "engineering-wayfinder"],
  pinecone: ["letta-development-guide", "engineering-research"],
  "weaviate-cloud": ["letta-development-guide"],
  "openai-assistants": ["letta-development-guide", "mcp-builder"],
  "work-im-bot": ["mcp-builder"],
  "cohere-embed": ["engineering-research"],
  "replicate-api": ["ai-image-generation"],
  "midjourney-api": ["ai-image-generation", "frontend-design"],
  "jimeng-image": ["ai-image-generation"],
  "ai-image-make": ["ai-image-generation", "frontend-design"],
  "prompt-reverse": ["ai-image-generation"],
  "image-matting": ["ai-image-generation", "frontend-design"],
  "image-enhance": ["ai-image-generation"],
  "image-search": ["ai-image-generation"],
  "product-replica": ["ai-image-generation", "copywriting"],
  "shop-photo-audit": ["frontend-design", "copywriting"],
  "runway-gen3": ["ai-video-generation", "remotion-best-practices"],
  "kling-video": ["ai-video-generation"],
  "ai-video-gen": ["ai-video-generation", "remotion-best-practices"],
  "ai-comic-drama": ["ai-video-generation", "copywriting"],
  "video-replica": ["ai-video-generation", "remotion-best-practices"],
  "digital-human": ["ai-video-generation", "copywriting"],
  "capcut-auto": ["remotion-best-practices"],
  "ai-subtitle": ["remotion-best-practices", "docx"],
  "smart-clip-select": ["remotion-best-practices"],
  "sales-leads": ["copywriting", "social"],
  "ai-workflow": ["copywriting", "product-playbook-run"],
  "ai-self-media": ["copywriting", "social"],
  "we-media-topics": ["engineering-research", "social"],
  "we-media-script": ["copywriting", "social"],
  "we-media-storyboard": ["ai-video-generation", "remotion-best-practices"],
  "we-media-voice": ["copywriting"],
  "we-media-video": ["ai-image-generation", "ai-video-generation", "frontend-design"],
  "we-media-publish": ["copywriting", "social"],
  "we-media-review": ["engineering-research", "xlsx"],
  "restaurant-cs": ["copywriting", "social"],
  "shop-cs": ["copywriting", "social"],
  "shop-review": ["copywriting", "social"],
  "cross-border-cs": ["copywriting", "social"],
  "retail-marketing": ["copywriting", "social"],
  "shop-listing": ["copywriting"],
  "cross-border-listing": ["copywriting"],
};

export type AttachedSkill = {
  id: string;
  label: string;
  hint: string;
  base: boolean;
};

function unique(ids: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function skillIdsForProduct(product: Pick<Product, "id" | "category">) {
  return unique([
    ...BASE_SERVICE_SKILLS,
    ...(CATEGORY_SKILLS[product.category] || []),
    ...(PRODUCT_SKILLS[product.id] || []),
  ]);
}

export function attachedSkillsForProduct(product: Pick<Product, "id" | "category">): AttachedSkill[] {
  return skillIdsForProduct(product).map((id) => ({
    id,
    label: SKILL_LABELS[id] || id,
    hint: RUNTIME_HINTS[id] || "",
    base: (BASE_SERVICE_SKILLS as readonly string[]).includes(id),
  }));
}

export function isDevWorkspaceProduct(productId: string) {
  return DEV_PRODUCTS.has(productId);
}

/** 注入工作台 system prompt：挂接名单 + 领域质量标准。 */
export function skillPlaybookForPrompt(product: Pick<Product, "id" | "category" | "name">) {
  const attached = attachedSkillsForProduct(product);
  const names = attached.map((s) => s.label).join("、");
  const domain = attached.filter((s) => !s.base && s.hint).slice(0, 3);
  const baseHints = attached.filter((s) => s.base && s.hint);
  const codeOk = isDevWorkspaceProduct(product.id);
  return [
    `本服务已挂接能力：${names}。`,
    codeOk
      ? "这项是研发/接入服务，可以给代码和配置步骤；仍不要索要商家后台登录密码。"
      : "你是这项服务的顾问，不是编程 agent。不要输出安装命令、Python/CLI、GitHub clone；把 skill 当成质量标准来写可直接用的文案/清单/提示词。",
    ...baseHints.map((s) => s.hint),
    ...domain.map((s) => `【${s.label}】${s.hint}`),
  ]
    .filter(Boolean)
    .join("\n");
}
