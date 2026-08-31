# Suno / Midjourney 自建与密钥说明

官方都没有公开开发者 API，所以**不能像万相那样只写进本站 `.env` 就出图/成曲**。

| | 万相 / 即梦 / Runway | Midjourney / Suno |
|--|--|--|
| 本站工作台 | `/use` → `/api/runtime` | 一样，已经从本站发起 |
| 引擎 | 官方 HTTP，密钥在本站 | Discord 机器人 / Cookie+打码，必须另起进程 |
| 本站 `.env` | API Key | 只写代理地址；Token/Cookie 放容器 |

地址写上 ≠ 在线可用。货架会探测 `127.0.0.1:8080` / `:3001`，进程没起来会标「待启动代理」。

自建 = 你跑一个代理，**账号凭证只放在代理里**，本站只连代理地址。

## 密钥分两层（别搞混）

| 层级 | 放哪里 | 是什么 |
|------|--------|--------|
| A. 平台登录凭证 | **只放代理 / Docker** | Suno Cookie、MJ Discord Token |
| B. 本站调用密钥 | **本站 `.env`** | 代理地址；可选自设的接口 Secret |

**本站 `.env` 不要写 Cookie / Discord Token。**

---

## Suno（自建 gcui-art/suno-api）

### 1) 代理侧（`.env.selfhost` → Docker 容器）

1. `copy selfhost.env.example .env.selfhost`
2. 浏览器登录 [suno.com/create](https://suno.com/create)，F12 → Network → 复制 `Cookie`
3. 填 `.env.selfhost`：

```bash
SUNO_COOKIE=从浏览器复制的整段 Cookie
TWOCAPTCHA_KEY=你的2captcha密钥
```

4. `npm run integrations:selfhost`（内部映射 `3001:3000`）

### 2) 本站 `.env`（只要地址）

```bash
SUNO_PROVIDER=selfhost
SUNO_BASE_URL=http://127.0.0.1:3001
# 自建模式不要填 SUNO_API_KEY
```

Cookie 过期后：**只更新 `.env.selfhost` 里的 `SUNO_COOKIE`**，再 `docker compose ... up -d suno-api`（或 `npm run integrations:selfhost`）。本站不用动。

---

## Midjourney（自建 midjourney-proxy）

### 1) 代理侧（`.env.selfhost`）

1. 有 Midjourney 订阅 + 自己的 Discord 服务器/频道  
2. 填 `.env.selfhost` 的 `MJ_DISCORD_USER_TOKEN` / `MJ_DISCORD_GUILD_ID` / `MJ_DISCORD_CHANNEL_ID`  
3. `MIDJOURNEY_API_SECRET` 设一串随机长密码（与本站 `.env` 相同）

### 2) 本站 `.env`

```bash
MIDJOURNEY_PROVIDER=proxy
MIDJOURNEY_PROXY_BASE=http://127.0.0.1:8080
MIDJOURNEY_API_SECRET=和代理里 mj.api-secret 相同的那一串
# 自建时不要填 TTAPI_API_KEY
```

`MIDJOURNEY_API_SECRET` **不是** Discord Token，只是防止别人乱调你的本地代理。

---

## 和「买网关」对比

| | 自建 | 买网关（sunoapi / TTAPI） |
|--|------|---------------------------|
| 本站填什么 | 地址 + 可选 Secret | `SUNO_API_KEY` / `TTAPI_API_KEY` |
| 账号凭证 | 你自己的 Cookie/Discord | 网关方管 |
| 运维 | 要续 Cookie、防封 | 充值即可 |

---

## 推荐本站最小配置（自建）

```bash
# Suno 自建
SUNO_PROVIDER=selfhost
SUNO_BASE_URL=http://127.0.0.1:3001

# MJ 自建
MIDJOURNEY_PROVIDER=proxy
MIDJOURNEY_PROXY_BASE=http://127.0.0.1:8080
MIDJOURNEY_API_SECRET=请改成随机长串
```

改完重启 Next 开发服务。工作台打开「AI 配乐」「Midjourney」即可测。

---

## 稳定运行 SOP（自建 · Windows）

### 一次性准备

1. **Docker Desktop** → Settings → General → **Start Docker Desktop when you log in**
2. 复制凭证模板：`copy selfhost.env.example .env.selfhost`，填 Discord Token / Suno Cookie / 2Captcha
3. 本站 `.env` 只保留旁路**地址**和 `MIDJOURNEY_API_SECRET`（与 `.env.selfhost` 里同一串）
4. 首次启动：`npm run integrations:selfhost`

### 日常命令

| 命令 | 用途 |
|------|------|
| `npm run integrations:selfhost` | 启动/更新 MJ + Suno 容器 |
| `npm run integrations:check-selfhost` | 看容器、8080/3001 端口是否在听 |
| `docker compose --env-file .env --env-file .env.selfhost -f docker-compose.integrations.yml --profile selfhost restart` | 改 Cookie 后重启旁路 |

Compose 已设 `restart: unless-stopped` + **healthcheck**：Docker 或电脑重启后容器会自动拉起；货架探测到端口通才会标「在线可用」。

### 两层「稳定」别混

| 层 | 怎么保 | 坏了的表现 |
|----|--------|------------|
| **进程** | Docker 自启 + `unless-stopped` + 每周 `check-selfhost` | 货架「待启动代理」、连接被拒绝 |
| **凭证** | 续 Suno Cookie、MJ Discord Token、2Captcha 余额 | 进程在，工作台报 Cookie 无效 / MJ 提交失败 |

### Suno Cookie 续期（常见 1–4 周）

1. 浏览器重新登录 [suno.com/create](https://suno.com/create)，F12 复制新 Cookie  
2. 写入 `.env.selfhost` 的 `SUNO_COOKIE=`  
3. `docker compose --env-file .env --env-file .env.selfhost -f docker-compose.integrations.yml --profile selfhost up -d suno-api`  
4. 工作台再试成曲  

**不用改本站 `.env` 里的 `SUNO_BASE_URL`。**

### MJ Discord Token 续期

1. Token 失效时在 `.env.selfhost` 更新 `MJ_DISCORD_*`  
2. 同上 compose 命令，服务名改 `midjourney-proxy`  
3. 确认 MJ 订阅有效、Bot/用户在指定频道能 `/imagine`  

### 可选：每周自动巡检

任务计划程序 → 每周运行：

```text
powershell -ExecutionPolicy Bypass -File C:\...\ai-supermarket\scripts\check-selfhost.ps1
```

退出码非 0 表示旁路挂了，再跑 `npm run integrations:selfhost`。

### 部署注意

- **Next 和旁路要在同一台常开机机器**（本机开发可以；云服务器要把 compose 和 Next 放同一台）  
- 本机休眠/关机 → 旁路断，和凭证无关  
- 若 healthcheck 长期 unhealthy 但端口通、能出图/成曲，可忽略（部分镜像缺 curl/wget）

---

## Replicate / Cohere（官方 API）

本站 `.env`：

```bash
REPLICATE_API_TOKEN=从 replicate.com/account/api-tokens 复制
# 可选：REPLICATE_MODEL=black-forest-labs/flux-schnell

COHERE_API_KEY=从 dashboard.cohere.com/api-keys 复制
# 可选：COHERE_EMBED_MODEL=embed-multilingual-v3.0
```

- 开源模型接入：工作台走 Replicate 出图（FLUX / SDXL）
- 检索增强服务：该 SKU 的知识库嵌入走 Cohere；其它知识库 SKU 仍用千问/OpenAI，避免向量维度混用
- 自动剪辑：`CAPCUT_MATE_BASE_URL` 指向本机 CapCut Mate 后可出剪映草稿

