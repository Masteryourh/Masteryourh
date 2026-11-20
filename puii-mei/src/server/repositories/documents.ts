import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Expense, FarmDocument, Investment, StoredFile } from "@/lib/domain";
import { FILE_LIMITS } from "@/lib/documents";
import { store } from "@/server/db/store";

const FILES = "files";
const DOCS = "documents";
const EXPENSES = "expenses";
const INVESTMENTS = "investments";

const byDateDesc = <T extends { date: string; id: string }>(a: T, b: T) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);

/** Salvează un fișier încărcat și îi calculează amprenta SHA-256. */
export async function saveUpload(file: File, uploadedBy: string): Promise<StoredFile> {
  if (!file || file.size === 0) throw new Error("Alege un fișier.");
  if (file.size > FILE_LIMITS.maxBytes) throw new Error("Fișierul e prea mare (maximum 3,5 MB). Scanează-l la rezoluție mai mică sau ca PDF.");
  const mime = file.type || "application/octet-stream";
  if (!FILE_LIMITS.mimes.includes(mime)) throw new Error("Tip de fișier neacceptat. Folosește PDF, imagine, Word sau Excel.");
  const buf = Buffer.from(await file.arrayBuffer());
  const stored: StoredFile = {
    id: randomUUID(),
    name: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "document",
    mime,
    size: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
    data: buf.toString("base64"),
    uploadedAt: new Date().toISOString(),
    uploadedBy,
  };
  return store.append(FILES, stored);
}

export const fileRepository = {
  get: (id: string) => store.get<StoredFile>(FILES, id),
};

export const documentRepository = {
  async create(doc: Omit<FarmDocument, "id" | "uploadedAt">): Promise<FarmDocument> {
    return store.append(DOCS, { ...doc, id: randomUUID(), uploadedAt: new Date().toISOString() });
  },
  async list(): Promise<FarmDocument[]> {
    return (await store.list<FarmDocument>(DOCS)).sort(byDateDesc);
  },
  async byFarm(slug: string) {
    return (await this.list()).filter((d) => d.farmSlug === slug);
  },
  async byInvestment(id: string) {
    return (await this.list()).filter((d) => d.investmentId === id);
  },
  async byFileId(fileId: string) {
    return (await store.list<FarmDocument>(DOCS)).find((d) => d.fileId === fileId) ?? null;
  },
  get: (id: string) => store.get<FarmDocument>(DOCS, id),
  verify: (id: string, by: string) => store.update<FarmDocument>(DOCS, id, { verifiedAt: new Date().toISOString(), verifiedBy: by }),
};

export const expenseRepository = {
  async create(e: Omit<Expense, "id" | "createdAt">): Promise<Expense> {
    return store.append(EXPENSES, { ...e, id: randomUUID(), createdAt: new Date().toISOString() });
  },
  async byFarm(slug: string): Promise<Expense[]> {
    return (await store.list<Expense>(EXPENSES)).filter((e) => e.farmSlug === slug).sort(byDateDesc);
  },
  get: (id: string) => store.get<Expense>(EXPENSES, id),
  void: (id: string, voided: Expense["voided"]) => store.update<Expense>(EXPENSES, id, { voided }),
};

export const investmentRepository = {
  async create(i: Omit<Investment, "id" | "createdAt">): Promise<Investment> {
    return store.append(INVESTMENTS, { ...i, id: randomUUID(), createdAt: new Date().toISOString() });
  },
  async list(): Promise<Investment[]> {
    return (await store.list<Investment>(INVESTMENTS)).sort(byDateDesc);
  },
  async byInvestor(investorId: string) {
    return (await this.list()).filter((i) => i.investorId === investorId);
  },
  get: (id: string) => store.get<Investment>(INVESTMENTS, id),
  update: (id: string, patch: Partial<Investment>) => store.update<Investment>(INVESTMENTS, id, patch),
};

/** Totalurile registrului de cheltuieli (fără cele anulate), pe lot și pe categorie. */
export function expenseTotals(expenses: Expense[]) {
  const valid = expenses.filter((e) => !e.voided);
  const byLot = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const e of valid) {
    byLot.set(e.lotCode ?? "", (byLot.get(e.lotCode ?? "") ?? 0) + e.amount);
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  return { total: valid.reduce((s, e) => s + e.amount, 0), byLot, byCategory, count: valid.length };
}
