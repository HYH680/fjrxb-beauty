"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AUTH_BTN, AUTH_INPUT } from "@/components/AuthLayout";
import { useAuth } from "@/hooks/useAuth";

const PRESETS = [
  {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  {
    label: "豆包",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-seed-2-0-lite-260215",
  },
  {
    label: "千问",
    baseUrl: "https://ws-4drt75wu5x62b7jg.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
  },
  {
    label: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
  },
  {
    label: "小爱",
    baseUrl: "https://xiaoai.plus/v1",
    model: "deepseek-chat",
  },
];

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com/v1");
  const [model, setModel] = useState("deepseek-chat");
  const [apiKey, setApiKey] = useState("");
  const [masked, setMasked] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [board, setBoard] = useState<{
    live: { id: string; label: string; model: string; why: string }[];
    services: {
      productId: string;
      name: string;
      taskLabel: string;
      winner: { label: string; model: string; why: string } | null;
      fallback: { label: string } | null;
    }[];
    hint: string;
  } | null>(null);
  const forbidden = Boolean(!authLoading && user && !user.isAdmin);

  useEffect(() => {
    if (authLoading || !user?.isAdmin) return;
    let cancelled = false;
    fetch("/api/settings/llm")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 403) {
          return;
        }
        if (!res.ok) {
          setError(data.error || "无法读取接入配置");
          return;
        }
        if (data.baseUrl) setBaseUrl(data.baseUrl);
        if (data.model) setModel(data.model);
        if (data.apiKeyMasked) setMasked(data.apiKeyMasked);
        setConfigured(Boolean(data.configured));
        fetch("/api/settings/models")
          .then((res) => res.json())
          .then((payload) => {
            if (!cancelled && payload.services) setBoard(payload);
          })
          .catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setError("无法读取接入配置");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          model,
          apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存失败");
        return;
      }
      setMasked(data.apiKeyMasked || "");
      setConfigured(Boolean(data.configured));
      setApiKey("");
      setMessage("已保存。导购会用这组密钥调用模型。");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings/llm/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "测试失败");
        return;
      }
      setMessage(`连接正常，模型 ${data.model}`);
    } catch {
      setError("测试失败，请稍后重试");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-zinc-100">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm text-zinc-500">管理员</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">平台导购密钥</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          这是全站导购共用的模型接入，不是个人密钥。仅管理员可修改。
        </p>

        {forbidden ? (
          <p className="mt-10 text-sm text-zinc-400">
            平台密钥由管理员配置。
            <Link href="/account" className="ml-2 text-[#93c5fd] underline">
              返回账户
            </Link>
          </p>
        ) : loading ? (
          <p className="mt-10 text-sm text-zinc-500">加载中…</p>
        ) : (
          <div className="mt-10 space-y-5">
            <div>
              <p className="mb-2 text-sm text-zinc-500">常用接入</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setBaseUrl(item.baseUrl);
                      setModel(item.model);
                    }}
                    className="rounded-lg border border-white/10 bg-[#12151c] px-3 py-1.5 text-sm text-zinc-300 hover:border-white/20"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-500">接口地址</label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className={AUTH_INPUT}
                placeholder="https://api.deepseek.com/v1"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-500">模型</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={AUTH_INPUT}
                placeholder="deepseek-chat"
              />
              <p className="mt-2 text-xs text-zinc-500">
                DeepSeek 用 deepseek-chat；豆包用方舟模型名或接入点 ep-…；千问用 qwen-plus。
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-500">API 密钥</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={AUTH_INPUT}
                placeholder={configured ? masked || "已配置，留空则不更改" : "sk-..."}
                autoComplete="off"
              />
              {configured && (
                <p className="mt-2 text-xs text-zinc-500">当前：{masked}。要更换请重新粘贴。</p>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {message && <p className="text-sm text-emerald-400">{message}</p>}

            <div className="flex flex-wrap gap-3">
              <button onClick={save} disabled={saving} className={`${AUTH_BTN} w-auto px-5`}>
                {saving ? "保存中…" : "保存"}
              </button>
              <button
                onClick={test}
                disabled={testing || !configured}
                className="rounded-lg border border-white/10 px-5 py-2.5 text-sm text-zinc-300 hover:border-white/20 disabled:opacity-40"
              >
                {testing ? "测试中…" : "测试连接"}
              </button>
            </div>

            <Link href="/settings/integrations" className="mt-6 inline-block text-sm text-zinc-500 hover:text-[#93c5fd]">
              旁路总闸（三路水龙头）
            </Link>
            <Link href="/settings/catalog" className="ml-4 inline-block text-sm text-zinc-500 hover:text-[#93c5fd]">
              目录与价格
            </Link>
            <Link href="/account" className="ml-4 inline-block text-sm text-zinc-500 hover:text-[#93c5fd]">
              返回账户
            </Link>

            {board && (
              <div className="mt-12 space-y-4 border-t border-white/10 pt-8">
                <h2 className="text-xl font-semibold tracking-tight">各服务当前模型</h2>
                <p className="text-sm leading-6 text-zinc-400">{board.hint}</p>
                <div className="flex flex-wrap gap-2">
                  {board.live.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-[#12151c] px-3 py-1.5 text-xs text-zinc-300"
                    >
                      {item.label} · {item.model}
                    </span>
                  ))}
                </div>
                <div className="space-y-2">
                  {board.services.map((row) => (
                    <div
                      key={row.productId}
                      className="flex flex-col gap-1 rounded-xl border border-white/10 bg-[#12151c] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm text-zinc-100">{row.name}</p>
                        <p className="text-xs text-zinc-500">{row.taskLabel}</p>
                      </div>
                      <p className="text-sm text-zinc-300">
                        {row.winner
                          ? `${row.winner.label}${row.fallback ? `，备选 ${row.fallback.label}` : ""}`
                          : "暂无可用模型"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
