"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { getServiceBrief, type MaterialSlot } from "@/lib/service-briefs";
import { platformLabel } from "@/lib/platforms";

function storageKey(productId: string) {
  return `ai-supermarket:materials-optin:${productId}`;
}

function loadOptIn(productId: string): MaterialSlot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(productId));
    const parsed = raw ? (JSON.parse(raw) as MaterialSlot[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOptIn(productId: string, slots: MaterialSlot[]) {
  try {
    window.localStorage.setItem(storageKey(productId), JSON.stringify(slots));
  } catch {
    /* ignore */
  }
}

type Setup = {
  step: string;
  focus: string;
  platforms: string[];
  prompt: string;
};

function CompactStrip({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="shrink-0 border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] text-zinc-300">
            <span className="mr-2 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              {eyebrow}
            </span>
            {title}
          </p>
          {!open ? (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">{hint}</p>
          ) : null}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && children ? (
        <div className="border-t border-white/5 px-4 pb-3 pt-2">{children}</div>
      ) : null}
    </div>
  );
}

export function WorkspaceMaterials({
  productId,
  refreshKey = 0,
}: {
  productId: string;
  refreshKey?: number;
}) {
  const brief = getServiceBrief(productId);
  const guided = brief.kind === "review-ops" || brief.kind === "cs-ops";
  const vision = brief.kind === "vision-run";
  const required = brief.materials.filter((item) => item.required);
  const optional = brief.materials.filter((item) => !item.required);
  const [optIn, setOptIn] = useState<MaterialSlot[]>([]);
  const [setup, setSetup] = useState<Setup | null>(null);

  useEffect(() => {
    setOptIn(loadOptIn(productId));
  }, [productId]);

  useEffect(() => {
    if (!guided) return;
    let cancelled = false;
    fetch(`/api/ops/playbook?productId=${encodeURIComponent(productId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.setup) setSetup(data.setup);
      })
      .catch(() => {
        if (!cancelled) setSetup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [guided, productId, refreshKey]);

  function toggle(slot: MaterialSlot) {
    setOptIn((prev) => {
      const next = prev.includes(slot) ? prev.filter((item) => item !== slot) : [...prev, slot];
      saveOptIn(productId, next);
      return next;
    });
  }

  if (guided) {
    const stepLabel: Record<string, string> = {
      "ask-platforms": "先弄清你在哪些平台开店",
      "ask-playbook": "接下来一起定回复口吻",
      "ask-shop-id": setup?.focus
        ? `可以补一下${platformLabel(setup.focus)}门店编号，没有也没关系`
        : "可以补门店编号，没有也没关系",
      "ask-credentials": setup?.focus
        ? `${platformLabel(setup.focus)}如果要自动拉评，再补开放平台凭证`
        : "要自动拉评再补开放平台凭证",
      ready: "已经可以帮你起草回复",
    };
    const title =
      brief.kind === "cs-ops" ? "帮你把话术起草跑通" : "帮你把自动回复跑通";
    const hint =
      brief.kind === "cs-ops"
        ? "先定口吻和政策，再把顾客消息贴过来起草"
        : stepLabel[setup?.step || "ask-platforms"];
    return (
      <CompactStrip eyebrow="客服" title={title} hint={hint}>
        <p className="text-[12px] leading-5 text-zinc-400">{hint}</p>
        {setup?.platforms.length ? (
          <p className="mt-1 text-[12px] text-zinc-500">
            已选 {setup.platforms.map((id) => platformLabel(id)).join("、")}
            {setup.focus ? ` · 正在看 ${platformLabel(setup.focus)}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-[12px] text-zinc-500">在下面说一声你做哪些平台就行</p>
        )}
      </CompactStrip>
    );
  }

  if (vision) {
    return (
      <CompactStrip
        eyebrow="看图"
        title="把照片发到下面"
        hint="支持 jpg / png / webp / PDF，发图后说清要盯的点"
      >
        <p className="text-[12px] leading-5 text-zinc-400">
          支持 jpg / png / webp，可直接粘贴截图；也支持 PDF（自动转前几页）。发图后用一句话说清要盯的点。
        </p>
      </CompactStrip>
    );
  }

  return (
    <CompactStrip
      eyebrow="Checklist"
      title="资料清单"
      hint={`必需 ${required.length} 项 · 点开查看，发到下方对话框`}
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {required.map((item) => (
          <li
            key={item.slot}
            className="flex items-start gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2"
          >
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-[13px] text-zinc-100">
                {item.label}
                <span className="ml-2 text-[10px] text-emerald-400">必需</span>
              </p>
              {item.hint ? (
                <p className="mt-0.5 text-[11px] leading-5 text-zinc-500">{item.hint}</p>
              ) : null}
            </div>
          </li>
        ))}
        {optional.map((item) => {
          const checked = optIn.includes(item.slot);
          return (
            <li key={item.slot}>
              <button
                type="button"
                onClick={() => toggle(item.slot)}
                aria-pressed={checked}
                className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  checked
                    ? "border-white/20 bg-white/5"
                    : "border-white/10 bg-transparent hover:border-white/20"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    checked
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-zinc-500 bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-[13px] text-zinc-100">
                    {item.label}
                    <span className="ml-2 text-[10px] text-zinc-500">可选</span>
                  </p>
                  {item.hint ? (
                    <p className="mt-0.5 text-[11px] leading-5 text-zinc-500">{item.hint}</p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </CompactStrip>
  );
}
