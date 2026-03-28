import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "gds_session";

/** Damit das Root-Layout horizontale Außenabstände reduzieren kann (Assistent-Iframe, volle Breite). */
function nextWithOptionalEmbed(req: NextRequest) {
  if (req.nextUrl.searchParams.get("embed") !== "1") {
    return NextResponse.next();
  }
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-app-embed", "1");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname === "/login" || pathname === "/register" || pathname === "/verify-email") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  if (process.env.DEV_AUTH_BYPASS === "1") {
    return nextWithOptionalEmbed(req);
  }

  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/_next")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();

  if (isPublicPath(pathname)) return nextWithOptionalEmbed(req);

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return new NextResponse("Server misconfiguration: set AUTH_SECRET (min. 16 characters) in .env", {
      status: 500,
    });
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return nextWithOptionalEmbed(req);
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp)$).*)"],
};
