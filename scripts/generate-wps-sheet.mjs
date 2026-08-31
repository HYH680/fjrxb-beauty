import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const probed = JSON.parse(
  fs.readFileSync(path.join(root, "scripts", "probe-services.result.json"), "utf8")
);
const tests = Object.fromEntries(probed.tests.map((t) => [t.name, t]));
const checkedAt = "2026-08-14 21:34";

const xmlEscape = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function cell(value, type = "String") {
  return `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
}

function headerCell(value) {
  return `<Cell ss:StyleID="header"><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
}

function statusCell(status) {
  const style =
    status === "可直接用"
      ? "ok"
      : status === "接口不可用"
        ? "bad"
        : status === "缺密钥"
          ? "warn"
          : "muted";
  return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlEscape(status)}</Data></Cell>`;
}

const byProvider = {
  qwen: tests.qwen,
  deepseek: tests.deepseek,
  doubao: tests.doubao,
  openai: tests.openai,
};

const products = [
  {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol 接入服务",
    category: "对话与推理",
    provider: "OpenAI",
    price: 298,
    access: "客户官方账号",
    runtime: "openai / gpt-5.6-sol",
    probe: "openai",
  },
  {
    id: "qwen-plus",
    name: "千问接入服务",
    category: "对话与推理",
    provider: "阿里云百炼",
    price: 198,
    access: "本站已接通",
    runtime: "qwen / qwen-plus",
    probe: "qwen",
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek 接入服务",
    category: "对话与推理",
    provider: "DeepSeek",
    price: 168,
    access: "本站已配密钥",
    runtime: "deepseek / deepseek-chat",
    probe: "deepseek",
  },
  {
    id: "doubao-seed",
    name: "豆包接入服务",
    category: "对话与推理",
    provider: "火山方舟",
    price: 168,
    access: "本站已接通",
    runtime: "doubao / doubao-seed-2-0-lite-260215",
    probe: "doubao",
  },
  {
    id: "claude-sonnet",
    name: "Claude 接入服务",
    category: "对话与推理",
    provider: "Anthropic",
    price: 228,
    access: "仅接入辅导",
    runtime: "无本站对话接口",
  },
  {
    id: "gemini-pro",
    name: "Gemini 接入服务",
    category: "对话与推理",
    provider: "Google",
    price: 168,
    access: "仅接入辅导",
    runtime: "无本站对话接口",
  },
  {
    id: "dall-e-3",
    name: "DALL·E 视觉服务",
    category: "视觉创作",
    provider: "OpenAI",
    price: 168,
    access: "仅接入辅导",
    runtime: "无本站出图接口",
  },
  {
    id: "stable-diffusion-xl",
    name: "Stability 出图接入",
    category: "视觉创作",
    provider: "Stability AI",
    price: 198,
    access: "客户官方账号",
    runtime: "无本站出图接口",
    probe: "stability",
  },
  {
    id: "midjourney-api",
    name: "Midjourney 创意服务",
    category: "视觉创作",
    provider: "Midjourney",
    price: 198,
    access: "仅接入辅导",
    runtime: "无本站出图接口",
  },
  {
    id: "whisper-api",
    name: "会议转录服务",
    category: "语音与影像",
    provider: "OpenAI",
    price: 99,
    access: "仅接入辅导",
    runtime: "无本站识别接口",
  },
  {
    id: "elevenlabs-tts",
    name: "声音与配音服务",
    category: "语音与影像",
    provider: "ElevenLabs",
    price: 168,
    access: "仅接入辅导",
    runtime: "无本站合成接口",
  },
  {
    id: "runway-gen3",
    name: "短视频生成服务",
    category: "语音与影像",
    provider: "Runway",
    price: 298,
    access: "仅接入辅导",
    runtime: "无本站生成接口",
  },
  {
    id: "langchain-pro",
    name: "Agent 落地服务",
    category: "研发协作",
    provider: "LangChain",
    price: 268,
    access: "仅接入辅导",
    runtime: "无本站 Agent 接口",
  },
  {
    id: "cursor-pro",
    name: "研发提效服务",
    category: "研发协作",
    provider: "Cursor",
    price: 99,
    access: "仅接入辅导",
    runtime: "无本站编辑器接口",
  },
  {
    id: "pinecone",
    name: "知识库托管服务",
    category: "知识检索",
    provider: "Pinecone",
    price: 228,
    access: "仅接入辅导",
    runtime: "无本站向量库接口",
  },
  {
    id: "weaviate-cloud",
    name: "混合检索服务",
    category: "知识检索",
    provider: "Weaviate",
    price: 168,
    access: "仅接入辅导",
    runtime: "无本站检索接口",
  },
  {
    id: "openai-assistants",
    name: "业务助手搭建",
    category: "接入与托管",
    provider: "OpenAI",
    price: 268,
    access: "客户官方账号",
    runtime: "openai / gpt-5.6-sol",
    probe: "openai",
  },
  {
    id: "replicate-api",
    name: "开源模型接入",
    category: "接入与托管",
    provider: "Replicate",
    price: 168,
    access: "仅接入辅导",
    runtime: "无本站推理接口",
  },
  {
    id: "cohere-embed",
    name: "检索增强服务",
    category: "接入与托管",
    provider: "Cohere",
    price: 138,
    access: "仅接入辅导",
    runtime: "无本站嵌入接口",
  },
  {
    id: "capcut-auto",
    name: "自动剪辑服务",
    category: "视频剪辑",
    provider: "剪映 / CapCut",
    price: 168,
    access: "仅接入辅导",
    runtime: "无本站剪辑接口",
  },
  {
    id: "ai-subtitle",
    name: "AI 字幕与翻译服务",
    category: "视频剪辑",
    provider: "Whisper / 阿里翻译",
    price: 99,
    access: "仅接入辅导",
    runtime: "无本站字幕接口",
  },
  {
    id: "smart-clip-select",
    name: "智能素材筛选服务",
    category: "视频剪辑",
    provider: "自研流程",
    price: 138,
    access: "仅接入辅导",
    runtime: "无本站筛选接口",
  },
  {
    id: "digital-human",
    name: "数字人短视频服务",
    category: "视频剪辑",
    provider: "HeyGen / 腾讯智影",
    price: 248,
    access: "仅接入辅导",
    runtime: "无本站数字人接口",
  },
  {
    id: "restaurant-cs",
    name: "餐饮评价回复服务",
    category: "餐饮零售",
    provider: "千问",
    price: 99,
    access: "本站已接通",
    runtime: "qwen / qwen-plus",
    probe: "qwen",
  },
  {
    id: "menu-optimize",
    name: "菜单优化服务",
    category: "餐饮零售",
    provider: "千问 / GPT",
    price: 168,
    access: "仅接入辅导",
    runtime: "无本站对话接口",
  },
  {
    id: "inventory-forecast",
    name: "智能备货预测服务",
    category: "餐饮零售",
    provider: "自研流程",
    price: 198,
    access: "仅接入辅导",
    runtime: "无本站预测接口",
  },
  {
    id: "retail-marketing",
    name: "餐饮营销内容服务",
    category: "餐饮零售",
    provider: "DeepSeek",
    price: 138,
    access: "本站已配密钥",
    runtime: "deepseek / deepseek-chat",
    probe: "deepseek",
  },
];

function judge(product) {
  const test = product.probe ? tests[product.probe] : null;
  if (test?.ok) {
    return {
      key: "已填写",
      probe: test.detail,
      status: "可直接用",
      next: "开通后点「进入服务」即可对话。",
    };
  }
  if (product.probe === "deepseek") {
    return {
      key: "已填写",
      probe: test?.detail || "未测通",
      status: "接口不可用",
      next: "DeepSeek 返回余额不足。充值后即可在工作台使用。",
    };
  }
  if (product.probe === "openai") {
    return {
      key: "未填写",
      probe: "未配置 OPENAI_API_KEY",
      status: "缺密钥",
      next: "需要客户自己的 OpenAI 账号，或把官方密钥写入本机 .env。",
    };
  }
  if (product.probe === "stability") {
    return {
      key: "未填写",
      probe: "未配置 STABILITY_API_KEY",
      status: "缺密钥",
      next: "需要 Stability 官方密钥。当前工作台没有出图窗口，开通后走接入辅导。",
    };
  }
  return {
    key: "不需要本站密钥",
    probe: "未接本站接口",
    status: "仅辅导跟进",
    next: "开通后没有直接对话窗口，点「进入服务」把需求发给导购继续跟进。",
  };
}

const rows = products.map((product, index) => {
  const judged = judge(product);
  return {
    no: index + 1,
    ...product,
    ...judged,
    workspace: `/use/${product.id}`,
  };
});

const usable = rows.filter((r) => r.status === "可直接用");
const broken = rows.filter((r) => r.status === "接口不可用");
const missing = rows.filter((r) => r.status === "缺密钥");
const consult = rows.filter((r) => r.status === "仅辅导跟进");

const headers = [
  "序号",
  "服务名称",
  "服务ID",
  "方向",
  "厂商",
  "月费（元）",
  "本站接入方式",
  "对话/接口模型",
  "密钥",
  "实测结果",
  "当前能不能直接用",
  "原因与下一步",
  "工作台路径",
];

const productRowsXml = rows
  .map(
    (row) => `<Row>
      ${cell(row.no, "Number")}
      ${cell(row.name)}
      ${cell(row.id)}
      ${cell(row.category)}
      ${cell(row.provider)}
      ${cell(row.price, "Number")}
      ${cell(row.access)}
      ${cell(row.runtime)}
      ${cell(row.key)}
      ${cell(row.probe)}
      ${statusCell(row.status)}
      ${cell(row.next)}
      ${cell(row.workspace)}
    </Row>`
  )
  .join("\n");

const summaryRows = [
  ["检查时间", checkedAt],
  ["导购线路", `LLM_PROVIDER=${probed.inventory.LLM_PROVIDER}；实测${tests.qwen.ok ? "可用" : "不可用"}`],
  ["目录服务数", String(rows.length)],
  ["可直接用", usable.map((r) => r.name).join("、") || "无"],
  ["接口不可用", broken.map((r) => `${r.name}（${r.probe}）`).join("、") || "无"],
  ["缺密钥", missing.map((r) => r.name).join("、") || "无"],
  ["仅辅导跟进", `${consult.length} 项，开通后走导购跟进，没有本站对话窗口`],
  ["千问", tests.qwen.detail],
  ["豆包", tests.doubao.detail],
  ["DeepSeek", tests.deepseek.detail],
  ["OpenAI", tests.openai.detail],
  ["Stability", tests.stability.detail],
  ["说明", "月费是本站服务费，不是模型 token 转售。正式调用按各厂商计费。密钥未写入表格。"],
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>ai-supermarket服务表单</Title>
  <Author>AI 超市</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Microsoft YaHei" ss:Size="11"/>
  </Style>
  <Style ss:ID="title">
   <Font ss:FontName="Microsoft YaHei" ss:Size="18" ss:Bold="1"/>
  </Style>
  <Style ss:ID="subtitle">
   <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Color="#666666"/>
  </Style>
  <Style ss:ID="header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1F4E79" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ok">
   <Font ss:FontName="Microsoft YaHei" ss:Color="#0B6A0B" ss:Bold="1"/>
   <Interior ss:Color="#C6EFCE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="bad">
   <Font ss:FontName="Microsoft YaHei" ss:Color="#9C0006" ss:Bold="1"/>
   <Interior ss:Color="#FFC7CE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="warn">
   <Font ss:FontName="Microsoft YaHei" ss:Color="#9C5700" ss:Bold="1"/>
   <Interior ss:Color="#FFEB9C" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="muted">
   <Font ss:FontName="Microsoft YaHei" ss:Color="#595959"/>
   <Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="label">
   <Font ss:FontName="Microsoft YaHei" ss:Bold="1"/>
   <Interior ss:Color="#D6DCE4" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="服务总表">
  <Table ss:ExpandedColumnCount="13" ss:ExpandedRowCount="${rows.length + 3}" x:FullColumns="1" x:FullRows="1">
   <Column ss:Width="40"/>
   <Column ss:Width="160"/>
   <Column ss:Width="120"/>
   <Column ss:Width="90"/>
   <Column ss:Width="110"/>
   <Column ss:Width="70"/>
   <Column ss:Width="110"/>
   <Column ss:Width="180"/>
   <Column ss:Width="90"/>
   <Column ss:Width="160"/>
   <Column ss:Width="110"/>
   <Column ss:Width="280"/>
   <Column ss:Width="140"/>
   <Row ss:Height="28">
    <Cell ss:MergeAcross="12" ss:StyleID="title"><Data ss:Type="String">ai-supermarket 服务表单</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:MergeAcross="12" ss:StyleID="subtitle"><Data ss:Type="String">实测时间 ${checkedAt}。可直接用 ${usable.length} 项，接口不可用 ${broken.length} 项，缺密钥 ${missing.length} 项，仅辅导 ${consult.length} 项。密钥未写入本表。</Data></Cell>
   </Row>
   <Row ss:Height="24">${headers.map(headerCell).join("")}</Row>
   ${productRowsXml}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>3</SplitHorizontal>
   <TopRowBottomPane>3</TopRowBottomPane>
   <FreezePanes/>
   <FrozenNoSplit/>
  </WorksheetOptions>
 </Worksheet>
 <Worksheet ss:Name="接口实测">
  <Table ss:ExpandedColumnCount="2" ss:ExpandedRowCount="${summaryRows.length + 2}">
   <Column ss:Width="120"/>
   <Column ss:Width="520"/>
   <Row ss:Height="28">
    <Cell ss:MergeAcross="1" ss:StyleID="title"><Data ss:Type="String">本机接口实测</Data></Cell>
   </Row>
   ${summaryRows
     .map(
       ([k, v]) => `<Row>
      <Cell ss:StyleID="label"><Data ss:Type="String">${xmlEscape(k)}</Data></Cell>
      ${cell(v)}
    </Row>`
     )
     .join("\n")}
  </Table>
 </Worksheet>
</Workbook>
`;

const desktop = path.join(process.env.USERPROFILE || "", "Desktop");
const docs = path.join(process.env.USERPROFILE || "", "Documents");
const fileName = "ai-supermarket服务表单.xls";
const targets = [
  path.join(root, fileName),
  path.join(desktop, fileName),
  path.join(docs, "WPSCloud", "ai-supermarket服务表单.xls"),
  path.join(docs, fileName),
];

const written = [];
for (const target of targets) {
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, xml, "utf8");
    written.push(target);
  } catch (error) {
    console.error("skip", target, error.message);
  }
}

console.log(JSON.stringify({ written, usable: usable.map((r) => r.id), broken: broken.map((r) => r.id), missing: missing.map((r) => r.id), consult: consult.length }, null, 2));
