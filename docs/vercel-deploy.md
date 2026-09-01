# Vercel 自动部署（镜像站）

正式生产仍是 **https://fjrxb.beauty**（HK `npm run deploy:prod`）。  
本仓库另可挂 **Vercel**：每次 `git push` 自动构建，得到 `*.vercel.app` 预览/镜像地址。

## 一键流程

1. 打开 https://vercel.com → 用 **GitHub** 登录  
2. **Add New Project** → Import **`fjrxb-beauty`**（或本仓库在 GitHub 上的名字）  
3. Framework 选 Next.js；Build 会用仓库根目录 `vercel.json`  
4. 在 Project → **Settings → Environment Variables** 填入与生产一致的密钥（至少见下方清单）  
5. Deploy → 得到 `https://xxx.vercel.app`  
6. 之后对本仓库 default branch 的 `git push` 会自动重新部署  

CLI 备选（本机已登录时）：

```bash
npx vercel link
npx vercel --prod
```

## 环境变量（最少）

在 Vercel 为 Production / Preview 分别配置（勿提交到 Git）：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | **不要**用本地 `file:./prisma/*.db`。见下文 SQLite 限制 |
| `LLM_GATEWAY_*` / 各厂商 `*_API_KEY` | 与 HK 站能力对齐时按需复制 |
| `NEXTAUTH` / 会话相关密钥 | 与现站 auth 一致的秘密 |

`next.config.ts` 在检测到 `VERCEL=1` 时**关闭** `output: "standalone"`，避免与 Vercel 打包冲突；HK 机仍走 standalone。

## SQLite 在 Vercel 上的限制（必读）

当前 Prisma 使用 **SQLite 文件库**。Vercel Serverless / 边缘：

- 文件系统**不可持久写**（实例只读或临时 `/tmp`，冷启动会丢）
- 因此：登录、购物车、订单、订阅等写库功能在 Vercel 上**不可当作真生产**

### 改造评估（若要把 Vercel 也做成可写生产）

| 方案 | 工作量 | 说明 |
| --- | --- | --- |
| **A. Neon / Vercel Postgres** | 中 | `provider = "postgresql"`，改 `DATABASE_URL`，跑 migrate；最省心的免费档之一 |
| **B. Turso (libSQL)** | 中 | SQLite 协议兼容 + 远程；需 `@libsql/client` / Prisma 适配 |
| **C. 仅静态/只读镜像** | 低 | Vercel 只展示货架与落地页，写操作仍跳转 `fjrxb.beauty` |

**建议**：继续以 **fjrxb.beauty** 为完整生产；Vercel 先做 **Git 联动预览**。若以后要双活，优先方案 A。

## 与 HK 部署的关系

| | fjrxb.beauty | Vercel |
| --- | --- | --- |
| 触发 | `npm run deploy:prod` | `git push` → GitHub → Vercel |
| 数据库 | 服务器上 `prisma/prod.db` | 需托管 DB，不能靠本地 SQLite |
| `.env` | 部署脚本**不覆盖**远端 `.env` | 在 Vercel Dashboard 单独配 |

两边密钥可对齐，但**不要**把 Vercel 预览域名的 A 记录指到 Reality 节点；商城域名 DNS 规则仍见仓库 `public-https-continuity` 规则。
