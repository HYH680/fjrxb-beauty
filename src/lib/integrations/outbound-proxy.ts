/**
 * Node 内置 fetch 不一定吃系统代理；境外 API（如 Fish）经 HTTPS_PROXY 走 undici。
 */
import {
  EnvHttpProxyAgent,
  ProxyAgent,
  fetch as undiciFetch,
  type RequestInit as UndiciRequestInit,
} from "undici";

function proxyUrl() {
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.ALL_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.http_proxy?.trim() ||
    process.env.all_proxy?.trim() ||
    ""
  );
}

let agent: EnvHttpProxyAgent | ProxyAgent | null | undefined;

function getAgent() {
  if (agent !== undefined) return agent;
  const url = proxyUrl();
  if (!url) {
    agent = null;
    return agent;
  }
  try {
    agent = new EnvHttpProxyAgent();
  } catch {
    try {
      agent = new ProxyAgent(url);
    } catch {
      agent = null;
    }
  }
  return agent;
}

function isLoopback(input: string | URL) {
  try {
    const host = (typeof input === "string" ? new URL(input) : input).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/** 有代理则经代理；本机旁路（MJ/Suno）绝不走系统代理 */
export async function outboundFetch(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  if (isLoopback(input)) {
    return fetch(input, init);
  }
  const dispatcher = getAgent();
  if (!dispatcher) {
    return fetch(input, init);
  }
  return undiciFetch(input, {
    ...(init as UndiciRequestInit),
    dispatcher,
  }) as unknown as Promise<Response>;
}

export function applyOutboundProxy() {
  getAgent();
}
