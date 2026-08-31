"use client";

import { useCallback, useEffect, useState } from "react";

type Chunk = {
  id: string;
  title: string;
  source: string;
  text: string;
  updatedAt: string;
};

const KNOWLEDGE_PRODUCTS = new Set([
  "pinecone",
  "weaviate-cloud",
  "langchain-pro",
  "cursor-pro",
  "hr-qa-bot",
]);

export function isKnowledgeProduct(productId: string) {
  return KNOWLEDGE_PRODUCTS.has(productId);
}

export function WorkspaceKnowledge({
  productId,
  onNotice,
}: {
  productId: string;
  onNotice?: (msg: string) => void;
}) {
  const [items, setItems] = useState<Chunk[]>([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/runtime/knowledge?productId=${encodeURIComponent(productId)}`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      onNotice?.(data.error || "加载知识库失败");
      return;
    }
    setItems(Array.isArray(data.items) ? data.items : []);
  }, [onNotice, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addChunk() {
    const body = text.trim();
    if (!body) {
      onNotice?.("先粘贴制度 / FAQ / 文档片段。");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/runtime/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          title: title.trim() || "未命名资料",
          text: body,
          source: "workbench",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotice?.(data.error || "写入失败");
        return;
      }
      setText("");
      setTitle("");
      onNotice?.(
        "已写入本站向量库（嵌入+关键词检索）。左侧提问会自动引用相关片段。"
      );
      await load();
    } catch {
      onNotice?.("写入请求失败");
    } finally {
      setBusy(false);
    }
  }

  async function removeChunk(id: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/runtime/knowledge?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotice?.(data.error || "删除失败");
        return;
      }
      await load();
    } catch {
      onNotice?.("删除请求失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-white/10 px-5 py-5">
      <h2 className="mb-1 text-[13px] font-medium tracking-wide text-zinc-300">
        本站知识库
      </h2>
      <p className="mb-3 text-[12px] leading-5 text-zinc-500">
        粘贴资料后自动做向量嵌入与检索；对话时会注入相关片段。不依赖外部
        Pinecone / Weaviate 账号。
      </p>
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可选）"
          className="w-full rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-2 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="粘贴制度、FAQ、接口说明、仓库约定…"
          className="w-full rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-2 text-[13px] leading-6 text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void addChunk()}
          className="rounded-lg bg-emerald-600/90 px-3 py-2 text-[13px] text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "写入中…" : "写入知识库"}
        </button>
      </div>
      <ul className="mt-4 space-y-2">
        {items.length === 0 ? (
          <li className="text-[13px] text-zinc-500">暂无资料。写入后再提问更准。</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] text-zinc-200">
                    {item.title || "未命名"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-zinc-500">
                    {item.text}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeChunk(item.id)}
                  className="shrink-0 text-[11px] text-zinc-500 hover:text-rose-300"
                >
                  删除
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
