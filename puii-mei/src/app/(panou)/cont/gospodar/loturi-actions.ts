"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Species } from "@/lib/products";
import { requireRole } from "@/server/auth";
import { canManageFarm } from "@/server/delivery";
import { lotRepository } from "@/server/repositories/catalog";
import { notifyAdmins, notifyFarm } from "@/server/notifications";
import { site } from "@/lib/site";

const SPECIES: Species[] = ["pui", "curcani", "rate", "fazani"];

const refresh = () => {
  for (const p of ["/", "/precomanda", "/trasabilitate", "/gospodarii"]) revalidatePath(p, "layout");
  revalidatePath("/cont/gospodar", "layout");
  revalidatePath("/admin", "layout");
};

function back(formData: FormData, params: string) {
  const to = String(formData.get("inapoi") ?? "/cont/gospodar");
  const safe = to.startsWith("/admin") || to.startsWith("/cont/gospodar") ? to : "/cont/gospodar";
  return `${safe}${safe.includes("?") ? "&" : "?"}${params}#loturi`;
}

function readLot(formData: FormData) {
  const n = (k: string) => Number(String(formData.get(k) ?? "").replace(",", "."));
  const t = (k: string) => String(formData.get(k) ?? "").trim();
  const species = t("species") as Species;
  return {
    species: SPECIES.includes(species) ? species : "pui",
    breed: t("breed") || "Pui cu creștere lentă (hibrid de exterior)",
    startDate: t("startDate"),
    growthDays: Math.round(n("growthDays")),
    totalBirds: Math.round(n("totalBirds")),
    feed: t("feed") || "Furaje din cereale",
    processor: t("processor") || "Sacrificare tradițională în gospodăria de creștere",
    notes: t("notes"),
  };
}

function validate(d: ReturnType<typeof readLot>) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.startDate)) return "Alege data de început a lotului.";
  if (!(d.growthDays >= 30 && d.growthDays <= 200)) return "Durata creșterii trebuie să fie între 30 și 200 de zile.";
  if (!(d.totalBirds >= 5 && d.totalBirds <= 10000)) return "Numărul de păsări trebuie să fie între 5 și 10.000.";
  return "";
}

/** Lot nou (gospodarul pentru gospodăria lui, adminul pentru oricare). */
export async function createLotAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const farmSlug = String(formData.get("farmSlug") ?? "");
  if (!canManageFarm(user, farmSlug)) throw new Error("Neautorizat");
  const data = readLot(formData);
  const error = validate(data);
  if (error) redirect(back(formData, `eroareLot=${encodeURIComponent(error)}`));
  const needsApproval = user.role !== "admin";
  const lot = await lotRepository.create({ ...data, farmSlug }, `${user.name} (${user.role})`, needsApproval);
  if (needsApproval) {
    await notifyAdmins(
      `Lot nou de aprobat: ${lot.code}`,
      `${user.name} a propus lotul ${lot.code}: ${lot.totalBirds} păsări, start ${lot.startDate}.\n${site.url}/admin/loturi`,
    );
  }
  refresh();
  redirect(back(formData, `${needsApproval ? "lotPropus" : "lotNou"}=${lot.code}`));
}

/** Modificarea unui lot: număr de păsări, date, închidere / redeschidere pentru precomenzi. */
export async function updateLotAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const code = String(formData.get("code") ?? "");
  const lot = await lotRepository.byCode(code, { all: true });
  if (!lot || !canManageFarm(user, lot.farmSlug)) throw new Error("Neautorizat");
  if (formData.get("toggle") === "1") {
    await lotRepository.update(lot.code, { closed: !lot.closed });
    refresh();
    redirect(back(formData, `lotSalvat=${lot.code}`));
  }
  const data = readLot(formData);
  const error = validate(data) || (data.totalBirds < lot.reservedBirds ? `Lotul are deja ${lot.reservedBirds} păsări rezervate.` : "");
  if (error) redirect(back(formData, `eroareLot=${encodeURIComponent(error)}`));
  await lotRepository.update(lot.code, {
    totalBirds: data.totalBirds,
    startDate: data.startDate,
    growthDays: data.growthDays,
    breed: data.breed,
    feed: data.feed,
    processor: data.processor,
    notes: data.notes,
    // Un lot respins, corectat de gospodar, intră din nou la aprobare.
    ...(lot.approval?.status === "respins" && user.role !== "admin" ? { approval: { status: "asteapta" as const } } : {}),
  });
  refresh();
  redirect(back(formData, `lotSalvat=${lot.code}`));
}

/** Adminul aprobă sau respinge un lot propus de gospodar. */
export async function decideLotAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const lot = await lotRepository.byCode(String(formData.get("code") ?? ""), { all: true });
  if (!lot || lot.approval?.status !== "asteapta") redirect(back(formData, "lotSalvat=1"));
  const approve = formData.get("decision") === "aproba";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!approve && reason.length < 3) redirect(back(formData, `eroareLot=${encodeURIComponent("Scrie motivul respingerii.")}`));
  await lotRepository.update(lot.code, {
    approval: { status: approve ? "aprobat" : "respins", by: `${admin.name} (admin)`, at: new Date().toISOString(), ...(approve ? {} : { reason }) },
  });
  await notifyFarm(
    lot.farmSlug,
    approve ? `Lotul ${lot.code} a fost aprobat` : `Lotul ${lot.code} a fost respins`,
    approve
      ? `Lotul ${lot.code} a fost aprobat și apare acum la precomandă.\n${site.url}/cont/gospodar`
      : `Lotul ${lot.code} nu a fost aprobat. Motiv: ${reason}\n${site.url}/cont/gospodar`,
  );
  refresh();
  redirect(back(formData, `lotSalvat=${lot.code}`));
}
