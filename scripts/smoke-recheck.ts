/**
 * 修后重点抽查：答非所问（乱问开店平台）+ 店铺类可问平台
 * Usage: npx tsx scripts/smoke-recheck.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

config({ path: join(process.cwd(), ".env"), override: true });

const BASE = process.env.SMOKE_BASE || "http://localhost:3000";

/** 非店铺服务：回复里出现这些视为答非所问 */
const OFFTOPIC =
  /在哪些平台开店|哪个平台开店|哪些平台上开店|主要在哪个平台开店|你在哪些平台|方便告诉我你在哪些平台|美团\/饿了么|淘宝、京东等|先告诉我你在哪个平台开店/;

type Case = {
  id: string;
  message: string;
  /** shop = 允许谈平台；topic = 禁止乱问开店 */
  expect: "shop" | "topic";
};

const CASES: Case[] = [
  // 修后重点抽查（首轮答非所问高发）
  {
    id: "capcut-auto",
    message: "我想出一条30秒竖版口播，风格干净一点，先告诉我要准备什么。",
    expect: "topic",
  },
  {
    id: "qwen-plus",
    message: "你好，千问接入服务怎么开始？",
    expect: "topic",
  },
  {
    id: "course-notes",
    message: "我要整理一堂课的笔记，怎么开始？",
    expect: "topic",
  },
  {
    id: "hr-qa-bot",
    message: "员工请假制度怎么接到机器人？",
    expect: "topic",
  },
  {
    id: "resume-screen",
    message: "帮我筛前端岗位简历，怎么开始？",
    expect: "topic",
  },
  {
    id: "digital-human",
    message: "我想用数字人讲产品，要准备什么？",
    expect: "topic",
  },
  {
    id: "whisper-api",
    message: "会议录音怎么转成文字？先告诉我怎么开始。",
    expect: "topic",
  },
  {
    id: "elevenlabs-tts",
    message: "我想给口播配音，怎么开始？",
    expect: "topic",
  },
  {
    id: "dall-e-3",
    message: "我想出一张商品海报，怎么开始？",
    expect: "topic",
  },
  {
    id: "contract-photo-review",
    message: "还没有图。先告诉我拍照要注意什么。",
    expect: "topic",
  },
  // 店铺类：可以谈平台/门店
  {
    id: "restaurant-cs",
    message: "只要门店编号就能自动回复吗？",
    expect: "shop",
  },
  {
    id: "shop-review",
    message: "你好，这项服务怎么开始？先别让我填表。",
    expect: "shop",
  },
];

async function mintCookie(user: { id: string; email: string; name: string }) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  return `ai-supermarket-session=${token}`;
}

function judge(expect: Case["expect"], text: string, http: number) {
  if (
    http >= 400 ||
    /暂时连不上|Access denied|overdue account|Not enough point|积分不足|余额不足/i.test(
      text
    )
  ) {
    return { ok: false, reason: "通道/账户异常（非答非所问）", infra: true };
  }
  const hitOfftopic = OFFTOPIC.test(text);
  if (expect === "topic") {
    return {
      ok: !hitOfftopic,
      reason: hitOfftopic ? "仍在问开店平台" : "未乱问开店",
      infra: false,
    };
  }
  const onShop =
    /门店|编号|开放平台|AppKey|评价|自动回复|凭证|起草|平台/.test(text);
  return {
    ok: onShop,
    reason: onShop ? "在谈店铺接入要点" : "店铺类却未触及门店/凭证要点",
    infra: false,
  };
}

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({
    where: { email: "2028391318@qq.com" },
  });
  if (!user) throw new Error("no user 2028391318@qq.com");
  const cookie = await mintCookie(user);

  const rows: {
    id: string;
    expect: string;
    ok: boolean;
    reason: string;
    http: number;
    model: string;
    preview: string;
    infra: boolean;
  }[] = [];

  for (const item of CASES) {
    const res = await fetch(`${BASE}/api/runtime/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        productId: item.id,
        message: item.message,
        history: [],
      }),
    });
    const data = (await res.json()) as {
      reply?: string;
      error?: string;
      model?: string;
    };
    const text = String(data.reply || data.error || "")
      .replace(/\s+/g, " ")
      .trim();
    const verdict = judge(item.expect, text, res.status);
    rows.push({
      id: item.id,
      expect: item.expect,
      ok: verdict.ok,
      reason: verdict.reason,
      http: res.status,
      model: data.model || "-",
      preview: text.slice(0, 160),
      infra: verdict.infra,
    });
    console.log(
      `${verdict.ok ? "✓" : "✗"}\t${item.id}\t${verdict.reason}\t${text.slice(0, 80)}`
    );
  }

  const topicRows = rows.filter((r) => !(r as { infra?: boolean }).infra);
  const topicOk = topicRows.every((r) => r.ok);
  const infraFails = rows.filter((r) => (r as { infra?: boolean }).infra);
  const out = {
    at: new Date().toISOString(),
    allOk: topicOk && infraFails.length === 0,
    topicOk,
    topicPassed: topicRows.filter((r) => r.ok).length,
    topicTotal: topicRows.length,
    infraFails: infraFails.map((r) => ({ id: r.id, reason: r.reason, preview: r.preview })),
    passed: rows.filter((r) => r.ok).length,
    total: rows.length,
    rows,
  };
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-recheck-result.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(
    `\n答非所问抽查: ${topicOk ? "通过 ✓" : "未通过 ✗"} (${out.topicPassed}/${out.topicTotal})`
  );
  if (infraFails.length) {
    console.log(
      `通道异常（另计）: ${infraFails.map((r) => r.id).join(", ")}`
    );
  }
  await prisma.$disconnect();
  process.exit(topicOk ? 0 : 1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
