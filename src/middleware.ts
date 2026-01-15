import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // If no auth credentials are configured, skip authentication
  const hasAuth = process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD;
  if (!hasAuth) {
    return NextResponse.next();
  }

  // Allow access to login page and auth API routes
  if (
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("auth_token");
  const secretToken = process.env.AUTH_SECRET_TOKEN || "default-secret-change-me";
  const isAuthenticated = authCookie?.value === secretToken;

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the original URL to redirect back after login
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
