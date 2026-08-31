# New API 用量统计网关接入说明

本文件描述一次性手动配置。网关部署后，ai-supermarket 的所有 LLM 调用都会经过它，从而在仪表盘看到「每个用户 × 每个服务」的 token 消耗与请求耗时。

## 1. 启动网关

**优先 Docker：**

```bash
docker compose -f docker-compose.newapi.yml up -d
```

若 Docker Desktop / WSL 不可用，可用仓库内 SQLite 二进制（已有渠道与令牌时优先）：

```powershell
# 在仓库根目录
cd newapi
.\new-api.exe --port 3001 --log-dir .\logs
```

打开 http://localhost:3001 。Docker 首次进入用默认 root（见 compose `INITIAL_ROOT_TOKEN` / 容器日志）；本机 `new-api.exe` + `one-api.db` 若已初始化，用已有管理员账号登录。登录后立刻改密。

## 2. 配置上游渠道（对应 ai-supermarket 已支持的厂商）

在「渠道 → 添加渠道」中，为每个厂商各建一个渠道，类型选 OpenAI 兼容，填入对应密钥与 Base URL：

| 渠道 | 类型 | Base URL | 模型 | 密钥环境变量 |
| --- | --- | --- | --- | --- |
| DeepSeek | OpenAI | https://api.deepseek.com/v1 | deepseek-chat | DEEPSEEK_API_KEY |
| 豆包(ARK) | OpenAI | https://ark.cn-beijing.volces.com/api/v3 | doubao-seed-2-0-lite-2601 | ARK_API_KEY |
| 通义千问 | OpenAI | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-plus | QWEN_API_KEY |
| Kimi | OpenAI | https://api.moonshot.cn/v1 | moonshot-v1-8k | MOONSHOT_API_KEY |
| OpenAI | OpenAI | https://api.openai.com/v1 | gpt-5.6-sol | OPENAI_API_KEY |
| 腾讯 TokenHub（可选） | OpenAI | https://tokenhub.tencentmaas.com/v1 | hy3 等（见控制台 /v1/models） | TOKENHUB_API_KEY |

> TokenHub 的 `sk-...` 是**上游厂商密钥**，不要当成 `LLM_GATEWAY_API_KEY`。站内也可直连：填 `TOKENHUB_*` 后走 `provider: tokenhub`（混元 Hy3 等），默认不经 New API；若要在看板里统计，再在 New API 加上述渠道并把模型名对齐。

每个渠道在「模型」里填上 ai-supermarket 实际会请求的模型名（与 `src/lib/llm-config.ts` 的 `PROVIDERS` 保持一致）。

## 3. 创建网关访问令牌

在「令牌 → 添加令牌」创建一个令牌，复制 `sk-...`。把它填到 ai-supermarket 的 `.env`：

```
LLM_GATEWAY_BASE_URL=http://localhost:3001/v1
LLM_GATEWAY_API_KEY=sk-你刚才创建的令牌
```

> 该令牌用于「按用户归因」：ai-supermarket 在每次请求体里带 `user: <session.id>`，New API 会把这条请求的 token 数、耗时、模型记到该令牌名下，并可在日志页按 `user` 字段筛选。

## 4. 查看用量

- **日志页**：每条请求含 模型、用户(user 字段)、prompt/completion/total tokens、耗时(ms)、时间。可按用户筛选。
- **数据看板**：按令牌/模型/时间的聚合图表，含 token 用量与费用趋势。
- **站内入口**：管理员登录后打开 `/settings`「种地看数据」→ New API 控制台（默认 `http://localhost:3001`，可用 `NEXT_PUBLIC_NEW_API_URL` 覆盖；生产请 SSH 到网站机访问 `127.0.0.1:3001`，勿挂到 fjrxb.beauty）。

## 5. 可选：按「用户 × 服务」更精确归因

若想区分导购对话与具体服务（如餐饮营销内容服务），ai-supermarket 已在请求里带 `user` 与自定义 header `X-Product-Id`。New API 日志页可按 user 筛选；站内账户页也会汇总本站 `UsageEvent` / Langfuse 用量。按 header 二次聚合可后续用 New API 管理 API 自建，不必重做图表。
