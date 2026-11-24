"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { resetTestData } from "@/server/reset";
import { auditedAction } from "@/server/audit";

export type ResetState = { status: "idle" } | { status: "error"; error: string } | { status: "done"; total: number; relinked: number };

async function resetTestDataAction__impl(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const admin = await requireAdmin();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "STERG") {
    return { status: "error", error: "Scrie STERG (cu majuscule) ca să confirmi." };
  }
  const r = await resetTestData();
  console.info(`[puii-mei] Date de test șterse de ${admin.name}: ${r.total} înregistrări`);
  revalidatePath("/", "layout");
  return { status: "done", total: r.total, relinked: r.relinked };
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const resetTestDataAction = auditedAction({ action: "admin.reset.resetTestData", workspace: "admin", resourceType: "reset", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, resetTestDataAction__impl);
