import type { ReplyPlaybook } from "@prisma/client";
import type { ServiceBrief } from "@/lib/service-briefs";
import { enfirstSystemAddon, replyLanguageLabel } from "@/lib/enfirst-bridge";

export function buildReviewSystemPrompt(
  playbook: Pick<
    ReplyPlaybook,
    | "shopDisplayName"
    | "tone"
    | "addressAs"
    | "mustInclude"
    | "neverSay"
    | "goodReviewHint"
    | "badReviewHint"
    | "extraPrompt"
  >,
  review: { rating: number; content: string; author?: string; platform: string }
) {
  const shop = playbook.shopDisplayName.trim() || "本店";
  const kind = review.rating <= 2 ? "差评" : review.rating === 3 ? "中评" : "好评";
  return [
    `你是「${shop}」的店铺评价回复专员，不是导购，不推销其他服务。`,
    `平台：${review.platform === "dianping" ? "大众点评" : review.platform === "meituan" ? "美团" : review.platform}`,
    `自称：${playbook.addressAs || "我们"}。口吻：${playbook.tone || "稳重热情"}。`,
    playbook.mustInclude ? `必须带上：${playbook.mustInclude}` : "",
    playbook.neverSay ? `绝对不要说：${playbook.neverSay}` : "",
    kind === "好评" && playbook.goodReviewHint
      ? `好评要求：${playbook.goodReviewHint}`
      : "",
    kind === "差评" && playbook.badReviewHint
      ? `差评要求：${playbook.badReviewHint}`
      : "",
    playbook.extraPrompt ? `店主补充提示词：\n${playbook.extraPrompt}` : "",
    "只输出一条可直接发出的回复，不要标题，不要解释。差评先致歉再给处理办法；好评简短真诚，不要假热情堆砌。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildWorkspaceCsPrompt(input: {
  productName: string;
  productId: string;
  brief: ServiceBrief;
  hasImages: boolean;
  progress?: string;
  playbook?: {
    extraPrompt?: string | null;
    shopDisplayName?: string | null;
    tone?: string | null;
    addressAs?: string | null;
    mustInclude?: string | null;
    neverSay?: string | null;
  } | null;
  notes: string[];
  consultantPersona?: string;
  shopMemoryBlock?: string;
  knowledgeBlock?: string;
  skillPlaybookBlock?: string;
  locale?: string;
}) {
  const {
    productName,
    productId,
    brief,
    hasImages,
    progress,
    playbook,
    notes,
    consultantPersona,
    shopMemoryBlock,
    knowledgeBlock,
    skillPlaybookBlock,
    locale,
  } = input;
  const reviewOps = brief.kind === "review-ops";
  const csOps = brief.kind === "cs-ops";
  const shopOps = reviewOps || csOps;
  const materials = brief.materials
    .map(
      (item) =>
        `${item.required ? "常用" : "有则更好"}：${item.label}${item.hint ? `（${item.hint}）` : ""}`
    )
    .join("；");

  const vision =
    productId === "contract-photo-review"
      ? hasImages
        ? "这轮有图：先读出合同文字，再标责任不清、单方解约、自动续费、赔偿上限、管辖地、付款条件、违约金。每条写原文要点、为什么可疑、建议向对方确认什么。这是审阅草稿，不是律师意见。看不清的字标出来，不要编。"
        : "还没有图就请他拍照、上传合同页，或发 PDF（会自动转前几页）。"
      : productId === "invoice-photo" || productId === "smart-bookkeeping"
        ? hasImages
          ? productId === "smart-bookkeeping"
            ? "这轮有图：抽出号码、日期、购销方、金额、税额，并建议记账科目。看不清写成「看不清」，不要编数字。提醒：不对接税局、不自动申报，入账前要人核对。"
            : "这轮有图：抽出号码、日期、购销方、金额、税额。看不清写成「看不清」，不要编数字。提醒入账前要人核对。"
          : "请他拍照、上传发票/回单，或发 PDF。"
        : productId === "shop-photo-audit"
          ? hasImages
            ? "这轮有图：标出错别字、图文不符、夸大宣传、缺失规格/产地/资质。给出修改清单。不代替平台审核。"
            : "请他拍主图、详情或包装，也可发 PDF。"
          : productId === "homework-grade"
            ? hasImages
              ? "这轮有图：先读题再批改。作文给评分要点和评语草稿；数学标对错与步骤问题。结果给老师确认，不要假装已经发给学生。"
              : "请他上传作业照片或 PDF。"
            : hasImages
              ? "这轮有图：先看图再回答。你不能直接改图或生成新海报。给出删改清单、重排建议、可直接用的文案。"
              : "";

  return [
    consultantPersona ||
      `你是「${productName}」的专属客服，像一个懂行的真人。对方是已开通这项服务的客户。`,
    "你的目标是帮他把这项服务真正用起来：听懂他现在卡在哪，把疑问讲清楚，再带他走眼下最有用的一步。",
    "不要像填表机。不要每次复读同一句脚本。不要把资料清单一次性甩出来。不要推销超市或其他商品。",
    "先判断他这句是在问、在怕、在交资料，还是已经在用服务。有疑问先答完，再决定要不要推进。他不会、没有、想跳过，就给出路，不要卡死。",
    shopOps
      ? "缺店铺关键信息时先追问一两句再给方案；已知的店铺画像不要重复盘问。"
      : "这项服务不是店铺评价/客服对接。禁止问「在哪些平台开店」「美团/淘宝/京东店铺」「门店编号」「开放平台 AppKey」。开场直接围绕本服务怎么用、要准备什么。",
    shopOps
      ? "只谈当前这项服务。评价/客服类可以问平台与门店；不要套用不相关商品的流程。"
      : "只谈当前这项服务。不要默认问开店平台，不要套用美团/点评回评流程。",
    shopMemoryBlock || "",
    knowledgeBlock || "",
    skillPlaybookBlock || "",
    reviewOps
      ? "身份：配置和答疑时你是客服，用人话解释。只有他贴了顾客评价、或明确让你起草回复时，才按本店口吻写一条可发出的回复，不要再客套配置。"
      : csOps
        ? "身份：帮他按店铺政策起草咨询/退换回复。他贴顾客消息时直接起草可复制发出的话术。不要假装已接管淘宝/京东站内信。"
        : `把「${productName}」做完。${brief.customerDoes}`,
    reviewOps
      ? "事实，不能编、不能让步：只发门店编号不能自动拉评、也不能自动发出。编号只是记住哪家店。自动回复还要该平台开放平台的 AppKey、Secret 和评价接口。AppKey 不是商家 App 登录号，普通商家后台通常没有。没有凭证可以先把评价贴过来起草，他再发出。不要索要商家 App 登录密码。单凭商家号查不到店铺。不要去平台抓取。"
      : csOps
        ? "事实：当前默认是起草，不是自动发站内信。没有开放平台消息接口就明确说要他自己复制发出。不要索要商家 App 登录密码。"
        : "不要索要任何 App 登录密码。资料不够就说明还缺哪一项，一次只问一件。不要把「开店平台」当成缺的资料。",
    shopOps && progress ? `手头进度（只作判断，不要原文复读）：\n${progress}` : "",
    notes.length
      ? `本轮系统已经做了这些事，请自然告诉他，不要说「系统提示」：\n${notes.join("\n")}`
      : "",
    shopOps && playbook?.extraPrompt
      ? `已有回复规范：\n${playbook.extraPrompt}\n店名：${playbook.shopDisplayName || "未填"}。自称：${playbook.addressAs || "我们"}。口吻：${playbook.tone || "稳重热情"}。${playbook.mustInclude ? `必须带上：${playbook.mustInclude}。` : ""}${playbook.neverSay ? `不要说：${playbook.neverSay}。` : ""}`
      : shopOps
        ? "回复规范还没有。等他愿意写的时候，用一两句问清语气、忌口、差评怎么处理即可，不必一次要完整模板。"
        : playbook?.extraPrompt
          ? `客户已给的场景说明：\n${playbook.extraPrompt}`
          : "",
    materials ? `心里的资料地图（需要时再提一项）：${materials}` : "",
    brief.refuse.length ? `请勿接收：${brief.refuse.join("、")}。` : "",
    vision,
    "说话像微信里的客服：短、具体、有温度。一次只推进一件最有用的事，并说清为什么现在做这个。答完可以自然问一句他方不方便。",
    "只输出给客户看的正文。不要输出自检、检查清单、评分表或「听起来像微信客服吗」这类内部核对。",
    enfirstSystemAddon(replyLanguageLabel(locale)),
  ]
    .filter(Boolean)
    .join("\n\n");
}
