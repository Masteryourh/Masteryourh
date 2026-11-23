import "server-only";
import { store } from "./db/store";
import { lotSeatBasis } from "./repositories/catalog";

/**
 * Registrul de locuri al fiecărui lot (CG-04): cine ocupă câte locuri. Fiecare rezervare citește, verifică și scrie
 * registrul într-o singură tranzacție (`store.transact`: SELECT … FOR UPDATE pe Postgres), deci cererile simultane nu
 * pot ocupa mai multe locuri decât are lotul. Toate căile care pun sau scot o precomandă de pe un lot trec pe aici.
 *
 * Registrul se creează la prima folosire, din precomenzile deja alocate. Dacă rămâne în urmă (ex. o anulare fără
 * eliberare), greșește spre siguranță: un loc rămâne ocupat, nu se vinde de două ori; la următoarea rezervare,
 * precomenzile anulate sau mutate pe alt lot sunt scoase.
 */
const SEATS = "lot-seats";
type SeatLedger = { id: string; capacity: number; allocations: Record<string, number>; updatedAt: string };

const used = (a: Record<string, number>) => Object.values(a).reduce((s, n) => s + n, 0);

async function initial(code: string): Promise<{ ledger: SeatLedger; stale: string[]; baseReserved: number } | null> {
  const basis = await lotSeatBasis(code);
  if (!basis) return null;
  return {
    ledger: { id: code, capacity: basis.capacity, allocations: basis.allocations, updatedAt: new Date().toISOString() },
    stale: basis.stale,
    baseReserved: basis.baseReserved,
  };
}

/** Ocupă `birds` locuri pe lot pentru precomandă. `false` = nu mai e loc (nimic nu se schimbă). Idempotent. */
export async function reserveSeats(code: string, preorderId: string, birds: number): Promise<boolean> {
  const init = await initial(code);
  if (!init) return false;
  return store.transact<SeatLedger, boolean>(
    SEATS,
    code,
    (cur) => {
      const ledger = cur ?? init.ledger;
      const alloc = { ...ledger.allocations };
      for (const id of init.stale) if (id !== preorderId) delete alloc[id];
      delete alloc[preorderId];
      if (used(alloc) + birds > ledger.capacity) return { result: false };
      alloc[preorderId] = birds;
      return { patch: { allocations: alloc, updatedAt: new Date().toISOString() }, result: true };
    },
    init.ledger,
  );
}

/** Eliberează locurile precomenzii (anulare, mutare pe alt lot). */
export async function releaseSeats(code: string, preorderId: string): Promise<void> {
  await store.transact<SeatLedger, void>(SEATS, code, (cur) => {
    if (!cur || !(preorderId in cur.allocations)) return { result: undefined };
    const alloc = { ...cur.allocations };
    delete alloc[preorderId];
    return { patch: { allocations: alloc, updatedAt: new Date().toISOString() }, result: undefined };
  });
}

/** Schimbă numărul total de păsări al lotului; refuză dacă ar rămâne sub locurile deja ocupate. */
export async function setLotCapacity(code: string, totalBirds: number): Promise<{ ok: true } | { ok: false; used: number }> {
  const init = await initial(code);
  if (!init) return { ok: true };
  const capacity = Math.max(0, totalBirds - init.baseReserved);
  return store.transact<SeatLedger, { ok: true } | { ok: false; used: number }>(
    SEATS,
    code,
    (cur) => {
      const ledger = cur ?? init.ledger;
      const alloc = { ...ledger.allocations };
      for (const id of init.stale) delete alloc[id];
      const u = used(alloc);
      if (u > capacity) return { result: { ok: false, used: u + init.baseReserved } };
      return { patch: { capacity, allocations: alloc, updatedAt: new Date().toISOString() }, result: { ok: true } };
    },
    init.ledger,
  );
}
