"use client";

import { useState, useRef, useEffect, type ClipboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { Send, Trash2, Paperclip, X, Copy, Check, ChevronDown } from "lucide-react";
import type { ChatMessage, Product } from "@/types";
import { AddToCartButton } from "./AddToCartButton";
import { ImageLightbox } from "./ImageLightbox";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { useChatStore } from "@/store/chat";
import { useCatalog } from "@/hooks/useCatalog";
import { formatPrice } from "@/lib/format";
import { getServiceBrief, welcomeMessage as serviceWelcome } from "@/lib/service-briefs";
import { AVAILABLE_MODELS, MODEL_TIERS, type ModelTier } from "@/lib/available-models";
import { catalogRecommendForProduct } from "@/lib/model-catalog";
import { GUIDE_THINKING_STEP_KEYS } from "@/lib/guide-prompt";
import {
  GUIDE_CHIP_POOL,
  guideChipLabel,
  pickGuideChips as pickGuideServiceChips,
} from "@/lib/guide-chips";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  localizedDisplayName,
  localizedProductName,
} from "@/lib/i18n/localize-copy";
import {
  filesFromPasteEvent,
  prepareChatFiles,
  readClipboardImages,
  type PreparedChatFile,
} from "@/lib/prepare-chat-files";
import { prefersReducedMotion } from "@/lib/visual-capability";
import { playSendFeedback } from "@/lib/ui-sounds";
import { UserAvatar } from "@/components/UserAvatar";
import { resolveAvatarUrl } from "@/lib/avatars";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GUIDE_CHIP_COLORS = [
  {
    bg: "rgba(56,189,248,0.16)",
    border: "rgba(56,189,248,0.48)",
    text: "#7dd3fc",
  },
  {
    bg: "rgba(52,211,153,0.16)",
    border: "rgba(52,211,153,0.48)",
    text: "#6ee7b7",
  },
  {
    bg: "rgba(251,146,60,0.16)",
    border: "rgba(251,146,60,0.48)",
    text: "#fdba74",
  },
  {
    bg: "rgba(244,114,182,0.16)",
    border: "rgba(244,114,182,0.48)",
    text: "#f9a8d4",
  },
  {
    bg: "rgba(167,139,250,0.16)",
    border: "rgba(167,139,250,0.48)",
    text: "#c4b5fd",
  },
  {
    bg: "rgba(250,204,21,0.14)",
    border: "rgba(250,204,21,0.45)",
    text: "#fde68a",
  },
] as const;

type GuideChip = {
  id: string;
  label: string;
  price?: number;
  unit?: string;
  color: (typeof GUIDE_CHIP_COLORS)[number];
};

function withChipColors(
  picks: { id: string; label: string; price?: number; unit?: string }[],
  colorTick: number
): GuideChip[] {
  return picks.map((p, i) => ({
    ...p,
    color: GUIDE_CHIP_COLORS[(colorTick + i) % GUIDE_CHIP_COLORS.length],
  }));
}

function relabelGuideChips(chips: GuideChip[], locale: string): GuideChip[] {
  const map = new Map(
    GUIDE_CHIP_POOL.map((c) => [c.id, guideChipLabel(c, locale)])
  );
  return chips.map((chip) => ({
    ...chip,
    label: map.get(chip.id) || chip.label,
  }));
}


/** 模型偶发把内部自检写进回复时，从展示内容里拿掉 */
function scrubLeakedSelfCheck(text: string) {
  return text
    .replace(/^检查[：:][\s\S]*?(?=\n\n|$)/m, "")
    .replace(/(?:^|\n)[-*]\s*听起来像微信客服吗[？?][\s\S]*$/m, "")
    .replace(/\[Enfirst Bridge[^\]]*\][\s\S]*?(?=\n\n|$)/gi, "")
    .replace(/^Internally: straight-translate[\s\S]*?(?=\n\n|$)/gim, "")
    .replace(/^User text:\n/gim, "")
    .trim();
}

function modelStorageKey(productId?: string) {
  return productId ? `ai-supermarket:model:${productId}` : "";
}

function loadSelectedModel(productId?: string): string {
  if (!productId || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(modelStorageKey(productId)) || "";
  } catch {
    return "";
  }
}

function saveSelectedModel(productId: string, model: string) {
  try {
    if (model) window.localStorage.setItem(modelStorageKey(productId), model);
    else window.localStorage.removeItem(modelStorageKey(productId));
  } catch {
    /* ignore */
  }
}

const MODELS_BY_TIER: Record<ModelTier, typeof AVAILABLE_MODELS> = {
  cheap: [],
  standard: [],
  premium: [],
  reasoning: [],
};
for (const m of AVAILABLE_MODELS) MODELS_BY_TIER[m.tier].push(m);
const TIER_ORDER: ModelTier[] = ["cheap", "standard", "premium", "reasoning"];

function welcomeMessage(
  t: (key: MessageKey) => string,
  tf: (key: MessageKey, vars: Record<string, string | number>) => string,
  industry?: string | null,
  occupation?: string | null
): ChatMessage {
  const background = [industry, occupation].filter(Boolean).join(" · ");
  return {
    id: "welcome",
    role: "assistant",
    content: background
      ? tf("chat.welcomeBg", { bg: background })
      : t("chat.welcome"),
    followUps: [
      t("chat.fu.shopCs"),
      t("chat.fu.contract"),
      t("chat.fu.kb"),
      t("chat.fu.code"),
    ],
  };
}

function displayMessages(
  messages: ChatMessage[],
  t: (key: MessageKey) => string,
  tf: (key: MessageKey, vars: Record<string, string | number>) => string,
  industry?: string | null,
  occupation?: string | null
): ChatMessage[] {
  return messages.length === 0
    ? [welcomeMessage(t, tf, industry, occupation)]
    : messages;
}

interface ChatAssistantProps {
  variant?: "hero" | "page";
  contextProductId?: string;
  tryProductId?: string;
  workspaceMode?: boolean;
  compact?: boolean;
  fill?: boolean;
  /** Guide-page message layout with alternating avatars and chat bubbles. */
  wechatStyle?: boolean;
  workspacePanel?: ReactNode;
  onLanded?: () => void;
  /** 外部工具（如转写）把文字填进输入框 */
  injectText?: string;
  onInjectConsumed?: () => void;
}

export function ChatAssistant({
  variant = "hero",
  contextProductId,
  tryProductId,
  workspaceMode = false,
  compact = false,
  fill = false,
  wechatStyle = false,
  workspacePanel,
  onLanded,
  injectText,
  onInjectConsumed,
}: ChatAssistantProps) {
  const { getById, products: catalogProducts } = useCatalog();
  const tryProduct = tryProductId ? getById(tryProductId) : undefined;
  const isRuntime = Boolean(tryProductId);
  const recommend = tryProduct ? catalogRecommendForProduct(tryProduct) : null;
  const { user, loading: authLoading } = useAuth();
  const { t, tf, locale } = useLocale();
  const setLocalMessages = useChatStore((s) => s.setMessages);
  const clearLocalMessages = useChatStore((s) => s.clearMessages);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [memoryReady, setMemoryReady] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [attachments, setAttachments] = useState<PreparedChatFile[]>([]);
  const [attachError, setAttachError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const [routeLabel, setRouteLabel] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [agentFollowUps, setAgentFollowUps] = useState<string[]>([]);
  const [thinkingHadFiles, setThinkingHadFiles] = useState(false);
  const [guideChips, setGuideChips] = useState<GuideChip[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextSent = useRef(false);
  const lastImagePasteAt = useRef(0);

  useEffect(() => {
    if (isRuntime) {
      setHydrated(true);
      setMemoryReady(false);
      setMessages([]);
      setPersisted(false);
      setSelectedModel(loadSelectedModel(tryProductId));
      return;
    }
    const persistApi = useChatStore.persist;
    if (!persistApi) {
      setHydrated(true);
      return;
    }
    const unsub = persistApi.onFinishHydration(() => setHydrated(true));
    void persistApi.rehydrate();
    if (persistApi.hasHydrated()) setHydrated(true);
    return unsub;
  }, [isRuntime, tryProductId]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const reduce = prefersReducedMotion();
    el.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (!injectText?.trim()) return;
    setInput((prev) => {
      const next = prev.trim()
        ? `${prev.trim()}\n\n${injectText.trim()}`
        : injectText.trim();
      return next;
    });
    onInjectConsumed?.();
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [injectText, onInjectConsumed]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const cap = workspaceMode
      ? Math.min(typeof window === "undefined" ? 360 : window.innerHeight * 0.42, 420)
      : 160;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, workspaceMode ? 120 : 40), cap)}px`;
  }, [input, workspaceMode]);

  useEffect(() => {
    if (authLoading || !hydrated) return;
    let cancelled = false;

    async function restoreMemory() {
      if (isRuntime) {
        if (!user || !tryProductId) {
          if (!cancelled) {
            setPersisted(false);
            setMemoryReady(true);
          }
          return;
        }
        try {
          const res = await fetch(
            `/api/chat?productId=${encodeURIComponent(tryProductId)}`
          );
          const data = await res.json();
          if (!cancelled) {
            setMessages(data.messages ?? []);
            setPersisted(Boolean(data.persisted));
            setMemoryReady(true);
          }
        } catch {
          if (!cancelled) {
            setPersisted(false);
            setMemoryReady(true);
          }
        }
        return;
      }

      const guestMessages = useChatStore.getState().messages;

      if (user) {
        try {
          const res = await fetch("/api/chat");
          const data = await res.json();
          let next: ChatMessage[] = data.messages ?? [];

          if (next.length === 0 && guestMessages.length > 0) {
            const syncRes = await fetch("/api/chat", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messages: guestMessages }),
            });
            const synced = await syncRes.json();
            next = synced.messages ?? guestMessages;
          }

          if (!cancelled) {
            setMessages(next);
            setPersisted(true);
          }
        } catch {
          if (!cancelled) {
            setMessages(guestMessages);
            setPersisted(false);
          }
        }
      } else if (!cancelled) {
        setMessages(guestMessages);
        setPersisted(false);
      }

      if (!cancelled) setMemoryReady(true);
    }

    restoreMemory();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, hydrated, isRuntime, tryProductId]);

  useEffect(() => {
    if (!workspaceMode || !tryProductId || !user) return;
    const kind = getServiceBrief(tryProductId).kind;
    if (kind !== "review-ops" && kind !== "cs-ops") return;
    let cancelled = false;
    fetch(`/api/ops/playbook?productId=${encodeURIComponent(tryProductId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.setup?.followUps)) {
          setAgentFollowUps(data.setup.followUps);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [workspaceMode, tryProductId, user, messages.length]);

  const persistLocal = (next: ChatMessage[]) => {
    setMessages(next);
    if (!user) setLocalMessages(next);
  };

  const addFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return;
    setAttachError("");
    try {
      const result = await prepareChatFiles(incoming, attachments.length);
      if (result.error) {
        setAttachError(result.error);
        return;
      }
      let nextFiles = result.files;
      // 服务端抽 PDF 全文，作为文本附件一并送给模型
      for (const file of incoming) {
        if (!(file.type === "application/pdf" || /\.pdf$/i.test(file.name))) continue;
        if (!tryProductId || !workspaceMode) continue;
        try {
          const form = new FormData();
          form.append("productId", tryProductId);
          form.append("file", file);
          const res = await fetch("/api/runtime/extract", { method: "POST", body: form });
          const data = await res.json().catch(() => ({}));
          if (res.ok && typeof data.text === "string" && data.text.trim()) {
            nextFiles = [
              ...nextFiles,
              {
                id: `${Date.now()}-pdf-text-${Math.random().toString(16).slice(2)}`,
                name: `${file.name}.txt`,
                mime: "text/plain",
                kind: "text" as const,
                text: String(data.text).slice(0, 60_000),
              },
            ];
          }
        } catch {
          /* 抽字失败仍可用渲出的页图 */
        }
      }
      setAttachments((prev) => [...prev, ...nextFiles].slice(0, 6));
      if (result.notice) setAttachError(result.notice);
    } catch {
      setAttachError(t("chat.fileFail"));
    }
  };

  const ingestPastedFiles = async (files: File[]) => {
    if (files.length === 0) return;
    lastImagePasteAt.current = Date.now();
    await addFiles(files);
  };

  const handlePaste = (event: ClipboardEvent) => {
    const data = event.clipboardData;
    const hasImage =
      Array.from(data?.items || []).some(
        (item) => item.kind === "file" || item.type.startsWith("image/")
      ) ||
      Array.from(data?.files || []).some((file) => file.type.startsWith("image/")) ||
      /<img/i.test(data?.getData("text/html") || "");
    if (!hasImage) return;
    event.preventDefault();
    void filesFromPasteEvent(event.nativeEvent).then((files) => ingestPastedFiles(files));
  };

  const copyReply = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
    } catch {
      setAttachError(t("chat.copyFail"));
    }
  };

  const sendMessage = async (text: string, files: PreparedChatFile[] = attachments) => {
    if (loading) return;
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    playSendFeedback();

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed || (files.length ? tf("chat.sentFiles", { n: files.length }) : ""),
      attachments: files.map((file) => ({
        name: file.name,
        mime: file.mime,
        kind: file.kind,
        previewUrl: file.dataUrl,
      })),
    };

    const nextMessages = [...messages, userMsg];
    if (isRuntime) {
      setMessages(nextMessages);
    } else {
      persistLocal(nextMessages);
    }
    setInput("");
    setAttachments([]);
    setAttachError("");
    setThinkingHadFiles(files.length > 0);
    setLoading(true);

    try {
      const history = nextMessages
        .filter((m) => m.id !== "welcome")
        .slice(0, -1)
        .map((m) => ({
          role: m.role,
          content: m.content,
          productIds: m.recommendedProducts?.map((p) => p.id) ?? [],
        }));

      if (isRuntime) {
        const res = await fetch("/api/runtime/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: tryProductId,
            message: trimmed,
            history,
            model: selectedModel || undefined,
            locale,
            attachments: files.map((file) => ({
              name: file.name,
              mime: file.mime,
              kind: file.kind,
              dataUrl: file.dataUrl,
              text: file.text,
            })),
          }),
        });
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || contentType.includes("application/json") || !res.body) {
          const data = await res.json().catch(() => ({}));
          const rawReply =
            res.status === 401
              ? workspaceMode
                ? t("chat.needLoginUse")
                : t("chat.needLoginTrial")
              : res.status === 429
                ? data.error || (workspaceMode ? t("chat.busyUse") : t("chat.busyTrial"))
                : data.reply || data.error || t("chat.missed");
          const reply = scrubLeakedSelfCheck(String(rawReply));
          if (data.clearManualModel && tryProductId) {
            setSelectedModel("");
            saveSelectedModel(tryProductId, "");
          }
          if (res.ok && (data.route || data.model)) {
            setRouteLabel(data.route || data.model);
          }
          setMessages([
            ...nextMessages,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant" as const,
              content: reply,
              followUps: Array.isArray(data.followUps) ? data.followUps : undefined,
            },
          ]);
          if (res.ok) setPersisted(Boolean(data.persisted ?? user));
          if (res.ok && Array.isArray(data.followUps)) setAgentFollowUps(data.followUps);
          if (res.ok && (data.route === t("chat.landingRoute") || data.route === t("chat.autoReply") || data.route === "落地接入" || data.route === "自动回复助手")) {
            onLanded?.();
          } else if (res.ok && files.length > 0) {
            onLanded?.();
          }
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        const assistantId = (Date.now() + 1).toString();
        const updateAssistant = (content: string) => {
          const cleaned = scrubLeakedSelfCheck(content.replace(/\n\n__META__[\s\S]*$/, "").trim());
          setMessages((prev) => {
            const next = [...prev];
            const idx = next.findIndex((m) => m.id === assistantId);
            const msg: ChatMessage = {
              id: assistantId,
              role: "assistant",
              content: cleaned,
            };
            if (idx >= 0) next[idx] = msg;
            else next.push(msg);
            return next;
          });
        };
        setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "" }]);

        let sawTokens = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          updateAssistant(full);
          if (!sawTokens && full.replace(/\n\n__META__[\s\S]*$/, "").trim()) {
            sawTokens = true;
            setLoading(false);
          }
        }

        let meta: {
          model?: string;
          route?: string;
          followUps?: string[];
          persisted?: boolean;
          clearManualModel?: boolean;
        } = {};
        const metaMatch = full.match(/\n\n__META__(.*)$/);
        if (metaMatch?.[1]) {
          try {
            meta = JSON.parse(metaMatch[1]) as typeof meta;
          } catch {
            meta = {};
          }
        }
        const reply = scrubLeakedSelfCheck(full.replace(/\n\n__META__[\s\S]*$/, "").trim());
        if (meta.clearManualModel && tryProductId) {
          setSelectedModel("");
          saveSelectedModel(tryProductId, "");
        }
        if (meta.route || meta.model) {
          setRouteLabel(meta.route || meta.model || "");
        }
        setMessages([
          ...nextMessages,
          {
            id: assistantId,
            role: "assistant" as const,
            content: reply || t("chat.missed"),
            followUps: Array.isArray(meta.followUps) ? meta.followUps : undefined,
          },
        ]);
        setPersisted(Boolean(meta.persisted ?? user));
        if (Array.isArray(meta.followUps)) setAgentFollowUps(meta.followUps);
        if (meta.route === "落地接入" || meta.route === "自动回复助手" || meta.route === t("chat.landingRoute") || meta.route === t("chat.autoReply") || files.length > 0) {
          onLanded?.();
        }
        return;
      }

      // Guide chat — stream from /api/chat/stream
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: [
            trimmed,
            ...files
              .filter((file) => file.kind === "text" && file.text)
              .map((file) => `${tf("chat.fileTag", { name: file.name })}\n${file.text}`),
          ]
            .filter(Boolean)
            .join("\n\n") || trimmed,
          history,
          contextProductId,
          locale,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(
          res.status === 429
            ? errText || t("chat.rateLimit")
            : errText || "stream error"
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      const assistantId = (Date.now() + 1).toString();

      // Add empty assistant message and update it as tokens arrive
      const updateAssistant = (content: string) => {
        const cleaned = scrubLeakedSelfCheck(
          content
            .replace(/\nRECOMMEND:[\s\S]*$/, "")
            .replace(/\nFOLLOWUPS:[\s\S]*$/, "")
            .trim()
        );
        setMessages((prev) => {
          const next = [...prev];
          const idx = next.findIndex((m) => m.id === assistantId);
          const msg: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: cleaned,
          };
          if (idx >= 0) next[idx] = msg;
          else next.push(msg);
          return next;
        });
      };

      // Add initial empty bubble
      persistLocal([...nextMessages, { id: assistantId, role: "assistant", content: "" }]);

      let sawTokens = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        updateAssistant(full);
        if (!sawTokens && full.trim()) {
          sawTokens = true;
          setLoading(false);
        }
      }

      // Parse RECOMMEND and FOLLOWUPS from the full text
      const recommendMatch = full.match(/RECOMMEND:\s*(.*)/);
      const followMatch = full.match(/FOLLOWUPS:\s*(.*)/);
      const ids =
        recommendMatch?.[1]
          ?.split(",")
          .map((id: string) => id.trim())
          .filter(Boolean) ?? [];
      const followUps =
        followMatch?.[1]
          ?.split("|")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 4) ?? [];

      const { products: allProducts } = await import("@/data/products");
      const recommendedProducts = ids
        .map((id: string) => allProducts.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));

      const cleanedContent = scrubLeakedSelfCheck(
        full
          .replace(/\nRECOMMEND:[\s\S]*$/, "")
          .replace(/\nFOLLOWUPS:[\s\S]*$/, "")
          .trim()
      );

      // 流式结束后若没有正文：降级走非流式导购，避免「思考完没回答」
      if (!cleanedContent) {
        const fallback = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history,
            contextProductId,
            locale,
          }),
        });
        const data = await fallback.json().catch(() => ({}));
        const reply =
          typeof data.reply === "string" && data.reply.trim()
            ? scrubLeakedSelfCheck(data.reply)
            : t("chat.missedBusy");
        persistLocal([
          ...nextMessages,
          {
            id: assistantId,
            role: "assistant" as const,
            content: reply,
            recommendedProducts: Array.isArray(data.recommendedProducts)
              ? data.recommendedProducts
              : undefined,
            followUps: Array.isArray(data.followUps) ? data.followUps : undefined,
          },
        ]);
        setPersisted(Boolean(user));
        return;
      }

      persistLocal([
        ...nextMessages,
        {
          id: assistantId,
          role: "assistant" as const,
          content: cleanedContent,
          recommendedProducts: recommendedProducts.length
            ? recommendedProducts
            : undefined,
          followUps: followUps.length ? followUps : undefined,
        },
      ]);
      setPersisted(Boolean(user));
      return;
    } catch (err) {
      const content =
        err instanceof Error && err.message && err.message !== "stream error"
          ? err.message
          : t("chat.missed");
      const failed = [
        ...nextMessages,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content,
        },
      ];
      if (isRuntime) setMessages(failed);
      else persistLocal(failed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRuntime || !memoryReady || contextSent.current || !contextProductId) return;
    if (messages.length > 0) return;
    contextSent.current = true;
    sendMessage(t("chat.askFitProduct"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoryReady, contextProductId, messages.length]);

  const clearMemory = async () => {
    setAttachments([]);
    setAttachError("");
    if (isRuntime) {
      setMessages([]);
      if (user && tryProductId) {
        await fetch(`/api/chat?productId=${encodeURIComponent(tryProductId)}`, {
          method: "DELETE",
        });
      }
      return;
    }
    persistLocal([]);
    clearLocalMessages();
    if (user) await fetch("/api/chat", { method: "DELETE" });
  };

  const fullPage = fill || variant === "page";
  const edgeChat = wechatStyle && fullPage;
  const rotateGuideTips = wechatStyle && !isRuntime;

  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => {
    if (!rotateGuideTips) {
      setGuideChips([]);
      return;
    }
    let tick = 0;
    const refresh = () => {
      setGuideChips(
        withChipColors(
          pickGuideServiceChips(catalogProducts, localeRef.current, tick),
          tick
        )
      );
      tick += 1;
    };
    refresh();
    const timer = window.setInterval(refresh, 5200);
    return () => window.clearInterval(timer);
  }, [rotateGuideTips, catalogProducts]);

  // Language switch: same 4 services, short labels refresh immediately.
  useEffect(() => {
    if (!rotateGuideTips) return;
    setGuideChips((prev) => (prev.length ? relabelGuideChips(prev, locale) : prev));
  }, [locale, rotateGuideTips]);

  const visible = isRuntime
    ? messages.length === 0
      ? [
          {
            id: "welcome",
            role: "assistant" as const,
            content: workspaceMode
              ? serviceWelcome(tryProduct?.name || "这项服务", getServiceBrief(tryProductId || ""))
              : `这是「${tryProduct?.name}」接到的模型试用，不是导购。可以直接打字，也可以上传或粘贴图片。`,
            followUps: workspaceMode
              ? getServiceBrief(tryProductId || "").followUps
              : ["写一段客服回复", "帮我审一段代码", "把这段话改得更清楚"],
          },
        ]
      : messages
    : displayMessages(messages, t, tf, user?.industry, user?.occupation);
  const lastFollowUps =
    [...visible].reverse().find((m) => m.role === "assistant" && m.followUps?.length)
      ?.followUps ??
    (workspaceMode ? agentFollowUps : []);
  const guideAvatarUrl = "/logo.png";
  const guideDisplayName = t("chat.titleGuide");
  const userAvatarUrl = user
    ? resolveAvatarUrl(user.avatarUrl, user.id)
    : "/avatars/presets/avatar-01.svg";
  const userDisplayName =
    localizedDisplayName(user?.name, locale)?.trim() ||
    user?.email?.split("@")[0] ||
    t("common.account");

  const heightClass = fill
    ? "h-full min-h-0"
    : compact
      ? "h-[420px]"
      : variant === "page"
        ? "h-[calc(100dvh-8.5rem)]"
        : "h-[560px] sm:h-[620px]";

  const deleteChatButton =
    messages.length > 0 ? (
      <TooltipProvider delayDuration={700}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={clearMemory}
              className={
                edgeChat
                  ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sky-400 transition-colors hover:bg-sky-400/10 hover:text-sky-300"
                  : "rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              }
              aria-label={t("chat.deleteConversationAria")}
            >
              <Trash2 className={edgeChat ? "h-6 w-6" : "h-4 w-4"} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            {t("chat.deleteConversation")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : null;

  return (
    <div
      className={`relative flex ${heightClass} flex-col overflow-hidden ${
        fullPage
          ? "rounded-none border-0 bg-transparent"
          : "rounded-2xl border border-white/10 bg-[#12151c]"
      }`}
    >
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void addFiles(Array.from(e.dataTransfer.files));
      }}
      onPaste={handlePaste}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-[#7c5cff] bg-[#0b0d10]/85 text-sm text-[#c4b5fd]">
          {t("chat.dropFiles")}
        </div>
      )}
      {!(edgeChat && !isRuntime) ? (
      <div
        className={`fx-parallax-layer flex shrink-0 items-center justify-between ${
          fullPage
            ? "mx-auto w-full max-w-5xl px-1 py-3 sm:px-0"
            : "border-b border-white/5 px-5 py-4"
        }`}
        style={{
          transform:
            "translate3d(var(--fx-far-x, 0px), var(--fx-far-y, 0px), 0)",
        }}
      >
        <div className="min-w-0">
          {edgeChat ? null : (
            <p className={fullPage ? "text-sm font-medium text-zinc-200" : "text-lg text-zinc-100"}>
              {isRuntime
                ? workspaceMode
                  ? getServiceBrief(tryProductId || "").kind === "review-ops" ||
                    getServiceBrief(tryProductId || "").kind === "cs-ops"
                    ? t("chat.autoReply")
                    : t("chat.titleWorkspace")
                  : t("chat.modelTrial")
                : t("chat.titleGuide")}
            </p>
          )}
          {edgeChat ? null : !fullPage ? (
            <p className="text-xs text-zinc-500">
              {isRuntime
                ? [
                    selectedModel
                      ? tf("chat.handPick", {
                          label:
                            AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.label ||
                            selectedModel,
                        })
                      : routeLabel || recommend?.autoHint || tryProduct?.runtime?.model,
                    recommend && !selectedModel && recommend.fallbackLabel
                      ? tf("chat.fallback", { label: recommend.fallbackLabel })
                      : "",
                    persisted
                      ? t("chat.rememberService")
                      : user
                        ? t("chat.rememberServiceGuest")
                        : "",
                    t("chat.uploadHint"),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : persisted
                  ? t("chat.remembered")
                  : t("chat.rememberGuest")}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500">{t("chat.sayWhat")}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRuntime && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelOpen((v) => !v)}
                className="flex max-w-[180px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 hover:border-white/20"
                title={t("chat.modelTitle")}
              >
                <span className="truncate">
                  {selectedModel
                    ? AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.label || selectedModel
                    : recommend?.autoHint || t("chat.modelAuto")}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              </button>
              {modelOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setModelOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-30 mt-1 max-h-80 w-72 overflow-y-auto rounded-xl border border-white/10 bg-[#12151c] p-2 shadow-2xl">
                    <p className="px-3 py-1.5 text-[10px] leading-4 text-zinc-500">
                      {t("chat.modelAutoHint")}
                      {recommend?.primaryWhy ? ` ${recommend.primaryWhy}` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (tryProductId) saveSelectedModel(tryProductId, "");
                        setSelectedModel("");
                        setModelOpen(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5 ${
                        selectedModel === "" ? "bg-white/10 text-zinc-100" : ""
                      }`}
                    >
                      {recommend?.autoHint || t("chat.modelAuto")}
                      {recommend?.fallbackLabel ? (
                        <span className="mt-0.5 block text-[10px] text-zinc-500">
                          {tf("chat.fallback", { label: recommend.fallbackLabel })}
                        </span>
                      ) : null}
                    </button>
                    <div className="my-1 border-t border-white/5" />
                    <p className="px-3 py-1 text-[10px] text-zinc-500">{t("chat.modelManual")}</p>
                    {TIER_ORDER.map((tier) => {
                      const list = MODELS_BY_TIER[tier];
                      if (list.length === 0) return null;
                      return (
                        <div key={tier} className="mb-1">
                          <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
                            {MODEL_TIERS[tier].label} · {MODEL_TIERS[tier].hint}
                          </p>
                          {list.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                if (tryProductId) saveSelectedModel(tryProductId, m.id);
                                setSelectedModel(m.id);
                                setModelOpen(false);
                              }}
                              className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-white/5 ${
                                selectedModel === m.id ? "bg-white/10 text-zinc-100" : ""
                              }`}
                              title={`${m.family} · ${m.label}${m.vision ? " · 支持看图" : ""}`}
                            >
                              {m.label}
                              {m.vision ? <span className="ml-1 text-[10px] text-zinc-500">{t("chat.visionTag")}</span> : null}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          {!edgeChat && deleteChatButton}
        </div>
      </div>
      ) : null}

      {workspacePanel}

      <div
        className={`fx-scroll-panel min-h-0 flex-1 overflow-y-auto ${
          edgeChat ? "px-0" : fullPage ? "px-1 sm:px-0" : "px-5 py-5"
        }`}
      >
        <div
          className={`fx-parallax-layer ${wechatStyle ? "space-y-5" : "space-y-6"} ${
            edgeChat
              ? "w-full py-4 sm:py-6"
              : fullPage
                ? "mx-auto max-w-5xl py-4 sm:py-6"
                : ""
          }`}
          style={{
            transform:
              "translate3d(var(--fx-near-x, 0px), var(--fx-near-y, 0px), 0)",
          }}
        >
        {!memoryReady ? (
          <p className="py-16 text-center text-sm text-zinc-500">{t("chat.recalling")}</p>
        ) : (
          visible.map((msg, idx) => (
            <div
              key={msg.id}
              className="fx-msg-in"
              style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
            >
              <div
                className={`flex w-full items-start ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } ${wechatStyle ? "gap-2.5 sm:gap-3" : ""}`}
              >
                {wechatStyle && msg.role === "assistant" ? (
                  <div className="flex w-12 shrink-0 flex-col items-center gap-1">
                    <span className="max-w-full truncate text-center text-[11px] leading-none text-zinc-500">
                      {guideDisplayName}
                    </span>
                    <UserAvatar
                      src={guideAvatarUrl}
                      alt={guideDisplayName}
                      size={40}
                      className="bg-[#171a21]"
                    />
                  </div>
                ) : null}
                <div
                  className={
                    wechatStyle
                      ? msg.role === "assistant"
                        ? "min-w-0 max-w-[min(88%,56rem)] flex-1"
                        : "min-w-0 max-w-[min(72%,36rem)]"
                      : fullPage
                        ? "max-w-[min(100%,40rem)]"
                        : "max-w-[min(92%,48rem)]"
                  }
                >
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={`mb-2 flex flex-wrap gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                      {msg.attachments.map((file) =>
                        file.kind === "image" && file.previewUrl ? (
                          <button
                            key={file.name + file.previewUrl.slice(-12)}
                            type="button"
                            onClick={() =>
                              setPreview({ src: file.previewUrl!, alt: file.name })
                            }
                            className="block overflow-hidden rounded-xl"
                            aria-label={`放大查看 ${file.name}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={file.previewUrl}
                              alt={file.name}
                              className="h-24 w-24 cursor-zoom-in object-cover"
                            />
                          </button>
                        ) : (
                          <span
                            key={file.name}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400"
                          >
                            {file.name}
                          </span>
                        )
                      )}
                    </div>
                  )}
                  <div className="group relative">
                    <div
                      className={`select-text whitespace-pre-wrap text-[15px] leading-7 ${
                        msg.role === "user"
                          ? wechatStyle
                            ? "rounded-2xl rounded-tr-md bg-[#7c5cff] px-4 py-2.5 text-white shadow-[0_8px_24px_rgba(124,92,255,0.16)]"
                            : "rounded-2xl bg-[#7c5cff] px-4 py-3 text-white"
                          : wechatStyle
                            ? "w-full rounded-2xl rounded-tl-md border border-white/[0.06] bg-[#20242c] px-4 py-2.5 text-zinc-100 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                          : fullPage
                            ? "px-1 py-1 text-zinc-200"
                            : "rounded-2xl bg-white/5 px-4 py-3 text-zinc-200"
                      }`}
                    >
                      {msg.content.replace(/\*\*(.*?)\*\*/g, "$1")}
                    </div>
                    {msg.role === "assistant" && msg.id !== "welcome" && msg.content && (
                      <button
                        type="button"
                        onClick={() => copyReply(msg.id, msg.content.replace(/\*\*(.*?)\*\*/g, "$1"))}
                        className="absolute -right-2 -top-2 rounded-md border border-white/10 bg-[#12151c] p-1 text-zinc-500 opacity-0 hover:text-zinc-200 group-hover:opacity-100"
                        title={t("chat.copy")}
                        aria-label={t("chat.copyAria")}
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {wechatStyle && msg.role === "user" ? (
                  <div className="flex w-12 shrink-0 flex-col items-center gap-1">
                    <span className="max-w-full truncate text-center text-[11px] leading-none text-zinc-500">
                      {userDisplayName}
                    </span>
                    <UserAvatar
                      src={userAvatarUrl}
                      alt={userDisplayName}
                      size={40}
                      className="bg-[#171a21]"
                    />
                  </div>
                ) : null}
              </div>

              {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                <div
                  className={`mt-3 space-y-2 ${
                    edgeChat
                      ? "ml-14 max-w-[min(88%,56rem)]"
                      : fullPage
                        ? "max-w-5xl"
                        : ""
                  } ${!edgeChat && wechatStyle ? "ml-[50px] sm:ml-[52px] max-w-[min(76%,40rem)]" : ""}`}
                >
                  {msg.recommendedProducts.map((p: Product) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#12151c] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/tools/${p.id}`}
                          className="block truncate text-sm font-medium text-zinc-100 hover:underline"
                        >
                          {localizedProductName(p, locale)}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          {formatPrice(p.price)} /{" "}
                          {p.unit === "每月" ? t("common.perMonth") : p.unit}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/tools/${p.id}`}
                          className="ui-press rounded-lg border border-white/12 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/20 hover:text-white"
                        >
                          {t("chat.viewDetails")}
                        </Link>
                        <AddToCartButton product={p} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {wechatStyle && loading ? (
          <div className="flex w-full items-start justify-start gap-2.5 sm:gap-3">
            <div className="flex w-12 shrink-0 flex-col items-center gap-1">
              <span className="max-w-full truncate text-center text-[11px] leading-none text-zinc-500">
                {guideDisplayName}
              </span>
              <UserAvatar
                src={guideAvatarUrl}
                alt={guideDisplayName}
                size={40}
                className="bg-[#171a21]"
              />
            </div>
            <div className="min-w-0 max-w-[min(88%,56rem)] flex-1">
              <ThinkingIndicator
                active={loading}
                modelLabel={
                  selectedModel
                    ? AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.label ||
                      selectedModel
                    : routeLabel ||
                      recommend?.autoHint ||
                      tryProduct?.runtime?.model ||
                      undefined
                }
                hasFiles={thinkingHadFiles}
                steps={
                  isRuntime
                    ? undefined
                    : GUIDE_THINKING_STEP_KEYS.map((key) => t(key))
                }
              />
            </div>
          </div>
        ) : (
          <ThinkingIndicator
            active={loading}
            modelLabel={
              selectedModel
                ? AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.label ||
                  selectedModel
                : routeLabel ||
                  recommend?.autoHint ||
                  tryProduct?.runtime?.model ||
                  undefined
            }
            hasFiles={thinkingHadFiles}
            steps={
              isRuntime
                ? undefined
                : GUIDE_THINKING_STEP_KEYS.map((key) => t(key))
            }
          />
        )}
        <div ref={bottomRef} />
        </div>
      </div>

      {memoryReady &&
        (rotateGuideTips
          ? guideChips.length > 0
          : !loading && lastFollowUps.length > 0) && (
        <div
          className={`flex shrink-0 flex-wrap gap-2 pb-2 ${
            fullPage ? "mx-auto w-full max-w-5xl px-1 sm:px-0" : "px-5"
          }`}
        >
          {rotateGuideTips
            ? guideChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() =>
                    sendMessage(tf("chat.askAboutService", { name: chip.label }))
                  }
                  className="min-w-[6.75rem] rounded-xl px-3.5 py-2 text-left transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: chip.color.bg,
                    border: `1px solid ${chip.color.border}`,
                    color: chip.color.text,
                  }}
                >
                  <span className="block text-xs font-medium leading-tight">
                    {chip.label}
                  </span>
                  {typeof chip.price === "number" ? (
                    <span className="mt-0.5 block text-[10px] opacity-75">
                      {formatPrice(chip.price)}
                      {chip.unit === "每月" ? ` / ${t("common.perMonth")}` : ""}
                    </span>
                  ) : null}
                </button>
              ))
            : lastFollowUps.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-left text-xs font-medium text-zinc-300 hover:border-white/20 hover:text-zinc-100"
                >
                  {prompt}
                </button>
              ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input, attachments);
        }}
        className={`fx-parallax-layer shrink-0 ${
          fullPage
            ? "mx-auto w-full max-w-5xl px-1 pb-2 sm:px-0 sm:pb-3"
            : workspaceMode
              ? "border-t border-white/5 p-4 sm:p-5"
              : "border-t border-white/5 p-4"
        }`}
        style={{
          transform:
            "translate3d(var(--fx-near-x, 0px), var(--fx-near-y, 0px), 0)",
        }}
        onPaste={handlePaste}
      >
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10"
              >
                {file.kind === "image" && file.dataUrl ? (
                  <button
                    type="button"
                    className="h-full w-full"
                    onClick={() => setPreview({ src: file.dataUrl!, alt: file.name })}
                    aria-label={`放大查看 ${file.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.dataUrl}
                      alt={file.name}
                      className="h-full w-full cursor-zoom-in object-cover"
                    />
                  </button>
                ) : (
                  <p className="flex h-full items-center justify-center px-1 text-center text-[10px] text-zinc-400">
                    {file.name}
                  </p>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setAttachments((prev) => prev.filter((item) => item.id !== file.id));
                  }}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"
                  aria-label={`移除 ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {attachError && <p className="mb-2 text-xs text-red-400">{attachError}</p>}
        {fullPage ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#12151c] p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-within:border-[#7c5cff]/50">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input, attachments);
                    return;
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
                    window.setTimeout(() => {
                      if (Date.now() - lastImagePasteAt.current < 500) return;
                      void readClipboardImages().then((files) => ingestPastedFiles(files));
                    }, 80);
                  }
                }}
                onPaste={handlePaste}
                rows={2}
                placeholder={t("chat.placeholder")}
                className="max-h-40 min-h-[3rem] w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-6 text-zinc-100 outline-none placeholder:text-zinc-500"
              />
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.txt,.md,.csv,.json,text/plain"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void addFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  title={t("chat.uploadTitle")}
                  aria-label={t("chat.uploadAria")}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && attachments.length === 0)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7c5cff] px-4 text-sm font-medium text-white hover:bg-[#8b6dff] disabled:opacity-40"
                >
                  {t("chat.send")}
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {edgeChat ? deleteChatButton : null}
          </div>
        ) : (
        <div className={workspaceMode ? "flex flex-col gap-3" : "flex items-end gap-2"}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.txt,.md,.csv,.json,text/plain"
            multiple
            className="hidden"
            onChange={(e) => {
              void addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          {!workspaceMode ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              title={t("chat.uploadTitle")}
              aria-label={t("chat.uploadAria")}
            >
              <Paperclip className="h-4 w-4" />
            </button>
          ) : null}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input, attachments);
                return;
              }
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
                window.setTimeout(() => {
                  if (Date.now() - lastImagePasteAt.current < 500) return;
                  void readClipboardImages().then((files) => ingestPastedFiles(files));
                }, 80);
              }
            }}
            onPaste={handlePaste}
            rows={workspaceMode ? 5 : 2}
            placeholder={
              workspaceMode
                ? t("chat.workspacePlaceholder")
                : isRuntime
                  ? t("chat.pasteHint")
                  : t("chat.placeholderShort")
            }
            className={
              workspaceMode
                ? "max-h-[42vh] min-h-[7.5rem] w-full resize-y rounded-xl border border-white/10 bg-[#0b0d10] px-4 py-3 text-[15px] leading-7 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-[#7c5cff]"
                : "max-h-40 min-h-10 flex-1 resize-none rounded-lg border border-white/10 bg-[#0b0d10] px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-[#7c5cff]"
            }
          />
          {workspaceMode ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                title={t("chat.uploadTitle")}
              >
                <Paperclip className="h-4 w-4" />
                {t("chat.attach")}
              </button>
              <button
                type="submit"
                disabled={loading || (!input.trim() && attachments.length === 0)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#7c5cff] px-5 text-sm font-medium text-white hover:bg-[#8b6dff] disabled:opacity-40"
              >
                {t("chat.send")}
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading || (!input.trim() && attachments.length === 0)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7c5cff] text-white hover:bg-[#8b6dff] disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        )}
      </form>
      {preview && (
        <ImageLightbox
          src={preview.src}
          alt={preview.alt}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
    </div>
  );
}
