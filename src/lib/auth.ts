import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes, randomInt } from "node:crypto";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  epoch: number;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateVerificationCode(): string {
  return randomInt(100000, 1000000).toString();
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    epoch: user.epoch,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.id as string;
    if (!id) return null;
    const epoch = typeof payload.epoch === "number" ? payload.epoch : 0;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, sessionEpoch: true },
    });
    if (!user || user.sessionEpoch !== epoch) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      epoch: user.sessionEpoch,
    };
  } catch {
    return null;
  }
}

/** 改密 / 重置后 +1，使旧 JWT 立即失效。 */
export async function bumpSessionEpoch(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { sessionEpoch: { increment: 1 } },
    select: { id: true, email: true, name: true, sessionEpoch: true },
  });
}

export { SESSION_COOKIE };
