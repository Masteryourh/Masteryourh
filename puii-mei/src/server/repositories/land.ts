import "server-only";
import type { FarmLand } from "@/lib/governance";
import { store } from "@/server/db/store";

const COLLECTION = "farm-land";

/** Suprafața pentru creștere a gospodăriilor (declarată + confirmată). */
export const landRepository = {
  bySlug: (slug: string) => store.get<FarmLand>(COLLECTION, slug),
  list: () => store.list<FarmLand>(COLLECTION),
  async save(l: FarmLand): Promise<FarmLand> {
    const existing = await store.get<FarmLand>(COLLECTION, l.id);
    if (existing) return (await store.update<FarmLand>(COLLECTION, l.id, l)) ?? l;
    return store.append(COLLECTION, l);
  },
};
