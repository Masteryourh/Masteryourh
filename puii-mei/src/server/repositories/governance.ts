import "server-only";
import type { FarmGovernance } from "@/lib/governance";
import { store } from "@/server/db/store";

const COLLECTION = "farm-governance";

/** Regimul gospodăriilor (limite proprii, avertizări, suspendări, excluderi). */
export const governanceRepository = {
  async bySlug(slug: string): Promise<FarmGovernance | null> {
    return store.get<FarmGovernance>(COLLECTION, slug);
  },
  async list(): Promise<FarmGovernance[]> {
    return store.list<FarmGovernance>(COLLECTION);
  },
  async save(g: FarmGovernance): Promise<FarmGovernance> {
    const existing = await store.get<FarmGovernance>(COLLECTION, g.id);
    if (existing) return (await store.update<FarmGovernance>(COLLECTION, g.id, g)) ?? g;
    return store.append(COLLECTION, g);
  },
};
