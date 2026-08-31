# 旁路与总闸

## 两个后台，各管一件事

| 地址 | 干什么 |
|------|--------|
| **http://localhost:3001** | New API：看 tokens、实时调用、模型渠道 |
| **http://localhost:3000/settings/integrations** | AI 智能体超市：**三路水龙头总闸**（编排 / 转写 / 文档） |

New API **不能**直接挂 Whisper/n8n 开关（它是模型网关）。总闸做在本站管理端；对外**只使用 3000**，不要再把 :5678 / :8091 / :8092 当网址用。

## 三路水龙头（总闸）

在 `/settings/integrations` 拨动：

1. **编排** — 开：事件经本站打内部编排；关：只用 `/api/jobs`
2. **转写** — 开：优先内部 Whisper；关/挂了：千问 ASR
3. **文档** — 开：优先内部抽字；关/挂了：unpdf

工作台、用户、前端永远调用 `localhost:3000/api/...`。旁路端口只给 **Next 服务端**在开关打开时内连。

## 本机常驻（管理员）

```bash
npm run integrations:start
```

有 Docker 时也可用 compose profiles；与总闸无关——总闸只决定「用不用」，进程是否起来是运维事。

## API

| 能力 | 路径（唯一对外） |
|------|------------------|
| 总闸读写 | `GET/POST /api/settings/integrations`（管理员） |
| 抽字 | `POST /api/runtime/extract` |
| 出图/TTS | `POST /api/runtime/media` |
| 转写 | `POST /api/runtime/media/transcribe` |
| 任务 | `POST /api/jobs` |
