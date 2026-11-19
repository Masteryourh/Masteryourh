import "server-only";
import { randomUUID } from "node:crypto";
import type { InterestSignup } from "@/lib/domain";
import { store } from "@/server/db/store";

const COLLECTION = "interest-signups";

export const interestRepository = {
  async create(data: Omit<InterestSignup, "id" | "createdAt">) {
    const item: InterestSignup = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
    return store.append(COLLECTION, item);
  },
  async list() {
    const items = await store.list<InterestSignup>(COLLECTION);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};
