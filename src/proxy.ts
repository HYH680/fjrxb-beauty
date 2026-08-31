import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth-constants";

const protectedPaths = [
  "/home",
  "/checkout",
  "/account",
  "/onboarding",
  "/settings",
  "/use",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // 工作台入口未登录时回落地页，避免「一打开就是登录页」
  const softEntry =
    pathname === "/home" ||
    pathname.startsWith("/home/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/");

  const unauthRedirect = () => {
    if (softEntry) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  };

  if (!token) {
    return unauthRedirect();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return unauthRedirect();
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    return unauthRedirect();
  }
}

export const config = {
  matcher: [
    "/home",
    "/home/:path*",
    "/checkout",
    "/checkout/:path*",
    "/account",
    "/account/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/settings",
    "/settings/:path*",
    "/use",
    "/use/:path*",
  ],
};
