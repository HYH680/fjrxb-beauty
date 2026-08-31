"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { ChatAssistant } from "@/components/ChatAssistant";
import { WorkspaceMaterials } from "@/components/WorkspaceMaterials";
import {
  getServiceBrief,
  isReviewOps,
  isVisionRun,
  missingMaterials,
  platformLabel,
  showsPlatformSync,
} from "@/lib/service-briefs";
import { WorkspaceMediaTools } from "@/components/WorkspaceMediaTools";
import {
  isKnowledgeProduct,
  WorkspaceKnowledge,
} from "@/components/WorkspaceKnowledge";

type Connection = {
  id: string;
  platform: string;
  shopName: string;
  shopId: string;
  appKeyMasked: string;
  hasSecret: boolean;
  status: string;
  lastError: string;
  lastSyncAt: string | null;
  pullUrl: string;
  replyUrl: string;
};

type Review = {
  id: string;
  platform: string;
  rating: number;
  author: string;
  content: string;
  draftReply: string;
  status: string;
  lastError: string;
};

type Playbook = {
  shopDisplayName: string;
  extraPrompt: string;
};

const STATUS: Record<string, string> = {
  inbox: "待起草",
  drafted: "已起草",
  queued: "待发送",
  sent: "已发送",
  failed: "发送失败",
  draft: "待补充凭证",
  awaiting_endpoint: "待补充接口",
  connected: "已接入",
  needs_auth: "鉴权待核实",
  error: "接入异常",
};

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-white/10 px-4 py-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-medium tracking-wide text-zinc-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ServiceOpsDesk({ productId }: { productId: string }) {
  const brief = getServiceBrief(productId);
  const reviewMode = isReviewOps(productId);
  const platformSync = showsPlatformSync(productId);
  const visionMode = isVisionRun(productId);
  const csMode = brief.kind === "cs-ops";
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [saved, setSaved] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [deskTick, setDeskTick] = useState(0);
  const [sawUpload, setSawUpload] = useState(false);
  const [injectText, setInjectText] = useState("");

  useEffect(() => {
    try {
      const key = `ai-supermarket:vision-uploaded:${productId}`;
      setSawUpload(window.localStorage.getItem(key) === "1");
    } catch {
      setSawUpload(false);
    }
  }, [productId]);

  const markUploaded = useCallback(() => {
    setSawUpload(true);
    try {
      window.localStorage.setItem(`ai-supermarket:vision-uploaded:${productId}`, "1");
    } catch {
      /* ignore */
    }
  }, [productId]);

  const loadAll = useCallback(async () => {
    const q = `productId=${encodeURIComponent(productId)}`;
    const [play, shops, inbox] = await Promise.all([
      fetch(`/api/ops/playbook?${q}`).then((res) => res.json()),
      platformSync || csMode
        ? fetch(`/api/ops/connections?${q}`).then((res) => res.json())
        : Promise.resolve({ connections: [] }),
      reviewMode
        ? fetch(`/api/ops/reviews?${q}`).then((res) => res.json())
        : Promise.resolve({ reviews: [] }),
    ]);
    setSaved(Boolean(play.saved));
    setPlaybook(play.playbook ?? null);
    setConnections(shops.connections || []);
    setReviews(inbox.reviews || []);
  }, [productId, reviewMode, platformSync, csMode]);

  useEffect(() => {
    loadAll().catch(() => setNotice("运行状态加载失败，请稍后重试。"));
    const timer = setInterval(() => {
      loadAll().catch(() => undefined);
    }, 8000);
    return () => clearInterval(timer);
  }, [loadAll]);

  async function runAgain() {
    setBusy(true);
    const res = await fetch("/api/ops/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const data = await res.json();
    setBusy(false);
    setNotice(data.reply || data.error || "");
    await loadAll();
  }

  async function sendReview(id: string) {
    setBusy(true);
    const res = await fetch("/api/ops/reviews", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "send", productId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setNotice(data.error || "发送失败，请核对接口权限后重试。");
    await loadAll();
  }

  const needsData = brief.materials.some((item) => item.slot === "data" && item.required);
  const state = {
    hasPrompt: saved || Boolean(playbook?.extraPrompt?.trim()),
    hasKey: connections.some((shop) => shop.hasSecret || shop.appKeyMasked),
    hasShopId: connections.some((shop) => Boolean(shop.shopId)),
    hasPull: connections.some((shop) => Boolean(shop.pullUrl)),
    hasReply: connections.some((shop) => Boolean(shop.replyUrl)),
    // 资料「data」不能用「已保存规范」冒充；看图服务以会话里是否发过图为准
    hasData: visionMode
      ? sawUpload
      : needsData
        ? Boolean(playbook?.extraPrompt?.trim()) || sawUpload
        : true,
  };
  const missing = missingMaterials(brief, state);
  const requiredTotal = brief.materials.filter((item) => item.required).length;
  const requiredDone = requiredTotal - missing.length;
  const canDraft = reviewMode || csMode ? state.hasPrompt : requiredDone === requiredTotal;
  const canSync = platformSync && state.hasKey && (state.hasPull || state.hasReply);

  const runLabel = reviewMode
    ? "同步评价"
    : visionMode
      ? "按已收图片再跑"
      : "按已收资料运行";

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:items-stretch">
      <div className="flex min-h-[min(28rem,70dvh)] flex-col lg:h-full lg:min-h-0">
        <ChatAssistant
          variant="page"
          tryProductId={productId}
          workspaceMode
          fill
          workspacePanel={<WorkspaceMaterials productId={productId} refreshKey={deskTick} />}
          injectText={injectText}
          onInjectConsumed={() => setInjectText("")}
          onLanded={() => {
            setDeskTick((n) => n + 1);
            markUploaded();
            loadAll().catch(() => undefined);
          }}
        />
      </div>

      <aside className="flex min-h-0 flex-col lg:h-full">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12151c]">
          <div className="shrink-0 border-b border-white/5 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Status
                </p>
                <h2 className="mt-0.5 text-sm font-semibold text-zinc-100">
                  {visionMode ? "看图执行" : csMode ? "话术起草" : "接入概况"}
                </h2>
              </div>
              {(reviewMode || brief.kind === "playbook-run" || brief.kind === "key-connect") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={runAgain}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                  {busy ? "处理中" : runLabel}
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-2.5">
                <p className="text-[11px] text-zinc-500">
                  {visionMode ? "看图分析" : csMode ? "话术起草" : "起草回复"}
                </p>
                <p
                  className={`mt-1 text-sm font-medium ${
                    visionMode
                      ? sawUpload
                        ? "text-emerald-400"
                        : "text-zinc-200"
                      : canDraft
                        ? "text-emerald-400"
                        : "text-zinc-200"
                  }`}
                >
                  {visionMode
                    ? sawUpload
                      ? "可继续发图"
                      : "请在左侧上传照片"
                    : canDraft
                      ? "已可使用"
                      : "待补充资料"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-2.5">
                <p className="text-[11px] text-zinc-500">
                  {platformSync ? "自动同步" : visionMode ? "文件格式" : "当前能力"}
                </p>
                <p
                  className={`mt-1 text-sm font-medium ${
                    platformSync
                      ? canSync
                        ? "text-emerald-400"
                        : "text-zinc-200"
                      : "text-zinc-200"
                  }`}
                >
                  {platformSync
                    ? canSync
                      ? "已接入"
                      : "待开放平台凭证"
                    : visionMode
                      ? "图片/PDF 可用"
                      : csMode
                        ? "起草为主"
                        : "对话落地"}
                </p>
              </div>
            </div>
            {missing.length ? (
              <p className="mt-2.5 text-[12px] leading-5 text-amber-200/90">
                待补充：{missing.map((item) => item.label).join("、")}
              </p>
            ) : (
              <p className="mt-2.5 text-[12px] leading-5 text-zinc-500">
                {visionMode
                  ? "左侧发图即可开始"
                  : `资料已齐（${requiredDone}/${requiredTotal}）`}
              </p>
            )}
            {notice ? (
              <pre className="mt-2.5 max-h-28 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-2 text-[12px] leading-5 text-zinc-300">
                {notice}
              </pre>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
          {(reviewMode || csMode || brief.kind === "key-connect" || brief.kind === "playbook-run") && (
            <Section title={csMode || reviewMode ? "回复规范" : "已收场景"}>
              {saved || playbook?.extraPrompt ? (
                <>
                  <p className="text-[13px] text-zinc-200">
                    {playbook?.shopDisplayName || "已保存"} · 按已提交口径起草
                  </p>
                  {playbook?.extraPrompt ? (
                    <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap text-[13px] leading-6 text-zinc-500">
                      {playbook.extraPrompt}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-[13px] leading-6 text-zinc-500">
                  {visionMode
                    ? "可选：先说明你最关心的检查点，再发图。"
                    : "尚未提交。请将场景说明或规范发送至左侧窗口，系统将自动保存。"}
                </p>
              )}
            </Section>
          )}

          {visionMode ? (
            <details className="border-t border-white/10 px-4 py-3">
              <summary className="cursor-pointer text-[12px] text-zinc-400 hover:text-zinc-200">
                怎么用（可选）
              </summary>
              <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-zinc-500">
                <li>1. 左侧上传或粘贴照片 / PDF</li>
                <li>2. PDF 自动转前 3 页；更多页请另传</li>
                <li>3. 一句话说清要盯的点</li>
                <li>4. 结果是草稿，重要结论请人复核</li>
              </ul>
            </details>
          ) : null}

          <WorkspaceMediaTools
            productId={productId}
            onNotice={setNotice}
            onTranscript={(text) => setInjectText(text)}
          />

          {isKnowledgeProduct(productId) ? (
            <WorkspaceKnowledge productId={productId} onNotice={setNotice} />
          ) : null}

          {platformSync ? (
            <Section title="平台接入">
              {connections.length === 0 ? (
                <p className="text-[13px] leading-6 text-zinc-500">
                  暂未接入。自动同步走自备查询/回复接口，不是官方一键授权。没有凭证也可先贴评价起草。
                </p>
              ) : (
                <ul className="space-y-3">
                  {connections.map((shop) => (
                    <li
                      key={shop.id}
                      className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] text-zinc-200">
                          {shop.shopName} · {platformLabel(shop.platform)}
                        </p>
                        <span className="text-[11px] text-zinc-400">
                          {STATUS[shop.status] || shop.status}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                        门店编号 {shop.shopId || "未提供"} · 凭证{" "}
                        {shop.appKeyMasked || "未提供"}
                        <br />
                        查询接口 {shop.pullUrl ? "已配置" : "未配置"} · 回复接口{" "}
                        {shop.replyUrl ? "已配置" : "未配置"}
                      </p>
                      {shop.lastError ? (
                        <p className="mt-2 text-[12px] text-amber-200">{shop.lastError}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ) : null}

          {csMode ? (
            <details className="border-t border-white/10 px-4 py-3">
              <summary className="cursor-pointer text-[12px] text-zinc-400 hover:text-zinc-200">
                能力说明
              </summary>
              <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                以「按政策起草回复」为主。把顾客消息贴到左侧即可。自动发出需另接各平台消息接口；本站不会登录商家 App。
              </p>
            </details>
          ) : null}

          {reviewMode ? (
            <Section
              title="评价列表"
              action={
                <span className="text-[11px] text-zinc-500">
                  {reviews.length ? `${reviews.length} 条` : "暂无"}
                </span>
              }
            >
              {reviews.length === 0 ? (
                <p className="text-[13px] leading-6 text-zinc-500">
                  完成开放平台接入后，评价将经你配置的接口同步至此。也可将单条评价粘贴至左侧窗口，先行起草回复。
                </p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-zinc-400">
                        <span>
                          {platformLabel(review.platform)} · {review.rating} 星 ·{" "}
                          {review.author || "顾客"}
                        </span>
                        <span>{STATUS[review.status] || review.status}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-zinc-200">
                        {review.content}
                      </p>
                      {review.draftReply ? (
                        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-zinc-400">
                          拟回复：{review.draftReply}
                        </p>
                      ) : null}
                      {review.lastError ? (
                        <p className="mt-2 text-[12px] text-amber-200">{review.lastError}</p>
                      ) : null}
                      {review.draftReply && review.status !== "sent" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => sendReview(review.id)}
                          className="mt-3 rounded-md bg-[#3b82f6] px-3 py-1.5 text-xs text-white hover:bg-[#2563eb] disabled:opacity-50"
                        >
                          发送至店铺后台
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </Section>
          ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

export { ServiceOpsDesk as ReviewOpsDesk };
