"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { auditedAction, auditNote } from "@/server/audit";
import { retryMessage } from "@/server/outbox";

async function retryMessageAction__impl(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const ok = await retryMessage(id);
  auditNote({ resourceId: id, changes: { retrimis: ok } });
  revalidatePath("/admin/mesaje");
}

export const retryMessageAction = auditedAction({ action: "admin.mesaje.retrimite", workspace: "admin", resourceType: "outbox", fields: [] }, retryMessageAction__impl);
