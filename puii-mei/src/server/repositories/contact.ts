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
};
