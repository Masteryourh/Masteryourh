import "server-only";
import { store, storageKind } from "./db/store";
import { preorderRepository } from "./repositories/preorders";

/** Percentila p dintr-o listă sortată crescător. */
export const percentile = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null);

/**
 * Măsurători reale în mediul în care rulează aplicația (de ex. Vercel ↔ Neon): latența unui drum dus-întors la bază
 * (necesară pentru alegerea rândului relevant din benchmark-ul C3) și durata câtorva operații tipice. Doar citiri.
 */
export async function measureLatency(samples = 20) {
  const t0 = performance.now();
  const rtt = (await store.ping(samples)).sort((a, b) => a - b);
  const timed = async (fn: () => Promise<unknown>) => {
    const t = performance.now();
    await fn();
    return performance.now() - t;
  };
  const ops = {
    "Pagina de precomenzi (50)": await timed(() => preorderRepository.page(50)),
    "Totaluri precomenzi (agregat)": await timed(() => preorderRepository.activeTotals()),
    "Comandă după număr (index)": await timed(() => preorderRepository.byNumber("PM0000-XXXXX")),
  };
  return {
    storage: storageKind,
    region: process.env.VERCEL_REGION ?? null,
    at: new Date().toISOString(),
    rtt: { samples: rtt.length, min: rtt[0] ?? null, p50: percentile(rtt, 0.5), p95: percentile(rtt, 0.95), max: rtt.at(-1) ?? null },
    ops,
    totalMs: performance.now() - t0,
  };
}
