import { NextResponse, type NextRequest } from "next/server";
import { adminEnabled, isValidAdminAuthorization } from "@/server/auth";

export function proxy(request: NextRequest) {
  if (!adminEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!isValidAdminAuthorization(request.headers.get("authorization"))) {
    return new NextResponse("Autentificare necesară", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Puii mei admin", charset="UTF-8"' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
