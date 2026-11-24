"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { priceSettingsRepository } from "@/server/repositories/settings";
import { auditedAction } from "@/server/audit";

async function savePriceAction__impl(formData: FormData) {
  const admin = await requireAdmin();
  const market = Number(String(formData.get("marketPricePerKg") ?? "").replace(",", "."));
  const markup = Number(String(formData.get("markupPct") ?? "").replace(",", "."));
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  if (!Number.isFinite(market) || market < 5 || market > 300) redirect("/admin/preturi?eroare=" + encodeURIComponent("Prețul pieței trebuie să fie între 5 și 300 lei / kg."));
  if (!Number.isFinite(markup) || markup < 0 || markup > 100) redirect("/admin/preturi?eroare=" + encodeURIComponent("Adaosul trebuie să fie între 0 și 100%."));
  await priceSettingsRepository.save({
    at: new Date().toISOString(),
    by: `${admin.name} (admin)`,
    marketPricePerKg: Math.round(market * 100) / 100,
    markupPct: Math.round(markup * 10) / 10,
    note: note || undefined,
  });
  revalidatePath("/", "layout");
  redirect("/admin/preturi?salvat=1");
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const savePriceAction = auditedAction({ action: "admin.preturi.savePrice", workspace: "admin", resourceType: "preturi", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, savePriceAction__impl);
