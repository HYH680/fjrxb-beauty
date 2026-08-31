# AI 智能体超市

把合适的 AI 接到正在做的事上：先逛目录或问导购，再按月申请开通接入与跟进。

## 本地运行

1. 复制环境变量并填写密钥：

```bash
cp .env.example .env
```

至少需要 `DATABASE_URL` 和 `AUTH_SECRET`。`AUTH_SECRET` 缺失时，受保护页面会拒绝访问。

2. 同步数据库（SQLite）：

```bash
npx prisma db push
```

3. 启动：

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 账号与权限

- 未登录可以浏览 `/products` 目录和服务详情，也可以问导购、把服务加入服务单。
- 普通用户开通后，只能使用自己买过的服务。
- 开发者邮箱 `2028391318@qq.com` 享有全部服务，并可以改 `/settings` 的平台密钥和 `/settings/catalog` 的目录价格。不要把这个权限加到其他用户上。
- `ADMIN_EMAILS` 只控制谁能改平台密钥，不会自动开通全部服务。

## 目录数据

服务目录存在数据库 `CatalogProduct` 里，首次启动会从 `src/data/products.ts` 写入。之后改名称、价格、上架状态走后台，不会再用编造的评分或用量图。卡片封面是分类示意 SVG，不是商品实拍。

## 开通闭环

未登录时服务单存在这台浏览器。登录后会合并并写入账号，换设备也能看到。

结账时选择微信、支付宝、PayPal、银行卡或 Stripe。当前默认 `PAYMENT_MODE=sandbox`：开发环境可当场测试开通；**生产默认禁止沙盒**（除非 `ALLOW_SANDBOX_CHECKOUT=true` 或开发者账号）。正式商户把模式改为 `live`，在 `src/lib/payment.ts` 接入真实通道。

## 找回密码

配置 `RESEND_API_KEY` 或 SMTP 后即可发信。未配置时接口会明确提示「邮件通道尚未开通」，不会假装已发送。开发环境可打到服务器终端。

## 旁路集成

文档抽字、n8n、转写、Langfuse、任务队列等见 [docs/integrations.md](docs/integrations.md)。旁路容器：

```bash
docker compose -f docker-compose.integrations.yml up -d
```
