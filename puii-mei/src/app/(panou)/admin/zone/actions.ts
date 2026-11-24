"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { slugify } from "@/lib/slug";
import { zoneRepository } from "@/server/repositories/catalog";
import { deliverySettingsRepository } from "@/server/repositories/settings";
import { auditedAction } from "@/server/audit";

const back = (q: string) => redirect(`/admin/zone?${q}`);
const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", ".").trim());

/** Salvează o zonă (existentă sau nouă). */
async function saveZoneAction__impl(formData: FormData) {
  const admin = await requireAdmin();
  const existingId = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const localities = String(formData.get("localities") ?? "").trim().slice(0, 400);
  const deliveryDay = String(formData.get("deliveryDay") ?? "").trim().slice(0, 60) || "—";
  const fee = num(formData.get("fee"));
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();
  const active = formData.get("active") === "on";
  if (name.length < 2) back("eroare=" + encodeURIComponent("Scrie numele zonei."));
  if (!Number.isFinite(fee) || fee < 0 || fee > 500) back("eroare=" + encodeURIComponent("Taxa de livrare trebuie să fie între 0 și 500 lei."));
  let center: { lat: number; lng: number } | undefined;
  if (latRaw || lngRaw) {
    const lat = num(latRaw), lng = num(lngRaw);
    if (!(lat > 43 && lat < 49 && lng > 20 && lng < 30)) back("eroare=" + encodeURIComponent("Coordonatele centrului nu sunt în România (ex. 47.53, 25.55)."));
    center = { lat, lng };
  }
  let id = existingId;
  if (!id) {
    id = slugify(name);
    if (!id || (await zoneRepository.listAll()).some((z) => z.id === id)) back("eroare=" + encodeURIComponent("Există deja o zonă cu acest nume."));
  }
  await zoneRepository.save({
    id,
    name,
    localities,
    fee: Math.round(fee * 100) / 100,
    deliveryDay,
    active,
    ...(center ? { center } : {}),
    updatedAt: new Date().toISOString(),
    updatedBy: `${admin.name} (admin)`,
  });
  revalidatePath("/", "layout");
  back(`salvat=${encodeURIComponent(name)}#zona-${id}`);
}

async function saveFreeDeliveryAction__impl(formData: FormData) {
  const admin = await requireAdmin();
  const v = num(formData.get("freeDeliveryFrom"));
  if (!Number.isFinite(v) || v < 0 || v > 100000) back("eroare=" + encodeURIComponent("Pragul trebuie să fie între 0 și 100.000 lei."));
  await deliverySettingsRepository.save(Math.round(v), `${admin.name} (admin)`);
  revalidatePath("/", "layout");
  back("salvat=" + encodeURIComponent("Pragul de livrare gratuită"));
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const saveZoneAction = auditedAction({ action: "admin.zone.saveZone", workspace: "admin", resourceType: "zone", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, saveZoneAction__impl);
export const saveFreeDeliveryAction = auditedAction({ action: "admin.zone.saveFreeDelivery", workspace: "admin", resourceType: "zone", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, saveFreeDeliveryAction__impl);
