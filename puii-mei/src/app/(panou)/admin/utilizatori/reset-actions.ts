"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { resetTestData } from "@/server/reset";

export type ResetState = { status: "idle" } | { status: "error"; error: string } | { status: "done"; total: number; relinked: number };

export async function resetTestDataAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const admin = await requireAdmin();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "STERG") {
    return { status: "error", error: "Scrie STERG (cu majuscule) ca să confirmi." };
  }
  const r = await resetTestData();
  console.info(`[puii-mei] Date de test șterse de ${admin.name}: ${r.total} înregistrări`);
  revalidatePath("/", "layout");
  return { status: "done", total: r.total, relinked: r.relinked };
}
