import "server-only";
import { randomUUID } from "node:crypto";
import type { ContactMessage } from "@/lib/domain";
import { store } from "@/server/db/store";

const COLLECTION = "contact-messages";

export const contactRepository = {
  async create(data: Omit<ContactMessage, "id" | "createdAt">) {
    const msg: ContactMessage = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
    return store.append(COLLECTION, msg);
  },
  async list() {
    const items = await store.list<ContactMessage>(COLLECTION);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  /** Cele mai noi mesaje, pe pagini. */
  page: (limit: number, after?: string | null) => store.page<ContactMessage>(COLLECTION, { limit, after }),
  async count() {
    return (await store.aggregate(COLLECTION, { sum: [] })).reduce((s, g) => s + g.count, 0);
  },
};
