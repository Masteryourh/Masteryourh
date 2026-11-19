"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FarmApplicationStatus } from "@/lib/domain";
import { farmEditSchema } from "@/lib/validation/partner";
import { requireAdmin } from "@/server/auth";
import { applicationRepository, investorRepository } from "@/server/repositories/applications";
import { farmRepository } from "@/server/repositories/catalog";

const statuses: FarmApplicationStatus[] = ["noua", "in-evaluare", "vizita-programata", "aprobata", "respinsa"];

export async function updateApplication(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as FarmApplicationStatus;
  const internalNote = String(formData.get("internalNote") ?? "").slice(0, 2000);
  if (!id || !statuses.includes(status)) throw new Error("Date invalide");
  await applicationRepository.update(id, { status, internalNote });
  revalidatePath("/admin", "layout");
}

/** Creează profilul public al gospodăriei dintr-o solicitare aprobată. */
export async function createFarmFromApplication(formData: FormData) {
  await requireAdmin();
  const app = await applicationRepository.byId(String(formData.get("id") ?? ""));
  if (!app) throw new Error("Solicitarea nu există");
  if (app.farmSlug) redirect(`/admin/gospodarii/${app.farmSlug}`);
  const name = app.farmName || `Gospodăria ${app.name.split(" ").at(-1)}`;
  const farm = await farmRepository.create({
    name,
    owner: app.name,
    village: app.village,
    county: app.county,
    capacityPerLot: app.capacity,
    shortDescription: `Gospodărie parteneră din ${app.village}, județul ${app.county}.`,
    description: app.message || `${name} crește pui la comandă în parteneriat cu Puii mei.`,
    practices: [
      ...(app.hasShelter ? ["Adăpost amenajat pentru păsări"] : []),
      ...(app.hasOutdoorArea ? ["Acces la padoc în aer liber"] : []),
      "Jurnal de creștere pentru fiecare lot",
    ],
    veterinaryRegistration:
      app.dsvStatus === "inregistrat" ? "Înregistrată la DSV" : "Înregistrare sanitar-veterinară: în curs",
    applicationId: app.id,
  });
  await applicationRepository.update(app.id, { status: "aprobata", farmSlug: farm.slug });
  revalidatePath("/", "layout");
  redirect(`/admin/gospodarii/${farm.slug}?nou=1`);
}

export async function saveFarm(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const farm = await farmRepository.bySlug(slug, { includeInactive: true });
  if (!farm || farm.source !== "admin") throw new Error("Gospodăria nu poate fi editată");
  const parsed = farmEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Date invalide";
    redirect(`/admin/gospodarii/${slug}?eroare=${encodeURIComponent(msg)}`);
  }
  await farmRepository.update(slug, parsed.data);
  revalidatePath("/", "layout");
  redirect(`/admin/gospodarii/${slug}?salvat=1`);
}

export async function toggleFarmActive(formData: FormData) {
  await requireAdmin();
  const farm = await farmRepository.bySlug(String(formData.get("slug") ?? ""), { includeInactive: true });
  if (!farm) throw new Error("Gospodăria nu există");
  await farmRepository.setActive(farm, !farm.active);
  revalidatePath("/", "layout");
}

export async function updateInvestorApplication(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as FarmApplicationStatus;
  const internalNote = String(formData.get("internalNote") ?? "").slice(0, 2000);
  if (!id || !statuses.includes(status)) throw new Error("Date invalide");
  await investorRepository.update(id, { status, internalNote });
  revalidatePath("/admin", "layout");
}
