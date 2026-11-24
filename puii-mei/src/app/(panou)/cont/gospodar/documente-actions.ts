"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { DocumentCategory, ExpenseCategory, User } from "@/lib/domain";
import { documentCategoryLabels, expenseCategoryLabels, isIncomeCategory } from "@/lib/documents";
import { requireRole } from "@/server/auth";
import { canManageFarm } from "@/server/delivery";
import { lotRepository } from "@/server/repositories/catalog";
import { documentRepository, expenseRepository, saveUpload } from "@/server/repositories/documents";
import { auditedAction } from "@/server/audit";

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
async function uploadDocumentAction__impl(formData: FormData) {
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
    const expiresOn = t(formData, "expiresOn");
    if (expiresOn && (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || expiresOn < date)) throw new Error("Data de valabilitate trebuie să fie după data documentului.");
    const file = await saveUpload(formData.get("file") as File, actor(user));
    await documentRepository.create({
      farmSlug,
      lotCode,
      category,
      title,
      number: t(formData, "number") || undefined,
      date,
      ...(expiresOn ? { expiresOn } : {}),
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

function readEntry(formData: FormData) {
  const category = t(formData, "category") as ExpenseCategory;
  if (!(category in expenseCategoryLabels)) throw new Error("Alege categoria.");
  const income = isIncomeCategory(category);
  const date = t(formData, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Alege data documentului.");
  const amount = Math.round(Number(t(formData, "amount").replace(/\s/g, "").replace(",", ".")) * 100) / 100;
  if (!(amount > 0 && amount < 1_000_000)) throw new Error("Suma trebuie să fie mai mare decât 0.");
  const supplier = t(formData, "supplier");
  if (supplier.length < 2) throw new Error(income ? "Scrie clientul." : "Scrie furnizorul.");
  return { category, income, date, amount, supplier, invoiceNumber: t(formData, "number"), description: t(formData, "description") };
}

/** Atașează documentul fiscal (dacă s-a ales un fișier) și întoarce id-ul lui. */
async function attachFiscalDocument(formData: FormData, user: User, farmSlug: string, e: { income: boolean; category: ExpenseCategory; supplier: string; invoiceNumber: string; date: string; lotCode?: string }) {
  const upload = formData.get("file") as File | null;
  if (!upload || upload.size === 0) return undefined;
  const file = await saveUpload(upload, actor(user));
  const doc = await documentRepository.create({
    farmSlug,
    lotCode: e.lotCode,
    category: "factura",
    title: `${e.income ? "Venit" : "Cheltuială"} · ${expenseCategoryLabels[e.category]} – ${e.supplier}`,
    number: e.invoiceNumber || undefined,
    date: e.date,
    fileId: file.id,
    fileName: file.name,
    mime: file.mime,
    size: file.size,
    sha256: file.sha256,
    uploadedBy: actor(user),
  });
  return doc.id;
}

const fiscalMissing = (invoiceNumber?: string, documentId?: string) =>
  !invoiceNumber
    ? "Pentru confirmare, completează numărul documentului fiscal (factură, bon, chitanță)."
    : !documentId
      ? "Pentru confirmare, atașează documentul fiscal (PDF sau poză)."
      : "";

/**
 * Adaugă o cheltuială sau un venit. Se poate salva ca ciornă (documentul se adaugă
 * ulterior) sau direct confirmat, dacă are numărul și documentul fiscal.
 */
async function addExpenseAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const farmSlug = t(formData, "farmSlug");
  if (!canManageFarm(user, farmSlug)) throw new Error("Neautorizat");
  let error = "";
  let done = "ciorna";
  try {
    const e = readEntry(formData);
    const lotCode = await checkLot(farmSlug, t(formData, "lotCode"));
    const confirm = formData.get("confirm") === "1";
    if (confirm) {
      const hasFile = (formData.get("file") as File | null)?.size;
      const missing = fiscalMissing(e.invoiceNumber, hasFile ? "x" : undefined);
      if (missing) throw new Error(missing);
    }
    const documentId = await attachFiscalDocument(formData, user, farmSlug, { ...e, lotCode });
    await expenseRepository.create({
      farmSlug,
      kind: e.income ? "venit" : "cheltuiala",
      invoiceNumber: e.invoiceNumber || undefined,
      lotCode,
      date: e.date,
      category: e.category,
      supplier: e.supplier,
      description: e.description,
      amount: e.amount,
      documentId,
      createdBy: actor(user),
      ...(confirm ? { confirmedAt: new Date().toISOString(), confirmedBy: actor(user) } : {}),
    });
    done = confirm ? "confirmat" : "ciorna";
  } catch (err) {
    error = err instanceof Error ? err.message : "Nu s-a putut salva.";
  }
  refresh();
  redirect(backUrl(user, farmSlug, error ? `eroare=${encodeURIComponent(error)}#cheltuieli` : `salvat=${done}#cheltuieli`));
}

/** Completează sau corectează o ciornă (inclusiv actul adăugat ulterior); opțional o și confirmă. */
async function updateDraftExpenseAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const existing = await expenseRepository.get(t(formData, "id"));
  if (!existing || !canManageFarm(user, existing.farmSlug)) throw new Error("Neautorizat");
  let error = "";
  let done = "ciorna";
  try {
    if (existing.confirmedAt || existing.voided) throw new Error("Înregistrarea e confirmată sau anulată și nu se mai modifică.");
    const e = readEntry(formData);
    const lotCode = await checkLot(existing.farmSlug, t(formData, "lotCode"));
    const documentId = (await attachFiscalDocument(formData, user, existing.farmSlug, { ...e, lotCode })) ?? existing.documentId;
    const confirm = formData.get("confirm") === "1";
    const invoiceNumber = e.invoiceNumber || undefined;
    if (confirm) {
      const missing = fiscalMissing(invoiceNumber, documentId);
      if (missing) throw new Error(missing);
    }
    await expenseRepository.update(existing.id, {
      kind: e.income ? "venit" : "cheltuiala",
      invoiceNumber,
      lotCode,
      date: e.date,
      category: e.category,
      supplier: e.supplier,
      description: e.description,
      amount: e.amount,
      documentId,
      ...(confirm ? { confirmedAt: new Date().toISOString(), confirmedBy: actor(user) } : {}),
    });
    done = confirm ? "confirmat" : "ciorna";
  } catch (err) {
    error = err instanceof Error ? err.message : "Nu s-a putut salva.";
  }
  refresh();
  redirect(backUrl(user, existing.farmSlug, error ? `eroare=${encodeURIComponent(error)}#cheltuieli` : `salvat=${done}#cheltuieli`));
}

/** Anulează o cheltuială greșită (rămâne în registru, tăiată, cu motivul). */
async function voidExpenseAction__impl(formData: FormData) {
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
async function verifyDocumentAction__impl(formData: FormData) {
  const user = await requireRole(["admin"]);
  const doc = await documentRepository.get(t(formData, "id"));
  if (doc && !doc.verifiedAt) await documentRepository.verify(doc.id, actor(user));
  refresh();
  const back = t(formData, "inapoi");
  redirect(back.startsWith("/") ? back : "/admin/documente");
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const uploadDocumentAction = auditedAction({ action: "household.documente.uploadDocument", workspace: "household", resourceType: "documente", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, uploadDocumentAction__impl);
export const addExpenseAction = auditedAction({ action: "household.documente.addExpense", workspace: "household", resourceType: "documente", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, addExpenseAction__impl);
export const updateDraftExpenseAction = auditedAction({ action: "household.documente.updateDraftExpense", workspace: "household", resourceType: "documente", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, updateDraftExpenseAction__impl);
export const voidExpenseAction = auditedAction({ action: "household.documente.voidExpense", workspace: "household", resourceType: "documente", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, voidExpenseAction__impl);
export const verifyDocumentAction = auditedAction({ action: "household.documente.verifyDocument", workspace: "household", resourceType: "documente", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, verifyDocumentAction__impl);
