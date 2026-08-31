# 正式上线 fjrxb.beauty

公网站点跑在 **119.28.45.212**。`@` 与 `www` 的 A 记录**只能**指向该 IP。  
**禁止**把新加坡机 `43.156.92.214`（Reality）写成商城域名的 A：浏览器随机打到该 IP 会出现 `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` /「使用不受支持的协议」。  
验收：`node scripts/check-public-tls.mjs`（须全部解析器只有 `119.28.45.212`，且 SNI TLS 成功）。  
Nginx 已配置 apex + www。不要用本机 Windows 暴露 80/443。

## 架构

浏览器 → DNS → Nginx **443** → Next.js `127.0.0.1:3010` → SQLite `prisma/prod.db`，LLM 走本机 Docker **one-api** `127.0.0.1:3001`。

VLESS WebSocket 仍走 Nginx 路径 `/zf756f46aws`（默认站点 80 + 本站 80/443 都保留），不要删 `/etc/nginx/snippets/vless-ws.conf`。

原先占用 **443** 的 sing-box Reality 入站已改到 **8444**，否则网站 HTTPS 无法监听。若还有 Reality 客户端，把远端端口改成 8444。WebSocket 客户端不用改。

新增 443 监听后若 `nginx reload` 没带上端口，执行一次 `sudo systemctl restart nginx`。

## 目录与进程

| 项 | 位置 |
| --- | --- |
| 应用 | `/home/ubuntu/ai-supermarket` |
| 环境变量 | `/home/ubuntu/ai-supermarket/.env`（不要提交 git） |
| Node 22 | `/opt/nodejs` |
| systemd | `ai-supermarket.service`（`node .next/standalone/server.js`，`127.0.0.1:3010`） |
| Nginx | `/etc/nginx/sites-available/fjrxb`（模板见仓库 `deploy/nginx-fjrxb.beauty.conf`） |
| 证书 | `/etc/letsencrypt/live/www.fjrxb.beauty/`（SAN 含 apex + www） |
| New API / one-api | Docker `one-api`，宿主机 `3001` |

## 常用命令

```bash
sudo systemctl status ai-supermarket
sudo journalctl -u ai-supermarket -f
sudo nginx -t && sudo systemctl restart nginx
sudo docker ps --filter name=one-api
```

发版（在本机打包源码后 scp 到服务器，再 SSH）：

```bash
cd /home/ubuntu/ai-supermarket
export PATH=/opt/nodejs/bin:$PATH
npm ci
npx prisma generate
npx prisma db push
NODE_OPTIONS=--max-old-space-size=1536 npm run build
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
sudo systemctl restart ai-supermarket
```

本地可用 `node deploy/make-prod-env.mjs` 从开发 `.env` 生成 `.env.production`（会轮换 `AUTH_SECRET`、去掉 Clash 代理、指向本机 one-api）。把该文件拷到服务器的 `.env`，不要提交 git。

## 生产环境要点

- `NODE_ENV=production`，独立长随机 `AUTH_SECRET`（不要沿用开发串）。
- `NEXT_PUBLIC_SITE_URL=https://fjrxb.beauty`（裸域 DNS 未好时先用 `https://www.fjrxb.beauty` 打开）。
- `DATABASE_URL=file:/home/ubuntu/ai-supermarket/prisma/prod.db`
- `LLM_GATEWAY_BASE_URL=http://127.0.0.1:3001/v1` + 网关 Key
- 不要设置本机 Clash 的 `HTTPS_PROXY` / `HTTP_PROXY`
- `PAYMENT_MODE=sandbox`：线上普通用户不能沙盒开通；真收款需另接微信/支付宝商户

## 验收

打开 `https://www.fjrxb.beauty`：首页、登录、忘记密码发信、工作台对话。不应再依赖 `localhost:3000`。
