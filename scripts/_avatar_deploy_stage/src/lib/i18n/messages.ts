import { DEFAULT_LOCALE, WORLD_LOCALES } from "@/lib/i18n/locales";
import { NATIVE_PACKS } from "@/lib/i18n/packs-native";

export type MessageKey =
  | "brand.name"
  | "nav.home"
  | "nav.guide"
  | "nav.services"
  | "nav.opened"
  | "nav.openedEmpty"
  | "nav.account"
  | "nav.catalog"
  | "nav.platformApi"
  | "nav.language"
  | "nav.logout"
  | "nav.login"
  | "nav.register"
  | "nav.browseServices"
  | "nav.searchLanguage"
  | "nav.askGuide"
  | "landing.lead"
  | "landing.sub"
  | "landing.start"
  | "landing.guidePlaceholder"
  | "landing.emailPlaceholder"
  | "landing.modelsTitle"
  | "landing.modelsFooter"
  | "landing.tabAll"
  | "landing.tabChat"
  | "landing.tabVision"
  | "landing.tabImage"
  | "landing.tabVoice"
  | "landing.tabVideo"
  | "landing.tabAudio"
  | "landing.modelCount"
  | "common.account"
  | "common.close"
  | "common.current"
  | "common.loading"
  | "common.search"
  | "common.all"
  | "common.clear"
  | "common.email"
  | "common.password"
  | "common.name"
  | "common.networkError"
  | "auth.welcomeBack"
  | "auth.loginSubtitle"
  | "auth.loginFailed"
  | "auth.forgotPassword"
  | "auth.resetNeedAdmin"
  | "auth.enterPassword"
  | "auth.noAccount"
  | "auth.createAccount"
  | "auth.registerSubtitle"
  | "auth.confirmPassword"
  | "auth.register"
  | "auth.hasAccount"
  | "auth.passwordHint"
  | "auth.passwordMismatch"
  | "auth.registerFailed"
  | "auth.backHome"
  | "auth.goRegister"
  | "auth.goLoginNow"
  | "auth.pwdMin"
  | "auth.pwdLetter"
  | "auth.pwdDigit"
  | "shelf.title"
  | "shelf.lead"
  | "shelf.askGuide"
  | "shelf.liveOnly"
  | "shelf.searchPlaceholder"
  | "shelf.searchAria"
  | "shelf.count"
  | "shelf.empty"
  | "shelf.goGuide"
  | "cart.eyebrow"
  | "cart.title"
  | "cart.leadAuthed"
  | "cart.leadGuest"
  | "cart.empty"
  | "cart.goShelf"
  | "cart.askWhich"
  | "cart.stillUnsure"
  | "cart.totalMonth"
  | "cart.payNote"
  | "cart.confirm"
  | "cart.loginToOpen"
  | "cart.remove"
  | "chat.askGuide"
  | "chat.opening"
  | "chat.titleGuide"
  | "chat.titleWorkspace"
  | "chat.send"
  | "chat.placeholder"
  | "chat.dropFiles"
  | "account.title"
  | "account.needLogin"
  | "account.goLogin"
  | "account.subscriptions"
  | "account.none"
  | "account.changePassword"
  | "account.industry"
  | "account.noSubscriptions"
  | "account.goCatalog"
  | "account.currentPassword"
  | "account.newPassword"
  | "account.confirmNewPassword"
  | "account.updatePassword"
  | "account.saving"
  | "avatar.preview"
  | "avatar.choose"
  | "avatar.hint"
  | "avatar.presets"
  | "avatar.upload"
  | "avatar.uploading"
  | "avatar.uploadHint"
  | "avatar.uploadFailed"
  | "avatar.save"
  | "home.activeCount"
  | "home.manage"
  | "home.guideLoading"
  | "command.title"
  | "command.desc"
  | "command.empty"
  | "command.workspace"
  | "command.catalog"
  | "action.addCart"
  | "action.added"
  | "action.applied"
  | "action.enterService"
  | "action.askFit"
  | "action.askFollowUp"
  | "scene.allAisles"
  | "scene.shop"
  | "scene.content"
  | "scene.office"
  | "scene.voiceVideo"
  | "scene.dev"
  | "scene.weMedia"
  | "scene.models"
  | "scene.hint.shop"
  | "scene.hint.content"
  | "scene.hint.office"
  | "scene.hint.voiceVideo"
  | "scene.hint.dev"
  | "scene.hint.weMedia"
  | "scene.hint.models"
  | "kind.model"
  | "kind.scenario"
  | "delivery.live"
  | "delivery.setupProxy"
  | "delivery.setupKey"
  | "delivery.playbook"
  | "shelf.action.workspace"
  | "shelf.action.proxyHow"
  | "shelf.action.askSetup"
  | "shelf.action.askGuide"
  | "shelf.group.image.label"
  | "shelf.group.image.hint"
  | "shelf.group.cs.label"
  | "shelf.group.cs.hint"
  | "shelf.group.vision.label"
  | "shelf.group.vision.hint"
  | "shelf.pickFirst"
  | "shelf.expand"
  | "shelf.collapse"
  | "shelf.back"
  | "detail.coverNote"
  | "detail.howTitle"
  | "detail.howVision"
  | "detail.howCs"
  | "detail.howDefault"
  | "detail.pricing"
  | "detail.related"
  | "detail.includes"
  | "detail.accessPlaybookCustomer"
  | "detail.accessLiveCustomer"
  | "detail.accessOfflineCustomer"
  | "detail.accessPlaybookPlatform"
  | "detail.accessLivePlatform"
  | "detail.accessOfflinePlatform"
  | "detail.accessSetupGeneric"
  | "detail.liveModelFallback"
  | "common.perMonth"
  | "chat.welcome"
  | "chat.welcomeBg"
  | "chat.fu.shopCs"
  | "chat.fu.contract"
  | "chat.fu.kb"
  | "chat.fu.code"
  | "chat.missed"
  | "chat.missedBusy"
  | "chat.rateLimit"
  | "chat.needLoginUse"
  | "chat.needLoginTrial"
  | "chat.busyUse"
  | "chat.busyTrial"
  | "chat.fileFail"
  | "chat.copyFail"
  | "chat.sentFiles"
  | "chat.askFitProduct"
  | "chat.think1"
  | "chat.think2"
  | "chat.think3"
  | "chat.think4"
  | "chat.recalling"
  | "chat.restart"
  | "chat.restartAria"
  | "chat.copy"
  | "chat.copyAria"
  | "chat.uploadTitle"
  | "chat.uploadAria"
  | "chat.attach"
  | "chat.remembered"
  | "chat.rememberGuest"
  | "chat.rememberedBadge"
  | "chat.sayWhat"
  | "chat.placeholderShort"
  | "chat.pasteHint"
  | "chat.workspacePlaceholder"
  | "chat.modelTrial"
  | "chat.autoReply"
  | "chat.landingRoute"
  | "chat.handPick"
  | "chat.fallback"
  | "chat.rememberService"
  | "chat.rememberServiceGuest"
  | "chat.uploadHint"
  | "chat.modelTitle"
  | "chat.modelAuto"
  | "chat.modelAutoHint"
  | "chat.modelManual"
  | "chat.visionTag"
  | "chat.fileTag"
  | "account.usage30d"
  | "account.usageCalls"
  | "account.usageFrom"
  | "account.usageLangfuseOn"
  | "account.usageLangfuseOff"
  | "account.pwdFail"
  | "account.pwdUpdated"
  | "account.editProfile"
  | "account.view"
  | "account.avatar"
  | "account.avatarSaved"
  | "account.avatarFail"
  | "sub.statusActive"
  | "sub.statusPaid"
  | "sub.statusPending"
  | "pay.sandbox"
  | "pay.wechat"
  | "pay.alipay"
  | "pay.paypal"
  | "pay.card"
  | "pay.stripe"
  | "pay.developer"
  | "pay.none"
  | "chat.redirecting";

type Dict = Record<MessageKey, string>;

const zhCN: Dict = {
  "brand.name": "AI 智能体超市",
  "nav.home": "首页",
  "nav.guide": "导购",
  "nav.services": "服务",
  "nav.opened": "已开通",
  "nav.openedEmpty": "抱歉，你还暂未开通服务。",
  "nav.account": "我的账户",
  "nav.catalog": "目录与价格",
  "nav.platformApi": "平台 API",
  "nav.language": "语言切换",
  "nav.logout": "退出",
  "nav.login": "登录",
  "nav.register": "注册",
  "nav.browseServices": "浏览服务",
  "nav.searchLanguage": "搜索语言…",
  "nav.askGuide": "问导购",
  "landing.lead":
    "根据你的行业或需求开通服务，系统会自动匹配对应大模型来完成任务。",
  "landing.sub": "先选场景，再开通服务；匹配模型后，进入工作台使用。",
  "landing.start": "登入",
  "landing.guidePlaceholder": "说说你的场景或要解决的问题…",
  "landing.emailPlaceholder": "输入您的邮箱",
  "landing.modelsTitle": "支持的模型",
  "landing.modelsFooter": "对话 / 出图 / 语音 / 视频",
  "landing.tabAll": "全部",
  "landing.tabChat": "对话",
  "landing.tabVision": "看图",
  "landing.tabImage": "出图",
  "landing.tabVoice": "语音",
  "landing.tabVideo": "视频",
  "landing.tabAudio": "配乐",
  "landing.modelCount": "{n} 款",
  "common.account": "账户",
  "common.close": "关闭",
  "common.current": "当前",
  "common.loading": "加载中…",
  "common.search": "搜索",
  "common.all": "全部",
  "common.clear": "清空",
  "common.email": "邮箱",
  "common.password": "密码",
  "common.name": "姓名",
  "common.networkError": "网络错误，请稍后重试",
  "auth.welcomeBack": "欢迎回来",
  "auth.loginSubtitle": "邮箱密码登录。暂无微信 / GitHub。",
  "auth.loginFailed": "登录失败",
  "auth.forgotPassword": "忘记密码？",
  "auth.resetNeedAdmin": "重置需联系管理员",
  "auth.enterPassword": "输入密码",
  "auth.noAccount": "还没有账号？",
  "auth.createAccount": "创建账户",
  "auth.registerSubtitle": "只用邮箱密码，无需验证邮箱。",
  "auth.confirmPassword": "确认密码",
  "auth.register": "注册",
  "auth.hasAccount": "已有账号？",
  "auth.passwordHint": "至少 8 位，需包含字母和数字",
  "auth.passwordMismatch": "两次输入的密码不一致",
  "auth.registerFailed": "注册失败",
  "auth.backHome": "← 返回首页",
  "auth.goRegister": "立即注册",
  "auth.goLoginNow": "立即登录",
  "auth.pwdMin": "至少 8 位",
  "auth.pwdLetter": "包含字母",
  "auth.pwdDigit": "包含数字",
  "shelf.title": "货架",
  "shelf.lead":
    "按过道拿服务。色条是场景，「模型通道」和「场景服务」别混着买。也可",
  "shelf.askGuide": "先问导购",
  "shelf.liveOnly": "只看在线可用",
  "shelf.searchPlaceholder": "搜索客服、网店、合同、出图…",
  "shelf.searchAria": "搜索服务",
  "shelf.count": "{n} 项",
  "shelf.empty": "这路过道是空的，换个词，或",
  "shelf.goGuide": "去问导购",
  "cart.eyebrow": "工作台 · 待开通",
  "cart.title": "待开通",
  "cart.leadAuthed": "跟导购同一套流程：看清了就放这里，确认后开通进工作台。",
  "cart.leadGuest": "未登录时暂存在这台浏览器。登录后会合并到账号里。",
  "cart.empty": "还没有要开通的服务。",
  "cart.goShelf": "去货架看看",
  "cart.askWhich": "问导购该开哪项",
  "cart.stillUnsure": "还不确定？问导购",
  "cart.totalMonth": "合计 / 月",
  "cart.payNote": "下一步是测试开通，不向微信/支付宝扣款。本机和开发者邮箱可用。",
  "cart.confirm": "确认开通",
  "cart.loginToOpen": "登录后开通",
  "cart.remove": "移除",
  "chat.askGuide": "问导购",
  "chat.opening": "正在打开导购…",
  "chat.titleGuide": "导购",
  "chat.titleWorkspace": "服务工作台",
  "chat.send": "发送",
  "chat.placeholder": "说说你正在做的事… Enter 发送，Shift+Enter 换行",
  "chat.dropFiles": "松开即可添加文件",
  "account.title": "账户",
  "account.needLogin": "请先登录后查看账户。",
  "account.goLogin": "去登录",
  "account.subscriptions": "已开通服务",
  "account.none": "暂无已开通服务。",
  "account.changePassword": "修改密码",
  "account.industry": "行业 / 职业",
  "account.noSubscriptions": "抱歉，你还暂未开通服务。",
  "account.goCatalog": "去目录看看",
  "account.currentPassword": "当前密码",
  "account.newPassword": "新密码",
  "account.confirmNewPassword": "确认新密码",
  "account.updatePassword": "更新密码",
  "account.saving": "保存中…",
  "home.activeCount": "已开通 {n} 项",
  "home.manage": "管理",
  "home.guideLoading": "导购加载中…",
  "command.title": "快速跳转",
  "command.desc": "搜索服务或跳转页面",
  "command.empty": "没找到匹配项",
  "command.workspace": "工作台",
  "command.catalog": "服务目录",
  "action.addCart": "加入待开通",
  "action.added": "已加入",
  "action.applied": "已申请",
  "action.enterService": "进入服务",
  "action.askFit": "问导购这款合不合适",
  "action.askFollowUp": "问导购跟进",
  "scene.allAisles": "全部过道",
  "scene.shop": "开店与客服",
  "scene.content": "出图与内容",
  "scene.office": "办公与文档",
  "scene.voiceVideo": "语音与短视频",
  "scene.dev": "研发与知识库",
  "scene.weMedia": "自媒体",
  "scene.models": "模型接入",
  "scene.hint.shop": "网店、餐饮、跨境客服与评价",
  "scene.hint.content": "海报、商品图、文案作图",
  "scene.hint.office": "合同、发票、纪要、表格",
  "scene.hint.voiceVideo": "配音、克隆、转写、成片",
  "scene.hint.dev": "Agent、检索、研发提效",
  "scene.hint.weMedia": "选题、写稿、分镜、配音、成片、发布、复盘",
  "scene.hint.models": "千问 / GPT / Claude 等模型通道（不是行业方案卡）",
  "kind.model": "模型通道",
  "kind.scenario": "场景服务",
  "delivery.live": "在线可用",
  "delivery.setupProxy": "待启动代理",
  "delivery.setupKey": "待配置密钥",
  "delivery.playbook": "方案陪跑",
  "shelf.action.workspace": "去工作台",
  "shelf.action.proxyHow": "看启动方法",
  "shelf.action.askSetup": "问导购配置",
  "shelf.action.askGuide": "问导购",
  "shelf.group.image.label": "更多出图通道",
  "shelf.group.image.hint":
    "先选「在线出图」即可（万相首选、即梦备选）。即梦专卡、Midjourney、Replicate 是不同通道，不必全买。",
  "shelf.group.cs.label": "更多客服场景",
  "shelf.group.cs.hint":
    "先选「网店客服起草」。都是起草回复，不能接管千牛或美团后台。",
  "shelf.group.vision.label": "更多看图建议",
  "shelf.group.vision.hint":
    "都是千问看图给方案和提示词，不是成品抠图层 / 超分引擎 / 以图搜全网。",
  "shelf.pickFirst": "推荐先选 ·",
  "shelf.expand": "展开",
  "shelf.collapse": "收起",
  "shelf.back": "← 货架",
  "detail.coverNote": "介绍图按这项服务绘制，不是商品实拍。",
  "detail.howTitle": "开通后怎么用",
  "detail.howVision": "把照片发到工作台，说清要盯的点，模型按图给出结果草稿。",
  "detail.howCs": "把顾客消息和店铺政策发到工作台，按口吻起草可复制发出的回复。",
  "detail.howDefault": "先看需要哪些资料，发给工作台，由助手带你把这项服务跑通。",
  "detail.pricing": "费用",
  "detail.related": "相近服务",
  "detail.includes": "含{items}。",
  "detail.accessPlaybookCustomer":
    "这是「方案陪跑」：工作台帮你做规范、提示词和接入路径，不伪装已接通 {provider} 官方在线能力。正式调用请用你自己的 {provider} 账号。",
  "detail.accessLiveCustomer":
    "工作台可用本站已接通模型做场景辅导（当前优选：{model}）。正式生产调用仍走你自己的 {provider} 账号。",
  "detail.accessOfflineCustomer":
    "这项服务接到的是 {provider} 官方模型。正式调用走客户自己的官方账号。本站导购是另一条线，可先问合不合适。",
  "detail.accessPlaybookPlatform":
    "目录标了「方案陪跑」：开通后以对话辅导为主，核心成片/成图/官方库仍在对应平台完成。",
  "detail.accessLivePlatform":
    "工作台已可调用已接通模型（当前优选：{model}）。会按场景自动选更合适的密钥；这不代表 {provider} 官方账号一定已开通。",
  "detail.accessOfflinePlatform":
    "密钥已预留，但当前还不能调用（余额或模型未开通）。导购仍可正常使用。",
  "detail.accessSetupGeneric":
    "通道已接好，但还需配置密钥后才真成曲/出图。未配置前工作台仍可写提示词与方案。",
  "detail.liveModelFallback": "已接通模型",
  "common.perMonth": "每月",
  "chat.welcome":
    "你好。我是这边的导购——你说正在忙什么，我帮你从货架上对服务。\n\n也可以先点下面一条常见路径。",
  "chat.welcomeBg":
    "你好。按你{bg}的背景，我可以先帮你对一下：店里客服/评价、合同发票、或资料知识库。\n\n你现在最想先搞定哪一件？直接说场景就行。",
  "chat.fu.shopCs": "开淘宝店做客服",
  "chat.fu.contract": "拍照审一份合同",
  "chat.fu.kb": "要做企业知识库",
  "chat.fu.code": "团队写代码提效",
  "chat.missed": "这一句我没接住，请再说一次。",
  "chat.missedBusy": "这一句我没接住，请再说一次你在忙什么。",
  "chat.rateLimit": "问得有点勤，请稍后再试",
  "chat.needLoginUse": "使用需要先登录。",
  "chat.needLoginTrial": "试用需要先登录。",
  "chat.busyUse": "请求较勤，请稍后再试。",
  "chat.busyTrial": "试用次数较多，请稍后再试。",
  "chat.fileFail": "文件读取失败，请换一张图或文本再试",
  "chat.copyFail": "复制失败，请手动选中文字",
  "chat.sentFiles": "发了 {n} 个文件",
  "chat.askFitProduct": "这款服务适合我吗？",
  "chat.think1": "在听你刚说的话",
  "chat.think2": "对照货架想合适的服务",
  "chat.think3": "组织成一句人话",
  "chat.think4": "给你具体建议",
  "chat.recalling": "正在想起上次聊到哪…",
  "chat.restart": "重新开始",
  "chat.restartAria": "重新开始对话",
  "chat.copy": "复制",
  "chat.copyAria": "复制回复",
  "chat.uploadTitle": "上传图片、PDF 或文本",
  "chat.uploadAria": "上传文件",
  "chat.attach": "附件",
  "chat.remembered": "已记住你的账户对话",
  "chat.rememberGuest": "刷新后仍会记得这次聊天",
  "chat.rememberedBadge": "对话已记住",
  "chat.sayWhat": "说说你正在做的事",
  "chat.placeholderShort": "说说你正在做的事…",
  "chat.pasteHint": "点输入栏后 Ctrl+V，截屏会直接出现在上面",
  "chat.workspacePlaceholder":
    "把这项服务要用的资料发过来，或先告诉我卡在哪。Shift+Enter 换行，Enter 发送；Ctrl+V 可粘贴截图。",
  "chat.modelTrial": "模型试用",
  "chat.autoReply": "自动回复助手",
  "chat.landingRoute": "落地接入",
  "chat.handPick": "手选 {label}",
  "chat.fallback": "备选 {label}",
  "chat.rememberService": "已记住本服务对话",
  "chat.rememberServiceGuest": "登录后会记住本服务对话",
  "chat.uploadHint": "可上传图片 / PDF，或粘贴截图",
  "chat.modelTitle": "默认按任务省钱推荐；不满意再手选",
  "chat.modelAuto": "推荐模型（省钱）",
  "chat.modelAutoHint": "先用推荐模型；效果不满意再选手动覆盖。",
  "chat.modelManual": "手动选择",
  "chat.visionTag": "看图",
  "chat.fileTag": "【文件 {name}】",
  "account.usage30d": "近 30 天调用",
  "account.usageCalls": "{n} 次",
  "account.usageFrom": "来自本站 UsageEvent",
  "account.usageLangfuseOn": "，并已同步 Langfuse",
  "account.usageLangfuseOff": "；配置 Langfuse 后可看完整链路",
  "account.pwdFail": "修改失败",
  "account.pwdUpdated": "密码已更新。其他已登录设备需要重新登录。",
  "account.editProfile": "修改行业与职业",
  "account.view": "查看",
  "account.avatar": "头像",
  "account.avatarSaved": "头像已更新",
  "account.avatarFail": "头像更新失败",
  "avatar.preview": "头像预览",
  "avatar.choose": "选择头像",
  "avatar.hint": "可从预设中挑选，或上传自己的图片",
  "avatar.presets": "预设头像",
  "avatar.upload": "上传图片",
  "avatar.uploading": "上传中…",
  "avatar.uploadHint": "支持 JPEG / PNG / WebP，最大 2MB",
  "avatar.uploadFailed": "上传失败",
  "avatar.save": "保存头像",
  "sub.statusActive": "已开通",
  "sub.statusPaid": "已支付",
  "sub.statusPending": "待跟进",
  "pay.sandbox": "测试开通（不扣款）",
  "pay.wechat": "微信支付",
  "pay.alipay": "支付宝",
  "pay.paypal": "PayPal",
  "pay.card": "银行卡",
  "pay.stripe": "Stripe",
  "pay.developer": "开发者",
  "pay.none": "未选择",
  "chat.redirecting": "正在跳转…",
};

const en: Dict = {
  "brand.name": "AI Agent Mart",
  "nav.home": "Home",
  "nav.guide": "Guide",
  "nav.services": "Services",
  "nav.opened": "Active",
  "nav.openedEmpty": "Sorry, you don’t have any active services yet.",
  "nav.account": "My account",
  "nav.catalog": "Catalog & pricing",
  "nav.platformApi": "Platform API",
  "nav.language": "Language",
  "nav.logout": "Log out",
  "nav.login": "Log in",
  "nav.register": "Sign up",
  "nav.browseServices": "Browse services",
  "nav.searchLanguage": "Search languages…",
  "nav.askGuide": "Ask guide",
  "landing.lead":
    "Activate services by your industry or need—the system matches the right large models to complete your tasks.",
  "landing.sub":
    "Choose a scenario, activate a service, match a model, then open the workspace.",
  "landing.start": "Log in",
  "landing.guidePlaceholder": "Describe your scenario or problem…",
  "landing.emailPlaceholder": "Enter your email",
  "landing.modelsTitle": "Supported models",
  "landing.modelsFooter": "Chat / Image / Voice / Video",
  "landing.tabAll": "All",
  "landing.tabChat": "Chat",
  "landing.tabVision": "Vision",
  "landing.tabImage": "Image",
  "landing.tabVoice": "Voice",
  "landing.tabVideo": "Video",
  "landing.tabAudio": "Music",
  "landing.modelCount": "{n} models",
  "common.account": "Account",
  "common.close": "Close",
  "common.current": "Current",
  "common.loading": "Loading…",
  "common.search": "Search",
  "common.all": "All",
  "common.clear": "Clear",
  "common.email": "Email",
  "common.password": "Password",
  "common.name": "Name",
  "common.networkError": "Network error. Please try again.",
  "auth.welcomeBack": "Welcome back",
  "auth.loginSubtitle": "Sign in with email and password. No WeChat / GitHub yet.",
  "auth.loginFailed": "Sign-in failed",
  "auth.forgotPassword": "Forgot password?",
  "auth.resetNeedAdmin": "Contact an admin to reset",
  "auth.enterPassword": "Enter password",
  "auth.noAccount": "No account yet?",
  "auth.createAccount": "Create account",
  "auth.registerSubtitle": "Email and password only. No email verification.",
  "auth.confirmPassword": "Confirm password",
  "auth.register": "Sign up",
  "auth.hasAccount": "Already have an account?",
  "auth.passwordHint": "At least 8 characters with letters and numbers",
  "auth.passwordMismatch": "Passwords do not match",
  "auth.registerFailed": "Sign-up failed",
  "auth.backHome": "← Back to home",
  "auth.goRegister": "Sign up now",
  "auth.goLoginNow": "Sign in now",
  "auth.pwdMin": "At least 8 characters",
  "auth.pwdLetter": "Includes a letter",
  "auth.pwdDigit": "Includes a number",
  "shelf.title": "Shelf",
  "shelf.lead":
    "Browse by aisle. Color bars mark scenes—don’t mix model channels with scenario services. Or",
  "shelf.askGuide": "ask the guide first",
  "shelf.liveOnly": "Online only",
  "shelf.searchPlaceholder": "Search support, shop, contracts, images…",
  "shelf.searchAria": "Search services",
  "shelf.count": "{n} items",
  "shelf.empty": "This aisle is empty. Try another term, or",
  "shelf.goGuide": "ask the guide",
  "cart.eyebrow": "Workspace · To activate",
  "cart.title": "To activate",
  "cart.leadAuthed": "Same flow as the guide: add what you need, confirm, then open in workspace.",
  "cart.leadGuest": "Saved in this browser until you sign in. Then it merges into your account.",
  "cart.empty": "Nothing to activate yet.",
  "cart.goShelf": "Browse the shelf",
  "cart.askWhich": "Ask which to activate",
  "cart.stillUnsure": "Not sure? Ask the guide",
  "cart.totalMonth": "Total / month",
  "cart.payNote": "Next step is test activation—no WeChat/Alipay charge. Local and developer emails work.",
  "cart.confirm": "Confirm activation",
  "cart.loginToOpen": "Sign in to activate",
  "cart.remove": "Remove",
  "chat.askGuide": "Ask guide",
  "chat.opening": "Opening guide…",
  "chat.titleGuide": "Guide",
  "chat.titleWorkspace": "Service workspace",
  "chat.send": "Send",
  "chat.placeholder": "Tell me what you're working on… Enter to send, Shift+Enter for a new line",
  "chat.dropFiles": "Drop to add files",
  "account.title": "Account",
  "account.needLogin": "Sign in to view your account.",
  "account.goLogin": "Sign in",
  "account.subscriptions": "Active services",
  "account.none": "No active services yet.",
  "account.changePassword": "Change password",
  "account.industry": "Industry / role",
  "account.noSubscriptions": "Sorry, you don’t have any active services yet.",
  "account.goCatalog": "Browse catalog",
  "account.currentPassword": "Current password",
  "account.newPassword": "New password",
  "account.confirmNewPassword": "Confirm new password",
  "account.updatePassword": "Update password",
  "account.saving": "Saving…",
  "home.activeCount": "{n} active",
  "home.manage": "Manage",
  "home.guideLoading": "Loading guide…",
  "command.title": "Quick jump",
  "command.desc": "Search services or jump to a page",
  "command.empty": "No matches",
  "command.workspace": "Workspace",
  "command.catalog": "Service catalog",
  "action.addCart": "Add to activate",
  "action.added": "Added",
  "action.applied": "Requested",
  "action.enterService": "Open service",
  "action.askFit": "Ask if this fits",
  "action.askFollowUp": "Ask guide to follow up",
  "scene.allAisles": "All aisles",
  "scene.shop": "Shop & support",
  "scene.content": "Images & content",
  "scene.office": "Office & docs",
  "scene.voiceVideo": "Voice & short video",
  "scene.dev": "Dev & knowledge base",
  "scene.weMedia": "Creator media",
  "scene.models": "Model access",
  "scene.hint.shop": "Online shops, dining, cross-border support & reviews",
  "scene.hint.content": "Posters, product shots, copy-to-image",
  "scene.hint.office": "Contracts, invoices, notes, sheets",
  "scene.hint.voiceVideo": "Voiceover, cloning, transcription, edits",
  "scene.hint.dev": "Agents, retrieval, engineering speedups",
  "scene.hint.weMedia": "Topics, scripts, storyboards, voice, video, publish, review",
  "scene.hint.models": "Qwen / GPT / Claude channels (not industry playbooks)",
  "kind.model": "Model channel",
  "kind.scenario": "Scenario service",
  "delivery.live": "Online now",
  "delivery.setupProxy": "Start proxy",
  "delivery.setupKey": "Needs API key",
  "delivery.playbook": "Playbook coaching",
  "shelf.action.workspace": "Open workspace",
  "shelf.action.proxyHow": "How to start",
  "shelf.action.askSetup": "Ask about setup",
  "shelf.action.askGuide": "Ask guide",
  "shelf.group.image.label": "More image channels",
  "shelf.group.image.hint":
    "Start with “online image”. Jimeng, Midjourney, and Replicate are separate channels—you don’t need all.",
  "shelf.group.cs.label": "More support scenarios",
  "shelf.group.cs.hint":
    "Start with “shop CS draft”. These draft replies; they don’t take over Qianniu or Meituan.",
  "shelf.group.vision.label": "More vision assists",
  "shelf.group.vision.hint":
    "Qwen vision for plans and prompts—not finished matting / upscale / web image search.",
  "shelf.pickFirst": "Start here ·",
  "shelf.expand": "Expand",
  "shelf.collapse": "Collapse",
  "shelf.back": "← Shelf",
  "detail.coverNote": "Cover art is illustrated for this service, not a product photo.",
  "detail.howTitle": "After you activate",
  "detail.howVision":
    "Send photos to the workspace, say what to check, and get a draft result from the image.",
  "detail.howCs":
    "Send customer messages and shop policy to the workspace to draft replies you can copy and send.",
  "detail.howDefault":
    "See what materials are needed, send them to the workspace, and let the assistant walk you through.",
  "detail.pricing": "Pricing",
  "detail.related": "Related services",
  "detail.includes": "Includes {items}.",
  "detail.accessPlaybookCustomer":
    "This is guided setup: the workspace helps with playbooks and prompts. It is not a live {provider} official connection—use your own {provider} account for production calls.",
  "detail.accessLiveCustomer":
    "The workspace can use connected models for scenario coaching (preferred: {model}). Production calls still use your own {provider} account.",
  "detail.accessOfflineCustomer":
    "This service targets {provider} official models. Production calls use your own official account. The site guide is a separate path if you want a fit-check first.",
  "detail.accessPlaybookPlatform":
    "Marked as guided setup: after activation you’ll get coaching in chat; finals still happen on the matching platform.",
  "detail.accessLivePlatform":
    "The workspace can call connected models (preferred: {model}). Keys are chosen by scenario; this does not mean a {provider} official account is already open.",
  "detail.accessOfflinePlatform":
    "Keys are reserved, but calls are not available yet (balance or model not enabled). The guide still works.",
  "detail.accessSetupGeneric":
    "The channel is wired, but keys still need configuring before real renders. You can still draft prompts and plans in the workspace.",
  "detail.liveModelFallback": "connected model",
  "common.perMonth": "month",
  "chat.welcome":
    "Hi. I’m the guide here—tell me what you’re working on and I’ll match services from the shelf.\n\nOr tap a common path below.",
  "chat.welcomeBg":
    "Hi. Given your background in {bg}, I can start with store support/reviews, contracts & invoices, or a knowledge base.\n\nWhat do you want to sort out first? Just describe the scenario.",
  "chat.fu.shopCs": "Taobao shop customer support",
  "chat.fu.contract": "Review a contract from photos",
  "chat.fu.kb": "Build a company knowledge base",
  "chat.fu.code": "Help the team code faster",
  "chat.missed": "I didn’t catch that—try once more.",
  "chat.missedBusy": "I didn’t catch that—tell me again what you’re working on.",
  "chat.rateLimit": "You’re asking a bit fast. Try again shortly.",
  "chat.needLoginUse": "Sign in to use this.",
  "chat.needLoginTrial": "Sign in to try this.",
  "chat.busyUse": "Too many requests. Try again shortly.",
  "chat.busyTrial": "Too many trial requests. Try again shortly.",
  "chat.fileFail": "Couldn’t read the file. Try another image or text file.",
  "chat.copyFail": "Copy failed—select the text manually.",
  "chat.sentFiles": "Sent {n} file(s)",
  "chat.askFitProduct": "Is this service a good fit for me?",
  "chat.think1": "Listening to what you said",
  "chat.think2": "Matching services on the shelf",
  "chat.think3": "Putting it in plain words",
  "chat.think4": "Giving a concrete suggestion",
  "chat.recalling": "Recalling where we left off…",
  "chat.restart": "Start over",
  "chat.restartAria": "Restart conversation",
  "chat.copy": "Copy",
  "chat.copyAria": "Copy reply",
  "chat.uploadTitle": "Upload image, PDF, or text",
  "chat.uploadAria": "Upload file",
  "chat.attach": "Attach",
  "chat.remembered": "Your account chat is saved",
  "chat.rememberGuest": "This chat stays after refresh",
  "chat.rememberedBadge": "Chat saved",
  "chat.sayWhat": "Tell me what you’re working on",
  "chat.placeholderShort": "Tell me what you’re working on…",
  "chat.pasteHint": "Focus the input and Ctrl+V to paste a screenshot",
  "chat.workspacePlaceholder":
    "Send materials for this service, or say where you’re stuck. Shift+Enter for a new line; Enter to send; Ctrl+V pastes screenshots.",
  "chat.modelTrial": "Model trial",
  "chat.autoReply": "Auto-reply assistant",
  "chat.landingRoute": "Onboarding",
  "chat.handPick": "Manual {label}",
  "chat.fallback": "Fallback {label}",
  "chat.rememberService": "This service chat is saved",
  "chat.rememberServiceGuest": "Sign in to save this service chat",
  "chat.uploadHint": "Upload images / PDF, or paste a screenshot",
  "chat.modelTitle": "Cheap auto-pick by task; override manually if needed",
  "chat.modelAuto": "Recommended model (cost-aware)",
  "chat.modelAutoHint": "Use the recommended model first; override manually if results aren’t right.",
  "chat.modelManual": "Manual pick",
  "chat.visionTag": "Vision",
  "chat.fileTag": "[File {name}]",
  "account.usage30d": "Usage · last 30 days",
  "account.usageCalls": "{n} calls",
  "account.usageFrom": "From site UsageEvent",
  "account.usageLangfuseOn": ", synced to Langfuse",
  "account.usageLangfuseOff": "; configure Langfuse for full traces",
  "account.pwdFail": "Could not update password",
  "account.pwdUpdated": "Password updated. Sign in again on other devices.",
  "account.editProfile": "Edit industry & role",
  "account.view": "View",
  "account.avatar": "Avatar",
  "account.avatarSaved": "Avatar updated",
  "account.avatarFail": "Could not update avatar",
  "avatar.preview": "Avatar preview",
  "avatar.choose": "Choose an avatar",
  "avatar.hint": "Pick a preset, or upload your own image",
  "avatar.presets": "Preset avatars",
  "avatar.upload": "Upload image",
  "avatar.uploading": "Uploading…",
  "avatar.uploadHint": "JPEG / PNG / WebP, max 2MB",
  "avatar.uploadFailed": "Upload failed",
  "avatar.save": "Save avatar",
  "sub.statusActive": "Active",
  "sub.statusPaid": "Paid",
  "sub.statusPending": "Pending follow-up",
  "pay.sandbox": "Test activate (no charge)",
  "pay.wechat": "WeChat Pay",
  "pay.alipay": "Alipay",
  "pay.paypal": "PayPal",
  "pay.card": "Card",
  "pay.stripe": "Stripe",
  "pay.developer": "Developer",
  "pay.none": "Not selected",
  "chat.redirecting": "Redirecting…",
};

/** Frequent Simplified → Traditional phrases for zh-TW chrome. */
function toTraditional(text: string): string {
  const pairs: [string, string][] = [
    ["开通", "開通"],
    ["账户", "帳戶"],
    ["语言", "語言"],
    ["切换", "切換"],
    ["登录", "登入"],
    ["注册", "註冊"],
    ["退出", "登出"],
    ["货架", "貨架"],
    ["过道", "過道"],
    ["服务", "服務"],
    ["导购", "導購"],
    ["默认", "預設"],
    ["确认", "確認"],
    ["网络", "網路"],
    ["错误", "錯誤"],
    ["加载", "載入"],
    ["订阅", "訂閱"],
    ["密码", "密碼"],
    ["邮箱", "郵箱"],
    ["浏览", "瀏覽"],
    ["模型", "模型"],
    ["支持", "支援"],
    ["场景", "場景"],
    ["通道", "通道"],
    ["在线", "線上"],
    ["配置", "設定"],
    ["密钥", "金鑰"],
    ["方案", "方案"],
    ["陪跑", "陪跑"],
    ["展开", "展開"],
    ["收起", "收合"],
    ["附件", "附件"],
    ["发送", "傳送"],
    ["复制", "複製"],
    ["上传", "上傳"],
    ["思考", "思考"],
    ["推荐", "推薦"],
    ["手动", "手動"],
    ["记住", "記住"],
    ["刷新", "重新整理"],
    ["跳转", "跳轉"],
    ["正在", "正在"],
    ["打开", "開啟"],
    ["修改", "修改"],
    ["失败", "失敗"],
    ["更新", "更新"],
    ["行业", "行業"],
    ["职业", "職業"],
    ["调用", "呼叫"],
    ["次", "次"],
  ];
  let out = text;
  for (const [a, b] of pairs) {
    if (a !== b) out = out.split(a).join(b);
  }
  return out;
}

const zhTW = Object.fromEntries(
  Object.entries(zhCN).map(([k, v]) => [k, toTraditional(v)])
) as Dict;

function fillDict(base: Dict, overlay: Partial<Record<string, string>> | undefined): Dict {
  if (!overlay) return base;
  return { ...base, ...overlay } as Dict;
}

function buildPacks(): Record<string, Dict> {
  const packs: Record<string, Dict> = {
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    en,
  };

  for (const [code, pack] of Object.entries(NATIVE_PACKS)) {
    packs[code] = fillDict(en, pack);
  }

  for (const { code } of WORLD_LOCALES) {
    if (packs[code]) continue;
    const base = code.split("-")[0] || code;
    if (packs[base]) {
      packs[code] = packs[base];
      continue;
    }
    packs[code] = code.startsWith("zh") ? zhCN : en;
  }

  return packs;
}

/** Locale packs: full zh/en + native majors; every WORLD_LOCALE gets a complete Dict. */
const PACKS = buildPacks();

export const MESSAGE_KEYS = Object.keys(zhCN) as MessageKey[];

export function localeHasNativePack(code: string) {
  if (code === "zh-CN" || code === "zh-TW" || code === "en") return true;
  if (NATIVE_PACKS[code]) return true;
  const base = code.split("-")[0] || code;
  return Boolean(NATIVE_PACKS[base]);
}

function pick(pack: Partial<Dict> | undefined, key: MessageKey): string | undefined {
  const value = pack?.[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function translate(locale: string, key: MessageKey): string {
  const code = (locale || DEFAULT_LOCALE).trim() || DEFAULT_LOCALE;
  const fromExact = pick(PACKS[code], key);
  if (fromExact) return fromExact;

  const base = code.split("-")[0] || code;
  const fromBase = pick(PACKS[base], key);
  if (fromBase) return fromBase;

  if (!code.startsWith("zh")) {
    const fromEn = pick(en, key);
    if (fromEn) return fromEn;
  }

  const fromZh = pick(zhCN, key);
  if (fromZh) return fromZh;

  const fromEn = pick(en, key);
  if (fromEn) return fromEn;

  return key;
}

export function tf(locale: string, key: MessageKey, vars: Record<string, string | number>) {
  let text = translate(locale, key);
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}
