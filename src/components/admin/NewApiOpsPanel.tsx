import Link from "next/link";
import {
  getNewApiDashboardUrl,
  isLoopbackNewApiUrl,
} from "@/lib/new-api-url";

const STEPS = [
  {
    title: "启动网关",
    body: "本机或网站机执行 docker compose -f docker-compose.newapi.yml up -d",
  },
  {
    title: "配置上游渠道",
    body: "在 New API「渠道」里接入千问 / DeepSeek / 可选 TokenHub 等，模型名与站内一致",
  },
  {
    title: "令牌写入 .env",
    body: "创建令牌后填 LLM_GATEWAY_BASE_URL 与 LLM_GATEWAY_API_KEY（勿提交密钥）",
  },
  {
    title: "日志 / 数据看板看 tokens",
    body: "按 user、模型查看用量；勿把控制台挂到公网商城域名",
  },
] as const;

type Props = {
  /** compact：账户页短链；full：设置页完整入口 */
  variant?: "full" | "compact";
  className?: string;
};

/**
 * 管理端固定入口：种地看数据 → New API 仪表盘 + 怎么用四步。
 * 仅应在 isAdmin 区块内渲染。
 */
export function NewApiOpsPanel({ variant = "full", className = "" }: Props) {
  const url = getNewApiDashboardUrl();
  const loopback = isLoopbackNewApiUrl(url);

  if (variant === "compact") {
    return (
      <div className={className}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
        >
          New API 看 tokens
        </a>
        <p className="mt-2 text-[12px] leading-5 text-zinc-500">
          完整入口与四步说明在{" "}
          <Link href="/settings" className="text-[var(--shelf-accent-soft)] underline">
            设置 · 种地看数据
          </Link>
          {loopback ? "；生产请 SSH 到网站机后打开 127.0.0.1:3001" : null}
        </p>
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-white/10 bg-[var(--bg-elevated)] px-5 py-5 ${className}`}
      aria-labelledby="new-api-ops-heading"
    >
      <p className="text-sm text-zinc-500">种地看数据</p>
      <h2 id="new-api-ops-heading" className="mt-1 text-xl font-semibold tracking-tight text-zinc-100">
        New API 用量看板
      </h2>
      <p className="mt-2 text-[13px] leading-6 text-zinc-400">
        流量经本站后端 → New API，此处看实时 tokens、调用与渠道。不走公网商城域名，仅本机或网站机内访问。
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-[var(--shelf-accent)] px-4 py-2 text-sm font-medium text-[var(--shelf-accent-ink)] hover:bg-[var(--shelf-accent-hover)]"
        >
          打开 New API 控制台
        </a>
        <code className="rounded bg-black/30 px-2 py-1 text-[12px] text-zinc-400">{url}</code>
      </div>

      {loopback ? (
        <p className="mt-3 text-[12px] leading-5 text-zinc-500">
          生产环境：SSH 登录网站机后，浏览器或本机端口转发打开{" "}
          <span className="text-zinc-300">http://127.0.0.1:3001</span>
          。可选环境变量{" "}
          <code className="text-zinc-400">NEXT_PUBLIC_NEW_API_URL</code>{" "}
          覆盖链接（仍勿指向 fjrxb.beauty）。
        </p>
      ) : (
        <p className="mt-3 text-[12px] leading-5 text-zinc-500">
          当前链接来自{" "}
          <code className="text-zinc-400">NEXT_PUBLIC_NEW_API_URL</code>
          ，请确认仅内网可达。
        </p>
      )}

      <ol className="mt-5 space-y-3 border-t border-white/10 pt-4">
        <li className="text-[13px] font-medium text-zinc-200">怎么用（四步）</li>
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 text-[13px] leading-5">
            <span className="shrink-0 tabular-nums text-zinc-500">{i + 1}.</span>
            <span>
              <span className="text-zinc-200">{step.title}</span>
              <span className="mt-0.5 block text-zinc-500">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] leading-5 text-zinc-600">
        首次登录多为 root；密码见容器初始化提示或 INITIAL_ROOT_TOKEN，登录后立刻改密。详见 docs/new-api-setup.md。
      </p>
    </section>
  );
}
