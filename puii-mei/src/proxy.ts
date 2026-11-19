import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/lib/domain";
import { SESSION_COOKIE, decodeSession } from "@/server/session-token";
import { PREVIEW_COOKIE, isValidPreviewKey, maintenanceEnabled } from "@/server/site-mode";

const OPEN_PATHS = new Set(["/in-constructie", "/acces", "/robots.txt", "/sitemap.xml"]);

/** Zone protejate și rolurile care au acces (adminul are acces peste tot). */
const PROTECTED: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/cont/gospodar", roles: ["gospodar"] },
  { prefix: "/cont/investitor", roles: ["investitor"] },
];

const matches = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Zone cu cont: cer o sesiune validă cu rolul potrivit, indiferent de modul site-ului.
  const zone = PROTECTED.find((z) => matches(pathname, z.prefix));
  if (zone) {
    const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const login = new URL("/cont/autentificare", request.url);
      login.searchParams.set("inapoi", pathname + search);
      return NextResponse.redirect(login);
    }
    if (session.role !== "admin" && !zone.roles.includes(session.role)) {
      return NextResponse.redirect(new URL("/cont", request.url));
    }
    return NextResponse.next();
  }

  // Autentificarea și activarea conturilor rămân accesibile și în modul „în construcție”.
  if (matches(pathname, "/cont")) return NextResponse.next();

  // Modul „în construcție”.
  if (!maintenanceEnabled() || OPEN_PATHS.has(pathname)) return NextResponse.next();
  if (isValidPreviewKey(request.cookies.get(PREVIEW_COOKIE)?.value)) return NextResponse.next();

  const res = NextResponse.rewrite(new URL("/in-constructie", request.url));
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  // Totul, în afară de fișierele statice (au extensie) și resursele Next.js.
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
