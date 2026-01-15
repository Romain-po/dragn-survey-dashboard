import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env, hasAuthCredentials } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // If no auth credentials are set, allow access (no auth mode)
    if (!hasAuthCredentials) {
      console.warn("⚠️ No AUTH_USERNAME/AUTH_PASSWORD set - allowing access");
      const cookieStore = await cookies();
      cookieStore.set("auth_token", env.auth.secretToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
      return NextResponse.json({ success: true });
    }

    // Check credentials
    if (username === env.auth.username && password === env.auth.password) {
      const cookieStore = await cookies();
      cookieStore.set("auth_token", env.auth.secretToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: "Identifiants incorrects" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
