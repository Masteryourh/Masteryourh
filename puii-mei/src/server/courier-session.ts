import "server-only";
import { cookies } from "next/headers";
import type { Tour } from "@/lib/domain";
import { signPayload, verifyPayload } from "./session-token";

/**
 * Sesiunea temporară a curierului pe o tură (fără cont): cookie semnat, legat de
 * tură și de versiunea accesului (resetarea accesului o invalidează).
 */
const COOKIE = "puii_curier";
const REQUEST_COOKIE = "puii_curier_cerere";
const HOURS = 24;

interface CourierPayload {
  tid: string;
  v: number;
  exp: number;
}
interface RequestPayload {
  tid: string;
  rid: string;
  exp: number;
}

const opts = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

export async function courierAuthorized(tour: Tour) {
  const p = verifyPayload<CourierPayload>((await cookies()).get(COOKIE)?.value);
  return Boolean(p && tour.courier && p.tid === tour.id && p.v === tour.courier.sessionVersion);
}

export async function grantCourier(tour: Tour, sessionVersion: number) {
  const exp = Math.floor(Date.now() / 1000) + HOURS * 3600;
  (await cookies()).set(COOKIE, signPayload({ tid: tour.id, v: sessionVersion, exp }), opts(HOURS * 3600));
}

export async function rememberPinRequest(tour: Tour, rid: string) {
  const exp = Math.floor(Date.now() / 1000) + 6 * 3600;
  (await cookies()).set(REQUEST_COOKIE, signPayload({ tid: tour.id, rid, exp }), opts(6 * 3600));
}

export async function pendingRequestId(tour: Tour) {
  const p = verifyPayload<RequestPayload>((await cookies()).get(REQUEST_COOKIE)?.value);
  return p && p.tid === tour.id ? p.rid : null;
}
