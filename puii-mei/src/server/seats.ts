import "server-only";
import { store } from "./db/store";
import { lotSeatCapacity } from "./repositories/catalog";
import { emptyLedger, reconcile, release, reserve, seatViolation, setCapacity, type PreorderSnapshot, type SeatLedger } from "./seats-core";

/**
 * Registrul de locuri al fiecărui lot (CG-04), colecția `lot-seats`. Fiecare operație citește, verifică și scrie
 * registrul într-o singură tranzacție (`store.transact`: SELECT … FOR UPDATE pe Postgres, lacăt pe fișiere JSON), deci
 * cererile simultane nu pot ocupa mai multe locuri decât are lotul. Logica (inclusiv reconcilierea cu precomenzile)
 * e în `seats-core.ts`, testată unitar.
 *
 * Fără blocaje la pool-ul de 3 conexiuni: funcția din tranzacție nu face nicio altă interogare (imaginea precomenzilor
 * și capacitatea se citesc ÎNAINTE), deci cine ține rândul blocat nu are nevoie de o a doua conexiune.
 *
 * Imaginea precomenzilor e doar a LOTULUI (review #82, C1): comenzile cu lotul scris (index `lotCode`) + comenzile din
 * registru (după id, ca să vedem anulările și mutările pe alt lot). Înainte se citeau toate comenzile la fiecare
 * rezervare. Reconcilierea (seats-core.ts) folosește exact aceste comenzi, deci rezultatul e același.
 */
const SEATS = "lot-seats";

type SnapshotRow = { id: string; lotCode: string | null; birds: number; status: string };

/** Comenzile relevante pentru registrul unui lot: cele scrise pe lot + cele aflate deja în registru. */
async function lotSnapshot(code: string, ledger?: SeatLedger | null): Promise<PreorderSnapshot> {
  const cur = ledger === undefined ? await store.get<SeatLedger>(SEATS, code) : ledger;
  const onLot = await store.findBy<SnapshotRow>("preorders", "lotCode", code);
  const seen = new Set(onLot.map((p) => p.id));
  const others = await Promise.all(Object.keys(cur?.allocations ?? {}).filter((id) => !seen.has(id)).map((id) => store.get<SnapshotRow>("preorders", id)));
  return [...onLot, ...others.filter((p): p is SnapshotRow => p !== null)];
}

/** Ocupă `birds` locuri pe lot pentru precomandă. `false` = nu mai e loc (registrul nu primește precomanda). */
export async function reserveSeats(code: string, preorderId: string, birds: number): Promise<boolean> {
  const [cap, snap] = await Promise.all([lotSeatCapacity(code), lotSnapshot(code)]);
  if (!cap) return false;
  const now = new Date();
  return store.transact<SeatLedger, boolean>(
    SEATS,
    code,
    (cur) => {
      const r = reserve(cur ?? emptyLedger(code, cap.capacity, now), snap, preorderId, birds, now);
      return { patch: r.ledger, result: r.ok };
    },
    emptyLedger(code, cap.capacity, now),
  );
}

/** Eliberează locurile precomenzii (anulare, mutare pe alt lot). */
export async function releaseSeats(code: string, preorderId: string): Promise<void> {
  await store.transact<SeatLedger, void>(SEATS, code, (cur) => {
    const next = cur ? release(cur, preorderId, new Date()) : null;
    return { patch: next ?? undefined, result: undefined };
  });
}

/** Schimbă numărul total de păsări al lotului; refuză dacă ar rămâne sub locurile deja ocupate. */
export async function setLotCapacity(code: string, totalBirds: number): Promise<{ ok: true } | { ok: false; used: number }> {
  const [cap, snap] = await Promise.all([lotSeatCapacity(code, totalBirds), lotSnapshot(code)]);
  if (!cap) return { ok: true };
  const now = new Date();
  return store.transact<SeatLedger, { ok: true } | { ok: false; used: number }>(
    SEATS,
    code,
    (cur) => {
      const r = setCapacity(cur ?? emptyLedger(code, cap.capacity, now), snap, cap.capacity, now);
      return { patch: r.ledger, result: r.ok ? { ok: true } : { ok: false, used: r.used + cap.baseReserved } };
    },
    emptyLedger(code, cap.capacity, now),
  );
}

/**
 * Verificarea invariantului `ocupat ≤ capacitate` pe toate loturile cu comenzi, din registru reconciliat cu precomenzile
 * de acum (prinde și depășirile din date istorice). Doar raport: nu modifică nimic.
 */
export async function seatViolations() {
  // Loturile cu registru sau cu comenzi active (agregat în baza de date), fiecare verificat cu imaginea lui.
  const [ledgers, perLot] = await Promise.all([
    store.list<SeatLedger>(SEATS),
    store.aggregate("preorders", { sum: [], groupBy: "lotCode", exclude: { field: "status", values: ["anulata"] } }),
  ]);
  const byCode = new Map(ledgers.map((l) => [l.id, l]));
  const codes = new Set([...byCode.keys(), ...perLot.flatMap((g) => (g.key ? [g.key] : []))]);
  const now = new Date();
  const out = [];
  for (const code of codes) {
    const cap = await lotSeatCapacity(code);
    if (!cap) continue;
    const snap = await lotSnapshot(code, byCode.get(code) ?? null);
    const v = seatViolation(reconcile({ ...(byCode.get(code) ?? emptyLedger(code, cap.capacity, now)), capacity: cap.capacity }, snap, now));
    if (v) out.push(v);
  }
  return out;
}
