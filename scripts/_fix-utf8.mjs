import fs from "fs";

/** Exact broken-substring -> correct (broken as currently on disk) */
const fixesByFile = {
  "src/app/error.tsx": null, // rewrite whole if needed
  "src/app/onboarding/page.tsx": [
    ['"互联?/ 软件"', '"互联网 / 软件"'],
    ['"内容与媒?,', '"内容与媒体",'],
    ['"制?,', '"制造",'],
    ['"创始?/ 负责?,', '"创始人 / 负责人",'],
    ['"请选择行业和职?', '"请选择行业和职业"'],
    ["加载中?", "加载中…"],
    ["选一下行业和职业，导购会按你的工作来理解需求?", "选一下行业和职业，导购会按你的工作来理解需求。"],
    ['"保存中? : "进入工作?', '"保存中…" : "进入工作台"'],
  ],
};

// Use unicode replacement char U+FFFD which appears as �
const R = "\uFFFD";

const fileFixes = {
  "src/app/onboarding/page.tsx": [
    [`互联${R}?/ 软件`, "互联网 / 软件"],
    [`内容与媒${R}?,`, "内容与媒体",],
  ],
};

function load(p) {
  return fs.readFileSync(p);
}

// Fix by decoding with replacement and applying regex on known patterns
function fixOnboarding(s) {
  return s
    .replace(/互联.?\s*\/\s*软件/, "互联网 / 软件")
    .replace(/内容与媒.?/, "内容与媒体")
    .replace(/"制.?,/, '"制造",')
    .replace(/创始.?\s*\/\s*负责.?/, "创始人 / 负责人")
    .replace(/请选择行业和职.?/, "请选择行业和职业")
    .replace(/加载中.?/, "加载中…")
    .replace(/理解需求.?/, "理解需求。")
    .replace(/保存中.? : "进入工作.?/, '保存中…" : "进入工作台"');
}

function fixLogin(s) {
  return s
    .replace(/subtitle="邮箱密码登录。暂无微.?\/ GitHub.?>/, 'subtitle="邮箱密码登录。暂无微信 / GitHub。">')
    .replace(/忘记密码.?/, "忘记密码？")
    .replace(/重置需联系管理.?/, "重置需联系管理员")
    .replace(/.?返回首页/, "← 返回首页")
    .replace(/加载.?../, "加载中…");
}

function fixRegister(s) {
  return s
    .replace(/至少 8 .?/, "至少 8 位")
    .replace(/两次输入的密码不一.?/, "两次输入的密码不一致")
    .replace(/subtitle="邮箱密码即可。暂不验证邮箱，也没有微.?\/ GitHub 登录.?>/, 'subtitle="邮箱密码即可。暂不验证邮箱，也没有微信 / GitHub 登录。">');
}

function fixForgot(s) {
  return s
    .replace(/发送失.?/, "发送失败")
    .replace(/两次输入的密码不一.?/, "两次输入的密码不一致")
    .replace(/\["输入邮箱", "验证.?, "新密.?\]/, '["输入邮箱", "验证码", "新密码"]')
    .replace(/输入邮箱收到.?6 位验证码/, "输入邮箱收到的 6 位验证码")
    .replace(/设置你的新密.?/, "设置你的新密码")
    .replace(/密码已成功重.?/, "密码已成功重置")
    .replace(/subtitle="邮件通道尚未开.?>/, 'subtitle="邮件通道尚未开启">')
    .replace(/请联系站点管理员处理账号密码.?/, "请联系站点管理员处理账号密码。")
    .replace(/验证码已发送至 \{email\}.?5 分钟内有.?/, "验证码已发送至 {email}，15 分钟内有效")
    .replace(/开发环境未配置发信，本次验证码.?/, "开发环境未配置发信，本次验证码：")
    .replace(/重新发.?/, "重新发送")
    .replace(/新密.?<\/label>/g, "新密码</label>")
    .replace(/确认新密.?<\/label>/g, "确认新密码</label>")
    .replace(/placeholder="再次输入新密.?/, 'placeholder="再次输入新密码"')
    .replace(/你的密码已成功修改，请使用新密码登录.?/, "你的密码已成功修改，请使用新密码登录。");
}

function fixAccount(s) {
  return s
    .replace(/加载中.?\?<\/div>/g, "加载中…</div>")
    .replace(/加载中.?<\/p>/g, "加载中…</p>")
    .replace(/先登.?/, "先登录")
    .replace(/密码已更新。其他已登录设备需要重新登录.?/, "密码已更新。其他已登录设备需要重新登录。")
    .replace(/已开通服.?\?<\/h2>/, "已开通服务</h2>")
    .replace(/还没有开通记录.?/, "还没有开通记录。")
    .replace(/去目录看.?/, "去目录看看")
    .replace(/.?30 天调.?<\/h2>/, "近 30 天调用</h2>")
    .replace(/\{usage\.usage\.totalCalls\} .?\?<\/p>/, "{usage.usage.totalCalls} 次</p>")
    .replace(/，并已同.?Langfuse/, "，并已同步 Langfuse")
    .replace(/；配.?Langfuse 后可看完整链.?\}/, "；配置 Langfuse 后可看完整链路\"}")
    .replace(/.?(\r?\n\s*)<\/p>/, ".$1</p>") // fragile
    .replace(/\{row\.calls\} .?· in/, "{row.calls} 次 · in")
    .replace(/不再单独打开旁路地址.?/, "不再单独打开旁路地址。")
    .replace(/New API .? tokens/, "New API · tokens")
    .replace(/修改行业与职.?/, "修改行业与职业")
    .replace(/目录与价.?/, "目录与价格")
    .replace(/旁路总闸（三路水龙头.?/, "旁路总闸（三路水龙头）")
    .replace(/新密.?\?<\/span>/g, "新密码</span>")
    .replace(/确认新密.?\?<\/span>/g, "确认新密码</span>")
    .replace(/\{pwdSaving \? "保存中.? : "更新密码"\}/, '{pwdSaving ? "保存中…" : "更新密码"}');
}

function fixSettings(s) {
  return s
    .replace(/已保存。导购会用这组密钥调用模型.?/, "已保存。导购会用这组密钥调用模型。")
    .replace(/连接正常，模.?\$\{data\.model\}/, "连接正常，模型 ${data.model}")
    .replace(/管理.?\?<\/p>/, "管理员</p>")
    .replace(/仅管理员可修改.?/, "仅管理员可修改。")
    .replace(/平台密钥由管理员配置.?/, "平台密钥由管理员配置。")
    .replace(/加载中.?<\/p>/, "加载中…</p>")
    .replace(/DeepSeek .? deepseek-chat；豆包用方舟模型名或接入.?ep-…；千问.? qwen-plus.?/, "DeepSeek 用 deepseek-chat；豆包用方舟模型名或接入点 ep-…；千问用 qwen-plus。")
    .replace(/要更换请重新粘贴.?/, "要更换请重新粘贴。")
    .replace(/\{saving \? "保存中.? : "保存"\}/, '{saving ? "保存中…" : "保存"}')
    .replace(/\{testing \? "测试中.? : "测试连接"\}/, '{testing ? "测试中…" : "测试连接"}')
    .replace(/旁路总闸（三路水龙头.?/, "旁路总闸（三路水龙头）")
    .replace(/目录与价.?/, "目录与价格")
    .replace(/各服务当前模.?\?<\/h2>/, "各服务当前模型</h2>")
    .replace(/，备.?\$\{row\.fallback\.label\}/, "，备选 ${row.fallback.label}");
}

function fixIntegrations(s) {
  return s
    .replace(/当对外地址.? \*\//, "当对外地址）。*/")
    .replace(/合同提醒、评价起草等自动.?,/, '合同提醒、评价起草等自动化",')
    .replace(/关：自动走千问云端转.?,/, '关：自动走千问云端转写",')
    .replace(/关：自动走站.?unpdf/, '关：自动走站内 unpdf')
    .replace(/已打开：本.?API 会按需走内部旁路；对外只需.?localhost:3000.?/, "已打开：本站 API 会按需走内部旁路；对外只需访问 localhost:3000。")
    .replace(/已关闭：本站自动回落云端\/内置，不再调用该旁路.?/, "已关闭：本站自动回落云端/内置，不再调用该旁路。")
    .replace(/管理.?· 旁路总闸/, "管理员 · 旁路总闸")
    .replace(/三路水龙.?\?<\/h1>/, "三路水龙头</h1>")
    .replace(/，不再单独使.?:5678 \/ :8091 \/ :8092 地址.?/, "，不再单独使用 :5678 / :8091 / :8092 地址。")
    .replace(/.?tokens \/ 实时调用.?/, "· tokens / 实时调用）")
    .replace(/New API 控制.?:3001/, "New API 控制台 :3001")
    .replace(/（模型网关，不管旁路.?/, "（模型网关，不管旁路）")
    .replace(/旁路开\/关总闸.? 就在本页（AI 智能体超市管理端.?/, "旁路开/关总闸：就在本页（AI 智能体超市管理端）。")
    .replace(/仅管理员可操作.?/, "仅管理员可操作。")
    .replace(/加载中.?<\/p>/, "加载中…</p>")
    .replace(/\{on \? "开" : ".?"\}/, '{on ? "开" : "关"}')
    .replace(/旁路未起·已自动回.?/, "旁路未起·已自动回落")
    .replace(/；用户与前端永远只访.?3000，不直接访问旁路端口.?/, "；用户与前端永远只访问 :3000，不直接访问旁路端口。")
    .replace(/.?平台导购密钥/, "← 平台导购密钥");
}

const handlers = {
  "src/app/onboarding/page.tsx": fixOnboarding,
  "src/app/login/page.tsx": fixLogin,
  "src/app/register/page.tsx": fixRegister,
  "src/app/forgot-password/page.tsx": fixForgot,
  "src/app/account/page.tsx": fixAccount,
  "src/app/settings/page.tsx": fixSettings,
  "src/app/settings/integrations/page.tsx": fixIntegrations,
};

for (const [file, fn] of Object.entries(handlers)) {
  let s = fs.readFileSync(file, "utf8");
  const out = fn(s);
  fs.writeFileSync(file, out, "utf8");
  const bad = (out.match(/\uFFFD/g) || []).length;
  console.log(file, "remaining U+FFFD", bad);
}
