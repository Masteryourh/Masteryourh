import { createHmac, randomBytes } from "node:crypto";

/**
 * Coduri de unică folosință bazate pe timp (TOTP, RFC 6238 / RFC 4226): cele afișate de aplicațiile de autentificare
 * (Google Authenticator, Microsoft Authenticator, Authy…). 6 cifre, pas de 30 s, SHA-1 (compatibil cu toate aplicațiile).
 * Funcții pure, testate cu vectorii oficiali din RFC.
 */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string) {
  const clean = s.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("Cheie invalidă");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Cheie nouă: 20 de octeți aleatorii (160 de biți, cât recomandă RFC 4226). */
export const newTotpSecret = () => base32Encode(randomBytes(20));

export function hotp(secret: Buffer, counter: number, digits = 6) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const code = (h.readUInt32BE(off) & 0x7fffffff) % 10 ** digits;
  return String(code).padStart(digits, "0");
}

export const timeStep = (ms: number) => Math.floor(ms / 1000 / 30);

/**
 * Verifică un cod, acceptând și pasul anterior / următor (ceas ușor decalat). Întoarce pasul potrivit (pentru
 * interzicerea refolosirii) sau null. `notAfterStep`: pașii deja folosiți nu mai sunt acceptați.
 */
export function verifyTotp(secretB32: string, code: string, nowMs: number, lastUsedStep = -1): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretB32);
  const now = timeStep(nowMs);
  for (const step of [now - 1, now, now + 1]) {
    if (step <= lastUsedStep) continue;
    const expected = hotp(secret, step);
    let diff = 0;
    for (let i = 0; i < 6; i++) diff |= expected.charCodeAt(i) ^ code.charCodeAt(i);
    if (diff === 0) return step;
  }
  return null;
}

/** Adresa pentru aplicația de autentificare (codul QR). */
export function otpauthUri(secretB32: string, account: string, issuer = "Puii mei") {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
