"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { migrateBatch } from "@/server/files/migrate";

/** Mută următoarele fișiere vechi din baza de date în stocarea externă (pe loturi, ca să nu depășească timpul). */
export async function migrateFilesAction() {
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
