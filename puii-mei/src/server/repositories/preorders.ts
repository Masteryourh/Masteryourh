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
  /** Cele mai noi comenzi, pe pagini (cursor). */
  page(limit: number, after?: string | null): Promise<{ items: Preorder[]; next: string | null }>;
  /** Căutare după număr, nume, telefon sau e-mail (cel mult 50, cele mai noi întâi). */
  search(term: string): Promise<Preorder[]>;
  /** Totaluri pentru comenzile neanulate, calculate în baza de date. */
  activeTotals(): Promise<{ count: number; birds: number; value: number }>;
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
  page(limit, after) {
    return store.page<Preorder>(COLLECTION, { limit, after });
  },
  async search(term) {
    const t = term.trim().slice(0, 80);
    if (t.length < 2) return [];
    // Numărul exact merge prin index; altfel căutare în nume / telefon / e-mail (și cifrele telefonului fără spații).
    const exact = await this.byNumber(t);
    if (exact) return [exact];
    const digits = t.replace(/\D/g, "");
    const byText = await store.search<Preorder>(COLLECTION, ["number", "customer.name", "customer.phone", "customer.email"], t, 50);
    if (digits.length < 4 || byText.length) return byText;
    // Telefon scris altfel decât la comandă (ex. „0722123456” vs „0722 123 456”): comparăm doar cifrele.
    return store.search<Preorder>(COLLECTION, ["customer.phone"], digits, 50, { digitsOnly: true });
  },
  async activeTotals() {
    const [g] = await store.aggregate(COLLECTION, { sum: ["birds", "estimate.total"], exclude: { field: "status", values: ["anulata"] } });
    return { count: g?.count ?? 0, birds: g?.sums.birds ?? 0, value: g?.sums["estimate.total"] ?? 0 };
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
