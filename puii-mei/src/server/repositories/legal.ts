import "server-only";
import { randomUUID } from "node:crypto";
import { legalSeed } from "@/data/legal";
import type { LegalEntry } from "@/lib/legal";
import { store } from "@/server/db/store";

const COLLECTION = "legal";

/** Biblioteca de legislație și surse. La prima folosire se completează cu sursele inițiale. */
export const legalRepository = {
  async list({ includeArchived = false } = {}): Promise<LegalEntry[]> {
    let items = await store.list<LegalEntry>(COLLECTION);
    if (!items.length) {
      const now = new Date().toISOString();
      for (const s of legalSeed) await store.append<LegalEntry>(COLLECTION, { ...s, createdAt: now, createdBy: "Puii mei (surse inițiale)" });
      items = await store.list<LegalEntry>(COLLECTION);
    }
    return items
      .filter((e) => includeArchived || !e.archived)
      .sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt));
  },
  get: (id: string) => store.get<LegalEntry>(COLLECTION, id),
  create: (e: Omit<LegalEntry, "id" | "createdAt">) => store.append<LegalEntry>(COLLECTION, { ...e, id: randomUUID(), createdAt: new Date().toISOString() }),
  update: (id: string, patch: Partial<LegalEntry>) => store.update<LegalEntry>(COLLECTION, id, { ...patch, updatedAt: new Date().toISOString() }),
};
