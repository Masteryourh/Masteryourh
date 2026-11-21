"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { DocumentCategory, ExpenseCategory, User } from "@/lib/domain";
import { documentCategoryLabels, expenseCategoryLabels, isIncomeCategory } from "@/lib/documents";
import { requireRole } from "@/server/auth";
import { canManageFarm } from "@/server/delivery";
import { lotRepository } from "@/server/repositories/catalog";
import { documentRepository, expenseRepository, saveUpload } from "@/server/repositories/documents";

const actor = (u: User) => `${u.name} (${u.role})`;
const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function backUrl(user: User, farmSlug: string, params: string) {
  const base = `/cont/gospodar/documente${user.role === "admin" ? `?gospodarie=${encodeURIComponent(farmSlug)}&` : "?"}`;
  return `${base}${params}`;
}

async function checkLot(farmSlug: string, lotCode: string) {
  if (!lotCode) return undefined;
  const lot = await lotRepository.byCode(lotCode, { all: true });
  if (!lot || lot.farmSlug !== farmSlug) throw new Error("Lot invalid");
  return lot.code;
}

const refresh = () => {
  revalidatePath("/cont", "layout");
  revalidatePath("/admin", "layout");
};

/** Încarcă un document justificativ (factură, aviz, DSV, contract…). */
export async function uploadDocumentAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const farmSlug = t(formData, "farmSlug");
  if (!canManageFarm(user, farmSlug)) throw new Error("Neautorizat");
  let error = "";
  try {
    const category = t(formData, "category") as DocumentCategory;
    if (!(category in documentCategoryLabels)) throw new Error("Alege tipul documentului.");
    const title = t(formData, "title");
    if (title.length < 3) throw new Error("Scrie un titlu scurt pentru document.");
    const date = t(formData, "date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Alege data documentului.");
    const lotCode = await checkLot(farmSlug, t(formData, "lotCode"));
    const file = await saveUpload(formData.get("file") as File, actor(user));
    await documentRepository.create({
      farmSlug,
      lotCode,
      category,
      title,
      number: t(formData, "number") || undefined,
      date,
      fileId: file.id,
      fileName: file.name,
      mime: file.mime,
      size: file.size,
      sha256: file.sha256,
      uploadedBy: actor(user),
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Nu s-a putut salva.";
  }
  refresh();
  redirect(backUrl(user, farmSlug, error ? `eroare=${encodeURIComponent(error)}#documente` : "salvat=document#documente"));
}

/**
 * Adaugă o cheltuială sau un venit în registru. Totul e fiscalizat: numărul documentului
 * fiscal (factură, bon, chitanță) și documentul atașat sunt obligatorii.
 */
export async function addExpenseAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const farmSlug = t(formData, "farmSlug");
  if (!canManageFarm(user, farmSlug)) throw new Error("Neautorizat");
  let error = "";
  let income = false;
  try {
    const category = t(formData, "category") as ExpenseCategory;
    if (!(category in expenseCategoryLabels)) throw new Error("Alege categoria.");
    income = isIncomeCategory(category);
    const date = t(formData, "date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Alege data documentului.");
    const amount = Math.round(Number(t(formData, "amount").replace(/\s/g, "").replace(",", ".")) * 100) / 100;
    if (!(amount > 0 && amount < 1_000_000)) throw new Error("Suma trebuie să fie mai mare decât 0.");
    const supplier = t(formData, "supplier");
    if (supplier.length < 2) throw new Error(income ? "Scrie clientul." : "Scrie furnizorul.");
    const invoiceNumber = t(formData, "number");
    if (invoiceNumber.length < 1) throw new Error("Numărul documentului fiscal (factură, bon, chitanță) este obligatoriu.");
    const upload = formData.get("file") as File | null;
    if (!upload || upload.size === 0) throw new Error("Atașează documentul fiscal (PDF sau poză).");
    const lotCode = await checkLot(farmSlug, t(formData, "lotCode"));
    const file = await saveUpload(upload, actor(user));
    const doc = await documentRepository.create({
      farmSlug,
      lotCode,
      category: "factura",
      title: `${income ? "Venit" : "Cheltuială"} · ${expenseCategoryLabels[category]} – ${supplier}`,
      number: invoiceNumber,
      date,
      fileId: file.id,
      fileName: file.name,
      mime: file.mime,
      size: file.size,
      sha256: file.sha256,
      uploadedBy: actor(user),
    });
    await expenseRepository.create({
      farmSlug,
      kind: income ? "venit" : "cheltuiala",
      invoiceNumber,
      lotCode,
      date,
      category,
      supplier,
      description: t(formData, "description"),
      amount,
      documentId: doc.id,
      createdBy: actor(user),
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Nu s-a putut salva.";
  }
  refresh();
  redirect(backUrl(user, farmSlug, error ? `eroare=${encodeURIComponent(error)}#cheltuieli` : `salvat=${income ? "venit" : "cheltuiala"}#cheltuieli`));
}

/** Anulează o cheltuială greșită (rămâne în registru, tăiată, cu motivul). */
export async function voidExpenseAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const expense = await expenseRepository.get(t(formData, "id"));
  if (!expense || !canManageFarm(user, expense.farmSlug)) throw new Error("Neautorizat");
  const reason = t(formData, "reason");
  if (!expense.voided && reason.length >= 3) {
    await expenseRepository.void(expense.id, { at: new Date().toISOString(), by: actor(user), reason });
  }
  refresh();
  redirect(backUrl(user, expense.farmSlug, reason.length < 3 ? `eroare=${encodeURIComponent("Scrie motivul anulării.")}#cheltuieli` : "salvat=anulare#cheltuieli"));
}

/** Adminul confirmă că a verificat documentul (original, sumă, dată). */
export async function verifyDocumentAction(formData: FormData) {
  const user = await requireRole(["admin"]);
  const doc = await documentRepository.get(t(formData, "id"));
  if (doc && !doc.verifiedAt) await documentRepository.verify(doc.id, actor(user));
  refresh();
  const back = t(formData, "inapoi");
  redirect(back.startsWith("/") ? back : "/admin/documente");
}
