import { createHash } from "node:crypto";

/**
 * AUD-001 — partea pură a auditului (testată unitar): redactarea datelor sensibile, amprenta evenimentului și
 * verificarea lanțului de amprente. AUD-INV-04: auditul nu păstrează parole, PIN-uri, coduri, tokenuri, cookie-uri,
 * IBAN în clar sau conținutul fișierelor; se păstrează doar câmpurile cerute explicit, redactate.
 */
// Cheile cu date sensibile (ex. pin, pickupPin, personalPinHash, mfaCode, token, password); `lotCode` NU e sensibil.
const SENSITIVE_KEY = /(pass|parol|^pin$|pins?$|pinhash|token|secret|cookie|^code$|mfa|otp|hash|sessionversion|^data$|iban|cnp|card)/i;
const IBAN = /\bRO\d{2}[A-Z]{4}[A-Z0-9]{16}\b/gi;

export const maskIban = (iban: string) => `${iban.slice(0, 4)}••••${iban.slice(-4)}`;

/** Redactează recursiv: cheile sensibile → „[redactat]”, IBAN-urile din texte → mascate, texte lungi → scurtate. */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return (value.length > 300 ? `${value.slice(0, 300)}…` : value).replace(IBAN, (m) => maskIban(m.toUpperCase()));
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof File || (typeof Blob !== "undefined" && value instanceof Blob)) return "[fișier]";
  if (depth >= 3) return "[…]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SENSITIVE_KEY.test(k) ? "[redactat]" : redact(v, depth + 1);
    return out;
  }
  return String(value);
}

/** JSON canonic (cheile sortate), ca amprenta să nu depindă de ordinea câmpurilor. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(",")}}`;
}

export const eventHash = (prev: string | null, e: unknown) => createHash("sha256").update(`${prev ?? ""}|${canonical(e)}`).digest("hex");

/**
 * Verifică lanțul (evenimente în ordinea `seq` crescătoare). Întoarce primul `seq` stricat sau null.
 * Detectează modificarea / ștergerea / inserarea unui eveniment din mijloc (nu și ștergerea celor de la final:
 * pentru asta există exportul semnat extern, AUD-001 §4).
 */
export function verifyChain<E extends { seq: number; prevHash: string | null; eventHash: string }>(events: E[], strip: (e: E) => unknown): number | null {
  let prev: string | null = null;
  for (const e of events) {
    if (e.prevHash !== prev || eventHash(prev, strip(e)) !== e.eventHash) return e.seq;
    prev = e.eventHash;
  }
  return null;
}
