/**
 * Logica registrului de locuri al unui lot (CG-04), fără acces la baza de date: funcții pure, testate unitar.
 * `seats.ts` le aplică în interiorul unei tranzacții (`store.transact`), pe registrul blocat cu SELECT … FOR UPDATE.
 *
 * Rezervarea locurilor și scrierea lotului pe precomandă sunt DOUĂ tranzacții separate (registrul, apoi precomanda).
 * Nu e atomicitate cap-coadă. De aceea, la fiecare operație, registrul se **reconciliază** cu o imagine a precomenzilor:
 * - precomandă anulată sau mutată pe alt lot → locurile ei se eliberează;
 * - rezervare fără lot scris pe precomandă (cererea a căzut între cele două tranzacții) → eliberată după `GRACE_MS`;
 * - precomandă cu lotul scris, dar lipsă din registru (date istorice, import) → adoptată, chiar peste capacitate
 *   (adevărul din comenzi primează; depășirea se raportează de `seatViolation`, nu se ascunde).
 */
export const GRACE_MS = 10 * 60_000;

export type SeatLedger = {
  id: string;
  capacity: number;
  allocations: Record<string, number>;
  reservedAt?: Record<string, string>;
  updatedAt: string;
};

/** Imaginea precomenzilor citită înainte de tranzacție (doar câmpurile necesare). */
export type PreorderSnapshot = { id: string; lotCode: string | null; birds: number; status: string }[];

export const usedSeats = (l: Pick<SeatLedger, "allocations">) => Object.values(l.allocations).reduce((s, n) => s + n, 0);

export function emptyLedger(code: string, capacity: number, now: Date): SeatLedger {
  return { id: code, capacity, allocations: {}, reservedAt: {}, updatedAt: now.toISOString() };
}

export function reconcile(ledger: SeatLedger, snapshot: PreorderSnapshot, now: Date): SeatLedger {
  const code = ledger.id;
  const byId = new Map(snapshot.map((p) => [p.id, p]));
  const allocations: Record<string, number> = {};
  const reservedAt: Record<string, string> = {};
  for (const [id, birds] of Object.entries(ledger.allocations)) {
    const p = byId.get(id);
    const at = ledger.reservedAt?.[id];
    if (p && (p.status === "anulata" || (p.lotCode && p.lotCode !== code))) continue; // anulată / mutată
    const written = p?.lotCode === code;
    const fresh = at !== undefined && now.getTime() - Date.parse(at) < GRACE_MS;
    if (!written && !fresh) continue; // rezervare rămasă fără lot scris pe precomandă
    allocations[id] = written ? p!.birds : birds;
    if (at) reservedAt[id] = at;
  }
  for (const p of snapshot) {
    if (p.lotCode === code && p.status !== "anulata" && !(p.id in allocations)) allocations[p.id] = p.birds; // adoptată
  }
  return { ...ledger, allocations, reservedAt, updatedAt: now.toISOString() };
}

/** Ocupă locuri pentru precomandă. Idempotent: aceeași precomandă se numără o singură dată. */
export function reserve(ledger: SeatLedger, snapshot: PreorderSnapshot, preorderId: string, birds: number, now: Date) {
  const l = reconcile(ledger, snapshot, now);
  const allocations = { ...l.allocations };
  const reservedAt = { ...l.reservedAt };
  delete allocations[preorderId];
  if (usedSeats({ allocations }) + birds > l.capacity) return { ok: false as const, ledger: l };
  allocations[preorderId] = birds;
  reservedAt[preorderId] = now.toISOString();
  return { ok: true as const, ledger: { ...l, allocations, reservedAt } };
}

export function release(ledger: SeatLedger, preorderId: string, now: Date): SeatLedger | null {
  if (!(preorderId in ledger.allocations)) return null;
  const allocations = { ...ledger.allocations };
  const reservedAt = { ...ledger.reservedAt };
  delete allocations[preorderId];
  delete reservedAt[preorderId];
  return { ...ledger, allocations, reservedAt, updatedAt: now.toISOString() };
}

/** Schimbă capacitatea; refuză dacă ar rămâne sub locurile ocupate. */
export function setCapacity(ledger: SeatLedger, snapshot: PreorderSnapshot, capacity: number, now: Date) {
  const l = reconcile(ledger, snapshot, now);
  const used = usedSeats(l);
  if (used > capacity) return { ok: false as const, used, ledger: l };
  return { ok: true as const, used, ledger: { ...l, capacity } };
}

/** Invariantul `ocupat ≤ capacitate`; null = respectat. */
export function seatViolation(ledger: SeatLedger) {
  const used = usedSeats(ledger);
  return used > ledger.capacity ? { lot: ledger.id, used, capacity: ledger.capacity } : null;
}
