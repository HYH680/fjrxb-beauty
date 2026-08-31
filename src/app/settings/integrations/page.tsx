"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";

type Cap = {
  id: string;
  label: string;
  on: boolean;
  whenOn: string;
  whenOff: string;
  live?: "up" | "down" | "skip";
  toggleable?: boolean;
};

/** 三只水龙头：编排 / 转写 / 抽字（不再把 :5678/:8091/:8092 当对外地址） */
const FAUCETS = [
  {
    id: "n8n",
    title: "编排总闸",
    subtitle: "合同提醒、评价起草等自动化",
    offFallback: "关：只用站内任务队列",
  },
  {
    id: "localWhisper",
    title: "转写总闸",
    subtitle: "本机语音转写优先",
    offFallback: "关：自动走千问云端转写",
  },
  {
    id: "docling",
    title: "文档总闸",
    subtitle: "重型 PDF 抽字优先",
    offFallback: "关：自动走站内 unpdf",
  },
] as const;

export default function IntegrationsValvePage() {
  const { user, loading: authLoading } = useAuth();
  const [caps, setCaps] = useState<Cap[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const forbidden = Boolean(!authLoading && user && !user.isAdmin);

  const reload = useCallback(async () => {
    const res = await fetch("/api/settings/integrations");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "读取失败");
    setCaps(data.capabilities || []);
  }, []);

  useEffect(() => {
    if (authLoading || !user?.isAdmin) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "读取失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.isAdmin, reload]);

  async function setFaucet(id: string, on: boolean) {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, on }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "切换失败");
        return;
      }
      if (Array.isArray(data.capabilities)) setCaps(data.capabilities);
      setMessage(
        on
          ? "已打开：本站 API 会按需走内部旁路；对外只需用 localhost:3000。"
          : "已关闭：本站自动回落云端/内置，不再调用该旁路。"
      );
    } catch {
      setError("网络错误");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-zinc-100">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="text-sm text-zinc-500">管理员 · 旁路总闸</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">三路水龙头</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          像现实里的总阀：打开才走对应旁路，关闭立刻停用。工作台与用户只打{" "}
          <span className="text-zinc-200">localhost:3000</span>
          ，不再单独使用 :5678 / :8091 / :8092 地址。
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-[#12151c] px-4 py-4 text-[13px] leading-6 text-zinc-400">
          <p>
            <span className="text-zinc-200">看 tokens / 实时调用：</span>{" "}
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="text-[#93c5fd] underline"
            >
              New API 控制台 :3001
            </a>
            （模型网关，不管旁路）
          </p>
          <p className="mt-1">
            <span className="text-zinc-200">旁路开/关总闸：</span> 就在本页（AI 智能体超市管理端）
          </p>
        </div>

        {forbidden ? (
          <p className="mt-10 text-sm text-zinc-400">
            仅管理员可操作。
            <Link href="/account" className="ml-2 text-[#93c5fd] underline">
              返回账户
            </Link>
          </p>
        ) : loading ? (
          <p className="mt-10 text-sm text-zinc-500">加载中…</p>
        ) : (
          <div className="mt-10 space-y-4">
            {message ? (
              <p className="text-[13px] text-emerald-400">{message}</p>
            ) : null}
            {error ? <p className="text-[13px] text-red-400">{error}</p> : null}

            {FAUCETS.map((f) => {
              const row = caps.find((c) => c.id === f.id);
              const on = Boolean(row?.on);
              const live = row?.live;
              return (
                <div
                  key={f.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#12151c] px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg text-zinc-100">{f.title}</h2>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] ${
                          on
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-zinc-500/20 text-zinc-400"
                        }`}
                      >
                        {on ? "开" : "关"}
                      </span>
                      {on && live && live !== "skip" ? (
                        <span
                          className={`text-[11px] ${
                            live === "up"
                              ? "text-emerald-400/80"
                              : "text-amber-400/90"
                          }`}
                        >
                          {live === "up" ? "内部旁路可达" : "旁路未起·已自动回落"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] text-zinc-400">{f.subtitle}</p>
                    <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                      {on ? row?.whenOn || "开：经本站 API 内部调用" : f.offFallback}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busy === f.id}
                    onClick={() => void setFaucet(f.id, !on)}
                    className={`relative h-10 w-[72px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                      on ? "bg-emerald-500/80" : "bg-zinc-600"
                    }`}
                    aria-pressed={on}
                    aria-label={`${f.title}${on ? "关闭" : "打开"}`}
                  >
                    <span
                      className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-transform ${
                        on ? "left-9" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })}

            <p className="pt-4 text-[12px] leading-5 text-zinc-600">
              旁路进程若需本机常驻，管理员在服务器执行{" "}
              <code className="text-zinc-400">npm run integrations:start</code>
              ；用户与前端永远只访问 3000，不直接访问旁路端口。
            </p>

            <Link
              href="/settings"
              className="mt-4 inline-block text-sm text-zinc-500 hover:text-[#93c5fd]"
            >
              ← 平台导购密钥
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
