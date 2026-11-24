import "server-only";
import { randomUUID } from "node:crypto";
import type { Expense, FarmDocument, Investment, StoredFile } from "@/lib/domain";
import { FILE_LIMITS } from "@/lib/documents";
import { store } from "@/server/db/store";
import { readContent, sha256, storeContent } from "@/server/files/content";

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
  const id = randomUUID();
  const stored: StoredFile = {
    id,
    name: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "document",
    mime,
    size: buf.length,
    sha256: sha256(buf),
    ...(await storeContent("files", id, buf, mime)),
    uploadedAt: new Date().toISOString(),
    uploadedBy,
  };
  return store.append(FILES, stored);
}

export const fileRepository = {
  get: (id: string) => store.get<StoredFile>(FILES, id),
  /** Conținutul fișierului (din stocarea externă sau din baza de date), cu verificarea amprentei SHA-256. */
  content: (file: StoredFile) => readContent(file),
};

export const documentRepository = {
  async create(doc: Omit<FarmDocument, "id" | "uploadedAt">): Promise<FarmDocument> {
    return store.append(DOCS, { ...doc, id: randomUUID(), uploadedAt: new Date().toISOString() });
  },
  async list(): Promise<FarmDocument[]> {
    return (await store.list<FarmDocument>(DOCS)).sort(byDateDesc);
  },
  async byFarm(slug: string) {
    return (await store.findBy<FarmDocument>(DOCS, "farmSlug", slug)).sort(byDateDesc);
  },
  async byInvestment(id: string | string[]) {
    return (await store.findBy<FarmDocument>(DOCS, "investmentId", id)).sort(byDateDesc);
  },
  async byFileId(fileId: string) {
    return (await store.findBy<FarmDocument>(DOCS, "fileId", fileId))[0] ?? null;
  },
  get: (id: string) => store.get<FarmDocument>(DOCS, id),
  verify: (id: string, by: string) => store.update<FarmDocument>(DOCS, id, { verifiedAt: new Date().toISOString(), verifiedBy: by }),
};

export const expenseRepository = {
  async create(e: Omit<Expense, "id" | "createdAt">): Promise<Expense> {
    return store.append(EXPENSES, { ...e, id: randomUUID(), createdAt: new Date().toISOString() });
  },
  async list(): Promise<Expense[]> {
    return (await store.list<Expense>(EXPENSES)).sort(byDateDesc);
  },
  async byFarm(slug: string): Promise<Expense[]> {
    return (await store.findBy<Expense>(EXPENSES, "farmSlug", slug)).sort(byDateDesc);
  },
  get: (id: string) => store.get<Expense>(EXPENSES, id),
  void: (id: string, voided: Expense["voided"]) => store.update<Expense>(EXPENSES, id, { voided }),
  update: (id: string, patch: Partial<Expense>) => store.update<Expense>(EXPENSES, id, { ...patch, updatedAt: new Date().toISOString() }),
};

export const investmentRepository = {
  async create(i: Omit<Investment, "id" | "createdAt">): Promise<Investment> {
    return store.append(INVESTMENTS, { ...i, id: randomUUID(), createdAt: new Date().toISOString() });
  },
  async list(): Promise<Investment[]> {
    return (await store.list<Investment>(INVESTMENTS)).sort(byDateDesc);
  },
  async byInvestor(investorId: string) {
    return (await store.findBy<Investment>(INVESTMENTS, "investorId", investorId)).sort(byDateDesc);
  },
  async byFarm(slug: string) {
    return (await store.findBy<Investment>(INVESTMENTS, "farmSlug", slug)).sort(byDateDesc);
  },
  get: (id: string) => store.get<Investment>(INVESTMENTS, id),
  update: (id: string, patch: Partial<Investment>) => store.update<Investment>(INVESTMENTS, id, patch),
};

/**
 * Totalurile registrului (doar înregistrările confirmate, fără cele anulate): cheltuieli pe lot și pe categorie,
 * venituri pe lot, rezultatul (venituri − cheltuieli).
 */
export function expenseTotals(entries: Expense[]) {
  // Doar înregistrările confirmate intră în totaluri; ciornele se numără separat.
  const valid = entries.filter((e) => !e.voided && e.confirmedAt);
  const drafts = entries.filter((e) => !e.voided && !e.confirmedAt).length;
  const costs = valid.filter((e) => e.kind !== "venit");
  const incomes = valid.filter((e) => e.kind === "venit");
  const byLot = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const incomeByLot = new Map<string, number>();
  for (const e of costs) {
    byLot.set(e.lotCode ?? "", (byLot.get(e.lotCode ?? "") ?? 0) + e.amount);
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  for (const e of incomes) incomeByLot.set(e.lotCode ?? "", (incomeByLot.get(e.lotCode ?? "") ?? 0) + e.amount);
  const total = costs.reduce((s, e) => s + e.amount, 0);
  const income = incomes.reduce((s, e) => s + e.amount, 0);
  return { total, income, result: income - total, byLot, byCategory, incomeByLot, count: costs.length, incomeCount: incomes.length, drafts };
}
