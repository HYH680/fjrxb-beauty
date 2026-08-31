"use client";

import { useState } from "react";

type Cap = {
  id: string;
  track: string;
  label: string;
  on: boolean;
  switches: string[];
  whenOn: string;
  whenOff: string;
  live?: "up" | "down" | "skip";
  toggleable?: boolean;
};

const TRACK_LABEL: Record<string, string> = {
  "1-n8n": "① n8n 编排",
  "2-local-heavy": "② 本地重服务",
  "3-compose-align": "③ 与生产对齐",
  base: "基础能力",
};

export function IntegrationCapabilityPanel({
  capabilities: initial,
  canToggle = false,
  onChanged,
}: {
  capabilities: Cap[];
  canToggle?: boolean;
  onChanged?: (next: Cap[]) => void;
}) {
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!rows?.length) return null;

  const grouped = rows.reduce<Record<string, Cap[]>>((acc, row) => {
    (acc[row.track] ||= []).push(row);
    return acc;
  }, {});

  async function toggle(row: Cap) {
    if (!canToggle || !row.toggleable || busyId) return;
    setBusyId(row.id);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, on: !row.on }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "切换失败");
        return;
      }
      if (Array.isArray(data.capabilities)) {
        setRows(data.capabilities);
        onChanged?.(data.capabilities);
      }
      setMessage(data.hint || (data.on ? "已打开" : "已关闭"));
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-[#12151c] px-5 py-5">
      <h2 className="text-sm text-zinc-500">旁路开关状态</h2>
      <p className="mt-2 text-[12px] leading-5 text-zinc-500">
        {canToggle ? (
          <>
            管理员可直接点「打开 / 关闭」。写入后端后立刻生效；旁路未起时会自动回落云端或内置能力。
          </>
        ) : (
          <>
            开关由管理员在账户页操作。此处只读展示开/关差异。
          </>
        )}
      </p>
      {message ? (
        <p className="mt-2 text-[12px] text-emerald-400">{message}</p>
      ) : null}
      {error ? <p className="mt-2 text-[12px] text-red-400">{error}</p> : null}
      <div className="mt-5 space-y-6">
        {Object.entries(grouped).map(([track, list]) => (
          <div key={track}>
            <h3 className="text-[12px] font-medium tracking-wide text-zinc-400">
              {TRACK_LABEL[track] || track}
            </h3>
            <ul className="mt-2 space-y-3">
              {list.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] ${
                        row.on
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-zinc-500/20 text-zinc-400"
                      }`}
                    >
                      {row.on ? "开" : "关"}
                    </span>
                    {row.live && row.live !== "skip" ? (
                      <span
                        className={`text-[11px] ${
                          row.live === "up"
                            ? "text-emerald-400/80"
                            : "text-amber-400/90"
                        }`}
                      >
                        探测 {row.live === "up" ? "可达" : "未达"}
                      </span>
                    ) : null}
                    <span className="text-sm text-zinc-200">{row.label}</span>
                    {canToggle && row.toggleable ? (
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void toggle(row)}
                        className={`ml-auto rounded-md px-3 py-1.5 text-xs ${
                          row.on
                            ? "border border-white/15 text-zinc-300 hover:bg-white/5"
                            : "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                        } disabled:opacity-50`}
                      >
                        {busyId === row.id
                          ? "保存中…"
                          : row.on
                            ? "关闭"
                            : "打开并用"}
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                    {row.on ? (
                      <>
                        <span className="text-zinc-400">开着：</span>
                        {row.whenOn}
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-400">关着：</span>
                        {row.whenOff}
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
