import { NextResponse, type NextRequest } from "next/server";
import { adminEnabled, isValidAdminAuthorization } from "@/server/auth";
import { PREVIEW_COOKIE, isValidPreviewKey, maintenanceEnabled } from "@/server/site-mode";

const OPEN_PATHS = new Set(["/in-constructie", "/acces", "/robots.txt", "/sitemap.xml"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Panoul de administrare: HTTP Basic, indiferent de modul site-ului.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!adminEnabled()) return new NextResponse("Not found", { status: 404 });
    if (!isValidAdminAuthorization(request.headers.get("authorization"))) {
      return new NextResponse("Autentificare necesară", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Puii mei admin", charset="UTF-8"' },
      });
    }
    return NextResponse.next();
  }

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
