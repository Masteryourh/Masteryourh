import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE, isValidPreviewKey, maintenanceEnabled } from "@/server/site-mode";

/**
 * /acces?cheie=<PREVIEW_KEY>  → setează cookie-ul de previzualizare și deschide site-ul.
 * /acces?iesire=1             → șterge cookie-ul (vezi site-ul ca un vizitator).
 */
export function GET(request: NextRequest) {
  const url = request.nextUrl;
  const home = new URL("/", request.url);

  if (url.searchParams.has("iesire")) {
    const res = NextResponse.redirect(home);
    res.cookies.delete(PREVIEW_COOKIE);
    return res;
  }

  const key = url.searchParams.get("cheie");
  if (!isValidPreviewKey(key)) {
    return NextResponse.redirect(new URL(maintenanceEnabled() ? "/in-constructie" : "/", request.url));
  }
  const res = NextResponse.redirect(home);
  res.cookies.set(PREVIEW_COOKIE, key!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
