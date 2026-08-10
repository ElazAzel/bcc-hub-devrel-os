import { createServerClient, type CookieOptions } from "@supabase/ssr";

type RequestCookie = { name: string; value: string };

function parseCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies.set(name, decodeURIComponent(value));
  }
  return cookies;
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge !== undefined) cookie += `; Max-Age=${Math.floor(options.maxAge)}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) cookie += "; HttpOnly";
  if (options.secure) cookie += "; Secure";
  if (options.priority) cookie += `; Priority=${options.priority}`;
  if (options.sameSite === true) cookie += "; SameSite=Lax";
  if (typeof options.sameSite === "string") cookie += `; SameSite=${options.sameSite}`;
  return cookie;
}

function isPublicPath(pathname: string) { return pathname === "/login" || pathname.startsWith("/_next") || pathname.startsWith("/icons") || pathname === "/sw.js" || pathname === "/manifest.webmanifest"; }

export async function proxy(request: Request) {
  const url = new URL(request.url);
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!hasSupabase || isPublicPath(url.pathname)) return NextResponse.next();
  const requestCookies = parseCookies(request);
  const response = NextResponse.next();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll(): RequestCookie[] { return Array.from(requestCookies, ([name, value]) => ({ name, value })); },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        for (const { name, value, options } of cookiesToSet) { requestCookies.set(name, value); response.headers.append("Set-Cookie", serializeCookie(name, value, options)); }
      }
    }
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { url.pathname = "/login"; url.searchParams.set("next", new URL(request.url).pathname); return NextResponse.redirect(url); }
  return response;
}

import { NextResponse } from "next/server";
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
