import "server-only";
import { store } from "@/server/db/store";
import { farms as demoFarms } from "@/data/farms";
import type { User } from "@/lib/domain";

/** Colecțiile golite complet la resetarea datelor de test. */
const WIPE = [
  "preorders", "lots", "photos", "files", "documents", "expenses", "investments", "growth-log",
  "tours", "tour-events", "parcels", "contact-messages", "farm-applications",
  "investor-applications", "interest-signups", "legal",
];
/** Setările pe gospodărie: se păstrează doar pentru gospodăriile create din admin. */
const PER_FARM = ["farm-governance", "farm-land", "farm-payments"];

/** Gospodăriile demo vechi → cele noi (conturile de gospodar rămân legate). */
const RENAMED: Record<string, string> = {
  "gospodaria-muresan": "gospodaria-hreniuc",
  "ferma-de-la-deal": "gospodaria-ciornei",
  "gospodaria-rusu": "gospodaria-bodnar",
};

/**
 * Șterge toate datele de test: precomenzi, loturi, poze, documente, registre, jurnale, livrări, plăți,
 * investiții, mesaje, legislația adăugată din admin. Păstrează conturile și gospodăriile create din admin.
 */
export async function resetTestData() {
  const removed: Record<string, number> = {};
  for (const c of WIPE) removed[c] = await store.remove(c);

  const adminFarms = new Set((await store.list<{ slug: string }>("farms")).map((f) => f.slug));
  for (const c of PER_FARM) {
    const ids = (await store.list<{ id: string }>(c)).filter((x) => !adminFarms.has(x.id)).map((x) => x.id);
    removed[c] = ids.length ? await store.remove(c, ids) : 0;
  }

  // Modificările gospodăriilor demo se păstrează; cele ale gospodăriilor demo vechi (care nu mai există) se șterg.
  const stale = (await store.list<{ id: string }>("farm-overrides")).filter((o) => !demoFarms.some((f) => f.slug === o.id)).map((o) => o.id);
  removed["farm-overrides"] = stale.length ? await store.remove("farm-overrides", stale) : 0;

  const valid = new Set([...adminFarms, ...demoFarms.map((f) => f.slug)]);
  let relinked = 0;
  for (const u of await store.list<User>("users")) {
    if (!u.farmSlug || valid.has(u.farmSlug)) continue;
    const next = RENAMED[u.farmSlug];
    const farm = demoFarms.find((f) => f.slug === next);
    await store.update<User>("users", u.id, {
      farmSlug: next,
      ...(farm && u.name.startsWith("Gospodar – ") ? { name: `Gospodar – ${farm.name}` } : {}),
    });
    relinked++;
  }
  return { removed, relinked, total: Object.values(removed).reduce((s, n) => s + n, 0) };
}
