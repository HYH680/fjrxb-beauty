/**
 * 本机旁路进程（midjourney-proxy / suno-api）探测。
 * 127.0.0.1 绝不能走 HTTPS_PROXY，否则货架会误标、出图也会连错。
 */

const probeCache = new Map<string, { ok: boolean; until: number }>();

export function isLoopbackUrl(input: string | URL) {
  try {
    const host = (typeof input === "string" ? new URL(input) : input).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export async function sidecarFetch(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, init);
}

export function sidecarUnreachable(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return /fetch failed|ECONNREFUSED|ENOTFOUND|ECONNRESET|aborted|AggregateError/i.test(
    msg
  );
}

export function sidecarDownHint(kind: "midjourney" | "suno") {
  const name =
    kind === "midjourney" ? "midjourney-proxy（8080）" : "suno-api（3001）";
  return `${name} 没在跑。启动：npm run integrations:selfhost（详见 docs/suno-mj-selfhost.md）`;
}

/** 进程有响应即视为起来（401/404 也算）；连接失败才算没起来。 */
export async function probeSidecar(baseUrl: string, timeoutMs = 700): Promise<boolean> {
  const key = baseUrl.replace(/\/$/, "");
  const hit = probeCache.get(key);
  if (hit && hit.until > Date.now()) return hit.ok;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    await sidecarFetch(key, { method: "GET", signal: ac.signal });
    probeCache.set(key, { ok: true, until: Date.now() + 20_000 });
    return true;
  } catch {
    probeCache.set(key, { ok: false, until: Date.now() + 8_000 });
    return false;
  } finally {
    clearTimeout(timer);
  }
}
