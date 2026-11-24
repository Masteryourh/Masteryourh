"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { sendDocumentReminders } from "@/server/document-alerts";
import { auditedAction } from "@/server/audit";

/** Trimite acum alertele de expirare scadente (aceleași ca jobul zilnic; o alertă nu se trimite de două ori). */
async function sendRemindersAction__impl() {
  await requireAdmin();
  const r = await sendDocumentReminders();
  redirect(`/admin/documente?alerte=${r.sent}&scadente=${r.due}#expirari`);
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const sendRemindersAction = auditedAction({ action: "admin.reminder.sendReminders", workspace: "admin", resourceType: "reminder", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, sendRemindersAction__impl);
