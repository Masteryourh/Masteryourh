import "server-only";
import { randomUUID } from "node:crypto";
import type { GrowthEntry } from "@/lib/growth-log";
import { store } from "@/server/db/store";

const COLLECTION = "growth-log";

/** Jurnalul de creștere: doar adăugare (nu se modifică, nu se șterge). */
export const growthLogRepository = {
  create: (e: Omit<GrowthEntry, "id" | "at">) => store.append<GrowthEntry>(COLLECTION, { ...e, id: randomUUID(), at: new Date().toISOString() }),
  async list(): Promise<GrowthEntry[]> {
    return (await store.list<GrowthEntry>(COLLECTION)).sort((a, b) => b.at.localeCompare(a.at));
  },
  async byLot(code: string) {
    return (await store.findBy<GrowthEntry>(COLLECTION, "lotCode", code)).sort((a, b) => b.at.localeCompare(a.at));
  },
  async byFarm(slug: string) {
    return (await store.findBy<GrowthEntry>(COLLECTION, "farmSlug", slug)).sort((a, b) => b.at.localeCompare(a.at));
  },
};
