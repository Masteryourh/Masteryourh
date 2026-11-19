/**
 * Token de sesiune semnat (HMAC-SHA256), folosit de proxy și de server.
 * Format: base64url(JSON payload) + "." + base64url(semnătură).
 * Nu importă „server-only”, ca să poată fi folosit și în proxy.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@/lib/domain";

export const SESSION_COOKIE = "puii_sesiune";
export const SESSION_DAYS = 14;

export interface SessionPayload {
  /** id-ul utilizatorului; „env-admin” = administratorul din variabilele de mediu. */
  uid: string;
  role: UserRole;
  /** versiunea sesiunii (invalidare la schimbarea parolei / dezactivare). */
  v: number;
  /** expirare, în secunde (epoch). */
  exp: number;
}

function secret() {
  const s =
    process.env.SESSION_SECRET || (process.env.ADMIN_PASSWORD ? `puii-mei:${process.env.ADMIN_PASSWORD}` : "");
  if (!s) throw new Error("SESSION_SECRET nu este setat");
  return s;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function encodeSession(p: SessionPayload) {
  const data = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  try {
    const expected = Buffer.from(sign(data));
    const actual = Buffer.from(sig);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (!p.uid || !p.role || typeof p.exp !== "number" || p.exp * 1000 < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}
