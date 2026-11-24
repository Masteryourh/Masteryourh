import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { Preorder, PreorderStatus } from "@/lib/domain";
import { store } from "@/server/db/store";

const COLLECTION = "preorders";

export type NewPreorder = Omit<Preorder, "id" | "number" | "createdAt" | "status" | "trackingToken" | "feedPayment">;

export const newTrackingToken = () => randomBytes(18).toString("base64url");

export interface PreorderRepository {
  create(data: NewPreorder): Promise<Preorder>;
  list(): Promise<Preorder[]>;
  updateStatus(id: string, status: PreorderStatus): Promise<Preorder | null>;
  update(id: string, patch: Partial<Preorder>): Promise<Preorder | null>;
  byId(id: string): Promise<Preorder | null>;
  byTrackingToken(token: string): Promise<Preorder | null>;
  byNumber(number: string): Promise<Preorder | null>;
  byLots(codes: string[]): Promise<Preorder[]>;
  family(rootNumber: string): Promise<Preorder[]>;
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
      trackingToken: newTrackingToken(),
      feedPayment: { status: "de-platit" },
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
    return store.get<Preorder>(COLLECTION, id);
  },
  async byTrackingToken(token) {
    if (!token || token.length < 16) return null;
    return (await store.findBy<Preorder>(COLLECTION, "trackingToken", token))[0] ?? null;
  },
  async byNumber(number) {
    const n = number.trim().toUpperCase();
    return (await store.findBy<Preorder>(COLLECTION, "number", n))[0] ?? null;
  },
  /** Comenzile de pe loturile date (toate stările), în ordinea creării. */
  async byLots(codes: string[]) {
    return store.findBy<Preorder>(COLLECTION, "lotCode", codes);
  },
  /** Comanda inițială și părțile ei (după împărțire), în ordinea creării. */
  async family(rootNumber: string) {
    const [root, parts] = await Promise.all([this.byNumber(rootNumber), store.findBy<Preorder>(COLLECTION, "parentNumber", rootNumber)]);
    return [...(root ? [root] : []), ...parts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
};
