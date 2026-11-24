"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { sendDocumentReminders } from "@/server/document-alerts";

/** Trimite acum alertele de expirare scadente (aceleași ca jobul zilnic; o alertă nu se trimite de două ori). */
export async function sendRemindersAction() {
  await requireAdmin();
  const r = await sendDocumentReminders();
  redirect(`/admin/documente?alerte=${r.sent}&scadente=${r.due}#expirari`);
}
