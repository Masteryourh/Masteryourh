import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/session-token";

/** Ieșire din cont (POST din formularul „Ieșire”). */
export function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/cont/autentificare", request.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
