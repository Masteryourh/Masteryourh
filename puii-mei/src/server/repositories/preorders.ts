import "server-only";
import { randomUUID } from "node:crypto";
import type { Preorder, PreorderStatus } from "@/lib/domain";
import { store } from "@/server/db/store";

const COLLECTION = "preorders";

export type NewPreorder = Omit<Preorder, "id" | "number" | "createdAt" | "status">;

export interface PreorderRepository {
  create(data: NewPreorder): Promise<Preorder>;
  list(): Promise<Preorder[]>;
  updateStatus(id: string, status: PreorderStatus): Promise<Preorder | null>;
  update(id: string, patch: Partial<Preorder>): Promise<Preorder | null>;
  byId(id: string): Promise<Preorder | null>;
}

function generateNumber(now: Date) {
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase();
  return `PM${yymm}-${rand}`;
}

export const preorderRepository: PreorderRepository = {
  async create(data) {
    const now = new Date();
    const preorder: Preorder = {
      ...data,
      id: randomUUID(),
      number: generateNumber(now),
      createdAt: now.toISOString(),
      status: "noua",
    };
    return store.append(COLLECTION, preorder);
  },
  async list() {
    const items = await store.list<Preorder>(COLLECTION);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async updateStatus(id, status) {
    return store.update<Preorder>(COLLECTION, id, { status });
  },
  async update(id, patch) {
    return store.update<Preorder>(COLLECTION, id, patch);
  },
  async byId(id) {
    return (await store.list<Preorder>(COLLECTION)).find((p) => p.id === id) ?? null;
  },
};
