import "server-only";
import { after } from "next/server";
import { companyMetrics, type CompanyMetrics } from "@/lib/metrics";
import { store } from "./db/store";
import { farmRepository, lotRepository } from "./repositories/catalog";
import { expenseRepository, investmentRepository } from "./repositories/documents";
import { preorderRepository } from "./repositories/preorders";

/**
 * Read-model pentru /cifre (mandat #62, 28.11.2026): pagina citește UN document precalculat (`read-models/cifre`),
 * nu toate comenzile, cheltuielile și investițiile. Recalcularea (aceeași funcție `companyMetrics`, deci aceleași
 * cifre) se face cel mult o dată la MAX_AGE, în fundal după răspuns (stale-while-revalidate), cu un singur
 * calculator odată (lease prin `store.transact` / FOR UPDATE). Prima cerere, fără instantaneu, calculează pe loc.
 */
const COLLECTION = "read-models";
const ID = "cifre";
export const MAX_AGE_MS = 5 * 60_000;
const LEASE_MS = 2 * 60_000;

type Snapshot = { id: string; metrics: CompanyMetrics | null; computedAt: string | null; refreshingUntil?: string | null };

export async function computeMetrics(now = new Date()) {
  const [farms, lots, preorders, expenses, investments] = await Promise.all([
    farmRepository.list(),
    lotRepository.list({ all: true }),
    preorderRepository.list(),
    expenseRepository.list(),
    investmentRepository.list(),
  ]);
  return { metrics: companyMetrics({ farms, lots: lots.filter((l) => l.approval?.status !== "respins"), preorders, expenses, investments }, now), farms };
}

async function save(metrics: CompanyMetrics, now: Date) {
  await store.transact<Snapshot, void>(COLLECTION, ID, () => ({ patch: { metrics, computedAt: now.toISOString(), refreshingUntil: null }, result: undefined }), {
    id: ID,
    metrics: null,
    computedAt: null,
  });
}

/** Revendică recalcularea: doar un apel o primește cât timp lease-ul e valabil. */
async function claimRefresh(now: Date) {
  return store.transact<Snapshot, boolean>(
    COLLECTION,
    ID,
    (cur) => {
      const stale = !cur?.computedAt || now.getTime() - Date.parse(cur.computedAt) >= MAX_AGE_MS;
      const leased = cur?.refreshingUntil && Date.parse(cur.refreshingUntil) > now.getTime();
      return stale && !leased ? { patch: { refreshingUntil: new Date(now.getTime() + LEASE_MS).toISOString() }, result: true } : { result: false };
    },
    { id: ID, metrics: null, computedAt: null },
  );
}

export async function refreshMetrics(now = new Date()) {
  const { metrics } = await computeMetrics(now);
  await save(metrics, now);
  return metrics;
}

/** Cifrele publice: din instantaneu (O(1) la citire); vechi ⇒ servite așa și recalculate în fundal. */
export async function publicMetrics(now = new Date()): Promise<{ metrics: CompanyMetrics; computedAt: string }> {
  const snap = await store.get<Snapshot>(COLLECTION, ID);
  if (!snap?.metrics || !snap.computedAt) {
    const metrics = await refreshMetrics(now);
    return { metrics, computedAt: now.toISOString() };
  }
  if (now.getTime() - Date.parse(snap.computedAt) >= MAX_AGE_MS && (await claimRefresh(now))) {
    after(async () => {
      try {
        await refreshMetrics(new Date());
      } catch (err) {
        // Lease-ul expiră singur; următoarea cerere reîncearcă.
        console.error("[puii-mei] recalcularea cifrelor a eșuat", err);
      }
    });
  }
  return { metrics: snap.metrics, computedAt: snap.computedAt };
}
