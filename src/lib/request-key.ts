import { NextRequest } from "next/server";

export function requestLimitKey(
  request: NextRequest,
  sessionId?: string | null
): string {
  if (sessionId) return `user:${sessionId}`;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon";
  return `ip:${ip}`;
}
