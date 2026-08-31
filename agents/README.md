# Agent frameworks + human-consultant stack for ai-supermarket

## Local (方案 1) — already wired into `/api/runtime/chat`

- **Persona**: `consultantPersonaBlock` in `src/lib/shop-consultant.ts`, injected via `buildWorkspaceCsPrompt`
- **Session memory**: `ShopMemory` (Prisma) — facts extracted each turn (`rememberTurn`)
- **Light RAG**: `KnowledgeChunk` keyword retrieve — no vector DB / Docker
- **APIs**:
  - `GET/PUT /api/runtime/memory?productId=...`
  - `GET/POST/DELETE /api/runtime/knowledge?productId=...`

## Two-layer architecture

1. **Memory layer (Letta Cloud)** — read/write archival + core blocks only. Never generates chat.
2. **Brain layer (New API gateway + model picker)** — DeepSeek / Qwen / GPT / … produce the reply.

Local `ShopMemory` + `KnowledgeChunk` still work as the in-app memory/RAG; Letta syncs long-term facts across the supermarket.

## Python demos (optional, already installed)

```
agents/.venv/Scripts/python.exe agents/agno_demo.py "帮我给火锅店想个活动"
agents/.venv/Scripts/python.exe agents/langgraph_demo.py "写一条周末满减文案"
```

Uses New API gateway (`LLM_GATEWAY_*`). CrewAI skipped (Python 3.14 / numpy pin).
Dify/LobeChat/Letta **Docker** not used (16GB RAM).

## Gateway

- New API: `http://localhost:3001`
- Frontend: `http://localhost:3000`
