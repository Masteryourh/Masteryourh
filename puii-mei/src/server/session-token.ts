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

/** Lungimea minimă a cheii de semnare (caractere). */
export const MIN_SECRET_LENGTH = 32;
/** Cheie folosită doar la dezvoltare locală (`next dev`), niciodată în producție. */
const DEV_SECRET = "puii-mei:dezvoltare-locala:nu-se-foloseste-in-productie";

/**
 * Cheia de semnare a sesiunilor, accesului curierilor și PIN-urilor clienților.
 * Vine DOAR din SESSION_SECRET (fără variante derivate din parola de admin).
 * În producție, lipsa ei sau o cheie prea scurtă e eroare: platforma refuză să semneze.
 */
export function sessionSecret(env: Record<string, string | undefined> = process.env) {
  const s = env.SESSION_SECRET?.trim();
  if (s) {
    if (s.length < MIN_SECRET_LENGTH) throw new Error(`SESSION_SECRET e prea scurt (minimum ${MIN_SECRET_LENGTH} de caractere).`);
    return s;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET nu este setat. Adaugă-l în Vercel → Settings → Environment Variables, apoi Redeploy.");
  }
  return DEV_SECRET;
}

/** Dacă platforma poate semna sesiuni (SESSION_SECRET configurat corect). */
export function sessionSecretReady(env: Record<string, string | undefined> = process.env) {
  try {
    sessionSecret(env);
    return true;
  } catch {
    return false;
  }
}

/** Amprentă HMAC cu separarea scopului (ex. „pin”), ca o cheie să nu poată fi folosită în alt context. */
export function keyedHash(purpose: string, data: string, env?: Record<string, string | undefined>) {
  return createHmac("sha256", sessionSecret(env)).update(`${purpose}:${data}`).digest("hex");
}

/** Comparație în timp constant pentru șiruri (parole, coduri). */
export function safeEqual(a: string, b: string) {
  const x = createHmac("sha256", "cmp").update(a).digest();
  const y = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(x, y) && a.length === b.length;
}

const sign = (data: string) => createHmac("sha256", sessionSecret()).update(data).digest("base64url");

/** Semnează orice obiect mic (folosit și pentru sesiunea temporară a curierului). */
export function signPayload(p: object) {
  const data = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Verifică semnătura și expirarea (`exp`, în secunde). */
export function verifyPayload<T extends { exp: number }>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  try {
    const expected = Buffer.from(sign(data));
    const actual = Buffer.from(sig);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as T;
    return typeof p.exp === "number" && p.exp * 1000 >= Date.now() ? p : null;
  } catch {
    return null;
  }
}

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
