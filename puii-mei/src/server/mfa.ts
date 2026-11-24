import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import type { User } from "@/lib/domain";
import { store } from "./db/store";
import { hitRateLimit } from "./rate-limit";
import { sessionSecret } from "./session-token";
import { newTotpSecret, verifyTotp } from "./totp";

/**
 * MFA cu cod din aplicația de autentificare (TOTP). Cheia se păstrează CRIPTATĂ în baza de date (AES-256-GCM, cheie
 * derivată din SESSION_SECRET), se activează doar după confirmarea primului cod, un cod nu se poate folosi de două ori
 * și încercările sunt limitate (5 la 15 minute pe cont). Folosit pentru schimbarea IBAN-ului (ADR-009, varianta b).
 */
const USERS = "users";
const MAX_TRIES = 5;
const WINDOW_S = 15 * 60;

const key = () => Buffer.from(hkdfSync("sha256", sessionSecret(), Buffer.alloc(0), "puii-mei/mfa-totp/v1", 32));

function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}

function decrypt(box: string) {
  const [v, iv, tag, data] = box.split(".");
  if (v !== "v1") throw new Error("Format necunoscut");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

export const mfaEnabled = (u: User) => Boolean(u.mfa?.enabledAt && !u.mfa.pending);

/** Începe activarea: cheie nouă, încă neactivă (o activare începută anterior se înlocuiește). */
export async function startMfaEnrollment(user: User) {
  if (mfaEnabled(user)) throw new Error("Codul de confirmare e deja activ.");
  const secret = newTotpSecret();
  await store.update<User>(USERS, user.id, { mfa: { secret: encrypt(secret), pending: true } });
  return secret;
}

/** Cheia activării în curs (pentru afișarea codului QR), sau null. */
export function pendingSecret(user: User) {
  return user.mfa?.pending ? decrypt(user.mfa.secret) : null;
}

/**
 * Verifică un cod pentru contul dat, atomic: limită de încercări, fără refolosirea codului, iar la activare marchează
 * MFA ca activ. `forEnrollment` = confirmarea primului cod (cheia e încă „pending”).
 */
export async function checkMfaCode(userId: string, code: string, { forEnrollment = false } = {}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hitRateLimit(`mfa:${userId}`, MAX_TRIES, WINDOW_S)).allowed) {
    return { ok: false, error: "Prea multe coduri greșite. Încearcă din nou peste 15 minute." };
  }
  const now = Date.now();
  return store.transact<User, { ok: true } | { ok: false; error: string }>(USERS, userId, (u) => {
    const m = u?.mfa;
    if (!m || Boolean(m.pending) !== forEnrollment) return { result: { ok: false, error: "Codul de confirmare nu e activ pentru acest cont." } };
    const step = verifyTotp(decrypt(m.secret), code.replace(/\s/g, ""), now, m.lastStep ?? -1);
    if (step === null) return { result: { ok: false, error: "Cod greșit sau expirat. Introdu codul afișat acum în aplicație." } };
    const next = forEnrollment ? { ...m, pending: false, enabledAt: new Date(now).toISOString(), lastStep: step } : { ...m, lastStep: step };
    return { patch: { mfa: next }, result: { ok: true } };
  });
}

/** Dezactivare (de utilizator, cu un cod valid) sau resetare (de admin, telefon pierdut). */
export async function clearMfa(userId: string) {
  await store.update<User>(USERS, userId, { mfa: undefined });
}
