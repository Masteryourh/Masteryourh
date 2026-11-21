"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { canManageFarm } from "@/server/delivery";
import { setFeedReceived } from "@/server/orders";
import { farmPaymentRepository, normalizeIban } from "@/server/repositories/farm-payments";

const refresh = () => {
  revalidatePath("/cont/gospodar", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/comanda", "layout");
  revalidatePath("/precomanda");
};

/** Datele contului în care clienții plătesc avansul pentru hrană. */
export async function saveFarmPaymentAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const farmSlug = String(formData.get("farmSlug") ?? "");
  const back = `/cont/gospodar${user.role === "admin" ? `?gospodarie=${encodeURIComponent(farmSlug)}&` : "?"}`;
  if (!canManageFarm(user, farmSlug)) throw new Error("Neautorizat");
  const holder = String(formData.get("holder") ?? "").trim();
  const bank = String(formData.get("bank") ?? "").trim();
  const iban = normalizeIban(String(formData.get("iban") ?? ""));
  const price = Number(String(formData.get("feedPricePerKg") ?? "").replace(",", "."));
  const chick = Number(String(formData.get("chickPricePerBird") ?? "").replace(",", "."));
  let error = "";
  if (holder.length < 3) error = "Completează titularul contului.";
  else if (!iban) error = "IBAN invalid. Exemplu: RO49 AAAA 1B31 0075 9384 0000.";
  else if (!(price > 0 && price < 50)) error = "Prețul furajului trebuie să fie între 0 și 50 lei / kg.";
  else if (!(chick > 0 && chick < 100)) error = "Prețul puiului de o zi trebuie să fie între 0 și 100 lei.";
  if (error) redirect(`${back}eroarePlata=${encodeURIComponent(error)}#plata-hrana`);
  await farmPaymentRepository.save({
    id: farmSlug,
    holder,
    iban: iban!,
    bank,
    feedPricePerKg: Math.round(price * 100) / 100,
    chickPricePerBird: Math.round(chick * 100) / 100,
    updatedAt: new Date().toISOString(),
    updatedBy: `${user.name} (${user.role})`,
  });
  refresh();
  redirect(`${back}salvatPlata=1#plata-hrana`);
}

/** Confirmă (sau anulează confirmarea) primirii avansului pentru hrană. */
export async function setFeedReceivedAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  await setFeedReceived(String(formData.get("id") ?? ""), user, formData.get("received") === "1");
  refresh();
}
