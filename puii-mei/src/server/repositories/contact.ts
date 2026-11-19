import "server-only";
import { randomUUID } from "node:crypto";
import type { ContactMessage } from "@/lib/domain";
import { jsonStore } from "@/server/db/json-store";

const COLLECTION = "contact-messages";

export const contactRepository = {
  async create(data: Omit<ContactMessage, "id" | "createdAt">) {
    const msg: ContactMessage = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
    return jsonStore.append(COLLECTION, msg);
  },
  async list() {
    const items = await jsonStore.list<ContactMessage>(COLLECTION);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};
