"use server";

import { revalidatePath } from "next/cache";
import { growthEntryLabels, type GrowthEntryType } from "@/lib/growth-log";
import { lotPens } from "@/lib/growth";
import { requireRole } from "@/server/auth";
import { canManageFarm } from "@/server/delivery";
import { lotRepository } from "@/server/repositories/catalog";
import { photoRepository } from "@/server/repositories/delivery";
import { growthLogRepository } from "@/server/repositories/growth-log";
import { auditedAction } from "@/server/audit";

export type GrowthFormState = { status: "idle" } | { status: "ok"; message: string } | { status: "error"; error: string };

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : undefined;
};

/**
 * O înregistrare în jurnalul de creștere: mutarea țarcului (cu poziția GPS), hrănire, apă, tratament,
 * curățenie, pierderi, poza săptămânii, verificare veterinară. Jurnalul nu se modifică ulterior.
 */
async function addGrowthEntryAction__impl(_p: GrowthFormState, formData: FormData): Promise<GrowthFormState> {
  const user = await requireRole(["gospodar"]);
  const lot = await lotRepository.byCode(String(formData.get("lotCode") ?? ""), { all: true });
  if (!lot || !canManageFarm(user, lot.farmSlug)) return { status: "error", error: "Neautorizat." };
  const type = String(formData.get("type") ?? "") as GrowthEntryType;
  if (!(type in growthEntryLabels)) return { status: "error", error: "Alege ce ai făcut." };
  const penRaw = num(formData.get("pen"));
  const pen = penRaw && penRaw >= 1 && penRaw <= lotPens(lot) ? Math.round(penRaw) : undefined;
  if (type === "mutare" && !pen) return { status: "error", error: "Alege țarcul mutat." };
  const date = String(formData.get("date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: "error", error: "Data nu e validă." };
  const photo = formData.get("photo") as File | null;
  if (type === "poza" && !(photo && photo.size > 0)) return { status: "error", error: "Fă poza (puii și țarcul)." };
  if (photo && photo.size > 3.5 * 1024 * 1024) return { status: "error", error: "Poza e prea mare." };
  const vetName = String(formData.get("vetName") ?? "").trim();
  if (type === "veterinar" && vetName.length < 3) return { status: "error", error: "Scrie numele medicului veterinar." };
  const count = num(formData.get("count"));
  if (type === "mortalitate" && !(count && count > 0)) return { status: "error", error: "Scrie câți pui." };

  const photoId = photo && photo.size > 0 ? await photoRepository.save(photo, `lot:${lot.code}`) : undefined;
  await growthLogRepository.create({
    lotCode: lot.code,
    farmSlug: lot.farmSlug,
    pen,
    type,
    date,
    note: String(formData.get("note") ?? "").trim().slice(0, 500),
    count: type === "mortalitate" ? Math.round(count!) : undefined,
    lat: num(formData.get("lat")),
    lng: num(formData.get("lng")),
    photoId,
    vetName: type === "veterinar" ? vetName : undefined,
    by: `${user.name} (${user.role})`,
  });
  revalidatePath("/cont/gospodar", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/comanda", "layout");
  return { status: "ok", message: `${growthEntryLabels[type]}${pen ? ` · țarcul ${pen}` : ""}: notat.` };
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const addGrowthEntryAction = auditedAction({ action: "household.jurnal.addGrowthEntry", workspace: "household", resourceType: "jurnal", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, addGrowthEntryAction__impl);
