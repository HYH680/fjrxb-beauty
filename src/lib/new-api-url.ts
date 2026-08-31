/**
 * New API 仪表盘地址（仅管理端链接用）。
 * 默认本机 :3001；生产勿挂到 fjrxb.beauty，用机内/SSH 访问 127.0.0.1:3001。
 */
export function getNewApiDashboardUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_NEW_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3001";
}

/** 是否像本机/环回地址（用于展示 SSH 提示） */
export function isLoopbackNewApiUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host === "::1"
    );
  } catch {
    return true;
  }
}
