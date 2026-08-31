"use client";

import { useEffect, useState } from "react";

const DEFAULT_STEPS = [
  "在读你刚发的内容",
  "对照这项服务该怎么带",
  "在组织回复",
  "整理成可直接看的说法",
];

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s.toString().padStart(2, "0")}秒`;
}

export function ThinkingIndicator({
  active,
  modelLabel,
  hasFiles,
  steps: stepsProp,
}: {
  active: boolean;
  modelLabel?: string;
  hasFiles?: boolean;
  steps?: string[];
}) {
  const [seconds, setSeconds] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [receipt, setReceipt] = useState<number | null>(null);

  const base = stepsProp?.length ? stepsProp : DEFAULT_STEPS;
  const steps = [
    hasFiles ? "在看你发来的文件" : base[0],
    base[1] || DEFAULT_STEPS[1],
    modelLabel ? `在用 ${modelLabel} 组织回复` : base[2] || DEFAULT_STEPS[2],
    base[3] || DEFAULT_STEPS[3],
  ];

  useEffect(() => {
    if (!active) return;
    setSeconds(0);
    setStepIndex(0);
    setExpanded(true);
    setReceipt(null);
    const tick = window.setInterval(() => setSeconds((n) => n + 1), 1000);
    const advance = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }, 2200);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(advance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, modelLabel, hasFiles]);

  useEffect(() => {
    if (active) return;
    if (seconds <= 0) return;
    setReceipt(seconds);
    setExpanded(false);
    const hide = window.setTimeout(() => setReceipt(null), 4500);
    return () => window.clearTimeout(hide);
  }, [active, seconds]);

  if (!active && receipt == null) return null;

  const showing = active || receipt != null;
  if (!showing) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left text-sm text-zinc-300"
        onClick={() => !active && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {active ? (
          <span
            className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-sky-400"
            aria-hidden
          />
        ) : (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full bg-zinc-500"
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1">
          {active ? (
            <>
              <span className="thinking-shimmer font-medium text-zinc-200">
                思考中
              </span>
              <span className="ml-2 tabular-nums text-zinc-500">
                {formatElapsed(seconds)}
              </span>
            </>
          ) : (
            <span className="text-zinc-400">
              思考了 {formatElapsed(receipt ?? 0)}
            </span>
          )}
        </span>
        {!active && (
          <span className="text-[11px] text-zinc-600">
            {expanded ? "收起" : "展开"}
          </span>
        )}
      </button>

      {(active || expanded) && (
        <ul className="mt-2 space-y-1 border-t border-white/5 pt-2">
          {steps.map((step, i) => {
            const done = i < stepIndex || (!active && i <= stepIndex);
            const current = active && i === stepIndex;
            return (
              <li
                key={step}
                className={`flex items-center gap-2 text-xs ${
                  current
                    ? "text-zinc-300"
                    : done
                      ? "text-zinc-500"
                      : "text-zinc-600"
                }`}
              >
                <span className="w-3 shrink-0 text-center tabular-nums">
                  {current ? "…" : done ? "✓" : "·"}
                </span>
                <span>{step}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
