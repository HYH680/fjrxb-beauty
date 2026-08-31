import { platformLabel, guidedPlatforms } from "@/lib/platforms";

export type MaterialSlot =
  | "prompt"
  | "key"
  | "shopId"
  | "pull"
  | "reply"
  | "data";

export type ServiceKind =
  | "review-ops"
  | "cs-ops"
  | "vision-run"
  | "playbook-run"
  | "key-connect";

export type MaterialItem = {
  slot: MaterialSlot;
  label: string;
  required: boolean;
  hint?: string;
};

export type ServiceBrief = {
  kind: ServiceKind;
  customerDoes: string;
  materials: MaterialItem[];
  refuse: string[];
  followUps: string[];
  afterLand: string;
};

const REFUSE_LOGIN = ["商家 App 登录密码", "开店宝/千牛/拼多多商家后台密码"];

function brief(input: ServiceBrief): ServiceBrief {
  return {
    ...input,
    refuse: [...new Set([...REFUSE_LOGIN, ...input.refuse])],
  };
}

const REVIEW_RETAIL = brief({
  kind: "review-ops",
  customerDoes:
    "自动拉评需要你自备各平台开放平台兼容接口（webhook），不是美团/点评官方一键授权。没有凭证也能先贴评价起草。不要发商家 App 登录密码。",
  materials: [
    {
      slot: "prompt",
      label: "门店回复规范",
      required: true,
      hint: "助手会先问平台，再请你发这一份共用口吻",
    },
    {
      slot: "key",
      label: "开放平台凭证 / 兼容接口",
      required: false,
      hint: "自备 pull/reply 地址；非官方 SDK",
    },
    { slot: "shopId", label: "门店编号", required: false, hint: "助手问到对应平台再发" },
  ],
  refuse: ["饿了么商家密码"],
  followUps: guidedPlatforms("restaurant-cs").map((id) => platformLabel(id)),
  afterLand: "按本店口径起草。凭证与兼容接口齐全的平台再自动同步。",
});

const REVIEW_SHOP = brief({
  kind: "review-ops",
  customerDoes:
    "自动同步评价需自备各平台开放平台兼容接口，不是淘宝/京东官方一键授权。没有凭证可先贴评价起草。",
  materials: [
    { slot: "prompt", label: "店铺回复规范", required: true, hint: "各平台共用一份，助手会引导你发" },
    { slot: "key", label: "开放平台凭证 / 兼容接口", required: false, hint: "自备 webhook，非官方 SDK" },
    { slot: "shopId", label: "店铺编号", required: false, hint: "助手问到对应平台再发" },
  ],
  refuse: ["千牛登录密码", "拼多多商家密码"],
  followUps: guidedPlatforms("shop-review").map((id) => platformLabel(id)),
  afterLand: "接入后按本店提示词起草；差评默认先给人看再发。",
});

const CS_SHOP = brief({
  kind: "cs-ops",
  customerDoes:
    "本服务帮你按店铺口吻起草咨询/退换话术。把顾客消息贴到工作台即可。目前不能直接接管淘宝/京东等站内信；要自动发出需另接各平台开放平台消息接口。",
  materials: [
    { slot: "prompt", label: "店铺口吻和禁答边界", required: true, hint: "助手会先问平台再引导你发" },
    { slot: "data", label: "物流时效、退换政策", required: true },
    { slot: "key", label: "开放平台消息接口（可选）", required: false, hint: "只有要自动发出时才需要" },
  ],
  refuse: [],
  followUps: guidedPlatforms("shop-cs").map((id) => platformLabel(id)),
  afterLand: "按店铺政策起草可直接复制的回复；自动发出需另接消息接口。",
});

const CS_CROSS = brief({
  kind: "cs-ops",
  customerDoes:
    "把买家消息或差评贴过来，按站点语言起草回复。复杂纠纷只出草稿。本站不会自动登录 Amazon / Shopee / Temu 后台。",
  materials: [
    { slot: "prompt", label: "店铺政策：物流、退货、禁答", required: true },
    { slot: "data", label: "站点语言和常用话术", required: true },
    { slot: "key", label: "卖家开放平台密钥（可选）", required: false },
  ],
  refuse: [],
  followUps: ["这是退货政策", "用英语回催发货", "这是买家消息"],
  afterLand: "按政策起草多语言回复；由人确认后发出。",
});

const VISION = (
  customerDoes: string,
  materials: MaterialItem[],
  followUps: string[],
  afterLand: string
) =>
  brief({
    kind: "vision-run",
    customerDoes,
    materials,
    refuse: [],
    followUps,
    afterLand,
  });

const PLAYBOOK = (
  customerDoes: string,
  materials: MaterialItem[],
  followUps: string[],
  afterLand: string
) =>
  brief({
    kind: "playbook-run",
    customerDoes,
    materials,
    refuse: [],
    followUps,
    afterLand,
  });

const KEY = (vendor: string) =>
  brief({
    kind: "key-connect",
    customerDoes: `去 ${vendor} 控制台开通模型和账单。`,
    materials: [
      { slot: "prompt", label: "使用场景和提示词", required: true },
      { slot: "key", label: `${vendor} 官方 API Key`, required: false, hint: "正式生产走你自己的账号时再发" },
    ],
    refuse: [],
    followUps: ["这是我们的使用场景", "这是官方 API Key", "先按这个场景跑一条"],
    afterLand: "收下场景后按你的提示词工作；有官方密钥则加密保存并探测接口。",
  });

const BRIEFS: Record<string, ServiceBrief> = {
  "restaurant-cs": REVIEW_RETAIL,
  "shop-review": REVIEW_SHOP,
  "shop-cs": CS_SHOP,
  "cross-border-cs": CS_CROSS,
  "menu-optimize": PLAYBOOK(
    "从收银或外卖后台导出近 30 天销量，能导出评价更好。",
    [
      { slot: "prompt", label: "餐厅定位和要保留的招牌菜", required: true },
      { slot: "data", label: "销量表、菜单、评价摘录", required: true },
    ],
    ["这是菜单和销量", "定位是社区快餐", "帮我看哪些该删"],
    "按你的定位分析菜单和定价，给出可执行调整。"
  ),
  "inventory-forecast": PLAYBOOK(
    "导出历史销量。有天气敏感品类可一并说明。",
    [
      { slot: "prompt", label: "品类和备货约束", required: true },
      { slot: "data", label: "历史销量表", required: true },
    ],
    ["这是近三个月销量", "周末和节假日怎么备", "损耗高的是哪些"],
    "按你的数据给出备货建议。"
  ),
  "retail-marketing": PLAYBOOK(
    "准备品牌名、门店特色和近期活动。要发图可把海报截图一并发来。",
    [
      { slot: "prompt", label: "品牌口吻和主打菜", required: true },
      { slot: "data", label: "活动信息或过往内容", required: false },
    ],
    ["这是品牌口吻", "做周末套餐朋友圈", "这张海报怎么改"],
    "按口吻出可直接发的文案和活动方案。"
  ),
  "shop-listing": PLAYBOOK(
    "准备类目、竞品标题和现有详情。正式上架仍走平台规则。",
    [
      { slot: "prompt", label: "类目、卖点和禁用词偏好", required: true },
      { slot: "data", label: "现有标题/详情或主图", required: true },
    ],
    ["这是现在的标题详情", "类目是家居收纳", "标出广告法风险"],
    "改标题和卖点，并标出容易违规的词。"
  ),
  "cross-border-listing": PLAYBOOK(
    "准备目标站点、类目和认证书写。上架走各平台后台。",
    [
      { slot: "prompt", label: "站点、语言和禁售约束", required: true },
      { slot: "data", label: "中文卖点或现有 listing", required: true },
    ],
    ["站点是 Amazon 美国", "这是中文卖点", "帮我写五点描述"],
    "按站点用语改标题和描述，并提醒禁售词。"
  ),
  "shop-photo-audit": VISION(
    "在左侧上传主图、详情或包装照片，或 PDF（自动转前几页）。不代替平台审核。",
    [
      { slot: "prompt", label: "类目和必须出现的信息", required: false },
      { slot: "data", label: "主图/详情/包装照片或 PDF", required: true, hint: "直接粘贴、上传或发 PDF" },
    ],
    ["我拍了主图", "详情截图在这", "看有没有违规词"],
    "标出错字、图文不符和可能违规的表述。"
  ),
  "contract-photo-review": VISION(
    "上传合同页照片、截图或 PDF（自动转前 3 页）。结果是审阅草稿，不是律师意见。",
    [
      { slot: "prompt", label: "合同类型和你最担心的点", required: false },
      { slot: "data", label: "合同拍照、扫描件或 PDF", required: true, hint: "PDF 每次最多转前 3 页" },
    ],
    ["我拍了一页合同", "重点看赔偿和解约", "看不清的字怎么处理"],
    "标出需要盯的条款并说明原因。"
  ),
  "invoice-photo": VISION(
    "上传发票、回单照片或 PDF。入账前请人核对。",
    [{ slot: "data", label: "发票或回单照片/PDF", required: true }],
    ["拍了一张发票", "这是回单", "看不清的字段标出来"],
    "抽出金额、日期和对方名称，看不清的会标出。"
  ),
  "homework-grade": VISION(
    "上传作业照片或 PDF（自动转前几页）。结果给老师确认后再发给学生，不代替正式阅卷。",
    [
      { slot: "prompt", label: "学科和批改标准", required: false },
      { slot: "data", label: "作业照片或 PDF", required: true },
    ],
    ["这是作文", "这是数学题", "按这个标准批"],
    "给出批改意见和评语草稿，由老师确认。"
  ),
  "smart-bookkeeping": VISION(
    "上传发票或回单照片/PDF，帮你抽出字段并建议科目。不对接税局、不自动申报；正式入账请会计核对。",
    [
      { slot: "prompt", label: "常用科目和记账习惯", required: false },
      { slot: "data", label: "发票或回单照片/PDF", required: true },
    ],
    ["拍了一张发票", "建议记哪个科目", "这是回单"],
    "抽出关键字段并给出入账建议草稿。"
  ),
  "business-report": PLAYBOOK(
    "粘贴或上传近月收支表、成本摘要。报告是分析草稿，不是审计结论。",
    [
      { slot: "prompt", label: "关心的指标和行业", required: true },
      { slot: "data", label: "收支表或经营数据", required: true },
    ],
    ["这是本月收支", "成本哪块高", "给下月建议"],
    "按你的数据写经营分析草稿。"
  ),
  "contract-reminder": PLAYBOOK(
    "把合同关键日期（到期、付款、续费）发到对话里，我会帮你整理提醒清单。本站暂不发微信/邮件推送。",
    [
      { slot: "data", label: "合同名称与关键日期", required: true },
      { slot: "prompt", label: "提前提醒天数偏好", required: false },
    ],
    ["合同还有 30 天到期", "这是付款节点表", "帮我列提醒清单"],
    "整理到期与付款提醒清单，由你自行设置日历提醒。"
  ),
  "course-notes": PLAYBOOK(
    "发口播稿、逐字稿或课程大纲。录音文件需你先转成文字再贴过来（本站暂不直接转写音视频文件）。",
    [
      { slot: "prompt", label: "课程目标和受众", required: false },
      { slot: "data", label: "口播稿/逐字稿/大纲", required: true },
    ],
    ["这是逐字稿", "整理知识点", "出几道课后题"],
    "整理知识点摘要和习题草稿。"
  ),
  "enroll-copy": PLAYBOOK(
    "说明课程亮点、目标家长和机构口吻。",
    [
      { slot: "prompt", label: "口吻、课程卖点和禁说内容", required: true },
      { slot: "data", label: "过往文案或课程介绍", required: false },
    ],
    ["做朋友圈招生", "小红书笔记", "家长群话术"],
    "按口吻出可直接发的招生文案。"
  ),
  "resume-screen": PLAYBOOK(
    "发岗位 JD，再贴简历文本或截图说明。批量文件请先整理成文本。",
    [
      { slot: "prompt", label: "岗位 JD 和硬性条件", required: true },
      { slot: "data", label: "简历文本或要点", required: true },
    ],
    ["这是 JD", "这是简历", "按匹配度排序"],
    "按 JD 打分排序并标出匹配点与风险。"
  ),
  "interview-questions": PLAYBOOK(
    "说明岗位级别和要考察的能力。",
    [{ slot: "prompt", label: "岗位、级别和考察重点", required: true }],
    ["出一面题", "要行为面试题", "技术岗"],
    "给出面试题和追问建议。"
  ),
  "hr-qa-bot": PLAYBOOK(
    "把员工手册、假期和报销政策发过来，按政策起草答复。",
    [
      { slot: "prompt", label: "公司制度和禁答边界", required: true },
      { slot: "data", label: "员工手册或制度摘录", required: true },
    ],
    ["年假怎么算", "报销流程", "这是制度原文"],
    "按制度起草可发出的答复草稿。"
  ),
  "open-resume": PLAYBOOK(
    "说明目标岗位，粘贴简历全文或关键段落。只改自己的简历，不要用此服务筛别人的简历。",
    [
      { slot: "prompt", label: "目标岗位 / 行业 / 中或英", required: true },
      { slot: "data", label: "简历原文", required: true },
    ],
    ["改成 ATS 友好", "量化项目成果", "出中英两版"],
    "按 ATS 结构改 bullet、补量化并标出仍需你核对的事实。"
  ),
  "cover-letter": PLAYBOOK(
    "贴简历要点和目标 JD；可指定中文或英文、正式或偏口语。",
    [
      { slot: "prompt", label: "岗位 JD 与口吻要求", required: true },
      { slot: "data", label: "简历要点或完整简历", required: true },
    ],
    ["写一封求职信", "英文 Cover Letter", "更短一点"],
    "给出可改的求职信草稿，并标出对齐 JD 的句子。"
  ),
  "mock-interview": PLAYBOOK(
    "发简历和目标 JD，说明一面/二面或英文面试。工作台扮演面试官，不是给 HR 出题。",
    [
      { slot: "prompt", label: "岗位、轮次、中/英", required: true },
      { slot: "data", label: "简历与 JD", required: true },
    ],
    ["开始模拟面试", "追问项目细节", "给我评分复盘"],
    "出题、追问、按维度评分，并给改进建议。"
  ),
  "job-search-agent": PLAYBOOK(
    "说明求职阶段（海投 / 精投 / 面试周），可贴 JD 列表和现有材料。不代替自动登录招聘站投递。",
    [
      { slot: "prompt", label: "目标方向、城市、优先级", required: true },
      { slot: "data", label: "JD 列表或材料现状", required: false },
    ],
    ["评这份 JD 匹配度", "本周投递清单", "面试准备包"],
    "给出匹配评估、改材料清单与本周节奏，不自动投第三方站点。"
  ),
  "gpt-5.6-sol": KEY("OpenAI"),
  "qwen-plus": KEY("阿里云百炼"),
  "deepseek-chat": KEY("DeepSeek"),
  "doubao-seed": KEY("火山方舟"),
  "claude-sonnet": KEY("Anthropic"),
  "gemini-pro": KEY("Google"),
  "ernie-5": KEY("百度千帆"),
  "dall-e-3": VISION(
    "写清主体、风格和用途后出图。本服务首选万相，备选即梦。",
    [
      { slot: "prompt", label: "出图需求 / 提示词", required: true },
    ],
    ["出一张海报", "白底商品图", "先帮我改提示词再出图"],
    "按提示词调用万相出图，并给出可复用的风格说明。"
  ),
  "jimeng-image": VISION(
    "在工作台选即梦 4.0，写清主体、风格和用途后出图。首选即梦，备选万相。",
    [
      { slot: "prompt", label: "出图需求 / 提示词", required: true },
    ],
    ["电商主图", "国风海报", "先改提示词再出图"],
    "按提示词调用即梦出图，并给出可复用的风格说明。"
  ),
  "stable-diffusion-xl": VISION(
    "写清海报主体、风格和用途后出图。本服务首选万相高质量，备选即梦。",
    [
      { slot: "prompt", label: "出图需求 / 提示词", required: true },
    ],
    ["品牌主视觉", "活动海报", "先改提示词再出图"],
    "按提示词调用万相出图，并给出可复用的风格说明。"
  ),
  "midjourney-api": VISION(
    "写清主体、风格、光影与构图。出图从本站工作台发起；本机须已启动 midjourney-proxy。",
    [
      { slot: "prompt", label: "出图需求 / Midjourney 提示词", required: true },
    ],
    ["品牌概念板", "国风海报", "先改提示词再出图"],
    "按提示词调用自建 Midjourney 代理出图，并给出可复用的风格说明。"
  ),
  "whisper-api": PLAYBOOK(
    "上传会议/访谈音频，或粘贴已有转写稿，说明纪要用途（对内例会 / 客户访谈）。",
    [
      { slot: "prompt", label: "会议主题、参会角色、要盯的待办", required: true },
      { slot: "data", label: "音频文件或转写文本", required: true, hint: "工作台支持直传音频转写" },
    ],
    ["这是录音", "只要待办和决议", "按发言人分段"],
    "先转写再整理成纪要草稿与待办清单。"
  ),
  "meeting-minutes": PLAYBOOK(
    "例会录音或转写稿进来，按固定模板出纪要：决议、待办、风险。",
    [
      { slot: "prompt", label: "团队名、例会频率、模板偏好", required: true },
      { slot: "data", label: "音频或文字稿", required: true },
    ],
    ["这是周会录音", "用我们的纪要模板", "标出未闭环待办"],
    "输出可转发的纪要与待办表。"
  ),
  "pinecone": PLAYBOOK(
    "把制度/FAQ 写入右侧「本站知识库」，再在左侧提问；回答会引用检索片段。",
    [
      { slot: "prompt", label: "要问的制度/场景问题", required: true },
      { slot: "data", label: "待入库资料（也可用知识库面板）", required: false },
    ],
    ["年假怎么算", "把这段 FAQ 入库", "报销要哪些材料"],
    "基于已入库资料检索作答，并标出依据片段。"
  ),
  "weaviate-cloud": PLAYBOOK(
    "写入资料到本站知识库（关键词+向量混合打分），再提问验证召回。",
    [
      { slot: "prompt", label: "检索问题", required: true },
      { slot: "data", label: "待入库语料", required: false },
    ],
    ["精确找条款", "语义相近怎么问", "这段文档先入库"],
    "混合检索后给出可核对的答复草稿。"
  ),
  "ppt-deck": PLAYBOOK(
    "说明汇报对象、页数上限和必须出现的数据点，再给大纲与每页要点。",
    [
      { slot: "prompt", label: "主题、听众、时长/页数", required: true },
      { slot: "data", label: "素材要点或数据", required: false },
    ],
    ["做融资 BP 12 页", "给老板的周报 PPT", "只要大纲和讲稿"],
    "输出页结构、标题、要点与讲者备注。"
  ),
  "sales-leads": PLAYBOOK(
    "说明产品、客群和当前线索来源，再写跟进节奏与话术。",
    [
      { slot: "prompt", label: "产品卖点与理想客户画像", required: true },
      { slot: "data", label: "线索列表或阶段说明", required: false },
    ],
    ["这是线索表", "卡在报价阶段", "写一通跟进话术"],
    "给出阶段动作、话术和下次跟进提醒。"
  ),
  "work-im-bot": PLAYBOOK(
    "说明要用企微/钉钉/飞书的哪一类机器人，以及要办的事（审批提醒、FAQ、值班）。",
    [
      { slot: "prompt", label: "平台 + 机器人场景", required: true },
      { slot: "key", label: "Webhook / 应用凭证", required: false, hint: "正式对接时再发" },
    ],
    ["企微群通知机器人", "钉钉审批助手", "飞书知识库问答"],
    "给出接入步骤、权限清单与首条消息模板。"
  ),
  "sheet-analyst": PLAYBOOK(
    "上传或粘贴表格（CSV/粘贴行列），用自然语言问指标与异常。",
    [
      { slot: "prompt", label: "要看的指标或问题", required: true },
      { slot: "data", label: "表格数据", required: true },
    ],
    ["这是销售明细", "按门店汇总", "找出异常波动"],
    "输出指标解读、透视建议与可粘贴结论。"
  ),
  "elevenlabs-tts": PLAYBOOK(
    "说明要配音的文案、语气和场景。可先在工作台用通用音色试听。",
    [
      { slot: "prompt", label: "口吻、语速和禁说内容", required: true },
      { slot: "data", label: "口播稿或脚本", required: true },
    ],
    ["这是口播稿", "语气要稳重", "先合成试听"],
    "按口吻改稿并给出可合成的试听文案。"
  ),
  "voice-clone": PLAYBOOK(
    "先选场景（1 中文口播 / 2 克隆 / 3 英文旁白 / 4 实时客服 / 5 成本量产）→ 再选高中低档 → 再定模型。上传已获授权样本后试听。缺密钥会自动落到已开通通道（千问 / MiniMax）。禁止未经授权克隆他人声音。",
    [
      {
        slot: "prompt",
        label: "场景编号 1–5 + 授权说明",
        required: true,
        hint: "例：选 2 声音克隆，我已获授权",
      },
      { slot: "data", label: "人声样本（音频）", required: true },
      { slot: "data", label: "要试听的口播稿", required: true },
    ],
    ["我选 2 克隆，高档", "我已获授权", "用这句稿试听"],
    "按场景与档位登记克隆音色并合成试听。"
  ),
  "ai-music-bgm": PLAYBOOK(
    "说明用途（短视频 BGM / 广告片头 / 课程）、时长、情绪和乐器偏好。成曲从本站工作台发起；本机须已启动 suno-api。",
    [
      { slot: "prompt", label: "用途、时长、情绪、乐器", required: true },
      { slot: "data", label: "参考曲或画面说明", required: false },
    ],
    ["15 秒轻松片头", "课程背景轻音乐", "给短视频 BGM 成曲"],
    "优先调用自建 suno-api 成曲试听；同时给出可投喂自有账号的提示词。"
  ),
  "runway-gen3": PLAYBOOK(
    "写清镜头主体、动作、光线与风格；可上传首帧/商品图做图生视频。成片在工作台「Runway 在线成片」生成。",
    [
      { slot: "prompt", label: "时长、画幅、运镜与风格", required: true },
      { slot: "data", label: "首帧 / 商品图说明", required: false },
    ],
    ["白底产品缓慢旋转 5 秒", "竖屏口播片头", "上传主图做成动效"],
    "先对齐镜头脚本，再用工作台一键成片。"
  ),
  "kling-video": PLAYBOOK(
    "写清镜头主体、动作、光线与风格；可上传首帧，或同时给尾帧做首尾帧控镜。成片在工作台「可灵短视频」生成。",
    [
      { slot: "prompt", label: "时长、画幅、运镜、首尾帧", required: true },
      { slot: "data", label: "首帧 / 尾帧 / 商品图", required: false },
    ],
    ["电商主图做成 5–10 秒动效", "首帧货架、尾帧特写", "先改提示词再成片"],
    "先对齐镜头与首尾帧，再用可灵一键成片。"
  ),
  "grok-chat": KEY("xAI / 兼容中转"),
  "langchain-pro": PLAYBOOK(
    "把制度、接口文档写入右侧知识库，再在对话里提问；回答会引用入库片段。",
    [
      { slot: "prompt", label: "要问的业务场景", required: true },
      { slot: "data", label: "接口说明、制度或 FAQ", required: true },
    ],
    ["这段制度先入库", "客服知识库怎么问", "这个接口文档怎么检索"],
    "资料入库后即可检索问答，不托管 LangChain Cloud。"
  ),
  "cursor-pro": PLAYBOOK(
    "把仓库规范/评审清单写入知识库，再贴报错或 PR 描述做代码问答。",
    [
      { slot: "prompt", label: "语言栈和当前问题", required: true },
      { slot: "data", label: "规范、报错或 diff 摘要", required: true },
    ],
    ["这段规范入库", "这个报错怎么修", "帮我写评审清单"],
    "按你们的栈给可执行改法。Cursor 编辑器席位需自备。"
  ),
  "gsap-skills": PLAYBOOK(
    "说明你的框架（React/Vue/原生）和动效目标；需要装 Cursor skill 时按官方命令操作。",
    [
      { slot: "prompt", label: "动效场景或要写的动画描述", required: true },
      { slot: "data", label: "相关组件/HTML 片段（可选）", required: false },
    ],
    [
      "怎么在 Cursor 安装 gsap-skills",
      "写一段 ScrollTrigger 滚动钉住",
      "React 里用 useGSAP 入场动画",
    ],
    "先给安装/选用哪条子技能，再给可粘贴的 GSAP 代码。技能本身 MIT 开源，不收 Club 费。"
  ),
  "watermarks-remover": PLAYBOOK(
    "粘贴你有权处理的文稿，或说明要装 Cursor skill / 自建清理服务。不处理照片 Logo 擦除。",
    [
      { slot: "prompt", label: "目标（清理粘贴文 / 安装 skill / C2PA 指引）", required: true },
      { slot: "data", label: "待清理文稿（Markdown/纯文本，可选）", required: false },
    ],
    [
      "怎么在 Cursor 安装 watermarks-remover",
      "清理这段文里的隐形字符并润一版",
      "C2PA / 图片元数据怎么自建剥离",
    ],
    "先给安装或自建服务步骤；有文稿则清 Unicode 并改写润稿，明确「可核验 vs 尽力而为」边界。MIT 开源，不声称过检测器。"
  ),
  "pinecone-avatars": PLAYBOOK(
    "说明框架（Next/Vite）和注册页结构；需要装 Cursor skill 或嵌 AvatarPicker 时按步骤操作。",
    [
      { slot: "prompt", label: "目标（装 skill / 嵌选择器 / 导出落库）", required: true },
      { slot: "data", label: "相关注册页/组件片段（可选）", required: false },
    ],
    [
      "怎么在 Cursor 安装 pinecone-avatars skill",
      "注册页嵌入 AvatarPicker",
      "导出 SVG/PNG 并保存用户配置",
    ],
    "先给 npm/skill 安装，再给可粘贴的 AvatarPicker 示例。不是向量库 pinecone；不托管头像 CDN。"
  ),
  "dicebear": PLAYBOOK(
    "说明要默认头像还是可换风格；给出框架与是否自建 HTTP。",
    [
      { slot: "prompt", label: "风格偏好与接入方式（HTTP / npm）", required: true },
      { slot: "data", label: "现有用户 id / seed 规则（可选）", required: false },
    ],
    [
      "怎么在 Cursor 安装 dicebear skill",
      "用 seed 生成 lorelei 风格头像 URL",
      "Next 里用 @dicebear/core 渲染 SVG",
    ],
    "先给风格选型与许可证提醒，再给 URL 或代码。不托管 DiceBear 云。"
  ),
  "upload-crop-image": PLAYBOOK(
    "说明要圆形头像还是矩形封面，以及表单是否已用 RHF。",
    [
      { slot: "prompt", label: "裁剪比例与目标框架", required: true },
      { slot: "data", label: "现有表单/组件路径（可选）", required: false },
    ],
    [
      "怎么在 Cursor 安装 upload-crop-image skill",
      "移植 ImageCropField 到注册表单",
      "圆形头像输出后怎么交给上传接口",
    ],
    "先给组件移植步骤，再给 RHF 示例。存储可另接 UploadThing；不假装本站收文件。"
  ),
  "uploadthing": PLAYBOOK(
    "说明 Next App Router 还是 Pages，以及要传头像还是通用附件。",
    [
      { slot: "prompt", label: "上传场景与文件类型限制", required: true },
      { slot: "data", label: "现有 API 路由结构（可选）", required: false },
    ],
    [
      "怎么在 Cursor 安装 uploadthing skill",
      "写一个头像专用 UploadThing 路由",
      "密钥环境变量怎么配（不代开账户）",
    ],
    "先给 createUploadthing 示例与 env 清单；明确云配额自备。不托管用户文件。"
  ),
  "supabase-avatar-example": PLAYBOOK(
    "说明是对照官方示例学流程，还是把上传模式迁到自有 Auth/存储。",
    [
      { slot: "prompt", label: "目标（对照示例 / 迁移到自有栈）", required: true },
      { slot: "data", label: "现有 Auth/存储方案简述（可选）", required: false },
    ],
    [
      "怎么在 Cursor 安装 supabase-avatar-example skill",
      "拆解 account 页头像上传链路",
      "不换 Supabase Auth 怎么复用上传模式",
    ],
    "强调这是示例参考，不强制换整套 Auth。给出 Storage + avatar_url 步骤与迁移清单。"
  ),
  "openai-assistants": KEY("OpenAI"),
  "replicate-api": VISION(
    "写清主体、风格和用途后出图。本服务首选 Replicate FLUX Schnell，备选 SDXL。",
    [
      { slot: "prompt", label: "出图需求 / 提示词", required: true },
    ],
    ["开源风格海报", "先改提示词再出图", "换成 SDXL"],
    "按提示词调用 Replicate 官方 API 出图。"
  ),
  "cohere-embed": PLAYBOOK(
    "把多语言资料写入右侧知识库；本服务嵌入走 Cohere Embed，再在对话里提问验证召回。",
    [
      { slot: "prompt", label: "要问的检索问题", required: true },
      { slot: "data", label: "待入库资料（也可用知识库面板）", required: false },
    ],
    ["这段英文 FAQ 先入库", "用中文怎么问", "多语言资料怎么切"],
    "入库后按 Cohere 向量检索作答，并标出依据片段。"
  ),
  "capcut-auto": PLAYBOOK(
    "上传口播或成片素材。工作台自动标高潮后，你可逐镜开关、改入出点、定画幅和时长，再一键站内出片。",
    [
      { slot: "prompt", label: "成片风格、时长和平台", required: true },
      { slot: "data", label: "口播稿或音视频", required: true },
    ],
    ["要 30 秒竖屏", "字幕大一点", "站内出片"],
    "站内导出带字幕的 MP4；需要进剪映精修时再下协同包。"
  ),
  "ai-subtitle": PLAYBOOK(
    "上传音视频，工作台转写并下载 SRT / VTT；需要外文时再选翻译语言。",
    [
      { slot: "data", label: "音视频文件", required: true, hint: "mp3 / wav / m4a / mp4" },
      { slot: "prompt", label: "目标语言（可空=保留原文）", required: false },
    ],
    ["出中文字幕", "译成英文 SRT", "口吻口语一点"],
    "导出可直接上片的字幕文件。"
  ),
  "smart-clip-select": PLAYBOOK(
    "上传视频/录音或贴逐字稿，说明成片用途；工作台标高潮并给出时间码。",
    [
      { slot: "prompt", label: "用途（抖音带货 / 课程切片等）", required: true },
      { slot: "data", label: "音视频或逐字稿", required: true },
    ],
    ["用于抖音带货", "只要金句 15 秒", "帮我选高潮"],
    "给出可剪时间码；成片请用 Runway 或剪映工作台。"
  ),
  "digital-human": PLAYBOOK(
    "先改口播稿，再右侧配音试听；需要画面时用 Runway 短视频成片。",
    [
      { slot: "prompt", label: "形象口吻与成片用途", required: true },
      { slot: "data", label: "口播稿", required: true },
    ],
    ["这是口播稿", "语气稳重一点", "配音后再出竖屏短片"],
    "改稿、配音、成片都在工作台完成。对口型数字人请自备 HeyGen/智影。"
  ),
  "ai-image-make": VISION(
    "写清主体、风格和用途，或上传参考图。本服务首选万相，备选即梦。海报/主图/Banner 用右侧场景。",
    [
      { slot: "prompt", label: "出图需求 / 提示词", required: true },
      { slot: "data", label: "参考图", required: false, hint: "可多张" },
    ],
    ["出一张海报", "白底商品图", "先改提示词再出图"],
    "按提示词调用万相或即梦出图。"
  ),
  "copy-to-image": PLAYBOOK(
    "发卖点文案或活动信息，说明要做海报还是 Banner。",
    [
      { slot: "prompt", label: "品牌口吻和画面用途", required: true },
      { slot: "data", label: "卖点文案或活动信息", required: true },
    ],
    ["做周末活动海报", "这是卖点", "要竖版小红书尺寸"],
    "先改文案，再给构图和出图提示词。"
  ),
  "ai-video-gen": PLAYBOOK(
    "描述要生成的视频，或上传商品静图；可同时给首帧与尾帧。工作台走 Runway 成片。",
    [
      { slot: "prompt", label: "时长、主体、运镜、首尾帧要求", required: true },
      { slot: "data", label: "静图 / 首帧（可选尾帧）", required: false },
    ],
    ["这张主图做成 5–10 秒动效", "首帧正面、尾帧侧面定格", "柔光棚拍轻推近"],
    "对齐脚本与首尾帧后，用工作台 Runway 成片或复制提示词。"
  ),
  "ai-comic-drama": PLAYBOOK(
    "先交故事脚本或大纲，再按「分镜→角色→配音稿→成片提示词」推进。风格可写国漫/美漫/水墨/竖屏短剧。",
    [
      { slot: "prompt", label: "风格、集数/时长、目标平台", required: true },
      { slot: "data", label: "故事脚本或大纲", required: true },
    ],
    ["先拆分镜表", "定男女主外形", "给第 1 集配音稿", "输出成片提示词"],
    "逐步交付分镜、角色、配音稿与成片提示词（出图出片走对应通道）。"
  ),
  "video-replica": VISION(
    "上传要对标的视频截图/分镜图，或把逐镜描述贴过来。",
    [
      { slot: "prompt", label: "要复刻的平台和时长", required: false },
      { slot: "data", label: "对标视频截图或分镜说明", required: true },
    ],
    ["这是对标视频截图", "拆运镜", "给我复刻提示词"],
    "拆结构、运镜和商品展示，并给出复刻脚本。"
  ),
  "prompt-reverse": VISION(
    "上传要反推的图片。",
    [
      { slot: "data", label: "原图", required: true },
      { slot: "prompt", label: "要复现同款还是升级一版", required: false },
    ],
    ["反推这张图", "只要英文提示词", "升级成更高级感"],
    "输出可复现同款的中英提示词。"
  ),
  "ai-workflow": PLAYBOOK(
    "说明你的内容团队现状和要串起来的环节。",
    [
      { slot: "prompt", label: "团队角色和发布渠道", required: true },
      { slot: "data", label: "现有流程或痛点", required: false },
    ],
    ["我们三人团队", "从选题到发主图", "加一个审核节点"],
    "给出可执行的创作工作流与资料清单。"
  ),
  "ai-self-media": PLAYBOOK(
    "本卡已拆到「自媒体」过道。请改开通选题/写稿/分镜等步骤卡；旧会话仍可按过往材料续聊。",
    [
      { slot: "prompt", label: "你想先做选题、写稿还是成片", required: true },
    ],
    ["去选题卡", "去写稿卡", "去成片卡"],
    "引导到自媒体过道对应步骤。"
  ),
  "we-media-topics": PLAYBOOK(
    "说明账号定位，并贴对标博主截图或热榜截图/文字。",
    [
      { slot: "prompt", label: "人设、主平台、禁说话题", required: true },
      { slot: "data", label: "对标博主或热榜截图/摘录", required: false },
    ],
    ["拆这个博主", "根据热榜出一周选题", "只要钩子标题"],
    "输出可拍的一周选题表与钩子备选。不爬平台后台。"
  ),
  "we-media-script": PLAYBOOK(
    "给选题、平台和人设口吻；可附过往成稿作风格参考。",
    [
      { slot: "prompt", label: "选题、平台、人设与禁说", required: true },
      { slot: "data", label: "过往成稿或灵感参考", required: false },
    ],
    ["写小红书笔记", "同一选题改口播稿", "再给两版灵感"],
    "出可复制成稿：标题、正文/口播、评论预答。"
  ),
  "we-media-storyboard": PLAYBOOK(
    "贴口播稿；有对标成片可上传截图。",
    [
      { slot: "prompt", label: "画幅、时长和风格", required: false },
      { slot: "data", label: "口播稿或对标分镜说明", required: true },
    ],
    ["拆成逐镜表", "每镜台词对齐", "压缩到 45 秒"],
    "输出镜号、画面、台词、时长与道具清单。"
  ),
  "we-media-voice": PLAYBOOK(
    "贴分镜台词或口播稿，说明语气；在工作台直接合成试听。",
    [
      { slot: "prompt", label: "语气、语速、禁说", required: true },
      { slot: "data", label: "口播稿 / 分镜台词", required: true },
    ],
    ["先改稿再试听", "语气更活泼", "按镜号分段"],
    "改稿后用本站 TTS 试听；真克隆请转「声音克隆」。"
  ),
  "we-media-video": PLAYBOOK(
    "上传账号风格参考图，并贴分镜表或镜头说明；可出图后再 Runway 成片。",
    [
      { slot: "prompt", label: "画幅、时长、账号风格关键词", required: true },
      { slot: "data", label: "分镜表或参考图", required: true },
    ],
    ["按账号风格出封面", "这镜做成 5 秒动效", "用 Runway 成片"],
    "先锁定风格出视觉素材，再一键成片。保持账号一致性。"
  ),
  "we-media-publish": PLAYBOOK(
    "贴成稿或成片说明，列出要发的平台。",
    [
      { slot: "prompt", label: "目标平台与发布时间偏好", required: true },
      { slot: "data", label: "成稿 / 口播摘要 / 封面文案", required: true },
    ],
    ["改成小红书+抖音两版", "给发布清单", "封面标题怎么写"],
    "输出多平台文案包与发布清单。不代登录、不自动发。"
  ),
  "we-media-review": PLAYBOOK(
    "贴播放/互动数据或后台截图，说明本条选题。",
    [
      { slot: "prompt", label: "本条选题与目标指标", required: false },
      { slot: "data", label: "数据表或后台截图", required: true },
    ],
    ["拆爆款要素", "流失点在哪", "回旋下周选题"],
    "复盘后给下期选题回旋建议。不对接平台数据 API。"
  ),
  "ecommerce-image": VISION(
    "上传商品原图，说明平台（淘宝/京东/Amazon 等）和要出的套图类型。",
    [
      { slot: "prompt", label: "平台、尺寸和风格", required: true },
      { slot: "data", label: "商品原图", required: true },
    ],
    ["淘宝主图五张", "做 Amazon A+", "白底抠图换场景"],
    "规划套图并给出每张的出图提示词。"
  ),
  "product-replica": VISION(
    "上传竞品或样品图，说明要复刻主图、场景图还是详情结构。",
    [
      { slot: "prompt", label: "目标平台和要复刻的模块", required: true },
      { slot: "data", label: "竞品/样品图", required: true },
    ],
    ["复刻这张主图", "详情结构对齐竞品", "换成我们的包装"],
    "拆竞品构图并给出复刻提示词与拍摄清单。"
  ),
  "ai-summarize": PLAYBOOK(
    "粘贴或上传要压缩的长文、纪要、邮件串。",
    [
      { slot: "prompt", label: "读者（老板/执行）和篇幅", required: false },
      { slot: "data", label: "原文或纪要", required: true },
    ],
    ["给老板三页以内", "只要待办", "标出风险"],
    "输出结构化摘要、要点和行动项。"
  ),
  "ai-rewrite": PLAYBOOK(
    "粘贴原文，说明目标平台和想要的口吻。",
    [
      { slot: "prompt", label: "目标平台和语气", required: true },
      { slot: "data", label: "原文", required: true },
    ],
    ["改成朋友圈", "更专业一版", "再短一半"],
    "给出多版改写并说明改动意图。"
  ),
  "image-matting": VISION(
    "上传商品或人像原图，说明要白底、透明底还是换场景。",
    [
      { slot: "prompt", label: "抠图目标和背景要求", required: true },
      { slot: "data", label: "原图", required: true },
    ],
    ["要白底主图", "换海边场景", "毛发边缘怎么处理"],
    "拆边缘与遮挡，并给出出图提示词与验收点。"
  ),
  "image-enhance": VISION(
    "上传糊图、暗图或压缩损伤图，说明用途（上架/打印/归档）。",
    [
      { slot: "prompt", label: "用途和最想修的问题", required: false },
      { slot: "data", label: "待修复图片", required: true },
    ],
    ["先修清晰度", "色偏怎么调", "给超分提示词"],
    "诊断问题并给出修复优先级与提示词。"
  ),
  "content-moderation": VISION(
    "上传主图/详情截图或粘贴文案，说明目标平台。",
    [
      { slot: "prompt", label: "平台和类目", required: false },
      { slot: "data", label: "待审图文", required: true },
    ],
    ["扫一遍违禁", "有没有虚假宣传", "给修改建议"],
    "标出风险点并给人复核清单（非正式审核结论）。"
  ),
  "image-search": VISION(
    "上传样品或竞品图，说明要找的品类或用途。",
    [
      { slot: "prompt", label: "品类和检索用途", required: false },
      { slot: "data", label: "样品/竞品图", required: true },
    ],
    ["拆材质和版型", "给中英关键词", "写一段可检索描述"],
    "拆构图并输出关键词与描述（不直接爬站）。"
  ),
  "table-ocr": VISION(
    "上传表格照片、对账单或含表 PDF。入账前请人核对。",
    [
      { slot: "prompt", label: "要抽出的列或用途", required: false },
      { slot: "data", label: "表格照片/PDF", required: true },
    ],
    ["还原成可粘贴表格", "模糊格标出来", "只要金额列"],
    "尽量还原行列，并标出看不清的格子。"
  ),
  "doc-compare": PLAYBOOK(
    "粘贴或上传 A/B 两版合同/制度；也可拍关键页并说明哪边是新版。",
    [
      { slot: "prompt", label: "哪边是新版、最关心的条款", required: false },
      { slot: "data", label: "两版文本或关键页图片", required: true },
    ],
    ["列出增删改", "哪些加重了责任", "给我复核清单"],
    "输出差异摘要与风险提示（非法务结论）。"
  ),
  "seal-detect": VISION(
    "上传合同盖章页或签收页照片。结果仅供归档复核，不鉴定真伪。",
    [{ slot: "data", label: "盖章页照片", required: true }],
    ["有几枚章", "清不清晰", "可疑点标出来"],
    "标出印章/签字区域、清晰度与可疑点。"
  ),
  "brand-visual": VISION(
    "开通后说明行业、受众和禁忌；可上传现有 Logo 或竞品参考图。匹配模型给方向与提示词，不是矢量成品。",
    [
      { slot: "prompt", label: "品牌名、行业、受众、禁忌", required: true },
      { slot: "data", label: "现有 Logo / 竞品参考图", required: false },
    ],
    ["定气质和配色", "给三套 Logo 方向", "输出可出图提示词"],
    "匹配模型后输出气质、配色、Logo 方向与出图提示词（不含矢量源文件）。"
  ),
  "poster-layout": PLAYBOOK(
    "开通后给出主题、尺寸和必出文案/CTA；匹配模型先定版式，再进出图。",
    [
      { slot: "prompt", label: "主题、尺寸、必出文案与 CTA", required: true },
      { slot: "data", label: "参考海报或品牌色", required: false },
    ],
    ["做竖版活动海报", "信息层级怎么排", "给出版式后再出图提示词"],
    "匹配模型后输出信息层级、栅格与落位说明，并附出图提示词。"
  ),
  "ui-wireframe": PLAYBOOK(
    "开通后说明产品形态（App/H5/官网）、目标用户和一句话任务，再由匹配模型拆页面结构。",
    [
      { slot: "prompt", label: "形态、用户与核心任务", required: true },
      { slot: "data", label: "现有文案或竞品截图说明", required: false },
    ],
    ["先做落地页线框", "拆注册流程三屏", "只要信息架构"],
    "匹配模型后输出信息架构、线框区块、关键文案与交互备注。"
  ),
  "packaging-design": VISION(
    "开通后上传产品图或说明品类与渠道；匹配模型给包装结构与提示词，不开模。",
    [
      { slot: "prompt", label: "品类、渠道、卖点与禁忌", required: true },
      { slot: "data", label: "产品实物图 / 现有包装", required: false },
    ],
    ["做礼盒方案", "瓶贴怎么排", "给主视觉出图提示词"],
    "匹配模型后输出盒型/标签结构、主视觉方向与出图提示词。"
  ),
};

const FALLBACK = PLAYBOOK(
  "按服务页说明准备场景资料。有官方接口则一并申请。",
  [
    { slot: "prompt", label: "使用场景和提示词", required: true },
    { slot: "key", label: "相关官方密钥或接口", required: false },
  ],
  ["这是使用场景", "这是官方资料", "先按这个跑通"],
  "收下资料后按你的场景接入并跑通。"
);

export function getServiceBrief(productId: string): ServiceBrief {
  return BRIEFS[productId] ?? FALLBACK;
}

export function isReviewOps(productId: string) {
  return getServiceBrief(productId).kind === "review-ops";
}

export function showsPlatformSync(productId: string) {
  return getServiceBrief(productId).kind === "review-ops";
}

export function isVisionRun(productId: string) {
  return getServiceBrief(productId).kind === "vision-run";
}

export function defaultPlatform(productId: string) {
  if (productId === "restaurant-cs") return "meituan";
  if (productId === "cross-border-cs" || productId === "cross-border-listing") {
    return "amazon";
  }
  if (productId.startsWith("shop-") || productId.startsWith("cross-")) return "taobao";
  return "shop";
}

export { platformLabel };

export function welcomeMessage(productName: string, brief: ServiceBrief) {
  if (brief.kind === "vision-run") {
    return [
      `你好，我是「${productName}」这边的客服。`,
      "",
      "把照片或 PDF 直接粘贴/上传到这边。PDF 会自动转成前几页图片再看。发完告诉我你最想盯哪一点。",
      brief.customerDoes,
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (brief.kind === "review-ops") {
    return [
      `你好，我是「${productName}」这边的客服。`,
      "",
      "你先说现在最急的就行：差评来不及回、想配上自动拉评，还是还不清楚要准备什么。直接问我，我带你做。",
      "也可以先点下面你在做的平台。登录密码不用发。",
    ].join("\n");
  }
  if (brief.kind === "cs-ops") {
    return [
      `你好，我是「${productName}」这边的客服。`,
      "",
      "把顾客消息或要回复的内容贴过来，我按你们店铺口吻起草。目前是起草，不是自动接管站内信。",
      "也可以先把物流/退换政策和口吻发我。登录密码不用发。",
    ].join("\n");
  }
  const lines = [
    `你好，我是「${productName}」这边的客服。把你手头的资料丢过来，或先告诉我卡在哪，我帮你把这件事做完。`,
    "",
    "我这边会用到的大致有：",
    ...brief.materials.map(
      (item) =>
        `- ${item.required ? "常用" : "有则更好"}：${item.label}${item.hint ? `。${item.hint}` : ""}`
    ),
  ];
  if (brief.customerDoes) {
    lines.push("", brief.customerDoes);
  }
  lines.push("", "登录密码不用发。你现在方便从哪一步开始？");
  return lines.join("\n");
}

export function missingMaterials(
  brief: ServiceBrief,
  state: {
    hasPrompt: boolean;
    hasKey: boolean;
    hasShopId: boolean;
    hasPull: boolean;
    hasReply: boolean;
    hasData: boolean;
  }
) {
  return brief.materials.filter((item) => {
    if (!item.required) return false;
    if (item.slot === "prompt") return !state.hasPrompt;
    if (item.slot === "key") return !state.hasKey;
    if (item.slot === "shopId") return !state.hasShopId;
    if (item.slot === "pull") return !state.hasPull;
    if (item.slot === "reply") return !state.hasReply;
    if (item.slot === "data") return !state.hasData;
    return false;
  });
}
