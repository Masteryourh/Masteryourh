"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { migrateBatch } from "@/server/files/migrate";
import { auditedAction } from "@/server/audit";

/** Mută următoarele fișiere vechi din baza de date în stocarea externă (pe loturi, ca să nu depășească timpul). */
async function migrateFilesAction__impl() {
  await requireAdmin();
  let q: string;
  try {
    const r = await migrateBatch(25);
    q = `mutate=${r.moved}&ramase=${r.inDb}${r.errors.length ? `&eroriMutare=${encodeURIComponent(r.errors.slice(0, 3).join("; "))}` : ""}`;
  } catch (err) {
    q = `eroriMutare=${encodeURIComponent((err as Error).message)}`;
  }
  redirect(`/admin/documente?${q}#stocare`);
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const migrateFilesAction = auditedAction({ action: "admin.storage.migrateFiles", workspace: "admin", resourceType: "storage", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, migrateFilesAction__impl);
