/**
 * Schimbarea contului bancar (IBAN) al gospodăriei — CG-03 / V-04, decizia PO 23.11.2026 (varianta b), etapa fără MFA.
 * Funcții pure (fără bază de date), testate unitar; `iban.ts` le aplică într-o tranzacție pe documentul gospodăriei.
 *
 * Stări: in-verificare → confirmat (apel telefonic) → activ | respins | anulat.
 * Regula de bază (fail-closed): clienții văd DOAR contul activ. Contul cerut nu apare nicăieri pentru plată până nu e:
 *  1. confirmat telefonic de PUII MEI, de o altă persoană decât cea care a cerut, la un număr cunoscut dinainte de cerere;
 *  2. și au trecut 24 h de la cerere (la primul cont al gospodăriei nu există un cont vechi de protejat: fără așteptare).
 */
export const IBAN_DELAY_MS = 24 * 3600_000;

export type BankIdentity = { holder: string; iban: string; bank: string };
export type Actor = { id: string; name: string };
export type IbanChangeStatus = "in-verificare" | "confirmat" | "activ" | "respins" | "anulat";

export type IbanChange = BankIdentity & {
  id: string;
  status: IbanChangeStatus;
  requestedAt: string;
  requestedBy: string;
  requestedById: string;
  /** Momentul de la care contul confirmat poate deveni activ. */
  activatesAfter: string;
  /** Numerele de telefon ale gospodăriei cunoscute ÎNAINTE de cerere; apelul de verificare se face doar la ele. */
  knownPhones: string[];
  phoneCheck?: { at: string; by: string; byId: string; phone: string; note?: string };
  closedAt?: string;
  closedBy?: string;
  reason?: string;
};

/** Datele de plată ale gospodăriei: contul ACTIV (vizibil clienților) + cererea de schimbare în curs, dacă există. */
export type PaymentDoc = BankIdentity & {
  id: string;
  feedPricePerKg: number;
  chickPricePerBird?: number;
  updatedAt: string;
  updatedBy: string;
  ibanChange?: IbanChange;
};

export type Result<T> = { ok: true; doc: T; change: IbanChange } | { ok: false; error: string };

const same = (a: BankIdentity, b: BankIdentity) => a.iban === b.iban && a.holder === b.holder && a.bank === b.bank;
const pending = (c?: IbanChange) => c && (c.status === "in-verificare" || c.status === "confirmat");
const digits = (phone: string) => phone.replace(/\D/g, "").replace(/^40/, "0");

/**
 * Cererea de schimbare. Idempotentă: aceeași cerere repetată întoarce cererea în curs. O cerere nouă, diferită,
 * o înlocuiește pe cea în curs (care se anulează) și reîncepe verificarea și așteptarea.
 */
export function requestChange(
  doc: PaymentDoc,
  next: BankIdentity,
  actor: Actor,
  knownPhones: string[],
  now: Date,
  newId: string,
): { doc: PaymentDoc; change: IbanChange | null; replaced: IbanChange | null } {
  if (doc.iban && same(doc, next)) {
    // Contul cerut e deja cel activ: nimic de verificat; o cerere în curs pentru alt cont se anulează.
    const replaced = pending(doc.ibanChange) ? doc.ibanChange! : null;
    const ibanChange = replaced ? close(replaced, "anulat", actor, now, "Revenire la contul activ") : doc.ibanChange;
    return { doc: { ...doc, ibanChange }, change: null, replaced };
  }
  if (pending(doc.ibanChange) && same(doc.ibanChange!, next)) return { doc, change: doc.ibanChange!, replaced: null };
  const replaced = pending(doc.ibanChange) ? doc.ibanChange! : null;
  const change: IbanChange = {
    ...next,
    id: newId,
    status: "in-verificare",
    requestedAt: now.toISOString(),
    requestedBy: actor.name,
    requestedById: actor.id,
    activatesAfter: new Date(now.getTime() + (doc.iban ? IBAN_DELAY_MS : 0)).toISOString(),
    knownPhones: [...new Set(knownPhones.filter((p) => digits(p).length >= 9))],
  };
  return { doc: { ...doc, ibanChange: change }, change, replaced };
}

function close(c: IbanChange, status: "respins" | "anulat", actor: Actor, now: Date, reason: string): IbanChange {
  return { ...c, status, closedAt: now.toISOString(), closedBy: actor.name, reason };
}

/** Confirmarea telefonică de către PUII MEI. Refuză: cerere greșită / veche (replay), a doua confirmare, aceeași persoană, număr necunoscut. */
export function confirmByPhone(doc: PaymentDoc, changeId: string, actor: Actor, phone: string, now: Date, note?: string): Result<PaymentDoc> {
  const c = doc.ibanChange;
  if (!c || c.id !== changeId) return { ok: false, error: "Cererea nu mai există sau a fost înlocuită de una nouă." };
  if (c.status !== "in-verificare") return { ok: false, error: "Cererea a fost deja tratată." };
  if (c.requestedById === actor.id) return { ok: false, error: "Confirmarea trebuie făcută de altă persoană decât cea care a cerut schimbarea." };
  if (!c.knownPhones.some((p) => digits(p) === digits(phone))) {
    return { ok: false, error: "Apelul se face doar la un număr al gospodăriei cunoscut dinainte de cerere." };
  }
  const change: IbanChange = { ...c, status: "confirmat", phoneCheck: { at: now.toISOString(), by: actor.name, byId: actor.id, phone, note } };
  return { ok: true, doc: activateIfDue({ ...doc, ibanChange: change }, now), change };
}

export function rejectChange(doc: PaymentDoc, changeId: string, actor: Actor, reason: string, now: Date): Result<PaymentDoc> {
  const c = doc.ibanChange;
  if (!c || c.id !== changeId) return { ok: false, error: "Cererea nu mai există sau a fost înlocuită de una nouă." };
  if (!pending(c)) return { ok: false, error: "Cererea a fost deja tratată." };
  if (reason.trim().length < 3) return { ok: false, error: "Scrie motivul." };
  const change = close(c, "respins", actor, now, reason.trim());
  return { ok: true, doc: { ...doc, ibanChange: change }, change };
}

/** „Nu am cerut eu”: oricine din gospodărie sau din PUII MEI anulează cererea în curs. */
export function cancelChange(doc: PaymentDoc, changeId: string, actor: Actor, now: Date): Result<PaymentDoc> {
  const c = doc.ibanChange;
  if (!c || c.id !== changeId) return { ok: false, error: "Cererea nu mai există sau a fost înlocuită de una nouă." };
  if (!pending(c)) return { ok: false, error: "Cererea a fost deja tratată." };
  const change = close(c, "anulat", actor, now, "Raportată ca necerută („Nu am cerut eu”)");
  return { ok: true, doc: { ...doc, ibanChange: change }, change };
}

/** Contul confirmat devine activ după termen. Idempotent. */
export function activateIfDue(doc: PaymentDoc, now: Date): PaymentDoc {
  const c = doc.ibanChange;
  if (!c || c.status !== "confirmat" || now.getTime() < Date.parse(c.activatesAfter)) return doc;
  return { ...doc, holder: c.holder, iban: c.iban, bank: c.bank, ibanChange: { ...c, status: "activ", closedAt: now.toISOString() } };
}

/** Ce văd clienții: numai contul activ; null dacă gospodăria nu are încă un cont verificat. */
export function payableAccount(doc: Pick<PaymentDoc, "holder" | "iban" | "bank"> | null): BankIdentity | null {
  return doc && doc.iban ? { holder: doc.holder, iban: doc.iban, bank: doc.bank } : null;
}

/** IBAN românesc normalizat (fără spații, majuscule) sau null: format RO + cifra de control corectă (mod 97, ISO 13616). */
export function normalizeIban(raw: string): string | null {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(iban)) return null;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const v = ch >= "A" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1 ? iban : null;
}

/** IBAN mascat pentru notificări și jurnal: doar ultimele 4 caractere. */
export const maskIban = (iban: string) => (iban ? `${iban.slice(0, 4)} •••• ${iban.slice(-4)}` : "—");
