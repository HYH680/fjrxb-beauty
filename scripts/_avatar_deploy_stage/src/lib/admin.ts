import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 仅此邮箱作为开发者，享有全部服务。不要把这个权限套到普通用户上。 */
export const DEVELOPER_EMAIL = "2028391318@qq.com";

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isDeveloperEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === DEVELOPER_EMAIL;
}

export function isAdminAccount(email: string, _role?: string | null): boolean {
  const normalized = email.trim().toLowerCase();
  if (isDeveloperEmail(normalized)) return true;
  return adminEmails().has(normalized);
}

export function accountRole(email: string): "admin" | "user" {
  return isAdminAccount(email) ? "admin" : "user";
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: "请先登录" as const, status: 401 as const, session: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true },
  });

  if (!user || !isAdminAccount(user.email)) {
    return {
      error: "仅管理员可配置平台密钥" as const,
      status: 403 as const,
      session,
    };
  }

  return { error: null, status: 200 as const, session };
}
